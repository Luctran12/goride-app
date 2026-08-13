const fs = require('fs');
const path = 'd:\\PARA\\Project\\goride-app\\app\\(driver)\\index.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { useLanguage }')) {
  content = content.replace(
    'import { useRouter } from \\'expo-router\\';',
    'import { useRouter } from \\'expo-router\\';\\nimport { useLanguage } from \\'@/lib/i18n\\';'
  );
}

const activeTripStepsRegex = /const ACTIVE_TRIP_STEPS: \\{ label: string; status: TripStatus \\}\\[\\] = \\[[\\s\\S]*?\\];\\s*/;
content = content.replace(activeTripStepsRegex, '');

const componentStartRegex = /export default function DriverScreen\\(\\) \\{\\s*const router = useRouter\\(\\);/;
content = content.replace(componentStartRegex, 
  'export default function DriverScreen() {\\n' +
  '  const { t } = useLanguage();\\n' +
  '  const router = useRouter();\\n\\n' +
  '  const ACTIVE_TRIP_STEPS = [\\n' +
  '    { label: t(\\'driver.stepAccepted\\'), status: \\'ACCEPTED\\' },\\n' +
  '    { label: t(\\'driver.stepArrived\\'), status: \\'ARRIVED\\' },\\n' +
  '    { label: t(\\'driver.stepInProgress\\'), status: \\'IN_PROGRESS\\' },\\n' +
  '    { label: t(\\'driver.stepCompleted\\'), status: \\'COMPLETED\\' },\\n' +
  '  ];'
);

const replacements = [
  ["Alert.alert('Lỗi tải hồ sơ', error.message || 'Không thể tải thông tin hồ sơ tài xế.');", "Alert.alert(t('driver.loadProfileErrorTitle'), error.message || t('driver.loadProfileErrorMessage'));"],
  ["Alert.alert('Không thể tắt online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));", "Alert.alert(t('driver.goOfflineErrorTitle'), getErrorMessage(error, t('driver.tryAgainLater')));"],
  ["Alert.alert('Cuốc xe đã bị hủy', 'Hành khách đã hủy yêu cầu đặt xe này.');", "Alert.alert(t('driver.requestCancelledTitle'), t('driver.requestCancelledMessage'));"],
  ["Alert.alert(\\n              'Chuyến xe đã bị hủy',\\n              'Hành khách đã hủy chuyến xe này. Hệ thống sẽ đưa bạn trở lại trạng thái sẵn sàng.'\\n            );", "Alert.alert(\\n              t('driver.tripCancelledTitle'),\\n              t('driver.tripCancelledMessage')\\n            );"],
  ["Alert.alert(\\n            'Chuyến xe đã bị hủy',\\n            'Hành khách đã hủy chuyến xe này. Hệ thống sẽ đưa bạn trở lại trạng thái sẵn sàng.'\\n          );", "Alert.alert(\\n            t('driver.tripCancelledTitle'),\\n            t('driver.tripCancelledMessage')\\n          );"],
  ["Alert.alert(\\n              'Cuốc xe đã bị hủy',\\n              'Hành khách đã hủy yêu cầu đặt xe này.'\\n            );", "Alert.alert(\\n              t('driver.requestCancelledTitle'),\\n              t('driver.requestCancelledMessage')\\n            );"],
  ["Alert.alert(\\n          'GPS đang tắt',\\n          'Vui lòng bật GPS (Dịch vụ vị trí) để GoRide có thể xác định vị trí của bạn và nhận cuốc.',\\n          [\\n            { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },\\n            { text: 'Để sau', style: 'cancel' },\\n          ],\\n        );", "Alert.alert(\\n          t('driver.gpsDisabledTitle'),\\n          t('driver.gpsDisabledMessage'),\\n          [\\n            { text: t('driver.openSettings'), onPress: () => void Linking.openSettings() },\\n            { text: t('driver.later'), style: 'cancel' },\\n          ],\\n        );"],
  ["Alert.alert(\\n            'Cần quyền truy cập vị trí',\\n            'Bạn đã từ chối quyền vị trí trước đó. Vui lòng vào Cài đặt > Ứng dụng > GoRide > Quyền và bật quyền Vị trí.',\\n            [\\n              { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },\\n              { text: 'Để sau', style: 'cancel' },\\n            ],\\n          );", "Alert.alert(\\n            t('driver.locationPermissionTitle'),\\n            t('driver.locationPermissionDeniedMessage'),\\n            [\\n              { text: t('driver.openSettings'), onPress: () => void Linking.openSettings() },\\n              { text: t('driver.later'), style: 'cancel' },\\n            ],\\n          );"],
  ["Alert.alert(\\n            'Cần quyền truy cập vị trí',\\n            'GoRide cần quyền truy cập vị trí để xác định điểm đứng của bạn và gửi cho khách hàng. Vui lòng cấp quyền khi được hỏi.',\\n          );", "Alert.alert(\\n            t('driver.locationPermissionTitle'),\\n            t('driver.locationPermissionMessage'),\\n          );"],
  ["Alert.alert('Không thể bật online', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));", "Alert.alert(t('driver.goOnlineErrorTitle'), getErrorMessage(error, t('driver.tryAgainLater')));"],
  ["Alert.alert('Không thể hoạt động', 'Hồ sơ tài xế của bạn chưa được duyệt hoặc chưa hoàn tất.');", "Alert.alert(t('driver.cannotOperateTitle'), t('driver.cannotOperateMessage'));"],
  ["Alert.alert(\\n          action === 'ACCEPT' ? 'Không thể nhận cuốc' : 'Không thể từ chối cuốc',\\n          getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'),\\n        );", "Alert.alert(\\n          action === 'ACCEPT' ? t('driver.acceptErrorTitle') : t('driver.rejectErrorTitle'),\\n          getErrorMessage(error, t('driver.tryAgainLater')),\\n        );"],
  ["Alert.alert('Không thể cập nhật chuyến', getErrorMessage(error, 'Vui lòng thử lại sau ít phút.'));", "Alert.alert(t('driver.updateTripErrorTitle'), getErrorMessage(error, t('driver.tryAgainLater')));"],
  ["Alert.alert('Không tìm thấy số điện thoại', 'Số điện thoại của khách hàng chưa được cập nhật.');", "Alert.alert(t('driver.noPhoneTitle'), t('driver.noPhoneMessage'));"],
  ["Alert.alert('Không thể gọi điện', 'Thiết bị của bạn không hỗ trợ tính năng cuộc gọi điện thoại.');", "Alert.alert(t('driver.cannotCallTitle'), t('driver.cannotCallMessage'));"],
  ["Alert.alert('Không thể mở bản đồ', 'Thiết bị của bạn không hỗ trợ liên kết này.');", "Alert.alert(t('driver.cannotOpenMapTitle'), t('driver.cannotOpenMapMessage'));"],
  ["Alert.alert('Lỗi xác nhận thanh toán', getErrorMessage(error, 'Không thể xác nhận thanh toán tiền mặt lúc này.'));", "Alert.alert(t('driver.paymentConfirmErrorTitle'), getErrorMessage(error, t('driver.paymentConfirmErrorMessage')));"],
  ["setStatusMessage('Bạn đang offline. Bật online để nhận cuốc mới.');", "setStatusMessage(t('driver.statusOffline'));"],
  ["setStatusMessage('Bạn đang online. GoRide đang nghe cuốc mới qua realtime.');", "setStatusMessage(t('driver.statusOnlineRealtime'));"],
  ["setStatusMessage('Realtime đang kết nối lại. GoRide vẫn giữ tài xế online và tiếp tục gửi heartbeat khi kênh trở lại.');", "setStatusMessage(t('driver.statusReconnecting'));"],
  ["setStatusMessage(state.lastError ?? 'Realtime tạm thời gián đoạn, GoRide sẽ tự kết nối lại.');", "setStatusMessage(state.lastError ?? t('driver.realtimeInterrupted'));"],
  ["setStatusMessage('Yêu cầu cuốc xe đã bị hành khách hủy.');", "setStatusMessage(t('driver.requestCancelledStatus'));"],
  ["setStatusMessage('Có cuốc mới đang chờ bạn phản hồi.');", "setStatusMessage(t('driver.newRequestStatus'));"],
  ["setStatusMessage(getErrorMessage(error, 'Realtime chưa sẵn sàng, GoRide sẽ thử lại ở bước sau.'));", "setStatusMessage(getErrorMessage(error, t('driver.realtimeNotReady')));"],
  ["setStatusMessage('Bạn đã nhận cuốc. Chuẩn bị di chuyển đến điểm đón.');", "setStatusMessage(t('driver.statusAccepted'));"],
  ["setStatusMessage('Bạn đã từ chối cuốc. GoRide tiếp tục nghe request mới.');", "setStatusMessage(t('driver.statusRejected'));"],
  ["setStatusMessage(getDriverStatusMessage(response.status));", "setStatusMessage(getDriverStatusMessage(response.status, t));"],
  ["setStatusMessage('Bạn đang online. GoRide tiếp tục nghe cuốc mới.');", "setStatusMessage(t('driver.statusOnlineRealtime'));"],
  ["setStatusMessage('Yêu cầu cuốc xe đã hết hạn phản hồi.');", "setStatusMessage(t('driver.requestExpiredStatus'));"],
  ["setDriverTrackingMessage('GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.');", "setDriverTrackingMessage(t('driver.gpsTrackingWait'));"],
  ["setDriverTrackingMessage('Đang khởi động GPS cuốc để gửi vị trí cho khách.');", "setDriverTrackingMessage(t('driver.gpsTrackingStart'));"],
  ["setDriverTrackingMessage(getDriverTrackingMessage(response.status));", "setDriverTrackingMessage(getDriverTrackingMessage(response.status, t));"],
  ["setDriverTrackingMessage('GPS cuốc đang gửi vị trí thật theo chu kỳ.');", "setDriverTrackingMessage(t('driver.gpsTrackingActive'));"],
  ["setDriverTrackingMessage(getErrorMessage(error, 'Không lấy được GPS mới, tạm gửi vị trí gần nhất.'));", "setDriverTrackingMessage(getErrorMessage(error, t('driver.gpsTrackingFallback')));"],
  ["setDriverTrackingMessage('Realtime chưa sẵn sàng để gửi GPS, GoRide sẽ thử lại ở nhịp tiếp theo.');", "setDriverTrackingMessage(t('driver.gpsTrackingRealtimeWait'));"],
  ["setDriverTrackingMessage('GPS cuốc đã dừng sau khi hoàn thành chuyến.');", "setDriverTrackingMessage(t('driver.gpsTrackingStopped'));"],
  ["setLocationMessage('Đã lấy GPS hiện tại để sẵn sàng nhận cuốc.');", "setLocationMessage(t('driver.locationMessageReady'));"],
  ["setLocationMessage(getErrorMessage(error, 'GPS quá lâu, tạm dùng vị trí gần nhất.'));", "setLocationMessage(getErrorMessage(error, t('driver.locationMessageFallback')));"],
  ["Đang tải thông tin tài xế...", "{t('driver.loadingProfile')}"],
  ["{driverProfile ? `Tài xế GoRide #${driverProfile.id}` : 'Tài xế GoRide'}", "{driverProfile ? t('driver.headerTitleWithId', { id: driverProfile.id }) : t('driver.headerTitle')}"],
  ["Đối tác tài xế", "{t('driver.headerSubtitle')}"],
  ['label="THU NHẬP HÔM NAY"', 'label={t("driver.statEarnings")}'],
  ['label="CHUYẾN ĐI"', 'label={t("driver.statTrips")}'],
  ["Hồ sơ đang chờ duyệt", "{t('driver.profilePendingTitle')}"],
  ["Hồ sơ bị từ chối", "{t('driver.profileRejectedTitle')}"],
  ["Ban quản trị đang xem xét hồ sơ của bạn. Bạn chưa thể bật online nhận chuyến lúc này.", "{t('driver.profilePendingMessage')}"],
  ["Hồ sơ đăng ký tài xế không được chấp nhận. Vui lòng liên hệ bộ phận hỗ trợ.", "{t('driver.profileRejectedMessage')}"],
  ["{isOnline ? 'ĐANG ONLINE' : 'ĐANG OFFLINE'}", "{isOnline ? t('driver.onlinePill') : t('driver.offlinePill')}"],
  ["{isOnline ? 'Sẵn sàng nhận cuốc' : 'Bật công tắc để nhận cuốc'}", "{isOnline ? t('driver.onlineTitle') : t('driver.offlineTitle')}"],
  ["GoRide đang tìm chuyến đi phù hợp xung quanh vị trí của bạn...", "{t('driver.onlineSubtitle')}"],
  ["Bật online để bắt đầu nhận cuốc và gửi tín hiệu định vị.", "{t('driver.offlineSubtitle')}"],
  ["Đang cập nhật trạng thái...", "{t('driver.updatingStatus')}"],
  ["Yêu cầu cuốc xe mới", "{t('driver.newRequestTitle')}"],
  ["Có chuyến đi mới đang chờ bạn phản hồi", "{t('driver.newRequestSubtitle')}"],
  ["Cuốc #{incomingRequest.tripId}", "{t('driver.tripIdLabel', { id: incomingRequest.tripId })}"],
  ["{incomingRequest.passenger?.fullName ?? 'Khách hàng'}", "{incomingRequest.passenger?.fullName ?? t('driver.defaultPassenger')}"],
  ["Tự động trôi sau {timeLeft} giây", "{t('driver.autoExpireTimer', { seconds: timeLeft })}"],
  ['label="Đón"', 'label={t("driver.pickupLabel")}'],
  ["{incomingRequest.pickup?.address ?? 'Điểm đón'}", "{incomingRequest.pickup?.address ?? t('driver.pickupLabel')}"],
  ['label="Đến"', 'label={t("driver.dropoffLabel")}'],
  ["{incomingRequest.dropoff?.address ?? 'Điểm đến'}", "{incomingRequest.dropoff?.address ?? t('driver.dropoffLabel')}"],
  ['title="Điểm đón"', 'title={t("driver.pickupTitle")}'],
  ['title="Điểm đến"', 'title={t("driver.dropoffTitle")}'],
  ['title="Vị trí của bạn"', 'title={t("driver.yourLocation")}'],
  ['title="Kết quả tra cứu 3 từ"', 'title={t("driver.threeWordResultTitle")}'],
  ["Cuốc #{requestResponse.tripId}. Trạng thái: {formatTripStatus(requestResponse.status)}.", "{t('driver.activeTripStatus', { id: requestResponse.tripId, status: formatTripStatus(requestResponse.status, t) })}"],
  ["Gọi khách", "{t('driver.callPassengerButton')}"],
  ["Chỉ đường", "{t('driver.navigateButton')}"],
  ["Tra 3 từ", "{t('driver.threeWordButton')}"],
  ["Nhắn tin với hành khách", "{t('driver.chatPassengerTitle')}"],
  ["Trao đổi nhanh về điểm đón và lộ trình", "{t('driver.chatPassengerSubtitle')}"],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

// Special dynamic replacements
content = content.replace(
  /\\{updatingTripStatus\\s*\\?\\s*'Đang cập nhật'\\s*:\\s*getNextStatusButtonLabel\\(getNextDriverStatus\\(requestResponse\\.status\\)\\)\\}/,
  "{updatingTripStatus ? t('driver.updatingBtn') : getNextStatusButtonLabel(getNextDriverStatus(requestResponse.status), t)}"
);
content = content.replace(
  /Hãy thu \\{incomingRequest \\? formatFare\\(incomingRequest\\.estimatedFare\\) : 'tiền'\\} tiền mặt của khách\\. Xác nhận sau khi đã nhận đủ\\./,
  "{t('driver.collectCashMessage', { amount: incomingRequest ? formatFare(incomingRequest.estimatedFare) : t('driver.cashAmountFallback') })}"
);
content = content.replace(
  /\\{confirmingPayment \\? 'Đang xác nhận\\.\\.\\.' : 'Đã nhận tiền mặt & Sẵn sàng'\\}/,
  "{confirmingPayment ? t('driver.confirmingPayment') : t('driver.paymentConfirmedAndReady')}"
);
content = content.replace(
  /\\{respondingAction === 'REJECT' \\? 'Đang từ chối' : 'Từ chối'\\}/,
  "{respondingAction === 'REJECT' ? t('driver.rejectingBtn') : t('driver.rejectBtn')}"
);
content = content.replace(
  /\\{respondingAction === 'ACCEPT' \\? 'Đang nhận' : 'Nhận cuốc'\\}/,
  "{respondingAction === 'ACCEPT' ? t('driver.acceptingBtn') : t('driver.acceptBtn')}"
);
content = content.replace(/Vị trí đứng hiện tại/g, "{t('driver.currentLocationLabel')}");
content = content.replace(/\\{driverLocation\\?\\.address \\?\\? 'Đang xác định vị trí\\.\\.\\.'\\}/g, "{driverLocation?.address ?? t('driver.determiningLocation')}");
content = content.replace(/Công cụ kỹ thuật & GPS/g, "{t('driver.devToolsTitle')}");
content = content.replace(/label="Kênh"/g, 'label={t("driver.channelLabel")}');
content = content.replace(/label="Heartbeat"/g, 'label={t("driver.heartbeatLabel")}');
content = content.replace(/Tra tọa độ bằng 3 từ/g, "{t('driver.threeWordSearchBtn')}");
content = content.replace(/Tọa độ: \\{threeWordPreview\\.lat\\.toFixed\\(6\\)\\}, \\{threeWordPreview\\.lng\\.toFixed\\(6\\)\\}/g, "{t('driver.coordinatesPrefix')} {threeWordPreview.lat.toFixed(6)}, {threeWordPreview.lng.toFixed(6)}");
content = content.replace(/>GPS cuốc xe</g, ">{t('driver.gpsTrackingLabel')}<");
content = content.replace(/Lần gửi cuối: \\{formatTrackingTime\\(lastDriverLocationSentAt\\)\\}/g, "{t('driver.lastSentPrefix')} {formatTrackingTime(lastDriverLocationSentAt, t)}");

content = content.replace(/function getDriverStatusMessage\\(status: TripStatus\\)/g, "function getDriverStatusMessage(status: TripStatus, t: any)");
content = content.replace(/function getDriverTrackingMessage\\(status: TripStatus\\)/g, "function getDriverTrackingMessage(status: TripStatus, t: any)");
content = content.replace(/function formatTripStatus\\(status: TripStatus\\)/g, "function formatTripStatus(status: TripStatus, t: any)");
content = content.replace(/function getNextStatusButtonLabel\\(status: TripStatus \\| null\\)/g, "function getNextStatusButtonLabel(status: TripStatus | null, t: any)");

content = content.replace(/const realtimeCopy = useMemo\\(\\(\\) => getRealtimeCopy\\(realtimeMode\\), \\[realtimeMode\\]\\);/g, "const realtimeCopy = useMemo(() => getRealtimeCopy(realtimeMode, t), [realtimeMode, t]);");
content = content.replace(/const listeningCopy = getListeningCopy\\(isOnline, incomingRequest\\);/g, "const listeningCopy = getListeningCopy(isOnline, incomingRequest, t);");

content = content.replace(/label="Home"/g, 'label={t("driver.navHome")}');
content = content.replace(/label="Earnings"/g, 'label={t("driver.navEarnings")}');
content = content.replace(/label="Activity"/g, 'label={t("driver.navActivity")}');
content = content.replace(/label="Account"/g, 'label={t("driver.navAccount")}');
content = content.replace(/participantName: incomingRequest\\.passenger\\?\\.fullName \\?\\? 'Hành khách'/g, "participantName: incomingRequest.passenger?.fullName ?? t('driver.defaultPassenger')");


// Replace the function bodies using standard string replace to avoid regex complexity
content = content.replace(
  'function getListeningCopy(\\n  isOnline: boolean,\\n  request: DriverTripRequest | null,\\n): { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string } {\\n  if (request) {\\n    return {\\n      icon: \\'bell-ring-outline\\',\\n      title: \\'Cuốc mới đang chờ\\',\\n      text: `${request.passenger?.fullName ?? \\'Khách hàng\\'} - ${formatFare(request.estimatedFare)} - phản hồi để giữ tỷ lệ nhận cuốc.`,\\n    };\\n  }\\n\\n  if (isOnline) {\\n    return {\\n      icon: \\'target\\',\\n      title: \\'Đang nghe cuốc mới\\',\\n      text: \\'Hệ thống đang tìm khách hàng gần nhất...\\',\\n    };\\n  }\\n\\n  return {\\n    icon: \\'power-sleep\\',\\n    title: \\'Tạm dừng nhận cuốc\\',\\n    text: \\'Bật online để mở kênh request, GPS và heartbeat.\\',\\n  };\\n}',
  'function getListeningCopy(\\n  isOnline: boolean,\\n  request: DriverTripRequest | null,\\n  t: any\\n): { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string } {\\n  if (request) {\\n    return {\\n      icon: \\'bell-ring-outline\\',\\n      title: t(\\'driver.newRequestWaitingTitle\\'),\\n      text: t(\\'driver.newRequestWaitingText\\', { name: request.passenger?.fullName ?? t(\\'driver.defaultPassenger\\'), fare: formatFare(request.estimatedFare) }),\\n    };\\n  }\\n  if (isOnline) {\\n    return {\\n      icon: \\'target\\',\\n      title: t(\\'driver.listeningTitle\\'),\\n      text: t(\\'driver.listeningText\\'),\\n    };\\n  }\\n  return {\\n    icon: \\'power-sleep\\',\\n    title: t(\\'driver.pausedTitle\\'),\\n    text: t(\\'driver.pausedText\\'),\\n  };\\n}'
);

content = content.replace(
  'function getRealtimeCopy(mode: DriverRealtimeMode): { label: string; tone: \\'green\\' | \\'blue\\' | \\'amber\\' | \\'muted\\' } {\\n  if (mode === \\'mock\\') {\\n    return { label: \\'Mock realtime\\', tone: \\'green\\' };\\n  }\\n\\n  if (mode === \\'remote\\') {\\n    return { label: \\'Remote WS\\', tone: \\'blue\\' };\\n  }\\n\\n  if (mode === \\'connecting\\') {\\n    return { label: \\'Đang nối\\', tone: \\'amber\\' };\\n  }\\n\\n  if (mode === \\'fallback\\') {\\n    return { label: \\'Fallback\\', tone: \\'amber\\' };\\n  }\\n\\n  return { label: \\'Đóng\\', tone: \\'muted\\' };\\n}',
  'function getRealtimeCopy(mode: DriverRealtimeMode, t: any): { label: string; tone: \\'green\\' | \\'blue\\' | \\'amber\\' | \\'muted\\' } {\\n  if (mode === \\'mock\\') return { label: t(\\'driver.modeMock\\'), tone: \\'green\\' };\\n  if (mode === \\'remote\\') return { label: t(\\'driver.modeRemote\\'), tone: \\'blue\\' };\\n  if (mode === \\'connecting\\') return { label: t(\\'driver.modeConnecting\\'), tone: \\'amber\\' };\\n  if (mode === \\'fallback\\') return { label: t(\\'driver.modeFallback\\'), tone: \\'amber\\' };\\n  return { label: t(\\'driver.modeClosed\\'), tone: \\'muted\\' };\\n}'
);

content = content.replace(
  'function getDriverStatusMessage(status: TripStatus, t: any) {\\n  if (status === \\'CANCELLED\\') {\\n    return \\'Chuyến xe đã bị hủy bởi hành khách.\\';\\n  }\\n\\n  if (status === \\'ARRIVED\\') {\\n    return \\'Bạn đã đến điểm đón. Hãy đón khách và bắt đầu chuyến khi sẵn sàng.\\';\\n  }\\n\\n  if (status === \\'IN_PROGRESS\\') {\\n    return \\'Chuyến đang diễn ra. Tiếp tục di chuyển đến điểm trả khách.\\';\\n  }\\n\\n  if (status === \\'COMPLETED\\') {\\n    return \\'Chuyến đã hoàn thành. Cảm ơn bạn đã chạy cùng GoRide.\\';\\n  }\\n\\n  return `Trạng thái chuyến: ${formatTripStatus(status, t)}.\\`;\\n}',
  'function getDriverStatusMessage(status: TripStatus, t: any) {\\n  if (status === \\'CANCELLED\\') return t(\\'driver.statusMsgCancelled\\');\\n  if (status === \\'ARRIVED\\') return t(\\'driver.statusMsgArrived\\');\\n  if (status === \\'IN_PROGRESS\\') return t(\\'driver.statusMsgInProgress\\');\\n  if (status === \\'COMPLETED\\') return t(\\'driver.statusMsgCompleted\\');\\n  return t(\\'driver.statusMsgDefault\\', { status: formatTripStatus(status, t) });\\n}'
);

content = content.replace(
  'function getDriverTrackingMessage(status: TripStatus, t: any) {\\n  if (isDriverTrackingStatus(status)) {\\n    return \\'GPS cuốc đang gửi vị trí cho hành khách.\\';\\n  }\\n\\n  if (status === \\'COMPLETED\\') {\\n    return \\'GPS cuốc đã dừng sau khi hoàn thành chuyến.\\';\\n  }\\n\\n  return \\'GPS cuốc sẽ bắt đầu gửi sau khi tài xế nhận chuyến.\\';\\n}',
  'function getDriverTrackingMessage(status: TripStatus, t: any) {\\n  if (isDriverTrackingStatus(status)) return t(\\'driver.trackingMsgActive\\');\\n  if (status === \\'COMPLETED\\') return t(\\'driver.trackingMsgStopped\\');\\n  return t(\\'driver.trackingMsgWait\\');\\n}'
);

content = content.replace(
  'function formatTripStatus(status: TripStatus, t: any) {\\n  if (status === \\'CANCELLED\\') {\\n    return \\'Đã hủy\\';\\n  }\\n\\n  if (status === \\'ACCEPTED\\') {\\n    return \\'Đã nhận\\';\\n  }\\n\\n  if (status === \\'ARRIVED\\') {\\n    return \\'Tài xế đã đến\\';\\n  }\\n\\n  if (status === \\'IN_PROGRESS\\') {\\n    return \\'Đang di chuyển\\';\\n  }\\n\\n  if (status === \\'COMPLETED\\') {\\n    return \\'Hoàn thành\\';\\n  }\\n\\n  if (status === \\'SEARCHING\\') {\\n    return \\'Đang tìm tài xế\\';\\n  }\\n\\n  return status;\\n}',
  'function formatTripStatus(status: TripStatus, t: any) {\\n  if (status === \\'CANCELLED\\') return t(\\'driver.tripStatusCancelled\\');\\n  if (status === \\'ACCEPTED\\') return t(\\'driver.tripStatusAccepted\\');\\n  if (status === \\'ARRIVED\\') return t(\\'driver.tripStatusArrived\\');\\n  if (status === \\'IN_PROGRESS\\') return t(\\'driver.tripStatusInProgress\\');\\n  if (status === \\'COMPLETED\\') return t(\\'driver.tripStatusCompleted\\');\\n  if (status === \\'SEARCHING\\') return t(\\'driver.tripStatusSearching\\');\\n  return status;\\n}'
);

content = content.replace(
  'function getNextStatusButtonLabel(status: TripStatus | null, t: any) {\\n  if (status === \\'ARRIVED\\') {\\n    return \\'Đã đến điểm đón\\';\\n  }\\n\\n  if (status === \\'IN_PROGRESS\\') {\\n    return \\'Bắt đầu chuyến\\';\\n  }\\n\\n  if (status === \\'COMPLETED\\') {\\n    return \\'Hoàn thành chuyến\\';\\n  }\\n\\n  return \\'Cập nhật chuyến\\';\\n}',
  'function getNextStatusButtonLabel(status: TripStatus | null, t: any) {\\n  if (status === \\'ARRIVED\\') return t(\\'driver.nextStatusArrived\\');\\n  if (status === \\'IN_PROGRESS\\') return t(\\'driver.nextStatusInProgress\\');\\n  if (status === \\'COMPLETED\\') return t(\\'driver.nextStatusCompleted\\');\\n  return t(\\'driver.nextStatusDefault\\');\\n}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete.');
