import { rf, rs, rvs } from '@/constants/responsive';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/ui/language-toggle';

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
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.purpleGlow} />
        <View style={styles.greenGlow} />
        <View style={styles.routeLine} />
        <View style={styles.routeDot} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(32)} color={colors.purple} />
            </View>
            <View>
              <Text style={styles.brandName}>GoRide</Text>
              <Text style={styles.brandTagline}>{t('roleSelection.tagline')}</Text>
            </View>
            <LanguageToggle />
          </View>

          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrowText}>{t('roleSelection.eyebrow')}</Text>
            </View>
            <Text style={styles.title}>{t('roleSelection.title')}</Text>
            <Text style={styles.subtitle}>{t('roleSelection.subtitle')}</Text>
          </View>

          <View style={styles.roleList}>
            <RoleCard
              variant="customer"
              badge={t('roleSelection.customerBadge')}
              title={t('roleSelection.customerTitle')}
              description={t('roleSelection.customerDesc')}
              action={t('roleSelection.customerAction')}
              onPress={() => router.push('/(customer)/login')}
            />
            <RoleCard
              variant="driver"
              badge={t('roleSelection.driverBadge')}
              title={t('roleSelection.driverTitle')}
              description={t('roleSelection.driverDesc')}
              action={t('roleSelection.driverAction')}
              onPress={() => router.push('/(driver)/login' as never)}
            />
          </View>

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="shield-check-outline" size={rs(22)} color={colors.muted} />
            <Text style={styles.footerText}>{t('roleSelection.securityNote')}</Text>
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
  const { t } = useLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(isCustomer ? 'roleSelection.customerA11yLabel' : 'roleSelection.driverA11yLabel')}
      accessibilityHint={t(isCustomer ? 'roleSelection.customerA11yHint' : 'roleSelection.driverA11yHint')}
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
            size={rs(44)}
            color={isCustomer ? colors.purple : colors.greenDark}
          />
        </View>
        <View style={[styles.roleBadge, isCustomer ? styles.customerBadge : styles.driverBadge]}>
          {isCustomer ? (
            <MaterialCommunityIcons name="motorbike" size={rs(23)} color={colors.white} />
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
    top: rvs(-90),
    right: rs(-80),
    width: rs(340),
    height: rs(340),
    borderRadius: rs(170),
    backgroundColor: '#EEE7FB',
  },
  greenGlow: {
    position: 'absolute',
    bottom: rvs(-110),
    left: rs(-100),
    width: rs(360),
    height: rs(360),
    borderRadius: rs(180),
    backgroundColor: '#E0F7EC',
  },
  routeLine: {
    position: 'absolute',
    top: rvs(46),
    right: rs(58),
    width: rs(76),
    height: rs(76),
    borderLeftWidth: rs(2),
    borderBottomWidth: rs(2),
    borderColor: 'rgba(29,7,150,0.08)',
    borderBottomLeftRadius: rs(40),
    transform: [{ rotate: '-18deg' }],
  },
  routeDot: {
    position: 'absolute',
    top: rvs(118),
    right: rs(125),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: 'rgba(29,7,150,0.13)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: rs(28),
    paddingTop: rvs(14),
    paddingBottom: rvs(16),
  },
  content: {
    width: '100%',
    maxWidth: rs(640),
    flex: 1,
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandMark: {
    width: rs(58),
    height: rs(58),
    marginRight: rs(14),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: rs(1),
    borderColor: '#DDD3F4',
    ...shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  brandName: {
    color: colors.purple,
    fontSize: rf(29),
    lineHeight: rf(32),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTagline: {
    marginTop: rvs(1),
    color: colors.muted,
    fontSize: rf(17),
    fontWeight: '600',
  },
  hero: {
    marginTop: rvs(18),
    marginBottom: rvs(18),
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rvs(6),
    borderRadius: rs(99),
    backgroundColor: colors.purpleSoft,
  },
  liveDot: {
    width: rs(8),
    height: rs(8),
    marginRight: rs(9),
    borderRadius: rs(4),
    backgroundColor: colors.green,
  },
  eyebrowText: {
    color: colors.purple,
    fontSize: rf(15),
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: rvs(10),
    color: colors.ink,
    fontSize: rf(40),
    lineHeight: rf(48),
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: rvs(6),
    maxWidth: rs(560),
    color: colors.muted,
    fontSize: rf(20),
    lineHeight: rf(28),
    fontWeight: '500',
  },
  roleList: {
    gap: rvs(58),
  },
  roleCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: rs(32),
    paddingVertical: rvs(28),
    borderRadius: rs(30),
    ...shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 22,
    elevation: 6,
  },
  customerCard: {
    backgroundColor: colors.purple,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderWidth: rs(1.5),
    borderColor: '#BDEBD7',
    shadowColor: '#3D8065',
    shadowOpacity: 0.08,
  },
  pressedCard: {
    opacity: 0.93,
    transform: [{ scale: 0.985 }],
  },
  cardGlow: {
    position: 'absolute',
    top: rs(-70),
    right: rs(-45),
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
    width: rs(72),
    height: rs(72),
    borderRadius: rs(22),
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
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(8),
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
    letterSpacing: 0.6,
  },
  customerBadgeText: {
    color: colors.white,
  },
  driverBadgeText: {
    color: colors.greenDark,
  },
  cardCopy: {
    marginTop: rvs(16),
  },
  cardTitle: {
    fontSize: rf(34),
    lineHeight: rf(42),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardDescription: {
    marginTop: rvs(6),
    maxWidth: rs(540),
    fontSize: rf(20),
    lineHeight: rf(28),
    fontWeight: '500',
  },
  customerText: {
    color: colors.white,
  },
  driverText: {
    color: colors.greenDark,
  },
  customerDescription: {
    color: 'rgba(255,255,255,0.78)',
  },
  driverDescription: {
    color: colors.muted,
  },
  actionRow: {
    marginTop: rvs(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: rf(21),
    fontWeight: '800',
  },
  arrow: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(15),
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
    paddingTop: rvs(18),
    paddingBottom: rvs(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginLeft: rs(8),
    color: colors.muted,
    fontSize: rf(15),
    lineHeight: rf(22),
    fontWeight: '600',
    textAlign: 'center',
  },
});
