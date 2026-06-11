import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { rf, rs, rvs } from '@/constants/responsive';
import { getCurrentLocationPoint, getDefaultLocationPoint, requestLocationPermission } from '@/lib/location-service';
import {
  connectRealtime,
  disconnectRealtime,
  sendDriverHeartbeat,
  sendDriverLocation,
  sendTripStatus,
  subscribeDriverRequests,
  subscribeNotifications,
  subscribeRealtimeConnection,
  type RealtimeSubscription,
} from '@/lib/realtime';
import { respondToTrip, setDriverOnline, updateTripStatus } from '@/lib/ride-api';
import type { DriverAction, DriverTripRequest, LocationPoint, TripStatus, WsNotification } from '@/types/ride';

const DRIVER_ID = 5;
const DRIVER_HEARTBEAT_INTERVAL_MS = 10000;
const DRIVER_LOCATION_INTERVAL_MS = 5000;
const DRIVER_LOCATION_TIMEOUT_MS = 4500;
const DRIVER_MAP_DELTA = 0.01;

const palette = {
  background: '#eaf7ef',
  backgroundDeep: '#cfeedd',
  card: '#ffffff',
  ink: '#08110d',
  muted: '#637069',
  line: '#dfe7e2',
  green: '#00b875',
  greenDark: '#053f2a',
  greenSoft: '#dcf8ed',
  amber: '#f59e0b',
  amberSoft: '#fff3d8',
  danger: '#d72828',
  dangerSoft: '#ffe7e7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#e9f0ff',
  mint: '#6df0a7',
};

type DriverRealtimeMode = 'offline' | 'connecting' | 'mock' | 'remote' | 'fallback';

const ACTIVE_TRIP_STEPS: { label: string; status: TripStatus }[] = [
  { label: 'Đã nhận', status: 'ACCEPTED' },
  { label: 'Đã đến', status: 'ARRIVED' },
  { label: 'Đang đi', status: 'IN_PROGRESS' },
  { label: 'Hoàn thành', status: 'COMPLETED' },
];

export default function DriverScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [isOnline, setIsOnline] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LocationPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Bạn đang offline. Bật online để nhận cuốc mới.');
  const [realtimeMode, setRealtimeMode] = useState<DriverRealtimeMode>('offline');
  const [incomingRequest, setIncomingRequest] = useState<DriverTripRequest | null>(null);
  const [requestResponse, setRequestResponse] = useState<{
    status: TripStatus;
    tripId: number;
  } | null>(null);
  const [respondingAction, setRespondingAction] = useState<DriverAction | null>(null);
  const [updatingTripStatus, setUpdatingTripStatus] = useState<TripStatus | null>(null);
  const [lastDriverLocationSentAt, setLastDriverLocationSentAt] = useState<string | null>(null);
  const [driverTrackingMessage, setDriverTrackingMessage] = useState('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const requestSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const notificationSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const connectionSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationRef = useRef<LocationPoint | null>(null);
  const driverGpsPingInFlightRef = useRef(false);

  const realtimeCopy = useMemo(() => getRealtimeCopy(realtimeMode), [realtimeMode]);
  const activeTripId = requestResponse && isDriverTrackingStatus(requestResponse.status) ? requestResponse.tripId : null;
  const todayTripCount = requestResponse?.status === 'COMPLETED' ? 13 : 12;
  const todayEarnings =
    450000 + (requestResponse?.status === 'COMPLETED' && incomingRequest ? Math.round(incomingRequest.estimatedFare) : 0);
  const listeningCopy = getListeningCopy(isOnline, incomingRequest);

  useEffect(() => {
    driverLocationRef.current = driverLocation;
  }, [driverLocation]);

  const stopOnlineServices = useCallback(() => {
    requestSubscriptionRef.current?.unsubscribe();
    requestSubscriptionRef.current = null;
    notificationSubscriptionRef.current?.unsubscribe();
    notificationSubscriptionRef.current = null;
    connectionSubscriptionRef.current?.unsubscribe();
    connectionSubscriptionRef.current = null;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (driverLocationTimerRef.current) {
      clearInterval(driverLocationTimerRef.current);
      driverLocationTimerRef.current = null;
    }

    driverGpsPingInFlightRef.current = false;
    disconnectRealtime();
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    const sendHeartbeat = () => {
      const heartbeat = sendDriverHeartbeat(DRIVER_ID);

      if (heartbeat.sent) {
        setLastHeartbeatAt(heartbeat.sentAt);
        return;
      }

      setRealtimeMode('fallback');
      setStatusMessage('Realtime chưa sẵn sàng để gửi heartbeat. GoRide sẽ tiếp tục thử lại theo chu kỳ.');
    };

    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, DRIVER_HEARTBEAT_INTERVAL_MS);
  }, []);

  const startRealtime = useCallback(async () => {
    let remoteConnectionOpened = false;

    setRealtimeMode('connecting');
    connectionSubscriptionRef.current?.unsubscribe();
    connectionSubscriptionRef.current = subscribeRealtimeConnection((state) => {
      if (state.mode === 'mock') {
        return;
      }

      if (state.status === 'connected') {
        remoteConnectionOpened = true;
        setRealtimeMode('remote');
        setStatusMessage('Bạn đang online. GoRide đang nghe cuốc mới qua realtime.');
        return;
      }

      if (state.status === 'connecting') {
        setRealtimeMode('connecting');
        return;
      }

      if (state.status === 'reconnecting' && remoteConnectionOpened) {
        setRealtimeMode('fallback');
        setStatusMessage('Realtime đang kết nối lại. GoRide vẫn giữ tài xế online và tiếp tục gửi heartbeat khi kênh trở lại.');
        return;
      }

      if (state.status === 'error') {
        setRealtimeMode('fallback');
        setStatusMessage(state.lastError ?? 'Realtime tạm thời gián đoạn, GoRide sẽ tự kết nối lại.');
      }
    });

    try {
      const connection = await connectRealtime();
      setRealtimeMode(connection.mode);
      requestSubscriptionRef.current = subscribeDriverRequests(DRIVER_ID, (request) => {
        setIncomingRequest(request);
        setRequestResponse(null);
        setStatusMessage('Có cuốc mới đang chờ bạn phản hồi.');
      });
      notificationSubscriptionRef.current = subscribeNotifications((notification) => {
        setLatestNotification(notification);
      });
      startHeartbeat();
    } catch (error: unknown) {
      setRealtimeMode('fallback');
      setStatusMessage(getErrorMessage(error, 'Realtime chưa sẵn sàng, GoRide sẽ thử lại ở bước sau.'));
    }
  }, [startHeartbeat]);

  const goOnline = useCallback(async () => {
    setToggleLoading(true);

    try {
      const permission = await requestLocationPermission();
      let nextLocation = getDefaultLocationPoint();

      if (permission.granted) {
        try {
          nextLocation = await getCurrentLocationPoint({ timeoutMs: 10000 });
          setLocationMessage('Đã lấy GPS hiện tại để sẵn sàng nhận cuốc.');
        } catch (error: unknown) {
          setLocationMessage(getErrorMessage(error, 'GPS quá lâu, tạm dùng vị trí demo để nhận cuốc.'));
        }
      } else {
        setLocationMessage(
          permission.status === 'gps-disabled'
            ? 'GPS đang tắt. Tạm dùng vị trí demo, hãy bật GPS trước khi nhận cuốc thật.'
            : 'Chưa cấp quyền vị trí. Tạm dùng vị trí demo cho luồng mock.',
        );
      }

      const response = await setDriverOnline(true);
      setDriverLocation(nextLocation);
      setIsOnline(true);
      setStatusMessage(response.message);
      await startRealtime();
    } catch (error: unknown) {
      Alert.alert('Không thể bật online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
      stopOnlineServices();
      setIsOnline(false);
      setRealtimeMode('offline');
    } finally {
      setToggleLoading(false);
    }
  }, [startRealtime, stopOnlineServices]);

  const goOffline = useCallback(async () => {
    setToggleLoading(true);

    try {
      const response = await setDriverOnline(false);
      stopOnlineServices();
      setIsOnline(false);
      setIncomingRequest(null);
      setRequestResponse(null);
      setRespondingAction(null);
      setUpdatingTripStatus(null);
      setLastDriverLocationSentAt(null);
      setDriverTrackingMessage('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
      setRealtimeMode('offline');
      setStatusMessage(response.message);
    } catch (error: unknown) {
      Alert.alert('Không thể tắt online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
    } finally {
      setToggleLoading(false);
    }
  }, [stopOnlineServices]);

  const handleToggleOnline = (value: boolean) => {
    if (toggleLoading) {
      return;
    }

    if (value) {
      void goOnline();
    } else {
      void goOffline();
    }
  };

  const handleRespondToRequest = useCallback(
    async (action: DriverAction) => {
      if (!incomingRequest || respondingAction) {
        return;
      }

      setRespondingAction(action);

      try {
        const response = await respondToTrip(incomingRequest.tripId, action);
        setRequestResponse({
          status: response.status,
          tripId: response.tripId,
        });

        if (action === 'ACCEPT') {
          setStatusMessage('Bạn đã nhận cuốc. Chuẩn bị di chuyển đến điểm đón.');
          setDriverTrackingMessage('Đang khởi động GPS cuốc để gửi vị trí cho khách.');
          return;
        }

        setIncomingRequest(null);
        setStatusMessage('Bạn đã từ chối cuốc. GoRide tiếp tục nghe request mới.');
      } catch (error: unknown) {
        Alert.alert(
          action === 'ACCEPT' ? 'Không thể nhận cuốc' : 'Không thể từ chối cuốc',
          getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'),
        );
      } finally {
        setRespondingAction(null);
      }
    },
    [incomingRequest, respondingAction],
  );

  const handleUpdateActiveTripStatus = useCallback(
    async (nextStatus: TripStatus) => {
      if (!requestResponse || updatingTripStatus) {
        return;
      }

      setUpdatingTripStatus(nextStatus);

      try {
        const response = await updateTripStatus(requestResponse.tripId, nextStatus);
        setRequestResponse({
          tripId: response.tripId,
          status: response.status,
        });
        sendTripStatus(response.tripId, response.status);
        setStatusMessage(getDriverStatusMessage(response.status));
        setDriverTrackingMessage(getDriverTrackingMessage(response.status));
      } catch (error: unknown) {
        Alert.alert('Không thể cập nhật chuyến', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
      } finally {
        setUpdatingTripStatus(null);
      }
    },
    [requestResponse, updatingTripStatus],
  );

  const resetCompletedTrip = useCallback(() => {
    setIncomingRequest(null);
    setRequestResponse(null);
    setRespondingAction(null);
    setUpdatingTripStatus(null);
    setLastDriverLocationSentAt(null);
    setDriverTrackingMessage('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
    setStatusMessage('Bạn đang online. GoRide tiếp tục nghe cuốc mới.');
  }, []);

  const sendDriverGpsPing = useCallback(async (tripId: number) => {
    if (driverGpsPingInFlightRef.current) {
      return;
    }

    driverGpsPingInFlightRef.current = true;
    let nextLocation = driverLocationRef.current ?? getDefaultLocationPoint();

    try {
      nextLocation = await getCurrentLocationPoint({ timeoutMs: DRIVER_LOCATION_TIMEOUT_MS });
      setDriverTrackingMessage('GPS cuốc đang gửi vị trí thật theo chu kỳ.');
    } catch (error: unknown) {
      setDriverTrackingMessage(getErrorMessage(error, 'Không lấy được GPS mới, tạm gửi vị trí gần nhất.'));
    } finally {
      driverGpsPingInFlightRef.current = false;
    }

    const sentAt = new Date().toISOString();

    driverLocationRef.current = nextLocation;
    setDriverLocation(nextLocation);
    const publishResult = sendDriverLocation({
      tripId,
      driverId: DRIVER_ID,
      lat: nextLocation.lat,
      lng: nextLocation.lng,
      updatedAt: sentAt,
    });

    if (publishResult.sent) {
      setLastDriverLocationSentAt(sentAt);
      return;
    }

    setRealtimeMode('fallback');
    setDriverTrackingMessage('Realtime chưa sẵn sàng để gửi GPS, GoRide sẽ thử lại ở nhịp tiếp theo.');
  }, []);

  useEffect(() => {
    return () => stopOnlineServices();
  }, [stopOnlineServices]);

  useEffect(() => {
    if (!activeTripId) {
      if (driverLocationTimerRef.current) {
        clearInterval(driverLocationTimerRef.current);
        driverLocationTimerRef.current = null;
      }

      if (requestResponse?.status === 'COMPLETED') {
        setDriverTrackingMessage('GPS cuốc đã dừng sau khi hoàn thành chuyến.');
      }

      return;
    }

    if (driverLocationTimerRef.current) {
      clearInterval(driverLocationTimerRef.current);
    }

    void sendDriverGpsPing(activeTripId);
    driverLocationTimerRef.current = setInterval(() => {
      void sendDriverGpsPing(activeTripId);
    }, DRIVER_LOCATION_INTERVAL_MS);

    return () => {
      if (driverLocationTimerRef.current) {
        clearInterval(driverLocationTimerRef.current);
        driverLocationTimerRef.current = null;
      }
    };
  }, [activeTripId, requestResponse?.status, sendDriverGpsPing]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { minHeight: height }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.consoleHeader}>
          <View style={styles.driverIdentity}>
            <View style={styles.driverAvatar}>
              <MaterialCommunityIcons name="account" size={rs(34)} color={palette.greenDark} />
            </View>
            <Text style={styles.consoleTitle}>Driver Console</Text>
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.bellButton, pressed ? styles.pressedButton : null]}>
            <MaterialCommunityIcons name="bell-outline" size={rs(32)} color={palette.blueInk} />
            {latestNotification ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? palette.green : palette.muted }]} />
              <Text style={[styles.statusPillText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                {isOnline ? 'Đang online' : 'Đang offline'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={toggleLoading}
              trackColor={{ false: '#314038', true: palette.greenSoft }}
              thumbColor={isOnline ? palette.green : '#f4f7f5'}
            />
          </View>

          <Text style={styles.title}>{isOnline ? 'Sẵn sàng nhận cuốc' : 'Bật online để bắt đầu'}</Text>
          <Text style={styles.subtitle}>{statusMessage}</Text>

          <View style={styles.heroMetricRow}>
            <MetricTile icon="access-point" label="Kênh" value={realtimeCopy.label} tone={realtimeCopy.tone} />
            <MetricTile icon="heart-pulse" label="Heartbeat" value={formatTrackingTime(lastHeartbeatAt)} tone="green" />
          </View>

          {toggleLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.green} />
              <Text style={styles.loadingText}>Đang cập nhật trạng thái tài xế...</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.listeningCard, incomingRequest ? styles.listeningCardHot : null, !isOnline ? styles.listeningCardIdle : null]}>
          <View style={styles.listeningIcon}>
            <MaterialCommunityIcons name={listeningCopy.icon} size={rs(34)} color={palette.blue} />
          </View>
          <View style={styles.listeningCopy}>
            <Text style={styles.listeningTitle}>{listeningCopy.title}</Text>
            <Text style={styles.listeningText}>{listeningCopy.text}</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard label="THU NHẬP HÔM NAY" value={formatFare(todayEarnings)} />
          <StatCard label="CHUYẾN ĐI" value={String(todayTripCount)} />
        </View>

        <View style={styles.quickActionGrid}>
          <QuickActionTile icon="map-outline" label="Bản đồ" />
          <QuickActionTile icon="wallet-outline" label="Ví tiền" onPress={() => router.push('/(driver)/earnings')} />
          <QuickActionTile icon="fire" label="Vùng nóng" />
          <QuickActionTile icon="headset" label="Hỗ trợ" />
        </View>

        <DriverMapPreview location={driverLocation} />

        <View style={styles.locationCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="crosshairs-gps" size={rs(34)} color={palette.green} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Vị trí tài xế</Text>
              <Text style={styles.sectionSubtitle}>{locationMessage ?? 'GoRide sẽ lấy GPS khi bạn bật online.'}</Text>
            </View>
          </View>

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>Điểm đứng hiện tại</Text>
            <Text style={styles.locationValue} selectable>
              {driverLocation?.address ?? 'Chưa có vị trí'}
            </Text>
            <Text style={styles.locationCoords} selectable>
              {driverLocation ? formatCoordinates(driverLocation) : 'GPS chưa được gửi'}
            </Text>
          </View>

          <View style={styles.trackingBox}>
            <View style={styles.trackingIcon}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(30)} color={palette.blue} />
            </View>
            <View style={styles.trackingCopy}>
              <Text style={styles.trackingLabel}>GPS cuốc xe</Text>
              <Text style={styles.trackingText}>{driverTrackingMessage}</Text>
              <Text style={styles.trackingTime}>Lần gửi cuối: {formatTrackingTime(lastDriverLocationSentAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.requestCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, styles.requestIcon]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={rs(34)} color={palette.blue} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Yêu cầu cuốc xe</Text>
              <Text style={styles.sectionSubtitle}>
                {isOnline ? 'Mock realtime sẽ đẩy cuốc demo sau vài giây.' : 'Bạn cần online để nhận request.'}
              </Text>
            </View>
          </View>

          {incomingRequest ? (
            <View style={styles.incomingBox}>
              <View style={styles.incomingTopRow}>
                <View>
                  <Text style={styles.incomingLabel}>Cuốc #{incomingRequest.tripId}</Text>
                  <Text style={styles.passengerName}>{incomingRequest.passenger.fullName}</Text>
                </View>
                <View style={styles.fareBadge}>
                  <Text style={styles.fareText}>{formatFare(incomingRequest.estimatedFare)}</Text>
                </View>
              </View>

              <RouteLine label="Đón" address={incomingRequest.pickup.address} color={palette.green} />
              <RouteLine label="Đến" address={incomingRequest.dropoff.address} color={palette.danger} />

              <View style={styles.requestMetaRow}>
                <Text style={styles.requestMetaText}>{formatDistance(incomingRequest.estimatedDistance)}</Text>
                <Text style={styles.requestMetaText}>{formatDuration(incomingRequest.estimatedDuration)}</Text>
              </View>

              {requestResponse?.tripId === incomingRequest.tripId ? (
                <View style={styles.activeTripBox}>
                  <View style={styles.acceptedBox}>
                    <MaterialCommunityIcons name="check-circle" size={rs(30)} color={palette.green} />
                    <Text style={styles.acceptedText}>
                      Cuốc #{requestResponse.tripId}. Trạng thái: {formatTripStatus(requestResponse.status)}.
                    </Text>
                  </View>

                  <View style={styles.tripProgressRail}>
                    {ACTIVE_TRIP_STEPS.map((step) => (
                      <View key={step.status} style={styles.tripProgressItem}>
                        <View
                          style={[
                            styles.tripProgressDot,
                            isTripStepCompleted(requestResponse.status, step.status) ? styles.tripProgressDotActive : null,
                          ]}
                        />
                        <Text
                          style={[
                            styles.tripProgressLabel,
                            isTripStepCompleted(requestResponse.status, step.status) ? styles.tripProgressLabelActive : null,
                          ]}
                        >
                          {step.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {getNextDriverStatus(requestResponse.status) ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(updatingTripStatus)}
                      onPress={() => {
                        const nextStatus = getNextDriverStatus(requestResponse.status);

                        if (nextStatus) {
                          void handleUpdateActiveTripStatus(nextStatus);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.statusButton,
                        pressed && !updatingTripStatus ? styles.pressedButton : null,
                        updatingTripStatus ? styles.disabledButton : null,
                      ]}
                    >
                      {updatingTripStatus ? (
                        <ActivityIndicator color={palette.card} />
                      ) : (
                        <MaterialCommunityIcons
                          name={getNextStatusIcon(getNextDriverStatus(requestResponse.status))}
                          size={rs(30)}
                          color={palette.card}
                        />
                      )}
                      <Text style={styles.statusButtonText}>
                        {updatingTripStatus
                          ? 'Đang cập nhật'
                          : getNextStatusButtonLabel(getNextDriverStatus(requestResponse.status))}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.completedTripStack}>
                      <View style={styles.completedTripBox}>
                        <MaterialCommunityIcons name="flag-checkered" size={rs(30)} color={palette.green} />
                        <Text style={styles.completedTripText}>Chuyến đã hoàn thành. Bạn có thể quay lại trạng thái nhận cuốc mới.</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={resetCompletedTrip}
                        style={({ pressed }) => [styles.readyButton, pressed ? styles.pressedButton : null]}
                      >
                        <MaterialCommunityIcons name="radar" size={rs(28)} color={palette.card} />
                        <Text style={styles.readyButtonText}>Sẵn sàng nhận cuốc mới</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(respondingAction)}
                    onPress={() => void handleRespondToRequest('REJECT')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.rejectButton,
                      pressed && !respondingAction ? styles.pressedButton : null,
                      respondingAction ? styles.disabledButton : null,
                    ]}
                  >
                    {respondingAction === 'REJECT' ? (
                      <ActivityIndicator color={palette.danger} />
                    ) : (
                      <MaterialCommunityIcons name="close-circle-outline" size={rs(30)} color={palette.danger} />
                    )}
                    <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                      {respondingAction === 'REJECT' ? 'Đang từ chối' : 'Từ chối'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(respondingAction)}
                    onPress={() => void handleRespondToRequest('ACCEPT')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.acceptButton,
                      pressed && !respondingAction ? styles.pressedButton : null,
                      respondingAction ? styles.disabledButton : null,
                    ]}
                  >
                    {respondingAction === 'ACCEPT' ? (
                      <ActivityIndicator color={palette.card} />
                    ) : (
                      <MaterialCommunityIcons name="check-circle-outline" size={rs(30)} color={palette.card} />
                    )}
                    <Text style={[styles.actionButtonText, styles.acceptButtonText]}>
                      {respondingAction === 'ACCEPT' ? 'Đang nhận' : 'Nhận cuốc'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyRequestBox}>
              <MaterialCommunityIcons name={isOnline ? 'radar' : 'power-plug-off-outline'} size={rs(66)} color={palette.muted} />
              <Text style={styles.emptyTitle}>{isOnline ? 'Đang nghe cuốc mới' : 'Chưa online'}</Text>
              <Text style={styles.emptyText}>
                {isOnline
                  ? 'Khi backend hoặc mock realtime gửi request, thông tin cuốc sẽ xuất hiện tại đây.'
                  : 'Bật công tắc online để mở heartbeat và kênh request của tài xế.'}
              </Text>
            </View>
          )}
        </View>

        {latestNotification ? (
          <View style={styles.notificationCard}>
            <MaterialCommunityIcons name="message-badge-outline" size={rs(36)} color={palette.blue} />
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>{latestNotification.title}</Text>
              <Text style={styles.notificationBody}>{latestNotification.body}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant" label="Home" active />
        <DriverNavItem icon="cash-multiple" label="Earnings" onPress={() => router.push('/(driver)/earnings')} />
        <DriverNavItem icon="history" label="Activity" />
        <DriverNavItem icon="account-outline" label="Account" />
      </View>
    </SafeAreaView>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'amber' | 'muted';
}) {
  const toneStyle = getToneStyle(tone);

  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: toneStyle.background }]}>
        <MaterialCommunityIcons name={icon} size={rs(30)} color={toneStyle.color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionTile, pressed ? styles.pressedButton : null]}
    >
      <View style={styles.quickActionIcon}>
        <MaterialCommunityIcons name={icon} size={rs(30)} color={palette.blueInk} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function DriverMapPreview({ location }: { location: LocationPoint | null }) {
  const mapPoint = location ?? getDefaultLocationPoint();
  const region = getDriverMapRegion(mapPoint);

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapCanvas}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          region={region}
          loadingEnabled
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={false}
          toolbarEnabled={false}
          zoomControlEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{ latitude: mapPoint.lat, longitude: mapPoint.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Vị trí tài xế"
            description={mapPoint.address}
          >
            <View style={styles.mapPin}>
              <View style={styles.mapPinHalo} />
              <View style={styles.mapPinBubble}>
                <MaterialCommunityIcons name="navigation-variant" size={rs(24)} color={palette.card} />
              </View>
            </View>
          </Marker>
        </MapView>
      </View>

      <View style={styles.mapLocationRow}>
        <View style={styles.mapLocationIcon}>
          <MaterialCommunityIcons name="crosshairs-gps" size={rs(28)} color={palette.blue} />
        </View>
        <View style={styles.mapLocationCopy}>
          <Text style={styles.mapLocationTitle} numberOfLines={1}>
            {location?.address ?? 'Công viên Tao Đàn, Quận 1'}
          </Text>
          <Text style={styles.mapLocationCoords} selectable>
            {location ? formatCoordinates(location) : '10.76262, 106.66017'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getDriverMapRegion(location: LocationPoint): Region {
  return {
    latitude: location.lat,
    longitude: location.lng,
    latitudeDelta: DRIVER_MAP_DELTA,
    longitudeDelta: DRIVER_MAP_DELTA,
  };
}

function DriverNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, active ? styles.navItemActive : null, pressed ? styles.pressedButton : null]}
    >
      <MaterialCommunityIcons name={icon} size={rs(30)} color={active ? palette.greenDark : palette.muted} />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function RouteLine({ label, address, color }: { label: string; address: string; color: string }) {
  return (
    <View style={styles.routeLine}>
      <View style={[styles.routeDot, { backgroundColor: color }]} />
      <View style={styles.routeCopy}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeAddress} numberOfLines={2} selectable>
          {address}
        </Text>
      </View>
    </View>
  );
}

function getListeningCopy(
  isOnline: boolean,
  request: DriverTripRequest | null,
): { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string } {
  if (request) {
    return {
      icon: 'bell-ring-outline',
      title: 'Cuốc mới đang chờ',
      text: `${request.passenger.fullName} - ${formatFare(request.estimatedFare)} - phản hồi để giữ tỷ lệ nhận cuốc.`,
    };
  }

  if (isOnline) {
    return {
      icon: 'target',
      title: 'Đang nghe cuốc mới',
      text: 'Hệ thống đang tìm khách hàng gần nhất...',
    };
  }

  return {
    icon: 'power-sleep',
    title: 'Tạm dừng nhận cuốc',
    text: 'Bật online để mở kênh request, GPS và heartbeat.',
  };
}

function getToneStyle(tone: 'green' | 'blue' | 'amber' | 'muted') {
  if (tone === 'green') {
    return { color: palette.green, background: palette.greenSoft };
  }

  if (tone === 'blue') {
    return { color: palette.blue, background: palette.blueSoft };
  }

  if (tone === 'amber') {
    return { color: palette.amber, background: palette.amberSoft };
  }

  return { color: palette.muted, background: '#edf2ef' };
}

function getRealtimeCopy(mode: DriverRealtimeMode): { label: string; tone: 'green' | 'blue' | 'amber' | 'muted' } {
  if (mode === 'mock') {
    return { label: 'Mock realtime', tone: 'green' };
  }

  if (mode === 'remote') {
    return { label: 'Remote WS', tone: 'blue' };
  }

  if (mode === 'connecting') {
    return { label: 'Đang nối', tone: 'amber' };
  }

  if (mode === 'fallback') {
    return { label: 'Fallback', tone: 'amber' };
  }

  return { label: 'Đóng', tone: 'muted' };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatCoordinates(location: LocationPoint) {
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function formatTrackingTime(value: string | null) {
  if (!value) {
    return 'Chưa gửi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFare(value: number) {
  return Math.round(value).toLocaleString('vi-VN') + 'đ';
}

function formatDistance(distance?: number) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatDuration(duration?: number) {
  if (!duration || duration <= 0) {
    return '-- phút';
  }

  return Math.round(duration) + ' phút';
}

function formatTripStatus(status: TripStatus) {
  if (status === 'ACCEPTED') {
    return 'Đã nhận';
  }

  if (status === 'ARRIVED') {
    return 'Tài xế đã đến';
  }

  if (status === 'IN_PROGRESS') {
    return 'Đang di chuyển';
  }

  if (status === 'COMPLETED') {
    return 'Hoàn thành';
  }

  if (status === 'SEARCHING') {
    return 'Đang tìm tài xế';
  }

  return status;
}

function getNextDriverStatus(status: TripStatus): TripStatus | null {
  if (status === 'ACCEPTED') {
    return 'ARRIVED';
  }

  if (status === 'ARRIVED') {
    return 'IN_PROGRESS';
  }

  if (status === 'IN_PROGRESS') {
    return 'COMPLETED';
  }

  return null;
}

function isDriverTrackingStatus(status: TripStatus) {
  return status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS';
}

function getNextStatusButtonLabel(status: TripStatus | null) {
  if (status === 'ARRIVED') {
    return 'Đã đến điểm đón';
  }

  if (status === 'IN_PROGRESS') {
    return 'Bắt đầu chuyến';
  }

  if (status === 'COMPLETED') {
    return 'Hoàn thành chuyến';
  }

  return 'Cập nhật chuyến';
}

function getNextStatusIcon(status: TripStatus | null): keyof typeof MaterialCommunityIcons.glyphMap {
  if (status === 'ARRIVED') {
    return 'map-marker-check';
  }

  if (status === 'IN_PROGRESS') {
    return 'navigation-variant';
  }

  if (status === 'COMPLETED') {
    return 'flag-checkered';
  }

  return 'check-circle-outline';
}

function getDriverStatusMessage(status: TripStatus) {
  if (status === 'ARRIVED') {
    return 'Bạn đã đến điểm đón. Hãy đón khách và bắt đầu chuyến khi sẵn sàng.';
  }

  if (status === 'IN_PROGRESS') {
    return 'Chuyến đang diễn ra. Tiếp tục di chuyển đến điểm trả khách.';
  }

  if (status === 'COMPLETED') {
    return 'Chuyến đã hoàn thành. Cảm ơn bạn đã chạy cùng GoRide.';
  }

  return `Trạng thái chuyến: ${formatTripStatus(status)}.`;
}

function getDriverTrackingMessage(status: TripStatus) {
  if (isDriverTrackingStatus(status)) {
    return 'GPS cuốc đang gửi vị trí cho hành khách.';
  }

  if (status === 'COMPLETED') {
    return 'GPS cuốc đã dừng sau khi hoàn thành chuyến.';
  }

  return 'GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.';
}

function isTripStepCompleted(currentStatus: TripStatus, stepStatus: TripStatus) {
  const currentIndex = ACTIVE_TRIP_STEPS.findIndex((step) => step.status === currentStatus);
  const stepIndex = ACTIVE_TRIP_STEPS.findIndex((step) => step.status === stepStatus);

  return currentIndex >= 0 && stepIndex >= 0 && stepIndex <= currentIndex;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(30),
    paddingTop: rvs(18),
    paddingBottom: rvs(154),
    gap: rvs(16),
    backgroundColor: '#f7faf8',
  },
  consoleHeader: {
    minHeight: rvs(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(16),
  },
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  driverAvatar: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(23),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfeeda',
  },
  consoleTitle: {
    color: palette.blueInk,
    fontSize: rf(30),
    fontWeight: '900',
  },
  bellButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: rvs(8),
    right: rs(8),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: palette.danger,
  },
  heroCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: rs(6),
    borderLeftColor: palette.green,
    gap: rvs(12),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(12),
    height: rvs(34),
    borderRadius: rs(999),
  },
  statusPillOnline: {
    backgroundColor: palette.greenSoft,
  },
  statusPillOffline: {
    backgroundColor: '#edf2ef',
  },
  statusDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
  },
  statusPillText: {
    fontSize: rf(24),
    fontWeight: '900',
  },
  statusTextOnline: {
    color: palette.greenDark,
  },
  statusTextOffline: {
    color: palette.muted,
  },
  title: {
    color: palette.ink,
    fontSize: rf(29),
    fontWeight: '900',
    lineHeight: rf(36),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(22),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  heroMetricRow: {
    flexDirection: 'row',
    gap: rs(18),
    paddingTop: rvs(12),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  metricTile: {
    flex: 1,
    padding: 0,
    gap: rvs(4),
  },
  metricIcon: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.ink,
    fontSize: rf(22),
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(12),
    borderRadius: rs(14),
    backgroundColor: palette.greenSoft,
  },
  loadingText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
  },
  listeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    padding: rs(22),
    borderRadius: rs(16),
    backgroundColor: '#d1f3df',
  },
  listeningCardHot: {
    backgroundColor: '#fff4d9',
  },
  listeningCardIdle: {
    backgroundColor: '#edf2ef',
  },
  listeningIcon: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: '#d8fbec',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#80a9ff',
  },
  listeningCopy: {
    flex: 1,
    gap: rvs(4),
  },
  listeningTitle: {
    color: palette.ink,
    fontSize: rf(25),
    fontWeight: '900',
  },
  listeningText: {
    color: palette.muted,
    fontSize: rf(21),
    fontWeight: '700',
    lineHeight: rf(29),
  },
  statGrid: {
    flexDirection: 'row',
    gap: rs(16),
  },
  statCard: {
    flex: 1,
    minHeight: rvs(86),
    paddingHorizontal: rs(22),
    paddingVertical: rvs(18),
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    justifyContent: 'center',
    gap: rvs(4),
  },
  statLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '900',
  },
  statValue: {
    color: palette.ink,
    fontSize: rf(32),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: rs(14),
  },
  quickActionTile: {
    flex: 1,
    minHeight: rvs(86),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rvs(12),
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  quickActionIcon: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf8f2',
  },
  quickActionLabel: {
    color: palette.ink,
    fontSize: rf(17),
    fontWeight: '800',
    textAlign: 'center',
  },
  mapCard: {
    overflow: 'hidden',
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  mapCanvas: {
    height: rvs(148),
    overflow: 'hidden',
    backgroundColor: '#e8f2ee',
  },
  mapPin: {
    width: rs(54),
    height: rs(54),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinHalo: {
    position: 'absolute',
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: '#dce8ff',
  },
  mapPinBubble: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
    borderWidth: rs(4),
    borderColor: palette.card,
  },
  mapLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    padding: rs(22),
  },
  mapLocationIcon: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLocationCopy: {
    flex: 1,
    gap: rvs(3),
  },
  mapLocationTitle: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '800',
  },
  mapLocationCoords: {
    color: '#5f6c64',
    fontSize: rf(22),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  locationCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(16),
  },
  sectionIcon: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(18),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestIcon: {
    backgroundColor: palette.blueSoft,
  },
  sectionCopy: {
    flex: 1,
    gap: rvs(4),
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: rf(28),
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: rf(21),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  locationBox: {
    padding: rs(18),
    borderRadius: rs(14),
    backgroundColor: '#f6faf8',
    gap: rvs(8),
  },
  locationLabel: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  locationValue: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '900',
    lineHeight: rf(32),
  },
  locationCoords: {
    color: palette.green,
    fontSize: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
    padding: rs(16),
    borderRadius: rs(14),
    backgroundColor: palette.blueSoft,
  },
  trackingIcon: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingCopy: {
    flex: 1,
    gap: rvs(4),
  },
  trackingLabel: {
    color: palette.blue,
    fontSize: rf(22),
    fontWeight: '900',
  },
  trackingText: {
    color: '#27446f',
    fontSize: rf(21),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  trackingTime: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  requestCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(16),
  },
  incomingBox: {
    padding: rs(20),
    borderRadius: rs(16),
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dce7ff',
    gap: rvs(18),
  },
  incomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  incomingLabel: {
    color: palette.blue,
    fontSize: rf(20),
    fontWeight: '900',
  },
  passengerName: {
    color: palette.ink,
    fontSize: rf(36),
    fontWeight: '900',
  },
  fareBadge: {
    paddingHorizontal: rs(18),
    paddingVertical: rvs(10),
    borderRadius: rs(18),
    backgroundColor: palette.greenSoft,
  },
  fareText: {
    color: palette.greenDark,
    fontSize: rf(26),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  routeDot: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    marginTop: rvs(9),
  },
  routeCopy: {
    flex: 1,
    gap: rvs(3),
  },
  routeLabel: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  routeAddress: {
    color: palette.ink,
    fontSize: rf(27),
    fontWeight: '800',
    lineHeight: rf(36),
  },
  requestMetaRow: {
    flexDirection: 'row',
    gap: rs(14),
  },
  requestMetaText: {
    color: palette.blue,
    fontSize: rf(24),
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  actionButton: {
    flex: 1,
    minHeight: rvs(58),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(8),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(12),
  },
  acceptButton: {
    backgroundColor: palette.green,
  },
  rejectButton: {
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: '#ffcaca',
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: rf(22),
    fontWeight: '900',
  },
  acceptButtonText: {
    color: palette.card,
  },
  rejectButtonText: {
    color: palette.danger,
  },
  acceptedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: palette.greenSoft,
  },
  acceptedText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  activeTripBox: {
    gap: rvs(14),
  },
  tripProgressRail: {
    padding: rs(16),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: '#dce7ff',
    gap: rvs(10),
  },
  tripProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  tripProgressDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: '#d6ddd9',
  },
  tripProgressDotActive: {
    backgroundColor: palette.green,
  },
  tripProgressLabel: {
    color: palette.muted,
    fontSize: rf(22),
    fontWeight: '800',
  },
  tripProgressLabelActive: {
    color: palette.greenDark,
  },
  statusButton: {
    minHeight: rvs(62),
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(10),
    paddingHorizontal: rs(18),
    paddingVertical: rvs(14),
    backgroundColor: palette.blue,
  },
  statusButtonText: {
    color: palette.card,
    fontSize: rf(23),
    fontWeight: '900',
  },
  completedTripStack: {
    gap: rvs(12),
  },
  completedTripBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: '#f0fff7',
    borderWidth: 1,
    borderColor: palette.backgroundDeep,
  },
  completedTripText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  readyButton: {
    minHeight: rvs(58),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(10),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(12),
    backgroundColor: palette.green,
  },
  readyButtonText: {
    color: palette.card,
    fontSize: rf(22),
    fontWeight: '900',
  },
  emptyRequestBox: {
    minHeight: rvs(240),
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(24),
    borderRadius: rs(30),
    backgroundColor: '#f6faf8',
    gap: rvs(12),
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: rf(34),
    fontWeight: '900',
  },
  emptyText: {
    color: palette.muted,
    fontSize: rf(24),
    fontWeight: '700',
    lineHeight: rf(34),
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(16),
    padding: rs(24),
    borderRadius: rs(32),
    backgroundColor: palette.blueSoft,
  },
  notificationCopy: {
    flex: 1,
    gap: rvs(4),
  },
  notificationTitle: {
    color: palette.blue,
    fontSize: rf(28),
    fontWeight: '900',
  },
  notificationBody: {
    color: '#27446f',
    fontSize: rf(22),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: rvs(86),
    paddingHorizontal: rs(22),
    paddingTop: rvs(12),
    paddingBottom: rvs(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navItem: {
    flex: 1,
    minHeight: rvs(62),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(4),
    borderRadius: rs(999),
  },
  navItemActive: {
    backgroundColor: palette.mint,
  },
  navLabel: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '900',
  },
  navLabelActive: {
    color: palette.greenDark,
  },
});
