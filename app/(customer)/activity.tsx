import { rf, rs, rvs } from '@/constants/responsive';
import { listBookings } from '@/lib/ride-api';
import type { TripDetail, TripRating, TripStatus } from '@/types/ride';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  green: '#00b67a',
  greenSoft: '#dff8ef',
  amber: '#e28b00',
  amberSoft: '#fff3d8',
  danger: '#c91c1c',
  dangerSoft: '#fdeaea',
  blue: '#246bfe',
  blueSoft: '#e8f0ff',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.11,
  shadowRadius: 18,
  elevation: 6,
};

const PAGE_SIZE = 20;

export default function ActivityScreen() {
  const router = useRouter();
  const [trips, setTrips] = React.useState<TripDetail[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = React.useState<TripDetail | null>(null);

  const completedCount = trips.filter((trip) => trip.status === 'COMPLETED').length;
  const cancelledCount = trips.filter((trip) => trip.status === 'CANCELLED' || trip.status === 'NO_DRIVER').length;

  const loadHistory = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const page = await listBookings(1, PAGE_SIZE);
      setTrips(page.items);
      setTotal(page.total);
      setUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử chuyến đi.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadHistory({ silent: true });
  }, [loadHistory]);

  const handleRebook = React.useCallback(
    (trip: TripDetail) => {
      setSelectedTrip(null);
      router.push({
        pathname: '/(customer)/booking/select-vehicle',
        params: {
          pickup: JSON.stringify(trip.pickup),
          dropoff: JSON.stringify(trip.dropoff),
          pickupLat: String(trip.pickup.lat),
          pickupLng: String(trip.pickup.lng),
          pickupLabel: trip.pickup.label ?? trip.pickup.address,
          destLat: String(trip.dropoff.lat),
          destLng: String(trip.dropoff.lng),
          destLabel: trip.dropoff.label ?? trip.dropoff.address,
        },
      });
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={palette.primary} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} style={styles.headerButton} onPress={() => router.push('/(customer)')}>
            <Feather name="chevron-left" size={rs(38)} color={palette.primary} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.title}>Hoạt động</Text>
            <Text style={styles.subtitle}>Theo dõi các chuyến GoRide của bạn</Text>
          </View>

          <TouchableOpacity activeOpacity={0.82} style={styles.headerButton} onPress={handleRefresh}>
            <Feather name="refresh-cw" size={rs(30)} color={palette.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroOrb} />
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="map-clock-outline" size={rs(46)} color="#ffffff" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Lịch sử chuyến đi</Text>
            <Text style={styles.heroTitle}>{total} chuyến gần đây</Text>
            <Text style={styles.heroText}>{updatedAt ? `Cập nhật ${formatShortTime(updatedAt)}` : 'Kéo xuống để làm mới dữ liệu'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="check-circle-outline" label="Hoàn tất" value={completedCount.toString()} tone="green" />
          <StatCard icon="close-circle-outline" label="Đã hủy" value={cancelledCount.toString()} tone="danger" />
          <StatCard icon="receipt-text-outline" label="Tổng" value={total.toString()} tone="primary" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chuyến đi của bạn</Text>
          <Text style={styles.sectionHint}>Trang 1/{PAGE_SIZE}</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={styles.stateTitle}>Đang tải lịch sử...</Text>
            <Text style={styles.stateText}>GoRide đang lấy các chuyến mới nhất.</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, styles.stateIconDanger]}>
              <Feather name="alert-triangle" size={rs(34)} color={palette.danger} />
            </View>
            <Text style={styles.stateTitle}>Chưa tải được lịch sử</Text>
            <Text selectable style={styles.stateText}>{error}</Text>
            <TouchableOpacity activeOpacity={0.84} style={styles.retryButton} onPress={() => loadHistory()}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <MaterialCommunityIcons name="map-search-outline" size={rs(38)} color={palette.primary} />
            </View>
            <Text style={styles.stateTitle}>Chưa có chuyến đi</Text>
            <Text style={styles.stateText}>Khi bạn đặt chuyến đầu tiên, lịch sử sẽ xuất hiện ở đây.</Text>
            <TouchableOpacity activeOpacity={0.84} style={styles.retryButton} onPress={() => router.push('/(customer)/booking/pickup')}>
              <Text style={styles.retryText}>Đặt chuyến ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tripList}>
            {trips.map((trip) => (
              <TripCard key={trip.tripId} trip={trip} onPress={() => setSelectedTrip(trip)} />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} onRebook={handleRebook} />

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" label="Home" onPress={() => router.push('/(customer)')} />
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <MaterialCommunityIcons name="history" size={rs(34)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Activity</Text>
        </TouchableOpacity>
        <NavItem icon="cash-multiple" label="Payment" onPress={() => router.push('/(customer)/billing')} />
        <NavItem icon="account-outline" label="Profile" onPress={() => router.push('/(customer)/profile')} />
      </View>
    </SafeAreaView>
  );
}

function TripCard({ trip, onPress }: { trip: TripDetail; onPress: () => void }) {
  const fare = trip.finalFare ?? trip.estimatedFare;

  return (
    <TouchableOpacity activeOpacity={0.86} style={styles.tripCard} onPress={onPress}>
      <View style={styles.compactRouteBlock}>
        <RouteLineDot color={palette.green} />
        <View style={styles.routeCopy}>
          <Text style={styles.routeLabel}>Điểm đón</Text>
          <Text selectable style={styles.routeAddress} numberOfLines={2}>{trip.pickup.address}</Text>
        </View>
      </View>

      <View style={styles.routeConnector} />

      <View style={styles.compactRouteBlock}>
        <RouteLineDot color={palette.primary} />
        <View style={styles.routeCopy}>
          <Text style={styles.routeLabel}>Điểm đến</Text>
          <Text selectable style={styles.routeAddress} numberOfLines={2}>{trip.dropoff.address}</Text>
        </View>
      </View>

      <View style={styles.compactFooter}>
        <View style={styles.compactMetaItem}>
          <MaterialCommunityIcons name="calendar-clock" size={rs(26)} color={palette.primary} />
          <Text style={styles.compactMetaText}>{formatTripDate(trip.requestedAt)}</Text>
        </View>
        <View style={styles.compactFareWrap}>
          <Text style={styles.compactFare}>{formatCurrency(fare)}</Text>
          <Feather name="chevron-right" size={rs(26)} color={palette.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TripDetailModal({
  trip,
  onClose,
  onRebook,
}: {
  trip: TripDetail | null;
  onClose: () => void;
  onRebook: (trip: TripDetail) => void;
}) {
  if (!trip) {
    return null;
  }

  const statusMeta = getStatusMeta(trip.status);
  const fare = trip.finalFare ?? trip.estimatedFare;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.modalScrim} onPress={onClose} />
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <View>
                <Text selectable style={styles.modalTitle}>Mã chuyến #{trip.tripId}</Text>
                <Text style={styles.modalSubtitle}>{formatTripDate(trip.requestedAt)}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusMeta.background }]}>
                <MaterialCommunityIcons name={statusMeta.icon} size={rs(24)} color={statusMeta.color} />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Lộ trình di chuyển</Text>
              <View style={styles.routeBlock}>
                <RouteLineDot color={palette.green} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>Điểm đón</Text>
                  <Text selectable style={styles.routeAddress} numberOfLines={3}>{trip.pickup.address}</Text>
                </View>
              </View>
              <View style={styles.routeConnectorTall} />
              <View style={styles.routeBlock}>
                <RouteLineDot color={palette.primary} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>Điểm đến</Text>
                  <Text selectable style={styles.routeAddress} numberOfLines={3}>{trip.dropoff.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <InfoTile icon="cash" label="Giá tiền" value={formatCurrency(fare)} />
              <InfoTile icon="map-marker-distance" label="Quãng đường" value={formatDistance(trip.estimatedDistance)} />
              <InfoTile icon="clock-outline" label="Thời gian" value={formatDuration(trip.estimatedDuration)} />
              <InfoTile icon="receipt-text-outline" label="Trạng thái" value={statusMeta.label} />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Thông tin tài xế</Text>
              <InfoRow icon="account-outline" label="Tài xế" value={trip.driver?.fullName ?? 'Chưa có tài xế'} />
              <InfoRow icon="car-info" label="Biển số" value={trip.driver?.vehiclePlate ?? '--'} />
              <InfoRow icon="star-outline" label="Điểm tài xế" value={formatDriverRating(trip.driver?.averageRating)} />
            </View>

            <RatingSummary rating={trip.passengerRating} />

            <TouchableOpacity activeOpacity={0.88} style={styles.rebookButton} onPress={() => onRebook(trip)}>
              <MaterialCommunityIcons name="repeat" size={rs(30)} color="#ffffff" />
              <Text style={styles.rebookText}>Đặt lại</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoTile}>
      <MaterialCommunityIcons name={icon} size={rs(28)} color={palette.primary} />
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text selectable style={styles.infoTileValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <MaterialCommunityIcons name={icon} size={rs(27)} color={palette.primary} />
      </View>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text selectable style={styles.infoRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function RatingSummary({ rating }: { rating?: TripRating }) {
  if (!rating) {
    return (
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>đánh giá chuyến đi</Text>
        <Text style={styles.emptyRatingText}>Bạn chưa gửi đánh giá cho chuyến đi này.</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>đánh giá chuyến đi</Text>
      <View style={styles.ratingRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <MaterialCommunityIcons
            key={index}
            name={index < rating.score ? 'star' : 'star-outline'}
            size={rs(30)}
            color={palette.amber}
          />
        ))}
        <Text style={styles.ratingScore}>{rating.score}/5</Text>
      </View>
      {rating.comment ? <Text selectable style={styles.ratingComment}>{rating.comment}</Text> : null}
      {rating.tags && rating.tags.length > 0 ? (
        <View style={styles.ratingTags}>
          {rating.tags.map((tag) => (
            <View key={tag} style={styles.ratingTag}>
              <Text style={styles.ratingTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: 'green' | 'danger' | 'primary';
}) {
  const color = tone === 'green' ? palette.green : tone === 'danger' ? palette.danger : palette.primary;
  const background = tone === 'green' ? palette.greenSoft : tone === 'danger' ? palette.dangerSoft : palette.primarySoft;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <MaterialCommunityIcons name={icon} size={rs(30)} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RouteLineDot({ color }: { color: string }) {
  return (
    <View style={[styles.routeDotOuter, { borderColor: color }]}>
      <View style={[styles.routeDotInner, { backgroundColor: color }]} />
    </View>
  );
}

function NavItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.navItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={rs(34)} color="#302d39" />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

function getStatusMeta(status: TripStatus): {
  label: string;
  color: string;
  background: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
} {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Hoàn tất', color: palette.green, background: palette.greenSoft, icon: 'check-circle-outline' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: palette.danger, background: palette.dangerSoft, icon: 'close-circle-outline' };
    case 'NO_DRIVER':
      return { label: 'Không có tài xế', color: palette.danger, background: palette.dangerSoft, icon: 'account-off-outline' };
    case 'ACCEPTED':
      return { label: 'Đã nhận', color: palette.blue, background: palette.blueSoft, icon: 'account-check-outline' };
    case 'ARRIVED':
      return { label: 'Tài xế đã đến', color: palette.blue, background: palette.blueSoft, icon: 'map-marker-check-outline' };
    case 'IN_PROGRESS':
      return { label: 'Đang đi', color: palette.amber, background: palette.amberSoft, icon: 'navigation-variant-outline' };
    case 'SEARCHING':
    default:
      return { label: 'Đang tìm', color: palette.amber, background: palette.amberSoft, icon: 'radar' };
  }
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function formatDistance(value?: number) {
  return typeof value === 'number' ? `${value.toFixed(1)} km` : '--';
}

function formatDuration(value?: number) {
  return typeof value === 'number' ? `${Math.round(value)} phút` : '--';
}

function formatDriverRating(value?: number) {
  return typeof value === 'number' ? value.toFixed(1) + '/5' : '--';
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTripDate(value?: string) {
  if (!value) {
    return 'Chưa có thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    marginTop: StatusBar.currentHeight,
  },
  content: {
    paddingTop: rvs(28),
    paddingBottom: rvs(26),
  },
  header: {
    marginBottom: rvs(30),
    paddingHorizontal: rs(36),
    minHeight: rs(82),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(18),
  },
  headerButton: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: palette.primary,
    fontSize: rf(48),
    lineHeight: rf(58),
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '500',
    textAlign: 'center',
  },
  heroCard: {
    minHeight: rvs(190),
    marginHorizontal: rs(36),
    marginBottom: rvs(26),
    borderRadius: rs(24),
    backgroundColor: palette.primaryMid,
    padding: rs(30),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1a0c75',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.27,
    shadowRadius: 10,
    elevation: 8,
  },
  heroOrb: {
    position: 'absolute',
    right: rs(-44),
    top: rvs(-58),
    width: rs(190),
    height: rs(190),
    borderRadius: rs(95),
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroIcon: {
    width: rs(98),
    height: rs(98),
    borderRadius: rs(28),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(25),
  },
  heroCopy: {
    flex: 1,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '700',
    marginBottom: rvs(6),
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: rf(39),
    lineHeight: rf(48),
    fontWeight: '900',
    marginBottom: rvs(8),
  },
  heroText: {
    color: '#ffffff',
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '500',
  },
  statsRow: {
    marginHorizontal: rs(36),
    marginBottom: rvs(34),
    flexDirection: 'row',
    gap: rs(16),
  },
  statCard: {
    flex: 1,
    minHeight: rvs(145),
    borderRadius: rs(20),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rvs(18),
    ...shadow,
  },
  statIcon: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(10),
  },
  statValue: {
    color: palette.text,
    fontSize: rf(34),
    lineHeight: rf(42),
    fontWeight: '900',
  },
  statLabel: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(27),
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(31),
    lineHeight: rf(39),
    fontWeight: '900',
  },
  sectionHint: {
    color: palette.muted,
    fontSize: rf(22),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  stateCard: {
    minHeight: rvs(285),
    marginHorizontal: rs(36),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(34),
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  stateIcon: {
    width: rs(82),
    height: rs(82),
    borderRadius: rs(41),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(18),
  },
  stateIconDanger: {
    backgroundColor: palette.dangerSoft,
  },
  stateTitle: {
    color: palette.text,
    fontSize: rf(30),
    lineHeight: rf(38),
    fontWeight: '900',
    marginTop: rvs(16),
    marginBottom: rvs(8),
    textAlign: 'center',
  },
  stateText: {
    color: palette.muted,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    minWidth: rs(190),
    height: rvs(66),
    borderRadius: rs(14),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rvs(24),
    paddingHorizontal: rs(24),
  },
  retryText: {
    color: '#ffffff',
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '800',
  },
  tripList: {
    paddingHorizontal: rs(36),
    gap: rvs(20),
  },
  tripCard: {
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(28),
    ...shadow,
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rs(18),
    marginBottom: rvs(24),
  },
  tripId: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '900',
  },
  tripDate: {
    color: palette.muted,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '600',
    marginTop: rvs(4),
  },
  statusPill: {
    minHeight: rvs(48),
    borderRadius: rs(24),
    paddingHorizontal: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  statusText: {
    fontSize: rf(21),
    lineHeight: rf(28),
    fontWeight: '900',
  },
  routeBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDotOuter: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(17),
    borderWidth: rs(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rvs(5),
    marginRight: rs(20),
  },
  routeDotInner: {
    width: rs(13),
    height: rs(13),
    borderRadius: rs(7),
  },
  routeCopy: {
    flex: 1,
  },
  routeLabel: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(28),
    fontWeight: '800',
    marginBottom: rvs(3),
  },
  routeAddress: {
    color: palette.text,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '700',
  },
  routeConnector: {
    width: 1,
    height: rvs(28),
    backgroundColor: palette.line,
    marginLeft: rs(16),
    marginVertical: rvs(5),
  },
  tripDivider: {
    height: 1,
    backgroundColor: palette.line,
    marginVertical: rvs(24),
  },
  tripMetaRow: {
    flexDirection: 'row',
    gap: rs(18),
    marginBottom: rvs(14),
  },
  metaItem: {
    flex: 1,
    minHeight: rvs(72),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  metaCopy: {
    flex: 1,
  },
  metaLabel: {
    color: palette.muted,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '800',
  },
  metaValue: {
    color: palette.text,
    fontSize: rf(22),
    lineHeight: rf(29),
    fontWeight: '900',
  },

  compactRouteBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  compactFooter: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    marginTop: rvs(24),
    paddingTop: rvs(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(16),
  },
  compactMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  compactMetaText: {
    flex: 1,
    color: palette.muted,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '700',
  },
  compactFareWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  compactFare: {
    color: palette.primary,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '900',
  },
  routeConnectorTall: {
    width: 1,
    height: rvs(34),
    backgroundColor: palette.line,
    marginLeft: rs(16),
    marginVertical: rvs(5),
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,17,20,0.42)',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: rs(30),
    borderTopRightRadius: rs(30),
    backgroundColor: palette.background,
    overflow: 'hidden',
  },
  modalContent: {
    paddingHorizontal: rs(36),
    paddingTop: rvs(18),
    paddingBottom: rvs(42),
    gap: rvs(20),
  },
  modalGrabber: {
    alignSelf: 'center',
    width: rs(78),
    height: rvs(7),
    borderRadius: rs(4),
    backgroundColor: '#d5cde5',
    marginBottom: rvs(8),
  },
  modalHeader: {
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(24),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rs(16),
    ...shadow,
  },
  modalTitle: {
    color: palette.text,
    fontSize: rf(32),
    lineHeight: rf(40),
    fontWeight: '900',
  },
  modalSubtitle: {
    color: palette.muted,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '600',
    marginTop: rvs(4),
  },
  detailSection: {
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(26),
    ...shadow,
  },
  detailSectionTitle: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '900',
    marginBottom: rvs(18),
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(16),
  },
  infoTile: {
    width: '47.5%',
    minHeight: rvs(128),
    borderRadius: rs(20),
    backgroundColor: palette.card,
    padding: rs(20),
    justifyContent: 'center',
    ...shadow,
  },
  infoTileLabel: {
    color: palette.muted,
    fontSize: rf(20),
    lineHeight: rf(26),
    fontWeight: '800',
    marginTop: rvs(8),
  },
  infoTileValue: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '900',
    marginTop: rvs(3),
  },
  infoRow: {
    minHeight: rvs(72),
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: rvs(14),
    marginTop: rvs(14),
    gap: rs(12),
  },
  infoRowIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowLabel: {
    width: rs(130),
    color: palette.muted,
    fontSize: rf(22),
    lineHeight: rf(29),
    fontWeight: '800',
  },
  infoRowValue: {
    flex: 1,
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyRatingText: {
    color: palette.muted,
    fontSize: rf(24),
    lineHeight: rf(32),
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    marginBottom: rvs(14),
  },
  ratingScore: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '900',
    marginLeft: rs(8),
  },
  ratingComment: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(33),
    fontWeight: '600',
  },
  ratingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
    marginTop: rvs(16),
  },
  ratingTag: {
    borderRadius: rs(999),
    backgroundColor: palette.amberSoft,
    paddingHorizontal: rs(16),
    paddingVertical: rvs(8),
  },
  ratingTagText: {
    color: palette.amber,
    fontSize: rf(20),
    lineHeight: rf(26),
    fontWeight: '900',
  },
  rebookButton: {
    minHeight: rvs(76),
    borderRadius: rs(18),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
  },
  rebookText: {
    color: '#ffffff',
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '900',
  },
  bottomSpacer: {
    height: rvs(170),
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: rvs(128),
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: rvs(13),
    paddingHorizontal: rs(20),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navActive: {
    width: rs(136),
    height: rvs(92),
    borderRadius: rs(46),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveText: {
    color: '#9a8fee',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '600',
    marginTop: 2,
  },
  navItem: {
    minWidth: rs(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#302d39',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '500',
    marginTop: 5,
  },
});
