import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { rf, rs, rvs } from '@/constants/responsive';

export type AlertType = 'info' | 'success' | 'warning' | 'danger' | 'voucher';

export type CustomAlertOptions = {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  badgeText?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
};

export function CustomAlertModal({
  visible,
  type = 'info',
  title,
  message,
  badgeText,
  confirmText = 'OK',
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
  onClose,
}: CustomAlertOptions) {
  const isTwoButtons = Boolean(cancelText);

  const config = React.useMemo(() => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle-outline' as const,
          iconFamily: 'mci' as const,
          iconColor: '#00C853',
          bgColor: '#E8FCD8',
          borderColor: '#C6F6B0',
        };
      case 'danger':
        return {
          icon: 'alert-octagon' as const,
          iconFamily: 'feather' as const,
          iconColor: '#EF4444',
          bgColor: '#FEE2E2',
          borderColor: '#FECACA',
        };
      case 'warning':
        return {
          icon: 'alert-triangle' as const,
          iconFamily: 'feather' as const,
          iconColor: '#F59E0B',
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
        };
      case 'voucher':
        return {
          icon: 'ticket-percent-outline' as const,
          iconFamily: 'mci' as const,
          iconColor: '#3F22D6',
          bgColor: '#EEECFB',
          borderColor: '#D4CEFA',
        };
      case 'info':
      default:
        return {
          icon: 'information' as const,
          iconFamily: 'mci' as const,
          iconColor: '#3F22D6',
          bgColor: '#EEECFB',
          borderColor: '#D4CEFA',
        };
    }
  }, [type]);

  const handleConfirm = () => {
    onClose();
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    onClose();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconCircle, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
            {config.iconFamily === 'feather' ? (
              <Feather name={config.icon as any} size={rs(48)} color={config.iconColor} />
            ) : (
              <MaterialCommunityIcons name={config.icon as any} size={rs(52)} color={config.iconColor} />
            )}
          </View>

          {badgeText ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonContainer, isTwoButtons && styles.buttonContainerRow]}>
            {isTwoButtons ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.button,
                styles.confirmButton,
                isDestructive && styles.destructiveButton,
                isTwoButtons && styles.confirmButtonFlex,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(32),
  },
  card: {
    width: '100%',
    maxWidth: rs(580),
    backgroundColor: '#ffffff',
    borderRadius: rs(36),
    paddingHorizontal: rs(36),
    paddingTop: rvs(40),
    paddingBottom: rvs(32),
    alignItems: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  iconCircle: {
    width: rs(110),
    height: rs(110),
    borderRadius: rs(55),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(24),
  },
  badgePill: {
    paddingHorizontal: rs(18),
    paddingVertical: rvs(6),
    borderRadius: rs(14),
    backgroundColor: '#EEECFB',
    marginBottom: rvs(14),
  },
  badgeText: {
    color: '#3F22D6',
    fontSize: rf(20),
    lineHeight: rf(26),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    color: '#0F172A',
    fontSize: rf(32),
    lineHeight: rf(40),
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: rvs(12),
  },
  message: {
    color: '#64748B',
    fontSize: rf(22),
    lineHeight: rf(32),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: rvs(32),
    paddingHorizontal: rs(8),
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContainerRow: {
    flexDirection: 'row',
    gap: rs(16),
  },
  button: {
    height: rvs(84),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(20),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: rf(24),
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#3F22D6',
    shadowColor: '#3F22D6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonFlex: {
    flex: 1,
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: rf(24),
    fontWeight: '800',
  },
});
