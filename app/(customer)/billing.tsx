import { rf, rs, rvs } from '@/constants/responsive';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  green: '#00b67a',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 6,
};

const paymentMethods: PaymentMethodProps[] = [
  {
    icon: 'credit-card-outline',
    title: 'Techcombank **** 1234',
    detail: 'Thẻ tín dụng',
    isDefault: true,
  },
  {
    icon: 'wallet-outline',
    title: 'Ví MoMo',
    detail: 'Đã liên kết',
    detailColor: palette.green,
  },
  {
    icon: 'cash',
    title: 'Tiền mặt',
    detail: 'Thanh toán cho tài xế',
  },
];

export default function PaymentScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} style={styles.headerButton}>
            <Feather name="menu" size={rs(34)} color={palette.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Thanh toán</Text>

          <TouchableOpacity activeOpacity={0.82} style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/160?img=11' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        </View>

        <View style={styles.methodList}>
          {paymentMethods.map((method) => (
            <PaymentMethod key={method.title} {...method} />
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.82} style={styles.addMethod}>
          <Feather name="plus-circle" size={rs(34)} color={palette.primary} />
          <Text style={styles.addMethodText}>Thêm phương thức thanh toán</Text>
        </TouchableOpacity>

        <View style={styles.couponHeader}>
          <Text style={styles.sectionTitle}>Mã ưu đãi của tôi</Text>
          <TouchableOpacity activeOpacity={0.82}>
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.couponCard}>
          <View>
            <Text style={styles.couponTitle}>Giảm 20% chuyến đi</Text>
            <Text style={styles.couponDetail}>Tối đa 50k. Hết hạn: 30/11</Text>
          </View>

          <TouchableOpacity activeOpacity={0.86} style={styles.useButton}>
            <Text style={styles.useButtonText}>Sử dụng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" label="Home" onPress={() => router.push('/(customer)')} />
        <NavItem icon="history" label="Activity" />
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <MaterialCommunityIcons name="cash-multiple" size={rs(34)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Payment</Text>
        </TouchableOpacity>
        <NavItem
          icon="account-outline"
          label="Profile"
          onPress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

type PaymentMethodProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  detail: string;
  detailColor?: string;
  isDefault?: boolean;
};

function PaymentMethod({
  icon,
  title,
  detail,
  detailColor = palette.muted,
  isDefault = false,
}: PaymentMethodProps) {
  return (
    <TouchableOpacity activeOpacity={0.84} style={styles.methodCard}>
      <View style={styles.methodIcon}>
        <MaterialCommunityIcons name={icon} size={rs(36)} color={palette.primary} />
      </View>

      <View style={styles.methodCopy}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={[styles.methodDetail, { color: detailColor }]}>{detail}</Text>
      </View>

      {isDefault ? (
        <View style={styles.defaultPill}>
          <Text style={styles.defaultText}>Mặc định</Text>
        </View>
      ) : (
        <Feather name="more-vertical" size={rs(30)} color={palette.muted} />
      )}
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
    marginTop: StatusBar.currentHeight,
  },
  content: {
    paddingTop: rvs(28),
    paddingBottom: rvs(26),
  },
  header: {
    marginBottom: rvs(45),
    paddingHorizontal: rs(36),
    height: rs(70),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: rs(64),
    height: rs(64),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: palette.primary,
    fontSize: rf(48),
    lineHeight: rf(58),
    fontWeight: '800',
  },
  avatarWrap: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: '#f0efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(12),
  },
  sectionHeader: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(28),
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  methodList: {
    paddingHorizontal: rs(36),
    gap: rs(16),
    marginBottom: rvs(16),
  },
  methodCard: {
    minHeight: rvs(147),
    borderRadius: rs(20),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(29),
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  methodIcon: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(14),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(29),
  },
  methodCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  methodTitle: {
    color: palette.text,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDetail: {
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '400',
  },
  defaultPill: {
    borderRadius: rs(7),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(16),
    paddingVertical: rvs(10),
    marginLeft: rs(12),
  },
  defaultText: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  addMethod: {
    minHeight: rvs(103),
    marginHorizontal: rs(36),
    marginBottom: rvs(50),
    borderRadius: rs(20),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c9bedc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(18),
  },
  addMethodText: {
    color: palette.primary,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '700',
  },
  couponHeader: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(31),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  couponCard: {
    minHeight: rvs(158),
    marginHorizontal: rs(36),
    borderRadius: rs(21),
    backgroundColor: palette.primaryMid,
    paddingHorizontal: rs(36),
    paddingVertical: rvs(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1a0c75',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.27,
    shadowRadius: 10,
    elevation: 8,
  },
  couponTitle: {
    color: '#ffffff',
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
    marginBottom: rvs(8),
  },
  couponDetail: {
    color: '#ffffff',
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '400',
  },
  useButton: {
    width: rs(156),
    height: rvs(66),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: rs(20),
  },
  useButtonText: {
    color: palette.primary,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '700',
  },
  bottomSpacer: {
    height: rvs(200),
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
