import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { getDefaultLocationPoint } from '@/lib/location-service';
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
  height = rvs(440),
  style,
  provider,
  allowSelection,
  showGpsButton = true,
  showUserLocation = true,
  onLocationChange,
  onRequestCurrentLocation,
  onInteractionStart,
  onInteractionEnd,
}: MapPickerProps) {
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
  const selectedRegion = useMemo(
    () => createRegion({ lat: selectedPoint.lat, lng: selectedPoint.lng }),
    [selectedPoint.lat, selectedPoint.lng],
  );

  const routeCoordinates = useMemo(
    () => compactRawLatLng([[originLat, originLng], [destinationLat, destinationLng]]),
    [destinationLat, destinationLng, originLat, originLng],
  );
  const showOriginMarker = Boolean(origin && (!hasSelectionMarker || !isSameCoordinate(origin, selectedPoint)));
  const showDestinationMarker = Boolean(destination && (!hasSelectionMarker || !isSameCoordinate(destination, selectedPoint)));

  const visibleCoordinates = useMemo(
    () =>
      compactRawLatLng([
        [valueLat, valueLng],
        [originLat, originLng],
        [destinationLat, destinationLng],
        [driverLat, driverLng],
      ]),
    [destinationLat, destinationLng, driverLat, driverLng, originLat, originLng, valueLat, valueLng],
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
      address: 'Vị trí đã chọn',
      label: mode === 'pickup' ? 'Điểm đón đã chọn' : 'Điểm đến đã chọn',
    });
  };

  const handleMapPress = (event: MapPressEvent) => {
    handleCoordinateSelect(event.nativeEvent.coordinate);
  };

  const handleMarkerDragEnd = (event: MarkerDragStartEndEvent) => {
    handleCoordinateSelect(event.nativeEvent.coordinate);
    onInteractionEnd?.();
  };

  return (
    <View style={[styles.container, { height }, style]}>
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
        {routeCoordinates.length === 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={palette.primary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {showOriginMarker && origin && <LocationMarker point={origin} tone="pickup" title="Điểm đón" />}
        {showDestinationMarker && destination && (
          <LocationMarker point={destination} tone="destination" title="Điểm đến" />
        )}

        {hasSelectionMarker && (
          <LocationMarker
            point={selectedPoint}
            draggable
            tone={mode === 'pickup' ? 'pickup' : 'destination'}
            title={mode === 'pickup' ? 'Điểm đón' : 'Điểm đến'}
            onDragStart={onInteractionStart}
            onDragEnd={handleMarkerDragEnd}
          />
        )}

        {driverLocation && <DriverMarker coordinate={driverLocation} />}
      </MapView>

      <View style={styles.topScrim} pointerEvents="none" />

      {showGpsButton && onRequestCurrentLocation && mode !== 'tracking' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lấy vị trí GPS hiện tại"
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

      <View style={styles.modeBadge} pointerEvents="none">
        <MaterialCommunityIcons
          name={mode === 'tracking' ? 'navigation-variant' : 'map-marker-radius'}
          size={rs(24)}
          color={palette.primary}
        />
        <Text style={styles.modeText}>{getModeLabel(mode)}</Text>
      </View>
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
}: {
  point: LocationPoint;
  tone: 'pickup' | 'destination';
  title: string;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: (event: MarkerDragStartEndEvent) => void;
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
    >
      <View style={[styles.pin, { borderColor: color }]}>
        <View style={[styles.pinDot, { backgroundColor: color }]} />
      </View>
    </Marker>
  );
}

function DriverMarker({ coordinate }: { coordinate: Coordinates }) {
  return (
    <Marker
      key={`driver-${coordinate.lat.toFixed(6)}-${coordinate.lng.toFixed(6)}`}
      coordinate={toLatLng(coordinate)}
      anchor={{ x: 0.5, y: 0.5 }}
      title="Tài xế"
      description="Vị trí tài xế gần nhất trên tuyến"
      zIndex={10}
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
  if (!error && status === 'ready') {
    return null;
  }

  const overlay = getOverlayContent(status, error);

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
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function getOverlayContent(status: LocationPermissionState, error?: string | null) {
  if (error) {
    return {
      icon: 'warning-outline' as const,
      color: palette.danger,
      title: 'Không tải được bản đồ',
      message: error,
    };
  }

  if (status === 'permission-needed') {
    return {
      icon: 'shield-outline' as const,
      color: palette.primary,
      title: 'Cần quyền vị trí',
      message: 'Bật quyền vị trí để dùng GPS, hoặc chạm bản đồ để chọn thủ công.',
    };
  }

  if (status === 'gps-disabled') {
    return {
      icon: 'navigate-outline' as const,
      color: palette.danger,
      title: 'GPS đang tắt',
      message: 'Bạn vẫn có thể chọn vị trí bằng cách chạm hoặc kéo marker trên bản đồ.',
    };
  }

  if (status === 'locating') {
    return {
      icon: 'locate-outline' as const,
      color: palette.primary,
      title: 'Đang lấy vị trí',
      message: 'GoRide đang xác định tọa độ hiện tại của bạn.',
    };
  }

  return {
    icon: 'alert-circle-outline' as const,
    color: palette.danger,
    title: 'Có lỗi xảy ra',
    message: 'Không thể cập nhật vị trí. Vui lòng thử lại.',
  };
}

function getModeLabel(mode: MapPickerMode) {
  if (mode === 'tracking') {
    return 'Theo dõi chuyến';
  }

  return mode === 'pickup' ? 'Chọn điểm đón' : 'Chọn điểm đến';
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
});
