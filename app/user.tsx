import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type PlaceOption = {
  id: string;
  label: string;
  detail: string;
  pin: string;
};

const places: PlaceOption[] = [
  { id: 'current', label: 'Vi tri hien tai', detail: 'Demo - Vuon hoa trung tam', pin: 'Hiện tại' },
  { id: 'home', label: 'Ve nha', detail: '42 Nguyen Trai, Q.1', pin: 'Nha' },
  { id: 'office', label: 'Den van phong', detail: '18 Le Loi, Q.3', pin: 'Cong ty' },
];

export default function UserScreen() {
  const [selectedPlace, setSelectedPlace] = useState(places[0].id);

  const currentPlace = useMemo(
    () => places.find((place) => place.id === selectedPlace) ?? places[0],
    [selectedPlace],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>User screen</Text>
        <Text style={styles.title}>Chon vi tri hien tai</Text>
        <Text style={styles.subtitle}>
          Day la ban demo. Sau nay minh co the gan map that va GPS vao cung vi tri nay.
        </Text>
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapGridHorizontal} />
        <View style={styles.mapGridVertical} />
        <View style={[styles.mapGridHorizontal, styles.mapGridHorizontal2]} />
        <View style={[styles.mapGridVertical, styles.mapGridVertical2]} />
        <View style={styles.routeLine} />
        <View style={styles.pinOuter}>
          <View style={styles.pinInner} />
        </View>
        <View style={styles.mapLabel}>
          <Text style={styles.mapLabelTitle}>Demo Map</Text>
          <Text style={styles.mapLabelText}>{currentPlace.detail}</Text>
        </View>
        <View style={styles.locationBubble}>
          <Text style={styles.locationBubbleText}>{currentPlace.pin}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lua chon nhanh</Text>
        {places.map((place) => {
          const active = place.id === selectedPlace;

          return (
            <Pressable
              key={place.id}
              onPress={() => setSelectedPlace(place.id)}
              style={({ pressed }) => [
                styles.placeCard,
                active && styles.placeCardActive,
                pressed && styles.pressed,
              ]}
            >
              <View>
                <Text style={styles.placeLabel}>{place.label}</Text>
                <Text style={styles.placeDetail}>{place.detail}</Text>
              </View>
              <View style={[styles.placeBadge, active && styles.placeBadgeActive]}>
                <Text style={[styles.placeBadgeText, active && styles.placeBadgeTextActive]}>
                  {active ? 'Dang chon' : 'Chon'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Vi tri da chon</Text>
        <Text style={styles.summaryValue}>{currentPlace.detail}</Text>
        <Text style={styles.summaryHint}>
          Nut dat xe se dat o day sau khi ban ket noi map that.
        </Text>

        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Xac nhan vi tri va dat xe</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f4f7fb',
  },
  header: {
    marginTop: 18,
    marginBottom: 18,
  },
  kicker: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#10233f',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: '#607087',
    fontSize: 15,
    lineHeight: 22,
  },
  mapCard: {
    height: 280,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#d6ecff',
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 63, 0.08)',
    marginBottom: 18,
  },
  mapGridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 70,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  mapGridHorizontal2: {
    top: 168,
    opacity: 0.8,
  },
  mapGridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 92,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  mapGridVertical2: {
    left: 212,
    opacity: 0.8,
  },
  routeLine: {
    position: 'absolute',
    left: 48,
    right: 42,
    top: 128,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 140, 239, 0.18)',
  },
  pinOuter: {
    position: 'absolute',
    top: 112,
    left: 126,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#0f62fe',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f62fe',
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  mapLabelTitle: {
    color: '#10233f',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  mapLabelText: {
    color: '#617088',
    fontSize: 13,
    lineHeight: 18,
  },
  locationBubble: {
    position: 'absolute',
    top: 18,
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 98, 254, 0.12)',
  },
  locationBubbleText: {
    color: '#0f62fe',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#10233f',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  placeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e3e9f3',
  },
  placeCardActive: {
    borderColor: '#0f62fe',
    backgroundColor: '#eef5ff',
  },
  placeLabel: {
    color: '#10233f',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  placeDetail: {
    color: '#617088',
    fontSize: 13,
  },
  placeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5fb',
  },
  placeBadgeActive: {
    backgroundColor: '#0f62fe',
  },
  placeBadgeText: {
    color: '#52627a',
    fontSize: 12,
    fontWeight: '700',
  },
  placeBadgeTextActive: {
    color: '#ffffff',
  },
  summaryCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    marginBottom: 8,
  },
  summaryTitle: {
    color: '#10233f',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#0f62fe',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryHint: {
    color: '#607087',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#10233f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
