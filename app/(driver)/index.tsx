import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { rf, rs, rvs } from '@/constants/responsive';
import { USE_MOCK_REALTIME } from '@/lib/config';
import { getCurrentLocationPoint, getDefaultLocationPoint, requestLocationPermission, reverseGeocode, fetchRoute } from '@/lib/location-service';
import {
  connectRealtime,
  disconnectRealtime,
  sendDriverHeartbeat,
  sendDriverLocation,
  sendTripStatus,
  subscribeDriverRequests,
  subscribeNotifications,
  subscribeRealtimeConnection,
  subscribeTrip,
  type RealtimeSubscription,
} from '@/lib/realtime';
import { ApiError } from '@/lib/api';
import { initializeAuthSession } from '@/lib/auth-api';
import { getDriverProfile, sendHeartbeatRest, type DriverProfileResponse } from '@/lib/driver-api';
import { confirmCashPayment, getTrip, respondToTrip, setDriverOnline, updateTripStatus } from '@/lib/ride-api';
import type { DriverAction, DriverTripRequest, LocationPoint, TripStatus, WsNotification } from '@/types/ride';

const DRIVER_HEARTBEAT_INTERVAL_MS = 20000;
const DRIVER_LOCATION_INTERVAL_MS = 5000;
const DRIVER_LOCATION_TIMEOUT_MS = 4500;
const DRIVER_MAP_DELTA = 0.01;

const palette = {
  background: '#eaf7ef',
  backgroundDeep: '#cfeedd',
  card: '#ffffff',
  ink: '#08110d',
  muted: '#637069',
  line: '#dfe7e2',
  green: '#00b875',
  greenDark: '#053f2a',
  greenSoft: '#dcf8ed',
  amber: '#f59e0b',
  amberSoft: '#fff3d8',
  danger: '#d72828',
  dangerSoft: '#ffe7e7',
  blue: '#1664ff',
  blueInk: '#050063',
  blueSoft: '#e9f0ff',
  mint: '#6df0a7',
};

type DriverRealtimeMode = 'offline' | 'connecting' | 'mock' | 'remote' | 'fallback';

const ACTIVE_TRIP_STEPS: { label: string; status: TripStatus }[] = [
  { label: 'Đã nhận', status: 'ACCEPTED' },
  { label: 'Đã đến', status: 'ARRIVED' },
  { label: 'Đang đi', status: 'IN_PROGRESS' },
  { label: 'Hoàn thành', status: 'COMPLETED' },
];

export default function DriverScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [isOnline, setIsOnline] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LocationPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Bạn đang offline. Bật online để nhận cuốc mới.');
  const [realtimeMode, setRealtimeMode] = useState<DriverRealtimeMode>('offline');
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
  const [lastDriverLocationSentAt, setLastDriverLocationSentAt] = useState<string | null>(null);
  const [driverTrackingMessage, setDriverTrackingMessage] = useState('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
  const [latestNotification, setLatestNotification] = useState<WsNotification | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalExpiryTime, setTotalExpiryTime] = useState<number>(30);
  const requestSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const notificationSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const connectionSubscriptionRef = useRef<RealtimeSubscription | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverLocationRef = useRef<LocationPoint | null>(null);
  const driverGpsPingInFlightRef = useRef(false);
  const lastFetchedLocationRef = useRef<{ tripId: number; status: TripStatus | null; lat: number; lng: number } | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const mapRef = useRef<MapView | null>(null);

  const [driverProfile, setDriverProfile] = useState<DriverProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const driverIdRef = useRef<number>(5);

  const fetchProfile = useCallback(() => {
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
          Alert.alert('Lỗi tải hồ sơ', error.message || 'Không thể tải thông tin hồ sơ tài xế.');
          setLoadingProfile(false);
        }
      });
  }, [router]);

  useEffect(() => {
    let isCurrent = true;
    initializeAuthSession().then((session) => {
      if (isCurrent && session) {
        // Auth session initialized, profile load will assign real driver ID
      }
    });

    fetchProfile();

    return () => {
      isCurrent = false;
    };
  }, [fetchProfile]);

  const realtimeCopy = useMemo(() => getRealtimeCopy(realtimeMode), [realtimeMode]);
  const activeTripId = requestResponse && isDriverTrackingStatus(requestResponse.status) ? requestResponse.tripId : null;
  const progressPercent = timeLeft !== null && totalExpiryTime > 0
    ? (timeLeft / totalExpiryTime) * 100
    : 100;
  const todayTripCount = requestResponse?.status === 'COMPLETED' ? 13 : 12;
  const todayEarnings =
    450000 + (requestResponse?.status === 'COMPLETED' && incomingRequest ? Math.round(incomingRequest.estimatedFare) : 0);
  const listeningCopy = getListeningCopy(isOnline, incomingRequest);

  useEffect(() => {
    driverLocationRef.current = driverLocation;
  }, [driverLocation]);

  const stopOnlineServices = useCallback(() => {
    requestSubscriptionRef.current?.unsubscribe();
    requestSubscriptionRef.current = null;
    notificationSubscriptionRef.current?.unsubscribe();
    notificationSubscriptionRef.current = null;
    connectionSubscriptionRef.current?.unsubscribe();
    connectionSubscriptionRef.current = null;

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
      const response = await setDriverOnline(false, lat, lng);
      stopOnlineServices();
      setIsOnline(false);
      setIncomingRequest(null);
      setRequestResponse(null);
      setRespondingAction(null);
      setUpdatingTripStatus(null);
      setLastDriverLocationSentAt(null);
      setDriverTrackingMessage('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
      setRealtimeMode('offline');
      setStatusMessage(response.message);
    } catch (error: unknown) {
      Alert.alert('Không thể tắt online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
    } finally {
      setToggleLoading(false);
    }
  }, [stopOnlineServices]);

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
        setStatusMessage('Bạn đang online. GoRide đang nghe cuốc mới qua realtime.');
        return;
      }

      if (state.status === 'connecting') {
        setRealtimeMode('connecting');
        return;
      }

      if (state.status === 'reconnecting' && remoteConnectionOpened) {
        setRealtimeMode('fallback');
        setStatusMessage('Realtime đang kết nối lại. GoRide vẫn giữ tài xế online và tiếp tục gửi heartbeat khi kênh trở lại.');
        return;
      }

      if (state.status === 'error') {
        setRealtimeMode('fallback');
        setStatusMessage(state.lastError ?? 'Realtime tạm thời gián đoạn, GoRide sẽ tự kết nối lại.');
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
            setStatusMessage('Yêu cầu cuốc xe đã bị hành khách hủy.');
            Alert.alert('Cuốc xe đã bị hủy', 'Hành khách đã hủy yêu cầu đặt xe này.');
          } else if (requestResponseRef.current?.tripId === cancelledTripId) {
            Alert.alert(
              'Chuyến xe đã bị hủy',
              'Hành khách đã hủy chuyến xe này. Hệ thống sẽ đưa bạn trở lại trạng thái sẵn sàng.'
            );
            resetCompletedTripRef.current();
          }
          return;
        }

        setIncomingRequest(request);
        setRequestResponse(null);
        setStatusMessage('Có cuốc mới đang chờ bạn phản hồi.');

        // Fetch full trip details from REST API to populate missing info (like address, passenger details)
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
            
            // Fallback: If 403/Forbidden (permission error before accepting), perform reverse geocoding on coordinates!
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
              setStatusMessage('Yêu cầu cuốc xe đã bị hành khách hủy.');
              Alert.alert('Cuốc xe đã bị hủy', 'Hành khách đã hủy yêu cầu đặt xe này.');
            } else if (requestResponseRef.current?.tripId === notificationTripId) {
              Alert.alert(
                'Chuyến xe đã bị hủy',
                'Hành khách đã hủy chuyến xe này. Hệ thống sẽ đưa bạn trở lại trạng thái sẵn sàng.'
              );
              resetCompletedTripRef.current();
            }
          }
        }
      });
      startHeartbeat();
    } catch (error: unknown) {
      setRealtimeMode('fallback');
      setStatusMessage(getErrorMessage(error, 'Realtime chưa sẵn sàng, GoRide sẽ thử lại ở bước sau.'));
    }
  }, [startHeartbeat]);

  const goOnline = useCallback(async () => {
    setToggleLoading(true);

    try {
      const permission = await requestLocationPermission();
      let nextLocation = getDefaultLocationPoint();

      if (permission.granted) {
        try {
          nextLocation = await getCurrentLocationPoint({ timeoutMs: 10000 });
          setLocationMessage('Đã lấy GPS hiện tại để sẵn sàng nhận cuốc.');
        } catch (error: unknown) {
          setLocationMessage(getErrorMessage(error, 'GPS quá lâu, tạm dùng vị trí gần nhất.'));
        }
      } else if (permission.status === 'gps-disabled') {
        setToggleLoading(false);
        Alert.alert(
          'GPS đang tắt',
          'Vui lòng bật GPS (Dịch vụ vị trí) để GoRide có thể xác định vị trí của bạn và nhận cuốc.',
          [
            { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
            { text: 'Để sau', style: 'cancel' },
          ],
        );
        return;
      } else {
        // Permission denied
        setToggleLoading(false);
        if (permission.canAskAgain === false) {
          Alert.alert(
            'Cần quyền truy cập vị trí',
            'Bạn đã từ chối quyền vị trí trước đó. Vui lòng vào Cài đặt > Ứng dụng > GoRide > Quyền và bật quyền Vị trí.',
            [
              { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
              { text: 'Để sau', style: 'cancel' },
            ],
          );
        } else {
          Alert.alert(
            'Cần quyền truy cập vị trí',
            'GoRide cần quyền truy cập vị trí để xác định điểm đứng của bạn và gửi cho khách hàng. Vui lòng cấp quyền khi được hỏi.',
          );
        }
        return;
      }

      const response = await setDriverOnline(true, nextLocation.lat, nextLocation.lng);
      setDriverLocation(nextLocation);
      setIsOnline(true);
      setStatusMessage(response.message);
      await startRealtime();
    } catch (error: unknown) {
      Alert.alert('Không thể bật online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
      stopOnlineServices();
      setIsOnline(false);
      setRealtimeMode('offline');
    } finally {
      setToggleLoading(false);
    }
  }, [startRealtime, stopOnlineServices]);

  const handleToggleOnline = (value: boolean) => {
    if (toggleLoading) {
      return;
    }

    if (value) {
      if (!driverProfile || driverProfile.approvalStatus !== 'APPROVED') {
        Alert.alert('Không thể hoạt động', 'Hồ sơ tài xế của bạn chưa được duyệt hoặc chưa hoàn tất.');
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
          setStatusMessage('Bạn đã nhận cuốc. Chuẩn bị di chuyển đến điểm đón.');
          setDriverTrackingMessage('Đang khởi động GPS cuốc để gửi vị trí cho khách.');

          // Now that trip is ACCEPTED, driver has permission to fetch full trip details!
          // This retrieves passenger name and phone number.
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
            .catch((err) => {
              console.warn('[Driver] Failed to fetch trip details after accept:', err);
            });

          return;
        }

        setIncomingRequest(null);
        setStatusMessage('Bạn đã từ chối cuốc. GoRide tiếp tục nghe request mới.');
      } catch (error: unknown) {
        Alert.alert(
          action === 'ACCEPT' ? 'Không thể nhận cuốc' : 'Không thể từ chối cuốc',
          getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'),
        );
      } finally {
        setRespondingAction(null);
      }
    },
    [incomingRequest, respondingAction],
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
        setStatusMessage(getDriverStatusMessage(response.status));
        setDriverTrackingMessage(getDriverTrackingMessage(response.status));
      } catch (error: unknown) {
        Alert.alert('Không thể cập nhật chuyến', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));
      } finally {
        setUpdatingTripStatus(null);
      }
    },
    [requestResponse, updatingTripStatus],
  );

  const handleCallPassenger = useCallback(() => {
    if (!incomingRequest?.passenger?.phone) {
      Alert.alert('Không tìm thấy số điện thoại', 'Số điện thoại của khách hàng chưa được cập nhật.');
      return;
    }

    const telUrl = `tel:${incomingRequest.passenger.phone}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          void Linking.openURL(telUrl);
        } else {
          Alert.alert('Không thể gọi điện', 'Thiết bị của bạn không hỗ trợ tính năng cuộc gọi điện thoại.');
        }
      })
      .catch((err) => {
        console.warn('[Driver] Failed to place call:', err);
      });
  }, [incomingRequest]);

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
            Alert.alert('Không thể mở bản đồ', 'Thiết bị của bạn không hỗ trợ liên kết này.');
          }
        })
        .catch((err) => {
          console.warn('[Driver] Failed to open maps:', err);
        });
    }
  }, [incomingRequest, requestResponse]);

  const resetCompletedTrip = useCallback(() => {
    setIncomingRequest(null);
    setRequestResponse(null);
    setRespondingAction(null);
    setUpdatingTripStatus(null);
    setLastDriverLocationSentAt(null);
    setDriverTrackingMessage('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');
    setStatusMessage('Bạn đang online. GoRide tiếp tục nghe cuốc mới.');
  }, []);

  const resetCompletedTripRef = useRef(resetCompletedTrip);
  useEffect(() => {
    resetCompletedTripRef.current = resetCompletedTrip;
  }, [resetCompletedTrip]);

  const handleConfirmPaymentAndReady = useCallback(async () => {
    if (!requestResponse) {
      return;
    }

    setConfirmingPayment(true);
    try {
      await confirmCashPayment(requestResponse.tripId);
      resetCompletedTrip();
    } catch (error: unknown) {
      Alert.alert('Lỗi xác nhận thanh toán', getErrorMessage(error, 'Không thể xác nhận thanh toán tiền mặt lúc này.'));
    } finally {
      setConfirmingPayment(false);
    }
  }, [requestResponse, resetCompletedTrip]);

  const sendDriverGpsPing = useCallback(async (tripId: number) => {
    if (driverGpsPingInFlightRef.current) {
      return;
    }

    driverGpsPingInFlightRef.current = true;
    let nextLocation = driverLocationRef.current ?? getDefaultLocationPoint();

    try {
      nextLocation = await getCurrentLocationPoint({ timeoutMs: DRIVER_LOCATION_TIMEOUT_MS });
      setDriverTrackingMessage('GPS cuốc đang gửi vị trí thật theo chu kỳ.');
    } catch (error: unknown) {
      setDriverTrackingMessage(getErrorMessage(error, 'Không lấy được GPS mới, tạm gửi vị trí gần nhất.'));
    } finally {
      driverGpsPingInFlightRef.current = false;
    }

    const sentAt = new Date().toISOString();

    driverLocationRef.current = nextLocation;
    setDriverLocation(nextLocation);
    const publishResult = sendDriverLocation({
      tripId,
      driverId: driverIdRef.current,
      lat: nextLocation.lat,
      lng: nextLocation.lng,
      updatedAt: sentAt,
    });

    if (publishResult.sent) {
      setLastDriverLocationSentAt(sentAt);
      return;
    }

    setRealtimeMode('fallback');
    setDriverTrackingMessage('Realtime chưa sẵn sàng để gửi GPS, GoRide sẽ thử lại ở nhịp tiếp theo.');
  }, []);

  useEffect(() => {
    return () => stopOnlineServices();
  }, [stopOnlineServices]);

  useEffect(() => {
    if (!activeTripId) {
      if (driverLocationTimerRef.current) {
        clearInterval(driverLocationTimerRef.current);
        driverLocationTimerRef.current = null;
      }

      if (requestResponse?.status === 'COMPLETED') {
        setDriverTrackingMessage('GPS cuốc đã dừng sau khi hoàn thành chuyến.');
      }

      return;
    }

    if (driverLocationTimerRef.current) {
      clearInterval(driverLocationTimerRef.current);
    }

    void sendDriverGpsPing(activeTripId);
    driverLocationTimerRef.current = setInterval(() => {
      void sendDriverGpsPing(activeTripId);
    }, DRIVER_LOCATION_INTERVAL_MS);

    return () => {
      if (driverLocationTimerRef.current) {
        clearInterval(driverLocationTimerRef.current);
        driverLocationTimerRef.current = null;
      }
    };
  }, [activeTripId, requestResponse?.status, sendDriverGpsPing]);

  // Polling check to handle TRIP_CANCELLED in case the backend hasn't implemented websocket notification yet
  useEffect(() => {
    if (!activeTripId) return;

    const intervalId = setInterval(async () => {
      try {
        const trip = await getTrip(activeTripId);
        if (trip.status === 'CANCELLED') {
          Alert.alert(
            'Chuyến xe đã bị hủy',
            'Hành khách đã hủy chuyến xe này. Hệ thống sẽ đưa bạn trở lại trạng thái sẵn sàng.'
          );
          resetCompletedTrip();
        }
      } catch (err) {
        console.warn('[Driver] Polling trip status failed:', err);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [activeTripId, resetCompletedTrip]);

  // Polling and WebSocket subscription to handle TRIP_CANCELLED for incoming trip request before acceptance
  useEffect(() => {
    if (!incomingRequest || requestResponse) return;

    const tripId = incomingRequest.tripId;
    let wsSubscription: RealtimeSubscription | null = null;

    try {
      wsSubscription = subscribeTrip(tripId, {
        onStatus: (message) => {
          if (message.status === 'CANCELLED') {
            Alert.alert(
              'Cuốc xe đã bị hủy',
              'Hành khách đã hủy yêu cầu đặt xe này.'
            );
            resetCompletedTrip();
          }
        },
      });
    } catch (wsErr) {
      console.warn('[Driver] Failed to subscribe to incoming trip status WS:', wsErr);
    }

    const intervalId = setInterval(async () => {
      try {
        const trip = await getTrip(tripId);
        if (trip.status === 'CANCELLED') {
          Alert.alert(
            'Cuốc xe đã bị hủy',
            'Hành khách đã hủy yêu cầu đặt xe này.'
          );
          resetCompletedTrip();
        }
      } catch (err) {
        console.warn('[Driver] Polling incoming request status failed:', err);
      }
    }, 3000); // Check every 3 seconds

    return () => {
      if (wsSubscription) {
        wsSubscription.unsubscribe();
      }
      clearInterval(intervalId);
    };
  }, [incomingRequest, requestResponse, resetCompletedTrip]);

  // Countdown timer for incoming trip requests
  useEffect(() => {
    if (!incomingRequest || requestResponse) {
      setTimeLeft(null);
      return;
    }

    let initialSeconds = 30;
    if (incomingRequest.expiresAt) {
      const msLeft = new Date(incomingRequest.expiresAt).getTime() - Date.now();
      initialSeconds = Math.max(0, Math.round(msLeft / 1000));
    }

    // If request already expired, dismiss immediately
    if (initialSeconds <= 0) {
      setIncomingRequest(null);
      setStatusMessage('Yêu cầu cuốc xe đã hết hạn phản hồi.');
      return;
    }

    setTimeLeft(initialSeconds);
    setTotalExpiryTime(initialSeconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIncomingRequest(null);
          setStatusMessage('Yêu cầu cuốc xe đã hết hạn phản hồi.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest, requestResponse]);

  // Play sound & vibration when a new trip request arrives
  useEffect(() => {
    if (!incomingRequest || requestResponse) {
      return;
    }

    // Play haptic feedback immediately
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Play notification sound
    let soundObj: Audio.Sound | null = null;
    const loadAndPlaySound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav' },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        soundObj = sound;
      } catch (err) {
        console.warn('[Driver] Failed to play notification sound:', err);
      }
    };

    void loadAndPlaySound();

    // Trigger haptic pulse every 2 seconds while ringing
    const hapticInterval = setInterval(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 2000);

    return () => {
      clearInterval(hapticInterval);
      if (soundObj) {
        soundObj.stopAsync()
          .then(() => soundObj?.unloadAsync())
          .catch((err) => console.warn('[Driver] Failed to cleanup sound:', err));
      }
    };
  }, [incomingRequest?.tripId, requestResponse]);

  useEffect(() => {
    if (!incomingRequest) {
      setRouteCoordinates([]);
      lastFetchedLocationRef.current = null;
      lastRouteFetchTimeRef.current = 0;
      return;
    }

    const tripId = incomingRequest.tripId;
    const status = requestResponse?.status ?? null;
    const now = Date.now();

    // 1. Nếu chưa ACCEPT (đang rung chuông): vẽ lộ trình từ pickup đến dropoff
    if (!requestResponse || requestResponse.tripId !== tripId) {
      if (incomingRequest.pickup?.lat && incomingRequest.dropoff?.lat) {
        void fetchRoute(
          { lat: incomingRequest.pickup.lat, lng: incomingRequest.pickup.lng },
          { lat: incomingRequest.dropoff.lat, lng: incomingRequest.dropoff.lng }
        )
          .then((res) => {
            setRouteCoordinates(res.coordinates);
          })
          .catch(() => setRouteCoordinates([]));
      }
      return;
    }

    // Determine current driver location
    const currentLoc = driverLocation ?? driverLocationRef.current ?? getDefaultLocationPoint();
    if (!currentLoc?.lat || !currentLoc?.lng) {
      return;
    }

    // Check throttle and distance
    const isFirstFetchForStatus =
      !lastFetchedLocationRef.current ||
      lastFetchedLocationRef.current.tripId !== tripId ||
      lastFetchedLocationRef.current.status !== status;

    if (!isFirstFetchForStatus && lastFetchedLocationRef.current) {
      // Throttle: fetch at most once every 12 seconds when moving
      if (now - lastRouteFetchTimeRef.current < 12000) {
        return;
      }
      // Distance check: must move > 50 meters
      const distanceMoved = getDistanceBetweenPoints(
        currentLoc.lat,
        currentLoc.lng,
        lastFetchedLocationRef.current.lat,
        lastFetchedLocationRef.current.lng
      );
      if (distanceMoved <= 50) {
        return;
      }
    }

    // 2. Nếu đã ACCEPTED hoặc ARRIVED: vẽ lộ trình từ vị trí tài xế hiện tại đến điểm đón
    if (status === 'ACCEPTED' || status === 'ARRIVED') {
      if (incomingRequest.pickup?.lat) {
        void fetchRoute(
          { lat: currentLoc.lat, lng: currentLoc.lng },
          { lat: incomingRequest.pickup.lat, lng: incomingRequest.pickup.lng }
        )
          .then((res) => {
            setRouteCoordinates(res.coordinates);
            lastFetchedLocationRef.current = { tripId, status, lat: currentLoc.lat, lng: currentLoc.lng };
            lastRouteFetchTimeRef.current = now;
          })
          .catch(() => {});
      }
      return;
    }

    // 3. Nếu đang IN_PROGRESS: vẽ lộ trình từ vị trí tài xế đến điểm trả khách
    if (status === 'IN_PROGRESS') {
      if (incomingRequest.dropoff?.lat) {
        void fetchRoute(
          { lat: currentLoc.lat, lng: currentLoc.lng },
          { lat: incomingRequest.dropoff.lat, lng: incomingRequest.dropoff.lng }
        )
          .then((res) => {
            setRouteCoordinates(res.coordinates);
            lastFetchedLocationRef.current = { tripId, status, lat: currentLoc.lat, lng: currentLoc.lng };
            lastRouteFetchTimeRef.current = now;
          })
          .catch(() => {});
      }
      return;
    }

    }, [
    incomingRequest?.tripId,
    requestResponse?.status,
    incomingRequest?.pickup?.lat,
    incomingRequest?.dropoff?.lat,
    driverLocation,
  ]);

  // Animate map to show the trip region when status or location changes
  useEffect(() => {
    if (!incomingRequest || !mapRef.current) return;

    const nextRegion = getTripMapRegion(
      incomingRequest,
      driverLocation,
      requestResponse?.status ?? null
    );

    mapRef.current.animateToRegion(nextRegion, 1000);
  }, [incomingRequest?.tripId, requestResponse?.status, driverLocation?.lat, driverLocation?.lng]);

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.green} />
        <Text style={{ marginTop: rvs(10), color: palette.muted, fontSize: rf(16), fontWeight: '700' }}>
          Đang tải thông tin tài xế...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { minHeight: height }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.consoleHeader}>
          <View style={styles.driverIdentity}>
            <View style={styles.driverAvatar}>
              <MaterialCommunityIcons name="account" size={rs(34)} color={palette.greenDark} />
            </View>
            <Text style={styles.consoleTitle}>Driver Console</Text>
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.bellButton, pressed ? styles.pressedButton : null]}>
            <MaterialCommunityIcons name="bell-outline" size={rs(32)} color={palette.blueInk} />
            {latestNotification ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        {!loadingProfile && driverProfile && driverProfile.approvalStatus !== 'APPROVED' ? (
          <View style={[styles.warningCard, driverProfile.approvalStatus === 'REJECTED' && styles.dangerCard]}>
            <MaterialCommunityIcons
              name={driverProfile.approvalStatus === 'PENDING' ? 'clock-outline' : 'alert-circle-outline'}
              size={rs(24)}
              color={driverProfile.approvalStatus === 'PENDING' ? palette.amber : palette.danger}
            />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>
                {driverProfile.approvalStatus === 'PENDING' ? 'Hồ sơ đang chờ duyệt' : 'Hồ sơ bị từ chối'}
              </Text>
              <Text style={styles.warningText}>
                {driverProfile.approvalStatus === 'PENDING'
                  ? 'Ban quản trị đang xem xét hồ sơ của bạn. Bạn chưa thể bật online nhận chuyến lúc này.'
                  : 'Hồ sơ đăng ký tài xế không được chấp nhận. Vui lòng liên hệ bộ phận hỗ trợ.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* NẾU CÓ CUỐC XE: Hiển thị yêu cầu cuốc xe mới lên trên cùng */}
        {incomingRequest ? (
          <View style={styles.requestCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.requestIcon]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={rs(34)} color={palette.blue} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Yêu cầu cuốc xe mới</Text>
                <Text style={styles.sectionSubtitle}>Có yêu cầu chuyến đi đang chờ bạn phản hồi</Text>
              </View>
            </View>

            <View style={styles.incomingBox}>
              <View style={styles.incomingTopRow}>
                <View>
                  <Text style={styles.incomingLabel}>Cuốc #{incomingRequest.tripId}</Text>
                  <Text style={styles.passengerName}>{incomingRequest.passenger?.fullName ?? 'Khách hàng'}</Text>
                </View>
                <View style={styles.fareBadge}>
                  <Text style={styles.fareText}>{formatFare(incomingRequest.estimatedFare)}</Text>
                </View>
              </View>

              {timeLeft !== null && (
                <View style={styles.timerContainer}>
                  <View style={styles.timerRow}>
                    <MaterialCommunityIcons name="timer-sand" size={rs(16)} color={palette.amber} />
                    <Text style={styles.timerText}>Tự động trôi sau {timeLeft} giây</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                </View>
              )}

              <RouteLine label="Đón" address={incomingRequest.pickup?.address ?? 'Điểm đón'} color={palette.green} />
              <RouteLine label="Đến" address={incomingRequest.dropoff?.address ?? 'Điểm đến'} color={palette.danger} />

              <View style={styles.requestMetaRow}>
                <Text style={styles.requestMetaText}>{formatDistance(incomingRequest.estimatedDistance)}</Text>
                <Text style={styles.requestMetaText}>{formatDuration(incomingRequest.estimatedDuration)}</Text>
              </View>

              {/* Routing Map Preview */}
              <View style={styles.routingMapFrame}>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  initialRegion={getTripMapRegion(incomingRequest, driverLocation, requestResponse?.status ?? null)}
                  loadingEnabled
                  pitchEnabled={false}
                  rotateEnabled={false}
                  zoomControlEnabled={true}
                >
                  {(requestResponse?.status === 'ACCEPTED' || requestResponse?.status === 'ARRIVED' || !requestResponse) && (
                    <Marker
                      coordinate={{ latitude: incomingRequest.pickup.lat, longitude: incomingRequest.pickup.lng }}
                      title="Điểm đón"
                      description={incomingRequest.pickup.address}
                      pinColor="green"
                    />
                  )}

                  {(requestResponse?.status === 'IN_PROGRESS' || !requestResponse) && (
                    <Marker
                      coordinate={{ latitude: incomingRequest.dropoff.lat, longitude: incomingRequest.dropoff.lng }}
                      title="Điểm đến"
                      description={incomingRequest.dropoff.address}
                    />
                  )}

                  {requestResponse && driverLocation && (
                    <Marker
                      coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                      title="Vị trí của bạn"
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <View style={styles.driverMapPin}>
                        <View style={styles.driverMapPinHalo} />
                        <View style={styles.driverMapPinBubble}>
                          <MaterialCommunityIcons name="navigation-variant" size={rs(18)} color={palette.card} />
                        </View>
                      </View>
                    </Marker>
                  )}

                  {routeCoordinates.length > 0 && (
                    <Polyline
                      coordinates={routeCoordinates}
                      strokeColor={palette.blue}
                      strokeWidth={5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </MapView>
              </View>

              {requestResponse?.tripId === incomingRequest.tripId ? (
                <View style={styles.activeTripBox}>
                  <View style={styles.acceptedBox}>
                    <MaterialCommunityIcons name="check-circle" size={rs(30)} color={palette.green} />
                    <Text style={styles.acceptedText}>
                      Cuốc #{requestResponse.tripId}. Trạng thái: {formatTripStatus(requestResponse.status)}.
                    </Text>
                  </View>

                  <View style={styles.tripProgressRail}>
                    {ACTIVE_TRIP_STEPS.map((step) => (
                      <View key={step.status} style={styles.tripProgressItem}>
                        <View
                          style={[
                            styles.tripProgressDot,
                            isTripStepCompleted(requestResponse.status, step.status) ? styles.tripProgressDotActive : null,
                          ]}
                        />
                        <Text
                          style={[
                            styles.tripProgressLabel,
                            isTripStepCompleted(requestResponse.status, step.status) ? styles.tripProgressLabelActive : null,
                          ]}
                        >
                          {step.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* UTILITY BUTTONS: Call passenger & Open navigation */}
                  <View style={styles.tripUtilityRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleCallPassenger}
                      style={({ pressed }) => [
                        styles.utilityButton,
                        styles.callButton,
                        pressed ? styles.pressedButton : null,
                      ]}
                    >
                      <MaterialCommunityIcons name="phone" size={rs(20)} color={palette.green} />
                      <Text style={[styles.utilityButtonText, styles.callButtonText]}>Gọi khách</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleOpenNavigation}
                      style={({ pressed }) => [
                        styles.utilityButton,
                        styles.navButton,
                        pressed ? styles.pressedButton : null,
                      ]}
                    >
                      <MaterialCommunityIcons name="google-maps" size={rs(20)} color={palette.blue} />
                      <Text style={[styles.utilityButtonText, styles.navButtonText]}>Chỉ đường</Text>
                    </Pressable>
                  </View>

                  {getNextDriverStatus(requestResponse.status) ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(updatingTripStatus)}
                      onPress={() => {
                        const nextStatus = getNextDriverStatus(requestResponse.status);

                        if (nextStatus) {
                          void handleUpdateActiveTripStatus(nextStatus);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.statusButton,
                        pressed && !updatingTripStatus ? styles.pressedButton : null,
                        updatingTripStatus ? styles.disabledButton : null,
                      ]}
                    >
                      {updatingTripStatus ? (
                        <ActivityIndicator color={palette.card} />
                      ) : (
                        <MaterialCommunityIcons
                          name={getNextStatusIcon(getNextDriverStatus(requestResponse.status))}
                          size={rs(30)}
                          color={palette.card}
                        />
                      )}
                      <Text style={styles.statusButtonText}>
                        {updatingTripStatus
                          ? 'Đang cập nhật'
                          : getNextStatusButtonLabel(getNextDriverStatus(requestResponse.status))}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.completedTripStack}>
                      <View style={styles.completedTripBox}>
                        <MaterialCommunityIcons name="cash-register" size={rs(30)} color={palette.green} />
                        <Text style={styles.completedTripText}>
                          Hãy thu {incomingRequest ? formatFare(incomingRequest.estimatedFare) : 'tiền'} tiền mặt của khách. Xác nhận sau khi đã nhận đủ.
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={confirmingPayment}
                        onPress={handleConfirmPaymentAndReady}
                        style={({ pressed }) => [
                          styles.readyButton,
                          pressed && !confirmingPayment ? styles.pressedButton : null,
                          confirmingPayment ? styles.disabledButton : null,
                        ]}
                      >
                        {confirmingPayment ? (
                          <ActivityIndicator color={palette.card} />
                        ) : (
                          <MaterialCommunityIcons name="check-decagram" size={rs(28)} color={palette.card} />
                        )}
                        <Text style={styles.readyButtonText}>
                          {confirmingPayment ? 'Đang xác nhận...' : 'Đã nhận tiền mặt & Sẵn sàng'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(respondingAction)}
                    onPress={() => void handleRespondToRequest('REJECT')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.rejectButton,
                      pressed && !respondingAction ? styles.pressedButton : null,
                      respondingAction ? styles.disabledButton : null,
                    ]}
                  >
                    {respondingAction === 'REJECT' ? (
                      <ActivityIndicator color={palette.danger} />
                    ) : (
                      <MaterialCommunityIcons name="close-circle-outline" size={rs(30)} color={palette.danger} />
                    )}
                    <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                      {respondingAction === 'REJECT' ? 'Đang từ chối' : 'Từ chối'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(respondingAction)}
                    onPress={() => void handleRespondToRequest('ACCEPT')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.acceptButton,
                      pressed && !respondingAction ? styles.pressedButton : null,
                      respondingAction ? styles.disabledButton : null,
                    ]}
                  >
                    {respondingAction === 'ACCEPT' ? (
                      <ActivityIndicator color={palette.card} />
                    ) : (
                      <MaterialCommunityIcons name="check-circle-outline" size={rs(30)} color={palette.card} />
                    )}
                    <Text style={[styles.actionButtonText, styles.acceptButtonText]}>
                      {respondingAction === 'ACCEPT' ? 'Đang nhận' : 'Nhận cuốc'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? palette.green : palette.muted }]} />
              <Text style={[styles.statusPillText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                {isOnline ? 'Đang online' : 'Đang offline'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={toggleLoading}
              trackColor={{ false: '#314038', true: palette.greenSoft }}
              thumbColor={isOnline ? palette.green : '#f4f7f5'}
            />
          </View>

          <Text style={styles.title}>{isOnline ? 'Sẵn sàng nhận cuốc' : 'Bật online để bắt đầu'}</Text>
          <Text style={styles.subtitle}>{statusMessage}</Text>

          <View style={styles.heroMetricRow}>
            <MetricTile icon="access-point" label="Kênh" value={realtimeCopy.label} tone={realtimeCopy.tone} />
            <MetricTile icon="heart-pulse" label="Heartbeat" value={formatTrackingTime(lastHeartbeatAt)} tone="green" />
          </View>

          {toggleLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.green} />
              <Text style={styles.loadingText}>Đang cập nhật trạng thái tài xế...</Text>
            </View>
          ) : null}
        </View>

        {/* NẾU KHÔNG CÓ CUỐC XE: Hiển thị box yêu cầu cuốc xe rỗng ở đây */}
        {!incomingRequest ? (
          <View style={styles.requestCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.requestIcon]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={rs(34)} color={palette.blue} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Yêu cầu cuốc xe</Text>
                <Text style={styles.sectionSubtitle}>
                  {isOnline
                    ? (USE_MOCK_REALTIME ? 'Mock realtime sẽ đẩy cuốc demo sau vài giây.' : 'Đang chờ cuốc từ server thời gian thực...')
                    : 'Bạn cần online để nhận request.'}
                </Text>
              </View>
            </View>

            <View style={styles.emptyRequestBox}>
              <MaterialCommunityIcons name={isOnline ? 'radar' : 'power-plug-off-outline'} size={rs(66)} color={palette.muted} />
              <Text style={styles.emptyTitle}>{isOnline ? 'Đang nghe cuốc mới' : 'Chưa online'}</Text>
              <Text style={styles.emptyText}>
                {isOnline
                  ? 'Khi backend hoặc mock realtime gửi request, thông tin cuốc sẽ xuất hiện tại đây.'
                  : 'Bật công tắc online để mở heartbeat và kênh request của tài xế.'}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.listeningCard, incomingRequest ? styles.listeningCardHot : null, !isOnline ? styles.listeningCardIdle : null]}>
          <View style={styles.listeningIcon}>
            <MaterialCommunityIcons name={listeningCopy.icon} size={rs(34)} color={palette.blue} />
          </View>
          <View style={styles.listeningCopy}>
            <Text style={styles.listeningTitle}>{listeningCopy.title}</Text>
            <Text style={styles.listeningText}>{listeningCopy.text}</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard label="THU NHẬP HÔM NAY" value={formatFare(todayEarnings)} />
          <StatCard label="CHUYẾN ĐI" value={String(todayTripCount)} />
        </View>

        <View style={styles.locationCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="crosshairs-gps" size={rs(34)} color={palette.green} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Vị trí tài xế</Text>
              <Text style={styles.sectionSubtitle}>{locationMessage ?? 'GoRide sẽ lấy GPS khi bạn bật online.'}</Text>
            </View>
          </View>

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>Điểm đứng hiện tại</Text>
            <Text style={styles.locationValue} selectable>
              {driverLocation?.address ?? 'Chưa có vị trí'}
            </Text>
            <Text style={styles.locationCoords} selectable>
              {driverLocation ? formatCoordinates(driverLocation) : 'GPS chưa được gửi'}
            </Text>
          </View>

          <View style={styles.trackingBox}>
            <View style={styles.trackingIcon}>
              <MaterialCommunityIcons name="map-marker-path" size={rs(30)} color={palette.blue} />
            </View>
            <View style={styles.trackingCopy}>
              <Text style={styles.trackingLabel}>GPS cuốc xe</Text>
              <Text style={styles.trackingText}>{driverTrackingMessage}</Text>
              <Text style={styles.trackingTime}>Lần gửi cuối: {formatTrackingTime(lastDriverLocationSentAt)}</Text>
            </View>
          </View>
        </View>

        {latestNotification ? (
          <View style={styles.notificationCard}>
            <MaterialCommunityIcons name="message-badge-outline" size={rs(36)} color={palette.blue} />
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>{latestNotification.title}</Text>
              <Text style={styles.notificationBody}>{latestNotification.body}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomNav}>
        <DriverNavItem icon="home-variant" label="Home" active />
        <DriverNavItem icon="cash-multiple" label="Earnings" onPress={() => router.push('/(driver)/earnings')} />
        <DriverNavItem icon="history" label="Activity" onPress={() => router.push('./activity')} />
        <DriverNavItem icon="account-outline" label="Account" onPress={() => router.push('./account')} />
      </View>
    </SafeAreaView>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'amber' | 'muted';
}) {
  const toneStyle = getToneStyle(tone);

  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: toneStyle.background }]}>
        <MaterialCommunityIcons name={icon} size={rs(30)} color={toneStyle.color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionTile, pressed ? styles.pressedButton : null]}
    >
      <View style={styles.quickActionIcon}>
        <MaterialCommunityIcons name={icon} size={rs(30)} color={palette.blueInk} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function DriverMapPreview({ location }: { location: LocationPoint | null }) {
  const mapPoint = location ?? getDefaultLocationPoint();
  const region = getDriverMapRegion(mapPoint);

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapCanvas}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          region={region}
          loadingEnabled
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={false}
          toolbarEnabled={false}
          zoomControlEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{ latitude: mapPoint.lat, longitude: mapPoint.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Vị trí tài xế"
            description={mapPoint.address}
          >
            <View style={styles.mapPin}>
              <View style={styles.mapPinHalo} />
              <View style={styles.mapPinBubble}>
                <MaterialCommunityIcons name="navigation-variant" size={rs(24)} color={palette.card} />
              </View>
            </View>
          </Marker>
        </MapView>
      </View>

      <View style={styles.mapLocationRow}>
        <View style={styles.mapLocationIcon}>
          <MaterialCommunityIcons name="crosshairs-gps" size={rs(28)} color={palette.blue} />
        </View>
        <View style={styles.mapLocationCopy}>
          <Text style={styles.mapLocationTitle} numberOfLines={1}>
            {location?.address ?? 'Công viên Tao Đàn, Quận 1'}
          </Text>
          <Text style={styles.mapLocationCoords} selectable>
            {location ? formatCoordinates(location) : '10.76262, 106.66017'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getDriverMapRegion(location: LocationPoint): Region {
  return {
    latitude: location.lat,
    longitude: location.lng,
    latitudeDelta: DRIVER_MAP_DELTA,
    longitudeDelta: DRIVER_MAP_DELTA,
  };
}

function DriverNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, active ? styles.navItemActive : null, pressed ? styles.pressedButton : null]}
    >
      <MaterialCommunityIcons name={icon} size={rs(30)} color={active ? palette.greenDark : palette.muted} />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function RouteLine({ label, address, color }: { label: string; address: string; color: string }) {
  return (
    <View style={styles.routeLine}>
      <View style={[styles.routeDot, { backgroundColor: color }]} />
      <View style={styles.routeCopy}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeAddress} numberOfLines={2} selectable>
          {address}
        </Text>
      </View>
    </View>
  );
}

function getListeningCopy(
  isOnline: boolean,
  request: DriverTripRequest | null,
): { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string } {
  if (request) {
    return {
      icon: 'bell-ring-outline',
      title: 'Cuốc mới đang chờ',
      text: `${request.passenger?.fullName ?? 'Khách hàng'} - ${formatFare(request.estimatedFare)} - phản hồi để giữ tỷ lệ nhận cuốc.`,
    };
  }

  if (isOnline) {
    return {
      icon: 'target',
      title: 'Đang nghe cuốc mới',
      text: 'Hệ thống đang tìm khách hàng gần nhất...',
    };
  }

  return {
    icon: 'power-sleep',
    title: 'Tạm dừng nhận cuốc',
    text: 'Bật online để mở kênh request, GPS và heartbeat.',
  };
}

function getToneStyle(tone: 'green' | 'blue' | 'amber' | 'muted') {
  if (tone === 'green') {
    return { color: palette.green, background: palette.greenSoft };
  }

  if (tone === 'blue') {
    return { color: palette.blue, background: palette.blueSoft };
  }

  if (tone === 'amber') {
    return { color: palette.amber, background: palette.amberSoft };
  }

  return { color: palette.muted, background: '#edf2ef' };
}

function getRealtimeCopy(mode: DriverRealtimeMode): { label: string; tone: 'green' | 'blue' | 'amber' | 'muted' } {
  if (mode === 'mock') {
    return { label: 'Mock realtime', tone: 'green' };
  }

  if (mode === 'remote') {
    return { label: 'Remote WS', tone: 'blue' };
  }

  if (mode === 'connecting') {
    return { label: 'Đang nối', tone: 'amber' };
  }

  if (mode === 'fallback') {
    return { label: 'Fallback', tone: 'amber' };
  }

  return { label: 'Đóng', tone: 'muted' };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatCoordinates(location: LocationPoint) {
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function getTripMapRegion(
  request: DriverTripRequest,
  driverLoc: LocationPoint | null,
  status: TripStatus | null
): Region {
  let lat = request.pickup.lat;
  let lng = request.pickup.lng;

  let latDelta = 0.015;
  let lngDelta = 0.015;

  if (status === 'IN_PROGRESS') {
    lat = request.dropoff.lat;
    lng = request.dropoff.lng;
  }

  if (driverLoc && status && (status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS')) {
    const destLat = status === 'IN_PROGRESS' ? request.dropoff.lat : request.pickup.lat;
    const destLng = status === 'IN_PROGRESS' ? request.dropoff.lng : request.pickup.lng;

    lat = (driverLoc.lat + destLat) / 2;
    lng = (driverLoc.lng + destLng) / 2;

    latDelta = Math.max(Math.abs(driverLoc.lat - destLat) * 1.5, 0.008);
    lngDelta = Math.max(Math.abs(driverLoc.lng - destLng) * 1.5, 0.008);
  } else {
    lat = (request.pickup.lat + request.dropoff.lat) / 2;
    lng = (request.pickup.lng + request.dropoff.lng) / 2;
    latDelta = Math.max(Math.abs(request.pickup.lat - request.dropoff.lat) * 1.5, 0.01);
    lngDelta = Math.max(Math.abs(request.pickup.lng - request.dropoff.lng) * 1.5, 0.01);
  }

  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: Math.min(latDelta, 0.08),
    longitudeDelta: Math.min(lngDelta, 0.08),
  };
}

function formatTrackingTime(value: string | null) {
  if (!value) {
    return 'Chưa gửi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFare(value: number) {
  return Math.round(value).toLocaleString('vi-VN') + 'đ';
}

function formatDistance(distance?: number) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatDuration(duration?: number) {
  if (!duration || duration <= 0) {
    return '-- phút';
  }

  return Math.round(duration) + ' phút';
}

function formatTripStatus(status: TripStatus) {
  if (status === 'CANCELLED') {
    return 'Đã hủy';
  }

  if (status === 'ACCEPTED') {
    return 'Đã nhận';
  }

  if (status === 'ARRIVED') {
    return 'Tài xế đã đến';
  }

  if (status === 'IN_PROGRESS') {
    return 'Đang di chuyển';
  }

  if (status === 'COMPLETED') {
    return 'Hoàn thành';
  }

  if (status === 'SEARCHING') {
    return 'Đang tìm tài xế';
  }

  return status;
}

function getNextDriverStatus(status: TripStatus): TripStatus | null {
  if (status === 'ACCEPTED') {
    return 'ARRIVED';
  }

  if (status === 'ARRIVED') {
    return 'IN_PROGRESS';
  }

  if (status === 'IN_PROGRESS') {
    return 'COMPLETED';
  }

  return null;
}

function isDriverTrackingStatus(status: TripStatus) {
  return status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS';
}

function getNextStatusButtonLabel(status: TripStatus | null) {
  if (status === 'ARRIVED') {
    return 'Đã đến điểm đón';
  }

  if (status === 'IN_PROGRESS') {
    return 'Bắt đầu chuyến';
  }

  if (status === 'COMPLETED') {
    return 'Hoàn thành chuyến';
  }

  return 'Cập nhật chuyến';
}

function getNextStatusIcon(status: TripStatus | null): keyof typeof MaterialCommunityIcons.glyphMap {
  if (status === 'ARRIVED') {
    return 'map-marker-check';
  }

  if (status === 'IN_PROGRESS') {
    return 'navigation-variant';
  }

  if (status === 'COMPLETED') {
    return 'flag-checkered';
  }

  return 'check-circle-outline';
}

function getDriverStatusMessage(status: TripStatus) {
  if (status === 'CANCELLED') {
    return 'Chuyến xe đã bị hủy bởi hành khách.';
  }

  if (status === 'ARRIVED') {
    return 'Bạn đã đến điểm đón. Hãy đón khách và bắt đầu chuyến khi sẵn sàng.';
  }

  if (status === 'IN_PROGRESS') {
    return 'Chuyến đang diễn ra. Tiếp tục di chuyển đến điểm trả khách.';
  }

  if (status === 'COMPLETED') {
    return 'Chuyến đã hoàn thành. Cảm ơn bạn đã chạy cùng GoRide.';
  }

  return `Trạng thái chuyến: ${formatTripStatus(status)}.`;
}

function getDriverTrackingMessage(status: TripStatus) {
  if (isDriverTrackingStatus(status)) {
    return 'GPS cuốc đang gửi vị trí cho hành khách.';
  }

  if (status === 'COMPLETED') {
    return 'GPS cuốc đã dừng sau khi hoàn thành chuyến.';
  }

  return 'GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.';
}

function isTripStepCompleted(currentStatus: TripStatus, stepStatus: TripStatus) {
  const currentIndex = ACTIVE_TRIP_STEPS.findIndex((step) => step.status === currentStatus);
  const stepIndex = ACTIVE_TRIP_STEPS.findIndex((step) => step.status === stepStatus);

  return currentIndex >= 0 && stepIndex >= 0 && stepIndex <= currentIndex;
}

function getDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

const styles = StyleSheet.create({
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: rs(16),
    padding: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rvs(8),
  },
  dangerCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  warningCopy: {
    flex: 1,
    gap: rvs(4),
  },
  warningTitle: {
    fontSize: rf(16),
    fontWeight: '800',
    color: '#08110d',
  },
  warningText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#637069',
    lineHeight: rf(18),
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: rs(30),
    paddingTop: rvs(18),
    paddingBottom: rvs(154),
    gap: rvs(16),
    backgroundColor: '#f7faf8',
  },
  consoleHeader: {
    minHeight: rvs(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(16),
  },
  driverIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  driverAvatar: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(23),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfeeda',
  },
  consoleTitle: {
    color: palette.blueInk,
    fontSize: rf(30),
    fontWeight: '900',
  },
  bellButton: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: rvs(8),
    right: rs(8),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: palette.danger,
  },
  heroCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: rs(6),
    borderLeftColor: palette.green,
    gap: rvs(12),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(12),
    height: rvs(34),
    borderRadius: rs(999),
  },
  statusPillOnline: {
    backgroundColor: palette.greenSoft,
  },
  statusPillOffline: {
    backgroundColor: '#edf2ef',
  },
  statusDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
  },
  statusPillText: {
    fontSize: rf(24),
    fontWeight: '900',
  },
  statusTextOnline: {
    color: palette.greenDark,
  },
  statusTextOffline: {
    color: palette.muted,
  },
  title: {
    color: palette.ink,
    fontSize: rf(29),
    fontWeight: '900',
    lineHeight: rf(36),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(22),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  heroMetricRow: {
    flexDirection: 'row',
    gap: rs(18),
    paddingTop: rvs(12),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  metricTile: {
    flex: 1,
    padding: 0,
    gap: rvs(4),
  },
  metricIcon: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '800',
  },
  metricValue: {
    color: palette.ink,
    fontSize: rf(22),
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(12),
    borderRadius: rs(14),
    backgroundColor: palette.greenSoft,
  },
  loadingText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
  },
  listeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    padding: rs(22),
    borderRadius: rs(16),
    backgroundColor: '#d1f3df',
  },
  listeningCardHot: {
    backgroundColor: '#fff4d9',
  },
  listeningCardIdle: {
    backgroundColor: '#edf2ef',
  },
  listeningIcon: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: '#d8fbec',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#80a9ff',
  },
  listeningCopy: {
    flex: 1,
    gap: rvs(4),
  },
  listeningTitle: {
    color: palette.ink,
    fontSize: rf(25),
    fontWeight: '900',
  },
  listeningText: {
    color: palette.muted,
    fontSize: rf(21),
    fontWeight: '700',
    lineHeight: rf(29),
  },
  statGrid: {
    flexDirection: 'row',
    gap: rs(16),
  },
  statCard: {
    flex: 1,
    minHeight: rvs(86),
    paddingHorizontal: rs(22),
    paddingVertical: rvs(18),
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    justifyContent: 'center',
    gap: rvs(4),
  },
  statLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '900',
  },
  statValue: {
    color: palette.ink,
    fontSize: rf(32),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: rs(14),
  },
  quickActionTile: {
    flex: 1,
    minHeight: rvs(86),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rvs(12),
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  quickActionIcon: {
    width: rs(50),
    height: rs(50),
    borderRadius: rs(25),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf8f2',
  },
  quickActionLabel: {
    color: palette.ink,
    fontSize: rf(17),
    fontWeight: '800',
    textAlign: 'center',
  },
  mapCard: {
    overflow: 'hidden',
    borderRadius: rs(16),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
  },
  mapCanvas: {
    height: rvs(148),
    overflow: 'hidden',
    backgroundColor: '#e8f2ee',
  },
  mapPin: {
    width: rs(54),
    height: rs(54),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinHalo: {
    position: 'absolute',
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: '#dce8ff',
  },
  mapPinBubble: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
    borderWidth: rs(4),
    borderColor: palette.card,
  },
  mapLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    padding: rs(22),
  },
  mapLocationIcon: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLocationCopy: {
    flex: 1,
    gap: rvs(3),
  },
  mapLocationTitle: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '800',
  },
  mapLocationCoords: {
    color: '#5f6c64',
    fontSize: rf(22),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  locationCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(16),
  },
  sectionIcon: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(18),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestIcon: {
    backgroundColor: palette.blueSoft,
  },
  sectionCopy: {
    flex: 1,
    gap: rvs(4),
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: rf(28),
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: rf(21),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  locationBox: {
    padding: rs(18),
    borderRadius: rs(14),
    backgroundColor: '#f6faf8',
    gap: rvs(8),
  },
  locationLabel: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  locationValue: {
    color: palette.ink,
    fontSize: rf(24),
    fontWeight: '900',
    lineHeight: rf(32),
  },
  locationCoords: {
    color: palette.green,
    fontSize: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
    padding: rs(16),
    borderRadius: rs(14),
    backgroundColor: palette.blueSoft,
  },
  trackingIcon: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingCopy: {
    flex: 1,
    gap: rvs(4),
  },
  trackingLabel: {
    color: palette.blue,
    fontSize: rf(22),
    fontWeight: '900',
  },
  trackingText: {
    color: '#27446f',
    fontSize: rf(21),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  trackingTime: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  requestCard: {
    padding: rs(24),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    gap: rvs(16),
  },
  incomingBox: {
    padding: rs(20),
    borderRadius: rs(16),
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dce7ff',
    gap: rvs(18),
  },
  timerContainer: {
    marginVertical: rvs(4),
    backgroundColor: '#fffbeb',
    borderRadius: rs(8),
    padding: rs(10),
    borderColor: '#fef3c7',
    borderWidth: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rvs(6),
  },
  timerText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: palette.amber,
  },
  progressBarBg: {
    height: rvs(6),
    backgroundColor: '#fef3c7',
    borderRadius: rs(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: palette.amber,
    borderRadius: rs(3),
  },
  incomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  incomingLabel: {
    color: palette.blue,
    fontSize: rf(20),
    fontWeight: '900',
  },
  passengerName: {
    color: palette.ink,
    fontSize: rf(36),
    fontWeight: '900',
  },
  fareBadge: {
    paddingHorizontal: rs(18),
    paddingVertical: rvs(10),
    borderRadius: rs(18),
    backgroundColor: palette.greenSoft,
  },
  fareText: {
    color: palette.greenDark,
    fontSize: rf(26),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  routeDot: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    marginTop: rvs(9),
  },
  routeCopy: {
    flex: 1,
    gap: rvs(3),
  },
  routeLabel: {
    color: palette.muted,
    fontSize: rf(20),
    fontWeight: '800',
  },
  routeAddress: {
    color: palette.ink,
    fontSize: rf(27),
    fontWeight: '800',
    lineHeight: rf(36),
  },
  requestMetaRow: {
    flexDirection: 'row',
    gap: rs(14),
  },
  requestMetaText: {
    color: palette.blue,
    fontSize: rf(24),
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: rs(12),
  },
  actionButton: {
    flex: 1,
    minHeight: rvs(58),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(8),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(12),
  },
  acceptButton: {
    backgroundColor: palette.green,
  },
  rejectButton: {
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: '#ffcaca',
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: rf(22),
    fontWeight: '900',
  },
  acceptButtonText: {
    color: palette.card,
  },
  rejectButtonText: {
    color: palette.danger,
  },
  acceptedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: palette.greenSoft,
  },
  acceptedText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  activeTripBox: {
    gap: rvs(14),
  },
  tripProgressRail: {
    padding: rs(16),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: '#dce7ff',
    gap: rvs(10),
  },
  tripProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  tripProgressDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: '#d6ddd9',
  },
  tripProgressDotActive: {
    backgroundColor: palette.green,
  },
  tripProgressLabel: {
    color: palette.muted,
    fontSize: rf(22),
    fontWeight: '800',
  },
  tripProgressLabelActive: {
    color: palette.greenDark,
  },
  tripUtilityRow: {
    flexDirection: 'row',
    gap: rs(12),
    marginVertical: rvs(8),
  },
  utilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rvs(10),
    borderRadius: rs(10),
    borderWidth: 1,
    gap: rs(8),
  },
  callButton: {
    backgroundColor: palette.greenSoft,
    borderColor: '#b2f2d9',
  },
  navButton: {
    backgroundColor: palette.blueSoft,
    borderColor: '#cce0ff',
  },
  utilityButtonText: {
    fontSize: rf(14),
    fontWeight: '700',
  },
  callButtonText: {
    color: palette.green,
  },
  navButtonText: {
    color: palette.blue,
  },
  statusButton: {
    minHeight: rvs(62),
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(10),
    paddingHorizontal: rs(18),
    paddingVertical: rvs(14),
    backgroundColor: palette.blue,
  },
  statusButtonText: {
    color: palette.card,
    fontSize: rf(23),
    fontWeight: '900',
  },
  completedTripStack: {
    gap: rvs(12),
  },
  completedTripBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: '#f0fff7',
    borderWidth: 1,
    borderColor: palette.backgroundDeep,
  },
  completedTripText: {
    flex: 1,
    color: palette.greenDark,
    fontSize: rf(22),
    fontWeight: '800',
    lineHeight: rf(30),
  },
  readyButton: {
    minHeight: rvs(58),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs(10),
    paddingHorizontal: rs(16),
    paddingVertical: rvs(12),
    backgroundColor: palette.green,
  },
  readyButtonText: {
    color: palette.card,
    fontSize: rf(22),
    fontWeight: '900',
  },
  emptyRequestBox: {
    minHeight: rvs(240),
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(24),
    borderRadius: rs(30),
    backgroundColor: '#f6faf8',
    gap: rvs(12),
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: rf(34),
    fontWeight: '900',
  },
  emptyText: {
    color: palette.muted,
    fontSize: rf(24),
    fontWeight: '700',
    lineHeight: rf(34),
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(16),
    padding: rs(24),
    borderRadius: rs(32),
    backgroundColor: palette.blueSoft,
  },
  notificationCopy: {
    flex: 1,
    gap: rvs(4),
  },
  notificationTitle: {
    color: palette.blue,
    fontSize: rf(28),
    fontWeight: '900',
  },
  notificationBody: {
    color: '#27446f',
    fontSize: rf(22),
    fontWeight: '700',
    lineHeight: rf(30),
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: rvs(86),
    paddingHorizontal: rs(22),
    paddingTop: rvs(12),
    paddingBottom: rvs(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navItem: {
    flex: 1,
    minHeight: rvs(62),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rvs(4),
    borderRadius: rs(999),
  },
  navItemActive: {
    backgroundColor: palette.mint,
  },
  navLabel: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '900',
  },
  navLabelActive: {
    color: palette.greenDark,
  },
  routingMapFrame: {
    height: rvs(220),
    borderRadius: rs(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: rvs(12),
    marginBottom: rvs(8),
    backgroundColor: '#eef3f0',
  },
  driverMapPin: {
    alignItems: 'center',
    justifyContent: 'center',
    width: rs(40),
    height: rs(40),
  },
  driverMapPinHalo: {
    position: 'absolute',
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: palette.blueSoft,
    opacity: 0.6,
  },
  driverMapPinBubble: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
