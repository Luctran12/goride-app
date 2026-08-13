import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { useLanguage, type Language } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Pill-style toggle (compact): EN | VI
// ---------------------------------------------------------------------------

type LanguageToggleProps = {
  /** Color scheme variant – adjusts colors to blend with surrounding UI. */
  variant?: 'light' | 'dark';
};

export function LanguageToggle({ variant = 'light' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const isDark = variant === 'dark';

  return (
    <View style={[styles.pill, isDark ? styles.pillDark : styles.pillLight]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.pillSegment, language === 'en' && (isDark ? styles.pillActiveSegmentDark : styles.pillActiveSegment)]}
        onPress={() => setLanguage('en')}
        accessibilityLabel="Switch to English"
        accessibilityRole="button"
      >
        <Text style={[styles.pillText, language === 'en' ? (isDark ? styles.pillActiveTextDark : styles.pillActiveText) : (isDark ? styles.pillInactiveTextDark : styles.pillInactiveText)]}>
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.pillSegment, language === 'vi' && (isDark ? styles.pillActiveSegmentDark : styles.pillActiveSegment)]}
        onPress={() => setLanguage('vi')}
        accessibilityLabel="Chuyển sang Tiếng Việt"
        accessibilityRole="button"
      >
        <Text style={[styles.pillText, language === 'vi' ? (isDark ? styles.pillActiveTextDark : styles.pillActiveText) : (isDark ? styles.pillInactiveTextDark : styles.pillInactiveText)]}>
          VI
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Modal-style language selector (full - for settings / profile pages)
// ---------------------------------------------------------------------------

type LanguageSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
};

const languageOptions: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: '🇻🇳' },
];

export function LanguageSelectorModal({ visible, onClose }: LanguageSelectorModalProps) {
  const { language, setLanguage, t } = useLanguage();

  function handleSelect(code: Language) {
    setLanguage(code);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>{t('common.language')}</Text>

          {languageOptions.map((option) => {
            const isSelected = language === option.code;

            return (
              <TouchableOpacity
                key={option.code}
                activeOpacity={0.82}
                style={[styles.languageRow, isSelected && styles.languageRowSelected]}
                onPress={() => handleSelect(option.code)}
              >
                <Text style={styles.languageFlag}>{option.flag}</Text>
                <View style={styles.languageCopy}>
                  <Text style={[styles.languageLabel, isSelected && styles.languageLabelSelected]}>
                    {option.nativeLabel}
                  </Text>
                  <Text style={styles.languageSub}>{option.label}</Text>
                </View>
                {isSelected ? (
                  <MaterialCommunityIcons name="check-circle" size={rs(24)} color="#3f22d6" />
                ) : (
                  <View style={styles.radioOuter}>
                    <View style={styles.radioInner} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Pill toggle
  pill: {
    flexDirection: 'row',
    borderRadius: rs(20),
    overflow: 'hidden',
  },
  pillLight: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pillDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pillSegment: {
    paddingHorizontal: rs(14),
    paddingVertical: rvs(6),
    borderRadius: rs(20),
  },
  pillActiveSegment: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  pillActiveSegmentDark: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pillText: {
    fontSize: rf(14),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillActiveText: {
    color: '#1d0796',
  },
  pillInactiveText: {
    color: '#68646e',
  },
  pillActiveTextDark: {
    color: '#ffffff',
  },
  pillInactiveTextDark: {
    color: 'rgba(255,255,255,0.55)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    paddingTop: rvs(12),
    paddingHorizontal: rs(24),
    paddingBottom: rvs(36),
  },
  modalHandle: {
    alignSelf: 'center',
    width: rs(40),
    height: rvs(4),
    borderRadius: rs(2),
    backgroundColor: '#d4d4d4',
    marginBottom: rvs(18),
  },
  modalTitle: {
    fontSize: rf(22),
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: rvs(18),
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rvs(14),
    paddingHorizontal: rs(16),
    borderRadius: rs(14),
    marginBottom: rvs(8),
    backgroundColor: '#f8f8fa',
    gap: rs(14),
  },
  languageRowSelected: {
    backgroundColor: '#f0ecff',
    borderWidth: 1.5,
    borderColor: '#3f22d6',
  },
  languageFlag: {
    fontSize: rf(28),
  },
  languageCopy: {
    flex: 1,
  },
  languageLabel: {
    fontSize: rf(17),
    fontWeight: '800',
    color: '#0f172a',
  },
  languageLabelSelected: {
    color: '#3f22d6',
  },
  languageSub: {
    fontSize: rf(14),
    fontWeight: '500',
    color: '#68646e',
    marginTop: rvs(1),
  },
  radioOuter: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    borderWidth: 2,
    borderColor: '#d4d4d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
    backgroundColor: 'transparent',
  },
});
