import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';
import type { VehicleType } from '@/types/ride';

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
  amber: '#f59e0b',
  amberSoft: '#fff7df',
};

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type LegacyVehicleId = 'bike' | 'car' | 'car_premium';

export type VehicleOption = {
  vehicleType: VehicleType;
  title: string;
  description: string;
  icon: MaterialIconName;
  capacity: number;
  etaMinutes?: number | null;
  estimatedFare?: number | null;
  priceLabel?: string;
  badgeLabel?: string;
  metaLabel?: string;
};

export type VehicleOptionCardProps = {
  option: VehicleOption;
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: (vehicleType: VehicleType) => void;
};

export const DEFAULT_VEHICLE_OPTIONS: VehicleOption[] = [
  {
    vehicleType: 'MOTORBIKE',
    title: 'GoRide Bike',
    description: 'Nhanh chóng & tiết kiệm',
    icon: 'motorbike',
    capacity: 1,
    etaMinutes: 3,
    priceLabel: 'Từ 15.000đ',
    badgeLabel: 'Phổ biến',
  },
  {
    vehicleType: 'CAR_4_SEAT',
    title: 'GoRide Car',
    description: 'Thoải mái cho nhóm nhỏ',
    icon: 'car',
    capacity: 4,
    etaMinutes: 5,
    priceLabel: 'Từ 45.000đ',
  },
  {
    vehicleType: 'CAR_7_SEAT',
    title: 'GoRide Premium',
    description: 'Rộng rãi cho gia đình',
    icon: 'car-back',
    capacity: 7,
    etaMinutes: 6,
    priceLabel: 'Từ 65.000đ',
    badgeLabel: '7 chỗ',
  },
];

export function VehicleOptionCard({
  option,
  selected = false,
  loading = false,
  disabled = false,
  compact = false,
  style,
  onPress,
}: VehicleOptionCardProps) {
  const { t } = useLanguage();

  const title = option.vehicleType === 'MOTORBIKE' ? t('booking.gorideBike', 'GoRide Bike') :
                option.vehicleType === 'CAR_4_SEAT' ? t('booking.gorideCar', 'GoRide Car') :
                option.vehicleType === 'CAR_7_SEAT' ? t('booking.goridePremium', 'GoRide Premium') : option.title;

  const description = option.vehicleType === 'MOTORBIKE' ? t('booking.gorideBikeDesc', 'Nhanh chóng & tiết kiệm') :
                      option.vehicleType === 'CAR_4_SEAT' ? t('booking.gorideCarDesc', 'Thoải mái cho nhóm nhỏ') :
                      option.vehicleType === 'CAR_7_SEAT' ? t('booking.goridePremiumDesc', 'Rộng rãi cho gia đình') : option.description;

  const priceLabel = option.priceLabel === 'Từ 15.000đ' ? t('booking.from15k', 'Từ 15.000đ') :
                     option.priceLabel === 'Từ 45.000đ' ? t('booking.from45k', 'Từ 45.000đ') :
                     option.priceLabel === 'Từ 65.000đ' ? t('booking.from65k', 'Từ 65.000đ') : option.priceLabel;

  const badgeLabel = option.badgeLabel === 'Phổ biến' ? t('booking.popular', 'Phổ biến') :
                     option.badgeLabel === '7 chỗ' ? t('booking.sevenSeats', '7 chỗ') : option.badgeLabel;

  const metaLabel = option.metaLabel === 'Đang chọn' ? t('booking.selecting', 'Đang chọn') : option.metaLabel;

  const price = option.estimatedFare ? formatFare(option.estimatedFare) : priceLabel ?? t('booking.dashFare', '-- đ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`Chọn ${title}`}
      disabled={disabled || loading}
      onPress={() => onPress?.(option.vehicleType)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        compact && styles.cardCompact,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <MaterialCommunityIcons
          name={option.icon}
          size={rs(compact ? 38 : 46)}
          color={selected ? palette.card : palette.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badgeLabel && (
            <View style={[styles.badge, selected && styles.badgeSelected]}>
              <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{badgeLabel}</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>

        <View style={styles.metaRow}>
          <MetaPill icon="time-outline" label={formatEta(option.etaMinutes, t)} />
          <MetaPill icon="person-outline" label={t('booking.capacityGuests', '{capacity} khách', { capacity: option.capacity })} />
          {metaLabel && <MetaPill icon="sparkles-outline" label={metaLabel} />}
        </View>
      </View>

      <View style={styles.priceColumn}>
        {loading ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <>
            <Text style={styles.priceText}>{price}</Text>
            <Text style={styles.priceSubtext}>{t('booking.estimateLabel', 'Ước tính')}</Text>
          </>
        )}
        {selected && <Ionicons name="checkmark-circle" size={rs(32)} color={palette.primary} />}
      </View>
    </Pressable>
  );
}

export function vehicleTypeFromLegacyId(id: LegacyVehicleId): VehicleType {
  if (id === 'bike') {
    return 'MOTORBIKE';
  }

  if (id === 'car') {
    return 'CAR_4_SEAT';
  }

  return 'CAR_7_SEAT';
}

export function legacyIdFromVehicleType(vehicleType: VehicleType): LegacyVehicleId {
  if (vehicleType === 'MOTORBIKE') {
    return 'bike';
  }

  if (vehicleType === 'CAR_4_SEAT') {
    return 'car';
  }

  return 'car_premium';
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={rs(18)} color={palette.muted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function formatEta(etaMinutes: number | null | undefined, t: any) {
  if (!etaMinutes || etaMinutes <= 0) {
    return t('booking.dashMinutes', '-- phút');
  }

  return t('booking.etaMinutes', '{minutes} phút', { minutes: Math.round(etaMinutes) });
}

function formatFare(fare: number) {
  return `${Math.round(fare).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

const shadow = {
  shadowColor: '#2C1B85',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 6,
};

const shadowSelected = {
  shadowColor: '#3F22D6',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.16,
  shadowRadius: 24,
  elevation: 9,
};

const styles = StyleSheet.create({
  card: {
    minHeight: rvs(118),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    padding: rs(20),
    borderRadius: rs(30),
    borderWidth: 2,
    borderColor: '#F0ECFF',
    backgroundColor: palette.card,
    ...shadow,
  },
  cardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#F8F6FF',
    ...shadowSelected,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardCompact: {
    minHeight: rvs(100),
    padding: rs(16),
    borderRadius: rs(26),
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  iconBox: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  iconBoxSelected: {
    backgroundColor: palette.primary,
  },
  content: {
    flex: 1,
    gap: rvs(7),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  title: {
    flexShrink: 1,
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '900',
  },
  badge: {
    paddingHorizontal: rs(10),
    paddingVertical: rvs(4),
    borderRadius: rs(999),
    backgroundColor: palette.amberSoft,
  },
  badgeSelected: {
    backgroundColor: palette.primarySoft,
  },
  badgeText: {
    color: palette.amber,
    fontSize: rf(13),
    fontWeight: '900',
  },
  badgeTextSelected: {
    color: palette.primary,
  },
  description: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(9),
    paddingVertical: rvs(5),
    borderRadius: rs(999),
    backgroundColor: '#F4F0FE',
  },
  metaText: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '800',
  },
  priceColumn: {
    minWidth: rs(100),
    alignItems: 'flex-end',
    gap: rvs(4),
  },
  priceText: {
    color: palette.primary,
    fontSize: rf(22),
    fontWeight: '900',
    textAlign: 'right',
  },
  priceSubtext: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '700',
  },
});
