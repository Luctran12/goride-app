import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriverInfoCard, MapPicker, TripCompletionCard, TripEtaCard, TripStatusTimeline } from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';
import { fetchRoute } from '@/lib/location-service';
import { cancelTrip, getDriverLocation, getTrip } from '@/lib/ride-api';
import { getLocationToWords } from '@/lib/three-word-location-api';
import {
  connectRealtime,
  sendTripStatus,
  subscribeRealtimeConnection,
  subscribeTrip,
  subscribeTripMessages,
  type RealtimeSubscription,
} from '@/lib/realtime';
import { getTripMessageUnreadCount } from '@/lib/trip-message-api';
import type { DriverLocationUpdate, LocationPoint, TripDetail, TripRating, TripStatus, WsNotification } from '@/types/ride';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
  dangerSoft: '#fff0f0',
  green: '#00b67a',
  greenSoft: '#dff8ef',
  amber: '#f59e0b',
  amberSoft: '#fff7df',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

type VehicleDisplay = {
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type RealtimeMode = 'connecting' | 'mock' | 'remote' | 'fallback' | 'unavailable';
type FooterAction = {
  label: string;
  helper: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  variant: 'danger' | 'primary' | 'success' | 'disabled';
  onPress?: () => void;
};

function getDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export default function WaitingDriverScreen() {
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  const { height: screenHeight } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const tripId = readParam(params.tripId);
  const tripStatus = readParam(params.tripStatus) ?? 'SEARCHING';
  const numericTripId = parseNumberParam(tripId);
  const vehicleType = readParam(params.vehicleType);
  const vehicleTypeEnum = readParam(params.vehicleTypeEnum);
  const pickup = parseLocationPointParam(params.pickup);
  const dropoff = parseLocationPointParam(params.dropoff);
  const pickupAddress = pickup?.address ?? readParam(params.pickupLabel) ?? t('booking.pickupPoint', 'Điểm đón');
  const dropoffAddress = dropoff?.address ?? readParam(params.destLabel) ?? t('booking.dropoffPoint', 'Điểm đến');
  const distance = parseNumberParam(readParam(params.estimatedDistance) ?? readParam(params.distance));
  const duration = parseNumberParam(readParam(params.estimatedDuration));
  const fare = parseNumberParam(readParam(params.estimatedFare));
  const paymentMethodParam = readParam(params.paymentMethod);
  const paymentLabel = paymentMethodParam === 'CASH'
    ? t('booking.cash', 'Tiền mặt')
    : (readParam(params.paymentLabel) ?? t('booking.cash', 'Tiền mặt'));
  const promoCode = readParam(params.promoCode);
  const vehicle = useMemo(() => getVehicleDisplay(vehicleType, vehicleTypeEnum), [vehicleType, vehicleTypeEnum]);
  const [liveStatus, setLiveStatus] = useState<TripStatus>(() => normalizeTripStatus(tripStatus));
  const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
  const [realtimeMode, setRealtimeMode] = useState<RealtimeMode>(numericTripId ? 'connecting' : 'unavailable');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [lastTrackingAt, setLastTrackingAt] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);
  const [tripDetailError, setTripDetailError] = useState<string | null>(null);
  const [tripDetailUpdatedAt, setTripDetailUpdatedAt] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [trackingMapHeight, setTrackingMapHeight] = useState(() => Math.max(rvs(235), screenHeight * 0.44));

  const [pickupThreeWords, setPickupThreeWords] = useState<string | null>(null);
  const [dropoffThreeWords, setDropoffThreeWords] = useState<string | null>(null);
  const [loadingPickupWords, setLoadingPickupWords] = useState(false);
  const [loadingDropoffWords, setLoadingDropoffWords] = useState(false);
  const isScreenFocusedRef = useRef(isScreenFocused);
  const seenChatMessageIdsRef = useRef(new Set<string>());
  const chatTripIdRef = useRef<number | null>(numericTripId);

  const handleFetchPickupThreeWords = async () => {
    if (!pickup?.lat || !pickup?.lng || loadingPickupWords) return;
    setLoadingPickupWords(true);
    try {
      const res = await getLocationToWords(pickup.lat, pickup.lng);
      setPickupThreeWords(res.wordAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('booking.errThreeWords', 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.');
      Alert.alert(t('booking.threeWordsPickupTitle', 'Địa chỉ 3 từ điểm đón'), message);
    } finally {
      setLoadingPickupWords(false);
    }
  };

  const handleFetchDropoffThreeWords = async () => {
    if (!dropoff?.lat || !dropoff?.lng || loadingDropoffWords) return;
    setLoadingDropoffWords(true);
    try {
      const res = await getLocationToWords(dropoff.lat, dropoff.lng);
      setDropoffThreeWords(res.wordAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('booking.errThreeWords', 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.');
      Alert.alert(t('booking.threeWordsDropoffTitle', 'Địa chỉ 3 từ điểm đến'), message);
    } finally {
      setLoadingDropoffWords(false);
    }
  };

  const handleCopyThreeWords = async (address: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(address);
      }
      Alert.alert(t('booking.copiedTitle', 'Đã sao chép'), t('booking.threeWordsCopied', { address }, `Địa chỉ 3 từ: ${address}`));
    } catch {
      Alert.alert(t('booking.threeWordsLabel', 'Địa chỉ 3 từ'), address);
    }
  };

  const handleShareThreeWords = async (address: string) => {
    try {
      await Share.share({
        message: `GoRide ///: ${address}`,
        title: t('booking.threeWordsLabel', 'Địa chỉ 3 từ'),
      });
    } catch {
      // ignore
    }
  };
  const lastFetchedLocationRef = useRef<{ tripId: number; status: TripStatus | null; lat: number; lng: number } | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const statusCopy = getStatusCopy(liveStatus, t);
  const realtimeCopy = getRealtimeCopy(realtimeMode, t);
  const fallbackPollingEnabled = Boolean(
    numericTripId &&
      !isTerminalTripStatus(liveStatus) &&
      (realtimeMode === 'fallback' || realtimeMode === 'remote' || realtimeMode === 'mock'),
  );

  const hydrateTripDetail = useCallback(async () => {
    if (!numericTripId) {
      return;
    }

    setTripDetailLoading(true);

    try {
      const detail = await getTrip(numericTripId);
      setTripDetail(detail);
      setTripDetailUpdatedAt(new Date().toISOString());
      setTripDetailError(null);
      setLiveStatus((currentStatus) => mergeTripStatus(currentStatus, detail.status));
    } catch (error: unknown) {
      setTripDetailError(getErrorMessage(error));
    } finally {
      setTripDetailLoading(false);
    }
  }, [numericTripId]);

  const applyDriverLocation = useCallback((location: DriverLocationUpdate) => {
    setDriverLocation(location);
    setLastTrackingAt(location.updatedAt ?? new Date().toISOString());
    setTrackingError(null);
  }, []);

  const handleRatingSubmitted = useCallback((rating: TripRating) => {
    setTripDetail((currentDetail) =>
      currentDetail
        ? {
            ...currentDetail,
            passengerRating: rating,
          }
        : currentDetail,
    );
    setTripDetailUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  // Fetch routing coordinates dynamically based on trip status
  useEffect(() => {
    if (!pickup?.lat || !dropoff?.lat || !numericTripId) {
      setRouteCoordinates([]);
      lastFetchedLocationRef.current = null;
      lastRouteFetchTimeRef.current = 0;
      return;
    }

    const tripId = numericTripId;
    const status = liveStatus;
    const now = Date.now();

    // 1. Nếu đang SEARCHING (chưa có tài xế nhận): Vẽ lộ trình từ Pickup -> Dropoff
    if (status === 'SEARCHING' || !driverLocation?.lat || !driverLocation?.lng) {
      // Chỉ fetch 1 lần khi ở trạng thái SEARCHING
      if (lastFetchedLocationRef.current?.tripId === tripId && lastFetchedLocationRef.current?.status === 'SEARCHING') {
        return;
      }
      
      void fetchRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: dropoff.lat, lng: dropoff.lng }
      )
        .then((res) => {
          setRouteCoordinates(res.coordinates);
          lastFetchedLocationRef.current = { tripId, status: 'SEARCHING', lat: pickup.lat, lng: pickup.lng };
          lastRouteFetchTimeRef.current = now;
        })
        .catch(() => setRouteCoordinates([]));
      return;
    }

    // 2. Có vị trí tài xế: Xác định điểm bắt đầu và điểm kết thúc dựa theo trạng thái
    const isHeadingToPickup = status === 'ACCEPTED' || status === 'ARRIVED';
    const targetLoc = isHeadingToPickup ? pickup : dropoff;
    const currentLoc = { lat: driverLocation.lat, lng: driverLocation.lng };

    // Check throttle and distance moved
    const isFirstFetchForStatus =
      !lastFetchedLocationRef.current ||
      lastFetchedLocationRef.current.tripId !== tripId ||
      lastFetchedLocationRef.current.status !== status;

    if (!isFirstFetchForStatus && lastFetchedLocationRef.current) {
      // Throttle: fetch at most once every 12 seconds when moving
      if (now - lastRouteFetchTimeRef.current < 12000) {
        return;
      }
      // Distance check: driver must move > 50 meters
      const distanceMoved = getDistanceBetweenPoints(
        currentLoc.lat,
        currentLoc.lng,
        lastFetchedLocationRef.current.lat,
        lastFetchedLocationRef.current.lng
      );
      if (distanceMoved <= 50) {
        return;
      }
    }

    void fetchRoute(
      { lat: currentLoc.lat, lng: currentLoc.lng },
      { lat: targetLoc.lat, lng: targetLoc.lng }
    )
      .then((res) => {
        setRouteCoordinates(res.coordinates);
        lastFetchedLocationRef.current = { tripId, status, lat: currentLoc.lat, lng: currentLoc.lng };
        lastRouteFetchTimeRef.current = now;
      })
      .catch(() => {});

  }, [liveStatus, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driverLocation?.lat, driverLocation?.lng, numericTripId]);

  useEffect(() => {
    setLiveStatus(normalizeTripStatus(tripStatus));
  }, [tripStatus]);

  useEffect(() => {
    void hydrateTripDetail();
  }, [hydrateTripDetail]);

  useEffect(() => {
    if (!numericTripId) {
      setRealtimeMode('unavailable');
      setTrackingError(t('booking.errNoTripId', 'Chưa có mã chuyến để theo dõi vị trí tài xế.'));
      return;
    }

    let isActive = true;
    let subscription: RealtimeSubscription | null = null;
    let connectionSubscription: RealtimeSubscription | null = null;
    let remoteConnectionOpened = false;

    setRealtimeMode('connecting');
    setTrackingError(null);

    connectionSubscription = subscribeRealtimeConnection((state) => {
      if (!isActive || state.mode === 'mock') {
        return;
      }

      if (state.status === 'connected') {
        remoteConnectionOpened = true;
        setRealtimeMode('remote');
        setTrackingError(null);
        return;
      }

      if (state.status === 'connecting') {
        setRealtimeMode('connecting');
        return;
      }

      if (state.status === 'reconnecting' && remoteConnectionOpened) {
        setRealtimeMode('fallback');
        setTrackingError('K?nh realtime ?ang k?t n?i l?i, GoRide t?m d?ng REST fallback.');
        return;
      }

      if (state.status === 'error') {
        setRealtimeMode('fallback');
        setTrackingError(state.lastError ?? 'K?nh realtime t?m th?i gi?n ?o?n.');
      }
    });

    connectRealtime()
      .then((connection) => {
        if (!isActive) {
          return;
        }

        setRealtimeMode(connection.mode);
        subscription = subscribeTrip(numericTripId, {
          onStatus: (message) => {
            setLiveStatus(message.status);
            setLastTrackingAt(message.updatedAt);
            setTrackingError(null);
            void hydrateTripDetail();
          },
          onLocation: applyDriverLocation,
          onNotification: (notification) => {
            setLatestNotification(notification);
            void hydrateTripDetail();
          },
          onError: (error) => {
            setTrackingError(error.message);
            setRealtimeMode('fallback');
          },
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setTrackingError(getErrorMessage(error));
        setRealtimeMode('fallback');
      });

    return () => {
      isActive = false;
      subscription?.unsubscribe();
      connectionSubscription?.unsubscribe();
    };
  }, [applyDriverLocation, hydrateTripDetail, numericTripId]);

  useEffect(() => {
    isScreenFocusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  useEffect(() => {
    if (chatTripIdRef.current !== numericTripId) {
      chatTripIdRef.current = numericTripId;
      seenChatMessageIdsRef.current.clear();
      setUnreadChatCount(0);
    }

    if (!numericTripId || !isScreenFocused || !isChatVisibleStatus(liveStatus)) {
      return;
    }

    void getTripMessageUnreadCount(numericTripId)
      .then((result) => setUnreadChatCount(result.unreadCount))
      .catch(() => undefined);
  }, [isScreenFocused, liveStatus, numericTripId]);

  useEffect(() => {
    if (
      !numericTripId ||
      !isChatVisibleStatus(liveStatus) ||
      (realtimeMode !== 'mock' && realtimeMode !== 'remote')
    ) {
      return;
    }

    const subscription = subscribeTripMessages(numericTripId, {
      onMessage: (message) => {
        if (message.senderRole !== 'DRIVER' || !isScreenFocusedRef.current) {
          return;
        }

        const messageKey = message.id > 0 ? `id:${message.id}` : `client:${message.clientMessageId}`;
        if (seenChatMessageIdsRef.current.has(messageKey)) {
          return;
        }

        seenChatMessageIdsRef.current.add(messageKey);
        setUnreadChatCount((current) => current + 1);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });

    return () => subscription.unsubscribe();
  }, [liveStatus, numericTripId, realtimeMode]);

  useEffect(() => {
    if (!numericTripId || !fallbackPollingEnabled) {
      return;
    }

    let isActive = true;

    const loadFallbackLocation = async () => {
      try {
        const location = await getDriverLocation(numericTripId);

        if (isActive) {
          applyDriverLocation(location);
        }
      } catch (error: unknown) {
        if (isActive) {
          setTrackingError(getErrorMessage(error));
        }
      }
    };

    loadFallbackLocation();
    const fallbackTimer = setInterval(loadFallbackLocation, 5000);

    return () => {
      isActive = false;
      clearInterval(fallbackTimer);
    };
  }, [applyDriverLocation, fallbackPollingEnabled, numericTripId]);

  const handleBackHome = () => router.replace('/(customer)');

  const confirmCancelTrip = async () => {
    if (cancelLoading) {
      return;
    }

    if (!numericTripId) {
      setLiveStatus('CANCELLED');
      router.replace('/(customer)');
      return;
    }

    setCancelLoading(true);

    try {
      const result = await cancelTrip(numericTripId);

      setLiveStatus(result.status);
      setLastTrackingAt(new Date().toISOString());
      setLatestNotification({
        type: 'TRIP_CANCELLED',
        title: t('booking.tripCancelledTitle', 'Chuyến đã hủy'),
        body: t('booking.tripCancelledMsg', 'Yêu cầu đặt xe của bạn đã được hủy thành công.'),
        data: { tripId: numericTripId },
      });
      sendTripStatus(numericTripId, result.status);
      void hydrateTripDetail();
      router.replace('/(customer)');
    } catch (error: unknown) {
      Alert.alert(t('booking.errCancelFailedTitle', 'Không thể hủy chuyến'), getErrorMessage(error, t('booking.tryAgainLater', 'Vui lòng thử lại sau ít phút.')));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(t('booking.cancelTripTitle', 'Hủy chuyến'), t('booking.cancelTripConfirmMsg', 'Bạn có chắc chắn muốn hủy yêu cầu đặt xe này không?'), [
      { text: t('booking.no', 'Không'), style: 'cancel' },
      { text: t('booking.cancelTripTitle', 'Hủy chuyến'), style: 'destructive', onPress: () => void confirmCancelTrip() },
    ]);
  };

  const footerAction: FooterAction = cancelLoading
    ? {
        label: t('booking.cancellingTrip', 'Đang hủy chuyến'),
        helper: t('booking.cancellingNotice', 'GoRide đang gửi yêu cầu hủy chuyến và cập nhật trạng thái cho bạn.'),
        icon: 'loading',
        variant: 'disabled',
      }
    : getFooterAction(liveStatus, {
        onCancel: handleCancel,
        onBackHome: handleBackHome,
      }, t);

  const openPassengerChat = () => {
    if (!numericTripId) {
      return;
    }

    setUnreadChatCount(0);
    router.push({
      pathname: '/(customer)/booking/chat' as any,
      params: {
        tripId: String(numericTripId),
        status: liveStatus,
        participantName: tripDetail?.driver?.fullName ?? t('booking.gorideDriver', 'Tài xế'),
      },
    });
  };

  const handleCallDriver = async () => {
    const phone = tripDetail?.driver?.phone?.trim();

    if (!phone) {
      Alert.alert(
        t('booking.phoneUnavailableTitle', 'Chưa có số điện thoại'),
        t('booking.phoneUnavailableMessage', 'Thông tin liên hệ của tài xế đang được cập nhật.'),
      );
      return;
    }

    const phoneUrl = `tel:${phone}`;
    if (!(await Linking.canOpenURL(phoneUrl))) {
      Alert.alert(
        t('booking.cannotCallTitle', 'Không thể gọi điện'),
        t('booking.cannotCallMessage', 'Thiết bị hiện không hỗ trợ cuộc gọi điện thoại.'),
      );
      return;
    }

    await Linking.openURL(phoneUrl);
  };

  if (!isTerminalTripStatus(liveStatus)) {
    const isSearching = liveStatus === 'SEARCHING';
    const isInProgress = liveStatus === 'IN_PROGRESS';
    const driver = tripDetail?.driver;
    const activeTargetLabel = isInProgress
      ? t('booking.dropoffPoint', 'Điểm đến')
      : t('booking.pickupPoint', 'Điểm đón');
    const activeTargetAddress = isInProgress ? dropoffAddress : pickupAddress;
    const tripEta = tripDetail?.estimatedDuration ?? duration;
    const tripDistance = tripDetail?.estimatedDistance ?? distance;

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.card} />

        <View style={styles.compactHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('booking.returnHome', 'Về trang chủ')}
            activeOpacity={0.72}
            onPress={handleBackHome}
            style={styles.backIconButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={rs(23)} color={palette.primary} />
          </TouchableOpacity>
          <View style={styles.compactHeaderCopy}>
            <Text style={styles.compactHeaderTitle} numberOfLines={1}>{statusCopy.title}</Text>
            <Text style={styles.compactHeaderTrip}>
              {numericTripId ? t('booking.tripCode', { id: numericTripId }, `Cuốc #${numericTripId}`) : t('booking.initiating', 'Khởi tạo')}
            </Text>
          </View>
          <View style={[styles.headerStatusBadge, styles.compactHeaderStatusBadge, { backgroundColor: statusCopy.color + '1c' }]}>
            <View style={[styles.headerStatusDot, { backgroundColor: statusCopy.color }]} />
            <Text style={[styles.headerStatusText, { color: statusCopy.color }]} numberOfLines={1}>
              {statusCopy.label}
            </Text>
          </View>
        </View>

        <View
          style={styles.compactMapArea}
          onLayout={({ nativeEvent }) => {
            const nextHeight = Math.round(nativeEvent.layout.height);
            setTrackingMapHeight((current) => Math.abs(current - nextHeight) > 1 ? nextHeight : current);
          }}
        >
          <MapPicker
            mode="tracking"
            origin={pickup}
            destination={dropoff}
            driverLocation={driverLocation}
            routeCoordinates={routeCoordinates}
            status="ready"
            height={trackingMapHeight}
            allowSelection={false}
            showGpsButton={false}
            showUserLocation={false}
          />

          <View style={styles.compactMapStatus}>
            <MaterialCommunityIcons
              name={getCompactStatusIcon(liveStatus)}
              size={rs(20)}
              color={statusCopy.color}
            />
            <Text style={styles.compactMapStatusText} numberOfLines={1}>
              {trackingError ?? statusCopy.description}
            </Text>
          </View>
        </View>

        <View style={styles.compactSheet}>
          <View style={styles.compactHandle} />

          {isSearching ? (
            <View style={styles.compactSearchingRow}>
              <View style={styles.compactRadarIcon}>
                <Animated.View
                  style={[
                    styles.compactRadarPulse,
                    { transform: [{ scale: pulseAnim }], opacity: 0.16 },
                  ]}
                />
                <MaterialCommunityIcons name="radar" size={rs(30)} color={palette.card} />
              </View>
              <View style={styles.compactSearchingCopy}>
                <Text style={styles.compactSectionTitle}>{statusCopy.title}</Text>
                <Text style={styles.compactSectionSubtitle} numberOfLines={2}>{statusCopy.description}</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.compactDriverRow}>
                <View style={styles.compactDriverAvatar}>
                  <Text style={styles.compactDriverAvatarText}>{getDriverInitials(driver?.fullName)}</Text>
                </View>
                <View style={styles.compactDriverCopy}>
                  <Text style={styles.compactDriverName} numberOfLines={1}>
                    {driver?.fullName ?? t('booking.gorideDriver', 'Tài xế GoRide')}
                  </Text>
                  <Text style={styles.compactDriverMeta} numberOfLines={1}>
                    {formatCompactVehicle(driver)}
                    {driver?.vehiclePlate ? ` · ${driver.vehiclePlate}` : ''}
                  </Text>
                </View>
                {driver?.averageRating ? (
                  <View style={styles.compactRatingBadge}>
                    <MaterialCommunityIcons name="star" size={rs(16)} color={palette.amber} />
                    <Text style={styles.compactRatingText}>{driver.averageRating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.compactMetricsRow}>
                <View style={styles.compactMetric}>
                  <MaterialCommunityIcons name="clock-outline" size={rs(18)} color={palette.primary} />
                  <Text style={styles.compactMetricValue}>{formatDuration(tripEta, t)}</Text>
                </View>
                <View style={styles.compactMetricDivider} />
                <View style={styles.compactMetric}>
                  <MaterialCommunityIcons name="map-marker-distance" size={rs(18)} color={palette.primary} />
                  <Text style={styles.compactMetricValue}>{formatDistance(tripDistance, t)}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.compactTargetRow}>
            <View style={[styles.compactTargetIcon, { backgroundColor: isInProgress ? palette.dangerSoft : palette.primarySoft }]}>
              <MaterialCommunityIcons
                name={isInProgress ? 'flag-checkered' : 'map-marker-account-outline'}
                size={rs(22)}
                color={isInProgress ? palette.danger : palette.primary}
              />
            </View>
            <View style={styles.compactTargetCopy}>
              <Text style={styles.compactTargetLabel}>{activeTargetLabel}</Text>
              <Text style={styles.compactTargetAddress} numberOfLines={2}>{activeTargetAddress}</Text>
            </View>
          </View>

          {!isSearching ? (
            <View style={styles.compactActionRow}>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => void handleCallDriver()}
                style={styles.compactSecondaryAction}
              >
                <MaterialCommunityIcons name="phone-outline" size={rs(21)} color={palette.primary} />
                <Text style={styles.compactSecondaryActionText}>{t('booking.call', 'Gọi')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={openPassengerChat}
                style={[styles.compactSecondaryAction, styles.compactChatAction]}
              >
                <View>
                  <MaterialCommunityIcons name="message-text-outline" size={rs(21)} color={palette.card} />
                  {unreadChatCount > 0 ? (
                    <View style={styles.compactChatBadge}>
                      <Text style={styles.compactChatBadgeText}>{formatUnreadCount(unreadChatCount)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.compactSecondaryActionText, styles.compactChatActionText]}>
                  {t('booking.chat', 'Nhắn tin')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isInProgress ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={cancelLoading ? 1 : 0.82}
              disabled={cancelLoading}
              onPress={footerAction.onPress}
              style={[styles.compactPrimaryAction, cancelLoading && styles.compactPrimaryActionDisabled]}
            >
              {cancelLoading ? (
                <ActivityIndicator size="small" color={palette.card} />
              ) : (
                <MaterialCommunityIcons name={footerAction.icon} size={rs(20)} color={palette.card} />
              )}
              <Text style={styles.compactPrimaryActionText}>{footerAction.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* Floating Header on Map */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBackHome}
          style={styles.backIconButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={rs(24)} color={palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerTripBadge}>
          <Text style={styles.headerTripCode}>
            {numericTripId ? t('booking.tripCode', { id: numericTripId }, `Cuốc #${numericTripId}`) : t('booking.initiating', 'Khởi tạo')}
          </Text>
        </View>
        <View style={[styles.headerStatusBadge, { backgroundColor: statusCopy.color + '1c' }]}>
          <View style={[styles.headerStatusDot, { backgroundColor: statusCopy.color }]} />
          <Text style={[styles.headerStatusText, { color: statusCopy.color }]}>
            {statusCopy.label}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* HERO MAP VIEW */}
        <View style={styles.mapFrame}>
          <MapPicker
            mode="tracking"
            origin={pickup}
            destination={dropoff}
            driverLocation={driverLocation}
            routeCoordinates={routeCoordinates}
            status="ready"
            height={rvs(380)}
            allowSelection={false}
            showGpsButton={false}
            showUserLocation={false}
          />
        </View>

        {/* SEARCHING RADAR BANNER (When status is SEARCHING) */}
        {liveStatus === 'SEARCHING' && (
          <View style={styles.searchingCardCompact}>
            <View style={styles.searchingRadarCompact}>
              <Animated.View
                style={[
                  styles.pulseCircleCompact,
                  { transform: [{ scale: pulseAnim }], opacity: 0.18 },
                ]}
              />
              <View style={styles.centerCircleCompact}>
                <MaterialCommunityIcons name="radar" size={rs(38)} color="#ffffff" />
              </View>
            </View>
            <View style={styles.searchingCopyCompact}>
              <Text style={styles.searchingTitleCompact}>{statusCopy.title}</Text>
              <Text style={styles.searchingSubtitleCompact}>{statusCopy.description}</Text>
            </View>
          </View>
        )}

        {/* ETA & TIMELINE (When driver accepted/assigned) */}
        {liveStatus !== 'SEARCHING' && liveStatus !== 'COMPLETED' && liveStatus !== 'CANCELLED' && (
          <>
            <TripEtaCard
              status={liveStatus}
              estimatedDistance={distance}
              estimatedDuration={duration}
              driverLocation={driverLocation}
              lastUpdatedAt={lastTrackingAt ?? tripDetailUpdatedAt}
            />

            <TripStatusTimeline status={liveStatus} lastUpdatedAt={lastTrackingAt ?? tripDetailUpdatedAt} />
          </>
        )}

        {/* DRIVER INFO CARD (When assigned) */}
        {liveStatus !== 'SEARCHING' && (
          <>
            <DriverInfoCard
              driver={tripDetail?.driver}
              status={liveStatus}
              loading={tripDetailLoading}
              error={tripDetailError}
              lastUpdatedAt={tripDetailUpdatedAt}
            />
            {numericTripId && isChatVisibleStatus(liveStatus) ? (
              <TouchableOpacity
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={
                  unreadChatCount > 0
                    ? `${t('booking.chatWithDriverTitle', 'Nhắn tin với tài xế')}. ${t('chat.unreadCountMsg', { count: unreadChatCount })}`
                    : t('booking.chatWithDriverTitle', 'Nhắn tin với tài xế')
                }
                style={styles.chatButton}
                onPress={() => {
                  setUnreadChatCount(0);
                  router.push({
                    pathname: '/(customer)/booking/chat' as any,
                    params: {
                      tripId: String(numericTripId),
                      status: liveStatus,
                      participantName: tripDetail?.driver?.fullName ?? t('booking.gorideDriver', 'Tài xế'),
                    },
                  });
                }}
              >
                <View style={styles.chatButtonIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={rs(24)} color={palette.primary} />
                  {unreadChatCount > 0 ? (
                    <View style={styles.chatUnreadBadge}>
                      <Text style={styles.chatUnreadBadgeText}>{formatUnreadCount(unreadChatCount)}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.chatButtonCopy}>
                  <Text style={styles.chatButtonTitle}>{t('booking.chatWithDriverTitle', 'Nhắn tin với tài xế')}</Text>
                  <Text style={styles.chatButtonSubtitle}>{t('booking.chatWithDriverSubtitle', 'Trao đổi điểm đón và tình trạng di chuyển')}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={rs(24)} color={palette.primary} />
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {/* COMPLETION CARD */}
        <TripCompletionCard
          visible={liveStatus === 'COMPLETED'}
          tripId={tripId}
          driverName={tripDetail?.driver?.fullName}
          fare={tripDetail?.finalFare ?? fare}
          estimatedFare={fare}
          distance={tripDetail?.estimatedDistance ?? distance}
          duration={tripDetail?.estimatedDuration ?? duration}
          paymentLabel={paymentLabel}
          promoCode={promoCode}
          completedAt={lastTrackingAt ?? tripDetailUpdatedAt}
          initialRating={tripDetail?.passengerRating}
          onRatingSubmitted={handleRatingSubmitted}
        />

        {/* TRIP SUMMARY CARD (Vehicle, Fare, Addresses) */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleIconBox}>
                <MaterialCommunityIcons name={vehicle.icon} size={rs(36)} color={palette.primary} />
              </View>
              <View style={styles.vehicleCopy}>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={styles.priceText}>
                  {formatFare(fare)} • {paymentLabel}
                </Text>
              </View>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{formatDistance(distance, t)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricPill icon="clock-outline" label={t('booking.durationLabel', 'Thời gian')} value={formatDuration(duration, t)} />
            <MetricPill icon="cash" label={t('booking.tempFare', 'Tạm tính')} value={formatFare(fare)} highlight />
          </View>

          {promoCode ? (
            <View style={styles.promoRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={rs(22)} color={palette.amber} />
              <Text style={styles.promoText}>{t('booking.selectedPromoCode', { code: promoCode }, `Ưu đãi đã chọn: ${promoCode}`)}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.primary }]} />
              <View style={styles.addressCopy}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressLabel}>{t('booking.pickupPoint', 'Điểm đón')}</Text>
                  {pickupThreeWords ? (
                    <View style={styles.inlineThreeWordBadge}>
                      <Text style={styles.inlineThreeWordSymbol}>{'///'}</Text>
                      <Text style={styles.inlineThreeWordText}>{pickupThreeWords}</Text>
                      <TouchableOpacity onPress={() => void handleCopyThreeWords(pickupThreeWords)} style={styles.inlineActionBtn}>
                        <Ionicons name="copy-outline" size={rs(16)} color={palette.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void handleShareThreeWords(pickupThreeWords)} style={styles.inlineActionBtn}>
                        <Ionicons name="share-social-outline" size={rs(16)} color={palette.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={loadingPickupWords || !pickup?.lat}
                      onPress={() => void handleFetchPickupThreeWords()}
                      style={styles.getThreeWordSmallBtn}
                    >
                      {loadingPickupWords ? (
                        <ActivityIndicator size="small" color={palette.primary} />
                      ) : (
                        <>
                          <Text style={styles.getThreeWordSymbol}>{'///'}</Text>
                          <Text style={styles.getThreeWordSmallText}>{t('booking.getThreeWords', 'Lấy 3 từ')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.addressText} numberOfLines={2} selectable>
                  {pickupAddress}
                </Text>
              </View>
            </View>

            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.danger }]} />
              <View style={styles.addressCopy}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressLabel}>{t('booking.dropoffPoint', 'Điểm đến')}</Text>
                  {dropoffThreeWords ? (
                    <View style={styles.inlineThreeWordBadge}>
                      <Text style={styles.inlineThreeWordSymbol}>{'///'}</Text>
                      <Text style={styles.inlineThreeWordText}>{dropoffThreeWords}</Text>
                      <TouchableOpacity onPress={() => void handleCopyThreeWords(dropoffThreeWords)} style={styles.inlineActionBtn}>
                        <Ionicons name="copy-outline" size={rs(16)} color={palette.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void handleShareThreeWords(dropoffThreeWords)} style={styles.inlineActionBtn}>
                        <Ionicons name="share-social-outline" size={rs(16)} color={palette.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={loadingDropoffWords || !dropoff?.lat}
                      onPress={() => void handleFetchDropoffThreeWords()}
                      style={styles.getThreeWordSmallBtn}
                    >
                      {loadingDropoffWords ? (
                        <ActivityIndicator size="small" color={palette.primary} />
                      ) : (
                        <>
                          <Text style={styles.getThreeWordSymbol}>{'///'}</Text>
                          <Text style={styles.getThreeWordSmallText}>{t('booking.getThreeWords', 'Lấy 3 từ')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.addressText} numberOfLines={2} selectable>
                  {dropoffAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTION BUTTON */}
      <View style={styles.footer}>
        <Text style={styles.footerHelper}>{footerAction.helper}</Text>
        <TouchableOpacity
          activeOpacity={footerAction.variant === 'disabled' ? 1 : 0.84}
          disabled={footerAction.variant === 'disabled'}
          style={[
            styles.footerButton,
            footerAction.variant === 'danger' && styles.footerButtonDanger,
            footerAction.variant === 'primary' && styles.footerButtonPrimary,
            footerAction.variant === 'success' && styles.footerButtonSuccess,
            footerAction.variant === 'disabled' && styles.footerButtonDisabled,
          ]}
          onPress={footerAction.onPress}
        >
          <MaterialCommunityIcons
            name={footerAction.icon}
            size={rs(24)}
            color={footerAction.variant === 'disabled' ? palette.muted : palette.card}
          />
          <Text
            style={[
              styles.footerButtonText,
              footerAction.variant === 'disabled' && styles.footerButtonTextDisabled,
            ]}
          >
            {footerAction.label}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MetricPill({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.metricPill, highlight && styles.metricPillHighlight]}>
      <MaterialCommunityIcons name={icon} size={rs(24)} color={highlight ? palette.green : palette.primary} />
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseNumberParam(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUnreadCount(value: number) {
  return value > 99 ? '99+' : String(value);
}

function getCompactStatusIcon(status: TripStatus): keyof typeof MaterialCommunityIcons.glyphMap {
  if (status === 'SEARCHING') return 'radar';
  if (status === 'ACCEPTED') return 'car-clock';
  if (status === 'ARRIVED') return 'map-marker-check';
  return 'navigation-variant';
}

function getDriverInitials(name?: string) {
  if (!name?.trim()) {
    return 'GR';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatCompactVehicle(driver?: TripDetail['driver']) {
  const vehicleName = [driver?.vehicleBrand, driver?.vehicleModel].filter(Boolean).join(' ');

  if (vehicleName) {
    return driver?.vehicleColor ? `${vehicleName} · ${driver.vehicleColor}` : vehicleName;
  }

  if (driver?.vehicleType === 'MOTORBIKE') return 'GoRide Bike';
  if (driver?.vehicleType === 'CAR_7_SEAT') return 'GoRide Premium';
  if (driver?.vehicleType === 'CAR_4_SEAT') return 'GoRide Car';
  return 'GoRide';
}

function parseLocationPointParam(value: string | string[] | undefined): LocationPoint | null {
  const rawValue = readParam(value);

  if (!rawValue) {
    return null;
  }

  const candidates = [rawValue];

  try {
    candidates.push(decodeURIComponent(rawValue));
  } catch {
    // Expo Router usually decodes params already; this fallback protects direct links.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<LocationPoint>;
      const lat = Number(parsed.lat);
      const lng = Number(parsed.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          address: typeof parsed.address === 'string' && parsed.address ? parsed.address : lat + ', ' + lng,
          label: typeof parsed.label === 'string' ? parsed.label : undefined,
          placeId: typeof parsed.placeId === 'string' ? parsed.placeId : undefined,
        };
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function getVehicleDisplay(vehicleType?: string, vehicleTypeEnum?: string): VehicleDisplay {
  const normalized = vehicleTypeEnum ?? vehicleType;

  if (normalized === 'MOTORBIKE' || normalized === 'bike') {
    return { name: 'GoRide Bike', icon: 'motorbike' };
  }

  if (normalized === 'CAR_7_SEAT' || normalized === 'car_premium') {
    return { name: 'GoRide Premium', icon: 'car-back' };
  }

  return { name: 'GoRide Car', icon: 'car' };
}

function getStatusCopy(status: TripStatus, t: any) {
  if (status === 'ACCEPTED') {
    return {
      label: t('booking.stepAccepted', 'Đã có tài xế'),
      title: t('booking.driverArriving', 'Tài xế đang đến'),
      description: t('booking.driverAcceptedDescWithLocation', 'GoRide đã ghép chuyến thành công. Bạn có thể theo dõi tài xế trên bản đồ.'),
      color: palette.green,
    };
  }

  if (status === 'ARRIVED') {
    return {
      label: t('booking.driverArrived', 'Tài xế đã đến'),
      title: t('booking.driverWaiting', 'Tài xế đang chờ bạn'),
      description: t('booking.driverArrivedDesc', 'Tài xế đã đến điểm đón. Hãy kiểm tra biển số và bắt đầu chuyến đi an toàn nhé.'),
      color: palette.green,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: t('booking.carryingPassenger', 'Đang di chuyển'),
      title: t('booking.tripInProgressTitle', 'Chuyến đi đang diễn ra'),
      description: t('booking.tripInProgressSubtitle', 'GoRide đang theo dõi hành trình để cập nhật trạng thái chuyến cho bạn.'),
      color: palette.primary,
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: t('booking.completed', 'Hoàn thành'),
      title: t('booking.tripCompletedTitle', 'Chuyến đi đã hoàn thành'),
      description: t('booking.tripCompletedSubtitle', 'Cảm ơn bạn đã sử dụng GoRide. Hóa đơn cuối cùng sẽ được đồng bộ từ backend.'),
      color: palette.green,
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: t('booking.cancelled', 'Đã hủy'),
      title: t('booking.tripCancelled', 'Chuyến đi đã hủy'),
      description: t('booking.tripCancelledSubtitle', 'Yêu cầu đặt xe đã được hủy. Bạn có thể quay lại trang chủ để đặt chuyến mới.'),
      color: palette.danger,
    };
  }

  if (status === 'NO_DRIVER') {
    return {
      label: t('booking.noDriver', 'Chưa có tài xế'),
      title: t('booking.noSuitableDriver', 'Chưa tìm thấy tài xế'),
      description: t('booking.noDriverFoundSubtitle', 'Hiện chưa có tài xế phù hợp quanh bạn. Bạn có thể chờ thêm hoặc hủy để đặt lại.'),
      color: palette.danger,
    };
  }

  return {
    label: t('booking.stepSearching', 'Đang tìm tài xế'),
    title: t('booking.searchingRadarTitle', 'Đang tìm tài xế...'),
    description: t('booking.searchingRadarSubtitle', 'Yêu cầu của bạn đã được tạo và gửi đến hệ thống matching. Vui lòng đợi trong giây lát.'),
    color: palette.primary,
  };
}

function getRealtimeCopy(mode: RealtimeMode, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string): {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  background: string;
} {
  if (mode === 'mock') {
    return {
      title: t('booking.rtMockTitle', 'Realtime demo đang chạy'),
      description: t('booking.rtMockDesc', 'Chưa cần backend thật: mock event bus sẽ đẩy trạng thái và vị trí tài xế để test UI.'),
      icon: 'broadcast',
      color: palette.green,
      background: palette.greenSoft,
    };
  }

  if (mode === 'remote') {
    return {
      title: t('booking.rtRemoteTitle', 'Đã kết nối kênh realtime'),
      description: t('booking.rtRemoteDesc', 'App đang nghe trạng thái chuyến và kiểm tra vị trí bằng REST fallback để tránh mất tín hiệu.'),
      icon: 'access-point-network',
      color: palette.primary,
      background: palette.primarySoft,
    };
  }

  if (mode === 'fallback') {
    return {
      title: t('booking.rtFallbackTitle', 'Đang dùng REST fallback'),
      description: t('booking.rtFallbackDesc', 'WebSocket chưa sẵn sàng hoặc bị ngắt, app sẽ hỏi vị trí tài xế định kỳ mỗi 5 giây.'),
      icon: 'refresh-circle',
      color: palette.amber,
      background: palette.amberSoft,
    };
  }

  if (mode === 'unavailable') {
    return {
      title: t('booking.rtUnavailableTitle', 'Chưa thể theo dõi realtime'),
      description: t('booking.rtUnavailableDesc', 'Mã chuyến chưa hợp lệ nên GoRide chưa mở được kênh tracking.'),
      icon: 'alert-circle-outline',
      color: palette.danger,
      background: palette.dangerSoft,
    };
  }

  return {
    title: t('booking.rtConnectingTitle', 'Đang kết nối realtime'),
    description: t('booking.rtConnectingDesc', 'GoRide đang mở kênh trạng thái và vị trí tài xế cho chuyến này.'),
    icon: 'loading',
    color: palette.primary,
    background: palette.primarySoft,
  };
}

function getFooterAction(
  status: TripStatus,
  handlers: {
    onCancel: () => void;
    onBackHome: () => void;
  },
  t: any,
): FooterAction {
  if (status === 'COMPLETED') {
    return {
      label: t('booking.returnHome', 'Về trang chủ'),
      helper: t('booking.returnHomeHelper', 'Chuyến đi đã hoàn thành. Bạn có thể quay lại để đặt chuyến mới.'),
      icon: 'home-variant-outline',
      variant: 'success',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'NO_DRIVER') {
    return {
      label: t('booking.bookNewTrip', 'Đặt chuyến mới'),
      helper: t('booking.noDriverHelper', 'Chưa tìm được tài xế phù hợp. Quay lại để thử tuyến hoặc loại xe khác.'),
      icon: 'refresh',
      variant: 'primary',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: t('booking.bookNewTrip', 'Đặt chuyến mới'),
      helper: t('booking.cancelledHelper', 'Chuyến đã hủy. Bạn có thể quay lại màn passenger để đặt lại.'),
      icon: 'plus-circle-outline',
      variant: 'primary',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: t('booking.tripOngoing', 'Chuyến đang diễn ra'),
      helper: t('booking.cannotCancelOngoing', 'Bạn không thể hủy khi chuyến đã bắt đầu. Hãy tiếp tục theo dõi hành trình.'),
      icon: 'lock-check-outline',
      variant: 'disabled',
    };
  }

  return {
    label: t('booking.cancelTripTitle', 'Hủy chuyến'),
    helper: t('booking.cancelTripHelper', 'Bạn có thể hủy trước khi chuyến bắt đầu. Sau khi lên xe, nút hủy sẽ bị khóa.'),
    icon: 'close-circle-outline',
    variant: 'danger',
    onPress: handlers.onCancel,
  };
}

const tripStatuses: TripStatus[] = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVER',
];

function normalizeTripStatus(status?: string): TripStatus {
  return tripStatuses.includes(status as TripStatus) ? (status as TripStatus) : 'SEARCHING';
}

function mergeTripStatus(currentStatus: TripStatus, incomingStatus: TripStatus) {
  const incomingIsTerminal = isTerminalTripStatus(incomingStatus);

  if (incomingStatus === 'SEARCHING' && currentStatus !== 'SEARCHING') {
    return currentStatus;
  }

  if (incomingIsTerminal || currentStatus === 'SEARCHING') {
    return incomingStatus;
  }

  return incomingStatus;
}

function isTerminalTripStatus(status: TripStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_DRIVER';
}

function isChatVisibleStatus(status: TripStatus) {
  return status !== 'SEARCHING' && status !== 'NO_DRIVER';
}

function getErrorMessage(error: unknown, fallback = 'Không thể cập nhật vị trí tài xế lúc này.') {
  return error instanceof Error ? error.message : fallback;
}

function formatDistance(distance: number | null, t?: any) {
  if (!distance || distance <= 0) {
    return t ? t('booking.dashKm', '-- km') : '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatDuration(duration: number | null, t?: any) {
  if (!duration || duration <= 0) {
    return t ? t('booking.dashMinutes', '-- phút') : '-- phút';
  }

  if (duration < 60) {
    const minutes = Math.round(duration);
    return t ? t('booking.etaMinutes', { minutes }, `${minutes} phút`) : `${minutes} phút`;
  }

  const hours = Math.floor(duration / 60);
  const minutes = Math.round(duration % 60);
  if (minutes) {
    return t ? t('booking.etaHoursMinutes', { hours, minutes }, `${hours} giờ ${minutes} phút`) : `${hours} giờ ${minutes} phút`;
  }

  return t ? t('booking.etaHours', { hours }, `${hours} giờ`) : `${hours} giờ`;
}

function formatFare(fare: number | null) {
  if (!fare || fare <= 0) {
    return '-- đ';
  }

  return Math.round(fare).toLocaleString('vi-VN') + 'đ';
}

function formatCoordinates(location: DriverLocationUpdate) {
  return location.lat.toFixed(5) + ', ' + location.lng.toFixed(5);
}

function formatTrackingTime(value: string | null) {
  if (!value) {
    return 'chưa có cập nhật';
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  compactHeader: {
    minHeight: rvs(62),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(11),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(9),
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    zIndex: 30,
  },
  compactHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: rvs(1),
  },
  compactHeaderTitle: {
    color: palette.text,
    fontSize: rf(17),
    lineHeight: rf(21),
    fontWeight: '900',
  },
  compactHeaderTrip: {
    color: palette.muted,
    fontSize: rf(12),
    fontWeight: '700',
  },
  compactHeaderStatusBadge: {
    maxWidth: '38%',
    flexShrink: 1,
  },
  compactMapArea: {
    flex: 1,
    minHeight: rvs(235),
    overflow: 'hidden',
    backgroundColor: '#e7e3ed',
  },
  compactMapStatus: {
    position: 'absolute',
    left: rs(14),
    right: rs(14),
    bottom: rvs(12),
    minHeight: rvs(42),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    paddingHorizontal: rs(13),
    paddingVertical: rvs(9),
    borderRadius: rs(16),
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(29,7,150,0.10)',
    ...shadow,
  },
  compactMapStatusText: {
    flex: 1,
    color: palette.text,
    fontSize: rf(13),
    fontWeight: '700',
  },
  compactSheet: {
    paddingHorizontal: rs(16),
    paddingTop: rvs(7),
    paddingBottom: rvs(12),
    gap: rvs(9),
    borderTopLeftRadius: rs(27),
    borderTopRightRadius: rs(27),
    backgroundColor: palette.card,
    shadowColor: '#241653',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 15,
  },
  compactHandle: {
    alignSelf: 'center',
    width: rs(42),
    height: rvs(4),
    borderRadius: rs(3),
    backgroundColor: '#d9d4df',
  },
  compactSearchingRow: {
    minHeight: rvs(62),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(13),
  },
  compactRadarIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  compactRadarPulse: {
    position: 'absolute',
    width: rs(58),
    height: rs(58),
    borderRadius: rs(29),
    backgroundColor: palette.primary,
  },
  compactSearchingCopy: {
    flex: 1,
    gap: rvs(2),
  },
  compactSectionTitle: {
    color: palette.text,
    fontSize: rf(18),
    lineHeight: rf(22),
    fontWeight: '900',
  },
  compactSectionSubtitle: {
    color: palette.muted,
    fontSize: rf(13),
    lineHeight: rf(17),
    fontWeight: '600',
  },
  compactDriverRow: {
    minHeight: rvs(50),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  compactDriverAvatar: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#d8cef3',
  },
  compactDriverAvatarText: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '900',
  },
  compactDriverCopy: {
    flex: 1,
    minWidth: 0,
    gap: rvs(2),
  },
  compactDriverName: {
    color: palette.text,
    fontSize: rf(18),
    lineHeight: rf(22),
    fontWeight: '900',
  },
  compactDriverMeta: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '700',
  },
  compactRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
    paddingHorizontal: rs(8),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
    backgroundColor: palette.amberSoft,
  },
  compactRatingText: {
    color: '#8a5400',
    fontSize: rf(13),
    fontWeight: '900',
  },
  compactMetricsRow: {
    minHeight: rvs(34),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(13),
    backgroundColor: palette.primarySoft,
  },
  compactMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
  },
  compactMetricDivider: {
    width: 1,
    height: rvs(18),
    backgroundColor: '#d8cef3',
  },
  compactMetricValue: {
    color: palette.primary,
    fontSize: rf(13),
    fontWeight: '900',
  },
  compactTargetRow: {
    minHeight: rvs(52),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  compactTargetIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTargetCopy: {
    flex: 1,
    minWidth: 0,
    gap: rvs(1),
  },
  compactTargetLabel: {
    color: palette.muted,
    fontSize: rf(11),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactTargetAddress: {
    color: palette.text,
    fontSize: rf(15),
    lineHeight: rf(19),
    fontWeight: '800',
  },
  compactActionRow: {
    flexDirection: 'row',
    gap: rs(9),
  },
  compactSecondaryAction: {
    flex: 1,
    minHeight: rvs(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(7),
    borderRadius: rs(15),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#d8cef3',
  },
  compactSecondaryActionText: {
    color: palette.primary,
    fontSize: rf(14),
    fontWeight: '900',
  },
  compactChatAction: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  compactChatActionText: {
    color: palette.card,
  },
  compactChatBadge: {
    position: 'absolute',
    top: -rvs(9),
    right: -rs(11),
    minWidth: rs(19),
    height: rs(19),
    paddingHorizontal: rs(4),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.danger,
    borderWidth: 2,
    borderColor: palette.card,
  },
  compactChatBadgeText: {
    color: palette.card,
    fontSize: rf(9),
    fontWeight: '900',
  },
  compactPrimaryAction: {
    minHeight: rvs(46),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    borderRadius: rs(16),
    backgroundColor: palette.danger,
  },
  compactPrimaryActionDisabled: {
    opacity: 0.58,
  },
  compactPrimaryActionText: {
    color: palette.card,
    fontSize: rf(15),
    fontWeight: '900',
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(20),
    paddingVertical: rvs(12),
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    zIndex: 20,
  },
  backIconButton: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTripBadge: {
    paddingHorizontal: rs(14),
    paddingVertical: rvs(6),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
  },
  headerTripCode: {
    fontSize: rf(16),
    fontWeight: '800',
    color: palette.primary,
  },
  headerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(6),
    borderRadius: rs(16),
  },
  headerStatusDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
  headerStatusText: {
    fontSize: rf(15),
    fontWeight: '800',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(20),
    paddingTop: rvs(16),
    paddingBottom: rvs(30),
    gap: rvs(16),
  },
  mapHeroContainer: {
    borderRadius: rs(24),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
  },
  searchingCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(18),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    gap: rs(16),
    ...shadow,
  },
  searchingRadarCompact: {
    width: rs(70),
    height: rs(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircleCompact: {
    position: 'absolute',
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: palette.primary,
  },
  centerCircleCompact: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingCopyCompact: {
    flex: 1,
    gap: rvs(4),
  },
  searchingTitleCompact: {
    fontSize: rf(20),
    fontWeight: '800',
    color: palette.text,
  },
  searchingSubtitleCompact: {
    fontSize: rf(15),
    color: palette.muted,
    lineHeight: rf(20),
  },
  searchingCard: {
    alignItems: 'center',
    padding: rs(28),
    borderRadius: rs(38),
    backgroundColor: palette.card,
    ...shadow,
  },
  searchingContainer: {
    width: rs(300),
    height: rs(300),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(18),
  },
  pulseCircle: {
    position: 'absolute',
    width: rs(260),
    height: rs(260),
    borderRadius: rs(130),
    backgroundColor: palette.primary,
  },
  centerCircle: {
    width: rs(138),
    height: rs(138),
    borderRadius: rs(69),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(16),
    height: rvs(42),
    borderRadius: rs(21),
    backgroundColor: palette.primarySoft,
    marginBottom: rvs(16),
  },
  statusDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
  },
  statusPillText: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '900',
  },
  waitingTitle: {
    fontSize: rf(36),
    fontWeight: '900',
    color: palette.text,
    marginBottom: rvs(10),
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: rf(21),
    color: palette.muted,
    textAlign: 'center',
    lineHeight: rf(30),
  },
  trackingCard: {
    backgroundColor: palette.card,
    borderRadius: rs(36),
    padding: rs(16),
    gap: rvs(16),
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingHorizontal: rs(8),
  },
  sectionIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: {
    flex: 1,
    gap: rvs(3),
  },
  sectionTitle: {
    fontSize: rf(24),
    color: palette.text,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: rf(16),
    color: palette.muted,
    fontWeight: '700',
  },
  mapFrame: {
    borderRadius: rs(28),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
  },
  driverSignalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(14),
    borderRadius: rs(24),
    backgroundColor: '#f8f6fb',
  },
  driverSignalCopy: {
    flex: 1,
    gap: rvs(3),
  },
  driverSignalLabel: {
    fontSize: rf(16),
    color: palette.muted,
    fontWeight: '800',
  },
  driverSignalValue: {
    fontSize: rf(18),
    color: palette.text,
    fontWeight: '900',
    lineHeight: rf(25),
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(14),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#d8cef3',
  },
  chatButtonIcon: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
  },
  chatUnreadBadge: {
    position: 'absolute',
    top: -rvs(7),
    right: -rs(8),
    minWidth: rs(22),
    height: rs(22),
    paddingHorizontal: rs(5),
    borderRadius: rs(11),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.danger,
    borderWidth: 2,
    borderColor: palette.card,
  },
  chatUnreadBadgeText: {
    color: palette.card,
    fontSize: rf(11),
    fontWeight: '900',
  },
  chatButtonCopy: {
    flex: 1,
    gap: rvs(2),
  },
  chatButtonTitle: {
    color: palette.primary,
    fontSize: rf(18),
    fontWeight: '900',
  },
  chatButtonSubtitle: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '600',
  },
  realtimeCard: {
    minHeight: rvs(104),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
    padding: rs(18),
    borderRadius: rs(28),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  realtimeIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  realtimeCopy: {
    flex: 1,
    gap: rvs(6),
  },
  realtimeTitle: {
    fontSize: rf(19),
    color: palette.text,
    fontWeight: '900',
  },
  realtimeDescription: {
    fontSize: rf(16),
    color: palette.muted,
    fontWeight: '700',
    lineHeight: rf(23),
  },
  trackingErrorText: {
    color: palette.danger,
    fontSize: rf(15),
    fontWeight: '800',
    lineHeight: rf(21),
  },
  notificationBox: {
    padding: rs(12),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    gap: rvs(3),
  },
  notificationTitle: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '900',
  },
  notificationBody: {
    color: palette.primaryMid,
    fontSize: rf(15),
    fontWeight: '700',
    lineHeight: rf(21),
  },
  tripCodeCard: {
    minHeight: rvs(86),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    padding: rs(18),
    borderRadius: rs(28),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#e4d9ff',
  },
  tripCodeCopy: {
    flex: 1,
    gap: rvs(3),
  },
  tripCodeLabel: {
    color: palette.primaryMid,
    fontSize: rf(16),
    fontWeight: '800',
  },
  tripCodeValue: {
    color: palette.primary,
    fontSize: rf(26),
    fontWeight: '900',
  },
  tripCard: {
    backgroundColor: palette.card,
    borderRadius: rs(36),
    padding: rs(26),
    ...shadow,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rs(16),
    marginBottom: rvs(20),
  },
  vehicleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  vehicleIconBox: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCopy: {
    flex: 1,
    gap: rvs(4),
  },
  vehicleName: {
    fontSize: rf(25),
    fontWeight: '900',
    color: palette.text,
  },
  priceText: {
    fontSize: rf(18),
    color: palette.muted,
    fontWeight: '800',
  },
  distanceBadge: {
    backgroundColor: palette.greenSoft,
    paddingHorizontal: rs(14),
    paddingVertical: rvs(8),
    borderRadius: rs(14),
  },
  distanceText: {
    fontSize: rf(19),
    fontWeight: '900',
    color: palette.green,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(12),
    marginBottom: rvs(16),
  },
  metricPill: {
    flex: 1,
    minHeight: rvs(72),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(14),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
  },
  metricPillHighlight: {
    backgroundColor: palette.greenSoft,
  },
  metricCopy: {
    flex: 1,
    gap: rvs(2),
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.primary,
    fontSize: rf(18),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricValueHighlight: {
    color: palette.green,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    padding: rs(14),
    borderRadius: rs(22),
    backgroundColor: palette.amberSoft,
    marginBottom: rvs(16),
  },
  promoText: {
    flex: 1,
    color: palette.amber,
    fontSize: rf(16),
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginBottom: rvs(20),
  },
  addressList: {
    gap: rvs(18),
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  dot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    marginTop: rvs(8),
  },
  addressCopy: {
    flex: 1,
    gap: rvs(3),
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  getThreeWordSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rvs(4),
    borderRadius: rs(12),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(29, 7, 150, 0.25)',
  },
  getThreeWordSymbol: {
    color: '#ff4b4b',
    fontSize: rf(13),
    fontWeight: '900',
  },
  getThreeWordSmallText: {
    color: palette.primary,
    fontSize: rf(13),
    fontWeight: '800',
  },
  inlineThreeWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(10),
    paddingVertical: rvs(4),
    borderRadius: rs(12),
    backgroundColor: palette.primary,
  },
  inlineThreeWordSymbol: {
    color: '#ff4b4b',
    fontSize: rf(13),
    fontWeight: '900',
  },
  inlineThreeWordText: {
    color: '#ffffff',
    fontSize: rf(13),
    fontWeight: '700',
  },
  inlineActionBtn: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '800',
  },
  addressText: {
    fontSize: rf(21),
    color: palette.text,
    flex: 1,
    lineHeight: rf(29),
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: rs(28),
    paddingBottom: rvs(34),
    paddingTop: rvs(18),
    backgroundColor: palette.background,
    gap: rvs(10),
  },
  footerHelper: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '800',
    lineHeight: rf(21),
    textAlign: 'center',
  },
  footerButton: {
    height: rvs(88),
    borderRadius: rs(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  footerButtonDanger: {
    backgroundColor: palette.danger,
  },
  footerButtonPrimary: {
    backgroundColor: palette.primary,
  },
  footerButtonSuccess: {
    backgroundColor: palette.green,
  },
  footerButtonDisabled: {
    backgroundColor: '#efecf1',
    borderWidth: 1,
    borderColor: palette.line,
  },
  footerButtonText: {
    fontSize: rf(25),
    fontWeight: '900',
    color: palette.card,
  },
  footerButtonTextDisabled: {
    color: palette.muted,
  },
});
