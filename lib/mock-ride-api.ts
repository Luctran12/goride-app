import type {
  BookingCreateResponse,
  BookingDraft,
  BookingEstimate,
  Coordinates,
  DriverAction,
  DriverLocationUpdate,
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

export async function mockGetDriverLocation(tripId: number): Promise<DriverLocationUpdate> {
  const trip = await mockGetTrip(tripId);

  return {
    tripId,
    driverId: 5,
    lat: trip.pickup.lat + 0.002,
    lng: trip.pickup.lng + 0.002,
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
    trips.set(tripId, { ...trip, status, acceptedAt: action === 'ACCEPT' ? new Date().toISOString() : null });
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
