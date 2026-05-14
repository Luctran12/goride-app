import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Pressable,
  Image,
  Alert,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { rf, rs, rvs } from '@/constants/responsive';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
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

export default function WaitingDriverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for the "searching" effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Mock successful driver match after 5 seconds
    const timer = setTimeout(() => {
      Alert.alert(
        "Đã tìm thấy tài xế!",
        "Tài xế Nguyễn Văn A đang đến đón bạn.",
        [
          { text: "OK", onPress: () => router.replace('/(customer)') }
        ]
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleCancel = () => {
    Alert.alert(
      "Hủy chuyến",
      "Bạn có chắc chắn muốn hủy yêu cầu đặt xe này không?",
      [
        { text: "Không", style: "cancel" },
        { text: "Hủy chuyến", style: "destructive", onPress: () => router.replace('/(customer)') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      
      <View style={styles.container}>
        <View style={styles.searchingContainer}>
          <Animated.View 
            style={[
              styles.pulseCircle, 
              { transform: [{ scale: pulseAnim }], opacity: 0.15 }
            ]} 
          />
          <Animated.View 
            style={[
              styles.pulseCircle, 
              { transform: [{ scale: Animated.multiply(pulseAnim, 0.8) }], opacity: 0.25 }
            ]} 
          />
          <View style={styles.centerCircle}>
            <MaterialCommunityIcons name="radar" size={rs(80)} color="#fff" />
          </View>
        </View>

        <Text style={styles.waitingTitle}>Đang tìm tài xế...</Text>
        <Text style={styles.waitingSubtitle}>
          Yêu cầu của bạn đã được gửi đến các tài xế gần nhất. Vui lòng đợi trong giây lát.
        </Text>

        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleIconBox}>
                <MaterialCommunityIcons 
                  name={params.vehicleType === 'bike' ? 'motorbike' : 'car'} 
                  size={rs(40)} 
                  color={palette.primary} 
                />
              </View>
              <View>
                <Text style={styles.vehicleName}>
                  {params.vehicleType === 'bike' ? 'GoRide Bike' : 
                   params.vehicleType === 'car' ? 'GoRide Car' : 'GoRide Premium'}
                </Text>
                <Text style={styles.priceText}>15.000đ • Tiền mặt</Text>
              </View>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{params.distance} km</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.primary }]} />
              <Text style={styles.addressText} numberOfLines={1}>
                {params.pickupLabel}
              </Text>
            </View>
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: palette.danger }]} />
              <Text style={styles.addressText} numberOfLines={1}>
                {params.destLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Hủy chuyến</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(60),
  },
  searchingContainer: {
    width: rs(400),
    height: rs(400),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rvs(60),
  },
  pulseCircle: {
    position: 'absolute',
    width: rs(360),
    height: rs(360),
    borderRadius: rs(180),
    backgroundColor: palette.primary,
  },
  centerCircle: {
    width: rs(160),
    height: rs(160),
    borderRadius: rs(80),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  waitingTitle: {
    fontSize: rf(44),
    fontWeight: '800',
    color: palette.text,
    marginBottom: rvs(16),
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: rf(28),
    color: palette.muted,
    textAlign: 'center',
    lineHeight: rf(38),
    marginBottom: rvs(80),
  },
  tripCard: {
    width: '100%',
    backgroundColor: palette.card,
    borderRadius: rs(40),
    padding: rs(32),
    ...shadow,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rvs(24),
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(20),
  },
  vehicleIconBox: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleName: {
    fontSize: rf(30),
    fontWeight: '800',
    color: palette.text,
  },
  priceText: {
    fontSize: rf(24),
    color: palette.muted,
    marginTop: rvs(4),
  },
  distanceBadge: {
    backgroundColor: palette.greenSoft,
    paddingHorizontal: rs(16),
    paddingVertical: rvs(8),
    borderRadius: rs(12),
  },
  distanceText: {
    fontSize: rf(22),
    fontWeight: '700',
    color: palette.green,
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginBottom: rvs(24),
  },
  addressList: {
    gap: rvs(16),
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  dot: {
    width: rs(14),
    height: rs(14),
    borderRadius: rs(7),
  },
  addressText: {
    fontSize: rf(26),
    color: palette.text,
    flex: 1,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: rs(36),
    paddingBottom: rvs(48),
    paddingTop: rvs(24),
  },
  cancelButton: {
    height: rvs(110),
    borderRadius: rs(32),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: rf(30),
    fontWeight: '800',
    color: palette.danger,
  },
});
