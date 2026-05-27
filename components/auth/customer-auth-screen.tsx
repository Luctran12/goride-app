import { rf, rs, rvs } from '@/constants/responsive';
import { ApiError } from '@/lib/api';
import { login as loginWithPhone, registerPassenger } from '@/lib/auth-api';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
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
  const isRegister = mode === 'register';
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [hidePassword, setHidePassword] = React.useState(true);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const title = isRegister ? 'Tạo tài khoản' : 'Đăng nhập';
  const subtitle = isRegister
    ? 'Bắt đầu đặt xe với số điện thoại của bạn.'
    : 'Tiếp tục đặt xe cùng GoRide.';

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    if (!phone.trim() || !password.trim()) {
      setError('Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    if (isRegister) {
      if (!fullName.trim() || !email.trim()) {
        setError('Vui lòng nhập họ tên và email.');
        return;
      }

      if (password.length < 8) {
        setError('Mật khẩu cần tối thiểu 8 ký tự.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }

      if (!acceptedTerms) {
        setError('Vui lòng đồng ý với điều khoản sử dụng.');
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
      setError(getAuthErrorMessage(submitError, isRegister));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={rs(36)} color={palette.primary} />
          </TouchableOpacity>

          <View style={styles.brandMark}>
            <MaterialCommunityIcons name="map-marker-path" size={rs(37)} color={palette.primary} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="account-circle-outline" size={rs(27)} color={palette.primary} />
            <Text style={styles.badgeText}>User</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.formCard}>
          {isRegister ? (
            <Field
              icon="account-outline"
              label="Họ và tên"
              value={fullName}
              placeholder="Nguyễn Văn A"
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          ) : null}

          <Field
            icon="phone-outline"
            label="Số điện thoại"
            value={phone}
            placeholder="0901234567"
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {isRegister ? (
            <Field
              icon="email-outline"
              label="Email"
              value={email}
              placeholder="user@example.com"
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          ) : null}

          <Field
            icon="lock-outline"
            label="Mật khẩu"
            value={password}
            placeholder="Nhập mật khẩu"
            onChangeText={setPassword}
            secureTextEntry={hidePassword}
            trailing={
              <TouchableOpacity activeOpacity={0.76} onPress={() => setHidePassword((value) => !value)}>
                <Feather
                  name={hidePassword ? 'eye' : 'eye-off'}
                  size={rs(31)}
                  color={palette.muted}
                />
              </TouchableOpacity>
            }
          />

          {isRegister ? (
            <Field
              icon="shield-check-outline"
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              placeholder="Nhập lại mật khẩu"
              onChangeText={setConfirmPassword}
              secureTextEntry={hidePassword}
            />
          ) : null}

          {isRegister ? (
            <ToggleRow
              active={acceptedTerms}
              onPress={() => setAcceptedTerms((value) => !value)}
              label="Tôi đồng ý với điều khoản sử dụng"
            />
          ) : (
            <View style={styles.loginMetaRow}>
              <ToggleRow
                active={rememberMe}
                onPress={() => setRememberMe((value) => !value)}
                label="Ghi nhớ"
                compact
              />
              <TouchableOpacity activeOpacity={0.76}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={rs(28)} color={palette.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={submitting}
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
            </Text>
            <Feather name="arrow-right" size={rs(30)} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.switchCard}>
          <Text style={styles.switchText}>
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={() => router.push(isRegister ? '/(customer)/login' : '/(customer)/register')}
          >
            <Text style={styles.switchLink}>{isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getAuthErrorMessage(error: unknown, isRegister: boolean) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return isRegister ? 'Không thể đăng ký lúc này.' : 'Không thể đăng nhập lúc này.';
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
}: FieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <View style={styles.inputIcon}>
          <MaterialCommunityIcons name={icon} size={rs(30)} color={palette.primary} />
        </View>
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9b96a3"
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
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
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.toggleRow, compact && styles.toggleRowCompact]}
      onPress={onPress}
    >
      <View style={[styles.checkBox, active && styles.checkBoxActive]}>
        {active ? <Feather name="check" size={rs(22)} color="#ffffff" /> : null}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
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
  header: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(34),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  brandMark: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(33),
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
  badgeText: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '800',
  },
  title: {
    color: palette.primary,
    fontSize: rf(52),
    lineHeight: rf(62),
    fontWeight: '800',
    marginBottom: rvs(11),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(28),
    lineHeight: rf(37),
    fontWeight: '400',
  },
  formCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    padding: rs(28),
    gap: rvs(22),
    ...shadow,
  },
  fieldBlock: {
    gap: rvs(10),
  },
  fieldLabel: {
    color: palette.text,
    fontSize: rf(24),
    lineHeight: rf(30),
    fontWeight: '800',
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
  inputIcon: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(17),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(17),
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '500',
    paddingVertical: 0,
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
  errorText: {
    color: palette.danger,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '700',
    flex: 1,
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
  primaryButtonDisabled: {
    opacity: 0.68,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
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
  switchText: {
    color: palette.muted,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '600',
  },
  switchLink: {
    color: palette.primary,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '800',
  },
});
