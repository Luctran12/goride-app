import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddressSearch, MapPicker } from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import {
  getCurrentLocationPoint,
  getDefaultLocationPoint,
  requestLocationPermission,
  reverseGeocode,
} from '@/lib/location-service';
import type { LocationPermissionState, LocationPoint } from '@/types/ride';

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

const suggestedPickups: (LocationPoint & { icon: keyof typeof Ionicons.glyphMap })[] = [
  {
    ...getDefaultLocationPoint(),
    label: 'Trung tâm TP.HCM',
    address: 'Khu vực trung tâm TP.HCM',
    icon: 'navigate-outline',
  },
  {
    lat: 10.7712,
    lng: 106.6917,
    label: 'Về nhà',
    address: '42 Nguyễn Trãi, Quận 1',
    icon: 'home-outline',
  },
  {
    lat: 10.7765,
    lng: 106.7009,
    label: 'Văn phòng',
    address: '18 Lê Lợi, Quận 3',
    icon: 'business-outline',
  },
];

export default function PickupScreen() {
  const router = useRouter();
  const defaultPoint = useMemo(() => getDefaultLocationPoint(), []);
  const [pickup, setPickup] = useState<LocationPoint>(defaultPoint);
  const [query, setQuery] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionState>('locating');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const locateCurrentUser = useCallback(async () => {
    setLoadingLocation(true);
    setLocationError(null);
    setPermissionStatus('locating');

    try {
      const permission = await requestLocationPermission();

      if (!permission.granted) {
        setPermissionStatus(permission.status);
        setPickup(defaultPoint);
        setQuery(defaultPoint.address);
        return;
      }

      const currentPoint = await getCurrentLocationPoint({ timeoutMs: 10000 });
      setPickup(currentPoint);
      setQuery(currentPoint.label ?? currentPoint.address);
      setPermissionStatus('ready');
    } catch (error) {
      setPermissionStatus('error');
      setPickup(defaultPoint);
      setQuery(defaultPoint.address);
      setLocationError(error instanceof Error ? error.message : 'Không thể lấy vị trí hiện tại');
    } finally {
      setLoadingLocation(false);
    }
  }, [defaultPoint]);

  useEffect(() => {
    void locateCurrentUser();
  }, [locateCurrentUser]);

  const handleSearchSelect = (point: LocationPoint) => {
    setPickup(point);
    setQuery(point.label ?? point.address);
    setPermissionStatus('ready');
    setLocationError(null);
  };

  const handleMapLocationChange = async (point: LocationPoint) => {
    setPickup(point);
    setQuery(point.address);
    setPermissionStatus('ready');
    setLocationError(null);
    setResolvingAddress(true);

    try {
      const address = await reverseGeocode(point);
      const resolvedPoint = {
        ...point,
        address,
        label: 'Điểm đón đã chọn',
      };
      setPickup(resolvedPoint);
      setQuery(address);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleSuggestedPickup = (point: LocationPoint) => {
    setPickup(point);
    setQuery(point.label ?? point.address);
    setPermissionStatus('ready');
    setLocationError(null);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(customer)/booking/destination',
      params: {
        pickup: JSON.stringify(pickup),
        pickupLat: String(pickup.lat),
        pickupLng: String(pickup.lng),
        pickupLabel: pickup.label ?? pickup.address,
      },
    });
  };

  const locationStatusCopy = getLocationStatusCopy(permissionStatus, loadingLocation, locationError);
  const canContinue = Boolean(pickup.lat && pickup.lng && pickup.address);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        contentContainerStyle={styles.container}
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
            <Text style={styles.title}>Chọn điểm đón</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="crosshairs-gps" size={rs(36)} color={palette.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Bật GPS hoặc ghim trên bản đồ</Text>
            <Text style={styles.heroText}>
              GoRide sẽ nhận diện địa chỉ hiện tại nếu bạn cấp quyền. Nếu không, bạn vẫn có thể tìm kiếm hoặc kéo marker thủ công.
            </Text>
          </View>
        </View>

        <AddressSearch
          label="Tìm điểm đón"
          placeholder="Nhập tên đường, tòa nhà, quán cafe..."
          value={query}
          onChangeText={setQuery}
          onSelect={handleSearchSelect}
          searchBias={pickup}
          helperText="Gợi ý gần vị trí đang chọn. Có thể chọn bằng search hoặc chạm trực tiếp trên bản đồ."
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
            mode="pickup"
            value={pickup}
            origin={pickup}
            status={permissionStatus}
            loading={loadingLocation}
            error={locationError}
            height={rvs(560)}
            onLocationChange={handleMapLocationChange}
            onRequestCurrentLocation={locateCurrentUser}
            onInteractionStart={() => setScrollEnabled(false)}
            onInteractionEnd={() => setScrollEnabled(true)}
          />
        </View>

        {locationStatusCopy && (
          <View style={[styles.statusCard, locationStatusCopy.tone === 'danger' && styles.statusCardDanger]}>
            <Ionicons name={locationStatusCopy.icon} size={rs(26)} color={locationStatusCopy.color} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{locationStatusCopy.title}</Text>
              <Text style={styles.statusText}>{locationStatusCopy.message}</Text>
            </View>
          </View>
        )}

        <View style={styles.section} onTouchStart={() => setScrollEnabled(true)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Điểm đón gợi ý</Text>
            {resolvingAddress && (
              <View style={styles.resolvingBadge}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={styles.resolvingText}>Đang nhận diện địa chỉ</Text>
              </View>
            )}
          </View>

          {suggestedPickups.map((point) => {
            const active = Math.abs(point.lat - pickup.lat) < 0.000001 && Math.abs(point.lng - pickup.lng) < 0.000001;

            return (
              <Pressable
                key={`${point.lat}-${point.lng}`}
                accessibilityRole="button"
                accessibilityLabel={`Chọn ${point.label ?? point.address}`}
                onPress={() => handleSuggestedPickup(point)}
                style={({ pressed }) => [
                  styles.placeCard,
                  active && styles.placeCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.placeIcon, active && styles.placeIconActive]}>
                  <Ionicons name={point.icon} size={rs(30)} color={active ? '#fff' : palette.primary} />
                </View>
                <View style={styles.placeCopy}>
                  <Text style={styles.placeLabel}>{point.label}</Text>
                  <Text style={styles.placeDetail} numberOfLines={1} selectable>
                    {point.address}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={rs(34)} color={palette.primary} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHandle} />
          <View style={styles.summaryHeader}>
            <View style={styles.pickupDot} />
            <Text style={styles.summaryTitle}>Chi tiết điểm đón</Text>
          </View>

          <Text style={styles.summaryValue} numberOfLines={2} selectable>
            {pickup.address}
          </Text>
          <Text style={styles.summaryMeta} selectable>
            {pickup.lat.toFixed(6)}, {pickup.lng.toFixed(6)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!canContinue}
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Tiếp tục chọn điểm đến</Text>
            <Feather name="arrow-right" size={rs(30)} color="#fff" style={styles.primaryButtonIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getLocationStatusCopy(
  status: LocationPermissionState,
  loading: boolean,
  error: string | null,
):
  | {
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
      title: string;
      message: string;
      tone?: 'danger';
    }
  | null {
  if (loading || status === 'locating') {
    return {
      icon: 'locate-outline',
      color: palette.primary,
      title: 'Đang lấy vị trí hiện tại',
      message: 'Bạn vẫn có thể chạm bản đồ nếu muốn chọn nhanh một điểm đón khác.',
    };
  }

  if (error || status === 'error') {
    return {
      icon: 'warning-outline',
      color: palette.danger,
      title: 'Không lấy được GPS',
      message: error ?? 'GoRide đang dùng vị trí mặc định. Hãy thử lại hoặc chọn thủ công trên bản đồ.',
      tone: 'danger',
    };
  }

  if (status === 'permission-needed') {
    return {
      icon: 'shield-outline',
      color: palette.primaryMid,
      title: 'Chưa có quyền vị trí',
      message: 'Bạn có thể bấm nút GPS để xin quyền lại, hoặc chọn điểm đón bằng search/map.',
    };
  }

  if (status === 'gps-disabled') {
    return {
      icon: 'navigate-outline',
      color: palette.danger,
      title: 'GPS đang tắt',
      message: 'Bản đồ vẫn hoạt động để bạn ghim điểm đón thủ công.',
      tone: 'danger',
    };
  }

  return null;
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    padding: rs(24),
    borderRadius: rs(34),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#e4d9ff',
  },
  heroIcon: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
  },
  heroCopy: {
    flex: 1,
    gap: rvs(6),
  },
  heroTitle: {
    color: palette.text,
    fontSize: rf(23),
    fontWeight: '900',
  },
  heroText: {
    color: palette.muted,
    fontSize: rf(18),
    lineHeight: rf(25),
  },
  search: {
    zIndex: 10,
  },
  mapCard: {
    borderRadius: rs(36),
    backgroundColor: '#d6ecff',
    ...shadow,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    padding: rs(18),
    borderRadius: rs(26),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  statusCardDanger: {
    borderColor: '#ffd0d0',
    backgroundColor: '#fff7f7',
  },
  statusCopy: {
    flex: 1,
    gap: rvs(4),
  },
  statusTitle: {
    color: palette.text,
    fontSize: rf(19),
    fontWeight: '900',
  },
  statusText: {
    color: palette.muted,
    fontSize: rf(17),
    lineHeight: rf(24),
  },
  section: {
    gap: rvs(14),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(25),
    fontWeight: '900',
  },
  resolvingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  placeCard: {
    minHeight: rvs(88),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
    paddingVertical: rvs(16),
    paddingHorizontal: rs(18),
    borderRadius: rs(28),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  placeCardActive: {
    borderColor: palette.primary,
    backgroundColor: '#faf8ff',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  placeIcon: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  placeIconActive: {
    backgroundColor: palette.primary,
  },
  placeCopy: {
    flex: 1,
    gap: rvs(4),
  },
  placeLabel: {
    color: palette.text,
    fontSize: rf(21),
    fontWeight: '900',
  },
  placeDetail: {
    color: palette.muted,
    fontSize: rf(17),
  },
  summaryCard: {
    padding: rs(26),
    borderRadius: rs(38),
    backgroundColor: palette.card,
    gap: rvs(16),
    ...shadow,
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
    gap: rs(12),
  },
  pickupDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: palette.primary,
  },
  summaryTitle: {
    color: palette.text,
    fontSize: rf(23),
    fontWeight: '900',
  },
  summaryValue: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(31),
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
