import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const requests = [
  {
    id: 'trip-1',
    name: 'Minh Anh',
    route: 'Q.1 -> Q.3',
    distance: '2.4 km',
    fare: '48.000 đ',
  },
  {
    id: 'trip-2',
    name: 'Quoc Bao',
    route: 'Tan Binh -> Phu Nhuan',
    distance: '4.1 km',
    fare: '62.000 đ',
  },
];

export default function DriverScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBand}>
        <View style={styles.statusRow}>
          <View style={styles.onlineDot} />
          <Text style={styles.statusText}>Dang online - san sang nhan cuoc</Text>
        </View>
        <Text style={styles.title}>Cho cuoc xe moi</Text>
        <Text style={styles.subtitle}>
          Day la man hinh cho cuoc. Ban co the thay bang incoming request, timer hoac danh sach cuoc sau nay.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Hien tai</Text>
          <Text style={styles.summaryValue}>San sang</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Doanh thu hom nay</Text>
          <Text style={styles.summaryValue}>1.280.000 đ</Text>
        </View>
      </View>

      <View style={styles.queueCard}>
        <Text style={styles.sectionTitle}>Cuoc gan day</Text>
        {requests.map((request, index) => (
          <View key={request.id} style={[styles.requestCard, index === 0 && styles.primaryRequest]}>
            <View>
              <Text style={styles.requestName}>{request.name}</Text>
              <Text style={styles.requestRoute}>{request.route}</Text>
            </View>
            <View style={styles.requestMeta}>
              <Text style={styles.requestDistance}>{request.distance}</Text>
              <Text style={styles.requestFare}>{request.fare}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.waitCard}>
        <View style={styles.waitBadge}>
          <Text style={styles.waitBadgeText}>Waiting</Text>
        </View>
        <Text style={styles.waitTitle}>He thong dang lang nghe cuoc moi</Text>
        <Text style={styles.waitText}>
          Sau nay co the gan map, dinh vi tai xe, va popup chap nhan/tu choi cuoc vao khu vuc nay.
        </Text>

        <View style={styles.actionRow}>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Tam dung</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Cap nhat trang thai</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#0a1324',
  },
  topBand: {
    marginTop: 12,
    marginBottom: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 207, 116, 0.12)',
    marginBottom: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3ccf74',
    marginRight: 8,
  },
  statusText: {
    color: '#93f0b7',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#f5f8ff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: '#b7c4de',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#121d35',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: {
    color: '#8fa2c6',
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  queueCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#111b31',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  requestCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryRequest: {
    borderColor: 'rgba(63, 180, 92, 0.45)',
    backgroundColor: 'rgba(63, 180, 92, 0.08)',
  },
  requestName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  requestRoute: {
    color: '#b7c4de',
    fontSize: 13,
  },
  requestMeta: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestDistance: {
    color: '#8fe7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  requestFare: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  waitCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#0f1a30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  waitBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    marginBottom: 14,
  },
  waitBadgeText: {
    color: '#ffd76a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waitTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  waitText: {
    color: '#b7c4de',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#3ccf74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#06110b',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
