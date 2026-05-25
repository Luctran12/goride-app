import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import type { DriverSummary, TripStatus, VehicleType } from '@/types/ride';

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

export type DriverInfoCardProps = {
  driver?: DriverSummary | null;
  status: TripStatus;
  loading?: boolean;
  error?: string | null;
  lastUpdatedAt?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function DriverInfoCard({
  driver = null,
  status,
  loading = false,
  error = null,
  lastUpdatedAt = null,
  style,
}: DriverInfoCardProps) {
  const isSearching = status === 'SEARCHING';
  const isUnavailable = status === 'NO_DRIVER' || status === 'CANCELLED';
  const canShowDriver = Boolean(driver && !isSearching && !isUnavailable);

  if (!canShowDriver) {
    return (
      <View style={[styles.card, styles.placeholderCard, style]}>
        <View style={[styles.avatar, isUnavailable && styles.avatarDanger]}>
          {loading ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <MaterialCommunityIcons
              name={isUnavailable ? 'account-cancel-outline' : 'account-clock-outline'}
              size={rs(42)}
              color={isUnavailable ? palette.danger : palette.primary}
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>Thông tin tài xế</Text>
          <Text style={styles.placeholderTitle}>{getPlaceholderTitle(status, loading)}</Text>
          <Text style={styles.placeholderText}>{getPlaceholderDescription(status, error)}</Text>
        </View>
      </View>
    );
  }

  const rating = formatRating(driver?.averageRating);
  const vehicleLabel = formatVehicle(driver?.vehicleType);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(driver?.fullName)}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>Tài xế đã nhận chuyến</Text>
          <Text style={styles.driverName} selectable>
            {driver?.fullName ?? 'Tài xế GoRide'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={rs(18)} color={palette.amber} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getStatusLabel(status)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DriverMeta icon="car-info" label="Phương tiện" value={vehicleLabel} />
        <DriverMeta icon="card-text-outline" label="Biển số" value={driver?.vehiclePlate ?? 'Đang cập nhật'} selectable />
        <DriverMeta icon="phone-outline" label="Liên hệ" value={driver?.phone ?? 'Qua app GoRide'} selectable />
        <DriverMeta icon="clock-check-outline" label="Đồng bộ" value={formatUpdatedAt(lastUpdatedAt)} />
      </View>
    </View>
  );
}

function DriverMeta({
  icon,
  label,
  value,
  selectable = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  selectable?: boolean;
}) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={rs(22)} color={palette.primary} />
      <View style={styles.metaCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1} selectable={selectable}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function getPlaceholderTitle(status: TripStatus, loading: boolean) {
  if (loading) {
    return 'Đang đồng bộ chi tiết chuyến';
  }

  if (status === 'NO_DRIVER') {
    return 'Chưa có tài xế phù hợp';
  }

  if (status === 'CANCELLED') {
    return 'Chuyến đã hủy';
  }

  return 'Đang chờ tài xế nhận chuyến';
}

function getPlaceholderDescription(status: TripStatus, error?: string | null) {
  if (error) {
    return error;
  }

  if (status === 'NO_DRIVER') {
    return 'GoRide chưa tìm được tài xế quanh bạn. Bạn có thể chờ thêm hoặc đặt lại sau.';
  }

  if (status === 'CANCELLED') {
    return 'Thông tin tài xế sẽ không còn khả dụng cho chuyến đã hủy.';
  }

  return 'Tên tài xế, biển số và liên hệ sẽ hiện ở đây ngay khi chuyến được nhận.';
}

function getInitials(name?: string) {
  if (!name) {
    return 'GR';
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(-2).map((word) => word[0]).join('');

  return initials.toUpperCase() || 'GR';
}

function formatVehicle(vehicleType?: VehicleType) {
  if (vehicleType === 'MOTORBIKE') {
    return 'GoRide Bike';
  }

  if (vehicleType === 'CAR_7_SEAT') {
    return 'GoRide Premium';
  }

  if (vehicleType === 'CAR_4_SEAT') {
    return 'GoRide Car';
  }

  return 'Đang cập nhật';
}

function formatRating(rating?: number) {
  if (!rating || rating <= 0) {
    return 'Mới';
  }

  return rating.toFixed(1);
}

function getStatusLabel(status: TripStatus) {
  if (status === 'ARRIVED') {
    return 'Đã đến điểm đón';
  }

  if (status === 'IN_PROGRESS') {
    return 'Đang chở khách';
  }

  if (status === 'COMPLETED') {
    return 'Hoàn thành';
  }

  return 'Đang đến';
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return 'Vừa xong';
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
  placeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  avatar: {
    width: rs(82),
    height: rs(82),
    borderRadius: rs(28),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDanger: {
    backgroundColor: palette.dangerSoft,
  },
  avatarText: {
    color: palette.primary,
    fontSize: rf(29),
    fontWeight: '900',
  },
  content: {
    flex: 1,
    gap: rvs(5),
  },
  eyebrow: {
    color: palette.primaryMid,
    fontSize: rf(15),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  driverName: {
    color: palette.text,
    fontSize: rf(27),
    fontWeight: '900',
  },
  placeholderTitle: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '900',
  },
  placeholderText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '700',
    lineHeight: rf(23),
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(10),
    paddingVertical: rvs(6),
    borderRadius: rs(14),
    backgroundColor: palette.amberSoft,
  },
  ratingText: {
    color: palette.amber,
    fontSize: rf(15),
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: rs(10),
    paddingVertical: rvs(6),
    borderRadius: rs(14),
    backgroundColor: palette.greenSoft,
  },
  statusBadgeText: {
    color: palette.green,
    fontSize: rf(15),
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  metaItem: {
    width: '48%',
    minHeight: rvs(76),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    padding: rs(12),
    borderRadius: rs(20),
    backgroundColor: '#f8f6fb',
  },
  metaCopy: {
    flex: 1,
    gap: rvs(2),
  },
  metaLabel: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '800',
  },
  metaValue: {
    color: palette.text,
    fontSize: rf(16),
    fontWeight: '900',
  },
});
