import { apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
import {
  mockCancelTrip,
  mockCreateBooking,
  mockEstimateBooking,
  mockGetDriverLocation,
  mockGetPricing,
  mockGetTrip,
  mockListBookings,
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
  TripHistoryPage,
  TripStatus,
} from '@/types/ride';

type PricingResponse = {
  items: PricingConfig[];
};

type ApiListResponse<TItem> = {
  data?: TItem[] | { items?: TItem[]; content?: TItem[]; total?: number; totalElements?: number };
  items?: TItem[];
  content?: TItem[];
  total?: number;
  totalElements?: number;
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

export async function listBookings(page = 1, size = 20): Promise<TripHistoryPage> {
  if (USE_MOCK_API) {
    return mockListBookings(page, size);
  }

  const response = await apiRequest<ApiListResponse<TripDetail>>(`/bookings?page=${page}&size=${size}`);
  return normalizeTripHistoryPage(response, page, size);
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

function normalizeTripHistoryPage(
  response: ApiListResponse<TripDetail> | TripDetail[],
  page: number,
  size: number,
): TripHistoryPage {
  if (Array.isArray(response)) {
    return {
      items: response,
      page,
      size,
      total: response.length,
    };
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      page,
      size,
      total: response.total ?? response.totalElements ?? data.length,
    };
  }

  const items = response.items ?? response.content ?? data?.items ?? data?.content ?? [];

  return {
    items,
    page,
    size,
    total: response.total ?? response.totalElements ?? data?.total ?? data?.totalElements ?? items.length,
  };
}

