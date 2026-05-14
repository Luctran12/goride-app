import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
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

const vehicleTypes = [
  {
    id: 'bike',
    name: 'GoRide Bike',
    icon: 'motorbike',
    price: '15,000đ',
    estimate: '3 phút',
    capacity: 1,
    desc: 'Nhanh chóng & Tiết kiệm',
  },
  {
    id: 'car',
    name: 'GoRide Car',
    icon: 'car',
    price: '45,000đ',
    estimate: '5 phút',
    capacity: 4,
    desc: 'Thoải mái & Tiện nghi',
  },
  {
    id: 'car_premium',
    name: 'GoRide Premium',
    icon: 'car-back',
    price: '65,000đ',
    estimate: '5 phút',
    capacity: 4,
    desc: 'Sang trọng & Đẳng cấp',
  },
];

export default function SelectVehicleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleTypes[0].id);

  const pickupCoords = {
    lat: parseFloat(params.pickupLat as string),
    lng: parseFloat(params.pickupLng as string),
  };
  const destCoords = {
    lat: parseFloat(params.destLat as string),
    lng: parseFloat(params.destLng as string),
  };

  const distance = useMemo(() => {
    if (!pickupCoords.lat || !destCoords.lat) return 0;
    
    // Haversine formula to calculate distance
    const R = 6371; // Radius of the earth in km
    const dLat = (destCoords.lat - pickupCoords.lat) * (Math.PI / 180);
    const dLon = (destCoords.lng - pickupCoords.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickupCoords.lat * (Math.PI / 180)) * 
      Math.cos(destCoords.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [pickupCoords, destCoords]);

  const handleConfirmBooking = () => {
    router.push({
      pathname: '/(customer)/booking/waiting-driver',
      params: {
        ...params,
        vehicleType: selectedVehicle,
        distance: distance.toFixed(1),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={rs(40)} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Chọn loại xe</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleRow}>
              <MaterialCommunityIcons name="map-marker-distance" size={rs(32)} color={palette.primary} />
              <Text style={styles.routeTitle}>Lộ trình dự kiến</Text>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
            </View>
          </View>

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <View style={styles.dotContainer}>
                <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                <View style={styles.line} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>Điểm đón</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {params.pickupLabel || 'Vị trí đã chọn'}
                </Text>
              </View>
            </View>

            <View style={styles.addressItem}>
              <View style={styles.dotContainer}>
                <View style={[styles.dot, { backgroundColor: palette.danger }]} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>Điểm đến</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {params.destLabel || 'Vị trí đã chọn'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dịch vụ đề xuất</Text>

        <View style={styles.vehicleList}>
          {vehicleTypes.map((vehicle) => {
            const active = vehicle.id === selectedVehicle;
            return (
              <TouchableOpacity
                key={vehicle.id}
                activeOpacity={0.8}
                style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                onPress={() => setSelectedVehicle(vehicle.id)}
              >
                <View style={[styles.vehicleIconBox, active && styles.vehicleIconBoxActive]}>
                  <MaterialCommunityIcons
                    name={vehicle.icon as any}
                    size={rs(48)}
                    color={active ? '#fff' : palette.muted}
                  />
                </View>
                
                <View style={styles.vehicleContent}>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    <Text style={styles.vehiclePrice}>{vehicle.price}</Text>
                  </View>
                  <Text style={styles.vehicleDesc}>{vehicle.desc}</Text>
                  <View style={styles.vehicleFooter}>
                    <View style={styles.estimateBox}>
                      <Ionicons name="time-outline" size={rs(24)} color={palette.muted} />
                      <Text style={styles.vehicleMetaText}>{vehicle.estimate}</Text>
                    </View>
                    <View style={styles.capacityBox}>
                      <Ionicons name="person-outline" size={rs(24)} color={palette.muted} />
                      <Text style={styles.vehicleMetaText}>{vehicle.capacity}</Text>
                    </View>
                  </View>
                </View>

                {active && (
                  <View style={styles.activeIndicator}>
                    <Ionicons name="checkmark-circle" size={rs(36)} color={palette.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.paymentSection}>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentIconBox}>
              <MaterialCommunityIcons name="cash" size={rs(32)} color={palette.green} />
            </View>
            <View>
              <Text style={styles.paymentLabel}>Thanh toán</Text>
              <Text style={styles.paymentMethod}>Tiền mặt</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.changePaymentButton}>
            <Text style={styles.changePaymentText}>Thay đổi</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          style={styles.confirmButton} 
          onPress={handleConfirmBooking}
        >
          <Text style={styles.confirmButtonText}>
            Đặt {vehicleTypes.find(v => v.id === selectedVehicle)?.name}
          </Text>
          <Feather name="arrow-right" size={rs(32)} color="#fff" style={{marginLeft: rs(12)}} />
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
    paddingHorizontal: rs(36),
    paddingTop: rvs(20),
    paddingBottom: rvs(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(36),
    paddingTop: rvs(40),
    paddingBottom: rvs(20),
  },
  backButton: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(24),
    ...shadow,
  },
  title: {
    fontSize: rf(38),
    fontWeight: '800',
    color: palette.text,
  },
  routeCard: {
    backgroundColor: palette.card,
    borderRadius: rs(40),
    padding: rs(32),
    marginBottom: rvs(40),
    ...shadow,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rvs(32),
    paddingBottom: rvs(24),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  routeTitle: {
    fontSize: rf(30),
    fontWeight: '800',
    color: palette.text,
  },
  distanceBadge: {
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(20),
    paddingVertical: rvs(8),
    borderRadius: rs(16),
  },
  distanceText: {
    fontSize: rf(24),
    fontWeight: '700',
    color: palette.primary,
  },
  addressList: {
    gap: rvs(8),
  },
  addressItem: {
    flexDirection: 'row',
  },
  dotContainer: {
    width: rs(40),
    alignItems: 'center',
    marginRight: rs(20),
  },
  dot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    marginTop: rvs(8),
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: palette.line,
    marginVertical: rvs(4),
  },
  addressInfo: {
    flex: 1,
    paddingBottom: rvs(16),
  },
  addressLabel: {
    fontSize: rf(22),
    color: palette.muted,
    marginBottom: rvs(4),
  },
  addressText: {
    fontSize: rf(26),
    fontWeight: '700',
    color: palette.text,
  },
  sectionTitle: {
    fontSize: rf(32),
    fontWeight: '800',
    color: palette.text,
    marginBottom: rvs(24),
  },
  vehicleList: {
    gap: rvs(20),
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: rs(32),
    padding: rs(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadow,
  },
  vehicleCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  vehicleIconBox: {
    width: rs(100),
    height: rs(100),
    borderRadius: rs(24),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(24),
  },
  vehicleIconBoxActive: {
    backgroundColor: palette.primary,
  },
  vehicleContent: {
    flex: 1,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rvs(4),
  },
  vehicleName: {
    fontSize: rf(28),
    fontWeight: '800',
    color: palette.text,
  },
  vehiclePrice: {
    fontSize: rf(28),
    fontWeight: '800',
    color: palette.primary,
  },
  vehicleDesc: {
    fontSize: rf(22),
    color: palette.muted,
    marginBottom: rvs(8),
  },
  vehicleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(24),
  },
  estimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  capacityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  vehicleMetaText: {
    fontSize: rf(22),
    color: palette.muted,
    fontWeight: '600',
  },
  activeIndicator: {
    marginLeft: rs(12),
  },
  footer: {
    backgroundColor: palette.card,
    paddingHorizontal: rs(36),
    paddingTop: rvs(24),
    paddingBottom: rvs(48),
    borderTopLeftRadius: rs(40),
    borderTopRightRadius: rs(40),
    ...shadow,
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(24),
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(20),
  },
  paymentIconBox: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(20),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    fontSize: rf(22),
    color: palette.muted,
  },
  paymentMethod: {
    fontSize: rf(26),
    fontWeight: '700',
    color: palette.text,
  },
  changePaymentButton: {
    paddingHorizontal: rs(24),
    paddingVertical: rvs(12),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
  },
  changePaymentText: {
    fontSize: rf(24),
    fontWeight: '700',
    color: palette.primary,
  },
  confirmButton: {
    height: rvs(110),
    backgroundColor: palette.primary,
    borderRadius: rs(32),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: rf(30),
    fontWeight: '800',
  },
});
