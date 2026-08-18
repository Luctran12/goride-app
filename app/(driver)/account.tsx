import { logout } from '@/lib/auth-api';
import { USE_MOCK_API } from '@/lib/config';
import { getDriverProfile, type DriverProfileResponse } from '@/lib/driver-api';
import { setMockDriverApproved } from '@/lib/mock-driver-api';
import { getMyProfile, type UserProfile } from '@/lib/user-api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriverBottomNav } from '@/components/driver/driver-bottom-nav';
import { CustomAlertModal, type CustomAlertOptions } from '@/components/ui/custom-alert-modal';
import { LanguageSelectorModal } from '@/components/ui/language-toggle';
import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage } from '@/lib/i18n';

const palette = {
  background: '#F8FAFC',
  card: '#ffffff',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  green: '#00C853',
  greenDark: '#044D29',
  greenSoft: '#E8FADF',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
};

const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 4,
};

export default function DriverAccountScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<Omit<CustomAlertOptions, 'visible' | 'onClose'> & { visible: boolean }>({
    visible: false,
    title: '',
  });

  const showAlert = useCallback((options: Omit<CustomAlertOptions, 'visible' | 'onClose'>) => {
    setAlertConfig({ visible: true, ...options });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const uProfile = await getMyProfile();
      setUserProfile(uProfile);

      const dProfile = await getDriverProfile();
      setDriverProfile(dProfile);
    } catch (err) {
      console.warn('Load account data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleQuickApprove() {
    setMockDriverApproved(true);
    showAlert({
      type: 'success',
      title: t('driverAccount.successTitle'),
      message: t('driverAccount.quickApproveMsg'),
      confirmText: t('common.understood', 'OK'),
    });
    loadData();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.green} />
      </SafeAreaView>
    );
  }

  const isApproved = driverProfile?.approvalStatus === 'APPROVED';
  const isPending = driverProfile?.approvalStatus === 'PENDING';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('driverAccount.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. DRIVER PROFILE HEADER (NO AVATAR, BOLD & BIG FONTS) */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileInfoWrap}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.driverName}>
                {userProfile?.fullName || (driverProfile ? `Tài xế GoRide #${driverProfile.id}` : t('driver.gorideDriver'))}
              </Text>
              <View style={styles.verifiedChip}>
                <MaterialCommunityIcons name="check-decagram" size={rs(18)} color={palette.green} />
                <Text style={styles.verifiedText}>{t('driverAccount.partnerBadge')}</Text>
              </View>
            </View>

            <Text style={styles.contactText}>
              {userProfile?.phone || driverProfile?.idCardNumber || t('driverAccount.noPhone')}
            </Text>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.approvalStatusPill,
                  isApproved
                    ? styles.statusPillApproved
                    : isPending
                      ? styles.statusPillPending
                      : styles.statusPillRejected,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isApproved
                        ? palette.green
                        : isPending
                          ? palette.amber
                          : palette.danger,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: isApproved
                        ? palette.greenDark
                        : isPending
                          ? '#92400E'
                          : palette.danger,
                    },
                  ]}
                >
                  {isApproved
                    ? t('driverAccount.approvedStatus')
                    : isPending
                      ? t('driverAccount.pendingStatus')
                      : t('driverAccount.rejectedStatus')}
                </Text>
              </View>

              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={rs(18)} color={palette.amber} />
                <Text style={styles.ratingText}>4.9</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4.9</Text>
            <Text style={styles.statLabel}>{t('driverAccount.statsRating')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>{t('driverEarnings.acceptanceRateLabel')}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {driverProfile?.createdAt
                ? new Date(driverProfile.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '2026'}
            </Text>
            <Text style={styles.statLabel}>{t('driverAccount.joined')}</Text>
          </View>
        </View>

        {/* 3. VEHICLE INFORMATION CARD */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="motorbike" size={rs(26)} color={palette.ink} />
            <Text style={styles.cardTitle}>{t('driverAccount.vehicleInfoTitle')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('driverAccount.vehiclePlate')}</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{driverProfile?.vehiclePlate || '59-X3 888.88'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('driverAccount.vehicleType')}</Text>
            <Text style={styles.infoValue}>
              {driverProfile?.vehicleType === 'MOTORBIKE'
                ? t('driverAccount.motorbike')
                : driverProfile?.vehicleType === 'CAR_4_SEAT'
                  ? t('driverAccount.car4')
                  : t('driverAccount.car7')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('driverAccount.vehicleModel')}</Text>
            <Text style={styles.infoValue}>
              {driverProfile?.vehicleBrand} {driverProfile?.vehicleModel || 'Honda Air Blade'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('driverAccount.yearAndColor')}</Text>
            <Text style={styles.infoValue}>
              {driverProfile?.vehicleYear || '2023'} · {driverProfile?.vehicleColor || 'Black'}
            </Text>
          </View>
        </View>

        {/* 4. PERSONAL DOCUMENTS CARD */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="card-account-details-outline" size={rs(26)} color={palette.ink} />
            <Text style={styles.cardTitle}>{t('driverAccount.documentsTitle')}</Text>
          </View>

          <View style={styles.docItemRow}>
            <View style={styles.docIconWrap}>
              <MaterialCommunityIcons name="card-text-outline" size={rs(24)} color={palette.blue} />
            </View>
            <View style={styles.docInfoWrap}>
              <Text style={styles.docTitle}>GPLX ({driverProfile?.licenseNumber || '079099888777'})</Text>
              <Text style={styles.docSubtitle}>
                {t('driverAccount.expiry', { expiry: driverProfile?.licenseExpiry || t('driverAccount.noExpiry') })}
              </Text>
            </View>
            <View style={[styles.docStatusBadge, isApproved ? styles.statusPillApproved : styles.statusPillPending]}>
              <Text style={[styles.docStatusText, isApproved ? { color: palette.greenDark } : { color: '#92400E' }]}>
                {isApproved ? t('driverAccount.approvedStatus') : t('driverAccount.pendingStatus')}
              </Text>
            </View>
          </View>

          <View style={styles.docItemRow}>
            <View style={styles.docIconWrap}>
              <MaterialCommunityIcons name="shield-account-outline" size={rs(24)} color={palette.green} />
            </View>
            <View style={styles.docInfoWrap}>
              <Text style={styles.docTitle}>CCCD ({driverProfile?.idCardNumber || '079099888777'})</Text>
              <Text style={styles.docSubtitle}>{t('driverAccount.idCardSubtitle')}</Text>
            </View>
            <View style={[styles.docStatusBadge, isApproved ? styles.statusPillApproved : styles.statusPillPending]}>
              <Text style={[styles.docStatusText, isApproved ? { color: palette.greenDark } : { color: '#92400E' }]}>
                {isApproved ? t('driverAccount.approvedStatus') : t('driverAccount.pendingStatus')}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. APP SETTINGS & PREFERENCES */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cog-outline" size={rs(26)} color={palette.ink} />
            <Text style={styles.cardTitle}>{t('driverAccount.appSettings')}</Text>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.settingLabelWrap}>
              <MaterialCommunityIcons name="translate" size={rs(22)} color={palette.ink} />
              <Text style={styles.settingLabelText}>{t('common.language')}</Text>
            </View>
            <View style={styles.settingValueWrap}>
              <Text style={styles.settingValueText}>
                {language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={rs(20)} color={palette.muted} />
            </View>
          </TouchableOpacity>

          {USE_MOCK_API && (
            <TouchableOpacity style={styles.settingRow} onPress={handleQuickApprove}>
              <View style={styles.settingLabelWrap}>
                <MaterialCommunityIcons name="lightning-bolt" size={rs(22)} color={palette.amber} />
                <Text style={styles.settingLabelText}>{t('driverAccount.quickApproveBtn')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={rs(20)} color={palette.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 6. LOGOUT BUTTON */}
        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.logoutBtn}
          onPress={async () => {
            try {
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
        >
          <MaterialCommunityIcons name="logout" size={rs(24)} color={palette.danger} />
          <Text style={styles.logoutBtnText}>{t('driverAccount.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LANGUAGE SELECTOR MODAL */}
      <LanguageSelectorModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* STANDARDIZED DRIVER BOTTOM NAVIGATION */}
      <DriverBottomNav currentTab="account" />

      {/* CUSTOM ALERT MODAL */}
      <CustomAlertModal {...alertConfig} onClose={closeAlert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: rs(20),
    paddingTop: rvs(12),
    paddingBottom: rvs(16),
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: rf(28),
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: rs(18),
    paddingTop: rvs(18),
    paddingBottom: rvs(36),
    gap: rvs(18),
  },
  profileHeaderCard: {
    backgroundColor: palette.card,
    borderRadius: rs(24),
    padding: rs(22),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  profileInfoWrap: {
    gap: rvs(8),
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverName: {
    color: palette.ink,
    fontSize: rf(26),
    fontWeight: '900',
    flex: 1,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: palette.greenSoft,
    paddingHorizontal: rs(12),
    paddingVertical: rvs(5),
    borderRadius: rs(14),
  },
  verifiedText: {
    color: palette.greenDark,
    fontSize: rf(14),
    fontWeight: '800',
  },
  contactText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginTop: rvs(6),
  },
  approvalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(6),
    borderRadius: rs(14),
  },
  statusPillApproved: {
    backgroundColor: palette.greenSoft,
  },
  statusPillPending: {
    backgroundColor: palette.amberSoft,
  },
  statusPillRejected: {
    backgroundColor: palette.dangerSoft,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: rf(14),
    fontWeight: '800',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: '#FFFBEB',
    paddingHorizontal: rs(12),
    paddingVertical: rvs(6),
    borderRadius: rs(14),
  },
  ratingText: {
    color: palette.ink,
    fontSize: rf(15),
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: rs(18),
    padding: rs(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  statNumber: {
    color: palette.ink,
    fontSize: rf(22),
    fontWeight: '900',
  },
  statLabel: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '700',
    marginTop: 2,
  },
  cardSection: {
    backgroundColor: palette.card,
    borderRadius: rs(22),
    padding: rs(20),
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
    gap: rvs(14),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingBottom: rvs(8),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: rf(18),
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '600',
  },
  infoValue: {
    color: palette.ink,
    fontSize: rf(16),
    fontWeight: '700',
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: rs(12),
    paddingVertical: rvs(5),
    borderRadius: rs(10),
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  plateText: {
    color: palette.ink,
    fontSize: rf(16),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    backgroundColor: '#F8FAFC',
    padding: rs(14),
    borderRadius: rs(16),
  },
  docIconWrap: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(23),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  docInfoWrap: {
    flex: 1,
  },
  docTitle: {
    color: palette.ink,
    fontSize: rf(16),
    fontWeight: '800',
  },
  docSubtitle: {
    color: palette.muted,
    fontSize: rf(13),
    fontWeight: '600',
    marginTop: 2,
  },
  docStatusBadge: {
    paddingHorizontal: rs(10),
    paddingVertical: rvs(5),
    borderRadius: rs(12),
  },
  docStatusText: {
    fontSize: rf(13),
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rvs(6),
  },
  settingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  settingLabelText: {
    color: palette.ink,
    fontSize: rf(16),
    fontWeight: '700',
  },
  settingValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  settingValueText: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    backgroundColor: palette.dangerSoft,
    borderRadius: rs(20),
    paddingVertical: rvs(18),
    marginTop: rvs(8),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: palette.danger,
    fontSize: rf(17),
    fontWeight: '900',
  },
});
