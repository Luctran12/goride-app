import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DEFAULT_VEHICLE_OPTIONS,
  RoutePreview,
  VehicleOptionCard,
  legacyIdFromVehicleType,
} from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { estimateBooking } from '@/lib/ride-api';
import type { BookingDraft, BookingEstimate, LocationPoint, VehicleType } from '@/types/ride';

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
  green: '#00b67a',
  greenSoft: '#dff8ef',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

export default function SelectVehicleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const route = useMemo(() => resolveRouteFromParams(params as SearchParams), [params]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('MOTORBIKE');
  const [estimate, setEstimate] = useState<BookingEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);

  const draft = useMemo<BookingDraft | null>(() => {
    if (!route.pickup || !route.dropoff) {
      return null;
    }

    return {
      pickup: route.pickup,
      dropoff: route.dropoff,
      vehicleType: selectedVehicle,
      paymentMethod: 'CASH',
    };
  }, [route.dropoff, route.pickup, selectedVehicle]);

  useEffect(() => {
    if (!draft) {
      setEstimate(null);
      setEstimateError('Thiếu điểm đón hoặc điểm đến. Vui lòng chọn lại lộ trình.');
      return;
    }

    const activeDraft = draft;
    let cancelled = false;

    async function loadEstimate() {
      setEstimateLoading(true);
      setEstimateError(null);

      try {
        const nextEstimate = await estimateBooking(activeDraft);

        if (!cancelled) {
          setEstimate(nextEstimate);
        }
      } catch (error) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateError(error instanceof Error ? error.message : 'Không thể tính giá ước tính');
        }
      } finally {
        if (!cancelled) {
          setEstimateLoading(false);
        }
      }
    }

    void loadEstimate();

    return () => {
      cancelled = true;
    };
  }, [draft, retrySeed]);

  const vehicleOptions = useMemo(
    () =>
      DEFAULT_VEHICLE_OPTIONS.map((option) => ({
        ...option,
        estimatedFare: option.vehicleType === selectedVehicle ? estimate?.estimatedFare ?? null : null,
        metaLabel: option.vehicleType === selectedVehicle ? 'Đang chọn' : option.metaLabel,
      })),
    [estimate?.estimatedFare, selectedVehicle],
  );

  const selectedOption = vehicleOptions.find((option) => option.vehicleType === selectedVehicle) ?? vehicleOptions[0];
  const canContinue = Boolean(draft && estimate && !estimateLoading && !estimateError);

  const handleConfirmBooking = () => {
    if (!draft || !estimate) {
      Alert.alert('Chưa có giá ước tính', 'Vui lòng chờ GoRide tính giá hoặc thử lại trước khi đặt xe.');
      return;
    }

    router.push({
      pathname: '/(customer)/booking/waiting-driver',
      params: {
        pickup: JSON.stringify(draft.pickup),
        dropoff: JSON.stringify(draft.dropoff),
        pickupLat: String(draft.pickup.lat),
        pickupLng: String(draft.pickup.lng),
        pickupLabel: draft.pickup.label ?? draft.pickup.address,
        destLat: String(draft.dropoff.lat),
        destLng: String(draft.dropoff.lng),
        destLabel: draft.dropoff.label ?? draft.dropoff.address,
        vehicleType: legacyIdFromVehicleType(selectedVehicle),
        vehicleTypeEnum: selectedVehicle,
        distance: estimate.estimatedDistance.toFixed(1),
        estimatedDuration: String(estimate.estimatedDuration),
        estimatedFare: String(estimate.estimatedFare),
        pricingConfigId: String(estimate.pricingConfigId),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={rs(40)} color={palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GoRide Passenger</Text>
          <Text style={styles.title}>Chọn loại xe</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <RoutePreview
          pickup={route.pickup}
          dropoff={route.dropoff}
          estimate={estimate}
          loading={estimateLoading}
          error={estimateError}
          paymentLabel="Tiền mặt"
          onRetry={() => setRetrySeed((value) => value + 1)}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ đề xuất</Text>
          {estimateLoading && (
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.loadingText}>Đang tính giá</Text>
            </View>
          )}
        </View>

        <View style={styles.vehicleList}>
          {vehicleOptions.map((option) => (
            <VehicleOptionCard
              key={option.vehicleType}
              option={option}
              selected={option.vehicleType === selectedVehicle}
              loading={option.vehicleType === selectedVehicle && estimateLoading}
              onPress={setSelectedVehicle}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.paymentSection}>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentIconBox}>
              <MaterialCommunityIcons name="cash" size={rs(32)} color={palette.green} />
            </View>
            <View>
              <Text style={styles.paymentLabel}>Thanh toán</Text>
              <Text style={styles.paymentMethod}>Tiền mặt</Text>
            </View>
          </View>
          <View style={styles.fareSummary}>
            <Text style={styles.fareLabel}>Tạm tính</Text>
            <Text style={styles.fareValue}>{estimate ? formatFare(estimate.estimatedFare) : '-- đ'}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!canContinue}
          style={[styles.confirmButton, !canContinue && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
        >
          <Text style={styles.confirmButtonText}>Đặt {selectedOption.title}</Text>
          <Feather name="arrow-right" size={rs(32)} color="#fff" style={styles.confirmButtonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

type RoutePoints = {
  pickup: LocationPoint | null;
  dropoff: LocationPoint | null;
};

function resolveRouteFromParams(params: SearchParams): RoutePoints {
  return {
    pickup: parseLocationPointParam(params.pickup) ?? parseLegacyLocation(params, 'pickup'),
    dropoff: parseLocationPointParam(params.dropoff) ?? parseLegacyLocation(params, 'dest'),
  };
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
    // Expo Router usually decodes params already; this protects direct links.
  }

  for (const candidate of candidates) {
    try {
      return normalizeLocationPoint(JSON.parse(candidate));
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function parseLegacyLocation(params: SearchParams, prefix: 'pickup' | 'dest'): LocationPoint | null {
  const lat = Number(readParam(params[`${prefix}Lat`]));
  const lng = Number(readParam(params[`${prefix}Lng`]));
  const label = readParam(params[`${prefix}Label`]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: label || (prefix === 'pickup' ? 'Điểm đón đã chọn' : 'Điểm đến đã chọn'),
    label: label || (prefix === 'pickup' ? 'Điểm đón' : 'Điểm đến'),
  };
}

function normalizeLocationPoint(value: unknown): LocationPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<LocationPoint>;
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: typeof candidate.address === 'string' && candidate.address ? candidate.address : `${lat}, ${lng}`,
    label: typeof candidate.label === 'string' ? candidate.label : undefined,
    placeId: typeof candidate.placeId === 'string' ? candidate.placeId : undefined,
  };
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatFare(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    paddingHorizontal: rs(28),
    paddingTop: rvs(28),
    paddingBottom: rvs(18),
  },
  backButton: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerCopy: {
    flex: 1,
    gap: rvs(4),
  },
  eyebrow: {
    color: palette.primaryMid,
    fontSize: rf(18),
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: rf(36),
    fontWeight: '900',
  },
  container: {
    paddingHorizontal: rs(28),
    paddingBottom: rvs(36),
    gap: rvs(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  sectionTitle: {
    flex: 1,
    color: palette.text,
    fontSize: rf(28),
    fontWeight: '900',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(14),
    height: rvs(40),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
  },
  loadingText: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '800',
  },
  vehicleList: {
    gap: rvs(16),
  },
  footer: {
    paddingHorizontal: rs(28),
    paddingTop: rvs(20),
    paddingBottom: rvs(34),
    borderTopLeftRadius: rs(34),
    borderTopRightRadius: rs(34),
    backgroundColor: palette.card,
    ...shadow,
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(16),
    marginBottom: rvs(18),
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  paymentIconBox: {
    width: rs(66),
    height: rs(66),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.greenSoft,
  },
  paymentLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '700',
  },
  paymentMethod: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '900',
  },
  fareSummary: {
    alignItems: 'flex-end',
    gap: rvs(3),
  },
  fareLabel: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '700',
  },
  fareValue: {
    color: palette.primary,
    fontSize: rf(26),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  confirmButton: {
    height: rvs(92),
    borderRadius: rs(30),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: rf(25),
    fontWeight: '900',
  },
  confirmButtonIcon: {
    marginLeft: rs(12),
  },
});
