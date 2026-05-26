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
const trips = new Map<number, TripDetail>();

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
  const trip = trips.get(tripId);

  if (!trip) {
    throw new Error(`Mock trip ${tripId} was not found`);
  }

  return trip;
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
