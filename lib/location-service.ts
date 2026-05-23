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
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });

    if (!address) {
      return formatCoordinates(coords);
    }

    return formatAddressParts([
      [address.streetNumber, address.street].filter(Boolean).join(' '),
      address.name,
      address.district,
      address.city,
      address.region,
    ]);
  } catch {
    return formatCoordinates(coords);
  }
}

export async function searchPlaces(query: string, bias?: Coordinates): Promise<LocationPoint[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (HAS_GOOGLE_MAPS_API_KEY) {
    return searchGooglePlaces(trimmedQuery, bias);
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
  const results = await Location.geocodeAsync(query);

  return Promise.all(
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

function formatAddressParts(parts: Array<string | null | undefined>) {
  const address = parts.map((part) => part?.trim()).filter(Boolean).join(', ');
  return address || 'Vị trí đã chọn';
}

function formatCoordinates(coords: Coordinates) {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Lấy vị trí quá thời gian chờ')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

