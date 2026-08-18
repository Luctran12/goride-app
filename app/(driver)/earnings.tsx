import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriverBottomNav } from '@/components/driver/driver-bottom-nav';
import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';
import { listBookings } from '@/lib/ride-api';
import type { TripDetail } from '@/types/ride';

const palette = {
  background: '#F8FAFC',
  card: '#ffffff',
  cardDark: '#0B1E14',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  green: '#00C853',
  greenDark: '#044D29',
  greenSoft: '#E8FADF',
  mint: '#10B981',
  mintSoft: '#D1FAE5',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
};

const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 4,
};

type Period = 'today' | 'week' | 'month';

export default function DriverEarningsScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
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

  const filteredTrips = useMemo(() => {
    const now = new Date();

    const parseTripDate = (dateStr?: string | null) => {
      return dateStr ? new Date(dateStr) : new Date();
    };

    const isToday = (date: Date) => {
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    };

    const isWithinDays = (date: Date, days: number) => {
      const diffMs = now.getTime() - date.getTime();
      return diffMs / (1000 * 60 * 60 * 24) <= days;
    };

    return trips.filter((t) => {
      const tripDate = parseTripDate(t.completedAt || t.requestedAt);
      if (selectedPeriod === 'today') return isToday(tripDate);
      if (selectedPeriod === 'week') return isWithinDays(tripDate, 7);
      if (selectedPeriod === 'month') return isWithinDays(tripDate, 30);
      return true;
    });
  }, [trips, selectedPeriod]);

  const summary = useMemo(() => {
    const completed = filteredTrips.filter((t) => t.status === 'COMPLETED');
    const grossFare = completed.reduce((sum, t) => sum + (t.finalFare ?? t.estimatedFare ?? 0), 0);
    const platformFee = Math.round(grossFare * 0.15);
    const netEarnings = grossFare - platformFee;
    const totalOffered = filteredTrips.length;
    const acceptanceRate = totalOffered > 0 ? Math.round((completed.length / totalOffered) * 100) : 100;
    const onlineHours = completed.length > 0 ? (completed.length * 0.6).toFixed(1) : '0';
    const avgFare = completed.length > 0 ? Math.round(grossFare / completed.length) : 0;

    return {
      grossFare,
      platformFee,
      netEarnings,
      completedTrips: completed.length,
      acceptanceRate,
      onlineHours,
      avgFare,
      completedList: completed,
    };
  }, [filteredTrips]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('driverEarnings.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {selectedPeriod === 'today'
              ? t('driverEarnings.periodToday')
              : selectedPeriod === 'week'
                ? t('driverActivity.periodWeek')
                : t('driverActivity.periodMonth')}
          </Text>
        </View>

        {/* PERIOD SELECTOR TABS */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.periodTab, selectedPeriod === 'today' && styles.periodTabActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodTabText, selectedPeriod === 'today' && styles.periodTabTextActive]}>
              {t('driverEarnings.periodToday')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.periodTab, selectedPeriod === 'week' && styles.periodTabActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodTabText, selectedPeriod === 'week' && styles.periodTabTextActive]}>
              {t('driverEarnings.tab7D')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.periodTab, selectedPeriod === 'month' && styles.periodTabActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodTabText, selectedPeriod === 'month' && styles.periodTabTextActive]}>
              {t('driverEarnings.tab30D')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.green} />
            <Text style={styles.loadingText}>{t('driverEarnings.loading')}</Text>
          </View>
        ) : (
          <>
            {/* 1. HERO TOTAL EARNINGS CARD */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>
                    {t('driverEarnings.totalTodayLabel')}
                  </Text>
                  <Text selectable style={styles.heroAmount}>
                    {formatFare(summary.grossFare)}
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <MaterialCommunityIcons name="wallet-outline" size={rs(32)} color="#ffffff" />
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottomRow}>
                <MaterialCommunityIcons name="shield-check" size={rs(20)} color={palette.mint} />
                <Text style={styles.heroSubtext}>
                  {t('driverEarnings.tripCount', { count: summary.completedTrips })} · {t('driverEarnings.acceptanceRateLabel')}: {summary.acceptanceRate}%
                </Text>
              </View>
            </View>

            {/* 2. STAT METRICS GRID */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: palette.greenSoft }]}>
                  <MaterialCommunityIcons name="check-circle" size={rs(26)} color={palette.green} />
                </View>
                <Text style={styles.metricLabel}>{t('driverEarnings.completedLabel')}</Text>
                <Text style={styles.metricValue}>{t('driverEarnings.tripCount', { count: summary.completedTrips })}</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: palette.blueSoft }]}>
                  <MaterialCommunityIcons name="clock-outline" size={rs(26)} color={palette.blue} />
                </View>
                <Text style={styles.metricLabel}>{t('driverEarnings.onlineTimeLabel')}</Text>
                <Text style={styles.metricValue}>{t('driverEarnings.hoursOnline', { count: summary.onlineHours })}</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: palette.amberSoft }]}>
                  <MaterialCommunityIcons name="target" size={rs(26)} color={palette.amber} />
                </View>
                <Text style={styles.metricLabel}>{t('driverEarnings.acceptanceRateLabel')}</Text>
                <Text style={styles.metricValue}>{summary.acceptanceRate}%</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: palette.mintSoft }]}>
                  <MaterialCommunityIcons name="chart-line" size={rs(26)} color={palette.mint} />
                </View>
                <Text style={styles.metricLabel}>{t('driverEarnings.avgPerTrip')}</Text>
                <Text style={styles.metricValue}>{formatFare(summary.avgFare)}</Text>
              </View>
            </View>

            {/* 3. EARNINGS BREAKDOWN CARD */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="receipt-text-outline" size={rs(24)} color={palette.ink} />
                <Text style={styles.sectionTitle}>
                  {t('driverEarnings.earningsDetailsTitle')}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('driverEarnings.collectedCash')}</Text>
                <Text style={styles.breakdownValue}>{formatFare(summary.grossFare)}</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('driverEarnings.bonus')}</Text>
                <Text style={[styles.breakdownValue, { color: palette.green }]}>+0đ</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('driverEarnings.platformFee')}</Text>
                <Text style={[styles.breakdownValue, { color: palette.danger }]}>-{formatFare(summary.platformFee)}</Text>
              </View>

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>{t('driverEarnings.netEarnings')}</Text>
                <Text style={styles.breakdownTotalValue}>{formatFare(summary.netEarnings)}</Text>
              </View>
            </View>

            {/* 4. RECENT TRIPS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeadingTitle}>
                {t('driverEarnings.recentTripsTitle')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(driver)/activity')}
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllBtnText}>{t('driverEarnings.viewAllTripsBtn')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={rs(20)} color={palette.green} />
              </TouchableOpacity>
            </View>

            <View style={styles.tripList}>
              {summary.completedList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="motorbike-off" size={rs(48)} color={palette.muted} />
                  <Text style={styles.emptyText}>{t('driverEarnings.noTripsToday')}</Text>
                </View>
              ) : (
                summary.completedList.slice(0, 8).map((trip) => {
                  const date = new Date(trip.completedAt || trip.requestedAt || Date.now());
                  const hh = String(date.getHours()).padStart(2, '0');
                  const mm = String(date.getMinutes()).padStart(2, '0');

                  return (
                    <View key={trip.tripId} style={styles.tripItemCard}>
                      <View style={styles.tripIconWrap}>
                        <MaterialCommunityIcons name="motorbike" size={rs(28)} color={palette.greenDark} />
                      </View>

                      <View style={styles.tripInfoWrap}>
                        <View style={styles.tripTitleRow}>
                          <Text style={styles.tripServiceName}>GoRide #{trip.tripId}</Text>
                          <Text style={styles.tripTimeText}>{`${hh}:${mm}`}</Text>
                        </View>

                        <Text style={styles.tripRouteText} numberOfLines={1}>
                          {trip.pickup?.address || t('driver.pickupLabel')} ➔ {trip.dropoff?.address || t('driver.dropoffLabel')}
                        </Text>
                      </View>

                      <View style={styles.tripFareWrap}>
                        <Text style={styles.tripFareText}>
                          {formatFare(trip.finalFare ?? trip.estimatedFare ?? 0)}
                        </Text>
                        <Text style={styles.paymentMethodText}>{t('driverEarnings.paymentCash')}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* STANDARDIZED DRIVER BOTTOM NAVIGATION */}
      <DriverBottomNav currentTab="earnings" />
    </SafeAreaView>
  );
}

function formatFare(fare: number) {
  return `${Math.round(fare).toLocaleString('vi-VN')}đ`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: rs(20),
    paddingTop: rvs(12),
    paddingBottom: rvs(16),
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: palette.ink,
    fontSize: rf(28),
    fontWeight: '900',
  },
  headerSubtitle: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
    marginTop: 2,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: rs(16),
    padding: 4,
    gap: rs(4),
  },
  periodTab: {
    paddingHorizontal: rs(14),
    paddingVertical: rvs(8),
    borderRadius: rs(12),
  },
  periodTabActive: {
    backgroundColor: '#ffffff',
    ...shadow,
  },
  periodTabText: {
    fontSize: rf(15),
    fontWeight: '700',
    color: palette.muted,
  },
  periodTabTextActive: {
    color: palette.greenDark,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: rs(18),
    paddingTop: rvs(18),
    paddingBottom: rvs(36),
    gap: rvs(18),
  },
  heroCard: {
    backgroundColor: palette.cardDark,
    borderRadius: rs(26),
    padding: rs(22),
    ...shadow,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: '#94A3B8',
    fontSize: rf(16),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: rf(38),
    fontWeight: '900',
    marginTop: rvs(6),
  },
  heroBadge: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: 'rgba(0, 200, 83, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: rvs(16),
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  heroSubtext: {
    color: '#F1F5F9',
    fontSize: rf(16),
    fontWeight: '700',
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: palette.card,
    borderRadius: rs(20),
    padding: rs(18),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  metricIconWrap: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(23),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(10),
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '700',
  },
  metricValue: {
    color: palette.ink,
    fontSize: rf(22),
    fontWeight: '900',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: rs(24),
    padding: rs(20),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
    gap: rvs(14),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingBottom: rvs(8),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: rf(18),
    fontWeight: '900',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
  },
  breakdownValue: {
    color: palette.ink,
    fontSize: rf(17),
    fontWeight: '800',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: palette.line,
    marginVertical: rvs(4),
  },
  breakdownTotalLabel: {
    color: palette.ink,
    fontSize: rf(18),
    fontWeight: '900',
  },
  breakdownTotalValue: {
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rvs(8),
  },
  sectionHeadingTitle: {
    color: palette.ink,
    fontSize: rf(20),
    fontWeight: '900',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllBtnText: {
    color: palette.green,
    fontSize: rf(16),
    fontWeight: '800',
  },
  tripList: {
    gap: rvs(12),
  },
  tripItemCard: {
    backgroundColor: palette.card,
    borderRadius: rs(20),
    padding: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  tripIconWrap: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfoWrap: {
    flex: 1,
  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tripServiceName: {
    color: palette.ink,
    fontSize: rf(17),
    fontWeight: '800',
  },
  tripTimeText: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '600',
  },
  tripRouteText: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '500',
  },
  tripFareWrap: {
    alignItems: 'flex-end',
  },
  tripFareText: {
    color: palette.greenDark,
    fontSize: rf(19),
    fontWeight: '900',
  },
  paymentMethodText: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: palette.card,
    borderRadius: rs(20),
    paddingVertical: rvs(40),
    paddingHorizontal: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(10),
    borderWidth: 1,
    borderColor: palette.line,
  },
  emptyText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: rvs(60),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(14),
  },
  loadingText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
  },
});
