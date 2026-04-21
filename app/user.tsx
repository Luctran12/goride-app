import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, ActivityIndicator, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

type Coords = {
  latitude: number;
  longitude: number;
};

type PlaceOption = {
  id: string;
  label: string;
  detail: string;
  pin: string;
  coords: Coords;
};

const INITIAL_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const places: PlaceOption[] = [
  { 
    id: 'current', 
    label: 'Vị trí hiện tại', 
    detail: 'Đang xác định...', 
    pin: 'Hiện tại',
    coords: INITIAL_COORDS 
  },
  { 
    id: 'home', 
    label: 'Về nhà', 
    detail: '42 Nguyễn Trãi, Q.1', 
    pin: 'Nhà',
    coords: { latitude: 10.7712, longitude: 106.6917 } 
  },
  { 
    id: 'office', 
    label: 'Đến văn phòng', 
    detail: '18 Lê Lợi, Q.3', 
    pin: 'Công ty',
    coords: { latitude: 10.7765, longitude: 106.7009 } 
  },
];

export default function UserScreen() {
  const [selectedPlace, setSelectedPlace] = useState(places[0].id);
  const [markerPosition, setMarkerPosition] = useState<Coords>(INITIAL_COORDS);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // State để khóa/mở ScrollView của toàn màn hình
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  // States cho tìm kiếm địa chỉ
  const [addressInput, setAddressInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Quyền truy cập vị trí bị từ chối');
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const currentCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setMarkerPosition(currentCoords);
        updateMap(currentCoords);
      } catch (error) {
        console.error(error);
        setLocationError('Không thể lấy vị trí hiện tại');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateMap = (coords: Coords) => {
    const jsCode = `
      if (typeof map !== 'undefined') {
        map.setView([${coords.latitude}, ${coords.longitude}], 16, { animate: true, duration: 1 });
        if (marker) {
          marker.setLatLng([${coords.latitude}, ${coords.longitude}]);
        }
      }
    `;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const handleSearchAddress = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ cần tìm.');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=5&countrycodes=vn`,
        {
          headers: {
            'User-Agent': 'GoRideApp/1.0',
          },
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy địa điểm nào phù hợp.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm kiếm địa chỉ.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const newCoords = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    
    setMarkerPosition(newCoords);
    updateMap(newCoords);
    setSelectedPlace('custom');
    setAddressInput(result.display_name.split(',')[0]);
    setSearchResults([]);
  };

  const handleSelectPlace = (place: PlaceOption) => {
    setSelectedPlace(place.id);
    setMarkerPosition(place.coords);
    updateMap(place.coords);
    setAddressInput(''); 
    setSearchResults([]);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_CLICK') {
        const coords = { latitude: data.lat, longitude: data.lng };
        setMarkerPosition(coords);
        setSelectedPlace('custom');
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentPlace = useMemo(
    () => places.find((place) => place.id === selectedPlace) ?? places[0],
    [selectedPlace],
  );

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #d6ecff; touch-action: none; }
          #map { height: 100vh; width: 100vw; }
          .leaflet-marker-icon { filter: hue-rotate(140deg); }
          .leaflet-container { background: #d6ecff; outline: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { 
            zoomControl: false,
            dragging: true,
            touchZoom: true,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            tap: true,
            inertia: true,
            zoomAnimation: true,
            markerZoomAnimation: true
          }).setView([${markerPosition.latitude}, ${markerPosition.longitude}], 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM',
            maxZoom: 19
          }).addTo(map);

          var marker = L.marker([${markerPosition.latitude}, ${markerPosition.longitude}], { 
            draggable: true,
            autoPan: true 
          }).addTo(map);
          
          marker.on('dragend', function(event) {
            var position = marker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_CLICK',
              lat: position.lat,
              lng: position.lng
            }));
          });

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            marker.setLatLng([lat, lng]);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_CLICK',
              lat: lat,
              lng: lng
            }));
          });

          // Thông báo cho React Native khi người dùng bắt đầu chạm vào bản đồ
          document.addEventListener('touchstart', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOUCH_START' }));
          }, false);
        </script>
      </body>
    </html>
  `;

  return (
    <ScrollView 
      contentContainerStyle={styles.container} 
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled} // Điều khiển việc cuộn của toàn màn hình
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>User screen (OSM Search)</Text>
        <Text style={styles.title}>Chọn điểm đón</Text>
        <Text style={styles.subtitle}>
          Vuốt để di chuyển, dùng 2 ngón tay để zoom. Khóa cuộn màn hình khi đang ở trên bản đồ.
        </Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập số nhà, tên đường..."
            value={addressInput}
            onChangeText={setAddressInput}
            returnKeyType="search"
            onSubmitEditing={handleSearchAddress}
          />
          <Pressable 
            style={({ pressed }) => [
              styles.searchButton, 
              pressed && styles.pressed,
              isSearching && styles.searchButtonDisabled
            ]}
            onPress={handleSearchAddress}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Tìm</Text>
            )}
          </Pressable>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {searchResults.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.resultItem,
                  pressed && styles.resultItemPressed,
                  index === searchResults.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => handleSelectSearchResult(item)}
              >
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.display_name.split(',')[0]}
                </Text>
                <Text style={styles.resultSubtitle} numberOfLines={1}>
                  {item.display_name.split(',').slice(1).join(',').trim()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Container của bản đồ với các handler bắt cử chỉ */}
      <View 
        style={styles.mapCard}
        onStartShouldSetResponder={() => {
          setScrollEnabled(false); // Khóa cuộn màn hình khi chạm vào vùng bản đồ
          return false;
        }}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0f62fe" />
            <Text style={styles.loaderText}>Đang lấy vị trí...</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={(e) => {
              const data = JSON.parse(e.nativeEvent.data);
              if (data.type === 'TOUCH_START') {
                setScrollEnabled(false); // Khóa thêm một lần nữa từ phía JS
              } else {
                handleWebViewMessage(e);
              }
            }}
            style={styles.map}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            androidLayerType="hardware" // Tăng tốc phần cứng trên Android
            onResponderRelease={() => setScrollEnabled(true)} // Mở khóa khi buông tay (phòng hờ)
          />
        )}
        
        {/* Nút bấm để mở khóa cuộn nếu lỡ bị kẹt */}
        <Pressable 
          style={styles.unlockScrollBtn}
          onPress={() => setScrollEnabled(true)}
        >
          <Text style={styles.unlockScrollText}>
            {scrollEnabled ? 'Màn hình tự do' : 'Bản đồ đang khóa màn hình'}
          </Text>
        </Pressable>

        <View style={styles.mapLabel}>
          <Text style={styles.mapLabelTitle}>
            {selectedPlace === 'custom' ? 'Vị trí ghim trên bản đồ' : currentPlace.label}
          </Text>
          <Text style={styles.mapLabelText}>
            Lat: {markerPosition.latitude.toFixed(6)}, Lng: {markerPosition.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      {/* Khi chạm ra ngoài bản đồ, đảm bảo cuộn màn hình được bật lại */}
      <View onTouchStart={() => setScrollEnabled(true)}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lựa chọn nhanh</Text>
          {places.map((place) => {
            const active = place.id === selectedPlace;

            return (
              <Pressable
                key={place.id}
                onPress={() => handleSelectPlace(place)}
                style={({ pressed }) => [
                  styles.placeCard,
                  active && styles.placeCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <View>
                  <Text style={styles.placeLabel}>{place.label}</Text>
                  <Text style={styles.placeDetail}>
                    {place.id === 'current' && !loading ? 'Tọa độ GPS hiện tại' : place.detail}
                  </Text>
                </View>
                <View style={[styles.placeBadge, active && styles.placeBadgeActive]}>
                  <Text style={[styles.placeBadgeText, active && styles.placeBadgeTextActive]}>
                    {active ? 'Đang chọn' : 'Chọn'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Xác nhận điểm đón</Text>
          <Text style={styles.summaryValue}>
            {selectedPlace === 'custom' ? 'Tọa độ đã chọn trên bản đồ' : currentPlace.detail}
          </Text>
          <Text style={styles.summaryHint}>
            Tài xế sẽ nhận được tọa độ chính xác này để đến đón bạn.
          </Text>

          <Pressable 
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => Alert.alert('Xác nhận', `Đặt xe tại vị trí: ${markerPosition.latitude.toFixed(6)}, ${markerPosition.longitude.toFixed(6)}`)}
          >
            <Text style={styles.primaryButtonText}>Xác nhận và đặt xe</Text>
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
    backgroundColor: '#f4f7fb',
  },
  header: {
    marginTop: 18,
    marginBottom: 10,
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
  searchSection: {
    marginBottom: 16,
    zIndex: 100, // Đảm bảo danh sách gợi ý hiện lên trên các thành phần khác
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e3e9f3',
    color: '#10233f',
  },
  searchButton: {
    width: 70,
    height: 50,
    backgroundColor: '#0f62fe',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#a2c4ff',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e9f3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5fb',
  },
  resultItemPressed: {
    backgroundColor: '#f1f7ff',
  },
  resultTitle: {
    color: '#10233f',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultSubtitle: {
    color: '#617088',
    fontSize: 12,
  },
  mapCard: {
    height: 320,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#d6ecff',
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 63, 0.08)',
    marginBottom: 18,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef5ff',
  },
  loaderText: {
    marginTop: 12,
    color: '#0f62fe',
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 10,
    borderRadius: 12,
    zIndex: 10,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapLabelTitle: {
    color: '#10233f',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  mapLabelText: {
    color: '#617088',
    fontSize: 12,
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
