import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';
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
  const { t } = useLanguage();
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
          <Text style={styles.eyebrow}>{t('booking.driverInfo', 'Thông tin tài xế')}</Text>
          <Text style={styles.placeholderTitle}>{getPlaceholderTitle(status, loading, t)}</Text>
          <Text style={styles.placeholderText}>{getPlaceholderDescription(status, error, t)}</Text>
        </View>
      </View>
    );
  }

  const rating = formatRating(driver?.averageRating, t);
  const vehicleLabel = formatVehicle(driver?.vehicleType, t);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(driver?.fullName)}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>{t('booking.driverAccepted', 'Tài xế đã nhận chuyến')}</Text>
          <Text style={styles.driverName} selectable>
            {driver?.fullName ?? t('booking.gorideDriver', 'Tài xế GoRide')}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={rs(18)} color={palette.amber} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getStatusLabel(status, t)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DriverMeta icon="car-info" label={t('booking.vehicle', 'Phương tiện')} value={vehicleLabel} />
        <DriverMeta icon="card-text-outline" label={t('booking.licensePlate', 'Biển số')} value={driver?.vehiclePlate ?? t('booking.updating', 'Đang cập nhật')} selectable />
        <DriverMeta icon="phone-outline" label={t('booking.contact', 'Liên hệ')} value={driver?.phone ?? t('booking.viaApp', 'Qua app GoRide')} selectable />
        <DriverMeta icon="clock-check-outline" label={t('booking.sync', 'Đồng bộ')} value={formatUpdatedAt(lastUpdatedAt, t)} />
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

function getPlaceholderTitle(status: TripStatus, loading: boolean, t: any) {
  if (loading) {
    return t('booking.syncingTripDetails', 'Đang đồng bộ chi tiết chuyến');
  }

  if (status === 'NO_DRIVER') {
    return t('booking.noSuitableDriver', 'Chưa có tài xế phù hợp');
  }

  if (status === 'CANCELLED') {
    return t('booking.tripCancelled', 'Chuyến đã hủy');
  }

  return t('booking.waitingForDriverToAccept', 'Đang chờ tài xế nhận chuyến');
}

function getPlaceholderDescription(status: TripStatus, error: string | null | undefined, t: any) {
  if (error) {
    return error;
  }

  if (status === 'NO_DRIVER') {
    return t('booking.noDriverFoundDesc', 'GoRide chưa tìm được tài xế quanh bạn. Bạn có thể chờ thêm hoặc đặt lại sau.');
  }

  if (status === 'CANCELLED') {
    return t('booking.cancelledDescDriverInfo', 'Thông tin tài xế sẽ không còn khả dụng cho chuyến đã hủy.');
  }

  return t('booking.driverInfoWillShowHere', 'Tên tài xế, biển số và liên hệ sẽ hiện ở đây ngay khi chuyến được nhận.');
}

function getInitials(name?: string) {
  if (!name) {
    return 'GR';
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(-2).map((word) => word[0]).join('');

  return initials.toUpperCase() || 'GR';
}

function formatVehicle(vehicleType: VehicleType | undefined, t: any) {
  if (vehicleType === 'MOTORBIKE') {
    return 'GoRide Bike';
  }

  if (vehicleType === 'CAR_7_SEAT') {
    return 'GoRide Premium';
  }

  if (vehicleType === 'CAR_4_SEAT') {
    return 'GoRide Car';
  }

  return t('booking.updating', 'Đang cập nhật');
}

function formatRating(rating: number | undefined, t: any) {
  if (!rating || rating <= 0) {
    return t('booking.new', 'Mới');
  }

  return rating.toFixed(1);
}

function getStatusLabel(status: TripStatus, t: any) {
  if (status === 'ARRIVED') {
    return t('booking.arrivedAtPickup', 'Đã đến điểm đón');
  }

  if (status === 'IN_PROGRESS') {
    return t('booking.carryingPassenger', 'Đang chở khách');
  }

  if (status === 'COMPLETED') {
    return t('booking.completed', 'Hoàn thành');
  }

  return t('booking.arriving', 'Đang đến');
}

function formatUpdatedAt(value: string | null | undefined, t: any) {
  if (!value) {
    return t('booking.justNow', 'Vừa xong');
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
    borderRadius: rs(32),
    padding: rs(24),
    gap: rvs(18),
    borderWidth: 1,
    borderColor: '#E8E5FA',
    ...shadow,
  },
  placeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
  },
  avatar: {
    width: rs(86),
    height: rs(86),
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
    fontSize: rf(30),
    fontWeight: '900',
  },
  content: {
    flex: 1,
    gap: rvs(5),
  },
  eyebrow: {
    color: palette.primaryMid,
    fontSize: rf(14),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  driverName: {
    color: palette.text,
    fontSize: rf(28),
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
    fontWeight: '600',
    lineHeight: rf(22),
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(12),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
    backgroundColor: palette.amberSoft,
  },
  ratingText: {
    color: palette.amber,
    fontSize: rf(15),
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: rs(12),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
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
    minHeight: rvs(78),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(10),
    borderRadius: rs(20),
    backgroundColor: '#F7F5FC',
  },
  metaCopy: {
    flex: 1,
    gap: rvs(2),
  },
  metaLabel: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '700',
  },
  metaValue: {
    color: palette.text,
    fontSize: rf(16),
    fontWeight: '900',
  },
});
