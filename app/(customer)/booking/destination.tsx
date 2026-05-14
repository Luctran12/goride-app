import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, ActivityIndicator, TextInput, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

type Coords = {
  latitude: number;
  longitude: number;
};

type PlaceOption = {
  id: string;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  coords: Coords;
};

const INITIAL_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const places: PlaceOption[] = [
  { 
    id: 'landmark81', 
    label: 'Landmark 81', 
    detail: '720A Điện Biên Phủ, Q.Bình Thạnh', 
    icon: 'business-outline',
    coords: { latitude: 10.7948, longitude: 106.7218 } 
  },
  { 
    id: 'aeon', 
    label: 'AEON Mall Tân Phú', 
    detail: '30 Bờ Bao Tân Thắng, Q.Tân Phú', 
    icon: 'cart-outline',
    coords: { latitude: 10.8012, longitude: 106.6167 } 
  },
  { 
    id: 'bitexco', 
    label: 'Bitexco Financial Tower', 
    detail: '2 Hải Triều, Quận 1', 
    icon: 'business-outline',
    coords: { latitude: 10.7715, longitude: 106.7043 } 
  },
];

export default function DestinationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedPlace, setSelectedPlace] = useState(places[0].id);
  const [markerPosition, setMarkerPosition] = useState<Coords>(INITIAL_COORDS);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
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
        
        const destinationCoords = {
            latitude: currentCoords.latitude + 0.005,
            longitude: currentCoords.longitude + 0.005,
        };

        setMarkerPosition(destinationCoords);
        updateMap(destinationCoords);
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

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_CLICK') {
        const coords = { latitude: data.lat, longitude: data.lng };
        setMarkerPosition(coords);
        setSelectedPlace('custom');
        setSearchResults([]);

        // Reverse geocoding to get address name
        try {
          const [address] = await Location.reverseGeocodeAsync(coords);
          if (address) {
            const name = address.streetNumber 
              ? `${address.streetNumber} ${address.street}, ${address.district || address.subregion}`
              : `${address.name || address.street}, ${address.district || address.subregion}`;
            setAddressInput(name);
          }
        } catch (e) {
          console.error('Reverse geocoding error:', e);
        }
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
          .leaflet-marker-icon { filter: hue-rotate(0deg); }
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

          document.addEventListener('touchstart', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOUCH_START' }));
          }, false);
        </script>
      </body>
    </html>
  `;

  const handleConfirm = () => {
    const label = selectedPlace === 'custom' 
      ? (addressInput || 'Vị trí ghim trên bản đồ') 
      : currentPlace.label;

    router.push({
        pathname: '/(customer)/booking/select-vehicle',
        params: {
          ...params,
          destLat: markerPosition.latitude,
          destLng: markerPosition.longitude,
          destLabel: label
        }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      
      <ScrollView 
        contentContainerStyle={styles.container} 
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={rs(40)} color={palette.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Chọn điểm đến</Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Feather name="search" size={rs(32)} color={palette.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Bạn muốn đi đâu?"
                placeholderTextColor={palette.muted}
                value={addressInput}
                onChangeText={setAddressInput}
                returnKeyType="search"
                onSubmitEditing={handleSearchAddress}
              />
              {addressInput.length > 0 && (
                <TouchableOpacity onPress={() => setAddressInput('')}>
                  <Ionicons name="close-circle" size={rs(32)} color={palette.muted} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.searchButton, 
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
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[
                    styles.resultItem,
                    index === searchResults.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons name="location-sharp" size={rs(30)} color={palette.primary} />
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.display_name.split(',')[0]}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {item.display_name.split(',').slice(1).join(',').trim()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View 
          style={styles.mapCard}
          onStartShouldSetResponder={() => {
            setScrollEnabled(false);
            return false;
          }}
        >
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.loaderText}>Đang tải bản đồ...</Text>
            </View>
          ) : (
            <>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                onMessage={(e) => {
                  const data = JSON.parse(e.nativeEvent.data);
                  if (data.type === 'TOUCH_START') {
                    setScrollEnabled(false);
                  } else {
                    handleWebViewMessage(e);
                  }
                }}
                style={styles.map}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                androidLayerType="hardware"
                onResponderRelease={() => setScrollEnabled(true)}
              />
              
              <TouchableOpacity 
                style={styles.myLocationButton}
                activeOpacity={0.8}
                onPress={async () => {
                  setLoading(true);
                  try {
                    let location = await Location.getCurrentPositionAsync({});
                    const currentCoords = {
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    };
                    setMarkerPosition(currentCoords);
                    updateMap(currentCoords);
                  } catch (e) {
                    Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={rs(40)} color={palette.primary} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.mapLabel}>
            <Ionicons name="pin" size={rs(24)} color={palette.danger} style={{marginRight: rs(8)}} />
            <View style={{flex: 1}}>
              <Text style={styles.mapLabelTitle} numberOfLines={1}>
                {selectedPlace === 'custom' 
                  ? (addressInput || 'Điểm đến trên bản đồ') 
                  : currentPlace.label}
              </Text>
              <Text style={styles.mapLabelText}>
                {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        </View>

        <View onTouchStart={() => setScrollEnabled(true)}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Địa điểm gợi ý</Text>
            {places.map((place) => {
              const active = place.id === selectedPlace;

              return (
                <TouchableOpacity
                  key={place.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectPlace(place)}
                  style={[
                    styles.placeCard,
                    active && styles.placeCardActive,
                  ]}
                >
                  <View style={styles.placeInfo}>
                    <View style={[styles.placeIcon, active && styles.placeIconActive]}>
                      <Ionicons 
                        name={place.icon} 
                        size={rs(32)} 
                        color={active ? '#fff' : palette.muted} 
                      />
                    </View>
                    <View>
                      <Text style={styles.placeLabel}>{place.label}</Text>
                      <Text style={styles.placeDetail} numberOfLines={1}>
                        {place.detail}
                      </Text>
                    </View>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={rs(40)} color={palette.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.indicator} />
              <Text style={styles.summaryTitle}>Chi tiết điểm đến</Text>
            </View>
            
            <View style={styles.addressRow}>
              <View style={styles.dotContainer}>
                <View style={styles.addressDot} />
                <View style={styles.addressLine} />
              </View>
              <View style={styles.addressContent}>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {selectedPlace === 'custom' 
                    ? (addressInput || 'Tọa độ đã chọn trên bản đồ') 
                    : currentPlace.detail}
                </Text>
                <Text style={styles.summaryHint}>
                  Vui lòng kiểm tra lại điểm đến của bạn
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.primaryButton}
              onPress={handleConfirm}
            >
              <Text style={styles.primaryButtonText}>Xác nhận điểm đến</Text>
              <Feather name="check" size={rs(32)} color="#fff" style={{marginLeft: rs(10)}} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{height: rvs(40)}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(36),
    paddingTop: rvs(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rvs(40),
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
    color: palette.text,
    fontSize: rf(38),
    fontWeight: '800',
  },
  searchSection: {
    marginBottom: rvs(32),
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  searchBox: {
    flex: 1,
    height: rvs(110),
    backgroundColor: palette.card,
    borderRadius: rs(20),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(24),
    ...shadow,
  },
  searchInput: {
    flex: 1,
    marginLeft: rs(20),
    fontSize: rf(28),
    color: palette.text,
    height: '100%',
  },
  searchButton: {
    width: rs(120),
    height: rvs(110),
    backgroundColor: palette.primary,
    borderRadius: rs(20),
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  searchButtonDisabled: {
    backgroundColor: palette.muted,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: rf(26),
  },
  resultsContainer: {
    marginTop: rvs(16),
    backgroundColor: palette.card,
    borderRadius: rs(24),
    ...shadow,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(24),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  resultIcon: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(20),
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    color: palette.text,
    fontSize: rf(28),
    fontWeight: '700',
    marginBottom: rvs(4),
  },
  resultSubtitle: {
    color: palette.muted,
    fontSize: rf(24),
  },
  mapCard: {
    height: rvs(600),
    borderRadius: rs(40),
    overflow: 'hidden',
    backgroundColor: '#d6ecff',
    marginBottom: rvs(32),
    position: 'relative',
    ...shadow,
  },
  map: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
  },
  loaderText: {
    marginTop: rvs(20),
    color: palette.primary,
    fontWeight: '600',
    fontSize: rf(28),
  },
  myLocationButton: {
    position: 'absolute',
    right: rs(24),
    top: rvs(24),
    width: rs(90),
    height: rs(90),
    borderRadius: rs(45),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  mapLabel: {
    position: 'absolute',
    bottom: rs(24),
    left: rs(24),
    right: rs(24),
    padding: rs(24),
    borderRadius: rs(24),
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  mapLabelTitle: {
    color: palette.text,
    fontSize: rf(26),
    fontWeight: '800',
    marginBottom: rvs(4),
  },
  mapLabelText: {
    color: palette.muted,
    fontSize: rf(22),
  },
  section: {
    marginBottom: rvs(40),
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(32),
    fontWeight: '800',
    marginBottom: rvs(24),
  },
  placeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: rs(28),
    borderRadius: rs(32),
    backgroundColor: palette.card,
    marginBottom: rvs(16),
    ...shadow,
  },
  placeCardActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
    borderWidth: 1,
  },
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeIcon: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(24),
  },
  placeIconActive: {
    backgroundColor: palette.primary,
  },
  placeLabel: {
    color: palette.text,
    fontSize: rf(28),
    fontWeight: '800',
    marginBottom: rvs(4),
  },
  placeDetail: {
    color: palette.muted,
    fontSize: rf(24),
    maxWidth: rs(350),
  },
  summaryCard: {
    padding: rs(32),
    borderRadius: rs(40),
    backgroundColor: palette.card,
    ...shadow,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: rvs(24),
  },
  indicator: {
    width: rs(80),
    height: rvs(8),
    borderRadius: rs(4),
    backgroundColor: palette.line,
    marginBottom: rvs(24),
  },
  summaryTitle: {
    color: palette.text,
    fontSize: rf(30),
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: rvs(32),
  },
  dotContainer: {
    alignItems: 'center',
    width: rs(40),
    marginRight: rs(20),
  },
  addressDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: palette.primary,
    marginTop: rvs(10),
  },
  addressLine: {
    flex: 1,
    width: 2,
    backgroundColor: palette.line,
    marginVertical: rvs(4),
  },
  addressContent: {
    flex: 1,
  },
  summaryValue: {
    color: palette.text,
    fontSize: rf(28),
    fontWeight: '700',
    marginBottom: rvs(8),
    lineHeight: rf(36),
  },
  summaryHint: {
    color: palette.muted,
    fontSize: rf(24),
  },
  primaryButton: {
    height: rvs(110),
    borderRadius: rs(30),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: rf(30),
    fontWeight: '800',
  },
});
