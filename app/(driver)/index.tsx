import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { rf, rs, rvs } from '@/constants/responsive';
import { getCurrentLocationPoint, getDefaultLocationPoint, requestLocationPermission } from '@/lib/location-service';
import { respondToTrip, setDriverOnline } from '@/lib/ride-api';
import {
  connectRealtime,
  sendDriverHeartbeat,
  subscribeDriverRequests,
  subscribeNotifications,
  type RealtimeSubscription,
} from '@/lib/realtime';
import type { DriverAction, DriverTripRequest, LocationPoint, TripStatus, WsNotification } from '@/types/ride';

const DRIVER_ID = 5;

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
  blueSoft: '#e9f0ff',
};

const shadow = {
  shadowColor: '#03130c',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.14,
  shadowRadius: 28,
  elevation: 8,
};

type DriverRealtimeMode = 'offline' | 'connecting' | 'mock' | 'remote' | 'fallback';

export default function DriverScreen() {
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
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const requestSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const notificationSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const realtimeCopy = useMemo(() => getRealtimeCopy(realtimeMode), [realtimeMode]);

  const stopOnlineServices = useCallback(() => {
    requestSubscriptionRef.current?.unsubscribe();
    requestSubscriptionRef.current = null;
    notificationSubscriptionRef.current?.unsubscribe();
    notificationSubscriptionRef.current = null;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    const sendHeartbeat = () => {
      const heartbeat = sendDriverHeartbeat(DRIVER_ID);
      setLastHeartbeatAt(heartbeat.sentAt);
    };

    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 15000);
  }, []);

  const startRealtime = useCallback(async () => {
    setRealtimeMode('connecting');

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

  useEffect(() => {
    return () => stopOnlineServices();
  }, [stopOnlineServices]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { minHeight: height }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
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
                <View style={styles.acceptedBox}>
                  <MaterialCommunityIcons name="check-circle" size={rs(30)} color={palette.green} />
                  <Text style={styles.acceptedText}>
                    Đã nhận cuốc #{requestResponse.tripId}. Trạng thái: {formatTripStatus(requestResponse.status)}.
                    Cập nhật trạng thái chuyến sẽ được nối ở commit sau.
                  </Text>
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

  if (status === 'SEARCHING') {
    return 'Đang tìm tài xế';
  }

  return status;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(34),
    paddingTop: rvs(30),
    paddingBottom: rvs(46),
    gap: rvs(24),
    backgroundColor: palette.background,
  },
  heroCard: {
    padding: rs(34),
    borderRadius: rs(40),
    backgroundColor: '#f7fff9',
    borderWidth: 1,
    borderColor: palette.backgroundDeep,
    gap: rvs(22),
    ...shadow,
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
    gap: rs(10),
    paddingHorizontal: rs(18),
    height: rvs(48),
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
    fontSize: rf(22),
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
    fontSize: rf(54),
    fontWeight: '900',
    lineHeight: rf(62),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(28),
    fontWeight: '700',
    lineHeight: rf(38),
  },
  heroMetricRow: {
    flexDirection: 'row',
    gap: rs(16),
  },
  metricTile: {
    flex: 1,
    padding: rs(18),
    borderRadius: rs(28),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(8),
  },
  metricIcon: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.ink,
    fontSize: rf(26),
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: palette.greenSoft,
  },
  loadingText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
  },
  locationCard: {
    padding: rs(28),
    borderRadius: rs(36),
    backgroundColor: palette.card,
    gap: rvs(20),
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(16),
  },
  sectionIcon: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(22),
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
    fontSize: rf(34),
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: rf(24),
    fontWeight: '700',
    lineHeight: rf(34),
  },
  locationBox: {
    padding: rs(22),
    borderRadius: rs(28),
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
    fontSize: rf(28),
    fontWeight: '900',
    lineHeight: rf(38),
  },
  locationCoords: {
    color: palette.green,
    fontSize: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  requestCard: {
    padding: rs(28),
    borderRadius: rs(36),
    backgroundColor: palette.card,
    gap: rvs(20),
    ...shadow,
  },
  incomingBox: {
    padding: rs(22),
    borderRadius: rs(30),
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
});
