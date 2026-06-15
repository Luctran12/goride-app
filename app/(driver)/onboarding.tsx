import { rf, rs, rvs } from '@/constants/responsive';
import { createDriverProfile } from '@/lib/driver-api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const palette = {
  background: '#eaf7ef',
  card: '#ffffff',
  ink: '#08110d',
  muted: '#637069',
  line: '#dfe7e2',
  green: '#00b875',
  greenDark: '#053f2a',
  greenSoft: '#d8f6e8',
  blue: '#1664ff',
  blueSoft: '#edf4ff',
  danger: '#f02d3a',
};

export default function DriverOnboardingScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [idCardNumber, setIdCardNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'MOTORBIKE' | 'CAR_4_SEAT' | 'CAR_7_SEAT'>('MOTORBIKE');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('https://i.pravatar.cc/160?img=12');

  async function handleSubmit() {
    if (
      !idCardNumber.trim() ||
      !licenseNumber.trim() ||
      !licenseExpiry.trim() ||
      !vehiclePlate.trim() ||
      !vehicleBrand.trim() ||
      !vehicleModel.trim() ||
      !vehicleColor.trim() ||
      !vehicleYear.trim()
    ) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tất cả các trường.');
      return;
    }

    const yearNum = parseInt(vehicleYear.trim(), 10);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Lỗi nhập liệu', 'Năm sản xuất xe không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      await createDriverProfile({
        idCardNumber: idCardNumber.trim(),
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: licenseExpiry.trim(),
        vehiclePlate: vehiclePlate.trim(),
        vehicleType,
        vehicleBrand: vehicleBrand.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleColor: vehicleColor.trim(),
        vehicleYear: yearNum,
        portraitUrl: portraitUrl.trim(),
      });

      Alert.alert('Thành công', 'Hồ sơ của bạn đã được gửi và đang chờ kiểm duyệt.', [
        { text: 'OK', onPress: () => router.replace('/(driver)') },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi tạo hồ sơ', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đăng ký thông tin tài xế</Text>
          <Text style={styles.headerSubtitle}>
            Vui lòng hoàn thành hồ sơ phương tiện và giấy tờ để bắt đầu nhận chuyến.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Giấy tờ cá nhân</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số CCCD / CMND</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập 12 số CCCD"
              value={idCardNumber}
              onChangeText={setIdCardNumber}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số Giấy phép lái xe (GPLX)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số GPLX"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hạn GPLX (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 2030-12-31"
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin phương tiện</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loại phương tiện</Text>
            <View style={styles.typeSelectorRow}>
              {(['MOTORBIKE', 'CAR_4_SEAT', 'CAR_7_SEAT'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setVehicleType(type)}
                  style={[
                    styles.typeOption,
                    vehicleType === type && styles.typeOptionActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={type === 'MOTORBIKE' ? 'motorbike' : 'car'}
                    size={rs(20)}
                    color={vehicleType === type ? '#ffffff' : palette.muted}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      vehicleType === type && styles.typeOptionTextActive,
                    ]}
                  >
                    {type === 'MOTORBIKE' ? 'Xe máy' : type === 'CAR_4_SEAT' ? 'Car 4' : 'Car 7'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Biển số xe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 59A1-123.45"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hãng xe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Honda, Toyota"
              value={vehicleBrand}
              onChangeText={setVehicleBrand}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dòng xe / Đời xe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Air Blade, Vios"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Màu xe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Đen, Trắng"
              value={vehicleColor}
              onChangeText={setVehicleColor}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Năm sản xuất</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 2022"
              value={vehicleYear}
              onChangeText={setVehicleYear}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Link ảnh chân dung (Tùy chọn)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập URL ảnh chân dung"
              value={portraitUrl}
              onChangeText={setPortraitUrl}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
            pressed && styles.submitButtonPressed,
          ]}
        >
          <Text style={styles.submitButtonText}>{submitting ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingHorizontal: rs(20),
    paddingTop: rvs(16),
    paddingBottom: rvs(48),
    gap: rvs(20),
  },
  header: {
    marginBottom: rvs(8),
  },
  headerTitle: {
    color: palette.greenDark,
    fontSize: rf(28),
    fontWeight: '900',
    lineHeight: rf(34),
    marginBottom: rvs(8),
  },
  headerSubtitle: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: rs(16),
    padding: rs(18),
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(16),
  },
  sectionTitle: {
    color: palette.greenDark,
    fontSize: rf(18),
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: rvs(8),
  },
  inputGroup: {
    gap: rvs(6),
  },
  inputLabel: {
    color: palette.ink,
    fontSize: rf(14),
    fontWeight: '700',
  },
  input: {
    minHeight: rvs(46),
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    fontSize: rf(15),
    color: palette.ink,
    backgroundColor: '#fafcfb',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    minHeight: rvs(42),
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: rs(8),
    backgroundColor: '#ffffff',
  },
  typeOptionActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  typeOptionText: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '700',
  },
  typeOptionTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    minHeight: rvs(52),
    backgroundColor: palette.green,
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: rf(17),
    fontWeight: '800',
  },
});
