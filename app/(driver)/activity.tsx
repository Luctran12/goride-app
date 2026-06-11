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
  greenSoft: '#c8f0db',
  mint: '#6df0a7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#edf4ff',
  amber: '#f59e0b',
  danger: '#d72828',
  dangerSoft: '#f2e9df',
  graySoft: '#e8efeb',
};

type ActivityPeriod = 'today' | 'week' | 'month';
type ActivityStatus = 'completed' | 'cancelled';

type DriverActivity = {
  id: string;
  time: string;
  fare: number;
  originalFare?: number;
  status: ActivityStatus;
  statusLabel: string;
  pickup: string;
  dropoff: string;
  rating?: number;
};

type ActivityDataset = {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  trips: DriverActivity[];
};

const periodOptions: { key: ActivityPeriod; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 ngày' },
  { key: 'month', label: '30 ngày' },
];

const activityByPeriod: Record<ActivityPeriod, ActivityDataset> = {
  today: {
    totalTrips: 12,
    completedTrips: 10,
    cancelledTrips: 2,
    trips: [
      {
        id: 'trip-1920',
        time: '19:20',
        fare: 48000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: '123 Nguyễn Huệ, Q.1',
        dropoff: 'Bitexco Financial Tower, Quận 1',
        rating: 4.8,
      },
      {
        id: 'trip-1745',
        time: '17:45',
        fare: 125000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: 'Landmark 81, Bình Thạnh',
        dropoff: 'Sân bay Tân Sơn Nhất',
      },
      {
        id: 'trip-1510',
        time: '15:10',
        fare: 0,
        originalFare: 35000,
        status: 'cancelled',
        statusLabel: 'Khách hủy',
        pickup: 'Chợ Bến Thành',
        dropoff: 'Phố đi bộ Bùi Viện',
      },
    ],
  },
  week: {
    totalTrips: 58,
    completedTrips: 51,
    cancelledTrips: 7,
    trips: [
      {
        id: 'trip-week-1',
        time: 'Hôm qua',
        fare: 96000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: 'Vạn Hạnh Mall, Quận 10',
        dropoff: 'Nhà hát Thành phố, Quận 1',
        rating: 4.9,
      },
      {
        id: 'trip-week-2',
        time: 'Thứ 3',
        fare: 72000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: 'Cầu Thủ Thiêm 2',
        dropoff: 'Saigon Centre, Quận 1',
      },
      {
        id: 'trip-week-3',
        time: 'Thứ 2',
        fare: 0,
        originalFare: 52000,
        status: 'cancelled',
        statusLabel: 'Khách hủy',
        pickup: 'Aeon Mall Tân Phú',
        dropoff: 'Etown Cộng Hòa',
      },
    ],
  },
  month: {
    totalTrips: 210,
    completedTrips: 190,
    cancelledTrips: 20,
    trips: [
      {
        id: 'trip-month-1',
        time: '10/06',
        fare: 138000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: 'Ga Sài Gòn',
        dropoff: 'Khu đô thị Sala',
        rating: 5,
      },
      {
        id: 'trip-month-2',
        time: '09/06',
        fare: 64000,
        status: 'completed',
        statusLabel: 'Hoàn thành',
        pickup: 'Đại học Bách Khoa',
        dropoff: 'Hồ Con Rùa',
      },
      {
        id: 'trip-month-3',
        time: '08/06',
        fare: 0,
        originalFare: 47000,
        status: 'cancelled',
        statusLabel: 'Khách hủy',
        pickup: 'Công viên Tao Đàn',
        dropoff: 'Crescent Mall',
      },
    ],
  },
};

export default function DriverActivityScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [selectedPeriod, setSelectedPeriod] = React.useState<ActivityPeriod>('today');
  const dataset = activityByPeriod[selectedPeriod];

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

        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>Hoạt động</Text>
          <Text style={styles.subtitle}>Lịch sử chuyến đi và thu nhập</Text>
        </View>

        <View style={styles.segmentedControl}>
          {periodOptions.map((option) => {
            const active = selectedPeriod === option.key;

            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setSelectedPeriod(option.key)}
                style={({ pressed }) => [
                  styles.segmentItem,
                  active ? styles.segmentItemActive : null,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <SummaryCard label="Tổng chuyến" value={dataset.totalTrips} tone="blue" />
          <SummaryCard label="Hoàn thành" value={dataset.completedTrips} tone="green" featured />
          <SummaryCard label="Đã hủy" value={dataset.cancelledTrips} tone="danger" />
        </View>

        <View style={styles.tripList}>
          {dataset.trips.map((trip) => (
            <ActivityTripCard key={trip.id} trip={trip} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant-outline" label="Home" onPress={() => router.push('/(driver)')} />
        <DriverNavItem icon="cash-multiple" label="Earnings" onPress={() => router.push('/(driver)/earnings')} />
        <DriverNavItem icon="history" label="Activity" active />
        <DriverNavItem icon="account-outline" label="Account" onPress={() => router.push('./account')} />
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  featured = false,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'danger';
  featured?: boolean;
}) {
  const toneStyle = getSummaryTone(tone);

  return (
    <View style={[styles.summaryCard, featured ? styles.summaryCardFeatured : null]}>
      <Text selectable style={[styles.summaryValue, { color: toneStyle.color }]}>
        {value}
      </Text>
      <Text style={[styles.summaryLabel, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

function ActivityTripCard({ trip }: { trip: DriverActivity }) {
  const completed = trip.status === 'completed';
  const statusStyle = completed ? styles.statusCompleted : styles.statusCancelled;
  const statusTextStyle = completed ? styles.statusTextCompleted : styles.statusTextCancelled;
  const routeTone = completed ? 'active' : 'muted';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.tripCard, !completed ? styles.tripCardMuted : null, pressed ? styles.pressedButton : null]}
    >
      <View style={styles.tripTopRow}>
        <View style={styles.timeFareRow}>
          <Text style={[styles.tripTime, !completed ? styles.textMuted : null]}>{trip.time}</Text>
          <Text
            selectable
            style={[
              styles.tripFare,
              !completed ? styles.tripFareMuted : null,
              trip.originalFare ? styles.tripFareStruck : null,
            ]}
          >
            {formatCurrency(trip.originalFare ?? trip.fare)}
          </Text>
        </View>

        <View style={[styles.statusPill, statusStyle]}>
          <MaterialCommunityIcons
            name={completed ? 'check-circle-outline' : 'close-circle-outline'}
            size={rs(18)}
            color={completed ? palette.greenDark : palette.muted}
          />
          <Text style={[styles.statusText, statusTextStyle]}>{trip.statusLabel}</Text>
        </View>
      </View>

      <View style={styles.routeBlock}>
        <RoutePoint label="Điểm đón" address={trip.pickup} tone={routeTone} first />
        <View style={[styles.routeConnector, !completed ? styles.routeConnectorMuted : null]} />
        <RoutePoint label="Điểm đến" address={trip.dropoff} tone={routeTone} />
      </View>

      {completed && trip.rating ? (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Đánh giá chuyến đi</Text>
          <View style={styles.ratingValueRow}>
            <MaterialCommunityIcons name="star" size={rs(19)} color={palette.amber} />
            <Text selectable style={styles.ratingValue}>
              {trip.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function RoutePoint({
  label,
  address,
  tone,
  first = false,
}: {
  label: string;
  address: string;
  tone: 'active' | 'muted';
  first?: boolean;
}) {
  const muted = tone === 'muted';

  return (
    <View style={styles.routePoint}>
      <View style={[styles.routeIconWrap, muted ? styles.routeIconWrapMuted : null]}>
        <MaterialCommunityIcons
          name={first ? 'circle-outline' : 'map-marker'}
          size={rs(19)}
          color={muted ? '#9da8a2' : palette.blue}
        />
      </View>
      <View style={styles.routeCopy}>
        <Text style={[styles.routeLabel, muted ? styles.textMuted : null]}>{label}</Text>
        <Text selectable numberOfLines={2} style={[styles.routeAddress, muted ? styles.routeAddressMuted : null]}>
          {address}
        </Text>
      </View>
    </View>
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

function getSummaryTone(tone: 'blue' | 'green' | 'danger') {
  if (tone === 'green') {
    return { color: palette.green, text: palette.greenDark };
  }

  if (tone === 'danger') {
    return { color: palette.danger, text: palette.danger };
  }

  return { color: palette.blueInk, text: '#3d4560' };
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
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
    gap: rvs(18),
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
  titleBlock: {
    gap: rvs(3),
    paddingTop: rvs(12),
  },
  screenTitle: {
    color: palette.ink,
    fontSize: rf(31),
    lineHeight: rf(39),
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(17),
    lineHeight: rf(23),
    fontWeight: '700',
  },
  segmentedControl: {
    minHeight: rvs(44),
    borderRadius: rs(8),
    backgroundColor: '#e7f2ec',
    padding: rs(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
  },
  segmentItem: {
    flex: 1,
    minHeight: rvs(38),
    borderRadius: rs(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: palette.card,
  },
  segmentText: {
    color: palette.muted,
    fontSize: rf(15),
    lineHeight: rf(21),
    fontWeight: '900',
  },
  segmentTextActive: {
    color: palette.blueInk,
  },
  statsRow: {
    flexDirection: 'row',
    gap: rs(13),
  },
  summaryCard: {
    flex: 1,
    minHeight: rvs(110),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(3),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  summaryCardFeatured: {
    backgroundColor: palette.greenSoft,
    borderColor: '#b3e7cc',
  },
  summaryValue: {
    fontSize: rf(31),
    lineHeight: rf(39),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: rf(16),
    lineHeight: rf(21),
    fontWeight: '900',
    textAlign: 'center',
  },
  tripList: {
    gap: rvs(14),
  },
  tripCard: {
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(18),
    paddingTop: rvs(16),
    paddingBottom: rvs(14),
    gap: rvs(14),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  tripCardMuted: {
    backgroundColor: '#f7fbf9',
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  timeFareRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  tripTime: {
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tripFare: {
    color: palette.blueInk,
    fontSize: rf(17),
    lineHeight: rf(23),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  tripFareMuted: {
    color: '#9aa59f',
  },
  tripFareStruck: {
    textDecorationLine: 'line-through',
  },
  statusPill: {
    minHeight: rvs(28),
    borderRadius: rs(999),
    paddingHorizontal: rs(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  statusCompleted: {
    backgroundColor: palette.greenSoft,
  },
  statusCancelled: {
    backgroundColor: palette.graySoft,
  },
  statusText: {
    fontSize: rf(14),
    lineHeight: rf(20),
    fontWeight: '900',
  },
  statusTextCompleted: {
    color: palette.greenDark,
  },
  statusTextCancelled: {
    color: palette.muted,
  },
  routeBlock: {
    gap: rvs(2),
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
  },
  routeIconWrap: {
    width: rs(23),
    height: rs(23),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rvs(2),
  },
  routeIconWrapMuted: {
    opacity: 0.9,
  },
  routeCopy: {
    flex: 1,
    gap: rvs(1),
  },
  routeLabel: {
    color: palette.muted,
    fontSize: rf(15),
    lineHeight: rf(20),
    fontWeight: '700',
  },
  routeAddress: {
    color: palette.ink,
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '800',
  },
  routeAddressMuted: {
    color: '#67736c',
  },
  routeConnector: {
    width: 1,
    height: rvs(18),
    backgroundColor: '#c8d6cf',
    marginLeft: rs(11),
  },
  routeConnectorMuted: {
    backgroundColor: '#d4ddd8',
  },
  ratingRow: {
    minHeight: rvs(38),
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: rvs(11),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  ratingLabel: {
    color: palette.muted,
    fontSize: rf(15),
    lineHeight: rf(21),
    fontWeight: '700',
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
  },
  ratingValue: {
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
  textMuted: {
    color: '#8b9791',
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
