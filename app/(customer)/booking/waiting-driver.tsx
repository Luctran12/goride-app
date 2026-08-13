import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  type RealtimeSubscription,
} from '@/lib/realtime';
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
  const pickupAddress = pickup?.address ?? readParam(params.pickupLabel) ?? 'Điểm đón đã chọn';
  const dropoffAddress = dropoff?.address ?? readParam(params.destLabel) ?? 'Điểm đến đã chọn';
  const distance = parseNumberParam(readParam(params.estimatedDistance) ?? readParam(params.distance));
  const duration = parseNumberParam(readParam(params.estimatedDuration));
  const fare = parseNumberParam(readParam(params.estimatedFare));
  const paymentLabel = readParam(params.paymentLabel) ?? 'Tiền mặt';
  const promoCode = readParam(params.promoCode);
  const vehicle = useMemo(() => getVehicleDisplay(vehicleType, vehicleTypeEnum), [vehicleType, vehicleTypeEnum]);
  const [liveStatus, setLiveStatus] = useState<TripStatus>(() => normalizeTripStatus(tripStatus));
  const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
  const [realtimeMode, setRealtimeMode] = useState<RealtimeMode>(numericTripId ? 'connecting' : 'unavailable');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [lastTrackingAt, setLastTrackingAt] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);
  const [tripDetailError, setTripDetailError] = useState<string | null>(null);
  const [tripDetailUpdatedAt, setTripDetailUpdatedAt] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  const [pickupThreeWords, setPickupThreeWords] = useState<string | null>(null);
  const [dropoffThreeWords, setDropoffThreeWords] = useState<string | null>(null);
  const [loadingPickupWords, setLoadingPickupWords] = useState(false);
  const [loadingDropoffWords, setLoadingDropoffWords] = useState(false);

  const handleFetchPickupThreeWords = async () => {
    if (!pickup?.lat || !pickup?.lng || loadingPickupWords) return;
    setLoadingPickupWords(true);
    try {
      const res = await getLocationToWords(pickup.lat, pickup.lng);
      setPickupThreeWords(res.wordAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.';
      Alert.alert('Địa chỉ 3 từ điểm đón', message);
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
      const message = err instanceof Error ? err.message : 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.';
      Alert.alert('Địa chỉ 3 từ điểm đến', message);
    } finally {
      setLoadingDropoffWords(false);
    }
  };

  const handleCopyThreeWords = async (address: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(address);
      }
      Alert.alert('Đã sao chép', `Địa chỉ 3 từ: ${address}`);
    } catch {
      Alert.alert('Địa chỉ 3 từ', address);
    }
  };

  const handleShareThreeWords = async (address: string) => {
    try {
      await Share.share({
        message: `Địa chỉ 3 từ GoRide: ${address}`,
        title: 'Địa chỉ 3 từ',
      });
    } catch {
      // ignore
    }
  };
  const lastFetchedLocationRef = useRef<{ tripId: number; status: TripStatus | null; lat: number; lng: number } | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const statusCopy = getStatusCopy(liveStatus);
  const realtimeCopy = getRealtimeCopy(realtimeMode);
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
      setTrackingError('Chưa có mã chuyến để theo dõi vị trí tài xế.');
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
        title: 'Chuyến đã hủy',
        body: 'Yêu cầu đặt xe của bạn đã được hủy thành công.',
        data: { tripId: numericTripId },
      });
      sendTripStatus(numericTripId, result.status);
      void hydrateTripDetail();
      router.replace('/(customer)');
    } catch (error: unknown) {
      Alert.alert('Không thể hủy chuyến', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Hủy chuyến', 'Bạn có chắc chắn muốn hủy yêu cầu đặt xe này không?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy chuyến', style: 'destructive', onPress: () => void confirmCancelTrip() },
    ]);
  };

  const footerAction: FooterAction = cancelLoading
    ? {
        label: 'Đang hủy chuyến',
        helper: 'GoRide đang gửi yêu cầu hủy chuyến và cập nhật trạng thái cho bạn.',
        icon: 'loading',
        variant: 'disabled',
      }
    : getFooterAction(liveStatus, {
        onCancel: handleCancel,
        onBackHome: handleBackHome,
      });

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
            {numericTripId ? `Cuốc #${numericTripId}` : 'Khởi tạo'}
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
                style={styles.chatButton}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/booking/chat' as any,
                    params: {
                      tripId: String(numericTripId),
                      status: liveStatus,
                      participantName: tripDetail?.driver?.fullName ?? 'Tài xế',
                    },
                  })
                }
              >
                <View style={styles.chatButtonIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={rs(24)} color={palette.primary} />
                </View>
                <View style={styles.chatButtonCopy}>
                  <Text style={styles.chatButtonTitle}>Nhắn tin với tài xế</Text>
                  <Text style={styles.chatButtonSubtitle}>Trao đổi điểm đón và tình trạng di chuyển</Text>
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
              <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricPill icon="clock-outline" label="Thời gian" value={formatDuration(duration)} />
            <MetricPill icon="cash" label="Tạm tính" value={formatFare(fare)} highlight />
          </View>

          {promoCode ? (
            <View style={styles.promoRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={rs(22)} color={palette.amber} />
              <Text style={styles.promoText}>Ưu đãi đã chọn: {promoCode}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.primary }]} />
              <View style={styles.addressCopy}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressLabel}>Điểm đón</Text>
                  {pickupThreeWords ? (
                    <View style={styles.inlineThreeWordBadge}>
                      <Text style={styles.inlineThreeWordSymbol}>///</Text>
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
                          <Text style={styles.getThreeWordSymbol}>///</Text>
                          <Text style={styles.getThreeWordSmallText}>Lấy 3 từ</Text>
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
                  <Text style={styles.addressLabel}>Điểm đến</Text>
                  {dropoffThreeWords ? (
                    <View style={styles.inlineThreeWordBadge}>
                      <Text style={styles.inlineThreeWordSymbol}>///</Text>
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
                          <Text style={styles.getThreeWordSymbol}>///</Text>
                          <Text style={styles.getThreeWordSmallText}>Lấy 3 từ</Text>
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

function getStatusCopy(status: TripStatus) {
  if (status === 'ACCEPTED') {
    return {
      label: 'Đã có tài xế',
      title: 'Tài xế đang đến',
      description: 'GoRide đã ghép chuyến thành công. Bạn có thể theo dõi tài xế trên bản đồ.',
      color: palette.green,
    };
  }

  if (status === 'ARRIVED') {
    return {
      label: 'Tài xế đã đến',
      title: 'Tài xế đang chờ bạn',
      description: 'Tài xế đã đến điểm đón. Hãy kiểm tra biển số và bắt đầu chuyến đi an toàn nhé.',
      color: palette.green,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: 'Đang di chuyển',
      title: 'Chuyến đi đang diễn ra',
      description: 'GoRide đang theo dõi hành trình để cập nhật trạng thái chuyến cho bạn.',
      color: palette.primary,
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: 'Hoàn thành',
      title: 'Chuyến đi đã hoàn thành',
      description: 'Cảm ơn bạn đã sử dụng GoRide. Hóa đơn cuối cùng sẽ được đồng bộ từ backend.',
      color: palette.green,
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: 'Đã hủy',
      title: 'Chuyến đi đã hủy',
      description: 'Yêu cầu đặt xe đã được hủy. Bạn có thể quay lại trang chủ để đặt chuyến mới.',
      color: palette.danger,
    };
  }

  if (status === 'NO_DRIVER') {
    return {
      label: 'Chưa có tài xế',
      title: 'Chưa tìm thấy tài xế',
      description: 'Hiện chưa có tài xế phù hợp quanh bạn. Bạn có thể chờ thêm hoặc hủy để đặt lại.',
      color: palette.danger,
    };
  }

  return {
    label: 'Đang tìm tài xế',
    title: 'Đang tìm tài xế...',
    description: 'Yêu cầu của bạn đã được tạo và gửi đến hệ thống matching. Vui lòng đợi trong giây lát.',
    color: palette.primary,
  };
}

function getRealtimeCopy(mode: RealtimeMode): {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  background: string;
} {
  if (mode === 'mock') {
    return {
      title: 'Realtime demo đang chạy',
      description: 'Chưa cần backend thật: mock event bus sẽ đẩy trạng thái và vị trí tài xế để test UI.',
      icon: 'broadcast',
      color: palette.green,
      background: palette.greenSoft,
    };
  }

  if (mode === 'remote') {
    return {
      title: 'Đã kết nối kênh realtime',
      description: 'App đang nghe trạng thái chuyến và kiểm tra vị trí bằng REST fallback để tránh mất tín hiệu.',
      icon: 'access-point-network',
      color: palette.primary,
      background: palette.primarySoft,
    };
  }

  if (mode === 'fallback') {
    return {
      title: 'Đang dùng REST fallback',
      description: 'WebSocket chưa sẵn sàng hoặc bị ngắt, app sẽ hỏi vị trí tài xế định kỳ mỗi 5 giây.',
      icon: 'refresh-circle',
      color: palette.amber,
      background: palette.amberSoft,
    };
  }

  if (mode === 'unavailable') {
    return {
      title: 'Chưa thể theo dõi realtime',
      description: 'Mã chuyến chưa hợp lệ nên GoRide chưa mở được kênh tracking.',
      icon: 'alert-circle-outline',
      color: palette.danger,
      background: palette.dangerSoft,
    };
  }

  return {
    title: 'Đang kết nối realtime',
    description: 'GoRide đang mở kênh trạng thái và vị trí tài xế cho chuyến này.',
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
): FooterAction {
  if (status === 'COMPLETED') {
    return {
      label: 'Về trang chủ',
      helper: 'Chuyến đi đã hoàn thành. Bạn có thể quay lại để đặt chuyến mới.',
      icon: 'home-variant-outline',
      variant: 'success',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'NO_DRIVER') {
    return {
      label: 'Đặt chuyến mới',
      helper: 'Chưa tìm được tài xế phù hợp. Quay lại để thử tuyến hoặc loại xe khác.',
      icon: 'refresh',
      variant: 'primary',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: 'Đặt chuyến mới',
      helper: 'Chuyến đã hủy. Bạn có thể quay lại màn passenger để đặt lại.',
      icon: 'plus-circle-outline',
      variant: 'primary',
      onPress: handlers.onBackHome,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: 'Chuyến đang diễn ra',
      helper: 'Bạn không thể hủy khi chuyến đã bắt đầu. Hãy tiếp tục theo dõi hành trình.',
      icon: 'lock-check-outline',
      variant: 'disabled',
    };
  }

  return {
    label: 'Hủy chuyến',
    helper: 'Bạn có thể hủy trước khi chuyến bắt đầu. Sau khi lên xe, nút hủy sẽ bị khóa.',
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

function isTerminalTripStatus(status: TripStatus) {
  return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_DRIVER';
}

function isChatVisibleStatus(status: TripStatus) {
  return status !== 'SEARCHING' && status !== 'NO_DRIVER';
}

function getErrorMessage(error: unknown, fallback = 'Không thể cập nhật vị trí tài xế lúc này.') {
  return error instanceof Error ? error.message : fallback;
}

function formatDistance(distance: number | null) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatDuration(duration: number | null) {
  if (!duration || duration <= 0) {
    return '-- phút';
  }

  if (duration < 60) {
    return Math.round(duration) + ' phút';
  }

  const hours = Math.floor(duration / 60);
  const minutes = Math.round(duration % 60);
  return minutes ? hours + ' giờ ' + minutes + ' phút' : hours + ' giờ';
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
