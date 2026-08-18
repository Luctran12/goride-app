import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';

import { useLanguage } from '@/lib/i18n';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSearch, MapPicker } from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { getDefaultLocationPoint, reverseGeocode } from '@/lib/location-service';
import { getLocationToWords } from '@/lib/three-word-location-api';
import type { LocationPoint } from '@/types/ride';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#3f22d6',
  primarySoft: '#eeecfb',
  primaryMid: '#5a3fe6',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
  green: '#00c853',
  greenSoft: '#e8fcdb',
};

const shadow = {
  shadowColor: '#1e1b4b',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.14,
  shadowRadius: 24,
  elevation: 10,
};

export default function DestinationScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { pickup } = useMemo(() => resolvePickupFromParams(params, t), [params, t]);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [query, setQuery] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // 3-word location state
  const [threeWordAddress, setThreeWordAddress] = useState<string | null>(null);
  const [loadingThreeWords, setLoadingThreeWords] = useState(false);

  const handleSearchSelect = (point: LocationPoint) => {
    setDropoff(point);
    setQuery(point.label ?? point.address);
    setThreeWordAddress(null);
    Keyboard.dismiss();
  };

  const handleMapLocationChange = async (point: LocationPoint) => {
    setDropoff(point);
    setQuery(point.address);
    setThreeWordAddress(null);
    setResolvingAddress(true);

    try {
      const address = await reverseGeocode(point);
      const resolvedPoint = {
        ...point,
        address,
        label: point.label || t('booking.dropoffPoint', 'Điểm đến đã chọn'),
      };
      setDropoff(resolvedPoint);
      setQuery(address);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleFetchThreeWords = async () => {
    if (loadingThreeWords || !dropoff?.lat || !dropoff?.lng) {
      return;
    }
    setLoadingThreeWords(true);
    try {
      const result = await getLocationToWords(dropoff.lat, dropoff.lng);
      setThreeWordAddress(result.wordAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('booking.errThreeWords', 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.');
      Alert.alert(t('booking.threeWordsLabel', '3 từ'), message);
    } finally {
      setLoadingThreeWords(false);
    }
  };

  const handleCopyThreeWords = async () => {
    if (!threeWordAddress) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(threeWordAddress);
      }
      Alert.alert(
        t('booking.copiedTitle', 'Đã sao chép'),
        t('booking.threeWordsCopied', { address: threeWordAddress }, `Địa chỉ 3 từ: ${threeWordAddress}`),
      );
    } catch {
      Alert.alert(t('booking.threeWordsLabel', '3 từ'), threeWordAddress);
    }
  };

  const handleShareThreeWords = async () => {
    if (!threeWordAddress) return;
    try {
      await Share.share({
        message: t('booking.threeWordsShareMsg', { address: threeWordAddress }, `Địa chỉ 3 từ GoRide: ${threeWordAddress}`),
        title: t('booking.threeWordsLabel', '3 từ'),
      });
    } catch {
      // ignore
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
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Fullscreen Map View */}
      <MapPicker
        mode="destination"
        value={dropoff}
        origin={pickup}
        destination={dropoff}
        status="ready"
        showGpsButton={false}
        hideModeBadge={true}
        hideTopScrim={true}
        hideThreeWords={true}
        style={StyleSheet.absoluteFillObject}
        onLocationChange={handleMapLocationChange}
      />

      {/* 2. Floating Top Search Bar ONLY (No extra hint/address box underneath) */}
      <View style={[styles.topOverlay, { top: insets.top + rvs(10) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.back()}
            style={styles.floatingBackButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={rs(32)} color={palette.primary} />
          </TouchableOpacity>

          <View style={styles.searchWrap}>
            <AddressSearch
              placeholder={t('booking.searchDestinationPlaceholder', 'Nhập điểm đến...')}
              value={query}
              onChangeText={setQuery}
              onSelect={handleSearchSelect}
              searchBias={dropoff ?? pickup}
              hideHint={true}
              autoFocus
            />
          </View>
        </View>
      </View>

      {/* 3. Floating Bottom Sheet Card with 3-Word button moved down */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + rvs(16) }]}>
        <View style={styles.handleBar} />

        {/* 3-Word Address Row (moved down) */}
        <View style={styles.threeWordRow}>
          {threeWordAddress ? (
            <View style={styles.threeWordBadge}>
              <View style={styles.threeWordTextWrap}>
                <Text style={styles.threeWordSymbol}>///</Text>
                <Text style={styles.threeWordAddressText} selectable>{threeWordAddress}</Text>
              </View>
              <View style={styles.threeWordActionGroup}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCopyThreeWords}
                  style={styles.threeWordActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.copy3Words', 'Sao chép')}
                >
                  <Ionicons name="copy-outline" size={rs(20)} color={palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleShareThreeWords}
                  style={styles.threeWordActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.share3Words', 'Chia sẻ')}
                >
                  <Ionicons name="share-social-outline" size={rs(20)} color={palette.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={loadingThreeWords || !dropoff}
              onPress={handleFetchThreeWords}
              style={[styles.getThreeWordsBtn, !dropoff && styles.getThreeWordsBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('booking.get3Words', 'Lấy 3 từ')}
            >
              {loadingThreeWords ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <>
                  <Text style={styles.threeWordSymbol}>///</Text>
                  <Text style={styles.getThreeWordsText}>
                    {t('booking.getThreeWords', 'Lấy địa chỉ 3 từ')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {resolvingAddress && (
            <View style={styles.resolvingInline}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.resolvingText}>{t('booking.resolvingAddress', 'Đang xác định...')}</Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!dropoff}
          style={[styles.primaryButton, !dropoff && styles.primaryButtonDisabled]}
          onPress={handleConfirm}
        >
          <Text style={styles.primaryButtonText}>{t('booking.confirmDestination', 'Xác nhận điểm đến')}</Text>
          <Feather name="arrow-right" size={rs(28)} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function resolvePickupFromParams(params: SearchParams, t: (key: string) => string) {
  const parsedPickup = parseLocationPointParam(params.pickup);

  if (parsedPickup) {
    return { pickup: parsedPickup, usedFallbackPickup: false };
  }

  const legacyPickup = parseLegacyPickup(params, t);

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
    // Fallback
  }

  for (const candidate of candidates) {
    try {
      return normalizeLocationPoint(JSON.parse(candidate));
    } catch {
      // Try next
    }
  }

  return null;
}

function parseLegacyPickup(params: SearchParams, t: (key: string) => string): LocationPoint | null {
  const lat = Number(readParam(params.pickupLat));
  const lng = Number(readParam(params.pickupLng));
  const label = readParam(params.pickupLabel);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: label || t('booking.pickupPoint'),
    label: label || t('booking.pickupPoint'),
  };
}

function normalizeLocationPoint(value: any): LocationPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const lat = Number(value.lat);
  const lng = Number(value.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: typeof value.address === 'string' ? value.address : `${lat}, ${lng}`,
    label: typeof value.label === 'string' ? value.label : undefined,
    placeId: typeof value.placeId === 'string' ? value.placeId : undefined,
  };
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topOverlay: {
    position: 'absolute',
    left: rs(18),
    right: rs(18),
    zIndex: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
  },
  floatingBackButton: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rvs(4),
    ...shadow,
  },
  searchWrap: {
    flex: 1,
    ...shadow,
  },
  bottomSheet: {
    position: 'absolute',
    left: rs(14),
    right: rs(14),
    bottom: rvs(10),
    backgroundColor: palette.card,
    borderRadius: rs(32),
    paddingHorizontal: rs(26),
    paddingTop: rvs(14),
    zIndex: 45,
    ...shadow,
  },
  handleBar: {
    width: rs(44),
    height: rvs(5),
    borderRadius: rs(3),
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: rvs(14),
  },
  threeWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
    marginBottom: rvs(16),
  },
  getThreeWordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(18),
    height: rvs(54),
    borderRadius: rs(18),
  },
  getThreeWordsBtnDisabled: {
    opacity: 0.5,
  },
  threeWordSymbol: {
    color: palette.danger,
    fontSize: rf(22),
    fontWeight: '900',
    letterSpacing: -1,
  },
  getThreeWordsText: {
    color: palette.primary,
    fontSize: rf(20),
    fontWeight: '800',
  },
  threeWordBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.primarySoft,
    borderRadius: rs(18),
    paddingHorizontal: rs(16),
    height: rvs(54),
    borderWidth: 1,
    borderColor: '#d6cbf5',
  },
  threeWordTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    flex: 1,
  },
  threeWordAddressText: {
    color: palette.primary,
    fontSize: rf(21),
    fontWeight: '800',
  },
  threeWordActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  threeWordActionBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(8),
  },
  resolvingText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
  },
  primaryButton: {
    height: rvs(84),
    borderRadius: rs(22),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: rf(24),
    lineHeight: rf(30),
    fontWeight: '800',
  },
});
