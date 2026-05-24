import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSearch, MapPicker } from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { getDefaultLocationPoint, reverseGeocode } from '@/lib/location-service';
import type { LocationPoint } from '@/types/ride';

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

export default function DestinationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { pickup, usedFallbackPickup } = useMemo(() => resolvePickupFromParams(params), [params]);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [query, setQuery] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleSearchSelect = (point: LocationPoint) => {
    setDropoff(point);
    setQuery(point.label ?? point.address);
  };

  const handleMapLocationChange = async (point: LocationPoint) => {
    setDropoff(point);
    setQuery(point.address);
    setResolvingAddress(true);

    try {
      const address = await reverseGeocode(point);
      const resolvedPoint = {
        ...point,
        address,
        label: 'Điểm đến đã chọn',
      };
      setDropoff(resolvedPoint);
      setQuery(address);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (!dropoff) {
      return;
    }

    router.push({
      pathname: '/(customer)/booking/select-vehicle',
      params: {
        pickup: JSON.stringify(pickup),
        dropoff: JSON.stringify(dropoff),
        pickupLat: String(pickup.lat),
        pickupLng: String(pickup.lng),
        pickupLabel: pickup.label ?? pickup.address,
        destLat: String(dropoff.lat),
        destLng: String(dropoff.lng),
        destLabel: dropoff.label ?? dropoff.address,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: rvs(320) + insets.bottom }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={rs(40)} color={palette.primary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GoRide Passenger</Text>
            <Text style={styles.title}>Chọn điểm đến</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeIcon}>
            <MaterialCommunityIcons name="map-marker-path" size={rs(36)} color={palette.primary} />
          </View>
          <View style={styles.routeCopy}>
            <Text style={styles.routeTitle}>Từ điểm đón đến nơi bạn muốn tới</Text>
            <Text style={styles.routeText} numberOfLines={2} selectable>
              {pickup.address}
            </Text>
          </View>
        </View>

        {usedFallbackPickup && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle-outline" size={rs(26)} color={palette.primaryMid} />
            <Text style={styles.warningText}>
              Không nhận được điểm đón từ màn trước, GoRide đang dùng vị trí mặc định để bạn vẫn có thể demo flow.
            </Text>
          </View>
        )}

        <AddressSearch
          label="Tìm điểm đến"
          placeholder="Bạn muốn đi đâu?"
          value={query}
          onChangeText={setQuery}
          onSelect={handleSearchSelect}
          searchBias={dropoff ?? pickup}
          helperText="Tìm bằng Google Places nếu có API key, hoặc fallback geocode khi chưa cấu hình key."
          autoFocus
          style={styles.search}
        />

        <View
          style={styles.mapCard}
          onStartShouldSetResponder={() => {
            setScrollEnabled(false);
            return false;
          }}
        >
          <MapPicker
            mode="destination"
            value={dropoff}
            origin={pickup}
            destination={dropoff}
            status="ready"
            showGpsButton={false}
            height={rvs(560)}
            onLocationChange={handleMapLocationChange}
            onInteractionStart={() => setScrollEnabled(false)}
            onInteractionEnd={() => setScrollEnabled(true)}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.summaryCard, styles.floatingSummaryCard, { bottom: insets.bottom + rvs(12) }]}>
        <View style={styles.summaryHandle} />
        <View style={styles.summaryHeader}>
          <View style={styles.pickupDot} />
          <View style={styles.summaryLine} />
          <View style={[styles.pickupDot, styles.dropoffDot]} />
          <Text style={styles.summaryTitle}>Lộ trình đã chọn</Text>
        </View>

        {resolvingAddress && (
          <View style={styles.resolvingBadge}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.resolvingText}>Đang nhận diện địa chỉ</Text>
          </View>
        )}

        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>Điểm đón</Text>
          <Text style={styles.addressValue} numberOfLines={1} selectable>
            {pickup.address}
          </Text>
        </View>

        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>Điểm đến</Text>
          <Text style={[styles.addressValue, !dropoff && styles.placeholderText]} numberOfLines={2} selectable>
            {dropoff?.address ?? 'Chọn điểm đến bằng search hoặc chạm trên bản đồ'}
          </Text>
          {dropoff && (
            <Text style={styles.summaryMeta} selectable>
              {dropoff.lat.toFixed(6)}, {dropoff.lng.toFixed(6)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!dropoff}
          style={[styles.primaryButton, !dropoff && styles.primaryButtonDisabled]}
          onPress={handleConfirm}
        >
          <Text style={styles.primaryButtonText}>Xác nhận điểm đến</Text>
          <Feather name="check" size={rs(30)} color="#fff" style={styles.primaryButtonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function resolvePickupFromParams(params: SearchParams) {
  const parsedPickup = parseLocationPointParam(params.pickup);

  if (parsedPickup) {
    return { pickup: parsedPickup, usedFallbackPickup: false };
  }

  const legacyPickup = parseLegacyPickup(params);

  if (legacyPickup) {
    return { pickup: legacyPickup, usedFallbackPickup: false };
  }

  return { pickup: getDefaultLocationPoint(), usedFallbackPickup: true };
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
    // Expo Router normally decodes params for us; this fallback only protects direct links.
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

function parseLegacyPickup(params: SearchParams): LocationPoint | null {
  const lat = Number(readParam(params.pickupLat));
  const lng = Number(readParam(params.pickupLng));
  const label = readParam(params.pickupLabel);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: label || 'Điểm đón đã chọn',
    label: label || 'Điểm đón',
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


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(28),
    paddingTop: rvs(28),
    gap: rvs(22),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
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
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    padding: rs(24),
    borderRadius: rs(34),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  routeIcon: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  routeCopy: {
    flex: 1,
    gap: rvs(6),
  },
  routeTitle: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '900',
  },
  routeText: {
    color: palette.muted,
    fontSize: rf(18),
    lineHeight: rf(25),
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(18),
    borderRadius: rs(26),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#e4d9ff',
  },
  warningText: {
    flex: 1,
    color: palette.primaryMid,
    fontSize: rf(17),
    fontWeight: '700',
    lineHeight: rf(24),
  },
  search: {
    zIndex: 10,
  },
  mapCard: {
    borderRadius: rs(36),
    backgroundColor: '#d6ecff',
    ...shadow,
  },
  resolvingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: rs(8),
    paddingHorizontal: rs(12),
    height: rvs(38),
    borderRadius: rs(19),
    backgroundColor: palette.primarySoft,
  },
  resolvingText: {
    color: palette.primary,
    fontSize: rf(15),
    fontWeight: '800',
  },
  summaryCard: {
    padding: rs(26),
    borderRadius: rs(38),
    backgroundColor: palette.card,
    gap: rvs(16),
    ...shadow,
  },
  floatingSummaryCard: {
    position: 'absolute',
    left: rs(20),
    right: rs(20),
    zIndex: 30,
  },
  summaryHandle: {
    alignSelf: 'center',
    width: rs(72),
    height: rvs(7),
    borderRadius: rs(4),
    backgroundColor: palette.line,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  pickupDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: palette.primary,
  },
  dropoffDot: {
    backgroundColor: palette.danger,
  },
  summaryLine: {
    width: rs(30),
    height: 2,
    backgroundColor: palette.line,
  },
  summaryTitle: {
    flex: 1,
    color: palette.text,
    fontSize: rf(23),
    fontWeight: '900',
  },
  addressBlock: {
    gap: rvs(6),
  },
  addressLabel: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  addressValue: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(31),
  },
  placeholderText: {
    color: palette.muted,
    fontWeight: '700',
  },
  summaryMeta: {
    color: palette.muted,
    fontSize: rf(17),
    fontVariant: ['tabular-nums'],
  },
  primaryButton: {
    height: rvs(88),
    borderRadius: rs(28),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: rf(24),
    fontWeight: '900',
  },
  primaryButtonIcon: {
    marginLeft: rs(10),
  },
  bottomSpacer: {
    height: rvs(28),
  },
});
