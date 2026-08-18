import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
import {
  getCurrentLocationPoint,
  getDefaultLocationPoint,
  requestLocationPermission,
  reverseGeocode,
} from '@/lib/location-service';
import { getLocationToWords } from '@/lib/three-word-location-api';
import type { LocationPermissionState, LocationPoint } from '@/types/ride';

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

export default function PickupScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const defaultPoint = useMemo(() => getDefaultLocationPoint(), []);
  const [pickup, setPickup] = useState<LocationPoint>(defaultPoint);
  const [query, setQuery] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionState>('locating');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 3-word location state
  const [threeWordAddress, setThreeWordAddress] = useState<string | null>(null);
  const [loadingThreeWords, setLoadingThreeWords] = useState(false);

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
        setThreeWordAddress(null);
        return;
      }

      const currentPoint = await getCurrentLocationPoint({ timeoutMs: 10000 });
      setPickup(currentPoint);
      setQuery(currentPoint.label ?? currentPoint.address);
      setThreeWordAddress(null);
      setPermissionStatus('ready');
    } catch (error) {
      setPermissionStatus('error');
      setPickup(defaultPoint);
      setQuery(defaultPoint.address);
      setThreeWordAddress(null);
      setLocationError(error instanceof Error ? error.message : t('booking.errCurrentLocation'));
    } finally {
      setLoadingLocation(false);
    }
  }, [defaultPoint, t]);

  useEffect(() => {
    void locateCurrentUser();
  }, [locateCurrentUser]);

  const handleSearchSelect = (point: LocationPoint) => {
    setPickup(point);
    setQuery(point.label ?? point.address);
    setThreeWordAddress(null);
    setPermissionStatus('ready');
    setLocationError(null);
    Keyboard.dismiss();
  };

  const handleMapLocationChange = async (point: LocationPoint) => {
    setPickup(point);
    setQuery(point.address);
    setThreeWordAddress(null);
    setPermissionStatus('ready');
    setLocationError(null);
    setResolvingAddress(true);

    try {
      const address = await reverseGeocode(point);
      const resolvedPoint = {
        ...point,
        address,
        label: point.label || t('booking.pickupPoint', 'Điểm đón đã chọn'),
      };
      setPickup(resolvedPoint);
      setQuery(address);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleFetchThreeWords = async () => {
    if (loadingThreeWords || !pickup.lat || !pickup.lng) {
      return;
    }
    setLoadingThreeWords(true);
    try {
      const result = await getLocationToWords(pickup.lat, pickup.lng);
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

  const canContinue = Boolean(pickup.lat && pickup.lng && pickup.address);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Fullscreen Map View */}
      <MapPicker
        mode="pickup"
        value={pickup}
        origin={pickup}
        status={permissionStatus}
        loading={loadingLocation}
        error={locationError}
        showGpsButton={false}
        hideModeBadge={true}
        hideTopScrim={true}
        hideThreeWords={true}
        style={StyleSheet.absoluteFillObject}
        onLocationChange={handleMapLocationChange}
        onRequestCurrentLocation={locateCurrentUser}
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
              placeholder={t('booking.searchPickupPlaceholder', 'Nhập điểm đón...')}
              value={query}
              onChangeText={setQuery}
              onSelect={handleSearchSelect}
              searchBias={pickup}
              hideHint={true}
            />
          </View>
        </View>
      </View>

      {/* 3. Floating GPS Button */}
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={loadingLocation}
        onPress={locateCurrentUser}
        style={[styles.floatingGpsButton, { bottom: insets.bottom + rvs(240) }]}
        accessibilityRole="button"
        accessibilityLabel={t('booking.locatingTitle')}
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : (
          <Ionicons name="locate" size={rs(34)} color={palette.primary} />
        )}
      </TouchableOpacity>

      {/* 4. Floating Bottom Sheet Card with 3-Word button moved down */}
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
              disabled={loadingThreeWords}
              onPress={handleFetchThreeWords}
              style={styles.getThreeWordsBtn}
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
          disabled={!canContinue}
          style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>{t('booking.continueToDestination', 'Tiếp tục chọn điểm đến')}</Text>
          <Feather name="arrow-right" size={rs(28)} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
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
  floatingGpsButton: {
    position: 'absolute',
    right: rs(20),
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
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
