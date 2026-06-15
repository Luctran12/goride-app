import { ApiError } from '@/lib/api';
import type { DriverProfileDraft, DriverProfileResponse } from './driver-api';

let mockProfileStore: DriverProfileResponse | null = null;

export async function mockGetDriverProfile(): Promise<DriverProfileResponse> {
  if (!mockProfileStore) {
    throw new ApiError('Driver profile not found', 404, 'DRIVER_PROFILE_NOT_FOUND');
  }
  return mockProfileStore;
}

export async function mockCreateDriverProfile(draft: DriverProfileDraft): Promise<DriverProfileResponse> {
  mockProfileStore = {
    ...draft,
    id: 10,
    userId: 5,
    approvalStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return mockProfileStore;
}

export async function mockSendHeartbeat(lat: number, lng: number) {
  return {
    online: true,
    heartbeatAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
}

export function setMockDriverApproved(approved: boolean) {
  if (mockProfileStore) {
    mockProfileStore.approvalStatus = approved ? 'APPROVED' : 'PENDING';
  }
}
