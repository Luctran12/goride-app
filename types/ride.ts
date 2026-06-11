export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationPoint = Coordinates & {
  address: string;
  label?: string;
  placeId?: string;
};

export type VehicleType = 'MOTORBIKE' | 'CAR_4_SEAT' | 'CAR_7_SEAT';

export type PaymentMethod = 'CASH' | 'MOMO' | 'VNPAY';

export type PaymentMethodStatus = 'ACTIVE' | 'COMING_SOON' | 'DISABLED';

export type PassengerPaymentMethod = {
  id: string;
  method: PaymentMethod;
  title: string;
  detail: string;
  status: PaymentMethodStatus;
  isDefault: boolean;
  linked: boolean;
  badge?: string;
};

export type PaymentMethodDraft = {
  method: PaymentMethod;
  title?: string;
};

export type VoucherStatus = 'AVAILABLE' | 'USED' | 'EXPIRED' | 'COMING_SOON';

export type VoucherDiscountType = 'PERCENT' | 'FIXED';

export type PassengerVoucher = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  status: VoucherStatus;
  expiresAt?: string;
  maxDiscount?: number;
  minFare?: number;
  eligiblePaymentMethods?: PaymentMethod[];
};

export type VoucherListParams = {
  includeUnavailable?: boolean;
  paymentMethod?: PaymentMethod;
};

export type VoucherValidationRequest = {
  code: string;
  fare: number;
  paymentMethod?: PaymentMethod;
};

export type VoucherValidationResult = {
  isValid: boolean;
  discountAmount: number;
  finalFare: number;
  message?: string;
  voucher?: PassengerVoucher;
};

export type TripStatus =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER';

export type DriverAction = 'ACCEPT' | 'REJECT';

export type BookingEstimate = {
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedFare: number;
  pricingConfigId: number;
};

export type BookingDraft = {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  discountAmount?: number;
  finalFare?: number;
};

export type BookingCreateResponse = {
  tripId: number;
  status: TripStatus;
  estimatedFare: number;
  estimatedDistance: number;
};

export type CancelTripResponse = {
  tripId: number;
  status: TripStatus;
};

export type PricingConfig = {
  vehicleType: VehicleType;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  surgeMultiplier: number;
};

export type UserSummary = {
  id: number;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
};

export type DriverSummary = UserSummary & {
  vehiclePlate?: string;
  vehicleType?: VehicleType;
  averageRating?: number;
};

export type TripRating = {
  score: number;
  comment?: string;
  tags?: string[];
  createdAt?: string;
};

export type TripRatingDraft = {
  tripId: number;
  score: number;
  comment?: string;
};

export type TripRatingResponse = {
  ratingId: number;
  tripId: number;
  score: number;
};

export type TripDetail = {
  tripId: number;
  status: TripStatus;
  passenger?: UserSummary;
  driver?: DriverSummary;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  estimatedFare: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  finalFare?: number | null;
  requestedAt?: string;
  acceptedAt?: string | null;
  passengerRating?: TripRating;
};

export type TripHistoryPage = {
  items: TripDetail[];
  page: number;
  size: number;
  total: number;
};

export type DriverTripRequest = {
  tripId: number;
  passenger: UserSummary;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  estimatedFare: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
};

export type DriverLocationUpdate = {
  tripId?: number;
  driverId?: number;
  lat: number;
  lng: number;
  bearing?: number;
  speed?: number;
  updatedAt?: string;
};

export type WsNotificationType =
  | 'TRIP_MATCHED'
  | 'TRIP_ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'TRIP_CANCELLED'
  | 'NO_DRIVER_FOUND'
  | 'NEW_TRIP_REQUEST';

export type WsNotification<TData = Record<string, unknown>> = {
  type: WsNotificationType;
  title: string;
  body: string;
  data?: TData;
};

export type LocationPermissionState = 'permission-needed' | 'gps-disabled' | 'locating' | 'ready' | 'error';

