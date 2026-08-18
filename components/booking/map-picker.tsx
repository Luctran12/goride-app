import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
  type Region,
} from 'react-native-maps';

import { rs, rvs, rf } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';
import { fetchRoute, getDefaultLocationPoint } from '@/lib/location-service';
import { getLocationToWords } from '@/lib/three-word-location-api';
import type { Coordinates, LocationPermissionState, LocationPoint } from '@/types/ride';

const palette = {
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
  mapWater: '#d8f1ff',
};

const defaultPoint = getDefaultLocationPoint();

export type MapPickerMode = 'pickup' | 'destination' | 'tracking';

export type MapPickerProps = {
  mode?: MapPickerMode;
  value?: LocationPoint | null;
  origin?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: Coordinates | null;
  status?: LocationPermissionState;
  loading?: boolean;
  error?: string | null;
  height?: number;
  style?: StyleProp<ViewStyle>;
  provider?: 'google';
  allowSelection?: boolean;
  showGpsButton?: boolean;
  showUserLocation?: boolean;
  hideModeBadge?: boolean;
  hideTopScrim?: boolean;
  hideThreeWords?: boolean;
  routeCoordinates?: { latitude: number; longitude: number }[];
  onLocationChange?: (point: LocationPoint) => void;
  onRequestCurrentLocation?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function MapPicker({
  mode = 'pickup',
  value = null,
  origin = null,
  destination = null,
  driverLocation = null,
  status = 'ready',
  loading = false,
  error = null,
  height,
  style,
  provider,
  allowSelection,
  showGpsButton = true,
  showUserLocation = true,
  hideModeBadge = false,
  hideTopScrim = false,
  hideThreeWords = false,
  routeCoordinates: customRouteCoordinates,
  onLocationChange,
  onRequestCurrentLocation,
  onInteractionStart,
  onInteractionEnd,
}: MapPickerProps) {
  const { t } = useLanguage();
  const mapRef = useRef<MapView | null>(null);
  const selectable = allowSelection ?? mode !== 'tracking';
  const selectionPoint = value ?? (mode === 'destination' ? destination : origin) ?? null;
  const selectedPoint = selectionPoint ?? origin ?? defaultPoint;
  const hasSelectionMarker = selectable && Boolean(selectionPoint);
  const mapProvider = provider === 'google' ? PROVIDER_GOOGLE : undefined;
  const activeStatus = loading ? 'locating' : status;
  const hasBlockingOverlay = activeStatus === 'locating' || Boolean(error);
  const valueLat = value?.lat;
  const valueLng = value?.lng;
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;
  const driverLat = driverLocation?.lat;
  const driverLng = driverLocation?.lng;

  const [activeFocusTarget, setActiveFocusTarget] = useState<'pickup' | 'destination' | 'driver' | 'custom'>('pickup');
  const [customFocusPoint, setCustomFocusPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const currentFocusPoint = useMemo(() => {
    if (activeFocusTarget === 'destination' && destination?.lat && destination?.lng) {
      return { lat: destination.lat, lng: destination.lng, label: t('booking.destination', 'Điểm đến') };
    }
    if (activeFocusTarget === 'driver' && driverLocation?.lat && driverLocation?.lng) {
      return { lat: driverLocation.lat, lng: driverLocation.lng, label: t('booking.driver', 'Tài xế') };
    }
    if (activeFocusTarget === 'custom' && customFocusPoint) {
      return customFocusPoint;
    }
    if (origin?.lat && origin?.lng) {
      return { lat: origin.lat, lng: origin.lng, label: t('booking.pickupPoint', 'Điểm đón') };
    }
    return { lat: selectedPoint.lat, lng: selectedPoint.lng, label: t('booking.selectedLocation', 'Vị trí đã chọn') };
  }, [activeFocusTarget, destination, driverLocation, customFocusPoint, origin, selectedPoint, t]);

  const [threeWordAddress, setThreeWordAddress] = useState<string | null>(null);
  const [loadingThreeWords, setLoadingThreeWords] = useState(false);

  useEffect(() => {
    setThreeWordAddress(null);
  }, [currentFocusPoint.lat, currentFocusPoint.lng]);

  const handleFetchThreeWords = async () => {
    if (loadingThreeWords) {
      return;
    }
    setLoadingThreeWords(true);
    try {
      const result = await getLocationToWords(currentFocusPoint.lat, currentFocusPoint.lng);
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
      Alert.alert(t('booking.copiedTitle', 'Đã sao chép'), t('booking.threeWordsCopied', { address: threeWordAddress }, `Địa chỉ 3 từ: ${threeWordAddress}`));
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

  const selectedRegion = useMemo(
    () => createRegion({ lat: selectedPoint.lat, lng: selectedPoint.lng }),
    [selectedPoint.lat, selectedPoint.lng],
  );

  const [fetchedRouteCoordinates, setFetchedRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (customRouteCoordinates && customRouteCoordinates.length > 0) {
      setFetchedRouteCoordinates([]);
      return;
    }

    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      setFetchedRouteCoordinates([]);
      return;
    }

    let isMounted = true;
    void fetchRoute({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng })
      .then((res) => {
        if (isMounted && res.coordinates && res.coordinates.length > 0) {
          setFetchedRouteCoordinates(res.coordinates);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [customRouteCoordinates, originLat, originLng, destinationLat, destinationLng]);

  const routeCoordinates = useMemo(() => {
    if (customRouteCoordinates && customRouteCoordinates.length > 0) {
      return customRouteCoordinates;
    }
    if (fetchedRouteCoordinates && fetchedRouteCoordinates.length > 0) {
      return fetchedRouteCoordinates;
    }
    return compactRawLatLng([[originLat, originLng], [destinationLat, destinationLng]]);
  }, [customRouteCoordinates, fetchedRouteCoordinates, destinationLat, destinationLng, originLat, originLng]);
  const showOriginMarker = Boolean(origin && (!hasSelectionMarker || !isSameCoordinate(origin, selectedPoint)));
  const showDestinationMarker = Boolean(destination && (!hasSelectionMarker || !isSameCoordinate(destination, selectedPoint)));

  const visibleCoordinates = useMemo(
    () => {
      if (routeCoordinates && routeCoordinates.length > 1) {
        return routeCoordinates;
      }
      return compactRawLatLng([
        [valueLat, valueLng],
        [originLat, originLng],
        [destinationLat, destinationLng],
        [driverLat, driverLng],
      ]);
    },
    [routeCoordinates, destinationLat, destinationLng, driverLat, driverLng, originLat, originLng, valueLat, valueLng],
  );
  const visibleCoordinateCount = visibleCoordinates.length;

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (visibleCoordinateCount > 1) {
      mapRef.current.fitToCoordinates(visibleCoordinates, {
        edgePadding: {
          top: rs(90),
          right: rs(60),
          bottom: rs(90),
          left: rs(60),
        },
        animated: true,
      });
      return;
    }

    mapRef.current.animateToRegion(selectedRegion, 450);
  }, [selectedRegion, visibleCoordinateCount, visibleCoordinates]);

  const handleCoordinateSelect = (coordinate: LatLng) => {
    if (!selectable || !onLocationChange) {
      return;
    }

    onLocationChange({
      lat: coordinate.latitude,
      lng: coordinate.longitude,
      address: t('booking.selectedLocation', 'Vị trí đã chọn'),
      label: mode === 'pickup' ? t('booking.pickupSelected', 'Điểm đón đã chọn') : t('booking.dropoffSelected', 'Điểm đến đã chọn'),
    });
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (mode === 'tracking') {
      const coord = event.nativeEvent.coordinate;
      setCustomFocusPoint({
        lat: coord.latitude,
        lng: coord.longitude,
        label: t('booking.customCoordinates', 'Tọa độ chọn'),
      });
      setActiveFocusTarget('custom');
      return;
    }
    handleCoordinateSelect(event.nativeEvent.coordinate);
  };

  const handleMarkerDragEnd = (event: MarkerDragStartEndEvent) => {
    handleCoordinateSelect(event.nativeEvent.coordinate);
    onInteractionEnd?.();
  };

  return (
    <View style={[styles.container, height !== undefined ? { height } : { flex: 1 }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={mapProvider}
        initialRegion={createRegion(selectedPoint)}
        loadingEnabled
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={showUserLocation}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        onPress={handleMapPress}
        onPanDrag={onInteractionStart}
        onTouchStart={onInteractionStart}
        onTouchEnd={onInteractionEnd}
      >
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={palette.primary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {showOriginMarker && origin && (
          <LocationMarker
            point={origin}
            tone="pickup"
            title="Điểm đón"
            onPress={() => setActiveFocusTarget('pickup')}
          />
        )}
        {showDestinationMarker && destination && (
          <LocationMarker
            point={destination}
            tone="destination"
            title="Điểm đến"
            onPress={() => setActiveFocusTarget('destination')}
          />
        )}

        {hasSelectionMarker && (
          <LocationMarker
            point={selectedPoint}
            draggable
            tone={mode === 'pickup' ? 'pickup' : 'destination'}
            title={mode === 'pickup' ? 'Điểm đón' : 'Điểm đến'}
            onDragStart={onInteractionStart}
            onDragEnd={handleMarkerDragEnd}
            onPress={() => setActiveFocusTarget('pickup')}
          />
        )}

        {driverLocation && (
          <DriverMarker
            coordinate={driverLocation}
            onPress={() => setActiveFocusTarget('driver')}
          />
        )}

        {activeFocusTarget === 'custom' && customFocusPoint && (
          <Marker
            key={`custom-${customFocusPoint.lat.toFixed(6)}-${customFocusPoint.lng.toFixed(6)}`}
            coordinate={{ latitude: customFocusPoint.lat, longitude: customFocusPoint.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={threeWordAddress ? `/// ${threeWordAddress}` : t('booking.selectedLocation', 'Vị trí đã chọn')}
            description={threeWordAddress ? t('booking.threeWordsLabel', '3 từ') : t('booking.pressToGet3Words', 'Nhấn để lấy địa chỉ 3 từ')}
          >
            <View style={styles.customFocusPin}>
              <View style={styles.customFocusPinHalo} />
              <View style={styles.customFocusPinBubble}>
                <Text style={styles.customFocusPinSymbol}>///</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {!hideTopScrim && <View style={styles.topScrim} pointerEvents="none" />}

      {/* Floating 3-word action button / address badge */}
      {!hideThreeWords && Boolean(currentFocusPoint?.lat && currentFocusPoint?.lng) && (
        <View style={styles.threeWordContainer}>
          {mode === 'tracking' && (
            <View style={styles.targetPillRow}>
              {origin && (
                <Pressable
                  onPress={() => setActiveFocusTarget('pickup')}
                  style={[styles.targetPill, activeFocusTarget === 'pickup' && styles.targetPillActive]}
                >
                  <Text style={[styles.targetPillText, activeFocusTarget === 'pickup' && styles.targetPillTextActive]}>
                    {t('booking.pickupShort', 'Đón')}
                  </Text>
                </Pressable>
              )}
              {destination && (
                <Pressable
                  onPress={() => setActiveFocusTarget('destination')}
                  style={[styles.targetPill, activeFocusTarget === 'destination' && styles.targetPillActive]}
                >
                  <Text style={[styles.targetPillText, activeFocusTarget === 'destination' && styles.targetPillTextActive]}>
                    {t('booking.dropoffShort', 'Đến')}
                  </Text>
                </Pressable>
              )}
              {driverLocation && (
                <Pressable
                  onPress={() => setActiveFocusTarget('driver')}
                  style={[styles.targetPill, activeFocusTarget === 'driver' && styles.targetPillActive]}
                >
                  <Text style={[styles.targetPillText, activeFocusTarget === 'driver' && styles.targetPillTextActive]}>
                    {t('booking.driver', 'Tài xế')}
                  </Text>
                </Pressable>
              )}
              {customFocusPoint && (
                <Pressable
                  onPress={() => setActiveFocusTarget('custom')}
                  style={[styles.targetPill, activeFocusTarget === 'custom' && styles.targetPillActive]}
                >
                  <Text style={[styles.targetPillText, activeFocusTarget === 'custom' && styles.targetPillTextActive]}>
                    {t('booking.selected', 'Đã chọn')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {threeWordAddress ? (
            <View style={styles.threeWordBadge}>
              <View style={styles.threeWordTextRow}>
                <Text style={styles.threeWordSymbol}>///</Text>
                <Text style={styles.threeWordText}>{threeWordAddress}</Text>
              </View>
              <View style={styles.threeWordActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.copy3Words', 'Sao chép địa chỉ 3 từ')}
                  onPress={handleCopyThreeWords}
                  style={styles.threeWordActionBtn}
                >
                  <Ionicons name="copy-outline" size={rs(20)} color={palette.primary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.share3Words', 'Chia sẻ địa chỉ 3 từ')}
                  onPress={handleShareThreeWords}
                  style={styles.threeWordActionBtn}
                >
                  <Ionicons name="share-social-outline" size={rs(20)} color={palette.primary} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.get3Words', 'Lấy 3 từ')}
              disabled={loadingThreeWords}
              onPress={handleFetchThreeWords}
              style={({ pressed }) => [
                styles.getThreeWordsBtn,
                pressed && styles.pressed,
                loadingThreeWords && styles.disabledButton,
              ]}
            >
              {loadingThreeWords ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="tag-text-outline" size={rs(20)} color={palette.primary} />
                  <Text style={styles.getThreeWordsText}>
                    {t('booking.getThreeWordsForTarget', { label: currentFocusPoint.label }, `Lấy 3 từ (${currentFocusPoint.label})`)}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {showGpsButton && onRequestCurrentLocation && mode !== 'tracking' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.getCurrentGps', 'Lấy vị trí GPS hiện tại')}
          disabled={activeStatus === 'locating'}
          onPress={onRequestCurrentLocation}
          style={({ pressed }) => [
            styles.gpsButton,
            pressed && styles.pressed,
            activeStatus === 'locating' && styles.disabledButton,
          ]}
        >
          {activeStatus === 'locating' ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Ionicons name="locate" size={rs(30)} color={palette.primary} />
          )}
        </Pressable>
      )}

      <View
        pointerEvents={hasBlockingOverlay ? 'auto' : 'box-none'}
        style={StyleSheet.absoluteFill}
      >
        <StatusOverlay
          error={error}
          status={activeStatus}
          onRetry={onRequestCurrentLocation}
        />
      </View>

      {!hideModeBadge && (
        <View style={styles.modeBadge} pointerEvents="none">
          <MaterialCommunityIcons
            name={mode === 'tracking' ? 'navigation-variant' : 'map-marker-radius'}
            size={rs(24)}
            color={palette.primary}
          />
          <Text style={styles.modeText}>{getModeLabel(mode, t)}</Text>
        </View>
      )}
    </View>
  );
}

function LocationMarker({
  point,
  tone,
  title,
  draggable = false,
  onDragStart,
  onDragEnd,
  onPress,
}: {
  point: LocationPoint;
  tone: 'pickup' | 'destination';
  title: string;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: (event: MarkerDragStartEndEvent) => void;
  onPress?: () => void;
}) {
  const color = tone === 'pickup' ? palette.primary : palette.danger;

  return (
    <Marker
      key={`${title}-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`}
      coordinate={toLatLng(point)}
      anchor={{ x: 0.5, y: 0.5 }}
      draggable={draggable}
      title={title}
      description={point.address}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPress={onPress}
    >
      <View style={[styles.pin, { borderColor: color }]}>
        <View style={[styles.pinDot, { backgroundColor: color }]} />
      </View>
    </Marker>
  );
}

function DriverMarker({
  coordinate,
  onPress,
}: {
  coordinate: Coordinates;
  onPress?: () => void;
}) {
  return (
    <Marker
      key={`driver-${coordinate.lat.toFixed(6)}-${coordinate.lng.toFixed(6)}`}
      coordinate={toLatLng(coordinate)}
      anchor={{ x: 0.5, y: 0.5 }}
      title="Tài xế"
      description="Vị trí tài xế gần nhất trên tuyến"
      zIndex={10}
      onPress={onPress}
    >
      <View style={styles.driverPin}>
        <View style={styles.driverPinHalo} />
        <View style={styles.driverCarBubble}>
          <MaterialCommunityIcons name="car-sports" size={rs(28)} color={palette.card} />
        </View>
      </View>
    </Marker>
  );
}

function StatusOverlay({
  status,
  error,
  onRetry,
}: {
  status: LocationPermissionState;
  error?: string | null;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  if (!error && status === 'ready') {
    return null;
  }

  const overlay = getOverlayContent(status, error, t);

  return (
    <View style={styles.overlayWrap} pointerEvents="box-none">
      <View style={styles.overlayCard}>
        {status === 'locating' && !error ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <Ionicons name={overlay.icon} size={rs(30)} color={overlay.color} />
        )}
        <View style={styles.overlayCopy}>
          <Text style={styles.overlayTitle}>{overlay.title}</Text>
          <Text style={styles.overlayText}>{overlay.message}</Text>
        </View>
        {onRetry && status !== 'locating' && (
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryText}>{t('common.tryAgain', 'Thử lại')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function getOverlayContent(status: LocationPermissionState, error: string | null | undefined, t: (key: string, fallback?: string) => string) {
  if (error) {
    return {
      icon: 'warning-outline' as const,
      color: palette.danger,
      title: t('booking.cannotLoadMap', 'Không tải được bản đồ'),
      message: error,
    };
  }

  if (status === 'gps-disabled') {
    return {
      icon: 'navigate-outline' as const,
      color: palette.danger,
      title: t('booking.gpsDisabledTitle', 'GPS đang tắt'),
      message: t('booking.gpsDisabledMsg', 'Bạn vẫn có thể chọn vị trí bằng cách chạm hoặc kéo marker trên bản đồ.'),
    };
  }

  if (status === 'locating') {
    return {
      icon: 'locate-outline' as const,
      color: palette.primary,
      title: t('booking.locatingTitle', 'Đang lấy vị trí'),
      message: t('booking.locatingMsg', 'GoRide đang xác định tọa độ hiện tại của bạn.'),
    };
  }

  return {
    icon: 'alert-circle-outline' as const,
    color: palette.danger,
    title: t('booking.errorTitle', 'Có lỗi xảy ra'),
    message: t('booking.cannotUpdateLocation', 'Không thể cập nhật vị trí. Vui lòng thử lại.'),
  };
}

function getModeLabel(mode: MapPickerMode, t: (key: string, fallback?: string) => string) {
  if (mode === 'tracking') {
    return t('booking.modeTracking', 'Theo dõi chuyến');
  }

  return mode === 'pickup' ? t('booking.modePickup', 'Chọn điểm đón') : t('booking.modeDestination', 'Chọn điểm đến');
}

function compactRawLatLng(points: [number | null | undefined, number | null | undefined][]) {
  const seen = new Set<string>();
  const coordinates: LatLng[] = [];

  for (const [lat, lng] of points) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const key = `${lat?.toFixed(6)},${lng?.toFixed(6)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    coordinates.push({
      latitude: lat as number,
      longitude: lng as number,
    });
  }

  return coordinates;
}

function toLatLng(point: Coordinates): LatLng {
  return {
    latitude: point.lat,
    longitude: point.lng,
  };
}

function createRegion(point: Coordinates): Region {
  return {
    ...toLatLng(point),
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };
}

function isSameCoordinate(a: Coordinates, b: Coordinates) {
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: rs(36),
    backgroundColor: palette.mapWater,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rvs(120),
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gpsButton: {
    position: 'absolute',
    top: rvs(24),
    right: rs(24),
    width: rs(60),
    height: rs(60),
    borderRadius: rs(30),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: '#7c6da8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  modeBadge: {
    position: 'absolute',
    left: rs(24),
    top: rvs(24),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(18),
    height: rvs(48),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  modeText: {
    color: palette.text,
    fontSize: rf(20),
    fontWeight: '800',
  },
  pin: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderWidth: rs(5),
    shadowColor: '#2c1c61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  pinDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
  },
  driverPin: {
    width: rs(64),
    height: rs(64),
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPinHalo: {
    position: 'absolute',
    width: rs(62),
    height: rs(62),
    borderRadius: rs(31),
    backgroundColor: 'rgba(0, 182, 122, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 182, 122, 0.32)',
  },
  driverCarBubble: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.green,
    borderWidth: rs(3),
    borderColor: palette.card,
    shadowColor: '#005f44',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayWrap: {
    position: 'absolute',
    left: rs(18),
    right: rs(18),
    bottom: rvs(18),
    alignItems: 'center',
  },
  overlayCard: {
    width: '100%',
    minHeight: rvs(82),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rvs(16),
    paddingHorizontal: rs(18),
    borderRadius: rs(26),
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: '#7c6da8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  overlayCopy: {
    flex: 1,
    gap: rvs(4),
  },
  overlayTitle: {
    color: palette.text,
    fontSize: rf(20),
    fontWeight: '800',
  },
  overlayText: {
    color: palette.muted,
    fontSize: rf(18),
    lineHeight: rf(25),
  },
  retryButton: {
    paddingHorizontal: rs(16),
    height: rvs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  retryText: {
    color: palette.primary,
    fontSize: rf(17),
    fontWeight: '800',
  },
  threeWordContainer: {
    position: 'absolute',
    right: rs(24),
    top: rvs(24),
    zIndex: 10,
  },
  getThreeWordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(16),
    height: rvs(46),
    borderRadius: rs(23),
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.primary,
    shadowColor: '#1d0796',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  getThreeWordsText: {
    color: palette.primary,
    fontSize: rf(18),
    fontWeight: '800',
  },
  threeWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingHorizontal: rs(14),
    height: rvs(46),
    borderRadius: rs(23),
    backgroundColor: palette.primary,
    shadowColor: '#1d0796',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  threeWordTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  threeWordSymbol: {
    color: '#ff4b4b',
    fontSize: rf(18),
    fontWeight: '900',
  },
  threeWordText: {
    color: '#ffffff',
    fontSize: rf(18),
    fontWeight: '700',
  },
  threeWordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginLeft: rs(4),
  },
  threeWordActionBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rvs(6),
    justifyContent: 'flex-end',
  },
  targetPill: {
    paddingHorizontal: rs(10),
    paddingVertical: rvs(4),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  targetPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  targetPillText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: palette.muted,
  },
  targetPillTextActive: {
    color: '#ffffff',
  },
  customFocusPin: {
    alignItems: 'center',
    justifyContent: 'center',
    width: rs(44),
    height: rs(44),
  },
  customFocusPinHalo: {
    position: 'absolute',
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: 'rgba(29, 7, 150, 0.18)',
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  customFocusPinBubble: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  customFocusPinSymbol: {
    color: '#ff4b4b',
    fontSize: rf(14),
    fontWeight: '900',
  },
});
