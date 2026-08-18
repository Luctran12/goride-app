import { rf, rs, rvs } from '@/constants/responsive';
import { ApiError } from '@/lib/api';
import { login as loginWithPhone, registerPassenger } from '@/lib/auth-api';
import { useLanguage } from '@/lib/i18n';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
  danger: '#c91c1c',
  dangerSoft: '#fdeaea',
  green: '#00b67a',
  greenSoft: '#dff8ef',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

type AuthMode = 'login' | 'register';

export function CustomerAuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const isRegister = mode === 'register';
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [hidePassword, setHidePassword] = React.useState(true);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const title = isRegister ? t('auth.createAccount') : t('auth.login');
  const subtitle = isRegister
    ? t('auth.registerSubtitle')
    : t('auth.loginSubtitle');

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    if (!phone.trim() || !password.trim()) {
      setError(t('auth.errPhonePassRequired'));
      return;
    }

    if (isRegister) {
      if (!fullName.trim() || !email.trim()) {
        setError(t('auth.errNameEmailRequired'));
        return;
      }

      if (password.length < 8) {
        setError(t('auth.errPasswordLength'));
        return;
      }

      if (password !== confirmPassword) {
        setError(t('auth.errPasswordMismatch'));
        return;
      }
    }

    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await registerPassenger({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
        });
      } else {
        await loginWithPhone({
          phone: phone.trim(),
          password,
        });
      }

      router.replace('/(customer)');
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, isRegister, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, isRegister && styles.contentRegister]}
        >
          <View style={[styles.header, isRegister && styles.headerRegister]}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.headerButton, isRegister && styles.headerButtonRegister]}
              onPress={() => router.back()}
            >
              <Feather name="chevron-left" size={rs(isRegister ? 26 : 36)} color={palette.primary} />
            </TouchableOpacity>

            <View style={[styles.brandMark, isRegister && styles.brandMarkRegister]}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(isRegister ? 26 : 37)} color={palette.primary} />
            </View>
          </View>

          <View style={[styles.hero, isRegister && styles.heroRegister]}>
            <View style={[styles.badge, isRegister && styles.badgeRegister]}>
              <MaterialCommunityIcons name="account-circle-outline" size={rs(isRegister ? 20 : 27)} color={palette.primary} />
              <Text style={[styles.badgeText, isRegister && styles.badgeTextRegister]}>{t('auth.roleUserBadge')}</Text>
            </View>
            <Text style={[styles.title, isRegister && styles.titleRegister]}>{title}</Text>
            <Text style={[styles.subtitle, isRegister && styles.subtitleRegister]}>{subtitle}</Text>
          </View>

          <View style={[styles.formCard, isRegister && styles.formCardRegister]}>
            {isRegister ? (
              <Field
                icon="account-outline"
                label={t('auth.fullNameLabel')}
                value={fullName}
                placeholder={t('auth.fullNamePlaceholder')}
                onChangeText={setFullName}
                autoCapitalize="words"
                compact={isRegister}
              />
            ) : null}

            <Field
              icon="phone-outline"
              label={t('auth.phoneLabel')}
              value={phone}
              placeholder="0901234567"
              onChangeText={setPhone}
              keyboardType="phone-pad"
              compact={isRegister}
            />

            {isRegister ? (
              <Field
                icon="email-outline"
                label={t('auth.emailLabel')}
                value={email}
                placeholder="user@example.com"
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                compact={isRegister}
              />
            ) : null}

            <Field
              icon="lock-outline"
              label={t('auth.passwordLabel')}
              value={password}
              placeholder={t('auth.passwordPlaceholder')}
              onChangeText={setPassword}
              secureTextEntry={hidePassword}
              compact={isRegister}
              trailing={
                <TouchableOpacity activeOpacity={0.76} onPress={() => setHidePassword((value) => !value)}>
                  <Feather
                    name={hidePassword ? 'eye' : 'eye-off'}
                    size={rs(isRegister ? 22 : 31)}
                    color={palette.muted}
                  />
                </TouchableOpacity>
              }
            />

            {isRegister ? (
              <Field
                icon="shield-check-outline"
                label={t('auth.confirmPasswordLabel')}
                value={confirmPassword}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                onChangeText={setConfirmPassword}
                secureTextEntry={hidePassword}
                compact={isRegister}
              />
            ) : null}

            {!isRegister ? (
              <View style={styles.loginMetaRow}>
                <ToggleRow
                  active={rememberMe}
                  onPress={() => setRememberMe((value) => !value)}
                  label={t('auth.rememberMe')}
                  compact
                />
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, isRegister && styles.errorBoxRegister]}>
                <Feather name="alert-circle" size={rs(isRegister ? 22 : 28)} color={palette.danger} />
                <Text style={[styles.errorText, isRegister && styles.errorTextRegister]}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.86}
              disabled={submitting}
              style={[
                styles.primaryButton,
                submitting && styles.primaryButtonDisabled,
                isRegister && styles.primaryButtonRegister,
              ]}
              onPress={handleSubmit}
            >
              <Text style={[styles.primaryButtonText, isRegister && styles.primaryButtonTextRegister]}>
                {submitting ? t('auth.processing') : isRegister ? t('auth.registerBtn') : t('auth.login')}
              </Text>
              <Feather name="arrow-right" size={rs(isRegister ? 24 : 30)} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.switchCard, isRegister && styles.switchCardRegister]}>
            <Text style={[styles.switchText, isRegister && styles.switchTextRegister]}>
              {isRegister ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => router.push(isRegister ? '/(customer)/login' : '/(customer)/register')}
            >
              <Text style={[styles.switchLink, isRegister && styles.switchLinkRegister]}>
                {isRegister ? t('auth.login') : t('auth.registerLink')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getAuthErrorMessage(error: unknown, isRegister: boolean, t: any) {
  if (error instanceof ApiError) {
    if (!isRegister && isInvalidLoginError(error)) {
      return t('auth.errInvalidLogin');
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return isRegister ? t('auth.errRegisterFailed') : t('auth.errLoginFailed');
}

function isInvalidLoginError(error: ApiError) {
  const normalizedCode = error.code?.toUpperCase();

  return (
    error.status === 401 ||
    error.status === 403 ||
    normalizedCode === 'INVALID_CREDENTIALS' ||
    normalizedCode === 'BAD_CREDENTIALS' ||
    normalizedCode === 'AUTHENTICATION_FAILED'
  );
}

type FieldProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  trailing?: React.ReactNode;
  compact?: boolean;
};

function Field({
  icon,
  label,
  value,
  placeholder,
  onChangeText,
  autoCapitalize = 'none',
  keyboardType = 'default',
  secureTextEntry = false,
  trailing,
  compact = false,
}: FieldProps) {
  return (
    <View style={[styles.fieldBlock, compact && styles.fieldBlockRegister]}>
      <Text style={[styles.fieldLabel, compact && styles.fieldLabelRegister]}>{label}</Text>
      <View style={[styles.inputWrap, compact && styles.inputWrapRegister]}>
        <View style={[styles.inputIcon, compact && styles.inputIconRegister]}>
          <MaterialCommunityIcons name={icon} size={rs(compact ? 20 : 30)} color={palette.primary} />
        </View>
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9b96a3"
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={[styles.input, compact && styles.inputRegister]}
        />
        {trailing}
      </View>
    </View>
  );
}

function ToggleRow({
  active,
  onPress,
  label,
  compact = false,
  isRegister = false,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  compact?: boolean;
  isRegister?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.toggleRow, compact && styles.toggleRowCompact]}
      onPress={onPress}
    >
      <View style={[styles.checkBox, active && styles.checkBoxActive, isRegister && styles.checkBoxRegister]}>
        {active ? <Feather name="check" size={rs(isRegister ? 14 : 22)} color="#ffffff" /> : null}
      </View>
      <Text style={[styles.toggleLabel, isRegister && styles.toggleLabelRegister]}>{label}</Text>
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
    flexGrow: 1,
    paddingTop: rvs(24),
    paddingBottom: rvs(44),
  },
  contentRegister: {
    paddingTop: rvs(10),
    paddingBottom: rvs(18),
  },
  header: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(34),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRegister: {
    paddingHorizontal: rs(24),
    marginBottom: rvs(16),
  },
  headerButton: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerButtonRegister: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
  },
  brandMark: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkRegister: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
  },
  hero: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(33),
  },
  heroRegister: {
    paddingHorizontal: rs(24),
    marginBottom: rvs(14),
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: rvs(51),
    borderRadius: rs(14),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(17),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    marginBottom: rvs(20),
  },
  badgeRegister: {
    minHeight: rvs(32),
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    gap: rs(6),
    marginBottom: rvs(10),
  },
  badgeText: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '800',
  },
  badgeTextRegister: {
    fontSize: rf(15),
    lineHeight: rf(19),
  },
  title: {
    color: palette.primary,
    fontSize: rf(52),
    lineHeight: rf(62),
    fontWeight: '800',
    marginBottom: rvs(11),
  },
  titleRegister: {
    fontSize: rf(34),
    lineHeight: rf(42),
    marginBottom: rvs(6),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(28),
    lineHeight: rf(37),
    fontWeight: '400',
  },
  subtitleRegister: {
    fontSize: rf(17),
    lineHeight: rf(23),
  },
  formCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(28),
    gap: rvs(22),
    ...shadow,
  },
  formCardRegister: {
    marginHorizontal: rs(24),
    borderRadius: rs(20),
    padding: rs(18),
    gap: rvs(12),
  },
  fieldBlock: {
    gap: rvs(10),
  },
  fieldBlockRegister: {
    gap: rvs(5),
  },
  fieldLabel: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(30),
    fontWeight: '800',
  },
  fieldLabelRegister: {
    fontSize: rf(16),
    lineHeight: rf(21),
    fontWeight: '700',
  },
  inputWrap: {
    minHeight: rvs(70),
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#fbfaff',
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapRegister: {
    minHeight: rvs(50),
    borderRadius: rs(14),
    paddingHorizontal: rs(14),
  },
  inputIcon: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(17),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(17),
  },
  inputIconRegister: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    marginRight: rs(12),
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '500',
    paddingVertical: 0,
  },
  inputRegister: {
    fontSize: rf(18),
    lineHeight: rf(24),
  },
  loginMetaRow: {
    minHeight: rvs(40),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(18),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  toggleRowCompact: {
    flexShrink: 1,
  },
  checkBox: {
    width: rs(35),
    height: rs(35),
    borderRadius: rs(9),
    borderWidth: 1.5,
    borderColor: '#c9bedc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxRegister: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(6),
  },
  checkBoxActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  toggleLabel: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '600',
    flexShrink: 1,
  },
  toggleLabelRegister: {
    fontSize: rf(16),
    lineHeight: rf(21),
  },
  forgotText: {
    color: palette.primary,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '800',
  },
  errorBox: {
    minHeight: rvs(67),
    borderRadius: rs(16),
    backgroundColor: palette.dangerSoft,
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(13),
  },
  errorBoxRegister: {
    minHeight: rvs(44),
    borderRadius: rs(12),
    paddingHorizontal: rs(14),
    gap: rs(10),
  },
  errorText: {
    color: palette.danger,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '700',
    flex: 1,
  },
  errorTextRegister: {
    fontSize: rf(15),
    lineHeight: rf(20),
  },
  primaryButton: {
    minHeight: rvs(75),
    borderRadius: rs(18),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(13),
  },
  primaryButtonRegister: {
    minHeight: rvs(52),
    borderRadius: rs(14),
    gap: rs(10),
  },
  primaryButtonDisabled: {
    opacity: 0.68,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  primaryButtonTextRegister: {
    fontSize: rf(19),
    lineHeight: rf(25),
  },
  switchCard: {
    minHeight: rvs(75),
    marginHorizontal: rs(36),
    marginTop: rvs(25),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  switchCardRegister: {
    minHeight: rvs(50),
    marginHorizontal: rs(24),
    marginTop: rvs(14),
    borderRadius: rs(14),
    paddingHorizontal: rs(18),
    gap: rs(8),
  },
  switchText: {
    color: palette.muted,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '600',
  },
  switchTextRegister: {
    fontSize: rf(16),
    lineHeight: rf(21),
  },
  switchLink: {
    color: palette.primary,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '800',
  },
  switchLinkRegister: {
    fontSize: rf(16),
    lineHeight: rf(21),
  },
});