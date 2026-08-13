import { rf, rs, rvs } from '@/constants/responsive';
import { logout as logoutAuth } from '@/lib/auth-api';
import { getMyProfile, type UserProfile } from '@/lib/user-api';
import { useLanguage } from '@/lib/i18n';
import { LanguageSelectorModal } from '@/components/ui/language-toggle';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
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
  background: '#f6f7fc',
  card: '#ffffff',
  primary: '#3f22d6',
  primarySoft: '#eeecfb',
  primaryDark: '#18113c',
  primaryMid: '#5a3fe6',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
};

const shadow = {
  shadowColor: '#3f22d6',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 5,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);
  const mountedRef = React.useRef(false);
  const hasLoadedProfileRef = React.useRef(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileRefreshing, setProfileRefreshing] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const loadProfile = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setProfileRefreshing(true);
    } else {
      setProfileLoading(true);
    }

    setProfileError(null);

    try {
      const nextProfile = await getMyProfile();

      if (mountedRef.current) {
        setProfile(nextProfile);
      }
    } catch (error) {
      if (mountedRef.current) {
        setProfileError(getErrorMessage(error, t));
      }
    } finally {
      if (mountedRef.current) {
        if (!silent) {
          setProfileLoading(false);
        }

        setProfileRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const silent = hasLoadedProfileRef.current;
      hasLoadedProfileRef.current = true;
      void loadProfile({ silent });

      return undefined;
    }, [loadProfile]),
  );

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    await logoutAuth();
    router.replace('/(customer)/login');
    setLoggingOut(false);
  }

  const displayName = profile?.fullName?.trim() || (profileLoading ? t('common.loading') : t('personal.defaultGuest'));
  const displayPhone = profile?.phone?.trim() || t('profile.noPhone');
  const displayEmail = profile?.email?.trim() || t('profile.noEmail');
  const avatarUrl = profile?.avatarUrl?.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{t('profile.title')}</Text>

        <View style={styles.profileCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              {profileLoading ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
              )}
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={styles.name} selectable>
              {displayName}
            </Text>
            <Text style={styles.contact} selectable>
              {displayPhone}
            </Text>
            <Text style={styles.contact} numberOfLines={1}>
              {displayEmail}
            </Text>
            {profileError ? (
              <TouchableOpacity activeOpacity={0.82} style={styles.profileRetry} onPress={() => void loadProfile()}>
                <Feather name="alert-circle" size={rs(22)} color={palette.danger} />
                <Text style={styles.profileRetryText} numberOfLines={1}>
                  {t('profile.loadErrorRetry')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {profileRefreshing ? (
          <View style={styles.syncPill}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.syncText} selectable>
              {t('profile.syncing')}
            </Text>
          </View>
        ) : null}

        <View style={styles.menuCard}>
          {[
            { icon: 'account-outline' as const, label: t('profile.menuPersonal'), route: '/(customer)/personal' as Href },
            { icon: 'history' as const, label: t('profile.menuActivity'), route: '/(customer)/activity' as Href },
            { icon: 'cash-multiple' as const, label: t('profile.menuBilling'), route: '/(customer)/billing' as Href },
            { icon: 'ticket-percent-outline' as const, label: t('profile.menuVouchers') },
            { icon: 'heart-outline' as const, label: t('profile.menuSavedPlaces') },
            { icon: 'cog-outline' as const, label: t('profile.menuSettings') },
            { 
              icon: 'translate' as const, 
              label: t('profile.menuLanguage'), 
              extra: language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English',
              onPress: () => setLanguageModalVisible(true)
            },
            { icon: 'help-circle-outline' as const, label: t('profile.menuHelpCenter') },
          ].map((item, index, arr) => {
            const route = item.route;

            return (
              <MenuItem
                key={item.label}
                {...item}
                isLast={index === arr.length - 1}
                onPress={item.onPress || (route ? () => router.push(route) : undefined)}
              />
            );
          })}

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.logoutRow}
            disabled={loggingOut}
            onPress={handleLogout}
          >
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <MaterialCommunityIcons name="logout" size={rs(34)} color={palette.danger} />
            </View>
            <Text style={styles.logoutText}>{loggingOut ? t('profile.loggingOut') : t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" label="Home" onPress={() => router.push('/(customer)')} />
        <NavItem icon="history" label="Activity" onPress={() => router.push('/(customer)/activity')} />
        <NavItem
          icon="cash-multiple"
          label="Payment"
          onPress={() => router.push('/(customer)/billing')}
        />
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <MaterialCommunityIcons name="account-outline" size={rs(34)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Profile</Text>
        </TouchableOpacity>
      </View>
      <LanguageSelectorModal visible={languageModalVisible} onClose={() => setLanguageModalVisible(false)} />
    </SafeAreaView>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(-2).map((word) => word[0]).join('');

  return initials.toUpperCase() || 'GR';
}

function getErrorMessage(error: unknown, t: any) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t('common.networkError');
}

type MenuItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  route?: Href;
  isLast?: boolean;
  extra?: string;
  onPress?: () => void;
};

function MenuItem({ icon, label, isLast = false, extra, onPress }: MenuItemProps) {
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
      {extra ? <Text style={styles.menuExtra}>{extra}</Text> : null}
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
    marginTop: StatusBar.currentHeight,
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
    minHeight: rvs(180),
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
  avatarFallback: {
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: palette.primary,
    fontSize: rf(38),
    lineHeight: rf(46),
    fontWeight: '900',
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
  profileRetry: {
    marginTop: rvs(10),
    minHeight: rvs(32),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  profileRetryText: {
    flex: 1,
    color: palette.danger,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '700',
  },
  syncPill: {
    alignSelf: 'center',
    minHeight: rvs(42),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    marginTop: rvs(-25),
    marginBottom: rvs(27),
  },
  syncText: {
    color: palette.primary,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '800',
  },
  menuCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    overflow: 'hidden',
    ...shadow,
  },
  menuRow: {
    minHeight: rvs(90),
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
  menuExtra: {
    color: palette.muted,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '500',
    marginRight: rs(10),
  },
  logoutRow: {
    minHeight: rvs(90),
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
    bottom: 3,
    height: rvs(118),
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
