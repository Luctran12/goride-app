import { ApiError, apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
import type { ApiResponseThreeWordLocation, ThreeWordLocation } from '@/types/three-word';

/**
 * Validate 3-word address format.
 * Format must be exactly 3 non-empty segments separated by dots (e.g. "hoa.la.cay").
 */
export function isValidThreeWordAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  const parts = address.trim().split('.');
  return parts.length === 3 && parts.every((part) => part.trim().length > 0);
}

/**
 * Convert coordinate { lat, lng } to 3-word address.
 * Endpoint: GET /api/v1/locations/to-words?lat={lat}&lng={lng}
 */
export async function getLocationToWords(lat: number, lng: number): Promise<ThreeWordLocation> {
  if (USE_MOCK_API) {
    return mockGetLocationToWords(lat, lng);
  }

  try {
    const response = await apiRequest<ApiResponseThreeWordLocation | ThreeWordLocation>(
      `/locations/to-words?lat=${lat}&lng=${lng}`,
    );
    return unwrapThreeWordResponse(response);
  } catch (error) {
    throw handleToWordsError(error);
  }
}

/**
 * Convert 3-word address to coordinate { lat, lng }.
 * Endpoint: GET /api/v1/locations/to-coordinate?address={wordAddress}
 */
export async function getLocationToCoordinate(address: string): Promise<ThreeWordLocation> {
  const normalizedAddress = address ? address.trim() : '';

  if (!isValidThreeWordAddress(normalizedAddress)) {
    throw new ApiError(
      'Nhập đúng dạng 3 từ, ví dụ hoa.la.cay.',
      400,
      'WORD_LOCATION_INVALID_ADDRESS',
    );
  }

  if (USE_MOCK_API) {
    return mockGetLocationToCoordinate(normalizedAddress);
  }

  try {
    const response = await apiRequest<ApiResponseThreeWordLocation | ThreeWordLocation>(
      `/locations/to-coordinate?address=${encodeURIComponent(normalizedAddress)}`,
    );
    return unwrapThreeWordResponse(response);
  } catch (error) {
    throw handleToCoordinateError(error);
  }
}

function unwrapThreeWordResponse(
  response: ApiResponseThreeWordLocation | ThreeWordLocation,
): ThreeWordLocation {
  if (isThreeWordLocation(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new ApiError(response.message || 'Lỗi xử lý địa chỉ 3 từ');
    }
    if (response.data && isThreeWordLocation(response.data)) {
      return response.data;
    }
  }

  throw new ApiError('Phản hồi từ dịch vụ địa chỉ 3 từ không hợp lệ');
}

function isThreeWordLocation(value: unknown): value is ThreeWordLocation {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.lat === 'number' &&
    typeof obj.lng === 'number' &&
    Array.isArray(obj.words) &&
    typeof obj.wordAddress === 'string'
  );
}

function handleToWordsError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    if (error.status === 422 || error.code === 'WORD_LOCATION_OUT_OF_BOUNDS') {
      return new ApiError('Vị trí này nằm ngoài vùng hỗ trợ.', 422, 'WORD_LOCATION_OUT_OF_BOUNDS');
    }
    if (error.status === 502 || error.status === 503) {
      return new ApiError('Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.', error.status, error.code);
    }
    return new ApiError(
      error.message || 'Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.',
      error.status,
      error.code,
    );
  }
  return new ApiError('Chưa thể lấy địa chỉ 3 từ, vui lòng thử lại.');
}

function handleToCoordinateError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.code === 'WORD_LOCATION_INVALID_ADDRESS') {
      return new ApiError(
        'Nhập đúng dạng 3 từ, ví dụ hoa.la.cay.',
        400,
        'WORD_LOCATION_INVALID_ADDRESS',
      );
    }
    if (error.status === 404 || error.code === 'WORD_LOCATION_NOT_FOUND') {
      return new ApiError('Không tìm thấy địa chỉ 3 từ này.', 404, 'WORD_LOCATION_NOT_FOUND');
    }
    if (error.status === 502 || error.status === 503) {
      return new ApiError('Dịch vụ tra tọa độ tạm thời không khả dụng.', error.status, error.code);
    }
    return new ApiError(
      error.message || 'Dịch vụ tra tọa độ tạm thời không khả dụng.',
      error.status,
      error.code,
    );
  }
  return new ApiError('Dịch vụ tra tọa độ tạm thời không khả dụng.');
}

// --- MOCK API HELPERS ---

async function mockGetLocationToWords(lat: number, lng: number): Promise<ThreeWordLocation> {
  // Check bounds mock (e.g. coordinates outside Vietnam boundaries)
  if (lat < 8.0 || lat > 24.0 || lng < 102.0 || lng > 110.0) {
    throw new ApiError('Vị trí này nằm ngoài vùng hỗ trợ.', 422, 'WORD_LOCATION_OUT_OF_BOUNDS');
  }

  const deltaLat = Math.abs(lat - 10.762622);
  const deltaLng = Math.abs(lng - 106.660172);
  const words = ['hoa', 'la', 'cay'];
  const wordAddress = words.join('.');

  return {
    lat,
    lng,
    words,
    wordAddress,
    bounds: {
      southwest: { lat: lat - 0.0001, lng: lng - 0.0001 },
      northeast: { lat: lat + 0.0001, lng: lng + 0.0001 },
    },
  };
}

async function mockGetLocationToCoordinate(address: string): Promise<ThreeWordLocation> {
  const normalized = address.trim().toLowerCase();

  if (normalized === 'khong.tim.thay' || normalized === 'not.found.word') {
    throw new ApiError('Không tìm thấy địa chỉ 3 từ này.', 404, 'WORD_LOCATION_NOT_FOUND');
  }

  if (normalized === 'provider.error.down') {
    throw new ApiError('Dịch vụ tra tọa độ tạm thời không khả dụng.', 503, 'PROVIDER_ERROR');
  }

  const words = normalized.split('.');

  // Default coordinate in HCMC for mock
  const lat = 10.762622;
  const lng = 106.660172;

  return {
    lat,
    lng,
    words,
    wordAddress: normalized,
    bounds: {
      southwest: { lat: lat - 0.0001, lng: lng - 0.0001 },
      northeast: { lat: lat + 0.0001, lng: lng + 0.0001 },
    },
  };
}
