import { apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
import { mockCreateDriverProfile, mockGetDriverProfile, mockSendHeartbeat } from '@/lib/mock-driver-api';

export type DriverProfileDraft = {
  licenseNumber: string;
  licenseExpiry: string;
  idCardNumber: string;
  portraitUrl: string;
  vehiclePlate: string;
  vehicleType: 'MOTORBIKE' | 'CAR_4_SEAT' | 'CAR_7_SEAT';
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: number;
};

export type DriverProfileResponse = DriverProfileDraft & {
  id: number;
  userId: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};

// Backend wraps responses in { success, data, message, timestamp } envelope
type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
};

function unwrapEnvelope<T>(response: ApiEnvelope<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    (response as ApiEnvelope<T>).data !== undefined
  ) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

export function getDriverProfile(): Promise<DriverProfileResponse> {
  if (USE_MOCK_API) {
    return mockGetDriverProfile();
  }

  return apiRequest<ApiEnvelope<DriverProfileResponse>>('/drivers/me/profile').then(unwrapEnvelope);
}

export function createDriverProfile(draft: DriverProfileDraft): Promise<DriverProfileResponse> {
  if (USE_MOCK_API) {
    return mockCreateDriverProfile(draft);
  }

  return apiRequest<ApiEnvelope<DriverProfileResponse>>('/drivers/me/profile', {
    method: 'POST',
    body: draft,
  }).then(unwrapEnvelope);
}

export function sendHeartbeatRest(lat: number, lng: number) {
  if (USE_MOCK_API) {
    return mockSendHeartbeat(lat, lng);
  }

  type HeartbeatResponse = { online: boolean; heartbeatAt: string; expiresAt: string };

  return apiRequest<ApiEnvelope<HeartbeatResponse>>('/drivers/me/heartbeat', {
    method: 'POST',
    body: { lat, lng },
  }).then(unwrapEnvelope);
}
