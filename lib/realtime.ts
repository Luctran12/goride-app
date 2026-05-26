import { USE_MOCK_REALTIME, WS_URL } from '@/lib/config';
import { mockGetDriverLocation, mockUpdateTripStatus } from '@/lib/mock-ride-api';
import type { DriverLocationUpdate, DriverTripRequest, TripStatus, WsNotification } from '@/types/ride';

export type TripStatusMessage = {
  tripId: number;
  status: TripStatus;
  updatedAt: string;
};

export type TripSubscriptionHandlers = {
  onStatus?: (message: TripStatusMessage) => void;
  onLocation?: (message: DriverLocationUpdate) => void;
  onNotification?: (message: WsNotification) => void;
  onError?: (error: Error) => void;
};

export type RealtimeSubscription = {
  unsubscribe: () => void;
};

type Handler<TPayload> = (payload: TPayload) => void;

type RealtimeEventMap = {
  notification: WsNotification;
  driverRequest: DriverTripRequest;
  tripStatus: TripStatusMessage;
  driverLocation: DriverLocationUpdate;
};

const eventHandlers = {
  notification: new Set<Handler<WsNotification>>(),
  driverRequest: new Set<Handler<DriverTripRequest>>(),
  tripStatus: new Set<Handler<TripStatusMessage>>(),
  driverLocation: new Set<Handler<DriverLocationUpdate>>(),
};

let isConnected = false;
let mockRequestTimer: ReturnType<typeof setTimeout> | undefined;
const mockTripTimers = new Map<number, ReturnType<typeof setTimeout>[]>();

export async function connectRealtime() {
  if (!USE_MOCK_REALTIME && WS_URL) {
    isConnected = true;
    return { mode: 'remote' as const, url: WS_URL };
  }

  isConnected = true;
  return { mode: 'mock' as const };
}

export function disconnectRealtime() {
  isConnected = false;

  if (mockRequestTimer) {
    clearTimeout(mockRequestTimer);
    mockRequestTimer = undefined;
  }

  clearMockTripTimers();
  clearAllHandlers();
}

export function getRealtimeConnectionState() {
  return {
    isConnected,
    mode: USE_MOCK_REALTIME ? ('mock' as const) : ('remote' as const),
  };
}

export function subscribeTrip(tripId: number, handlers: TripSubscriptionHandlers): RealtimeSubscription {
  const subscriptions: RealtimeSubscription[] = [];

  if (handlers.onStatus) {
    subscriptions.push(
      subscribe('tripStatus', (message) => {
        if (message.tripId === tripId) {
          handlers.onStatus?.(message);
        }
      }),
    );
  }

  if (handlers.onLocation) {
    subscriptions.push(
      subscribe('driverLocation', (message) => {
        if (message.tripId === tripId) {
          handlers.onLocation?.(message);
        }
      }),
    );
  }

  if (handlers.onNotification) {
    subscriptions.push(
      subscribeNotifications((notification) => {
        const notificationTripId = getNotificationTripId(notification);

        if (notificationTripId === null || notificationTripId === tripId) {
          handlers.onNotification?.(notification);
        }
      }),
    );
  }

  if (USE_MOCK_REALTIME) {
    queueMockTripProgress(tripId);
  } else if (!WS_URL) {
    handlers.onError?.(new Error('WebSocket URL is not configured'));
  }

  return combineSubscriptions(subscriptions);
}

export function subscribeNotifications(handler: Handler<WsNotification>): RealtimeSubscription {
  return subscribe('notification', handler);
}

export function subscribeDriverRequests(driverId: number, handler: Handler<DriverTripRequest>): RealtimeSubscription {
  const subscription = subscribe('driverRequest', handler);

  if (USE_MOCK_REALTIME) {
    queueMockDriverRequest(driverId);
  }

  return subscription;
}

export function sendDriverLocation(payload: DriverLocationUpdate) {
  if (USE_MOCK_REALTIME) {
    emit('driverLocation', {
      ...payload,
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
    });
  }
}

export function sendDriverHeartbeat(_driverId: number) {
  return {
    sentAt: new Date().toISOString(),
    mode: USE_MOCK_REALTIME ? ('mock' as const) : ('remote' as const),
  };
}

export function sendTripStatus(tripId: number, status: TripStatus) {
  const message = {
    tripId,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (USE_MOCK_REALTIME) {
    if (status === 'CANCELLED' || status === 'NO_DRIVER' || status === 'COMPLETED') {
      clearMockTripTimers(tripId);
    }

    mockUpdateTripStatus(tripId, status).catch(() => {
      // Keep emitting realtime demo events even if the optional mock REST store is unavailable.
    });
    emit('tripStatus', message);
  }

  return message;
}

function subscribe<TKey extends keyof RealtimeEventMap>(
  eventName: TKey,
  handler: Handler<RealtimeEventMap[TKey]>,
): RealtimeSubscription {
  eventHandlers[eventName].add(handler as never);

  return {
    unsubscribe: () => eventHandlers[eventName].delete(handler as never),
  };
}

function emit<TKey extends keyof RealtimeEventMap>(eventName: TKey, payload: RealtimeEventMap[TKey]) {
  eventHandlers[eventName].forEach((handler) => handler(payload as never));
}

function combineSubscriptions(subscriptions: RealtimeSubscription[]): RealtimeSubscription {
  return {
    unsubscribe: () => subscriptions.forEach((subscription) => subscription.unsubscribe()),
  };
}

function getNotificationTripId(notification: WsNotification) {
  const tripId = notification.data?.tripId;

  if (typeof tripId === 'number' && Number.isFinite(tripId)) {
    return tripId;
  }

  if (typeof tripId === 'string') {
    const parsedTripId = Number(tripId);
    return Number.isFinite(parsedTripId) ? parsedTripId : null;
  }

  return null;
}

function clearAllHandlers() {
  eventHandlers.notification.clear();
  eventHandlers.driverRequest.clear();
  eventHandlers.tripStatus.clear();
  eventHandlers.driverLocation.clear();
}

function queueMockTripProgress(tripId: number) {
  clearMockTripTimers(tripId);

  const timers = [
    setTimeout(() => {
      emitMockNotification({
        type: 'TRIP_ACCEPTED',
        title: 'Đã tìm thấy tài xế',
        body: 'Tài xế đang đến điểm đón của bạn.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'ACCEPTED');
    }, 2500),
    setTimeout(() => {
      void emitMockDriverLocation(tripId);
    }, 3500),
    setTimeout(() => {
      emitMockNotification({
        type: 'DRIVER_ARRIVED',
        title: 'Tài xế đã đến',
        body: 'Tài xế đang chờ bạn tại điểm đón.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'ARRIVED');
    }, 7500),
    setTimeout(() => {
      emitMockNotification({
        type: 'TRIP_STARTED',
        title: 'Chuyến đi bắt đầu',
        body: 'GoRide đang theo dõi hành trình của bạn.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'IN_PROGRESS');
      void emitMockDriverLocation(tripId);
    }, 11500),
    setTimeout(() => {
      emitMockNotification({
        type: 'TRIP_COMPLETED',
        title: 'Chuyến đi hoàn thành',
        body: 'Cảm ơn bạn đã sử dụng GoRide.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'COMPLETED');
    }, 17000),
  ];

  mockTripTimers.set(tripId, timers);
}

function emitMockNotification(notification: WsNotification) {
  emit('notification', notification);
}

function emitMockTripStatus(tripId: number, status: TripStatus) {
  mockUpdateTripStatus(tripId, status).catch(() => {
    // The realtime demo should continue even if a test opened this screen without a mock REST trip.
  });
  emit('tripStatus', {
    tripId,
    status,
    updatedAt: new Date().toISOString(),
  });
}

async function emitMockDriverLocation(tripId: number) {
  try {
    emit('driverLocation', await mockGetDriverLocation(tripId));
  } catch {
    emit('driverLocation', {
      tripId,
      driverId: 5,
      lat: 10.764622,
      lng: 106.662172,
      bearing: 120,
      speed: 8,
      updatedAt: new Date().toISOString(),
    });
  }
}

function clearMockTripTimers(tripId?: number) {
  if (typeof tripId === 'number') {
    mockTripTimers.get(tripId)?.forEach((timer) => clearTimeout(timer));
    mockTripTimers.delete(tripId);
    return;
  }

  mockTripTimers.forEach((timers) => timers.forEach((timer) => clearTimeout(timer)));
  mockTripTimers.clear();
}

function queueMockDriverRequest(driverId: number) {
  if (mockRequestTimer) {
    clearTimeout(mockRequestTimer);
  }

  mockRequestTimer = setTimeout(() => {
    emit('driverRequest', {
      tripId: 101,
      passenger: {
        id: 1,
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
      },
      pickup: {
        lat: 10.762622,
        lng: 106.660172,
        address: 'Công viên Tao Đàn, Quận 1',
        label: 'Điểm đón',
      },
      dropoff: {
        lat: 10.772,
        lng: 106.698,
        address: 'Bitexco Financial Tower, Quận 1',
        label: 'Điểm đến',
      },
      estimatedFare: 48000,
      estimatedDistance: 3.8,
      estimatedDuration: 16,
    });

    emit('notification', {
      type: 'NEW_TRIP_REQUEST',
      title: 'Có cuốc mới',
      body: `Tài xế ${driverId} có một yêu cầu đặt xe mới.`,
      data: { tripId: 101 },
    });
  }, 2000);
}

