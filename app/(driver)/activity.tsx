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
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  green: '#00C853',
  greenDark: '#044D29',
  greenSoft: '#E8FADF',
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

type ActivityPeriod = 'today' | 'week' | 'month';

export default function DriverActivityScreen() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityPeriod>('today');
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await listBookings(1, 100);
      setTrips(data.items || []);
    } catch (err) {
      console.warn('[Driver Activity] Load activity error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const activityData = useMemo(() => {
    const now = new Date();

    const parseTripDate = (reqAt?: string | null) => {
      return reqAt ? new Date(reqAt) : new Date();
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

    const filtered = trips.filter((trip) => {
      const tripDate = parseTripDate(trip.requestedAt || trip.completedAt);
      if (selectedPeriod === 'today') return isToday(tripDate);
      if (selectedPeriod === 'week') return isWithinDays(tripDate, 7);
      if (selectedPeriod === 'month') return isWithinDays(tripDate, 30);
      return true;
    });

    const completed = filtered.filter((t) => t.status === 'COMPLETED');
    const cancelled = filtered.filter((t) => t.status === 'CANCELLED' || t.status === 'NO_DRIVER');

    return {
      totalTrips: filtered.length,
      completedTrips: completed.length,
      cancelledTrips: cancelled.length,
      trips: filtered,
    };
  }, [trips, selectedPeriod]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('driverActivity.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('driverActivity.subtitle')}</Text>
        </View>

        {/* PERIOD SELECTOR TABS */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.periodTab, selectedPeriod === 'today' && styles.periodTabActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodTabText, selectedPeriod === 'today' && styles.periodTabTextActive]}>
              {t('driverActivity.periodToday')}
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
            onRefresh={() => void loadActivity(true)}
            colors={[palette.green]}
            tintColor={palette.green}
          />
        }
      >
        {/* SUMMARY TILES */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: palette.blue }]}>
            <Text style={styles.summaryLabel}>{t('driverActivity.totalTrips')}</Text>
            <Text style={[styles.summaryValue, { color: palette.blue }]}>{activityData.totalTrips}</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: palette.green }]}>
            <Text style={styles.summaryLabel}>{t('driverActivity.completedTrips')}</Text>
            <Text style={[styles.summaryValue, { color: palette.green }]}>{activityData.completedTrips}</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: palette.danger }]}>
            <Text style={styles.summaryLabel}>{t('driverActivity.cancelledTrips')}</Text>
            <Text style={[styles.summaryValue, { color: palette.danger }]}>{activityData.cancelledTrips}</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.green} />
          </View>
        ) : activityData.trips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={rs(52)} color={palette.muted} />
            <Text style={styles.emptyStateText}>{t('driverActivity.noActivity')}</Text>
          </View>
        ) : (
          <View style={styles.tripList}>
            {activityData.trips.map((trip) => {
              const reqDate = new Date(trip.requestedAt || trip.completedAt || Date.now());
              const dateStr = `${String(reqDate.getDate()).padStart(2, '0')}/${String(reqDate.getMonth() + 1).padStart(2, '0')} ${String(reqDate.getHours()).padStart(2, '0')}:${String(reqDate.getMinutes()).padStart(2, '0')}`;
              const isCompleted = trip.status === 'COMPLETED';

              return (
                <View key={trip.tripId} style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <View style={styles.tripHeaderLeft}>
                      <MaterialCommunityIcons
                        name={isCompleted ? 'check-circle' : 'close-circle'}
                        size={rs(24)}
                        color={isCompleted ? palette.green : palette.danger}
                      />
                      <Text style={styles.tripIdText}>GoRide #{trip.tripId}</Text>
                    </View>

                    <Text
                      style={[
                        styles.tripStatusBadge,
                        isCompleted ? styles.tripStatusCompleted : styles.tripStatusCancelled,
                      ]}
                    >
                      {isCompleted ? t('driverActivity.statusCompleted') : t('driverActivity.statusPassengerCancelled')}
                    </Text>
                  </View>

                  <View style={styles.tripDivider} />

                  <View style={styles.routeContainer}>
                    <View style={styles.routeRow}>
                      <View style={styles.pickupDot} />
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {trip.pickup?.address || t('driverActivity.pickupLabel')}
                      </Text>
                    </View>

                    <View style={styles.routeRow}>
                      <View style={styles.dropoffDot} />
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {trip.dropoff?.address || t('driverActivity.dropoffLabel')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripCardFooter}>
                    <Text style={styles.tripDateText}>{dateStr}</Text>
                    <Text style={[styles.tripFareText, !isCompleted && styles.tripFareCancelled]}>
                      {formatFare(trip.finalFare ?? trip.estimatedFare ?? 0)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* STANDARDIZED DRIVER BOTTOM NAVIGATION */}
      <DriverBottomNav currentTab="activity" />
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
  summaryRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: rs(20),
    padding: rs(16),
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: rf(26),
    fontWeight: '900',
    marginTop: 4,
  },
  tripList: {
    gap: rvs(14),
  },
  tripCard: {
    backgroundColor: palette.card,
    borderRadius: rs(22),
    padding: rs(18),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  tripIdText: {
    color: palette.ink,
    fontSize: rf(18),
    fontWeight: '900',
  },
  tripStatusBadge: {
    fontSize: rf(13),
    fontWeight: '800',
    paddingHorizontal: rs(12),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
    overflow: 'hidden',
  },
  tripStatusCompleted: {
    backgroundColor: palette.greenSoft,
    color: palette.greenDark,
  },
  tripStatusCancelled: {
    backgroundColor: palette.dangerSoft,
    color: palette.danger,
  },
  tripDivider: {
    height: 1,
    backgroundColor: palette.line,
    marginVertical: rvs(14),
  },
  routeContainer: {
    gap: rvs(10),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  pickupDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    backgroundColor: palette.green,
  },
  dropoffDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    backgroundColor: palette.danger,
  },
  routeAddress: {
    flex: 1,
    color: palette.ink,
    fontSize: rf(16),
    fontWeight: '600',
  },
  tripCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rvs(16),
    paddingTop: rvs(12),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripDateText: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '600',
  },
  tripFareText: {
    color: palette.greenDark,
    fontSize: rf(20),
    fontWeight: '900',
  },
  tripFareCancelled: {
    color: palette.muted,
    textDecorationLine: 'line-through',
  },
  emptyState: {
    backgroundColor: palette.card,
    borderRadius: rs(22),
    paddingVertical: rvs(52),
    paddingHorizontal: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(14),
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: rvs(20),
  },
  emptyStateText: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: rvs(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
