import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { rf, rs, rvs } from '@/constants/responsive';
import { listBookings } from '@/lib/ride-api';
import type { TripDetail } from '@/types/ride';

const palette = {
  background: '#f7faf8',
  card: '#ffffff',
  ink: '#08110d',
  muted: '#637069',
  line: '#e2e8f0',
  green: '#00c853',
  greenDark: '#053f2a',
  greenSoft: '#e8fcdb',
  mint: '#6df0a7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#edf4ff',
  amber: '#f59e0b',
  amberSoft: '#fff3d8',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
};

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
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEarnings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await listBookings(1, 100);
      setTrips(data.items || []);
    } catch (err) {
      console.warn('[Driver Earnings] Failed to load earnings data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const earningsSummary = useMemo(() => {
    const now = new Date();
    const isToday = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    const todayTrips = trips.filter((t) => isToday(t.completedAt || t.requestedAt));
    const completed = todayTrips.filter((t) => t.status === 'COMPLETED');
    const totalEarnings = completed.reduce((sum, t) => sum + (t.finalFare ?? t.estimatedFare ?? 0), 0);
    const platformFee = Math.round(totalEarnings * 0.15); // Standard platform fee estimation 15%
    const totalTripsOffered = todayTrips.length;
    const acceptanceRate = totalTripsOffered > 0
      ? Math.round((completed.length / totalTripsOffered) * 100)
      : 100;

    return {
      totalToday: totalEarnings,
      completedTrips: completed.length,
      onlineHours: completed.length > 0 ? Math.max(1, Math.round(completed.length * 0.75)) : 0,
      acceptanceRate,
      collectedCash: totalEarnings,
      bonus: 0,
      platformFee: -platformFee,
    };
  }, [trips]);

  const recentTripsList = useMemo<RecentTrip[]>(() => {
    const completed = trips.filter((t) => t.status === 'COMPLETED');
    return completed.slice(0, 5).map((t) => {
      const date = new Date(t.completedAt || t.requestedAt || Date.now());
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');

      return {
        id: `ride-${t.tripId}`,
        service: 'GoRide',
        time: `${hh}:${mm}`,
        distanceKm: t.estimatedDistance ?? 0,
        fare: t.finalFare ?? t.estimatedFare ?? 0,
        icon: 'motorbike',
        tone: 'ride',
      };
    });
  }, [trips]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { minHeight: height }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadEarnings(true)}
            colors={[palette.green]}
            tintColor={palette.green}
          />
        }
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

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.green} />
            <Text style={styles.loadingText}>Đang tải thu nhập...</Text>
          </View>
        ) : (
          <>
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
              {earningsSummary.bonus > 0 ? (
                <EarningsRow label="Thưởng" value={earningsSummary.bonus} positive />
              ) : null}
              {earningsSummary.platformFee !== 0 ? (
                <EarningsRow label="Phí nền tảng ước tính" value={earningsSummary.platformFee} negative />
              ) : null}
            </View>

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Chuyến đi gần đây</Text>
            </View>

            <View style={styles.tripList}>
              {recentTripsList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="motorbike-off" size={rs(36)} color={palette.muted} />
                  <Text style={styles.emptyText}>Chưa có chuyến đi nào hoàn thành hôm nay</Text>
                </View>
              ) : (
                recentTripsList.map((trip) => (
                  <RecentTripCard key={trip.id} trip={trip} />
                ))
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(driver)/activity')}
              style={({ pressed }) => [styles.viewAllButton, pressed ? styles.pressedButton : null]}
            >
              <Text style={styles.viewAllText}>XEM TẤT CẢ CHUYẾN ĐI</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant-outline" label="Home" onPress={() => router.push('/(driver)')} />
        <DriverNavItem icon="cash-multiple" label="Earnings" active />
        <DriverNavItem icon="history" label="Activity" onPress={() => router.push('./activity')} />
        <DriverNavItem icon="account-outline" label="Account" onPress={() => router.push('./account')} />
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
  },
  container: {
    paddingHorizontal: rs(20),
    paddingTop: rvs(10),
    paddingBottom: rvs(110),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(18),
  },
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  avatarFrame: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: palette.green,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    fontSize: rf(18),
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -0.3,
  },
  iconButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(16),
  },
  screenTitle: {
    fontSize: rf(26),
    fontWeight: '800',
    color: palette.ink,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: palette.card,
    paddingHorizontal: rs(12),
    paddingVertical: rvs(6),
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: palette.line,
  },
  periodText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: palette.ink,
  },
  totalCard: {
    backgroundColor: palette.greenDark,
    borderRadius: rs(18),
    paddingHorizontal: rs(20),
    paddingVertical: rvs(18),
    marginBottom: rvs(14),
  },
  totalLabel: {
    fontSize: rf(13),
    color: palette.mint,
    fontWeight: '600',
    marginBottom: rvs(4),
  },
  totalValue: {
    fontSize: rf(32),
    fontWeight: '800',
    color: '#ffffff',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(12),
    marginBottom: rvs(14),
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: rs(14),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(12),
    borderWidth: 1,
    borderColor: palette.line,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rvs(6),
  },
  metricIconCircle: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: palette.muted,
  },
  metricValue: {
    fontSize: rf(16),
    fontWeight: '700',
    color: palette.ink,
  },
  acceptanceCard: {
    backgroundColor: palette.card,
    borderRadius: rs(14),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(14),
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: rvs(14),
  },
  acceptanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(10),
  },
  acceptanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  acceptanceLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: palette.ink,
  },
  acceptanceValue: {
    fontSize: rf(16),
    fontWeight: '700',
    color: palette.ink,
  },
  progressTrack: {
    height: rvs(6),
    borderRadius: rs(3),
    backgroundColor: palette.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.green,
    borderRadius: rs(3),
  },
  detailCard: {
    backgroundColor: palette.card,
    borderRadius: rs(14),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(14),
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: rvs(18),
  },
  detailHeader: {
    marginBottom: rvs(10),
  },
  detailTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: palette.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rvs(6),
  },
  detailLabel: {
    fontSize: rf(13),
    color: palette.muted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: rf(14),
    fontWeight: '600',
    color: palette.ink,
  },
  detailValuePositive: {
    color: palette.green,
  },
  detailValueNegative: {
    color: palette.danger,
  },
  sectionTitleRow: {
    marginBottom: rvs(12),
  },
  sectionTitle: {
    fontSize: rf(17),
    fontWeight: '700',
    color: palette.ink,
  },
  tripList: {
    gap: rvs(10),
    marginBottom: rvs(16),
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: rs(14),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(12),
    borderWidth: 1,
    borderColor: palette.line,
    gap: rs(12),
  },
  tripIcon: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconRide: {
    backgroundColor: palette.greenSoft,
  },
  tripIconSend: {
    backgroundColor: palette.blueSoft,
  },
  tripCopy: {
    flex: 1,
  },
  tripService: {
    fontSize: rf(14),
    fontWeight: '700',
    color: palette.ink,
    marginBottom: rvs(2),
  },
  tripMeta: {
    fontSize: rf(12),
    color: palette.muted,
  },
  tripFare: {
    fontSize: rf(15),
    fontWeight: '700',
    color: palette.ink,
  },
  emptyCard: {
    backgroundColor: palette.card,
    borderRadius: rs(14),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(8),
    borderWidth: 1,
    borderColor: palette.line,
  },
  emptyText: {
    fontSize: rf(13),
    color: palette.muted,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: rvs(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(12),
  },
  loadingText: {
    fontSize: rf(13),
    color: palette.muted,
  },
  viewAllButton: {
    backgroundColor: palette.card,
    borderRadius: rs(12),
    paddingVertical: rvs(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
  },
  viewAllText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: 0.5,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: palette.card,
    paddingVertical: rvs(10),
    paddingHorizontal: rs(16),
    borderTopWidth: 1,
    borderTopColor: palette.line,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    gap: rvs(4),
  },
  navItemActive: {},
  navLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: palette.muted,
  },
  navLabelActive: {
    color: palette.greenDark,
  },
  pressedButton: {
    opacity: 0.8,
  },
});
