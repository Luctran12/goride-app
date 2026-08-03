import { rf, rs, rvs } from '@/constants/responsive';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#FCF8FF',
  white: '#FFFFFF',
  purple: '#1D0796',
  purpleSoft: '#F1ECFB',
  ink: '#111114',
  muted: '#68646E',
  green: '#00B875',
  greenDark: '#053F2A',
  greenSoft: '#E2F8EE',
};

const shadow = {
  shadowColor: '#695A91',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 26,
  elevation: 8,
};

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.purpleGlow} />
        <View style={styles.greenGlow} />
        <View style={styles.routeLine} />
        <View style={styles.routeDot} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(40)} color={colors.purple} />
            </View>
            <View>
              <Text style={styles.brandName}>GoRide</Text>
              <Text style={styles.brandTagline}>Đi đâu cũng tiện</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrowText}>SẴN SÀNG ĐỒNG HÀNH</Text>
            </View>
            <Text style={styles.title}>Bạn muốn sử dụng{'\n'}GoRide như thế nào?</Text>
            <Text style={styles.subtitle}>Chọn vai trò phù hợp để bắt đầu hành trình của bạn.</Text>
          </View>

          <View style={styles.roleList}>
            <RoleCard
              variant="customer"
              badge="ĐẶT CHUYẾN"
              title="Tôi là khách hàng"
              description="Đặt xe nhanh chóng, theo dõi hành trình và thanh toán thuận tiện."
              action="Tiếp tục đặt xe"
              onPress={() => router.push('/(customer)/login')}
            />
            <RoleCard
              variant="driver"
              badge="ĐỐI TÁC TÀI XẾ"
              title="Tôi là tài xế"
              description="Chủ động thời gian, nhận cuốc phù hợp và theo dõi thu nhập mỗi ngày."
              action="Tiếp tục nhận cuốc"
              onPress={() => router.push('/(driver)/login' as never)}
            />
          </View>

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="shield-check-outline" size={rs(27)} color={colors.muted} />
            <Text style={styles.footerText}>Thông tin của bạn luôn được bảo mật trên GoRide</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({
  variant,
  badge,
  title,
  description,
  action,
  onPress,
}: {
  variant: 'customer' | 'driver';
  badge: string;
  title: string;
  description: string;
  action: string;
  onPress: () => void;
}) {
  const isCustomer = variant === 'customer';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tiếp tục với vai trò ${isCustomer ? 'khách hàng' : 'tài xế'}`}
      accessibilityHint={isCustomer ? 'Mở màn hình đăng nhập để đặt xe' : 'Mở màn hình đăng nhập dành cho đối tác tài xế'}
      android_ripple={{ color: isCustomer ? 'rgba(255,255,255,0.18)' : 'rgba(0,184,117,0.12)' }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        isCustomer ? styles.customerCard : styles.driverCard,
        pressed && styles.pressedCard,
      ]}
    >
      {isCustomer ? <View style={styles.cardGlow} /> : null}

      <View style={styles.cardTopRow}>
        <View style={[styles.roleIcon, isCustomer ? styles.customerIcon : styles.driverIcon]}>
          <MaterialCommunityIcons
            name={isCustomer ? 'account-outline' : 'steering'}
            size={rs(45)}
            color={isCustomer ? colors.purple : colors.greenDark}
          />
        </View>
        <View style={[styles.roleBadge, isCustomer ? styles.customerBadge : styles.driverBadge]}>
          {isCustomer ? (
            <MaterialCommunityIcons name="motorbike" size={rs(24)} color={colors.white} />
          ) : (
            <View style={styles.driverDot} />
          )}
          <Text style={[styles.badgeText, isCustomer ? styles.customerBadgeText : styles.driverBadgeText]}>
            {badge}
          </Text>
        </View>
      </View>

      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, isCustomer ? styles.customerText : styles.driverText]}>{title}</Text>
        <Text style={[styles.cardDescription, isCustomer ? styles.customerDescription : styles.driverDescription]}>
          {description}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.actionText, isCustomer ? styles.customerText : styles.driverText]}>{action}</Text>
        <View style={[styles.arrow, isCustomer ? styles.customerArrow : styles.driverArrow]}>
          <Feather name="arrow-up-right" size={rs(28)} color={isCustomer ? colors.purple : colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  decorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  purpleGlow: {
    position: 'absolute',
    top: rvs(-130),
    right: rs(-120),
    width: rs(360),
    height: rs(360),
    borderRadius: rs(180),
    backgroundColor: '#EEE7FB',
  },
  greenGlow: {
    position: 'absolute',
    bottom: rvs(-170),
    left: rs(-150),
    width: rs(420),
    height: rs(420),
    borderRadius: rs(210),
    backgroundColor: '#E0F7EC',
  },
  routeLine: {
    position: 'absolute',
    top: rvs(52),
    right: rs(70),
    width: rs(90),
    height: rs(90),
    borderLeftWidth: rs(2),
    borderBottomWidth: rs(2),
    borderColor: 'rgba(29,7,150,0.08)',
    borderBottomLeftRadius: rs(48),
    transform: [{ rotate: '-18deg' }],
  },
  routeDot: {
    position: 'absolute',
    top: rvs(139),
    right: rs(147),
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
    backgroundColor: 'rgba(29,7,150,0.13)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: rs(36),
    paddingTop: rvs(26),
    paddingBottom: rvs(30),
  },
  content: {
    width: '100%',
    maxWidth: rs(680),
    flexGrow: 1,
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: rs(76),
    height: rs(76),
    marginRight: rs(18),
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: rs(1),
    borderColor: '#DDD3F4',
    ...shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
  },
  brandName: {
    color: colors.purple,
    fontSize: rf(31),
    lineHeight: rf(34),
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  brandTagline: {
    marginTop: rvs(2),
    color: colors.muted,
    fontSize: rf(20),
    fontWeight: '600',
  },
  hero: {
    marginTop: rvs(52),
    marginBottom: rvs(38),
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(18),
    paddingVertical: rvs(10),
    borderRadius: rs(99),
    backgroundColor: colors.purpleSoft,
  },
  liveDot: {
    width: rs(10),
    height: rs(10),
    marginRight: rs(11),
    borderRadius: rs(5),
    backgroundColor: colors.green,
  },
  eyebrowText: {
    color: colors.purple,
    fontSize: rf(18),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: rvs(18),
    color: colors.ink,
    fontSize: rf(52),
    lineHeight: rf(62),
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  subtitle: {
    marginTop: rvs(14),
    maxWidth: rs(560),
    color: colors.muted,
    fontSize: rf(25),
    lineHeight: rf(36),
    fontWeight: '500',
  },
  roleList: {
    gap: rvs(24),
  },
  roleCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: rvs(285),
    padding: rs(30),
    borderRadius: rs(36),
    ...shadow,
  },
  customerCard: {
    backgroundColor: colors.purple,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderWidth: rs(2),
    borderColor: '#BDEBD7',
    shadowColor: '#3D8065',
    shadowOpacity: 0.09,
  },
  pressedCard: {
    opacity: 0.93,
    transform: [{ scale: 0.985 }],
  },
  cardGlow: {
    position: 'absolute',
    top: rs(-80),
    right: rs(-55),
    width: rs(260),
    height: rs(260),
    borderRadius: rs(130),
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleIcon: {
    width: rs(78),
    height: rs(78),
    borderRadius: rs(25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerIcon: {
    backgroundColor: colors.white,
  },
  driverIcon: {
    backgroundColor: colors.greenSoft,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(10),
    borderRadius: rs(99),
  },
  customerBadge: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  driverBadge: {
    backgroundColor: colors.greenSoft,
  },
  driverDot: {
    width: rs(9),
    height: rs(9),
    borderRadius: rs(5),
    backgroundColor: colors.green,
  },
  badgeText: {
    fontSize: rf(17),
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  customerBadgeText: {
    color: colors.white,
  },
  driverBadgeText: {
    color: colors.greenDark,
  },
  cardCopy: {
    marginTop: rvs(24),
  },
  cardTitle: {
    fontSize: rf(34),
    lineHeight: rf(42),
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  cardDescription: {
    marginTop: rvs(8),
    maxWidth: rs(540),
    fontSize: rf(22),
    lineHeight: rf(32),
    fontWeight: '500',
  },
  customerText: {
    color: colors.white,
  },
  driverText: {
    color: colors.greenDark,
  },
  customerDescription: {
    color: 'rgba(255,255,255,0.75)',
  },
  driverDescription: {
    color: colors.muted,
  },
  actionRow: {
    marginTop: rvs(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: rf(22),
    fontWeight: '800',
  },
  arrow: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerArrow: {
    backgroundColor: colors.white,
  },
  driverArrow: {
    backgroundColor: colors.greenDark,
  },
  footerNote: {
    marginTop: 'auto',
    paddingTop: rvs(32),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginLeft: rs(10),
    color: colors.muted,
    fontSize: rf(19),
    lineHeight: rf(26),
    fontWeight: '600',
    textAlign: 'center',
  },
});
