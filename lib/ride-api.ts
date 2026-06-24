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
  mockSubmitTripRating,
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
  TripRatingDraft,
  TripRatingResponse,
  TripStatus,
} from '@/types/ride';

type PricingResponse = {
  items: PricingConfig[];
};

type ApiResponse<TData> = {
  success?: boolean;
  data?: TData;
  message?: string;
  timestamp?: string;
};

type ApiListResponse<TItem> = {
  success?: boolean;
  data?: TItem[] | { items?: TItem[]; content?: TItem[]; total?: number; totalElements?: number };
  items?: TItem[];
  content?: TItem[];
  total?: number;
  totalElements?: number;
};

export function getPricing(): Promise<PricingResponse> {
  if (USE_MOCK_API) {
    return mockGetPricing();
  }

  return apiRequest<ApiResponse<any>>('/pricing').then((res) => {
    const data = res.data;
    if (Array.isArray(data)) {
      return { items: data };
    }
    if (data && Array.isArray(data.items)) {
      return data;
    }
    return { items: [] };
  });
}

export function estimateBooking(draft: BookingDraft): Promise<BookingEstimate> {
  if (USE_MOCK_API) {
    return mockEstimateBooking(draft);
  }

  return apiRequest<ApiResponse<any>>('/bookings/estimate', {
    method: 'POST',
    body: {
      pickup: draft.pickup,
      dropoff: draft.dropoff,
      vehicleType: draft.vehicleType,
    },
  }).then((res) => {
    const data = res.data;
    if (!data) {
      throw new Error('Không nhận được dữ liệu báo giá từ máy chủ.');
    }
    return {
      estimatedDistance: data.distanceKm ?? data.estimatedDistanceKm ?? 0,
      estimatedDuration: data.durationMinutes ?? data.estimatedDurationMin ?? 0,
      estimatedFare: data.estimatedFare ?? 0,
      pricingConfigId: data.pricingConfigId ?? 1,
    };
  });
}

export function createBooking(draft: BookingDraft, estimate: BookingEstimate): Promise<BookingCreateResponse> {
  if (USE_MOCK_API) {
    return mockCreateBooking(draft, estimate);
  }

  return apiRequest<ApiResponse<any>>('/bookings', {
    method: 'POST',
    body: {
      pickup: draft.pickup,
      dropoff: draft.dropoff,
      vehicleType: draft.vehicleType,
      paymentMethod: draft.paymentMethod,
    },
  }).then((res) => {
    const data = res.data;
    if (!data) {
      throw new Error('Không nhận được thông tin chuyến xe mới.');
    }
    return {
      tripId: data.id,
      status: data.status,
      estimatedFare: data.estimatedFare ?? estimate.estimatedFare,
      estimatedDistance: data.estimatedDistanceKm ?? data.distanceKm ?? estimate.estimatedDistance,
    };
  });
}

export function getTrip(tripId: number): Promise<TripDetail> {
  if (USE_MOCK_API) {
    return mockGetTrip(tripId);
  }

  return apiRequest<ApiResponse<any>>(`/bookings/${tripId}`).then((res) => {
    const data = res.data;
    if (!data) {
      throw new Error('Không tìm thấy thông tin chuyến xe.');
    }
    return normalizeTripDetail(data);
  });
}

export async function listBookings(page = 1, size = 20): Promise<TripHistoryPage> {
  if (USE_MOCK_API) {
    return mockListBookings(page, size);
  }

  const response = await apiRequest<ApiListResponse<any>>(`/bookings?page=${page}&size=${size}`);
  return normalizeTripHistoryPage(response, page, size);
}

export function cancelTrip(tripId: number, reason = ''): Promise<CancelTripResponse> {
  if (USE_MOCK_API) {
    return mockCancelTrip(tripId);
  }

  return apiRequest<ApiResponse<any>>(`/bookings/${tripId}/cancel`, {
    method: 'PATCH',
    body: { reason },
  }).then((res) => {
    const data = res.data;
    return {
      tripId: data?.id ?? data?.tripId ?? tripId,
      status: data?.status ?? 'CANCELLED',
    };
  });
}

export function getDriverLocation(tripId: number): Promise<DriverLocationUpdate> {
  if (USE_MOCK_API) {
    return mockGetDriverLocation(tripId);
  }

  return apiRequest<ApiResponse<DriverLocationUpdate>>(`/tracking/trips/${tripId}/driver-location`).then((res) => {
    const data = res.data;
    if (!data) {
      throw new Error('Không tìm thấy tọa độ tài xế.');
    }
    return data;
  });
}

export function setDriverOnline(isOnline: boolean, lat?: number, lng?: number) {
  if (USE_MOCK_API) {
    return mockSetDriverOnline(isOnline);
  }

  return apiRequest<ApiResponse<any>>('/drivers/me/status', {
    method: 'PATCH',
    body: {
      online: isOnline,
      lat: lat ?? 10.7769,
      lng: lng ?? 106.7009,
    },
  }).then((res) => {
    const data = res.data;
    return {
      online: data?.online ?? isOnline,
      message: res.message ?? data?.message ?? '',
    };
  });
}

export function respondToTrip(tripId: number, action: DriverAction) {
  if (USE_MOCK_API) {
    return mockRespondToTrip(tripId, action);
  }

  return apiRequest<ApiResponse<any>>(`/drivers/trips/${tripId}/respond`, {
    method: 'PATCH',
    body: { action },
  }).then((res) => {
    const data = res.data;
    return {
      tripId: data?.tripId ?? data?.id ?? tripId,
      status: data?.status ?? (action === 'ACCEPT' ? 'ACCEPTED' : 'CANCELLED'),
    };
  });
}

export function updateTripStatus(tripId: number, status: TripStatus) {
  if (USE_MOCK_API) {
    return mockUpdateTripStatus(tripId, status);
  }

  return apiRequest<ApiResponse<any>>(`/drivers/trips/${tripId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => {
    const data = res.data;
    return {
      tripId: data?.tripId ?? data?.id ?? tripId,
      status: data?.status ?? status,
    };
  });
}

export function submitTripRating(draft: TripRatingDraft): Promise<TripRatingResponse> {
  if (USE_MOCK_API) {
    return mockSubmitTripRating(draft);
  }

  return apiRequest<ApiResponse<TripRatingResponse>>('/ratings', {
    method: 'POST',
    body: {
      tripId: draft.tripId,
      score: draft.score,
      comment: draft.comment,
    },
  }).then((res) => {
    const data = res.data;
    if (!data) {
      throw new Error('Gửi đánh giá không thành công.');
    }
    return data;
  });
}

export function confirmCashPayment(tripId: number) {
  if (USE_MOCK_API) {
    return Promise.resolve({ tripId, status: 'COMPLETED', amount: 45000, paidAt: new Date().toISOString() });
  }

  return apiRequest<ApiResponse<any>>(`/drivers/trips/${tripId}/payment-confirm`, {
    method: 'PATCH',
  }).then((res) => {
    const data = res.data;
    return {
      tripId: data?.tripId ?? data?.id ?? tripId,
      status: data?.status ?? 'COMPLETED',
      amount: data?.amount ?? 0,
      paidAt: data?.paidAt ?? new Date().toISOString(),
    };
  });
}

function normalizeTripDetail(data: any): TripDetail {
  return {
    tripId: data.id ?? data.tripId,
    status: data.status,
    passenger: data.passenger ? {
      id: data.passenger.id,
      fullName: data.passenger.fullName,
      phone: data.passenger.phone,
      avatarUrl: data.passenger.avatarUrl,
    } : undefined,
    driver: data.driver ? {
      id: data.driver.id,
      fullName: data.driver.fullName,
      phone: data.driver.phone,
      avatarUrl: data.driver.avatarUrl,
      vehiclePlate: data.driver.vehiclePlate,
      vehicleType: data.driver.vehicleType,
      averageRating: data.driver.averageRating,
    } : undefined,
    pickup: data.pickup,
    dropoff: data.dropoff,
    estimatedFare: data.estimatedFare,
    estimatedDistance: data.estimatedDistanceKm ?? data.estimatedDistance,
    estimatedDuration: data.estimatedDurationMin ?? data.estimatedDuration,
    finalFare: data.finalFare,
    requestedAt: data.requestedAt,
    acceptedAt: data.acceptedAt,
  };
}

function normalizeTripHistoryPage(
  response: ApiListResponse<any> | any[],
  page: number,
  size: number,
): TripHistoryPage {
  if (Array.isArray(response)) {
    return {
      items: response.map(normalizeTripDetail),
      page,
      size,
      total: response.length,
    };
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return {
      items: data.map(normalizeTripDetail),
      page,
      size,
      total: response.total ?? response.totalElements ?? data.length,
    };
  }

  const items = response.items ?? response.content ?? data?.items ?? data?.content ?? [];

  return {
    items: items.map(normalizeTripDetail),
    page,
    size,
    total: response.total ?? response.totalElements ?? data?.total ?? data?.totalElements ?? items.length,
  };
}
