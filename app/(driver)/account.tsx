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
  greenSoft: '#d8f6e8',
  mint: '#6df0a7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#edf4ff',
  amber: '#f59e0b',
  danger: '#f02d3a',
  dangerSoft: '#fff0f0',
};

const driverProfile = {
  name: 'Trần Minh Khoa',
  phone: '0901234567',
  rating: 4.8,
  totalTrips: 248,
  avatarUrl: 'https://i.pravatar.cc/160?img=12',
  vehicle: {
    type: 'Xe máy',
    model: 'Honda Air Blade',
    plate: '59A1-123.45',
  },
  documents: [
    { id: 'license', title: 'GPLX', updatedAt: '12/05/2023', status: 'Đã duyệt' },
    { id: 'identity', title: 'CCCD', updatedAt: '10/05/2023', status: 'Đã duyệt' },
  ],
};

export default function DriverAccountScreen() {
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
          <View style={styles.headerTitleWrap}>
            <Image source={{ uri: driverProfile.avatarUrl }} style={styles.headerAvatar} contentFit="cover" />
            <Text style={styles.headerTitle}>Tài khoản</Text>
          </View>

          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed ? styles.pressedButton : null]}>
            <MaterialCommunityIcons name="cog-outline" size={rs(34)} color={palette.blueInk} />
          </Pressable>
        </View>

        <View style={styles.approvalCard}>
          <View style={styles.approvalTitleRow}>
            <MaterialCommunityIcons name="check-decagram" size={rs(24)} color={palette.green} />
            <Text style={styles.approvalTitle}>Hồ sơ đã được duyệt</Text>
          </View>
          <Text style={styles.approvalText}>Bạn có thể bật online để nhận cuốc ngay bây giờ.</Text>
        </View>

        <View style={styles.profileCard}>
          <Image source={{ uri: driverProfile.avatarUrl }} style={styles.profileAvatar} contentFit="cover" />
          <View style={styles.profileCopy}>
            <Text selectable style={styles.profileName}>{driverProfile.name}</Text>
            <Text selectable style={styles.profilePhone}>{driverProfile.phone}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard value={driverProfile.rating.toFixed(1)} label="Đánh giá" showStar />
          <StatCard value={driverProfile.totalTrips.toString()} label="Tổng cuốc" />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="motorbike" size={rs(25)} color={palette.blueInk} />
            <Text style={styles.sectionTitle}>Thông tin phương tiện</Text>
          </View>
          <InfoRow label="Loại xe" value={driverProfile.vehicle.type} />
          <InfoRow label="Dòng xe" value={driverProfile.vehicle.model} />
          <InfoRow label="Biển số" value={driverProfile.vehicle.plate} badge />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-document-outline" size={rs(25)} color={palette.blueInk} />
            <Text style={styles.sectionTitle}>Giấy tờ tùy thân</Text>
          </View>
          {driverProfile.documents.map((document, index) => (
            <DocumentRow
              key={document.id}
              title={document.title}
              updatedAt={document.updatedAt}
              status={document.status}
              divided={index > 0}
            />
          ))}
        </View>

        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.logoutButton, pressed ? styles.pressedButton : null]}>
          <MaterialCommunityIcons name="logout" size={rs(24)} color={palette.danger} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant-outline" label="Home" onPress={() => router.push('/(driver)')} />
        <DriverNavItem icon="cash-multiple" label="Earnings" onPress={() => router.push('./earnings')} />
        <DriverNavItem icon="history" label="Activity" onPress={() => router.push('./activity')} />
        <DriverNavItem icon="account" label="Account" active />
      </View>
    </SafeAreaView>
  );
}

function StatCard({ value, label, showStar = false }: { value: string; label: string; showStar?: boolean }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statValueRow}>
        <Text selectable style={styles.statValue}>{value}</Text>
        {showStar ? <MaterialCommunityIcons name="star" size={rs(24)} color={palette.amber} /> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {badge ? (
        <View style={styles.plateBadge}>
          <Text selectable style={styles.plateText}>{value}</Text>
        </View>
      ) : (
        <Text selectable style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );
}

function DocumentRow({
  title,
  updatedAt,
  status,
  divided = false,
}: {
  title: string;
  updatedAt: string;
  status: string;
  divided?: boolean;
}) {
  return (
    <View style={[styles.documentRow, divided ? styles.documentRowDivided : null]}>
      <View style={styles.documentCopy}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text style={styles.documentDate}>Cập nhật: {updatedAt}</Text>
      </View>
      <View style={styles.documentStatus}>
        <MaterialCommunityIcons name="check-decagram" size={rs(16)} color={palette.greenDark} />
        <Text style={styles.documentStatusText}>{status}</Text>
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
    gap: rvs(16),
  },
  header: {
    minHeight: rvs(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  headerAvatar: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: palette.card,
  },
  headerTitle: {
    color: palette.blueInk,
    fontSize: rf(27),
    lineHeight: rf(34),
    fontWeight: '900',
  },
  iconButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalCard: {
    marginTop: rvs(24),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(22),
    paddingVertical: rvs(18),
    gap: rvs(8),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  approvalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  approvalTitle: {
    color: palette.green,
    fontSize: rf(21),
    lineHeight: rf(28),
    fontWeight: '900',
  },
  approvalText: {
    color: palette.muted,
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '700',
  },
  profileCard: {
    minHeight: rvs(102),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(22),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  profileAvatar: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(12),
    backgroundColor: '#d9e8df',
  },
  profileCopy: {
    flex: 1,
    gap: rvs(2),
  },
  profileName: {
    color: palette.ink,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '900',
  },
  profilePhone: {
    color: palette.blueInk,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: rs(14),
  },
  statCard: {
    flex: 1,
    minHeight: rvs(84),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(2),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: palette.ink,
    fontSize: rf(28),
    lineHeight: rf(35),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: palette.muted,
    fontSize: rf(14),
    lineHeight: rf(20),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoCard: {
    borderRadius: rs(12),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(20),
    paddingTop: rvs(18),
    paddingBottom: rvs(6),
    boxShadow: '0 6px 18px rgba(7, 24, 15, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    paddingBottom: rvs(12),
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: rf(20),
    lineHeight: rf(27),
    fontWeight: '900',
  },
  infoRow: {
    minHeight: rvs(48),
    borderTopWidth: 1,
    borderTopColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  infoLabel: {
    color: palette.muted,
    fontSize: rf(15),
    lineHeight: rf(21),
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    color: palette.ink,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '800',
    textAlign: 'right',
  },
  plateBadge: {
    minHeight: rvs(30),
    borderRadius: rs(8),
    backgroundColor: '#eef3f1',
    borderWidth: 1,
    borderColor: '#d3ddd8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(10),
  },
  plateText: {
    color: palette.blueInk,
    fontSize: rf(15),
    lineHeight: rf(20),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  documentRow: {
    minHeight: rvs(68),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(14),
  },
  documentRowDivided: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  documentCopy: {
    flex: 1,
    gap: rvs(2),
  },
  documentTitle: {
    color: palette.ink,
    fontSize: rf(17),
    lineHeight: rf(23),
    fontWeight: '900',
  },
  documentDate: {
    color: palette.muted,
    fontSize: rf(14),
    lineHeight: rf(20),
    fontWeight: '700',
  },
  documentStatus: {
    minHeight: rvs(26),
    borderRadius: rs(999),
    paddingHorizontal: rs(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: palette.greenSoft,
  },
  documentStatusText: {
    color: palette.greenDark,
    fontSize: rf(13),
    lineHeight: rf(18),
    fontWeight: '900',
  },
  logoutButton: {
    minHeight: rvs(52),
    borderRadius: rs(10),
    borderWidth: 1.5,
    borderColor: palette.danger,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  logoutText: {
    color: palette.danger,
    fontSize: rf(17),
    lineHeight: rf(23),
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
