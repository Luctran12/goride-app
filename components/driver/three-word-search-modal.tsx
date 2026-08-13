import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { getLocationToCoordinate, isValidThreeWordAddress } from '@/lib/three-word-location-api';
import type { ThreeWordLocation } from '@/types/three-word';

const palette = {
  background: '#ffffff',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  card: '#ffffff',
  green: '#10b981',
  greenSoft: '#ecfdf5',
};

export type ThreeWordSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectResult: (result: ThreeWordLocation) => void;
};

export function ThreeWordSearchModal({
  visible,
  onClose,
  onSelectResult,
}: ThreeWordSearchModalProps) {
  const { t } = useLanguage();
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    normalizedResult,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceToText();

  // Pulse animation for listening state
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Update input text when voice recognition produces normalized output
  useEffect(() => {
    if (normalizedResult) {
      setAddressInput(normalizedResult);
      if (errorMessage) setErrorMessage(null);
    }
  }, [normalizedResult]);

  useEffect(() => {
    if (voiceError) {
      setErrorMessage(voiceError);
    }
  }, [voiceError]);

  const handleClearInput = () => {
    setAddressInput('');
    setErrorMessage(null);
    resetTranscript();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    stopListening();
    resetTranscript();
    setErrorMessage(null);
    onClose();
  };

  const handleToggleVoice = async () => {
    Keyboard.dismiss();
    if (isListening) {
      stopListening();
    } else {
      setErrorMessage(null);
      await startListening();
    }
  };

  const handleSearch = async () => {
    const trimmed = addressInput.trim();

    if (!isValidThreeWordAddress(trimmed)) {
      setErrorMessage(t('driver.threeWordErrorFormat'));
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    Keyboard.dismiss();

    try {
      const result = await getLocationToCoordinate(trimmed);
      onSelectResult(result);
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('driver.threeWordErrorService');
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.backdrop}
            onPress={handleClose}
          />

          <View style={styles.sheetContainer}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <MaterialCommunityIcons
                  name="grid"
                  size={rs(26)}
                  color={palette.primary}
                />
                <Text style={styles.headerTitle}>{t('driver.threeWordTitle')}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Feather name="x" size={rs(24)} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              {voiceSupported
                ? t('driver.threeWordDescWithVoice')
                : t('driver.threeWordDesc')}
            </Text>

            {/* Voice Listening Banner */}
            {isListening && (
              <View style={styles.listeningBanner}>
                <Animated.View style={[styles.micPulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                  <Ionicons name="mic" size={rs(22)} color="#ffffff" />
                </Animated.View>
                <View style={styles.listeningCopy}>
                  <Text style={styles.listeningTitle}>{t('driver.threeWordListeningTitle')}</Text>
                  <Text style={styles.listeningTranscript} numberOfLines={1}>
                    {transcript ? `"${transcript}"` : t('driver.threeWordPlaceholderVoice')}
                  </Text>
                </View>
                <TouchableOpacity onPress={stopListening} style={styles.stopListeningBtn}>
                  <Text style={styles.stopListeningText}>{t('driver.threeWordStopBtn')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.inputWrapper, errorMessage ? styles.inputErrorBorder : null]}>
              <Text style={styles.threeWordPrefix}>///</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="hoa.la.cay"
                placeholderTextColor={palette.muted}
                style={styles.textInput}
                value={addressInput}
                onChangeText={(text) => {
                  setAddressInput(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={() => void handleSearch()}
                returnKeyType="search"
              />

              {voiceSupported && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => void handleToggleVoice()}
                  style={[styles.micIconButton, isListening && styles.micIconButtonActive]}
                >
                  <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={rs(22)} color={isListening ? '#ffffff' : palette.primary} />
                </TouchableOpacity>
              )}

              {addressInput.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClearInput}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={rs(20)} color={palette.muted} />
                </TouchableOpacity>
              )}
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={rs(20)} color={palette.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={loading || !addressInput.trim()}
                onPress={() => void handleSearch()}
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed && styles.pressed,
                  (loading || !addressInput.trim()) && styles.disabledButton,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="search" size={rs(20)} color="#ffffff" />
                    <Text style={styles.searchButtonText}>{t('driver.threeWordSearchBtn')}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: palette.backdrop,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: palette.card,
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    paddingHorizontal: rs(24),
    paddingTop: rvs(14),
    paddingBottom: rvs(34),
    gap: rvs(16),
  },
  dragHandle: {
    width: rs(44),
    height: rvs(5),
    borderRadius: rs(3),
    backgroundColor: palette.border,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  headerTitle: {
    fontSize: rf(22),
    fontWeight: '800',
    color: palette.text,
  },
  closeButton: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: rf(16),
    color: palette.muted,
    lineHeight: rf(22),
  },
  boldText: {
    fontWeight: '700',
    color: palette.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: rvs(54),
    borderRadius: rs(16),
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: rs(16),
    gap: rs(10),
  },
  inputErrorBorder: {
    borderColor: palette.danger,
    backgroundColor: palette.dangerSoft,
  },
  threeWordPrefix: {
    fontSize: rf(20),
    fontWeight: '900',
    color: palette.danger,
  },
  textInput: {
    flex: 1,
    fontSize: rf(18),
    fontWeight: '600',
    color: palette.text,
  },
  clearIcon: {
    padding: rs(4),
  },
  micIconButton: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconButtonActive: {
    backgroundColor: palette.primary,
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(12),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(29, 7, 150, 0.3)',
    gap: rs(12),
  },
  micPulseCircle: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningCopy: {
    flex: 1,
    gap: rvs(2),
  },
  listeningTitle: {
    fontSize: rf(15),
    fontWeight: '800',
    color: palette.primary,
  },
  listeningTranscript: {
    fontSize: rf(14),
    fontWeight: '600',
    color: palette.text,
  },
  stopListeningBtn: {
    paddingHorizontal: rs(12),
    paddingVertical: rvs(6),
    borderRadius: rs(12),
    backgroundColor: palette.primary,
  },
  stopListeningText: {
    fontSize: rf(13),
    fontWeight: '800',
    color: '#ffffff',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(10),
    borderRadius: rs(12),
    backgroundColor: palette.dangerSoft,
  },
  errorText: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: '600',
    color: palette.danger,
  },
  actionRow: {
    marginTop: rvs(4),
  },
  searchButton: {
    flexDirection: 'row',
    height: rvs(52),
    borderRadius: rs(16),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: rf(18),
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
