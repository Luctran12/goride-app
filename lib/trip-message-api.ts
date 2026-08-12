import { ApiError, apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
import {
  mockGetTripMessageUnreadCount,
  mockMarkTripMessagesRead,
  mockSendTripMessage,
  mockSyncTripMessages,
} from '@/lib/mock-trip-message-api';
import type {
  TripMessage,
  TripMessageDraft,
  TripMessageReadState,
  TripMessageSyncParams,
  TripMessageSyncResult,
  TripMessageUnreadCount,
} from '@/types/chat';

type ApiResponse<TData> = {
  success?: boolean;
  data?: TData;
  message?: string;
};

export function syncTripMessages(
  tripId: number,
  params: TripMessageSyncParams = {},
): Promise<TripMessageSyncResult> {
  if (USE_MOCK_API) {
    return mockSyncTripMessages(tripId, params);
  }

  const query = buildSyncQuery(params);
  return apiRequest<ApiResponse<TripMessageSyncResult>>(`/trips/${tripId}/messages/sync${query}`).then(
    (response) => unwrapData(response, 'Không thể đồng bộ tin nhắn.'),
  );
}

export function sendTripMessage(tripId: number, draft: TripMessageDraft): Promise<TripMessage> {
  if (USE_MOCK_API) {
    return mockSendTripMessage(tripId, draft);
  }

  return apiRequest<ApiResponse<TripMessage>>(`/trips/${tripId}/messages`, {
    method: 'POST',
    body: {
      clientMessageId: draft.clientMessageId,
      body: draft.body,
    },
  }).then((response) => unwrapData(response, 'Không thể gửi tin nhắn.'));
}

export function markTripMessagesRead(
  tripId: number,
  lastReadMessageId: number,
  userId?: number,
): Promise<TripMessageReadState> {
  if (USE_MOCK_API) {
    return mockMarkTripMessagesRead(tripId, lastReadMessageId, userId);
  }

  return apiRequest<ApiResponse<TripMessageReadState>>(`/trips/${tripId}/messages/read-state`, {
    method: 'PUT',
    body: { lastReadMessageId },
  }).then((response) => unwrapData(response, 'Không thể cập nhật trạng thái đã đọc.'));
}

export function getTripMessageUnreadCount(tripId: number, userId?: number): Promise<TripMessageUnreadCount> {
  if (USE_MOCK_API) {
    return mockGetTripMessageUnreadCount(tripId, userId);
  }

  return apiRequest<ApiResponse<TripMessageUnreadCount>>(`/trips/${tripId}/messages/unread-count`).then(
    (response) => unwrapData(response, 'Không thể tải số tin nhắn chưa đọc.'),
  );
}

function buildSyncQuery(params: TripMessageSyncParams) {
  const query: string[] = [];

  if (params.beforeId !== undefined) {
    query.push(`beforeId=${encodeURIComponent(String(params.beforeId))}`);
  }
  if (params.afterId !== undefined) {
    query.push(`afterId=${encodeURIComponent(String(params.afterId))}`);
  }
  if (params.limit !== undefined) {
    query.push(`limit=${encodeURIComponent(String(params.limit))}`);
  }

  return query.length ? `?${query.join('&')}` : '';
}

function unwrapData<TData>(response: ApiResponse<TData>, fallbackMessage: string) {
  if (response.success === false || response.data === undefined || response.data === null) {
    throw new ApiError(response.message ?? fallbackMessage);
  }

  return response.data;
}
