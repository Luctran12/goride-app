import * as Location from 'expo-location';

import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import type { Coordinates, LocationPermissionState, LocationPoint } from '@/types/ride';

const DEFAULT_LOCATION: LocationPoint = {
  lat: 10.762622,
  lng: 106.660172,
  address: 'TP. Hồ Chí Minh',
  label: 'Vị trí mặc định',
};

type PlacePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
  };
};

type PlacesAutocompleteResponse = {
  predictions?: PlacePrediction[];
  status?: string;
  error_message?: string;
};

type PlaceDetailsResponse = {
  result?: {
    formatted_address?: string;
    name?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    place_id?: string;
  };
  status?: string;
  error_message?: string;
};

export type LocationPermissionResult = {
  granted: boolean;
  status: LocationPermissionState;
  canAskAgain?: boolean;
};

export type CurrentLocationOptions = {
  timeoutMs?: number;
};

export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    return { granted: false, status: 'gps-disabled' };
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    return {
      granted: false,
      status: 'permission-needed',
      canAskAgain: permission.canAskAgain,
    };
  }

  return { granted: true, status: 'ready', canAskAgain: permission.canAskAgain };
}

export async function getCurrentLocationPoint(options: CurrentLocationOptions = {}): Promise<LocationPoint> {
  const location = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    options.timeoutMs ?? 10000,
  );

  const coords = {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };

  return {
    ...coords,
    address: await reverseGeocode(coords),
    label: 'Vị trí hiện tại',
  };
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  // 1. Try Expo native Location.reverseGeocodeAsync first
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });

    if (address) {
      const formatted = formatAddressParts([
        [address.streetNumber, address.street].filter(Boolean).join(' '),
        address.name,
        address.district,
        address.city,
        address.region,
      ]);

      if (formatted && formatted !== 'Vị trí đã chọn') {
        return formatted;
      }
    }
  } catch (err) {
    console.warn('[LocationService] Expo reverseGeocodeAsync unavailable/unauthorized, trying Nominatim API:', err);
  }

  // 2. Fallback: OpenStreetMap Nominatim Reverse Geocoding API
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GoRideApp/1.0',
          'Accept-Language': 'vi',
        },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { display_name?: string };
      if (data?.display_name) {
        return data.display_name;
      }
    }
  } catch (nominatimErr) {
    console.warn('[LocationService] Nominatim reverseGeocode fallback failed:', nominatimErr);
  }

  // 3. Graceful fallback: formatted coordinates
  return formatCoordinates(coords);
}

export async function searchPlaces(query: string, bias?: Coordinates): Promise<LocationPoint[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (HAS_GOOGLE_MAPS_API_KEY) {
    try {
      return await searchGooglePlaces(trimmedQuery, bias);
    } catch (err) {
      console.warn('[LocationService] Google Places search failed, trying fallback:', err);
    }
  }

  return searchExpoGeocode(trimmedQuery);
}

export async function getPlaceDetails(placeId: string): Promise<LocationPoint | null> {
  if (!HAS_GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_address,geometry,name,place_id',
    key: GOOGLE_MAPS_API_KEY ?? '',
    language: 'vi',
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
  const data = (await response.json()) as PlaceDetailsResponse;
  const location = data.result?.geometry?.location;

  if (!response.ok || data.status !== 'OK' || !location) {
    throw new Error(data.error_message ?? 'Không thể lấy chi tiết địa điểm');
  }

  return {
    lat: location.lat,
    lng: location.lng,
    address: data.result?.formatted_address ?? data.result?.name ?? formatCoordinates(location),
    label: data.result?.name,
    placeId: data.result?.place_id ?? placeId,
  };
}

export function getDefaultLocationPoint() {
  return DEFAULT_LOCATION;
}

async function searchGooglePlaces(query: string, bias?: Coordinates): Promise<LocationPoint[]> {
  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY ?? '',
    language: 'vi',
    components: 'country:vn',
  });

  if (bias) {
    params.set('location', `${bias.lat},${bias.lng}`);
    params.set('radius', '30000');
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
  const data = (await response.json()) as PlacesAutocompleteResponse;

  if (!response.ok || (data.status && !['OK', 'ZERO_RESULTS'].includes(data.status))) {
    throw new Error(data.error_message ?? 'Không thể tìm địa chỉ');
  }

  return (data.predictions ?? []).map((prediction) => ({
    lat: bias?.lat ?? DEFAULT_LOCATION.lat,
    lng: bias?.lng ?? DEFAULT_LOCATION.lng,
    address: prediction.description,
    label: prediction.structured_formatting?.main_text ?? prediction.description,
    placeId: prediction.place_id,
  }));
}

async function searchExpoGeocode(query: string): Promise<LocationPoint[]> {
  try {
    const results = await Location.geocodeAsync(query);

    if (results && results.length > 0) {
      return await Promise.all(
        results.slice(0, 5).map(async (result, index) => {
          const coords = {
            lat: result.latitude,
            lng: result.longitude,
          };

          return {
            ...coords,
            address: await reverseGeocode(coords),
            label: index === 0 ? query : `${query} (${index + 1})`,
          };
        }),
      );
    }
  } catch (err) {
    console.warn('[LocationService] Expo geocodeAsync unavailable/unauthorized, trying Nominatim API:', err);
  }

  return searchNominatimGeocode(query);
}

async function searchNominatimGeocode(query: string): Promise<LocationPoint[]> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      countrycodes: 'vn',
      limit: '5',
      addressdetails: '1',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'GoRideApp/1.0',
        'Accept-Language': 'vi',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string; name?: string; place_id?: number }>;
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item, index) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name ?? query,
      label: item.name ?? (item.display_name ? item.display_name.split(',')[0] : query),
      placeId: `nominatim_${item.place_id ?? index}`,
    }));
  } catch (err) {
    console.warn('[LocationService] Nominatim search fallback failed:', err);
    return [];
  }
}

function formatAddressParts(parts: Array<string | null | undefined>) {
  const address = parts.map((part) => part?.trim()).filter(Boolean).join(', ');
  return address || 'Vị trí đã chọn';
}

function formatCoordinates(coords: Coordinates) {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = 'Lấy vị trí quá thời gian chờ'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export type RoutePath = {
  coordinates: { latitude: number; longitude: number }[];
  distanceMeters: number;
  durationSeconds: number;
};

export async function fetchRoute(origin: Coordinates, destination: Coordinates): Promise<RoutePath> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    
    const fetchPromise = async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }
      return data;
    };

    const data = await withTimeout(fetchPromise(), 8000, 'Lấy lộ trình quá thời gian chờ');
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((coord: [number, number]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    return {
      coordinates: coords,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (error) {
    console.warn('[LocationService] Failed to fetch route:', error);
    // Fallback to direct line
    return {
      coordinates: [
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
      ],
      distanceMeters: 0,
      durationSeconds: 0,
    };
  }
}

