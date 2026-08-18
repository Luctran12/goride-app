import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';

export type DriverNavTab = 'home' | 'earnings' | 'activity' | 'account';

const palette = {
  card: '#ffffff',
  line: '#E2E8F0',
  green: '#00C853',
  muted: '#64748B',
};

export function DriverBottomNav({ currentTab }: { currentTab: DriverNavTab }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, rvs(10)) }]}>
      <View style={styles.bottomNav}>
        <NavItem
          icon={currentTab === 'home' ? 'home-variant' : 'home-variant-outline'}
          label={t('driver.navHome', 'Trang chủ')}
          active={currentTab === 'home'}
          onPress={() => router.push('/(driver)')}
        />
        <NavItem
          icon={currentTab === 'earnings' ? 'cash-multiple' : 'cash-multiple'}
          label={t('driver.navEarnings', 'Thu nhập')}
          active={currentTab === 'earnings'}
          onPress={() => router.push('/(driver)/earnings')}
        />
        <NavItem
          icon={currentTab === 'activity' ? 'history' : 'history'}
          label={t('driver.navActivity', 'Hoạt động')}
          active={currentTab === 'activity'}
          onPress={() => router.push('/(driver)/activity')}
        />
        <NavItem
          icon={currentTab === 'account' ? 'account' : 'account-outline'}
          label={t('driver.navAccount', 'Tài khoản')}
          active={currentTab === 'account'}
          onPress={() => router.push('/(driver)/account')}
        />
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={styles.navItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon}
        size={rs(26)}
        color={active ? palette.green : palette.muted}
      />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomNav: {
    height: rvs(60),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: rs(72),
    paddingVertical: rvs(4),
  },
  navText: {
    color: palette.muted,
    fontSize: rf(12),
    fontWeight: '600',
    marginTop: rvs(2),
  },
  navTextActive: {
    color: palette.green,
    fontWeight: '800',
  },
});
