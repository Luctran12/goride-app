import { ApiError, apiRequest } from '@/lib/api';
import { API_BASE_URL, AUTH_API_BASE_URL, DEFAULT_BACKEND_ORIGIN, USE_MOCK_AUTH_API } from '@/lib/config';

export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export type UserProfile = {
  id: number;
  fullName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  status?: UserStatus;
  roles?: UserRole[];
  createdAt?: string;
  updatedAt?: string;
  dateOfBirth?: string;
  gender?: string;
  totalTrips?: number;
  tripCount?: number;
  averageRating?: number;
  savedPlacesCount?: number;
  savedLocationsCount?: number;
};

type ApiResponse<TData> = {
  success?: boolean;
  data?: TData;
  message?: string;
  timestamp?: string;
};

export async function getMyProfile() {
  if (USE_MOCK_AUTH_API) {
    return mockUserProfile();
  }

  const response = await apiRequest<ApiResponse<UserProfile> | UserProfile>('/api/users/me', {
    baseURL: getUsersApiOrigin(),
  });

  return unwrapUserProfile(response);
}

function unwrapUserProfile(response: ApiResponse<UserProfile> | UserProfile) {
  if (isUserProfile(response)) {
    return response;
  }

  if (response.success === false) {
    throw new ApiError(response.message ?? 'Không thể tải thông tin cá nhân');
  }

  if (!response.data) {
    throw new ApiError(response.message ?? 'Phản hồi thông tin cá nhân không hợp lệ');
  }

  return response.data;
}

function isUserProfile(value: ApiResponse<UserProfile> | UserProfile): value is UserProfile {
  return typeof (value as UserProfile).id === 'number' && typeof (value as UserProfile).fullName === 'string';
}

function getUsersApiOrigin() {
  const configuredBaseUrl = API_BASE_URL ?? AUTH_API_BASE_URL ?? DEFAULT_BACKEND_ORIGIN;

  return stripApiBasePath(configuredBaseUrl);
}

function stripApiBasePath(value: string) {
  return value.replace(/\/+$/, '').replace(/\/api\/v\d+$/i, '').replace(/\/api$/i, '');
}

function mockUserProfile(): UserProfile {
  return {
    id: 1,
    fullName: 'Nguyen Van A',
    phone: '+84 123 456 789',
    email: 'an.nguyen@example.com',
    avatarUrl: 'https://i.pravatar.cc/300?img=12',
    status: 'ACTIVE',
    roles: ['PASSENGER'],
    dateOfBirth: '1995-05-15',
    gender: 'MALE',
    totalTrips: 150,
    averageRating: 4.9,
    savedPlacesCount: 12,
  };
}
