import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import type { DriverLocationUpdate, TripStatus } from '@/types/ride';

const palette = {
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

export type TripEtaCardProps = {
  status: TripStatus;
  estimatedDistance?: number | null;
  estimatedDuration?: number | null;
  driverLocation?: DriverLocationUpdate | null;
  lastUpdatedAt?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function TripEtaCard({
  status,
  estimatedDistance = null,
  estimatedDuration = null,
  driverLocation = null,
  lastUpdatedAt = null,
  style,
}: TripEtaCardProps) {
  const copy = getEtaCopy(status, estimatedDuration, driverLocation);

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.heroIcon, { backgroundColor: copy.background }]}>
        <MaterialCommunityIcons name={copy.icon} size={rs(34)} color={copy.color} />
      </View>

      <View style={styles.mainCopy}>
        <Text style={styles.label}>{copy.label}</Text>
        <Text style={[styles.value, { color: copy.color }]}>{copy.value}</Text>
        <Text style={styles.description}>{copy.description}</Text>
      </View>

      <View style={styles.metricsRow}>
        <EtaMetric icon="map-marker-distance" label="Quãng đường" value={formatDistance(estimatedDistance)} />
        <EtaMetric icon="clock-outline" label="Cập nhật" value={formatLastUpdated(lastUpdatedAt)} />
      </View>
    </View>
  );
}

function EtaMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon} size={rs(21)} color={palette.primary} />
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function getEtaCopy(status: TripStatus, estimatedDuration?: number | null, driverLocation?: DriverLocationUpdate | null) {
  if (status === 'SEARCHING') {
    return {
      label: 'Đang ghép chuyến',
      value: '1-2 phút',
      description: 'GoRide đang tìm tài xế phù hợp quanh điểm đón của bạn.',
      icon: 'radar' as const,
      color: palette.primary,
      background: palette.primarySoft,
    };
  }

  if (status === 'ACCEPTED') {
    return {
      label: 'Tài xế tới điểm đón',
      value: formatMinutes(getPickupEta(estimatedDuration, Boolean(driverLocation))),
      description: driverLocation
        ? 'Tài xế đang di chuyển tới điểm đón. Theo dõi xe trên bản đồ để chuẩn bị lên xe.'
        : 'Đã có tài xế nhận chuyến. Vị trí tài xế sẽ được đồng bộ trong giây lát.',
      icon: 'car-clock' as const,
      color: palette.green,
      background: palette.greenSoft,
    };
  }

  if (status === 'ARRIVED') {
    return {
      label: 'Tài xế đã đến',
      value: 'Đang chờ bạn',
      description: 'Kiểm tra biển số, chào tài xế và bắt đầu chuyến đi khi bạn sẵn sàng.',
      icon: 'map-marker-check-outline' as const,
      color: palette.green,
      background: palette.greenSoft,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: 'Tới điểm đến',
      value: formatMinutes(estimatedDuration),
      description: 'Chuyến đi đang diễn ra. ETA là ước tính dựa trên tuyến đường đã chọn.',
      icon: 'navigation-variant' as const,
      color: palette.primary,
      background: palette.primarySoft,
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: 'Đã hoàn thành',
      value: 'Cảm ơn bạn',
      description: 'Chuyến đi đã kết thúc. Hóa đơn và đánh giá sẽ được xử lý ở bước tiếp theo.',
      icon: 'check-decagram-outline' as const,
      color: palette.green,
      background: palette.greenSoft,
    };
  }

  if (status === 'NO_DRIVER') {
    return {
      label: 'Chưa có tài xế',
      value: 'Thử lại sau',
      description: 'Hiện chưa có tài xế phù hợp quanh bạn. Bạn có thể hủy và đặt lại chuyến.',
      icon: 'account-search-outline' as const,
      color: palette.amber,
      background: palette.amberSoft,
    };
  }

  return {
    label: 'Chuyến đã hủy',
    value: 'Đã dừng',
    description: 'Yêu cầu đặt xe đã hủy. Bạn có thể quay lại trang chủ để tạo chuyến mới.',
    icon: 'close-circle-outline' as const,
    color: palette.danger,
    background: palette.dangerSoft,
  };
}

function getPickupEta(estimatedDuration?: number | null, hasDriverLocation?: boolean) {
  if (!estimatedDuration || estimatedDuration <= 0) {
    return hasDriverLocation ? 3 : 5;
  }

  return Math.max(2, Math.min(8, Math.round(estimatedDuration * 0.35)));
}

function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) {
    return '-- phút';
  }

  if (minutes < 60) {
    return Math.round(minutes) + ' phút';
  }

  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? hours + ' giờ ' + rest + ' phút' : hours + ' giờ';
}

function formatDistance(distance?: number | null) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatLastUpdated(value?: string | null) {
  if (!value) {
    return 'Realtime';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: rs(36),
    padding: rs(22),
    gap: rvs(18),
    ...shadow,
  },
  heroIcon: {
    width: rs(62),
    height: rs(62),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCopy: {
    gap: rvs(5),
  },
  label: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: rf(36),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  description: {
    color: palette.text,
    fontSize: rf(18),
    fontWeight: '700',
    lineHeight: rf(25),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  metric: {
    flex: 1,
    minHeight: rvs(68),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    padding: rs(12),
    borderRadius: rs(20),
    backgroundColor: '#f8f6fb',
  },
  metricCopy: {
    flex: 1,
    gap: rvs(2),
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.text,
    fontSize: rf(16),
    fontWeight: '900',
  },
});
