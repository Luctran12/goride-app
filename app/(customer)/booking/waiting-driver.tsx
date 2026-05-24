import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPicker } from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { getDriverLocation } from '@/lib/ride-api';
import { connectRealtime, subscribeTrip, type RealtimeSubscription } from '@/lib/realtime';
import type { DriverLocationUpdate, LocationPoint, TripStatus, WsNotification } from '@/types/ride';

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

export default function WaitingDriverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
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
  const statusCopy = getStatusCopy(liveStatus);
  const realtimeCopy = getRealtimeCopy(realtimeMode);
  const fallbackPollingEnabled = Boolean(numericTripId && (realtimeMode === 'fallback' || realtimeMode === 'remote'));

  const applyDriverLocation = useCallback((location: DriverLocationUpdate) => {
    setDriverLocation(location);
    setLastTrackingAt(location.updatedAt ?? new Date().toISOString());
    setTrackingError(null);
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

  useEffect(() => {
    setLiveStatus(normalizeTripStatus(tripStatus));
  }, [tripStatus]);

  useEffect(() => {
    if (!numericTripId) {
      setRealtimeMode('unavailable');
      setTrackingError('Chưa có mã chuyến để theo dõi vị trí tài xế.');
      return;
    }

    let isActive = true;
    let subscription: RealtimeSubscription | null = null;

    setRealtimeMode('connecting');
    setTrackingError(null);

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
          },
          onLocation: applyDriverLocation,
          onNotification: (notification) => {
            setLatestNotification(notification);
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
    };
  }, [applyDriverLocation, numericTripId]);

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

  const handleCancel = () => {
    Alert.alert('Hủy chuyến', 'Bạn có chắc chắn muốn hủy yêu cầu đặt xe này không?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy chuyến', style: 'destructive', onPress: () => router.replace('/(customer)') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchingCard}>
          <View style={styles.searchingContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: 0.15 }]} />
            <Animated.View
              style={[
                styles.pulseCircle,
                { transform: [{ scale: Animated.multiply(pulseAnim, 0.8) }], opacity: 0.25 },
              ]}
            />
            <View style={styles.centerCircle}>
              <MaterialCommunityIcons name="radar" size={rs(70)} color="#fff" />
            </View>
          </View>

          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: statusCopy.color }]} />
            <Text style={styles.statusPillText}>{statusCopy.label}</Text>
          </View>

          <Text style={styles.waitingTitle}>{statusCopy.title}</Text>
          <Text style={styles.waitingSubtitle}>{statusCopy.description}</Text>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(26)} color={palette.primary} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Theo dõi tài xế</Text>
              <Text style={styles.sectionSubtitle}>{driverLocation ? 'Vị trí tài xế đang được cập nhật' : 'Đang chờ tín hiệu vị trí tài xế'}</Text>
            </View>
          </View>

          <View style={styles.mapFrame}>
            <MapPicker
              mode="tracking"
              origin={pickup}
              destination={dropoff}
              driverLocation={driverLocation}
              status="ready"
              height={rvs(360)}
              allowSelection={false}
              showGpsButton={false}
              showUserLocation={false}
            />
          </View>

          <View style={styles.driverSignalCard}>
            <MaterialCommunityIcons
              name={driverLocation ? 'navigation-variant' : 'satellite-uplink'}
              size={rs(28)}
              color={driverLocation ? palette.green : palette.primary}
            />
            <View style={styles.driverSignalCopy}>
              <Text style={styles.driverSignalLabel}>
                {driverLocation ? 'Tọa độ tài xế' : 'Chưa có tọa độ tài xế'}
              </Text>
              <Text style={styles.driverSignalValue} selectable>
                {driverLocation
                  ? formatCoordinates(driverLocation) + ' • ' + formatTrackingTime(lastTrackingAt)
                  : 'GoRide sẽ hiển thị marker tài xế ngay khi nhận được tín hiệu realtime.'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.realtimeCard}>
          <View style={[styles.realtimeIcon, { backgroundColor: realtimeCopy.background }]}>
            <MaterialCommunityIcons name={realtimeCopy.icon} size={rs(26)} color={realtimeCopy.color} />
          </View>
          <View style={styles.realtimeCopy}>
            <Text style={styles.realtimeTitle}>{realtimeCopy.title}</Text>
            <Text style={styles.realtimeDescription}>{realtimeCopy.description}</Text>
            {trackingError ? (
              <Text style={styles.trackingErrorText} selectable>
                {trackingError}
              </Text>
            ) : null}
            {latestNotification ? (
              <View style={styles.notificationBox}>
                <Text style={styles.notificationTitle}>{latestNotification.title}</Text>
                <Text style={styles.notificationBody}>{latestNotification.body}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.tripCodeCard}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={rs(34)} color={palette.primary} />
          <View style={styles.tripCodeCopy}>
            <Text style={styles.tripCodeLabel}>Mã chuyến</Text>
            <Text style={styles.tripCodeValue} selectable>
              {tripId ? '#' + tripId : 'Đang khởi tạo'}
            </Text>
          </View>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleIconBox}>
                <MaterialCommunityIcons name={vehicle.icon} size={rs(42)} color={palette.primary} />
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
              <MaterialCommunityIcons name="ticket-percent-outline" size={rs(24)} color={palette.amber} />
              <Text style={styles.promoText}>Ưu đãi đã chọn: {promoCode}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.primary }]} />
              <View style={styles.addressCopy}>
                <Text style={styles.addressLabel}>Điểm đón</Text>
                <Text style={styles.addressText} numberOfLines={2} selectable>
                  {pickupAddress}
                </Text>
              </View>
            </View>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.danger }]} />
              <View style={styles.addressCopy}>
                <Text style={styles.addressLabel}>Điểm đến</Text>
                <Text style={styles.addressText} numberOfLines={2} selectable>
                  {dropoffAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.8} style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Hủy chuyến</Text>
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể cập nhật vị trí tài xế lúc này.';
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
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(28),
    paddingTop: rvs(24),
    paddingBottom: rvs(30),
    gap: rvs(20),
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
  },
  cancelButton: {
    height: rvs(88),
    borderRadius: rs(28),
    backgroundColor: palette.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: rf(25),
    fontWeight: '900',
    color: palette.danger,
  },
});
