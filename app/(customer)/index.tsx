import { rf, rs, rvs } from '@/constants/responsive';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useLanguage } from '@/lib/i18n';
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
  background: '#F6F7FC',
  card: '#ffffff',
  primary: '#3F22D6',
  primaryDark: '#261294',
  primarySoft: '#F0ECFF',
  primaryMid: '#5B3BE2',
  text: '#0E0927',
  muted: '#625E7A',
  line: '#E7E3FA',
  danger: '#FF3B30',
  green: '#00C853',
  greenSoft: '#E8FADF',
};

const shadow = {
  shadowColor: '#2C1B85',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.09,
  shadowRadius: 22,
  elevation: 7,
};

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.profile}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/160?img=11' }}
                style={styles.avatar}
              />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.hello}>{t('customer.greeting')}</Text>
              <Text style={styles.name}>Thiện</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.82} style={styles.bellButton}>
            <Feather name="bell" size={rs(30)} color={palette.primary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickCard}>
          <TouchableOpacity activeOpacity={0.85} style={styles.searchBox} onPress={() => router.push('/(customer)/booking/pickup')}>
            <View style={styles.searchIconBox}>
              <Feather name="search" size={rs(32)} color={palette.card} />
            </View>
            <View style={styles.searchCopy}>
              <Text style={styles.searchText}>{t('customer.searchPlaceholder')}</Text>
              <Text style={styles.searchSubtext}>{t('customer.searchSubtext')}</Text>
            </View>
            <Feather name="chevron-right" size={rs(28)} color={palette.muted} />
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <ActionButton
              icon="motorbike"
              label={t('customer.bookMotorbike')}
              active
              onPress={() => router.push('/(customer)/booking/pickup')}
            />
            <ActionButton
              icon="car"
              label={t('customer.bookCar')}
              active
              onPress={() => router.push('/(customer)/booking/pickup')}
            />
            <ActionButton icon="history" label={t('customer.history')} onPress={() => router.push('/(customer)/activity')} />
            <ActionButton
              icon="wallet-outline"
              label={t('customer.payment')}
              onPress={() => router.push('/(customer)/billing')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('customer.promotionsForYou')}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(customer)/billing')}>
              <Text style={styles.seeAllText}>{t('customer.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoScroller}
          >
            <TouchableOpacity activeOpacity={0.9} style={styles.promoCard}>
              <View style={styles.promoOrb1} />
              <View style={styles.promoOrb2} />
              <View style={styles.codePill}>
                <Text style={styles.codeText}>Mã: GORIDE50</Text>
              </View>
              <Text style={styles.promoTitle}>{t('customer.promoFirstTripTitle')}</Text>
              <Text style={styles.promoText}>{t('customer.promoFirstTripDesc')}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.promoCardAlt}>
              <View style={styles.promoOrb1} />
              <View style={styles.codePillAlt}>
                <Text style={styles.codeTextAlt}>Mã: PEAKHOUR</Text>
              </View>
              <Text style={styles.promoTitleAlt}>{t('customer.promoPeakHourTitle')}</Text>
              <Text style={styles.promoTextAlt}>{t('customer.promoPeakHourDesc')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.recentCard}>
          <Text style={styles.recentHeading}>{t('customer.recentPlaces')}</Text>
          <RecentPlace
            icon="location"
            title="Landmark 81"
            detail="720A Điện Biên Phủ, Phường 22, Bình Thạnh"
          />
          <View style={styles.divider} />
          <RecentPlace
            icon="home"
            title={t('customer.home')}
            detail="123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <Feather name="home" size={rs(30)} color={palette.card} />
          <Text style={styles.navActiveText}>{t('customer.navHome')}</Text>
        </TouchableOpacity>
        <NavItem icon="history" label={t('customer.navActivity')} onPress={() => router.push('/(customer)/activity')} />
        <NavItem
          icon="wallet-outline"
          label={t('customer.navBilling')}
          onPress={() => router.push('/(customer)/billing')}
        />
        <NavItem
          icon="account-outline"
          label={t('customer.navAccount')}
          onPress={() => router.push('/(customer)/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
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
    <TouchableOpacity activeOpacity={0.82} style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionCircle, active && styles.actionCircleActive]}>
        <MaterialCommunityIcons
          name={icon}
          size={rs(40)}
          color={active ? palette.primary : palette.muted}
        />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecentPlace({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.placeRow}>
      <View style={styles.placeIcon}>
        <Ionicons name={icon} size={rs(28)} color={palette.primary} />
      </View>
      <View style={styles.placeCopy}>
        <Text style={styles.placeTitle}>{title}</Text>
        <Text style={styles.placeDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={rs(24)} color="#B8B4D0" />
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
      <MaterialCommunityIcons name={icon} size={rs(32)} color={palette.muted} />
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
    paddingTop: rvs(24),
    paddingBottom: rvs(26),
  },
  header: {
    marginBottom: rvs(24),
    paddingHorizontal: rs(36),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: rs(20),
  },
  avatar: {
    width: rs(84),
    height: rs(84),
    borderRadius: rs(42),
    borderWidth: rs(3),
    borderColor: palette.primarySoft,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: rs(20),
    height: rs(20),
    borderRadius: rs(10),
    backgroundColor: palette.green,
    borderWidth: 2,
    borderColor: palette.card,
  },
  profileText: {
    justifyContent: 'center',
  },
  hello: {
    color: palette.muted,
    fontSize: rf(24),
    lineHeight: rf(30),
    fontWeight: '600',
  },
  name: {
    color: palette.text,
    fontSize: rf(36),
    lineHeight: rf(44),
    fontWeight: '900',
  },
  bellButton: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadow,
  },
  bellDot: {
    position: 'absolute',
    top: rs(14),
    right: rs(14),
    width: rs(14),
    height: rs(14),
    borderRadius: rs(7),
    backgroundColor: palette.danger,
    borderWidth: 2,
    borderColor: palette.card,
  },
  quickCard: {
    marginHorizontal: rs(36),
    padding: rs(28),
    borderRadius: rs(32),
    backgroundColor: palette.card,
    marginBottom: rvs(36),
    ...shadow,
  },
  searchBox: {
    minHeight: rvs(110),
    borderRadius: rs(24),
    backgroundColor: '#F3EFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(24),
    marginBottom: rvs(36),
    borderWidth: 1.5,
    borderColor: '#E2D9FD',
  },
  searchIconBox: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(20),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(20),
  },
  searchCopy: {
    flex: 1,
  },
  searchText: {
    color: palette.text,
    fontSize: rf(26),
    lineHeight: rf(32),
    fontWeight: '800',
  },
  searchSubtext: {
    color: palette.muted,
    fontSize: rf(20),
    lineHeight: rf(26),
    fontWeight: '500',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '23%',
    alignItems: 'center',
  },
  actionCircle: {
    width: rs(106),
    height: rs(106),
    borderRadius: rs(38),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F4FA',
    marginBottom: rvs(14),
  },
  actionCircleActive: {
    backgroundColor: palette.primarySoft,
  },
  actionLabel: {
    color: palette.text,
    fontSize: rf(22),
    lineHeight: rf(28),
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    marginBottom: rvs(44),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(36),
    marginBottom: rvs(20),
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '900',
  },
  seeAllText: {
    color: palette.primary,
    fontSize: rf(22),
    fontWeight: '800',
  },
  promoScroller: {
    paddingHorizontal: rs(36),
    gap: rs(24),
  },
  promoCard: {
    width: rs(500),
    minHeight: rvs(200),
    borderRadius: rs(28),
    backgroundColor: palette.primaryMid,
    paddingHorizontal: rs(30),
    paddingVertical: rvs(30),
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#3F22D6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  promoCardAlt: {
    width: rs(440),
    minHeight: rvs(200),
    borderRadius: rs(28),
    backgroundColor: '#0E0927',
    paddingHorizontal: rs(30),
    paddingVertical: rvs(30),
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  promoOrb1: {
    position: 'absolute',
    right: rs(-30),
    top: rvs(-40),
    width: rs(160),
    height: rs(160),
    borderRadius: rs(80),
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  promoOrb2: {
    position: 'absolute',
    left: rs(-30),
    bottom: rvs(-50),
    width: rs(140),
    height: rs(140),
    borderRadius: rs(70),
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  codePill: {
    alignSelf: 'flex-start',
    borderRadius: rs(10),
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: rs(16),
    paddingVertical: rvs(7),
    marginBottom: rvs(14),
  },
  codeText: {
    color: '#ffffff',
    fontSize: rf(20),
    fontWeight: '900',
  },
  codePillAlt: {
    alignSelf: 'flex-start',
    borderRadius: rs(10),
    backgroundColor: 'rgba(255,149,0,0.25)',
    paddingHorizontal: rs(16),
    paddingVertical: rvs(7),
    marginBottom: rvs(14),
  },
  codeTextAlt: {
    color: '#FF9500',
    fontSize: rf(20),
    fontWeight: '900',
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: rf(28),
    lineHeight: rf(34),
    fontWeight: '900',
    marginBottom: rvs(6),
  },
  promoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(22),
    lineHeight: rf(28),
    fontWeight: '500',
  },
  promoTitleAlt: {
    color: '#ffffff',
    fontSize: rf(28),
    lineHeight: rf(34),
    fontWeight: '900',
    marginBottom: rvs(6),
  },
  promoTextAlt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(22),
    lineHeight: rf(28),
    fontWeight: '500',
  },
  recentCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(28),
    backgroundColor: palette.card,
    paddingHorizontal: rs(28),
    paddingTop: rvs(28),
    paddingBottom: rvs(28),
    ...shadow,
  },
  recentHeading: {
    color: palette.text,
    fontSize: rf(28),
    lineHeight: rf(35),
    fontWeight: '900',
    marginBottom: rvs(24),
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rvs(8),
  },
  placeIcon: {
    width: rs(68),
    height: rs(68),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginRight: rs(20),
  },
  placeCopy: {
    flex: 1,
  },
  placeTitle: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(30),
    fontWeight: '800',
  },
  placeDetail: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(27),
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginLeft: rs(88),
    marginVertical: rvs(20),
  },
  bottomSpacer: {
    height: rvs(150),
  },
  bottomNav: {
    position: 'absolute',
    left: rs(20),
    right: rs(20),
    bottom: rvs(16),
    height: rvs(100),
    borderRadius: rs(32),
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: rs(16),
    borderWidth: 1,
    borderColor: '#E8E5FA',
    ...shadow,
  },
  navActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(24),
    paddingVertical: rvs(14),
    borderRadius: rs(24),
    backgroundColor: palette.primary,
  },
  navActiveText: {
    color: palette.card,
    fontSize: rf(22),
    fontWeight: '800',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(2),
  },
  navText: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '700',
  },
});
