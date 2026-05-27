import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { getAccessToken } from '@/lib/api';
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

export type RealtimeConnection = { mode: 'mock' } | { mode: 'remote'; url: string };

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type RealtimeConnectionState = {
  isConnected: boolean;
  mode: 'mock' | 'remote';
  status: RealtimeConnectionStatus;
  lastError?: string;
  updatedAt: string;
};

type RemoteSubscriptionEntry = {
  destination: string;
  handler: Handler<IMessage>;
  subscription?: StompSubscription;
};

type RealtimeEventMap = {
  notification: WsNotification;
  driverRequest: DriverTripRequest;
  tripStatus: TripStatusMessage;
  driverLocation: DriverLocationUpdate;
};

const REMOTE_CONNECT_TIMEOUT_MS = 12000;
const REMOTE_RECONNECT_DELAY_MS = 5000;

const eventHandlers = {
  notification: new Set<Handler<WsNotification>>(),
  driverRequest: new Set<Handler<DriverTripRequest>>(),
  tripStatus: new Set<Handler<TripStatusMessage>>(),
  driverLocation: new Set<Handler<DriverLocationUpdate>>(),
};

const connectionListeners = new Set<Handler<RealtimeConnectionState>>();

let isConnected = false;
let mockRequestTimer: ReturnType<typeof setTimeout> | undefined;
const mockTripTimers = new Map<number, ReturnType<typeof setTimeout>[]>();
let remoteClient: Client | undefined;
let remoteConnectPromise: Promise<RealtimeConnection> | undefined;
let connectionStatus: RealtimeConnectionStatus = 'disconnected';
let lastConnectionError: string | undefined;
let connectionUpdatedAt = new Date().toISOString();
const remoteSubscriptions = new Set<RemoteSubscriptionEntry>();

export async function connectRealtime(): Promise<RealtimeConnection> {
  if (USE_MOCK_REALTIME) {
    setConnectionStatus('connected');
    return { mode: 'mock' };
  }

  if (!WS_URL) {
    throw new Error('WebSocket URL is not configured');
  }

  if (remoteClient?.connected) {
    setConnectionStatus('connected');
    return { mode: 'remote', url: WS_URL };
  }

  if (remoteConnectPromise) {
    return remoteConnectPromise;
  }

  setConnectionStatus(remoteClient ? 'reconnecting' : 'connecting');

  remoteConnectPromise = createRemoteConnection(WS_URL).finally(() => {
    remoteConnectPromise = undefined;
  });

  return remoteConnectPromise;
}

export function disconnectRealtime() {
  setConnectionStatus('disconnected');

  if (mockRequestTimer) {
    clearTimeout(mockRequestTimer);
    mockRequestTimer = undefined;
  }

  clearRemoteSubscriptions();
  void remoteClient?.deactivate();
  remoteClient = undefined;
  remoteConnectPromise = undefined;
  clearMockTripTimers();
  clearAllHandlers();
}

export function getRealtimeConnectionState(): RealtimeConnectionState {
  return {
    isConnected,
    mode: USE_MOCK_REALTIME ? ('mock' as const) : ('remote' as const),
    status: connectionStatus,
    lastError: lastConnectionError,
    updatedAt: connectionUpdatedAt,
  };
}

export function subscribeRealtimeConnection(handler: Handler<RealtimeConnectionState>): RealtimeSubscription {
  connectionListeners.add(handler);
  handler(getRealtimeConnectionState());

  return {
    unsubscribe: () => connectionListeners.delete(handler),
  };
}

export function subscribeTrip(tripId: number, handlers: TripSubscriptionHandlers): RealtimeSubscription {
  if (!USE_MOCK_REALTIME) {
    return subscribeRemoteTrip(tripId, handlers);
  }

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

  queueMockTripProgress(tripId);

  return combineSubscriptions(subscriptions);
}

export function subscribeNotifications(handler: Handler<WsNotification>): RealtimeSubscription {
  if (!USE_MOCK_REALTIME) {
    return subscribeRemote('/user/queue/notifications', (message) => {
      const notification = normalizeNotification(parseJsonMessage(message));

      if (notification) {
        handler(notification);
      }
    });
  }

  return subscribe('notification', handler);
}

export function subscribeDriverRequests(driverId: number, handler: Handler<DriverTripRequest>): RealtimeSubscription {
  if (!USE_MOCK_REALTIME) {
    return subscribeRemote(`/topic/driver/${driverId}/request`, (message) => {
      const request = normalizeDriverTripRequest(parseJsonMessage(message));

      if (request) {
        handler(request);
      }
    });
  }

  const subscription = subscribe('driverRequest', handler);
  queueMockDriverRequest(driverId);

  return subscription;
}

export function sendDriverLocation(payload: DriverLocationUpdate) {
  const message = {
    ...payload,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };

  if (USE_MOCK_REALTIME) {
    emit('driverLocation', message);
    return;
  }

  publishRemote('/app/driver.location', message);
}

export function sendDriverHeartbeat(driverId: number) {
  const heartbeat = {
    driverId,
    sentAt: new Date().toISOString(),
    mode: USE_MOCK_REALTIME ? ('mock' as const) : ('remote' as const),
  };

  if (!USE_MOCK_REALTIME) {
    publishRemote('/app/driver.heartbeat', heartbeat);
  }

  return heartbeat;
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
    return message;
  }

  publishRemote('/app/trip.status', message);

  return message;
}

function createRemoteConnection(url: string): Promise<RealtimeConnection> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      callback();
    };

    const client = new Client({
      reconnectDelay: REMOTE_RECONNECT_DELAY_MS,
      debug: () => undefined,
      beforeConnect: () => {
        const token = getAccessToken();
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      webSocketFactory: () => new SockJS(url),
      onConnect: () => {
        setConnectionStatus('connected');
        restoreRemoteSubscriptions();
        settle(() => resolve({ mode: 'remote', url }));
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
      },
      onStompError: (frame) => {
        const message = frame.headers.message ?? 'Realtime STOMP connection failed';
        setConnectionStatus('error', message);
        settle(() => reject(new Error(message)));
      },
      onWebSocketClose: () => {
        setConnectionStatus(client.active ? 'reconnecting' : 'disconnected');
      },
      onWebSocketError: () => {
        const message = 'Realtime WebSocket connection failed';
        setConnectionStatus(client.active ? 'reconnecting' : 'error', message);
        settle(() => reject(new Error(message)));
      },
    });

    timeout = setTimeout(() => {
      const message = 'Realtime connection timed out';
      setConnectionStatus('error', message);
      settle(() => reject(new Error(message)));
      void client.deactivate();
    }, REMOTE_CONNECT_TIMEOUT_MS);

    remoteClient = client;
    client.activate();
  });
}

function subscribeRemoteTrip(tripId: number, handlers: TripSubscriptionHandlers): RealtimeSubscription {
  const subscriptions: RealtimeSubscription[] = [];

  if (!remoteClient?.connected) {
    handlers.onError?.(new Error('Realtime connection is not ready'));
    return combineSubscriptions(subscriptions);
  }

  if (handlers.onStatus) {
    subscriptions.push(
      subscribeRemote(`/topic/trip/${tripId}/status`, (message) => {
        const status = normalizeTripStatusMessage(parseJsonMessage(message), tripId);

        if (status) {
          handlers.onStatus?.(status);
        }
      }),
    );
  }

  if (handlers.onLocation) {
    subscriptions.push(
      subscribeRemote(`/topic/trip/${tripId}/location`, (message) => {
        const location = normalizeDriverLocation(parseJsonMessage(message), tripId);

        if (location) {
          handlers.onLocation?.(location);
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

  return combineSubscriptions(subscriptions);
}

function subscribeRemote(destination: string, handler: Handler<IMessage>): RealtimeSubscription {
  const entry: RemoteSubscriptionEntry = { destination, handler };
  remoteSubscriptions.add(entry);
  attachRemoteSubscription(entry);

  return {
    unsubscribe: () => {
      entry.subscription?.unsubscribe();
      remoteSubscriptions.delete(entry);
    },
  };
}

function restoreRemoteSubscriptions() {
  remoteSubscriptions.forEach(attachRemoteSubscription);
}

function attachRemoteSubscription(entry: RemoteSubscriptionEntry) {
  const client = remoteClient;

  if (!client?.connected) {
    return;
  }

  entry.subscription?.unsubscribe();
  entry.subscription = client.subscribe(entry.destination, entry.handler);
}

function publishRemote(destination: string, body: unknown) {
  if (!remoteClient?.connected) {
    return false;
  }

  remoteClient.publish({
    destination,
    body: JSON.stringify(body),
  });

  return true;
}

function parseJsonMessage(message: IMessage): unknown {
  try {
    return JSON.parse(message.body) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeTripStatusMessage(payload: unknown, fallbackTripId?: number): TripStatusMessage | undefined {
  const record = asRecord(payload);
  const status = typeof record?.status === 'string' ? (record.status as TripStatus) : undefined;
  const tripId = toFiniteNumber(record?.tripId) ?? fallbackTripId;

  if (!status || typeof tripId !== 'number') {
    return undefined;
  }

  return {
    tripId,
    status,
    updatedAt: typeof record?.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  };
}

function normalizeDriverLocation(payload: unknown, fallbackTripId?: number): DriverLocationUpdate | undefined {
  const record = asRecord(payload);
  const lat = toFiniteNumber(record?.lat) ?? toFiniteNumber(record?.latitude);
  const lng = toFiniteNumber(record?.lng) ?? toFiniteNumber(record?.longitude);

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return undefined;
  }

  return {
    tripId: toFiniteNumber(record?.tripId) ?? fallbackTripId,
    driverId: toFiniteNumber(record?.driverId),
    lat,
    lng,
    bearing: toFiniteNumber(record?.bearing),
    speed: toFiniteNumber(record?.speed),
    updatedAt: typeof record?.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  };
}

function normalizeNotification(payload: unknown): WsNotification | undefined {
  const record = asRecord(payload);

  if (!record || typeof record.type !== 'string') {
    return undefined;
  }

  return {
    type: record.type as WsNotification['type'],
    title: typeof record.title === 'string' ? record.title : 'GoRide',
    body: typeof record.body === 'string' ? record.body : '',
    data: asRecord(record.data) ?? undefined,
  };
}

function normalizeDriverTripRequest(payload: unknown): DriverTripRequest | undefined {
  const record = asRecord(payload);
  const tripId = toFiniteNumber(record?.tripId);

  if (typeof tripId !== 'number') {
    return undefined;
  }

  return {
    ...(record as DriverTripRequest),
    tripId,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
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

function emptySubscription(): RealtimeSubscription {
  return { unsubscribe: () => undefined };
}

function setConnectionStatus(status: RealtimeConnectionStatus, error?: string) {
  connectionStatus = status;
  isConnected = status === 'connected';
  lastConnectionError = error ?? (status === 'error' ? lastConnectionError : undefined);
  connectionUpdatedAt = new Date().toISOString();

  const state = getRealtimeConnectionState();
  connectionListeners.forEach((listener) => listener(state));
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

function clearRemoteSubscriptions() {
  remoteSubscriptions.forEach((entry) => entry.subscription?.unsubscribe());
  remoteSubscriptions.clear();
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
        title: 'Da tim thay tai xe',
        body: 'Tai xe dang den diem don cua ban.',
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
        title: 'Tai xe da den',
        body: 'Tai xe dang cho ban tai diem don.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'ARRIVED');
    }, 7500),
    setTimeout(() => {
      emitMockNotification({
        type: 'TRIP_STARTED',
        title: 'Chuyen di bat dau',
        body: 'GoRide dang theo doi hanh trinh cua ban.',
        data: { tripId },
      });
      emitMockTripStatus(tripId, 'IN_PROGRESS');
      void emitMockDriverLocation(tripId);
    }, 11500),
    setTimeout(() => {
      emitMockNotification({
        type: 'TRIP_COMPLETED',
        title: 'Chuyen di hoan thanh',
        body: 'Cam on ban da su dung GoRide.',
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
        fullName: 'Nguyen Van A',
        phone: '0901234567',
      },
      pickup: {
        lat: 10.762622,
        lng: 106.660172,
        address: 'Cong vien Tao Dan, Quan 1',
        label: 'Diem don',
      },
      dropoff: {
        lat: 10.772,
        lng: 106.698,
        address: 'Bitexco Financial Tower, Quan 1',
        label: 'Diem den',
      },
      estimatedFare: 48000,
      estimatedDistance: 3.8,
      estimatedDuration: 16,
    });

    emit('notification', {
      type: 'NEW_TRIP_REQUEST',
      title: 'Co cuoc moi',
      body: `Tai xe ${driverId} co mot yeu cau dat xe moi.`,
      data: { tripId: 101 },
    });
  }, 2000);
}
