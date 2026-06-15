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

export function getDriverProfile() {
  return USE_MOCK_API ? mockGetDriverProfile() : apiRequest<DriverProfileResponse>('/drivers/me/profile');
}

export function createDriverProfile(draft: DriverProfileDraft) {
  return USE_MOCK_API ? mockCreateDriverProfile(draft) : apiRequest<DriverProfileResponse>('/drivers/me/profile', {
    method: 'POST',
    body: draft,
  });
}

export function sendHeartbeatRest(lat: number, lng: number) {
  return USE_MOCK_API ? mockSendHeartbeat(lat, lng) : apiRequest<{ online: boolean; heartbeatAt: string; expiresAt: string }>('/drivers/me/heartbeat', {
    method: 'POST',
    body: { lat, lng },
  });
}
