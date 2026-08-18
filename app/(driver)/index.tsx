import { useLanguage } from '@/lib/i18n';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import MapView, { Circle, Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThreeWordSearchModal } from '@/components/driver/three-word-search-modal';
import { DriverBottomNav } from '@/components/driver/driver-bottom-nav';
import { CustomAlertModal, type CustomAlertOptions } from '@/components/ui/custom-alert-modal';
import { rf, rs, rvs } from '@/constants/responsive';
import {
  getCurrentLocationPoint,
  getDefaultLocationPoint,
  requestLocationPermission,
  reverseGeocode,
  fetchRoute,
  watchLocation,
  type LocationWatcher,
} from '@/lib/location-service';
import type { ThreeWordLocation } from '@/types/three-word';
import {
  connectRealtime,
  disconnectRealtime,
  sendDriverHeartbeat,
  sendDriverLocation,
  setRealtimeDriverLocation,
  sendTripStatus,
  subscribeDriverRequests,
  subscribeNotifications,
  subscribeRealtimeConnection,
  subscribeTrip,
  subscribeTripMessages,
  type RealtimeSubscription,
} from '@/lib/realtime';
import { ApiError } from '@/lib/api';
import { initializeAuthSession } from '@/lib/auth-api';
import { getDriverProfile, sendHeartbeatRest, type DriverProfileResponse } from '@/lib/driver-api';
import { getMyProfile, type UserProfile } from '@/lib/user-api';
import { confirmCashPayment, getTrip, listBookings, respondToTrip, setDriverOnline, updateTripStatus } from '@/lib/ride-api';
import { getTripMessageUnreadCount } from '@/lib/trip-message-api';
import type { TripMessage } from '@/types/chat';
import type { DriverAction, DriverTripRequest, LocationPoint, TripStatus, WsNotification } from '@/types/ride';

const DRIVER_HEARTBEAT_INTERVAL_MS = 20000;
const DRIVER_LOCATION_INTERVAL_MS = 5000;
const DRIVER_LOCATION_TIMEOUT_MS = 4500;
const DRIVER_MAP_DELTA = 0.012;

const palette = {
  background: '#F4F7F5',
  card: '#ffffff',
  cardDark: '#1E293B',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  green: '#00C853',
  greenDark: '#044D29',
  greenSoft: '#E8FADF',
  amber: '#FF9500',
  amberSoft: '#FFF4E5',
  danger: '#EF4444',
  dangerSoft: '#FFEBEA',
  blue: '#2563EB',
  blueInk: '#1E1B4B',
  blueSoft: '#EFF6FF',
  mint: '#4ADE80',
};

const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.14,
  shadowRadius: 18,
  elevation: 8,
};

const HOTSPOTS = [
  { lat: 10.7719, lng: 106.7048, radius: 500, label: 'Quận 1 - Bến Nghé' },
  { lat: 10.7951, lng: 106.7218, radius: 600, label: 'Bình Thạnh - Landmark 81' },
  { lat: 10.8185, lng: 106.6588, radius: 750, label: 'Tân Bình - Sân bay TSN' },
  { lat: 10.7292, lng: 106.7198, radius: 450, label: 'Quận 7 - Phú Mỹ Hưng' },
];

type DriverRealtimeMode = 'offline' | 'connecting' | 'mock' | 'remote' | 'fallback';

export default function DriverScreen() {
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const activeTripSteps = useMemo(() => [
    { label: t('driver.stepAccepted'), status: 'ACCEPTED' as TripStatus },
    { label: t('driver.stepArrived'), status: 'ARRIVED' as TripStatus },
    { label: t('driver.stepInProgress'), status: 'IN_PROGRESS' as TripStatus },
    { label: t('driver.stepCompleted'), status: 'COMPLETED' as TripStatus },
  ], [t]);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<Omit<CustomAlertOptions, 'visible' | 'onClose'> & { visible: boolean }>({
    visible: false,
    title: '',
  });

  const showAlert = useCallback((options: Omit<CustomAlertOptions, 'visible' | 'onClose'>) => {
    setAlertConfig({ visible: true, ...options });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const [isOnline, setIsOnline] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LocationPoint | null>(null);
  const [realtimeMode, setRealtimeMode] = useState<DriverRealtimeMode>('offline');
  const [showHotspots, setShowHotspots] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<DriverTripRequest | null>(null);
  const incomingRequestRef = useRef(incomingRequest);
  useEffect(() => {
    incomingRequestRef.current = incomingRequest;
  }, [incomingRequest]);

  const [requestResponse, setRequestResponse] = useState<{
    status: TripStatus;
    tripId: number;
  } | null>(null);
  const requestResponseRef = useRef(requestResponse);
  useEffect(() => {
    requestResponseRef.current = requestResponse;
  }, [requestResponse]);

  const [respondingAction, setRespondingAction] = useState<DriverAction | null>(null);
  const [updatingTripStatus, setUpdatingTripStatus] = useState<TripStatus | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [latestChatMessage, setLatestChatMessage] = useState<TripMessage | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalExpiryTime] = useState<number>(30);

  const requestSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const notificationSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const messageSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const connectionSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const locationWatcherRef = useRef<LocationWatcher | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationRef = useRef<LocationPoint | null>(null);
  const driverGpsPingInFlightRef = useRef(false);
  const mapRef = useRef<MapView | null>(null);
  const chatNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenChatMessageIdsRef = useRef(new Set<string>());
  const isScreenFocusedRef = useRef(isScreenFocused);

  const [search3WordModalVisible, setSearch3WordModalVisible] = useState(false);
  const [threeWordPreview, setThreeWordPreview] = useState<ThreeWordLocation | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const driverIdRef = useRef<number>(5);

  const [todayStats, setTodayStats] = useState<{
    earnings: number;
    completedTrips: number;
  }>({
    earnings: 0,
    completedTrips: 0,
  });

  const fetchProfile = useCallback(() => {
    getMyProfile()
      .then((uProfile) => setUserProfile(uProfile))
      .catch(() => {});

    getDriverProfile()
      .then((profile) => {
        setDriverProfile(profile);
        driverIdRef.current = profile.id;
        setLoadingProfile(false);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
          router.replace('/(driver)/onboarding' as any);
        } else {
          showAlert({
            type: 'danger',
            title: t('driver.loadProfileErrorTitle'),
            message: error.message || t('driver.loadProfileErrorMsg'),
          });
          setLoadingProfile(false);
        }
      });
  }, [router, showAlert, t]);

  const fetchTodayStats = useCallback(async () => {
    try {
      const data = await listBookings(1, 100);
      const trips = data.items || [];
      const now = new Date();

      const todayTrips = trips.filter((trip) => {
        const dateStr = trip.completedAt || trip.requestedAt;
        if (!dateStr) return false;
        const tripDate = new Date(dateStr);
        return (
          tripDate.getDate() === now.getDate() &&
          tripDate.getMonth() === now.getMonth() &&
          tripDate.getFullYear() === now.getFullYear()
        );
      });

      const completed = todayTrips.filter((t) => t.status === 'COMPLETED');
      const totalEarnings = completed.reduce(
        (sum, t) => sum + (t.finalFare ?? t.estimatedFare ?? 0),
        0
      );

      setTodayStats({
        earnings: totalEarnings,
        completedTrips: completed.length,
      });
    } catch (err) {
      console.warn('[Driver Home] Failed to load driver today stats:', err);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    initializeAuthSession().then((session) => {
      if (isCurrent && session) {
        // Auth session initialized
      }
    });

    fetchProfile();
    fetchTodayStats();

    // Initial GPS fix with real-time coordinate update and map animation
    requestLocationPermission().then(async (perm) => {
      if (perm.granted) {
        try {
          const pt = await getCurrentLocationPoint({ timeoutMs: 8000 });
          setDriverLocation(pt);
          driverLocationRef.current = pt;
          setRealtimeDriverLocation(pt.lat, pt.lng);
          mapRef.current?.animateToRegion(
            {
              latitude: pt.lat,
              longitude: pt.lng,
              latitudeDelta: DRIVER_MAP_DELTA,
              longitudeDelta: DRIVER_MAP_DELTA,
            },
            600
          );
        } catch {
          const def = getDefaultLocationPoint();
          setDriverLocation(def);
          driverLocationRef.current = def;
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [fetchProfile, fetchTodayStats]);

  const activeTripId = requestResponse && isDriverTrackingStatus(requestResponse.status) ? requestResponse.tripId : null;
  const isTripActive = Boolean(requestResponse && isDriverTrackingStatus(requestResponse.status));
  const progressPercent = timeLeft !== null && totalExpiryTime > 0
    ? (timeLeft / totalExpiryTime) * 100
    : 100;
  const todayTripCount = todayStats.completedTrips;
  const todayEarnings = todayStats.earnings;

  useEffect(() => {
    driverLocationRef.current = driverLocation;
  }, [driverLocation]);

  useEffect(() => {
    isScreenFocusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  useEffect(() => {
    if (!activeTripId) {
      setLatestChatMessage(null);
      setUnreadChatCount(0);
      seenChatMessageIdsRef.current.clear();
      return;
    }

    if (!isScreenFocused) {
      return;
    }

    void getTripMessageUnreadCount(activeTripId, driverProfile?.id)
      .then((result) => setUnreadChatCount(result.unreadCount))
      .catch(() => undefined);
  }, [activeTripId, driverProfile?.id, isScreenFocused]);

  useEffect(() => {
    if (!activeTripId || !isOnline || (realtimeMode !== 'mock' && realtimeMode !== 'remote')) {
      messageSubscriptionRef.current?.unsubscribe();
      messageSubscriptionRef.current = null;
      return;
    }

    const subscription = subscribeTripMessages(activeTripId, {
      onMessage: (message) => {
        if (message.senderRole === 'DRIVER' || !isScreenFocusedRef.current) {
          return;
        }

        const messageKey = message.id > 0 ? `id:${message.id}` : `client:${message.clientMessageId}`;
        if (seenChatMessageIdsRef.current.has(messageKey)) {
          return;
        }

        seenChatMessageIdsRef.current.add(messageKey);
        setLatestChatMessage(message);
        setUnreadChatCount((current) => current + 1);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (chatNoticeTimerRef.current) {
          clearTimeout(chatNoticeTimerRef.current);
        }
        chatNoticeTimerRef.current = setTimeout(() => {
          setLatestChatMessage(null);
          chatNoticeTimerRef.current = null;
        }, 7000);
      },
    });

    messageSubscriptionRef.current = subscription;
    return () => {
      subscription.unsubscribe();
      if (messageSubscriptionRef.current === subscription) {
        messageSubscriptionRef.current = null;
      }
    };
  }, [activeTripId, isOnline, realtimeMode]);

  const stopOnlineServices = useCallback(() => {
    locationWatcherRef.current?.remove();
    locationWatcherRef.current = null;

    requestSubscriptionRef.current?.unsubscribe();
    requestSubscriptionRef.current = null;
    notificationSubscriptionRef.current?.unsubscribe();
    notificationSubscriptionRef.current = null;
    messageSubscriptionRef.current?.unsubscribe();
    messageSubscriptionRef.current = null;
    connectionSubscriptionRef.current?.unsubscribe();
    connectionSubscriptionRef.current = null;

    if (chatNoticeTimerRef.current) {
      clearTimeout(chatNoticeTimerRef.current);
      chatNoticeTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (driverLocationTimerRef.current) {
      clearInterval(driverLocationTimerRef.current);
      driverLocationTimerRef.current = null;
    }

    driverGpsPingInFlightRef.current = false;
    disconnectRealtime();
  }, []);

  const goOffline = useCallback(async () => {
    setToggleLoading(true);

    try {
      const lat = driverLocationRef.current?.lat ?? 10.7769;
      const lng = driverLocationRef.current?.lng ?? 106.7009;
      await setDriverOnline(false, lat, lng);
      stopOnlineServices();
      setIsOnline(false);
      setIncomingRequest(null);
      setRequestResponse(null);
      setRespondingAction(null);
      setUpdatingTripStatus(null);
      setRealtimeMode('offline');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: unknown) {
      showAlert({
        type: 'danger',
        title: t('driver.goOfflineErrorTitle'),
        message: getErrorMessage(error, t('driver.tryAgainLater')),
      });
    } finally {
      setToggleLoading(false);
    }
  }, [showAlert, stopOnlineServices, t]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    const sendHeartbeat = () => {
      const lat = driverLocationRef.current?.lat ?? 10.7769;
      const lng = driverLocationRef.current?.lng ?? 106.7009;

      sendHeartbeatRest(lat, lng)
        .then((res) => {
          setLastHeartbeatAt(res.heartbeatAt);
          if (res.online === false) {
            void goOffline();
          }
        })
        .catch((err) => {
          console.warn('Heartbeat REST error:', err);
          setLastHeartbeatAt(null);
        });

      sendDriverHeartbeat(driverIdRef.current);
    };

    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, DRIVER_HEARTBEAT_INTERVAL_MS);
  }, [goOffline]);

  const resetCompletedTrip = useCallback(() => {
    setIncomingRequest(null);
    setRequestResponse(null);
    setRespondingAction(null);
    setUpdatingTripStatus(null);
  }, []);

  const resetCompletedTripRef = useRef(resetCompletedTrip);
  useEffect(() => {
    resetCompletedTripRef.current = resetCompletedTrip;
  }, [resetCompletedTrip]);

  const startRealtime = useCallback(async () => {
    let remoteConnectionOpened = false;

    setRealtimeMode('connecting');
    connectionSubscriptionRef.current?.unsubscribe();
    connectionSubscriptionRef.current = subscribeRealtimeConnection((state) => {
      if (state.mode === 'mock') {
        return;
      }

      if (state.status === 'connected') {
        remoteConnectionOpened = true;
        setRealtimeMode('remote');
        return;
      }

      if (state.status === 'connecting') {
        setRealtimeMode('connecting');
        return;
      }

      if (state.status === 'reconnecting' && remoteConnectionOpened) {
        setRealtimeMode('fallback');
        return;
      }

      if (state.status === 'error') {
        setRealtimeMode('fallback');
      }
    });

    try {
      const connection = await connectRealtime();
      setRealtimeMode(connection.mode);
      requestSubscriptionRef.current = subscribeDriverRequests(driverIdRef.current, (request) => {
        if (request.type === 'TRIP_CANCELLED') {
          const cancelledTripId = request.tripId;
          if (incomingRequestRef.current?.tripId === cancelledTripId && !requestResponseRef.current) {
            setIncomingRequest(null);
            showAlert({
              type: 'warning',
              title: t('driver.requestCancelledTitle'),
              message: t('driver.requestCancelledMsg'),
            });
          } else if (requestResponseRef.current?.tripId === cancelledTripId) {
            showAlert({
              type: 'warning',
              title: t('driver.tripCancelledTitle'),
              message: t('driver.tripCancelledMsg'),
            });
            resetCompletedTripRef.current();
          }
          return;
        }

        setIncomingRequest(request);
        setRequestResponse(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Fetch full trip details from REST API
        getTrip(request.tripId)
          .then((detail) => {
            setIncomingRequest((current) => {
              if (current?.tripId !== request.tripId) {
                return current;
              }
              return {
                tripId: detail.tripId,
                passenger: detail.passenger ? {
                  id: detail.passenger.id,
                  fullName: detail.passenger.fullName,
                  phone: detail.passenger.phone,
                  avatarUrl: detail.passenger.avatarUrl,
                } : current.passenger,
                pickup: detail.pickup ?? current.pickup,
                dropoff: detail.dropoff ?? current.dropoff,
                estimatedFare: detail.estimatedFare ?? current.estimatedFare,
                estimatedDistance: detail.estimatedDistance ?? current.estimatedDistance,
                estimatedDuration: detail.estimatedDuration ?? current.estimatedDuration,
              };
            });
          })
          .catch(async (err) => {
            console.warn('[Driver] Failed to fetch full trip details:', err);
            if (request.pickup.lat && request.pickup.lng) {
              try {
                const pickupAddress = await reverseGeocode({ lat: request.pickup.lat, lng: request.pickup.lng });
                const dropoffAddress = await reverseGeocode({ lat: request.dropoff.lat, lng: request.dropoff.lng });
                
                setIncomingRequest((current) => {
                  if (current?.tripId !== request.tripId) {
                    return current;
                  }
                  return {
                    ...current,
                    pickup: { ...current.pickup, address: pickupAddress },
                    dropoff: { ...current.dropoff, address: dropoffAddress },
                  };
                });
              } catch (geoErr) {
                console.warn('[Driver] Geocoding failed:', geoErr);
              }
            }
          });
      });

      notificationSubscriptionRef.current = subscribeNotifications((notification) => {
        setLatestNotification(notification);
        if (notification.type === 'TRIP_CANCELLED') {
          const notificationTripId = notification.data?.tripId ? Number(notification.data.tripId) : null;
          if (notificationTripId) {
            if (incomingRequestRef.current?.tripId === notificationTripId && !requestResponseRef.current) {
              setIncomingRequest(null);
              showAlert({
                type: 'warning',
                title: t('driver.requestCancelledTitle'),
                message: t('driver.requestCancelledMsg'),
              });
            } else if (requestResponseRef.current?.tripId === notificationTripId) {
              showAlert({
                type: 'warning',
                title: t('driver.tripCancelledTitle'),
                message: t('driver.tripCancelledMsg'),
              });
              resetCompletedTripRef.current();
            }
          }
        }
      });
      startHeartbeat();
    } catch (error: unknown) {
      setRealtimeMode('fallback');
    }
  }, [showAlert, startHeartbeat, t]);

  const goOnline = useCallback(async () => {
    setToggleLoading(true);

    try {
      const permission = await requestLocationPermission();
      let nextLocation = driverLocationRef.current ?? getDefaultLocationPoint();

      if (permission.granted) {
        try {
          nextLocation = await getCurrentLocationPoint({ timeoutMs: 8000 });
        } catch {
          // Keep driverLocationRef.current
        }
      } else if (permission.status === 'gps-disabled') {
        setToggleLoading(false);
        showAlert({
          type: 'warning',
          title: t('driver.gpsDisabledTitle'),
          message: t('driver.gpsDisabledMsg'),
          confirmText: t('driver.openSettings'),
          cancelText: t('driver.maybeLater'),
          onConfirm: () => void Linking.openSettings(),
        });
        return;
      } else {
        setToggleLoading(false);
        showAlert({
          type: 'warning',
          title: t('driver.locationPermissionTitle'),
          message: t('driver.locationPermissionDeniedMsg'),
          confirmText: t('driver.openSettings'),
          cancelText: t('driver.maybeLater'),
          onConfirm: () => void Linking.openSettings(),
        });
        return;
      }

      await setDriverOnline(true, nextLocation.lat, nextLocation.lng);
      setDriverLocation(nextLocation);
      driverLocationRef.current = nextLocation;
      setRealtimeDriverLocation(nextLocation.lat, nextLocation.lng);

      mapRef.current?.animateToRegion(
        {
          latitude: nextLocation.lat,
          longitude: nextLocation.lng,
          latitudeDelta: DRIVER_MAP_DELTA,
          longitudeDelta: DRIVER_MAP_DELTA,
        },
        600
      );

      setIsOnline(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await startRealtime();
    } catch (error: unknown) {
      showAlert({
        type: 'danger',
        title: t('driver.goOnlineErrorTitle'),
        message: getErrorMessage(error, t('driver.tryAgainLater')),
      });
      stopOnlineServices();
      setIsOnline(false);
      setRealtimeMode('offline');
    } finally {
      setToggleLoading(false);
    }
  }, [showAlert, startRealtime, stopOnlineServices, t]);

  const handleToggleOnline = (value: boolean) => {
    if (toggleLoading) {
      return;
    }

    if (value) {
      if (!driverProfile || driverProfile.approvalStatus !== 'APPROVED') {
        showAlert({
          type: 'warning',
          title: t('driver.cannotOperateTitle'),
          message: t('driver.cannotOperateMsg'),
          confirmText: t('common.understood', 'Đã hiểu'),
        });
        return;
      }
      void goOnline();
    } else {
      void goOffline();
    }
  };

  const handleRespondToRequest = useCallback(
    async (action: DriverAction) => {
      if (!incomingRequest || respondingAction) {
        return;
      }

      setRespondingAction(action);

      try {
        const response = await respondToTrip(incomingRequest.tripId, action);
        setRequestResponse({
          status: response.status,
          tripId: response.tripId,
        });

        if (action === 'ACCEPT') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void getTrip(incomingRequest.tripId)
            .then((detail) => {
              setIncomingRequest((current) => {
                if (current?.tripId !== incomingRequest.tripId) {
                  return current;
                }
                return {
                  tripId: detail.tripId,
                  passenger: detail.passenger ? {
                    id: detail.passenger.id,
                    fullName: detail.passenger.fullName,
                    phone: detail.passenger.phone,
                    avatarUrl: detail.passenger.avatarUrl,
                  } : current.passenger,
                  pickup: detail.pickup ?? current.pickup,
                  dropoff: detail.dropoff ?? current.dropoff,
                  estimatedFare: detail.estimatedFare ?? current.estimatedFare,
                  estimatedDistance: detail.estimatedDistance ?? current.estimatedDistance,
                  estimatedDuration: detail.estimatedDuration ?? current.estimatedDuration,
                };
              });
            })
            .catch(() => {});
          return;
        }

        setIncomingRequest(null);
      } catch (error: unknown) {
        showAlert({
          type: 'danger',
          title: action === 'ACCEPT' ? t('driver.acceptErrorTitle') : t('driver.rejectErrorTitle'),
          message: getErrorMessage(error, t('driver.tryAgainLater')),
        });
      } finally {
        setRespondingAction(null);
      }
    },
    [incomingRequest, respondingAction, showAlert, t],
  );

  const handleUpdateActiveTripStatus = useCallback(
    async (nextStatus: TripStatus) => {
      if (!requestResponse || updatingTripStatus) {
        return;
      }

      setUpdatingTripStatus(nextStatus);

      try {
        const response = await updateTripStatus(requestResponse.tripId, nextStatus);
        setRequestResponse({
          tripId: response.tripId,
          status: response.status,
        });
        sendTripStatus(response.tripId, response.status);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (response.status === 'COMPLETED') {
          void fetchTodayStats();
        }
      } catch (error: unknown) {
        showAlert({
          type: 'danger',
          title: t('driver.updateTripErrorTitle'),
          message: getErrorMessage(error, t('driver.tryAgainLater')),
        });
      } finally {
        setUpdatingTripStatus(null);
      }
    },
    [fetchTodayStats, requestResponse, showAlert, t, updatingTripStatus],
  );

  const handleCallPassenger = useCallback(() => {
    if (!incomingRequest?.passenger?.phone) {
      showAlert({
        type: 'warning',
        title: t('driver.noPhoneTitle'),
        message: t('driver.noPhoneMsg'),
      });
      return;
    }

    const telUrl = `tel:${incomingRequest.passenger.phone}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          void Linking.openURL(telUrl);
        } else {
          showAlert({
            type: 'warning',
            title: t('driver.cannotCallTitle'),
            message: t('driver.cannotCallMsg'),
          });
        }
      })
      .catch(() => {});
  }, [incomingRequest, showAlert, t]);

  const handleOpenNavigation = useCallback(() => {
    if (!incomingRequest || !requestResponse) return;
    
    const isHeadingToPickup = requestResponse.status === 'ACCEPTED' || requestResponse.status === 'ARRIVED';
    const destination = isHeadingToPickup ? incomingRequest.pickup : incomingRequest.dropoff;
    
    if (destination.lat && destination.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            void Linking.openURL(url);
          } else {
            showAlert({
              type: 'warning',
              title: t('driver.cannotOpenMapTitle'),
              message: t('driver.cannotOpenMapMsg'),
            });
          }
        })
        .catch(() => {});
    }
  }, [incomingRequest, requestResponse, showAlert, t]);

  const handleConfirmPaymentAndReady = useCallback(async () => {
    if (!requestResponse) {
      return;
    }

    setConfirmingPayment(true);
    try {
      await confirmCashPayment(requestResponse.tripId);
      resetCompletedTrip();
      void fetchTodayStats();
      showAlert({
        type: 'success',
        title: t('driver.tripCompletedTitle', 'Hoàn thành chuyến'),
        message: t('driver.tripCompletedMsg', 'Chuyến đã hoàn thành. Cảm ơn bạn đã chạy cùng GoRide.'),
        confirmText: t('common.understood', 'Đã hiểu'),
      });
    } catch (error: unknown) {
      showAlert({
        type: 'danger',
        title: t('driver.paymentConfirmErrorTitle'),
        message: getErrorMessage(error, t('driver.paymentConfirmErrorMsg')),
      });
    } finally {
      setConfirmingPayment(false);
    }
  }, [fetchTodayStats, requestResponse, resetCompletedTrip, showAlert, t]);

  const sendDriverGpsPing = useCallback(async (tripId: number) => {
    if (driverGpsPingInFlightRef.current) {
      return;
    }

    driverGpsPingInFlightRef.current = true;
    let nextLocation = driverLocationRef.current ?? getDefaultLocationPoint();

    try {
      nextLocation = await getCurrentLocationPoint({ timeoutMs: DRIVER_LOCATION_TIMEOUT_MS });
    } catch {
      // Fallback
    } finally {
      driverGpsPingInFlightRef.current = false;
    }

    const sentAt = new Date().toISOString();
    driverLocationRef.current = nextLocation;
    setDriverLocation(nextLocation);
    setRealtimeDriverLocation(nextLocation.lat, nextLocation.lng);
    sendDriverLocation({
      tripId,
      driverId: driverIdRef.current,
      lat: nextLocation.lat,
      lng: nextLocation.lng,
      updatedAt: sentAt,
    });
  }, []);

  // Active real-time GPS tracking whenever driver is online
  useEffect(() => {
    if (!isOnline) {
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
      return;
    }

    let isMounted = true;
    void watchLocation((point, heading, speed) => {
      if (!isMounted) return;
      setDriverLocation(point);
      driverLocationRef.current = point;
      setRealtimeDriverLocation(point.lat, point.lng);

      if (activeTripId) {
        sendDriverLocation({
          tripId: activeTripId,
          driverId: driverIdRef.current,
          lat: point.lat,
          lng: point.lng,
          bearing: heading,
          speed: speed,
        });
      }
    }).then((watcher) => {
      if (isMounted) {
        locationWatcherRef.current = watcher;
      } else {
        watcher?.remove();
      }
    });

    return () => {
      isMounted = false;
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
    };
  }, [isOnline, activeTripId]);

  useEffect(() => {
    return () => stopOnlineServices();
  }, [stopOnlineServices]);

  // Route fetching when during active trip
  useEffect(() => {
    if (!incomingRequest || !driverLocation) {
      setRouteCoordinates([]);
      return;
    }

    const isHeadingToPickup = requestResponse?.status === 'ACCEPTED' || requestResponse?.status === 'ARRIVED';
    const target = isHeadingToPickup ? incomingRequest.pickup : incomingRequest.dropoff;

    if (driverLocation.lat && driverLocation.lng && target?.lat && target?.lng) {
      fetchRoute(
        { lat: driverLocation.lat, lng: driverLocation.lng },
        { lat: target.lat, lng: target.lng }
      )
        .then((res) => {
          if (res.coordinates && res.coordinates.length > 0) {
            setRouteCoordinates(res.coordinates);
          }
        })
        .catch(() => {});
    }
  }, [incomingRequest, requestResponse?.status, driverLocation?.lat, driverLocation?.lng]);

  // When active trip starts or updates, zoom to fit driver and destination
  useEffect(() => {
    if (isTripActive && incomingRequest && mapRef.current) {
      const isHeadingToPickup = requestResponse?.status === 'ACCEPTED' || requestResponse?.status === 'ARRIVED';
      const target = isHeadingToPickup ? incomingRequest.pickup : incomingRequest.dropoff;
      if (target?.lat && target?.lng && driverLocation) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: driverLocation.lat, longitude: driverLocation.lng },
            { latitude: target.lat, longitude: target.lng },
          ],
          {
            edgePadding: { top: 140, right: 60, bottom: 300, left: 60 },
            animated: true,
          }
        );
      }
    }
  }, [isTripActive, incomingRequest?.tripId, requestResponse?.status]);

  // Simulated movement along the route during testing/demo if device is stationary
  useEffect(() => {
    if (!isTripActive || !activeTripId || routeCoordinates.length === 0) {
      return;
    }

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < routeCoordinates.length) {
        const nextCoord = routeCoordinates[stepIndex];
        const nextPoint: LocationPoint = {
          lat: nextCoord.latitude,
          lng: nextCoord.longitude,
          address: driverLocationRef.current?.address || 'Đang di chuyển',
          label: 'Vị trí hiện tại',
        };

        setDriverLocation(nextPoint);
        driverLocationRef.current = nextPoint;
        setRealtimeDriverLocation(nextPoint.lat, nextPoint.lng);

        sendDriverLocation({
          tripId: activeTripId,
          driverId: driverIdRef.current,
          lat: nextPoint.lat,
          lng: nextPoint.lng,
          bearing: 90,
          speed: 30,
        });

        stepIndex += Math.max(1, Math.floor(routeCoordinates.length / 15));
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isTripActive, activeTripId, routeCoordinates]);

  // Polling checks for cancellation
  useEffect(() => {
    if (!activeTripId) return;

    const intervalId = setInterval(async () => {
      try {
        const trip = await getTrip(activeTripId);
        if (trip.status === 'CANCELLED') {
          showAlert({
            type: 'warning',
            title: t('driver.tripCancelledTitle'),
            message: t('driver.tripCancelledMsg'),
          });
          resetCompletedTrip();
        }
      } catch {}
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTripId, resetCompletedTrip, showAlert, t]);

  // Countdown timer for incoming request
  useEffect(() => {
    if (!incomingRequest || requestResponse) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(30);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIncomingRequest(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest, requestResponse]);

  const handleRecenter = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: driverLocation.lat,
          longitude: driverLocation.lng,
          latitudeDelta: DRIVER_MAP_DELTA,
          longitudeDelta: DRIVER_MAP_DELTA,
        },
        600
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. FULLSCREEN MAPVIEW (Edge-to-Edge like Grab Driver) */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={getDriverMapRegion(driverLocation ?? getDefaultLocationPoint())}
        loadingEnabled
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        zoomControlEnabled={false}
      >
        {/* Hotspots / Demand Heatmap Overlay */}
        {showHotspots &&
          HOTSPOTS.map((h, i) => (
            <Circle
              key={`hotspot-${i}`}
              center={{ latitude: h.lat, longitude: h.lng }}
              radius={h.radius}
              fillColor="rgba(239, 68, 68, 0.18)"
              strokeColor="rgba(239, 68, 68, 0.55)"
              strokeWidth={1.5}
            />
          ))}

        {/* Driver Navigation Marker with Pulse Ring (like Grab screenshot) */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={userProfile?.fullName ?? (driverProfile ? t('driver.headerTitleWithId', { id: String(driverProfile.id) }) : t('driver.headerTitle'))}
            zIndex={50}
          >
            <View style={styles.driverNavPin}>
              <View style={[styles.driverNavHalo, isOnline && styles.driverNavHaloOnline]} />
              <View style={[styles.driverNavCircle, isOnline && styles.driverNavCircleOnline]}>
                <MaterialCommunityIcons
                  name="navigation"
                  size={rs(22)}
                  color="#ffffff"
                  style={{ transform: [{ rotate: '-45deg' }] }}
                />
              </View>
            </View>
          </Marker>
        )}

        {/* Active Trip Polyline & Destination Markers */}
        {isTripActive && incomingRequest && (
          <>
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={palette.blue}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {incomingRequest.pickup?.lat && (
              <Marker
                coordinate={{ latitude: incomingRequest.pickup.lat, longitude: incomingRequest.pickup.lng }}
                title={t('driver.pickupLabel')}
                description={incomingRequest.pickup.address}
                pinColor="green"
              />
            )}

            {incomingRequest.dropoff?.lat && (
              <Marker
                coordinate={{ latitude: incomingRequest.dropoff.lat, longitude: incomingRequest.dropoff.lng }}
                title={t('driver.dropoffLabel')}
                description={incomingRequest.dropoff.address}
                pinColor="red"
              />
            )}
          </>
        )}

        {/* 3-Word Marker Preview */}
        {threeWordPreview && (
          <Marker
            coordinate={{ latitude: threeWordPreview.lat, longitude: threeWordPreview.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={`/// ${threeWordPreview.wordAddress}`}
            zIndex={40}
          >
            <View style={styles.threeWordMapPin}>
              <Text style={styles.threeWordPinSymbol}>{'///'}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* 2. FLOATING TOP COCKPIT BAR (Overlay) */}
      <View style={[styles.topOverlay, { top: insets.top + rvs(8) }]}>
        <View style={styles.cockpitBar}>
          <TouchableOpacity
            activeOpacity={0.84}
            style={styles.driverProfileBtn}
            onPress={() => router.push('/(driver)/account')}
          >
            <View style={styles.driverAvatar}>
              <MaterialCommunityIcons name="account" size={rs(26)} color={palette.greenDark} />
            </View>
            <View style={styles.driverInfoTextWrap}>
              <Text style={styles.driverNameText} numberOfLines={1}>
                {userProfile?.fullName ?? (driverProfile ? t('driver.headerTitleWithId', { id: String(driverProfile.id) }) : t('driver.headerTitle'))}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={rs(13)} color="#F59E0B" />
                <Text style={styles.ratingText}>4.9</Text>
                <View style={styles.bulletDot} />
                <View style={[styles.miniStatusDot, { backgroundColor: isOnline ? palette.green : palette.muted }]} />
                <Text style={[styles.miniStatusText, { color: isOnline ? palette.green : palette.muted }]}>
                  {isOnline ? t('driver.statusPillOnline') : t('driver.statusPillOffline')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cockpitRightActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              style={styles.todayEarningsChip}
              onPress={() => router.push('/(driver)/earnings')}
            >
              <Text style={styles.todayEarningsLabel}>{t('driverEarnings.periodToday')}</Text>
              <Text style={styles.todayEarningsAmount}>{formatFare(todayEarnings)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              style={styles.bellBtn}
              onPress={() => {
                if (latestNotification) {
                  showAlert({
                    type: 'info',
                    title: latestNotification.title,
                    message: latestNotification.body,
                  });
                }
              }}
            >
              <MaterialCommunityIcons name="bell-outline" size={rs(24)} color={palette.ink} />
              {latestNotification && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Warning Banner if pending/rejected */}
        {!loadingProfile && driverProfile && driverProfile.approvalStatus !== 'APPROVED' && (
          <View style={[styles.warningBanner, driverProfile.approvalStatus === 'REJECTED' && styles.dangerBanner]}>
            <MaterialCommunityIcons
              name={driverProfile.approvalStatus === 'PENDING' ? 'clock-outline' : 'alert-circle-outline'}
              size={rs(20)}
              color={driverProfile.approvalStatus === 'PENDING' ? palette.amber : palette.danger}
            />
            <Text style={styles.warningBannerText} numberOfLines={2}>
              {driverProfile.approvalStatus === 'PENDING' ? t('driver.profilePendingMsg') : t('driver.profileRejectedMsg')}
            </Text>
          </View>
        )}
      </View>

      {/* 3. FLOATING MAP ACTION BUTTONS (Right Stack) */}
      <View style={[styles.floatingActionStack, { bottom: isTripActive ? rvs(360) : rvs(165) + insets.bottom }]}>
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.mapActionButton, showHotspots && styles.mapActionButtonActive]}
          onPress={() => setShowHotspots((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={t('driver.hotspots', 'Khu vực đông khách')}
        >
          <MaterialCommunityIcons
            name="weather-lightning"
            size={rs(26)}
            color={showHotspots ? palette.amber : palette.ink}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.mapActionButton}
          onPress={() => setSearch3WordModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('driver.search3Word', 'Tra cứu 3 từ')}
        >
          <Text style={styles.threeWordActionSymbol}>{'///'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.mapActionButton}
          onPress={handleRecenter}
          accessibilityRole="button"
          accessibilityLabel={t('driver.currentLocationLabel', 'Vị trí hiện tại')}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={rs(26)} color={palette.blue} />
        </TouchableOpacity>
      </View>

      {/* 4. FLOATING POWER TOGGLE BUTTON (Bottom Left, raised above offline/online card) */}
      {!isTripActive && !incomingRequest && (
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={toggleLoading}
          onPress={() => handleToggleOnline(!isOnline)}
          style={[
            styles.floatingPowerButton,
            isOnline ? styles.floatingPowerButtonOnline : styles.floatingPowerButtonOffline,
            { bottom: rvs(165) + insets.bottom },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isOnline ? t('driver.statusPillOnline') : t('driver.statusPillOffline')}
        >
          {toggleLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <MaterialCommunityIcons name="power" size={rs(34)} color="#ffffff" />
          )}
        </TouchableOpacity>
      )}

      {/* 5. FLOATING BOTTOM STATUS BAR / BOTTOM SHEET (Grab Driver Style) */}
      <View style={styles.bottomContainer}>
        {/* State A: INCOMING TRIP REQUEST MODAL / SHEET */}
        {incomingRequest && !requestResponse ? (
          <View style={styles.incomingRequestCard}>
            <View style={styles.incomingHeaderRow}>
              <View style={styles.incomingTitleWrap}>
                <Text style={styles.incomingTitle}>{t('driver.newRequestTitle', 'Cuốc xe mới')}</Text>
                <Text style={styles.passengerName}>
                  {incomingRequest.passenger?.fullName ?? t('driver.defaultPassengerName')}
                </Text>
              </View>
              <View style={styles.fareBadge}>
                <Text style={styles.fareAmountText}>{formatFare(incomingRequest.estimatedFare)}</Text>
              </View>
            </View>

            {timeLeft !== null && (
              <View style={styles.timerProgressTrack}>
                <View style={[styles.timerProgressBar, { width: `${progressPercent}%` }]} />
              </View>
            )}

            <View style={styles.routeBox}>
              <View style={styles.routeItemRow}>
                <View style={styles.pickupDot} />
                <Text style={styles.routeAddressText} numberOfLines={1}>
                  {incomingRequest.pickup?.address ?? t('driver.defaultPickup')}
                </Text>
              </View>
              <View style={styles.routeItemRow}>
                <View style={styles.dropoffDot} />
                <Text style={styles.routeAddressText} numberOfLines={1}>
                  {incomingRequest.dropoff?.address ?? t('driver.defaultDropoff')}
                </Text>
              </View>
            </View>

            <View style={styles.incomingMetaRow}>
              <Text style={styles.incomingMetaText}>
                {formatDistance(incomingRequest.estimatedDistance, t)} · {formatDuration(incomingRequest.estimatedDuration, t)}
              </Text>
              <Text style={styles.incomingTimerText}>
                {t('driver.timerExpire', { seconds: String(timeLeft ?? 30) })}
              </Text>
            </View>

            <View style={styles.incomingActionRow}>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={Boolean(respondingAction)}
                style={styles.rejectBtn}
                onPress={() => void handleRespondToRequest('REJECT')}
              >
                {respondingAction === 'REJECT' ? (
                  <ActivityIndicator size="small" color={palette.danger} />
                ) : (
                  <Text style={styles.rejectBtnText}>{t('driver.rejectBtn')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={Boolean(respondingAction)}
                style={styles.acceptBtn}
                onPress={() => void handleRespondToRequest('ACCEPT')}
              >
                {respondingAction === 'ACCEPT' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.acceptBtnText}>{t('driver.acceptBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : isTripActive && incomingRequest && requestResponse ? (
          /* State B: ACTIVE TRIP COCKPIT BOTTOM SHEET */
          <View style={styles.activeTripCard}>
            <View style={styles.handleBar} />

            <View style={styles.activeTripHeader}>
              <View style={styles.passengerInfoWrap}>
                <Text style={styles.activeTripStatusTitle}>
                  {formatTripStatus(requestResponse.status, t)}
                </Text>
                <Text style={styles.activePassengerName} numberOfLines={1}>
                  {incomingRequest.passenger?.fullName ?? t('driver.defaultPassengerName')}
                </Text>
              </View>
              <View style={styles.activeTripFareWrap}>
                <Text style={styles.activeFareText}>{formatFare(incomingRequest.estimatedFare)}</Text>
              </View>
            </View>

            {/* Quick Action Utilities: Call, Nav, Chat, 3-Words */}
            <View style={styles.activeTripUtilityRow}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.utilityBtn}
                onPress={handleCallPassenger}
              >
                <MaterialCommunityIcons name="phone" size={rs(22)} color={palette.green} />
                <Text style={styles.utilityBtnText}>{t('driver.callPassenger', 'Gọi điện')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.utilityBtn}
                onPress={handleOpenNavigation}
              >
                <MaterialCommunityIcons name="google-maps" size={rs(22)} color={palette.blue} />
                <Text style={styles.utilityBtnText}>{t('driver.navigation', 'Chỉ đường')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.utilityBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(driver)/chat' as any,
                    params: {
                      tripId: String(requestResponse.tripId),
                      status: requestResponse.status,
                      participantName: incomingRequest.passenger?.fullName ?? t('driver.defaultPassengerName'),
                    },
                  })
                }
              >
                <MaterialCommunityIcons name="message-text-outline" size={rs(22)} color={palette.ink} />
                <Text style={styles.utilityBtnText}>{t('driver.chatTitle', 'Nhắn tin')}</Text>
                {unreadChatCount > 0 && <View style={styles.chatBadgeDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.utilityBtn}
                onPress={() => setSearch3WordModalVisible(true)}
              >
                <Text style={styles.utility3WordSymbol}>{'///'}</Text>
                <Text style={styles.utilityBtnText}>{t('driver.search3Word', '3 từ')}</Text>
              </TouchableOpacity>
            </View>

            {/* Status Progress Step Button */}
            {getNextDriverStatus(requestResponse.status) ? (
              <TouchableOpacity
                activeOpacity={0.86}
                disabled={Boolean(updatingTripStatus)}
                style={styles.mainTripActionBtn}
                onPress={() => {
                  const nextStatus = getNextDriverStatus(requestResponse.status);
                  if (nextStatus) {
                    void handleUpdateActiveTripStatus(nextStatus);
                  }
                }}
              >
                {updatingTripStatus ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={getNextStatusIcon(getNextDriverStatus(requestResponse.status))}
                      size={rs(24)}
                      color="#ffffff"
                    />
                    <Text style={styles.mainTripActionText}>
                      {getNextStatusButtonLabel(getNextDriverStatus(requestResponse.status), t)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.86}
                disabled={confirmingPayment}
                style={[styles.mainTripActionBtn, styles.completePaymentBtn]}
                onPress={handleConfirmPaymentAndReady}
              >
                {confirmingPayment ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-decagram" size={rs(24)} color="#ffffff" />
                    <Text style={styles.mainTripActionText}>
                      {t('driver.cashReceivedReady', 'Thu tiền mặt & Sẵn sàng')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : isOnline ? (
          /* State C: ONLINE & IDLE (Exact match to screenshot) */
          <View style={styles.onlineIdleCard}>
            <View style={styles.onlineIdleContent}>
              <MaterialCommunityIcons name="lightning-bolt" size={rs(24)} color={palette.green} />
              <Text style={styles.onlineIdleTitle}>
                {t('driver.autoAccepting', 'Đang tự động nhận cuốc xe đến.')}
              </Text>
            </View>
          </View>
        ) : (
          /* State D: OFFLINE */
          <View style={styles.offlineCard}>
            <View style={styles.offlineContent}>
              <MaterialCommunityIcons name="power" size={rs(22)} color={palette.muted} />
              <Text style={styles.offlineTitle}>
                {t('driver.offlinePrompt', 'Bạn đang ngoại tuyến. Bật nút nguồn để nhận cuốc.')}
              </Text>
            </View>
          </View>
        )}

        {/* 6. STANDARDIZED DRIVER BOTTOM NAVIGATION BAR */}
        <DriverBottomNav currentTab="home" />
      </View>

      {/* 3-Word Search Modal */}
      <ThreeWordSearchModal
        visible={search3WordModalVisible}
        onClose={() => setSearch3WordModalVisible(false)}
        onSelectResult={(result) => {
          setThreeWordPreview(result);
          mapRef.current?.animateToRegion(
            {
              latitude: result.lat,
              longitude: result.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            700
          );
        }}
      />

      {/* Custom Alert Modal for all dialogs */}
      <CustomAlertModal
        {...alertConfig}
        onClose={closeAlert}
      />
    </View>
  );
}

function isDriverTrackingStatus(status: TripStatus) {
  return status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS' || status === 'COMPLETED';
}

function formatFare(fare: number) {
  return `${Math.round(fare).toLocaleString('vi-VN')}đ`;
}

function formatDistance(distanceKm: number | null | undefined, t: (key: string) => string) {
  if (!distanceKm || distanceKm <= 0) return t('driver.distanceUnknown');
  return `${distanceKm.toFixed(1)} km`;
}

function formatDuration(durationMinutes: number | null | undefined, t: (key: string) => string) {
  if (!durationMinutes || durationMinutes <= 0) return t('driver.durationUnknown');
  return `${Math.round(durationMinutes)} phút`;
}

function formatTripStatus(status: TripStatus, t: (key: string) => string) {
  switch (status) {
    case 'ACCEPTED':
      return t('driver.stepAccepted');
    case 'ARRIVED':
      return t('driver.stepArrived');
    case 'IN_PROGRESS':
      return t('driver.stepInProgress');
    case 'COMPLETED':
      return t('driver.stepCompleted');
    default:
      return status;
  }
}

function getNextDriverStatus(currentStatus: TripStatus): TripStatus | null {
  if (currentStatus === 'ACCEPTED') return 'ARRIVED';
  if (currentStatus === 'ARRIVED') return 'IN_PROGRESS';
  if (currentStatus === 'IN_PROGRESS') return 'COMPLETED';
  return null;
}

function getNextStatusIcon(nextStatus: TripStatus | null): keyof typeof MaterialCommunityIcons.glyphMap {
  if (nextStatus === 'ARRIVED') return 'map-marker-check';
  if (nextStatus === 'IN_PROGRESS') return 'car-sports';
  if (nextStatus === 'COMPLETED') return 'flag-checkered';
  return 'check';
}

function getNextStatusButtonLabel(nextStatus: TripStatus | null, t: (key: string) => string): string {
  if (nextStatus === 'ARRIVED') return t('driver.stepArrived');
  if (nextStatus === 'IN_PROGRESS') return t('driver.stepInProgress');
  if (nextStatus === 'COMPLETED') return t('driver.stepCompleted');
  return t('common.confirm');
}

function getDriverMapRegion(location: LocationPoint): Region {
  return {
    latitude: location.lat,
    longitude: location.lng,
    latitudeDelta: DRIVER_MAP_DELTA,
    longitudeDelta: DRIVER_MAP_DELTA,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topOverlay: {
    position: 'absolute',
    left: rs(16),
    right: rs(16),
    zIndex: 40,
  },
  cockpitBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: rs(28),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  driverProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  driverAvatar: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfoTextWrap: {
    flex: 1,
  },
  driverNameText: {
    color: palette.ink,
    fontSize: rf(19),
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginTop: 2,
  },
  ratingText: {
    color: palette.ink,
    fontSize: rf(15),
    fontWeight: '700',
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.muted,
    marginHorizontal: 2,
  },
  miniStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  miniStatusText: {
    fontSize: rf(14),
    fontWeight: '700',
  },
  cockpitRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  todayEarningsChip: {
    backgroundColor: palette.greenSoft,
    borderRadius: rs(16),
    paddingHorizontal: rs(12),
    paddingVertical: rvs(6),
    alignItems: 'center',
  },
  todayEarningsLabel: {
    color: palette.greenDark,
    fontSize: rf(12),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  todayEarningsAmount: {
    color: palette.greenDark,
    fontSize: rf(16),
    fontWeight: '900',
  },
  bellBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: rs(8),
    right: rs(8),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: palette.danger,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    backgroundColor: palette.amberSoft,
    borderRadius: rs(16),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(8),
    marginTop: rvs(8),
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dangerBanner: {
    backgroundColor: palette.dangerSoft,
    borderColor: '#FECACA',
  },
  warningBannerText: {
    flex: 1,
    color: palette.ink,
    fontSize: rf(14),
    fontWeight: '600',
  },
  floatingActionStack: {
    position: 'absolute',
    right: rs(16),
    zIndex: 42,
    gap: rvs(12),
  },
  mapActionButton: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(29),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow,
  },
  mapActionButtonActive: {
    backgroundColor: palette.amberSoft,
    borderColor: palette.amber,
  },
  threeWordActionSymbol: {
    color: palette.danger,
    fontSize: rf(22),
    fontWeight: '900',
    letterSpacing: -1,
  },
  floatingPowerButton: {
    position: 'absolute',
    left: rs(20),
    width: rs(68),
    height: rs(68),
    borderRadius: rs(34),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 45,
    ...shadow,
  },
  floatingPowerButtonOnline: {
    backgroundColor: palette.green,
    shadowColor: palette.green,
    shadowOpacity: 0.45,
  },
  floatingPowerButtonOffline: {
    backgroundColor: '#334155',
  },
  driverNavPin: {
    width: rs(52),
    height: rs(52),
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNavHalo: {
    position: 'absolute',
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
  },
  driverNavHaloOnline: {
    backgroundColor: 'rgba(0, 200, 83, 0.24)',
  },
  driverNavCircle: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(17),
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  driverNavCircleOnline: {
    backgroundColor: palette.blue,
  },
  threeWordMapPin: {
    backgroundColor: palette.card,
    borderRadius: rs(12),
    paddingHorizontal: rs(10),
    paddingVertical: rvs(4),
    borderWidth: 1.5,
    borderColor: palette.danger,
  },
  threeWordPinSymbol: {
    color: palette.danger,
    fontSize: rf(16),
    fontWeight: '900',
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  onlineIdleCard: {
    marginHorizontal: rs(14),
    marginBottom: rvs(10),
    backgroundColor: '#ffffff',
    borderRadius: rs(22),
    paddingHorizontal: rs(18),
    paddingVertical: rvs(14),
    ...shadow,
  },
  onlineIdleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  onlineIdleTitle: {
    color: palette.ink,
    fontSize: rf(19),
    fontWeight: '800',
    flex: 1,
  },
  offlineCard: {
    marginHorizontal: rs(14),
    marginBottom: rvs(10),
    backgroundColor: '#ffffff',
    borderRadius: rs(22),
    paddingHorizontal: rs(18),
    paddingVertical: rvs(14),
    ...shadow,
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  offlineTitle: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '700',
    flex: 1,
  },
  incomingRequestCard: {
    marginHorizontal: rs(14),
    marginBottom: rvs(10),
    backgroundColor: '#ffffff',
    borderRadius: rs(28),
    padding: rs(22),
    ...shadow,
  },
  incomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(12),
  },
  incomingTitleWrap: {
    flex: 1,
  },
  incomingTitle: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  passengerName: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '900',
  },
  fareBadge: {
    backgroundColor: palette.greenSoft,
    paddingHorizontal: rs(14),
    paddingVertical: rvs(8),
    borderRadius: rs(16),
  },
  fareAmountText: {
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '900',
  },
  timerProgressTrack: {
    height: rvs(6),
    backgroundColor: '#E2E8F0',
    borderRadius: rs(3),
    overflow: 'hidden',
    marginBottom: rvs(14),
  },
  timerProgressBar: {
    height: '100%',
    backgroundColor: palette.amber,
  },
  routeBox: {
    gap: rvs(8),
    marginBottom: rvs(12),
  },
  routeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  pickupDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    backgroundColor: palette.green,
  },
  dropoffDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    backgroundColor: palette.danger,
  },
  routeAddressText: {
    flex: 1,
    color: palette.ink,
    fontSize: rf(18),
    fontWeight: '700',
  },
  incomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(16),
  },
  incomingMetaText: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '600',
  },
  incomingTimerText: {
    color: palette.amber,
    fontSize: rf(16),
    fontWeight: '800',
  },
  incomingActionRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  rejectBtn: {
    flex: 1,
    height: rvs(64),
    borderRadius: rs(18),
    borderWidth: 1.5,
    borderColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: palette.danger,
    fontSize: rf(20),
    fontWeight: '800',
  },
  acceptBtn: {
    flex: 2,
    height: rvs(64),
    borderRadius: rs(18),
    backgroundColor: palette.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: rf(22),
    fontWeight: '900',
  },
  activeTripCard: {
    marginHorizontal: rs(14),
    marginBottom: rvs(10),
    backgroundColor: '#ffffff',
    borderRadius: rs(28),
    paddingHorizontal: rs(22),
    paddingTop: rvs(14),
    paddingBottom: rvs(18),
    ...shadow,
  },
  handleBar: {
    width: rs(44),
    height: rvs(5),
    borderRadius: rs(3),
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: rvs(12),
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(14),
  },
  passengerInfoWrap: {
    flex: 1,
  },
  activeTripStatusTitle: {
    color: palette.blue,
    fontSize: rf(16),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activePassengerName: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '900',
  },
  activeTripFareWrap: {
    backgroundColor: palette.greenSoft,
    borderRadius: rs(14),
    paddingHorizontal: rs(12),
    paddingVertical: rvs(6),
  },
  activeFareText: {
    color: palette.greenDark,
    fontSize: rf(20),
    fontWeight: '900',
  },
  activeTripUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rvs(16),
    gap: rs(8),
  },
  utilityBtn: {
    flex: 1,
    height: rvs(58),
    borderRadius: rs(16),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  utilityBtnText: {
    color: palette.ink,
    fontSize: rf(13),
    fontWeight: '700',
  },
  utility3WordSymbol: {
    color: palette.danger,
    fontSize: rf(16),
    fontWeight: '900',
  },
  chatBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.danger,
  },
  mainTripActionBtn: {
    height: rvs(72),
    borderRadius: rs(20),
    backgroundColor: palette.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  completePaymentBtn: {
    backgroundColor: palette.green,
  },
  mainTripActionText: {
    color: '#ffffff',
    fontSize: rf(22),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bottomNav: {
    height: rvs(76),
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: rs(80),
  },
  navText: {
    color: '#64748B',
    fontSize: rf(14),
    fontWeight: '600',
    marginTop: 2,
  },
  navTextActive: {
    color: palette.green,
    fontWeight: '800',
  },
});
