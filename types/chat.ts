export type TripMessageSenderRole = 'PASSENGER' | 'DRIVER';

export type TripMessage = {
  id: number;
  tripId: number;
  senderId: number;
  senderRole: TripMessageSenderRole;
  clientMessageId: string;
  body: string;
  sentAt: string;
};

export type TripMessageDraft = {
  clientMessageId: string;
  body: string;
  senderId?: number;
  senderRole?: TripMessageSenderRole;
};

export type TripMessageSyncMode = 'INITIAL' | 'OLDER' | 'NEWER';

export type TripMessageSyncParams = {
  beforeId?: number;
  afterId?: number;
  limit?: number;
};

export type TripMessageSyncResult = {
  items: TripMessage[];
  mode: TripMessageSyncMode;
  hasMore: boolean;
  nextCursor: number | null;
};

export type TripMessageReadState = {
  tripId: number;
  userId: number;
  lastReadMessageId: number;
  readAt: string;
  unreadCount: number;
};

export type TripMessageUnreadCount = {
  tripId: number;
  lastReadMessageId: number | null;
  unreadCount: number;
};
