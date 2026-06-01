import type {
  BookingCreateResponse,
  BookingDraft,
  BookingEstimate,
  CancelTripResponse,
  Coordinates,
  DriverAction,
  DriverLocationUpdate,
  DriverSummary,
  PricingConfig,
  TripDetail,
  TripHistoryPage,
  TripRatingDraft,
  TripRatingResponse,
  TripStatus,
} from '@/types/ride';

const MOCK_PRICING: PricingConfig[] = [
  {
    vehicleType: 'MOTORBIKE',
    baseFare: 10000,
    perKmRate: 4000,
    perMinuteRate: 300,
    minimumFare: 15000,
    surgeMultiplier: 1,
  },
  {
    vehicleType: 'CAR_4_SEAT',
    baseFare: 25000,
    perKmRate: 9000,
    perMinuteRate: 800,
    minimumFare: 45000,
    surgeMultiplier: 1,
  },
  {
    vehicleType: 'CAR_7_SEAT',
    baseFare: 32000,
    perKmRate: 11000,
    perMinuteRate: 1000,
    minimumFare: 65000,
    surgeMultiplier: 1,
  },
];

const MOCK_DRIVER: DriverSummary = {
  id: 5,
  fullName: 'Trần Minh Quân',
  phone: '0908 456 789',
  vehiclePlate: '51F-268.89',
  vehicleType: 'CAR_4_SEAT',
  averageRating: 4.9,
};

let nextTripId = 100;
let nextRatingId = 55;
const trips = new Map<number, TripDetail>();

const seededTrips: TripDetail[] = [
  {
    tripId: 91,
    status: 'COMPLETED',
    pickup: {
      lat: 10.776889,
      lng: 106.700806,
      address: 'Ben Thanh Market, District 1',
      label: 'Pickup',
    },
    dropoff: {
      lat: 10.795053,
      lng: 106.721889,
      address: 'Landmark 81, Binh Thanh',
      label: 'Dropoff',
    },
    driver: MOCK_DRIVER,
    estimatedFare: 52000,
    finalFare: 50000,
    estimatedDistance: 4.8,
    estimatedDuration: 18,
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 2).toISOString(),
    passengerRating: {
      score: 5,
      comment: 'Tai xe than thien, don dung diem va xe rat sach.',
      tags: ['Dung gio', 'Than thien', 'Xe sach'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    },
  },
  {
    tripId: 90,
    status: 'CANCELLED',
    pickup: {
      lat: 10.762622,
      lng: 106.660172,
      address: 'Tao Dan Park, District 1',
      label: 'Pickup',
    },
    dropoff: {
      lat: 10.772,
      lng: 106.698,
      address: 'Bitexco Financial Tower, District 1',
      label: 'Dropoff',
    },
    estimatedFare: 45000,
    estimatedDistance: 3.6,
    estimatedDuration: 14,
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    acceptedAt: null,
  },
  {
    tripId: 89,
    status: 'COMPLETED',
    pickup: {
      lat: 10.786,
      lng: 106.681,
      address: 'War Remnants Museum, District 3',
      label: 'Pickup',
    },
    dropoff: {
      lat: 10.801,
      lng: 106.713,
      address: 'Vinhomes Central Park, Binh Thanh',
      label: 'Dropoff',
    },
    driver: {
      ...MOCK_DRIVER,
      id: 6,
      fullName: 'Nguyen Hoang Nam',
      vehiclePlate: '59A-812.34',
    },
    estimatedFare: 61000,
    finalFare: 59000,
    estimatedDistance: 5.5,
    estimatedDuration: 21,
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 72 + 1000 * 60 * 3).toISOString(),
    passengerRating: {
      score: 4,
      comment: 'Chuyen di on, lo trinh nhanh hon du kien.',
      tags: ['Lai xe an toan', 'Lo trinh tot'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 71).toISOString(),
    },
  },
];

function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const radiusKm = 6371;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundToNearestThousand(value: number) {
  return Math.round(value / 1000) * 1000;
}

function getMidpointDriverCoordinate(from: Coordinates, to: Coordinates) {
  return {
    lat: (from.lat + to.lat) / 2 + 0.00025,
    lng: (from.lng + to.lng) / 2 + 0.00025,
  };
}

export async function mockGetPricing() {
  return { items: MOCK_PRICING };
}

export async function mockEstimateBooking(draft: BookingDraft): Promise<BookingEstimate> {
  const config = MOCK_PRICING.find((item) => item.vehicleType === draft.vehicleType) ?? MOCK_PRICING[0];
  const estimatedDistance = Number(calculateDistanceKm(draft.pickup, draft.dropoff).toFixed(1));
  const estimatedDuration = Math.max(5, Math.round((estimatedDistance / 22) * 60));
  const rawFare =
    (config.baseFare + estimatedDistance * config.perKmRate + estimatedDuration * config.perMinuteRate) *
    config.surgeMultiplier;

  return {
    estimatedDistance,
    estimatedDuration,
    estimatedFare: Math.max(config.minimumFare, roundToNearestThousand(rawFare)),
    pricingConfigId: MOCK_PRICING.findIndex((item) => item.vehicleType === config.vehicleType) + 1,
  };
}

export async function mockCreateBooking(
  draft: BookingDraft,
  estimate: BookingEstimate,
): Promise<BookingCreateResponse> {
  const tripId = nextTripId++;

  trips.set(tripId, {
    tripId,
    status: 'SEARCHING',
    pickup: draft.pickup,
    dropoff: draft.dropoff,
    driver: MOCK_DRIVER,
    estimatedFare: estimate.estimatedFare,
    estimatedDistance: estimate.estimatedDistance,
    estimatedDuration: estimate.estimatedDuration,
    requestedAt: new Date().toISOString(),
  });

  return {
    tripId,
    status: 'SEARCHING',
    estimatedFare: estimate.estimatedFare,
    estimatedDistance: estimate.estimatedDistance,
  };
}

export async function mockGetTrip(tripId: number): Promise<TripDetail> {
  const trip = trips.get(tripId) ?? seededTrips.find((item) => item.tripId === tripId);

  if (!trip) {
    throw new Error(`Mock trip ${tripId} was not found`);
  }

  return trip;
}

export async function mockListBookings(page = 1, size = 20): Promise<TripHistoryPage> {
  const currentTrips = Array.from(trips.values());
  const items = [...currentTrips, ...seededTrips].sort((left, right) => {
    const leftTime = new Date(left.requestedAt ?? 0).getTime();
    const rightTime = new Date(right.requestedAt ?? 0).getTime();
    return rightTime - leftTime;
  });
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, size);
  const start = (safePage - 1) * safeSize;

  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    size: safeSize,
    total: items.length,
  };
}

export async function mockCancelTrip(tripId: number): Promise<CancelTripResponse> {
  const trip = trips.get(tripId);

  if (!trip) {
    throw new Error(`Mock trip ${tripId} was not found`);
  }

  const cancellableStatuses: TripStatus[] = ['SEARCHING', 'ACCEPTED', 'ARRIVED'];

  if (trip.status === 'CANCELLED') {
    return { tripId, status: 'CANCELLED' };
  }

  if (!cancellableStatuses.includes(trip.status)) {
    throw new Error('Chuyến đã bắt đầu nên không thể hủy lúc này');
  }

  trips.set(tripId, {
    ...trip,
    status: 'CANCELLED',
  });

  return { tripId, status: 'CANCELLED' };
}

export async function mockGetDriverLocation(tripId: number): Promise<DriverLocationUpdate> {
  const trip = await mockGetTrip(tripId);
  const driverCoordinate = getMidpointDriverCoordinate(trip.pickup, trip.dropoff);

  return {
    tripId,
    driverId: trip.driver?.id ?? MOCK_DRIVER.id,
    lat: driverCoordinate.lat,
    lng: driverCoordinate.lng,
    bearing: 120,
    speed: 8,
    updatedAt: new Date().toISOString(),
  };
}

export async function mockSetDriverOnline(isOnline: boolean) {
  return {
    isOnline,
    message: isOnline ? 'Bạn đang sẵn sàng nhận chuyến' : 'Bạn đã tạm dừng nhận chuyến',
  };
}

export async function mockRespondToTrip(tripId: number, action: DriverAction) {
  const status: TripStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'SEARCHING';
  const trip = trips.get(tripId);

  if (trip) {
    trips.set(tripId, {
      ...trip,
      driver: action === 'ACCEPT' ? trip.driver ?? MOCK_DRIVER : trip.driver,
      status,
      acceptedAt: action === 'ACCEPT' ? new Date().toISOString() : null,
    });
  }

  return { tripId, status };
}

export async function mockUpdateTripStatus(tripId: number, status: TripStatus) {
  const trip = trips.get(tripId);

  if (trip) {
    trips.set(tripId, { ...trip, status });
  }

  return { tripId, status };
}

export async function mockSubmitTripRating(draft: TripRatingDraft): Promise<TripRatingResponse> {
  const score = Math.round(draft.score);

  if (score < 1 || score > 5) {
    throw new Error('Rating score must be between 1 and 5');
  }

  const mutableTrip = trips.get(draft.tripId);
  const seededIndex = seededTrips.findIndex((item) => item.tripId === draft.tripId);
  const trip = mutableTrip ?? seededTrips[seededIndex];

  if (!trip) {
    throw new Error(`Mock trip ${draft.tripId} was not found`);
  }

  if (trip.status !== 'COMPLETED') {
    throw new Error('Only completed trips can be rated');
  }

  if (trip.passengerRating) {
    throw new Error('This trip already has a passenger rating');
  }

  const rating = {
    score,
    comment: draft.comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const updatedTrip = {
    ...trip,
    passengerRating: rating,
  };

  if (mutableTrip) {
    trips.set(draft.tripId, updatedTrip);
  } else if (seededIndex >= 0) {
    seededTrips[seededIndex] = updatedTrip;
  }

  return {
    ratingId: nextRatingId++,
    tripId: draft.tripId,
    score,
  };
}
