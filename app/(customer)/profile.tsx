import { rf, rs, rvs } from '@/constants/responsive';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
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
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#c91c1c',
  dangerSoft: '#fdeaea',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.11,
  shadowRadius: 18,
  elevation: 6,
};

const menuItems: MenuItemProps[] = [
  { icon: 'account-outline', label: 'Thông tin cá nhân' },
  { icon: 'history', label: 'Lịch sử chuyến đi' },
  { icon: 'cash-multiple', label: 'Thanh toán', route: '/(customer)/billing' },
  { icon: 'ticket-percent-outline', label: 'Voucher của tôi' },
  { icon: 'heart-outline', label: 'Địa chỉ yêu thích' },
  { icon: 'cog-outline', label: 'Cài đặt' },
  { icon: 'help-circle-outline', label: 'Trung tâm trợ giúp' },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Cá Nhân</Text>

        <View style={styles.profileCard}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/240?img=12' }}
            style={styles.avatar}
          />
          <View style={styles.profileCopy}>
            <Text style={styles.name}>Thiện</Text>
            <Text style={styles.contact}>+84 987 654 321</Text>
            <Text style={styles.contact} numberOfLines={1}>
              thien.nguyen@example.com
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => {
            const route = item.route;

            return (
              <MenuItem
                key={item.label}
                {...item}
                isLast={index === menuItems.length - 1}
                onPress={route ? () => router.push(route) : undefined}
              />
            );
          })}

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.logoutRow}
            onPress={() => router.replace('/(customer)/login')}
          >
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <MaterialCommunityIcons name="logout" size={rs(34)} color={palette.danger} />
            </View>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" label="Home" onPress={() => router.push('/(customer)')} />
        <NavItem icon="history" label="Activity" />
        <NavItem
          icon="cash-multiple"
          label="Payment"
          onPress={() => router.push('/billing')}
        />
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <MaterialCommunityIcons name="account-outline" size={rs(34)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

type MenuItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  route?: Href;
  isLast?: boolean;
  onPress?: () => void;
};

function MenuItem({ icon, label, isLast = false, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <MaterialCommunityIcons name={icon} size={rs(34)} color={palette.primary} />
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Feather name="chevron-right" size={rs(34)} color="#777582" />
    </TouchableOpacity>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: rvs(33),
    paddingBottom: rvs(26),
  },
  title: {
    color: palette.primary,
    fontSize: rf(48),
    lineHeight: rf(58),
    fontWeight: '800',
    paddingHorizontal: rs(36),
    marginBottom: rvs(32),
  },
  profileCard: {
    minHeight: rvs(232),
    marginHorizontal: rs(36),
    marginBottom: rvs(43),
    borderRadius: rs(20),
    backgroundColor: palette.card,
    paddingHorizontal: rs(44),
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  avatar: {
    width: rs(142),
    height: rs(142),
    borderRadius: rs(71),
    borderWidth: rs(3),
    borderColor: palette.primary,
    marginRight: rs(45),
  },
  profileCopy: {
    flex: 1,
  },
  name: {
    color: palette.text,
    fontSize: rf(35),
    lineHeight: rf(43),
    fontWeight: '800',
    marginBottom: rvs(13),
  },
  contact: {
    color: palette.muted,
    fontSize: rf(29),
    lineHeight: rf(39),
    fontWeight: '400',
  },
  menuCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    overflow: 'hidden',
    ...shadow,
  },
  menuRow: {
    minHeight: rvs(132),
    paddingHorizontal: rs(29),
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  menuRowLast: {
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(29),
  },
  menuText: {
    flex: 1,
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  logoutRow: {
    minHeight: rvs(126),
    paddingHorizontal: rs(29),
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    backgroundColor: palette.dangerSoft,
  },
  logoutText: {
    color: palette.danger,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  bottomSpacer: {
    height: rvs(150),
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
