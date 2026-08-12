import type {
  TripMessage,
  TripMessageDraft,
  TripMessageReadState,
  TripMessageSyncParams,
  TripMessageSyncResult,
  TripMessageUnreadCount,
} from '@/types/chat';

type MessageListener = (message: TripMessage) => void;
type ReadStateListener = (state: TripMessageReadState) => void;

const messagesByTrip = new Map<number, TripMessage[]>();
const readCursorByTripAndUser = new Map<string, number>();
const messageListenersByTrip = new Map<number, Set<MessageListener>>();
const readStateListenersByTrip = new Map<number, Set<ReadStateListener>>();
let nextMessageId = 1;

export async function mockSyncTripMessages(
  tripId: number,
  params: TripMessageSyncParams = {},
): Promise<TripMessageSyncResult> {
  const limit = clampLimit(params.limit);
  const messages = getTripMessages(tripId);

  if (params.afterId !== undefined) {
    const newer = messages.filter((message) => message.id > params.afterId!);
    const items = newer.slice(0, limit);

    return {
      items,
      mode: 'NEWER',
      hasMore: newer.length > items.length,
      nextCursor: items.at(-1)?.id ?? params.afterId,
    };
  }

  if (params.beforeId !== undefined) {
    const older = messages.filter((message) => message.id < params.beforeId!);
    const items = older.slice(Math.max(older.length - limit, 0));

    return {
      items,
      mode: 'OLDER',
      hasMore: older.length > items.length,
      nextCursor: items[0]?.id ?? null,
    };
  }

  const items = messages.slice(Math.max(messages.length - limit, 0));
  return {
    items,
    mode: 'INITIAL',
    hasMore: messages.length > items.length,
    nextCursor: items[0]?.id ?? null,
  };
}

export async function mockSendTripMessage(tripId: number, draft: TripMessageDraft): Promise<TripMessage> {
  const messages = getTripMessages(tripId);
  const duplicate = messages.find((message) => message.clientMessageId === draft.clientMessageId);

  if (duplicate) {
    return duplicate;
  }

  const message: TripMessage = {
    id: nextMessageId++,
    tripId,
    senderId: draft.senderId ?? 1,
    senderRole: draft.senderRole ?? 'PASSENGER',
    clientMessageId: draft.clientMessageId,
    body: draft.body.trim(),
    sentAt: new Date().toISOString(),
  };

  messages.push(message);
  messageListenersByTrip.get(tripId)?.forEach((listener) => listener(message));
  return message;
}

export async function mockMarkTripMessagesRead(
  tripId: number,
  lastReadMessageId: number,
  userId = 1,
): Promise<TripMessageReadState> {
  const key = readCursorKey(tripId, userId);
  const nextCursor = Math.max(readCursorByTripAndUser.get(key) ?? 0, lastReadMessageId);
  readCursorByTripAndUser.set(key, nextCursor);

  const state: TripMessageReadState = {
    tripId,
    userId,
    lastReadMessageId: nextCursor,
    readAt: new Date().toISOString(),
    unreadCount: 0,
  };

  readStateListenersByTrip.get(tripId)?.forEach((listener) => listener(state));
  return state;
}

export async function mockGetTripMessageUnreadCount(tripId: number, userId = 1): Promise<TripMessageUnreadCount> {
  const cursor = readCursorByTripAndUser.get(readCursorKey(tripId, userId)) ?? 0;
  const unreadCount = getTripMessages(tripId).filter(
    (message) => message.id > cursor && message.senderId !== userId,
  ).length;

  return {
    tripId,
    lastReadMessageId: cursor || null,
    unreadCount,
  };
}

export function subscribeMockTripMessages(tripId: number, listener: MessageListener) {
  return subscribeToTrip(messageListenersByTrip, tripId, listener);
}

export function subscribeMockTripMessageReadStates(tripId: number, listener: ReadStateListener) {
  return subscribeToTrip(readStateListenersByTrip, tripId, listener);
}

function getTripMessages(tripId: number) {
  const existing = messagesByTrip.get(tripId);

  if (existing) {
    return existing;
  }

  const messages: TripMessage[] = [];
  messagesByTrip.set(tripId, messages);
  return messages;
}

function subscribeToTrip<TListener>(
  listenersByTrip: Map<number, Set<TListener>>,
  tripId: number,
  listener: TListener,
) {
  const listeners = listenersByTrip.get(tripId) ?? new Set<TListener>();
  listeners.add(listener);
  listenersByTrip.set(tripId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByTrip.delete(tripId);
    }
  };
}

function clampLimit(limit = 50) {
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function readCursorKey(tripId: number, userId: number) {
  return `${tripId}:${userId}`;
}
