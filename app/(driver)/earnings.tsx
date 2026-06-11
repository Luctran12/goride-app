import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { rf, rs, rvs } from '@/constants/responsive';

const palette = {
  background: '#eaf7ef',
  card: '#ffffff',
  ink: '#08110d',
  muted: '#637069',
  line: '#dfe7e2',
  green: '#00b875',
  greenDark: '#053f2a',
  greenSoft: '#d9f7ea',
  mint: '#6df0a7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#edf4ff',
  amber: '#f59e0b',
  amberSoft: '#fff3d8',
  danger: '#f02d3a',
  dangerSoft: '#ffe9ea',
};

const earningsSummary = {
  totalToday: 386000,
  completedTrips: 8,
  onlineHours: 6,
  acceptanceRate: 86,
  collectedCash: 150000,
  bonus: 50000,
  platformFee: -45000,
};

const recentTrips: RecentTrip[] = [
  {
    id: 'ride-1430',
    service: 'GoRide',
    time: '14:30',
    distanceKm: 5.2,
    fare: 45000,
    icon: 'motorbike',
    tone: 'ride',
  },
  {
    id: 'send-1315',
    service: 'GoSend',
    time: '13:15',
    distanceKm: 2.1,
    fare: 25000,
    icon: 'truck-delivery-outline',
    tone: 'send',
  },
  {
    id: 'ride-1105',
    service: 'GoRide',
    time: '11:05',
    distanceKm: 8.4,
    fare: 72000,
    icon: 'motorbike',
    tone: 'ride',
  },
];

type RecentTrip = {
  id: string;
  service: string;
  time: string;
  distanceKm: number;
  fare: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: 'ride' | 'send';
};

export default function DriverEarningsScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { minHeight: height }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(driver)')}
            style={({ pressed }) => [styles.driverIdentity, pressed ? styles.pressedButton : null]}
          >
            <View style={styles.avatarFrame}>
              <Image source={require('../../assets/images/icon.png')} style={styles.avatar} contentFit="cover" />
            </View>
            <Text style={styles.brandText}>GoRide Driver</Text>
          </Pressable>

          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed ? styles.pressedButton : null]}>
            <MaterialCommunityIcons name="cog-outline" size={rs(34)} color={palette.blueInk} />
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Thu nhập</Text>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.periodPill, pressed ? styles.pressedButton : null]}>
            <Text style={styles.periodText}>Hôm nay</Text>
            <MaterialCommunityIcons name="chevron-down" size={rs(18)} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng thu nhập hôm nay</Text>
          <Text selectable style={styles.totalValue}>
            {formatCurrency(earningsSummary.totalToday)}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard icon="check-circle-outline" label="Hoàn thành" value={`${earningsSummary.completedTrips} chuyến`} />
          <MetricCard icon="timer-outline" label="Thời gian" value={`${earningsSummary.onlineHours} giờ online`} />
        </View>

        <View style={styles.acceptanceCard}>
          <View style={styles.acceptanceTopRow}>
            <View style={styles.acceptanceLabelRow}>
              <MaterialCommunityIcons name="percent-outline" size={rs(22)} color={palette.muted} />
              <Text style={styles.acceptanceLabel}>Tỷ lệ nhận</Text>
            </View>
            <Text selectable style={styles.acceptanceValue}>
              {earningsSummary.acceptanceRate}%
            </Text>
          </View>
          <ProgressBar value={earningsSummary.acceptanceRate} />
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Chi tiết thu nhập</Text>
          </View>
          <EarningsRow label="Tiền mặt đã thu" value={earningsSummary.collectedCash} />
          <EarningsRow label="Thưởng" value={earningsSummary.bonus} positive />
          <EarningsRow label="Phí nền tảng" value={earningsSummary.platformFee} negative />
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Chuyến đi gần đây</Text>
        </View>

        <View style={styles.tripList}>
          {recentTrips.map((trip) => (
            <RecentTripCard key={trip.id} trip={trip} />
          ))}
        </View>

        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.viewAllButton, pressed ? styles.pressedButton : null]}>
          <Text style={styles.viewAllText}>XEM TẤT CẢ CHUYẾN ĐI</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant-outline" label="Home" onPress={() => router.push('/(driver)')} />
        <DriverNavItem icon="cash-multiple" label="Earnings" active />
        <DriverNavItem icon="history" label="Activity" />
        <DriverNavItem icon="account-outline" label="Account" />
      </View>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricLabelRow}>
        <View style={styles.metricIconCircle}>
          <MaterialCommunityIcons name={icon} size={rs(20)} color={palette.muted} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text selectable style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const boundedValue = Math.max(0, Math.min(value, 100));
  const fillWidth = `${boundedValue}%` as `${number}%`;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: fillWidth }]} />
    </View>
  );
}

function EarningsRow({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        selectable
        style={[
          styles.detailValue,
          positive ? styles.detailValuePositive : null,
          negative ? styles.detailValueNegative : null,
        ]}
      >
        {formatSignedCurrency(value)}
      </Text>
    </View>
  );
}

function RecentTripCard({ trip }: { trip: RecentTrip }) {
  const toneStyle = trip.tone === 'ride' ? styles.tripIconRide : styles.tripIconSend;

  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.tripCard, pressed ? styles.pressedButton : null]}>
      <View style={[styles.tripIcon, toneStyle]}>
        <MaterialCommunityIcons name={trip.icon} size={rs(25)} color={palette.blueInk} />
      </View>
      <View style={styles.tripCopy}>
        <Text style={styles.tripService}>{trip.service}</Text>
        <Text style={styles.tripMeta}>
          {trip.time} • {trip.distanceKm.toFixed(1)}km
        </Text>
      </View>
      <Text selectable style={styles.tripFare}>
        {formatCurrency(trip.fare)}
      </Text>
    </Pressable>
  );
}

function DriverNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, active ? styles.navItemActive : null, pressed ? styles.pressedButton : null]}
    >
      <MaterialCommunityIcons name={icon} size={rs(28)} color={active ? palette.greenDark : palette.muted} />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function formatSignedCurrency(value: number) {
  const prefix = value > 0 ? '+' : '';

  return `${prefix}${formatCurrency(value)}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(24),
    paddingTop: rvs(12),
    paddingBottom: rvs(124),
    gap: rvs(14),
  },
  header: {
    minHeight: rvs(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    borderRadius: rs(12),
  },
  avatarFrame: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: '#b7ddc9',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    color: palette.blueInk,
    fontSize: rf(25),
    lineHeight: rf(31),
    fontWeight: '900',
  },
  iconButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    marginTop: rvs(22),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  screenTitle: {
    color: palette.ink,
    fontSize: rf(27),
    lineHeight: rf(34),
    fontWeight: '900',
  },
  periodPill: {
    minHeight: rvs(34),
    borderRadius: rs(999),
    paddingHorizontal: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: '#dcefe5',
  },
  periodText: {
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '900',
  },
  totalCard: {
    minHeight: rvs(104),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(4),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.06)',
  },
  totalLabel: {
    color: '#7b867f',
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
  },
  totalValue: {
    color: palette.green,
    fontSize: rf(45),
    lineHeight: rf(54),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(14),
  },
  metricCard: {
    flex: 1,
    minHeight: rvs(92),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(18),
    paddingVertical: rvs(16),
    justifyContent: 'center',
    gap: rvs(10),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  metricIconCircle: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.ink,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  acceptanceCard: {
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(18),
    paddingVertical: rvs(16),
    gap: rvs(12),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  acceptanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  acceptanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  acceptanceLabel: {
    color: palette.muted,
    fontSize: rf(17),
    lineHeight: rf(23),
    fontWeight: '800',
  },
  acceptanceValue: {
    color: palette.green,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: rvs(8),
    borderRadius: rs(999),
    backgroundColor: '#dfe9e4',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: rs(999),
    backgroundColor: palette.green,
  },
  detailCard: {
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  detailHeader: {
    minHeight: rvs(48),
    justifyContent: 'center',
    paddingHorizontal: rs(18),
    backgroundColor: '#c8f0db',
  },
  detailTitle: {
    color: palette.greenDark,
    fontSize: rf(21),
    lineHeight: rf(27),
    fontWeight: '900',
  },
  detailRow: {
    minHeight: rvs(46),
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  detailLabel: {
    flex: 1,
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
  },
  detailValue: {
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  detailValuePositive: {
    color: palette.green,
  },
  detailValueNegative: {
    color: palette.danger,
  },
  sectionTitleRow: {
    marginTop: rvs(4),
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: rf(22),
    lineHeight: rf(29),
    fontWeight: '900',
  },
  tripList: {
    gap: rvs(12),
  },
  tripCard: {
    minHeight: rvs(80),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  tripIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconRide: {
    backgroundColor: '#e3f2ec',
  },
  tripIconSend: {
    backgroundColor: palette.blueSoft,
  },
  tripCopy: {
    flex: 1,
    gap: rvs(2),
  },
  tripService: {
    color: palette.ink,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '900',
  },
  tripMeta: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
  },
  tripFare: {
    color: palette.ink,
    fontSize: rf(17),
    lineHeight: rf(23),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  viewAllButton: {
    alignSelf: 'center',
    minHeight: rvs(36),
    justifyContent: 'center',
    paddingHorizontal: rs(16),
    borderRadius: rs(10),
  },
  viewAllText: {
    color: palette.blueInk,
    fontSize: rf(15),
    lineHeight: rf(21),
    fontWeight: '900',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: rvs(86),
    paddingHorizontal: rs(22),
    paddingTop: rvs(12),
    paddingBottom: rvs(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navItem: {
    flex: 1,
    minHeight: rvs(62),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(4),
    borderRadius: rs(999),
  },
  navItemActive: {
    backgroundColor: palette.mint,
  },
  navLabel: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '900',
  },
  navLabelActive: {
    color: palette.greenDark,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
