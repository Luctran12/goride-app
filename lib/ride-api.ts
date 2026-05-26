import { apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
import {
  mockCancelTrip,
  mockCreateBooking,
  mockEstimateBooking,
  mockGetDriverLocation,
  mockGetPricing,
  mockGetTrip,
  mockRespondToTrip,
  mockSetDriverOnline,
  mockUpdateTripStatus,
} from '@/lib/mock-ride-api';
import type {
  BookingCreateResponse,
  BookingDraft,
  BookingEstimate,
  CancelTripResponse,
  DriverAction,
  DriverLocationUpdate,
  PricingConfig,
  TripDetail,
  TripStatus,
} from '@/types/ride';

type PricingResponse = {
  items: PricingConfig[];
};

export function getPricing() {
  return USE_MOCK_API ? mockGetPricing() : apiRequest<PricingResponse>('/pricing');
}

export function estimateBooking(draft: BookingDraft) {
  return USE_MOCK_API
    ? mockEstimateBooking(draft)
    : apiRequest<BookingEstimate>('/bookings/estimate', {
        method: 'POST',
        body: {
          pickup: draft.pickup,
          dropoff: draft.dropoff,
          vehicleType: draft.vehicleType,
        },
      });
}

export function createBooking(draft: BookingDraft, estimate: BookingEstimate) {
  return USE_MOCK_API
    ? mockCreateBooking(draft, estimate)
    : apiRequest<BookingCreateResponse>('/bookings', {
        method: 'POST',
        body: {
          pickup: draft.pickup,
          dropoff: draft.dropoff,
          vehicleType: draft.vehicleType,
          paymentMethod: draft.paymentMethod,
          pricingConfigId: estimate.pricingConfigId,
          estimatedFare: estimate.estimatedFare,
        },
      });
}

export function getTrip(tripId: number) {
  return USE_MOCK_API ? mockGetTrip(tripId) : apiRequest<TripDetail>(`/bookings/${tripId}`);
}

export function cancelTrip(tripId: number) {
  return USE_MOCK_API
    ? mockCancelTrip(tripId)
    : apiRequest<CancelTripResponse>(`/bookings/${tripId}/cancel`, {
        method: 'PATCH',
      });
}

export function getDriverLocation(tripId: number) {
  return USE_MOCK_API
    ? mockGetDriverLocation(tripId)
    : apiRequest<DriverLocationUpdate>(`/tracking/trips/${tripId}/driver-location`);
}

export function setDriverOnline(isOnline: boolean) {
  return USE_MOCK_API
    ? mockSetDriverOnline(isOnline)
    : apiRequest<{ isOnline: boolean; message: string }>('/drivers/me/status', {
        method: 'PATCH',
        body: { isOnline },
      });
}

export function respondToTrip(tripId: number, action: DriverAction) {
  return USE_MOCK_API
    ? mockRespondToTrip(tripId, action)
    : apiRequest<{ tripId: number; status: TripStatus }>(`/drivers/trips/${tripId}/respond`, {
        method: 'PATCH',
        body: { action },
      });
}

export function updateTripStatus(tripId: number, status: TripStatus) {
  return USE_MOCK_API
    ? mockUpdateTripStatus(tripId, status)
    : apiRequest<{ tripId: number; status: TripStatus }>(`/drivers/trips/${tripId}/status`, {
        method: 'PATCH',
        body: { status },
      });
}

