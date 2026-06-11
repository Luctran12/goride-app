import { rf, rs, rvs } from '@/constants/responsive';
import { getMyProfile, updateMyProfile, type UserProfile, type UserProfileUpdateDraft } from '@/lib/user-api';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const palette = {
  background: '#f7f8fa',
  card: '#ffffff',
  primary: '#1d087c',
  primarySoft: '#e7ddff',
  primarySoftText: '#1d087c',
  text: '#090a0f',
  secondaryText: '#343141',
  muted: '#6e6a78',
  statCard: '#f0f0f2',
  iconCircle: '#eef0f2',
  line: '#ebeaf0',
  danger: '#c91c1c',
  dangerSoft: '#fff0f0',
  success: '#187a3f',
  successSoft: '#eaf8ef',
};

const cardShadow = {
  shadowColor: '#8f8b9e',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.12,
  shadowRadius: 26,
  elevation: 7,
};

export default function PersonalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = React.useRef(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formValues, setFormValues] = React.useState<ProfileFormValues>(createProfileFormValues(null));
  const [fieldErrors, setFieldErrors] = React.useState<ProfileFieldErrors>({});
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextProfile = await getMyProfile();

      if (mountedRef.current) {
        setProfile(nextProfile);
        if (!editing) {
          setFormValues(createProfileFormValues(nextProfile));
        }
      }
    } catch (profileError) {
      if (mountedRef.current) {
        setError(getErrorMessage(profileError));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [editing]);

  React.useEffect(() => {
    mountedRef.current = true;
    void loadProfile();

    return () => {
      mountedRef.current = false;
    };
  }, [loadProfile]);

  const displayName = profile?.fullName?.trim() || (loading ? 'Đang tải' : 'Khách GoRide');
  const avatarUrl = profile?.avatarUrl?.trim();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(customer)/profile');
  }

  function handleEditProfile() {
    if (loading || saving) {
      return;
    }

    setFormValues(createProfileFormValues(profile));
    setFieldErrors({});
    setSaveError(null);
    setSuccessMessage(null);
    setEditing(true);
  }

  function handleCancelEdit() {
    if (saving) {
      return;
    }

    setFormValues(createProfileFormValues(profile));
    setFieldErrors({});
    setSaveError(null);
    setEditing(false);
  }

  function updateFormValue(field: keyof ProfileFormValues, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
    setSuccessMessage(null);
  }

  async function handleSaveProfile() {
    if (saving) {
      return;
    }

    const validation = validateProfileForm(formValues);
    setFieldErrors(validation);

    if (Object.values(validation).some(Boolean)) {
      setSaveError('Vui lòng kiểm tra lại các thông tin được đánh dấu.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const updatedProfile = await updateMyProfile(createUpdateDraft(formValues));

      if (mountedRef.current) {
        setProfile(updatedProfile);
        setFormValues(createProfileFormValues(updatedProfile));
        setEditing(false);
        setSuccessMessage('Hồ sơ đã được cập nhật thành công.');
      }
    } catch (profileError) {
      if (mountedRef.current) {
        setSaveError(getErrorMessage(profileError));
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: rvs(150) + Math.max(insets.bottom, rvs(18)) },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.78} style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={rs(36)} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Thông tin cá nhân</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatarFrame}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
              </View>
            )}

            <TouchableOpacity activeOpacity={0.84} style={styles.avatarEditButton} onPress={handleEditProfile}>
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Feather name="edit-2" size={rs(26)} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.name} selectable>
            {displayName}
          </Text>

          <View style={styles.memberPill}>
            <MaterialCommunityIcons name="star-circle-outline" size={rs(27)} color={palette.primarySoftText} />
            <Text style={styles.memberText}>{formatMembership(profile)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard value={formatTripCount(profile)} label="CHUYẾN ĐI" />
          <StatCard value={formatRating(profile)} label="ĐÁNH GIÁ" hasStar={Boolean(getAverageRating(profile))} />
          <StatCard value={formatSavedPlaces(profile)} label="ĐÃ LƯU" />
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.84} style={styles.errorBanner} onPress={loadProfile}>
            <View style={styles.errorIcon}>
              <Feather name="alert-circle" size={rs(28)} color={palette.danger} />
            </View>
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Không tải được hồ sơ</Text>
              <Text style={styles.errorText} numberOfLines={2} selectable>
                {error}
              </Text>
            </View>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        ) : null}

        {successMessage && !editing ? (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={rs(30)} color={palette.success} />
            <Text style={styles.successText} selectable>
              {successMessage}
            </Text>
          </View>
        ) : null}

        {editing ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailHeading}>Chỉnh sửa hồ sơ</Text>
            <Text style={styles.editHelper} selectable>
              Cập nhật thông tin hiển thị trong app. Các thay đổi sẽ được lưu qua PUT /api/users/me.
            </Text>

            <View style={styles.formList}>
              <ProfileInput
                error={fieldErrors.fullName}
                icon="user"
                label="Họ và tên"
                onChangeText={(value) => updateFormValue('fullName', value)}
                placeholder="Nhập họ và tên"
                value={formValues.fullName}
              />
              <ProfileInput
                error={fieldErrors.phone}
                icon="phone"
                keyboardType="phone-pad"
                label="Số điện thoại"
                onChangeText={(value) => updateFormValue('phone', value)}
                placeholder="Nhập số điện thoại"
                value={formValues.phone}
              />
              <ProfileInput
                autoCapitalize="none"
                error={fieldErrors.email}
                icon="mail"
                keyboardType="email-address"
                label="Email"
                onChangeText={(value) => updateFormValue('email', value)}
                placeholder="Nhập email"
                value={formValues.email}
              />
              <ProfileInput
                autoCapitalize="none"
                error={fieldErrors.avatarUrl}
                icon="image"
                keyboardType="url"
                label="Ảnh đại diện URL"
                onChangeText={(value) => updateFormValue('avatarUrl', value)}
                placeholder="https://..."
                value={formValues.avatarUrl}
              />
            </View>

            {saveError ? (
              <View style={styles.saveErrorBox}>
                <Feather name="alert-circle" size={rs(26)} color={palette.danger} />
                <Text style={styles.saveErrorText} selectable>
                  {saveError}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.detailCard}>
            <Text style={styles.detailHeading}>Thông tin chi tiết</Text>

            <View style={styles.detailList}>
              <DetailItem icon="phone" label="Số điện thoại" value={profile?.phone || 'Chưa cập nhật'} />
              <DetailItem icon="mail" label="Email" value={profile?.email || 'Chưa cập nhật'} />
              <DetailItem icon="calendar" label="Ngày sinh" value={formatDate(profile?.dateOfBirth)} />
              <DetailItem icon="user" label="Giới tính" value={formatGender(profile?.gender)} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, rvs(18)) }]}>
        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={saving}
              onPress={handleCancelEdit}
              style={[styles.secondaryButton, saving && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={saving}
              onPress={handleSaveProfile}
              style={[styles.saveButton, saving && styles.disabledButton]}
            >
              {saving ? <ActivityIndicator color="#ffffff" size="small" /> : <Feather name="check" size={rs(34)} color="#ffffff" />}
              <Text style={styles.editButtonText}>{saving ? 'Đang lưu' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.88} style={styles.editButton} onPress={handleEditProfile}>
            <Feather name="edit-2" size={rs(34)} color="#ffffff" />
            <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

type ProfileFormValues = {
  avatarUrl: string;
  email: string;
  fullName: string;
  phone: string;
};

type ProfileFieldErrors = Partial<Record<keyof ProfileFormValues, string>>;

function createProfileFormValues(profile: UserProfile | null): ProfileFormValues {
  return {
    avatarUrl: profile?.avatarUrl ?? '',
    email: profile?.email ?? '',
    fullName: profile?.fullName ?? '',
    phone: profile?.phone ?? '',
  };
}

function createUpdateDraft(values: ProfileFormValues): UserProfileUpdateDraft {
  return {
    avatarUrl: values.avatarUrl,
    email: values.email,
    fullName: values.fullName,
    phone: values.phone,
  };
}

function validateProfileForm(values: ProfileFormValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const fullName = values.fullName.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();
  const avatarUrl = values.avatarUrl.trim();

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên.';
  } else if (fullName.length < 2) {
    errors.fullName = 'Họ và tên cần có ít nhất 2 ký tự.';
  }

  if (phone && !/^[+\d][\d\s().-]{7,19}$/.test(phone)) {
    errors.phone = 'Số điện thoại chưa đúng định dạng.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email chưa đúng định dạng.';
  }

  if (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl)) {
    errors.avatarUrl = 'URL ảnh cần bắt đầu bằng http:// hoặc https://.';
  }

  return errors;
}

function StatCard({
  value,
  label,
  hasStar = false,
}: {
  value: string;
  label: string;
  hasStar?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {hasStar ? <Feather name="star" size={rs(21)} color={palette.text} /> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileInput({
  autoCapitalize,
  error,
  icon,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: TextInputProps['autoCapitalize'];
  error?: string;
  icon: keyof typeof Feather.glyphMap;
  keyboardType?: TextInputProps['keyboardType'];
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <View style={styles.inputIcon}>
          <Feather name={icon} size={rs(25)} color={palette.primary} />
        </View>
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9b96a5"
        style={[styles.textInput, error && styles.textInputError]}
        value={value}
      />
      {error ? (
        <Text style={styles.fieldErrorText} selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={rs(34)} color={palette.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(-2).map((word) => word[0]).join('');

  return initials.toUpperCase() || 'GR';
}

function formatMembership(profile: UserProfile | null) {
  if (profile?.status === 'SUSPENDED') {
    return 'Tài khoản tạm khóa';
  }

  if (profile?.roles?.includes('ADMIN')) {
    return 'Quản trị viên';
  }

  if (profile?.roles?.includes('DRIVER')) {
    return 'Đối tác tài xế';
  }

  return 'Thành viên Vàng';
}

function formatTripCount(profile: UserProfile | null) {
  return String(profile?.totalTrips ?? profile?.tripCount ?? 0);
}

function getAverageRating(profile: UserProfile | null) {
  const rating = profile?.averageRating;

  return typeof rating === 'number' && Number.isFinite(rating) && rating > 0 ? rating : undefined;
}

function formatRating(profile: UserProfile | null) {
  const rating = getAverageRating(profile);

  return rating ? rating.toFixed(1) : 'Mới';
}

function formatSavedPlaces(profile: UserProfile | null) {
  return String(profile?.savedPlacesCount ?? profile?.savedLocationsCount ?? 0);
}

function formatDate(value?: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatGender(value?: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const normalized = value.toUpperCase();

  if (normalized === 'MALE' || normalized === 'NAM') {
    return 'Nam';
  }

  if (normalized === 'FEMALE' || normalized === 'NU' || normalized === 'NỮ') {
    return 'Nữ';
  }

  if (normalized === 'OTHER' || normalized === 'KHAC' || normalized === 'KHÁC') {
    return 'Khác';
  }

  return value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Vui lòng kiểm tra kết nối và thử lại.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: rvs(21),
  },
  header: {
    minHeight: rvs(74),
    justifyContent: 'center',
    paddingHorizontal: rs(34),
  },
  backButton: {
    position: 'absolute',
    left: rs(34),
    zIndex: 2,
    width: rs(58),
    height: rvs(58),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: palette.text,
    fontSize: rf(44),
    lineHeight: rf(54),
    fontWeight: '900',
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: rvs(112),
    marginBottom: rvs(49),
  },
  avatarFrame: {
    width: rs(196),
    height: rs(196),
    borderRadius: rs(98),
    backgroundColor: '#e8e5e0',
    borderWidth: rs(7),
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: rvs(42),
    ...cardShadow,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: rs(98),
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: rs(98),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: palette.primary,
    fontSize: rf(52),
    lineHeight: rf(60),
    fontWeight: '900',
  },
  avatarEditButton: {
    position: 'absolute',
    right: rs(-4),
    bottom: rs(-3),
    width: rs(63),
    height: rs(63),
    borderRadius: rs(32),
    borderWidth: rs(5),
    borderColor: '#ffffff',
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: palette.text,
    fontSize: rf(45),
    lineHeight: rf(54),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: rvs(12),
    paddingHorizontal: rs(36),
  },
  memberPill: {
    minHeight: rvs(43),
    borderRadius: rs(23),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(22),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  memberText: {
    color: palette.primarySoftText,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  statsRow: {
    paddingHorizontal: rs(35),
    flexDirection: 'row',
    gap: rs(23),
    marginBottom: rvs(43),
  },
  statCard: {
    flex: 1,
    minHeight: rvs(118),
    borderRadius: rs(24),
    backgroundColor: palette.statCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(8),
  },
  statValueRow: {
    minHeight: rvs(39),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(4),
  },
  statValue: {
    color: palette.text,
    fontSize: rf(33),
    lineHeight: rf(40),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: palette.secondaryText,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '900',
    textAlign: 'center',
  },
  errorBanner: {
    marginHorizontal: rs(34),
    marginBottom: rvs(29),
    borderRadius: rs(22),
    backgroundColor: palette.dangerSoft,
    padding: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  errorIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCopy: {
    flex: 1,
    gap: rvs(4),
  },
  errorTitle: {
    color: palette.danger,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '900',
  },
  errorText: {
    color: palette.danger,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '600',
  },
  retryText: {
    color: palette.danger,
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '900',
  },
  successBanner: {
    marginHorizontal: rs(34),
    marginBottom: rvs(29),
    borderRadius: rs(22),
    backgroundColor: palette.successSoft,
    padding: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  successText: {
    flex: 1,
    color: palette.success,
    fontSize: rf(18),
    lineHeight: rf(25),
    fontWeight: '800',
  },
  detailCard: {
    marginHorizontal: rs(34),
    borderRadius: rs(55),
    backgroundColor: palette.card,
    paddingHorizontal: rs(45),
    paddingTop: rvs(45),
    paddingBottom: rvs(49),
    ...cardShadow,
  },
  detailHeading: {
    color: palette.text,
    fontSize: rf(35),
    lineHeight: rf(43),
    fontWeight: '900',
    marginBottom: rvs(40),
  },
  detailList: {
    gap: rvs(39),
  },
  editHelper: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(30),
    fontWeight: '600',
    marginBottom: rvs(31),
  },
  formList: {
    gap: rvs(25),
  },
  inputGroup: {
    gap: rvs(10),
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  inputIcon: {
    width: rs(43),
    height: rs(43),
    borderRadius: rs(22),
    backgroundColor: palette.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    color: palette.secondaryText,
    fontSize: rf(21),
    lineHeight: rf(28),
    fontWeight: '800',
  },
  textInput: {
    minHeight: rvs(70),
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#fbfbfd',
    color: palette.text,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '700',
    paddingHorizontal: rs(20),
    paddingVertical: rvs(14),
  },
  textInputError: {
    borderColor: palette.danger,
    backgroundColor: palette.dangerSoft,
  },
  fieldErrorText: {
    color: palette.danger,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
  },
  saveErrorBox: {
    marginTop: rvs(26),
    borderRadius: rs(20),
    backgroundColor: palette.dangerSoft,
    padding: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  saveErrorText: {
    flex: 1,
    color: palette.danger,
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '800',
  },
  detailItem: {
    minHeight: rvs(74),
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: rs(74),
    height: rs(74),
    borderRadius: rs(37),
    backgroundColor: palette.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(31),
  },
  detailCopy: {
    flex: 1,
    gap: rvs(4),
  },
  detailLabel: {
    color: palette.secondaryText,
    fontSize: rf(23),
    lineHeight: rf(30),
    fontWeight: '500',
  },
  detailValue: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: rs(35),
    paddingTop: rvs(29),
    backgroundColor: palette.background,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  editButton: {
    minHeight: rvs(99),
    borderRadius: rs(50),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(20),
    shadowColor: '#16045f',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: rs(18),
  },
  secondaryButton: {
    minHeight: rvs(99),
    flex: 0.42,
    borderRadius: rs(50),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: rf(28),
    lineHeight: rf(36),
    fontWeight: '900',
  },
  saveButton: {
    minHeight: rvs(99),
    flex: 0.58,
    borderRadius: rs(50),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(14),
    shadowColor: '#16045f',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.62,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: rf(33),
    lineHeight: rf(41),
    fontWeight: '900',
  },
});
