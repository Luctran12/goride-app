import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { initializeAuthSession } from '@/lib/auth-api';
import {
  connectRealtime,
  getRealtimeConnectionState,
  subscribeRealtimeConnection,
  subscribeTripMessages,
  type RealtimeConnectionStatus,
  type RealtimeSubscription,
} from '@/lib/realtime';
import { getTrip } from '@/lib/ride-api';
import {
  getTripMessageUnreadCount,
  markTripMessagesRead,
  sendTripMessage,
  syncTripMessages,
} from '@/lib/trip-message-api';
import type {
  TripMessage,
  TripMessageDraft,
  TripMessageReadState,
  TripMessageSenderRole,
} from '@/types/chat';
import type { TripStatus } from '@/types/ride';

type DeliveryStatus = 'sending' | 'failed';
type ChatMessage = TripMessage & {
  deliveryStatus?: DeliveryStatus;
  errorMessage?: string;
};

type TripChatScreenProps = {
  role: TripMessageSenderRole;
};

const ACTIVE_CHAT_STATUSES: TripStatus[] = ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];
const INITIAL_SYNC_LIMIT = 50;
const RECONNECT_SYNC_LIMIT = 100;

export function TripChatScreen({ role }: TripChatScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tripId = parseTripId(readParam(params.tripId));
  const routeStatus = normalizeTripStatus(readParam(params.status));
  const participantName = readParam(params.participantName) ?? (role === 'DRIVER' ? 'Hành khách' : 'Tài xế');
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentUserIdRef = useRef<number | null>(null);
  const chatSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const connectionSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const lastConnectionStatusRef = useRef<RealtimeConnectionStatus>('disconnected');
  const lastMarkedReadRef = useRef(0);
  const nextLocalIdRef = useRef(-1);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus | null>(routeStatus);
  const [composer, setComposer] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>(
    getRealtimeConnectionState().status,
  );
  const [peerReadState, setPeerReadState] = useState<TripMessageReadState | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const latestMessageKey = messages.at(-1)?.clientMessageId;

  useEffect(() => {
    if (!latestMessageKey) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: messagesRef.current.length > 1 });
    });

    return () => cancelAnimationFrame(frame);
  }, [latestMessageKey]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const mergeMessages = useCallback((incoming: TripMessage[]) => {
    setMessages((current) => mergeServerMessages(current, incoming));
  }, []);

  const refreshTripStatus = useCallback(async () => {
    if (!tripId) {
      return;
    }

    try {
      const trip = await getTrip(tripId);
      setTripStatus(trip.status);
    } catch {
      // The messaging APIs remain usable for history if trip hydration is temporarily unavailable.
    }
  }, [tripId]);

  const syncMessages = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      setSyncError('Mã chuyến đi không hợp lệ.');
      return;
    }

    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const operation = (async () => {
      const latestId = getLatestServerMessageId(messagesRef.current);
      setSyncError(null);

      try {
        if (!latestId) {
          const result = await syncTripMessages(tripId, { limit: INITIAL_SYNC_LIMIT });
          mergeMessages(result.items);
          setHasOlder(result.hasMore);
          return;
        }

        let cursor = latestId;
        let hasMore = true;

        while (hasMore) {
          const result = await syncTripMessages(tripId, {
            afterId: cursor,
            limit: RECONNECT_SYNC_LIMIT,
          });
          mergeMessages(result.items);
          hasMore = result.hasMore;
          const nextCursor = result.nextCursor ?? result.items.at(-1)?.id;

          if (!nextCursor || nextCursor <= cursor) {
            break;
          }
          cursor = nextCursor;
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === 'FORBIDDEN') {
          setAccessDenied(true);
        }
        setSyncError(getErrorMessage(error, 'Không thể đồng bộ hội thoại.'));
      } finally {
        setLoading(false);
      }
    })();

    syncPromiseRef.current = operation.finally(() => {
      syncPromiseRef.current = null;
    });
    return syncPromiseRef.current;
  }, [mergeMessages, tripId]);

  const ensureMessageSubscription = useCallback(() => {
    if (!tripId || chatSubscriptionRef.current) {
      return;
    }

    chatSubscriptionRef.current = subscribeTripMessages(tripId, {
      onMessage: (message) => {
        mergeMessages([message]);
      },
      onReadState: (state) => {
        if (state.userId !== currentUserIdRef.current) {
          setPeerReadState((current) =>
            !current || state.lastReadMessageId >= current.lastReadMessageId ? state : current,
          );
        }
      },
      onError: (error) => {
        setSyncError(error.message);
      },
    });
  }, [mergeMessages, tripId]);

  useEffect(() => {
    let active = true;

    void initializeAuthSession().then((session) => {
      if (!active) {
        return;
      }

      const userId = session?.userId ?? null;
      setCurrentUserId(userId);

      if (tripId) {
        void getTripMessageUnreadCount(tripId, userId ?? undefined)
          .then((result) => {
            if (active) {
              setInitialUnreadCount(result.unreadCount);
            }
          })
          .catch(() => undefined);
      }
    });

    void refreshTripStatus();

    connectionSubscriptionRef.current = subscribeRealtimeConnection((state) => {
      if (!active) {
        return;
      }

      setConnectionStatus(state.status);
      const becameConnected = state.status === 'connected' && lastConnectionStatusRef.current !== 'connected';
      lastConnectionStatusRef.current = state.status;

      if (becameConnected) {
        ensureMessageSubscription();
        void syncMessages();
      }
    });

    void connectRealtime()
      .then(() => {
        if (active) {
          ensureMessageSubscription();
          void syncMessages();
        }
      })
      .catch(() => {
        if (active) {
          void syncMessages();
        }
      });

    return () => {
      active = false;
      chatSubscriptionRef.current?.unsubscribe();
      connectionSubscriptionRef.current?.unsubscribe();
      chatSubscriptionRef.current = null;
      connectionSubscriptionRef.current = null;
      clearCooldownTimer(cooldownTimerRef);
    };
  }, [ensureMessageSubscription, refreshTripStatus, syncMessages, tripId]);

  useEffect(() => {
    const latestMessageId = getLatestServerMessageId(messages);

    if (!tripId || !currentUserId || latestMessageId <= lastMarkedReadRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      void markTripMessagesRead(tripId, latestMessageId, currentUserId)
        .then(() => {
          lastMarkedReadRef.current = latestMessageId;
          setInitialUnreadCount(0);
        })
        .catch(() => undefined);
    }, 450);

    return () => clearTimeout(timer);
  }, [currentUserId, messages, tripId]);

  const canSend = Boolean(!accessDenied && tripStatus && ACTIVE_CHAT_STATUSES.includes(tripStatus));
  const normalizedComposer = composer.trim();
  const isRateLimited = cooldownSeconds > 0;

  const submitDraft = useCallback(
    async (draft: TripMessageDraft, localId: number) => {
      if (!tripId) {
        return;
      }

      try {
        const saved = await sendTripMessage(tripId, draft);
        mergeMessages([saved]);
      } catch (error) {
        const code = error instanceof ApiError ? error.code : undefined;
        setMessages((current) =>
          current.map((message) =>
            message.id === localId
              ? {
                  ...message,
                  deliveryStatus: 'failed',
                  errorMessage: getErrorMessage(error, 'Gửi thất bại. Chạm để thử lại.'),
                }
              : message,
          ),
        );

        if (code === 'FORBIDDEN') {
          setAccessDenied(true);
        }
        if (code === 'TRIP_MESSAGE_NOT_AVAILABLE') {
          void refreshTripStatus();
        }
        if (error instanceof ApiError && error.status === 429) {
          startCooldown(error.retryAfterSeconds ?? 60, setCooldownSeconds, cooldownTimerRef);
        }
      }
    },
    [mergeMessages, refreshTripStatus, tripId],
  );

  const handleSend = useCallback(() => {
    if (!tripId || !currentUserId || !canSend || isRateLimited || !normalizedComposer) {
      return;
    }

    const clientMessageId = createClientMessageId();
    const localId = nextLocalIdRef.current--;
    const draft: TripMessageDraft = {
      clientMessageId,
      body: normalizedComposer,
      senderId: currentUserId,
      senderRole: role,
    };
    const pending: ChatMessage = {
      id: localId,
      tripId,
      senderId: currentUserId,
      senderRole: role,
      clientMessageId,
      body: normalizedComposer,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    setMessages((current) =>
      [...current, pending].sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime()),
    );
    setComposer('');
    void submitDraft(draft, localId);
  }, [canSend, currentUserId, isRateLimited, normalizedComposer, role, submitDraft, tripId]);

  const handleRetry = useCallback(
    (message: ChatMessage) => {
      if (!canSend || isRateLimited || message.deliveryStatus !== 'failed') {
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, deliveryStatus: 'sending', errorMessage: undefined }
            : item,
        ),
      );
      void submitDraft(
        {
          clientMessageId: message.clientMessageId,
          body: message.body,
          senderId: message.senderId,
          senderRole: message.senderRole,
        },
        message.id,
      );
    },
    [canSend, isRateLimited, submitDraft],
  );

  const handleLoadOlder = useCallback(async () => {
    if (!tripId || loadingOlder) {
      return;
    }

    const oldestId = getOldestServerMessageId(messagesRef.current);
    if (!oldestId) {
      return;
    }

    setLoadingOlder(true);
    try {
      const result = await syncTripMessages(tripId, {
        beforeId: oldestId,
        limit: INITIAL_SYNC_LIMIT,
      });
      mergeMessages(result.items);
      setHasOlder(result.hasMore);
    } catch (error) {
      setSyncError(getErrorMessage(error, 'Không thể tải tin nhắn cũ hơn.'));
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, mergeMessages, tripId]);

  const latestOwnReadMessageId = useMemo(() => {
    if (!peerReadState) {
      return null;
    }

    return [...messages]
      .reverse()
      .find(
        (message) =>
          message.id > 0 &&
          message.senderId === currentUserId &&
          message.id <= peerReadState.lastReadMessageId,
      )?.id ?? null;
  }, [currentUserId, messages, peerReadState]);

  if (!tripId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidState}>
          <MaterialCommunityIcons name="message-alert-outline" size={48} color="#cf3d4f" />
          <Text style={styles.invalidTitle}>Không thể mở hội thoại</Text>
          <Text style={styles.invalidCopy}>Mã chuyến đi bị thiếu hoặc không hợp lệ.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.invalidState}>
          <MaterialCommunityIcons name="shield-lock-outline" size={48} color="#cf3d4f" />
          <Text style={styles.invalidTitle}>Không có quyền truy cập</Text>
          <Text style={styles.invalidCopy}>Bạn không phải hành khách hoặc tài xế được gán cho chuyến này.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Rời hội thoại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#17211c" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>{participantName}</Text>
            <View style={styles.connectionRow}>
              <View style={[styles.connectionDot, connectionStatus === 'connected' && styles.connectionDotOnline]} />
              <Text style={styles.headerSubtitle}>
                {getConnectionCopy(connectionStatus)} · Chuyến #{tripId}
              </Text>
            </View>
          </View>
          <View style={styles.headerButton}>
            <MaterialCommunityIcons name="shield-check-outline" size={23} color="#008e62" />
          </View>
        </View>

        {initialUnreadCount > 0 ? (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadBannerText}>{initialUnreadCount} tin nhắn mới</Text>
          </View>
        ) : null}

        {syncError ? (
          <Pressable style={styles.errorBanner} onPress={() => void syncMessages()}>
            <MaterialCommunityIcons name="cloud-alert" size={20} color="#a62336" />
            <Text style={styles.errorBannerText} numberOfLines={2}>{syncError} Chạm để thử lại.</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#008e62" />
            <Text style={styles.loadingCopy}>Đang đồng bộ hội thoại...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(message) => `${message.id}:${message.clientMessageId}`}
            contentContainerStyle={[styles.messageList, messages.length === 0 && styles.emptyMessageList]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              hasOlder ? (
                <Pressable style={styles.loadOlderButton} disabled={loadingOlder} onPress={() => void handleLoadOlder()}>
                  {loadingOlder ? <ActivityIndicator size="small" color="#008e62" /> : null}
                  <Text style={styles.loadOlderText}>{loadingOlder ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={34} color="#008e62" />
                </View>
                <Text style={styles.emptyTitle}>Bắt đầu trò chuyện</Text>
                <Text style={styles.emptyCopy}>Nhắn thông tin điểm đón hoặc cập nhật tình trạng di chuyển.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOwn = item.senderId === currentUserId || (!currentUserId && item.senderRole === role);
              const showReadReceipt = isOwn && item.id === latestOwnReadMessageId;

              return (
                <Pressable
                  disabled={item.deliveryStatus !== 'failed'}
                  onPress={() => handleRetry(item)}
                  style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowPeer]}
                >
                  {!isOwn ? <Text style={styles.senderLabel}>{participantName}</Text> : null}
                  <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.peerBubble]}>
                    <Text style={[styles.messageBody, isOwn && styles.ownMessageBody]}>{item.body}</Text>
                    <View style={styles.messageMetaRow}>
                      <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>{formatMessageTime(item.sentAt)}</Text>
                      {item.deliveryStatus === 'sending' ? (
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#d9f6ec" />
                      ) : null}
                      {item.deliveryStatus === 'failed' ? (
                        <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#ffd0d6" />
                      ) : null}
                    </View>
                  </View>
                  {item.deliveryStatus === 'failed' ? (
                    <Text style={styles.failedText}>{item.errorMessage ?? 'Gửi thất bại.'} Chạm để thử lại.</Text>
                  ) : showReadReceipt ? (
                    <Text style={styles.readReceipt}>Đã xem</Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}

        {!canSend ? (
          <View style={styles.lockedBanner}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#705b18" />
            <Text style={styles.lockedText}>{getLockedCopy(tripStatus)}</Text>
          </View>
        ) : null}

        {isRateLimited ? (
          <View style={styles.rateLimitBanner}>
            <Text style={styles.rateLimitText}>Bạn đang gửi quá nhanh. Thử lại sau {cooldownSeconds}s.</Text>
          </View>
        ) : null}

        <View style={styles.composerRow}>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            editable={canSend && !isRateLimited}
            multiline
            maxLength={1000}
            placeholder={canSend ? 'Nhập tin nhắn...' : 'Chat đang tạm khóa'}
            placeholderTextColor="#8b948f"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!normalizedComposer || !canSend || !currentUserId || isRateLimited}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              (!normalizedComposer || !canSend || !currentUserId || isRateLimited) && styles.sendButtonDisabled,
              pressed && normalizedComposer && canSend ? styles.sendButtonPressed : null,
            ]}
          >
            <MaterialCommunityIcons name="send" size={23} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mergeServerMessages(current: ChatMessage[], incoming: TripMessage[]) {
  const merged = [...current];

  incoming.forEach((message) => {
    const existingIndex = merged.findIndex(
      (item) => item.id === message.id || item.clientMessageId === message.clientMessageId,
    );
    const normalized: ChatMessage = {
      ...message,
      deliveryStatus: undefined,
      errorMessage: undefined,
    };

    if (existingIndex >= 0) {
      merged[existingIndex] = normalized;
    } else {
      merged.push(normalized);
    }
  });

  return merged.sort((left, right) => {
    const sentAtOrder = new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime();
    return sentAtOrder || left.id - right.id;
  });
}

function getLatestServerMessageId(messages: ChatMessage[]) {
  return messages.reduce((latest, message) => (message.id > latest ? message.id : latest), 0);
}

function getOldestServerMessageId(messages: ChatMessage[]) {
  return messages.reduce<number | null>(
    (oldest, message) => (message.id > 0 && (oldest === null || message.id < oldest) ? message.id : oldest),
    null,
  );
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function startCooldown(
  seconds: number,
  setSeconds: React.Dispatch<React.SetStateAction<number>>,
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
  }

  setSeconds(seconds);
  timerRef.current = setInterval(() => {
    setSeconds((current) => {
      if (current <= 1) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return 0;
      }
      return current - 1;
    });
  }, 1000);
}

function clearCooldownTimer(
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function getConnectionCopy(status: RealtimeConnectionStatus) {
  if (status === 'connected') return 'Đang kết nối trực tiếp';
  if (status === 'connecting') return 'Đang kết nối';
  if (status === 'reconnecting') return 'Đang nối lại';
  if (status === 'error') return 'Đồng bộ qua REST';
  return 'Ngoại tuyến';
}

function getLockedCopy(status: TripStatus | null) {
  if (!status) return 'Đang kiểm tra trạng thái chuyến đi.';
  if (status === 'SEARCHING') return 'Bạn có thể nhắn sau khi tài xế nhận chuyến.';
  if (status === 'COMPLETED') return 'Chuyến đi đã hoàn thành. Bạn vẫn có thể xem lịch sử chat.';
  if (status === 'CANCELLED' || status === 'NO_DRIVER') return 'Chuyến đi không còn hoạt động.';
  return 'Chat hiện không khả dụng cho chuyến này.';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTripId(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTripStatus(value?: string): TripStatus | null {
  const statuses: TripStatus[] = [
    'SEARCHING',
    'ACCEPTED',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_DRIVER',
  ];
  return statuses.includes(value as TripStatus) ? (value as TripStatus) : null;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f7f5' },
  keyboardView: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e9e5',
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  headerCopy: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { color: '#17211c', fontSize: 18, fontWeight: '800' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9aa39f' },
  connectionDotOnline: { backgroundColor: '#00a671' },
  headerSubtitle: { flex: 1, color: '#69736e', fontSize: 12, fontWeight: '600' },
  unreadBanner: { alignItems: 'center', paddingVertical: 6, backgroundColor: '#e4f7f0' },
  unreadBannerText: { color: '#007b56', fontSize: 12, fontWeight: '800' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff0f2',
  },
  errorBannerText: { flex: 1, color: '#8f2132', fontSize: 12, lineHeight: 17 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingCopy: { color: '#69736e', fontSize: 14, fontWeight: '600' },
  messageList: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18, gap: 9 },
  emptyMessageList: { flexGrow: 1, justifyContent: 'center' },
  loadOlderButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  loadOlderText: { color: '#007b56', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingHorizontal: 36, gap: 8 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#def5ec' },
  emptyTitle: { color: '#17211c', fontSize: 19, fontWeight: '800', marginTop: 6 },
  emptyCopy: { color: '#6c7671', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  messageRow: { maxWidth: '82%', marginVertical: 1 },
  messageRowOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageRowPeer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderLabel: { color: '#69736e', fontSize: 11, fontWeight: '700', marginLeft: 9, marginBottom: 3 },
  bubble: { minWidth: 86, borderRadius: 18, paddingHorizontal: 13, paddingTop: 9, paddingBottom: 7 },
  ownBubble: { backgroundColor: '#008e62', borderBottomRightRadius: 5 },
  peerBubble: { backgroundColor: '#ffffff', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#e0e7e3' },
  messageBody: { color: '#17211c', fontSize: 15, lineHeight: 21 },
  ownMessageBody: { color: '#ffffff' },
  messageMetaRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  messageTime: { color: '#7c8681', fontSize: 10 },
  ownMessageTime: { color: '#c8eee1' },
  failedText: { color: '#a62336', fontSize: 11, marginTop: 4, maxWidth: 250, textAlign: 'right' },
  readReceipt: { color: '#66716b', fontSize: 11, fontWeight: '600', marginTop: 3, marginRight: 4 },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 9, backgroundColor: '#fff7d8' },
  lockedText: { flexShrink: 1, color: '#705b18', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  rateLimitBanner: { alignItems: 'center', padding: 8, backgroundColor: '#fff0f2' },
  rateLimitText: { color: '#98263a', fontSize: 12, fontWeight: '700' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e9e5',
  },
  input: {
    flex: 1,
    maxHeight: 112,
    minHeight: 46,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 13 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 9,
    borderRadius: 23,
    backgroundColor: '#f0f4f2',
    color: '#17211c',
    fontSize: 15,
  },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#008e62' },
  sendButtonDisabled: { backgroundColor: '#b9c4bf' },
  sendButtonPressed: { transform: [{ scale: 0.95 }] },
  invalidState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  invalidTitle: { color: '#17211c', fontSize: 20, fontWeight: '800' },
  invalidCopy: { color: '#69736e', fontSize: 14, textAlign: 'center' },
  primaryButton: { marginTop: 10, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22, backgroundColor: '#008e62' },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
