import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LoginChoiceScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>GoRide Mini</Text>
        </View>

        <Text style={styles.title}>Chon vai tro</Text>
        <Text style={styles.subtitle}>
          Vao nhanh man hinh phu hop voi ban: khach hang dat xe hoac tai xe cho cuoc.
        </Text>

        <View style={styles.featureRow}>
          <View style={styles.featurePill}>
            <Text style={styles.featureLabel}>User</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featureLabel}>Driver</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featureLabel}>Demo map</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/user')}
        style={({ pressed }) => [styles.roleButton, styles.userButton, pressed && styles.pressed]}
      >
        <Text style={styles.roleTitle}>Vao voi vai tro User</Text>
        <Text style={styles.roleDesc}>Chon vi tri hien tai va bat dau dat xe.</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/driver')}
        style={({ pressed }) => [styles.roleButton, styles.driverButton, pressed && styles.pressed]}
      >
        <Text style={styles.roleTitle}>Vao voi vai tro Driver</Text>
        <Text style={styles.roleDesc}>Cho cuoc xe moi va xem trang thai san sang.</Text>
      </Pressable>
      
      <Pressable
        onPress={() => router.push('/home')}
        style={({ pressed }) => [styles.roleButton, styles.userButton, pressed && styles.pressed]}
      >
        <Text style={styles.roleTitle}>Vào trang chủ</Text>
      </Pressable>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Chu y</Text>
        <Text style={styles.noteText}>
          Man hinh nay da bo phan dang nhap. Tam thoi chi chon vai tro de di vao 2 luong user va driver.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 28,
    backgroundColor: '#08111f',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 197, 255, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 20,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(63, 180, 92, 0.14)',
  },
  heroCard: {
    padding: 22,
    borderRadius: 30,
    backgroundColor: '#111b31',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(40, 197, 255, 0.14)',
    marginBottom: 18,
  },
  badgeText: {
    color: '#8fe7ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f5f9ff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#b4c2da',
    fontSize: 15,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  featurePill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  featureLabel: {
    color: '#d7e1f5',
    fontWeight: '600',
  },
  roleButton: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  userButton: {
    backgroundColor: '#0c2a2d',
  },
  driverButton: {
    backgroundColor: '#1b2437',
  },
  roleTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  roleDesc: {
    color: '#c8d2e6',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  noteCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  noteText: {
    color: '#b3c0d7',
    fontSize: 14,
    lineHeight: 20,
  },
});
