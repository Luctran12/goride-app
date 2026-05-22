# Frontend Implementation Plan - GoRide Mobile

## 1. Mục tiêu triển khai

Triển khai mobile front-end MVP cho GoRide dựa trên `docs/TDD.md`, tập trung vào hai vai trò chính:

- Passenger đặt xe: bật GPS, nhận diện địa chỉ hiện tại, chọn điểm đến, chọn loại xe, tạo booking, theo dõi trạng thái tìm tài xế.
- Driver nhận cuốc: bật/tắt online, nhận yêu cầu chuyến, chấp nhận/từ chối, cập nhật trạng thái chuyến, gửi vị trí GPS định kỳ.
- Map thật: thay WebView/Leaflet bằng `react-native-maps`, dùng `expo-location` cho quyền vị trí, current location và reverse geocoding.
- API-ready: code front-end gọi đúng REST/WebSocket contract trong TDD, đồng thời có mock adapter để app demo được khi backend chưa chạy.

Ngoài scope của plan này:

- Web Admin React/Vite.
- Payment online MoMo/VNPay.
- Chat trong chuyến, scheduled ride, surge pricing nâng cao.
- Auth đầy đủ với register/login UI mới. Luồng chọn role demo hiện tại vẫn được giữ, API client chỉ chuẩn bị sẵn bearer token để nối backend sau.

## 2. Trạng thái hiện tại của repo

Repo đang là Expo Router app với route chính:

- `app/index.tsx`: màn chọn vai trò Passenger/Driver.
- `app/(customer)/index.tsx`: home của passenger.
- `app/(customer)/booking/pickup.tsx`: chọn điểm đón, hiện đang dùng WebView + Leaflet.
- `app/(customer)/booking/destination.tsx`: chọn điểm đến, hiện đang dùng WebView + Leaflet.
- `app/(customer)/booking/select-vehicle.tsx`: chọn xe, hiện đang tính khoảng cách/giá mock ở client.
- `app/(customer)/booking/waiting-driver.tsx`: chờ tài xế, hiện đang mock timer 5 giây.
- `app/(driver)/index.tsx`: màn driver tĩnh, chưa có online status, request, GPS loop.

Dependency đã có sẵn:

- `expo-location`
- `react-native-maps`
- `react-native-webview`

Dependency cần thêm khi triển khai realtime STOMP:

- `@stomp/stompjs`
- `sockjs-client`
- `@types/sockjs-client` nếu TypeScript cần type cho package này.

## 3. Kiến trúc front-end đề xuất

### 3.1 Shared types

Tạo `types/ride.ts` để chuẩn hóa các type dùng chung:

- `Coordinates`: `{ lat: number; lng: number }`
- `LocationPoint`: `{ lat: number; lng: number; address: string; placeId?: string; label?: string }`
- `VehicleType`: `'MOTORBIKE' | 'CAR_4_SEAT' | 'CAR_7_SEAT'`
- `PaymentMethod`: `'CASH'`
- `TripStatus`: `'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_DRIVER'`
- `BookingEstimate`: `{ estimatedDistance: number; estimatedDuration: number; estimatedFare: number; pricingConfigId: number }`
- `BookingDraft`: `{ pickup: LocationPoint; dropoff: LocationPoint; vehicleType: VehicleType; paymentMethod: PaymentMethod }`
- `TripDetail`: shape theo `GET /bookings/{tripId}` trong TDD.
- `DriverTripRequest`: payload từ `/topic/driver/{driverId}/request`.
- `WsNotification`: payload từ `/user/queue/notifications`.

### 3.2 Config

Tạo `lib/config.ts`:

- `API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL`
- `WS_URL = process.env.EXPO_PUBLIC_WS_URL`
- `GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `USE_MOCK_API = !API_BASE_URL`

Google Maps native config:

- Chuyển `app.json` sang `app.config.ts` hoặc `app.config.js` để đọc env.
- Android: cấu hình `android.config.googleMaps.apiKey`.
- iOS: cấu hình `ios.config.googleMapsApiKey`.
- Giữ permission location hiện có, loại bỏ duplicate Android permission nếu có.

### 3.3 API layer

Tạo `lib/api.ts`:

- Hàm `apiRequest<T>(path, options)` tự gắn `Content-Type: application/json`.
- Tự gắn `Authorization: Bearer <token>` nếu token tồn tại.
- Nếu `API_BASE_URL` chưa có, chuyển sang mock implementation thay vì crash.
- Chuẩn hóa error thành `{ message, status?, code? }` để UI hiển thị được.

Tạo `lib/ride-api.ts`:

- `getPricing()`
- `estimateBooking(draft)`
- `createBooking(draft, estimate)`
- `getTrip(tripId)`
- `getDriverLocation(tripId)`
- `setDriverOnline(isOnline)`
- `respondToTrip(tripId, action)`
- `updateTripStatus(tripId, status)`

Tạo `lib/mock-ride-api.ts`:

- Trả response cùng shape với TDD.
- Mock `tripId`, fare, distance, driver request và trip status đủ để demo offline.

### 3.4 Location service

Tạo `lib/location-service.ts`:

- `requestLocationPermission()`
- `getCurrentLocationPoint()`
- `reverseGeocode(coords)`
- `searchPlaces(query)`
- `getPlaceDetails(placeId)`

Quy tắc provider:

- Current location và reverse geocode ưu tiên `expo-location`.
- Destination search ưu tiên Google Places Autocomplete + Place Details nếu có `GOOGLE_MAPS_API_KEY`.
- Nếu thiếu Google key, fallback sang `Location.geocodeAsync(query)` và hiển thị thông báo cấu hình map search đang chạy ở chế độ giới hạn.

### 3.5 Realtime service

Tạo `lib/realtime.ts`:

- Bọc STOMP/SockJS connect/disconnect.
- `subscribeTrip(tripId, handlers)` subscribe status/location.
- `subscribeNotifications(handler)`.
- `subscribeDriverRequests(driverId, handler)`.
- `sendDriverLocation(payload)`.
- `sendDriverHeartbeat(driverId)`.
- `sendTripStatus(tripId, status)`.
- Tự reconnect với backoff cơ bản.
- Nếu thiếu `WS_URL`, chạy mock event bus local để waiting-driver và driver vẫn demo được.

## 4. Component dùng chung

### 4.1 `components/booking/MapPicker.tsx`

Trách nhiệm:

- Render `MapView` từ `react-native-maps`.
- Hiển thị marker draggable cho vị trí đang chọn.
- Nhận tap trên map để cập nhật marker.
- Nút GPS để lấy lại vị trí hiện tại.
- Hiển thị route line bằng `Polyline` khi có pickup + dropoff.
- Expose callback `onLocationChange(point)`.

Props quyết định:

- `mode`: `'pickup' | 'destination' | 'tracking'`
- `value`: `LocationPoint | null`
- `origin`: `LocationPoint | null`
- `destination`: `LocationPoint | null`
- `driverLocation`: `Coordinates | null`
- `onLocationChange(point)`
- `onRequestCurrentLocation()`
- `loading`
- `error`

UI state cần xử lý:

- `permission-needed`: hướng dẫn bật quyền vị trí.
- `gps-disabled`: báo không lấy được GPS và cho chọn thủ công trên map.
- `locating`: loading overlay.
- `ready`: map tương tác bình thường.
- `error`: hiển thị message và nút thử lại.

### 4.2 `components/booking/AddressSearch.tsx`

Trách nhiệm:

- Input tìm địa chỉ.
- Debounce query 350ms.
- Hiển thị loading, empty state, error state.
- Chọn result trả về `LocationPoint`.
- Dùng cho cả pickup và destination.

Props quyết định:

- `placeholder`
- `value`
- `onChangeText`
- `onSelect(point)`
- `searchBias?: Coordinates`

### 4.3 `components/booking/RoutePreview.tsx`

Trách nhiệm:

- Hiển thị điểm đón, điểm đến, khoảng cách, thời gian, giá ước tính.
- Dùng ở `select-vehicle` và `waiting-driver`.
- Không tự gọi API, chỉ nhận data từ screen.

### 4.4 `components/booking/VehicleOptionCard.tsx`

Trách nhiệm:

- Render từng loại xe.
- Map UI vehicle hiện tại sang enum backend:
- GoRide Bike -> `MOTORBIKE`
- GoRide Car -> `CAR_4_SEAT`
- GoRide Premium hoặc Car 7 -> `CAR_7_SEAT`

## 5. Passenger flow chi tiết

### 5.1 Pickup screen

File chính: `app/(customer)/booking/pickup.tsx`

Hành vi:

- Khi vào màn, gọi `requestLocationPermission()`.
- Nếu được cấp quyền, gọi `getCurrentLocationPoint()` và set làm pickup.
- Nếu bị từ chối, vẫn hiển thị map default ở TP.HCM để user chọn thủ công.
- User có thể bấm nút GPS để thử lấy lại vị trí.
- User có thể search địa chỉ hoặc tap/drag marker trên map.
- Mỗi lần marker đổi, reverse geocode để cập nhật address.
- Nút tiếp tục chỉ enable khi có `pickup.address` và tọa độ hợp lệ.
- Khi tiếp tục, truyền pickup qua params sang destination dưới dạng JSON string encode.

Acceptance criteria:

- Mở màn thấy permission prompt hoặc map.
- Cấp quyền xong marker nhảy về vị trí user.
- Từ chối quyền vẫn chọn thủ công được.
- Địa chỉ hiện tại hiển thị từ reverse geocode nếu provider trả kết quả.

### 5.2 Destination screen

File chính: `app/(customer)/booking/destination.tsx`

Hành vi:

- Nhận `pickup` từ params.
- Hiển thị map với pickup marker và destination marker.
- Destination mặc định là null, user phải search hoặc chọn trên map.
- Search dùng Google Places nếu có key, fallback geocode nếu không có key.
- Khi chọn destination, vẽ `Polyline` pickup -> destination.
- Nút xác nhận chỉ enable khi có destination hợp lệ.
- Khi xác nhận, truyền `pickup` và `dropoff` sang `select-vehicle`.

Acceptance criteria:

- User chọn được điểm đến từ search.
- User chọn được điểm đến bằng tap map.
- Route line xuất hiện sau khi có pickup + dropoff.
- Không có API key thì app không crash và có fallback/basic warning.

### 5.3 Select vehicle screen

File chính: `app/(customer)/booking/select-vehicle.tsx`

Hành vi:

- Nhận `pickup` và `dropoff`.
- Gọi `getPricing()` để lấy cấu hình giá public nếu backend có.
- Mỗi khi chọn vehicle type, gọi `estimateBooking(draft)`.
- Nếu backend chưa có, mock estimate tính bằng Haversine + bảng giá mock.
- Hiển thị distance, duration, fare theo response estimate.
- Nút đặt xe gọi `createBooking(draft, estimate)`.
- Sau khi tạo trip, chuyển sang `waiting-driver` với `tripId`, route và estimate.

Acceptance criteria:

- Chọn xe đổi fare tương ứng.
- Loading estimate không khóa toàn màn, chỉ disable nút đặt trong lúc tính.
- Booking thành công chuyển sang waiting-driver.
- Booking lỗi hiển thị alert/message và cho thử lại.

### 5.4 Waiting driver screen

File chính: `app/(customer)/booking/waiting-driver.tsx`

Hành vi:

- Nhận `tripId`.
- Subscribe:
- `/topic/trip/{tripId}/status`
- `/topic/trip/{tripId}/location`
- `/user/queue/notifications`
- Hiển thị state `SEARCHING`, `ACCEPTED`, `ARRIVED`, `IN_PROGRESS`, `NO_DRIVER`, `CANCELLED`.
- Nếu nhận driver location, cập nhật marker tài xế trên map.
- Nếu WebSocket mất kết nối, gọi fallback `getDriverLocation(tripId)` mỗi 5 giây.
- Nút hủy chuyến giữ UI hiện tại, nếu backend chưa có cancel endpoint thì chỉ quay về home với cảnh báo mock.

Acceptance criteria:

- SEARCHING hiển thị radar/loading.
- ACCEPTED hiển thị thông tin tài xế nếu payload có.
- Location update làm marker tài xế di chuyển.
- NO_DRIVER/CANCELLED hiển thị CTA quay lại đặt chuyến mới.

## 6. Driver flow chi tiết

### 6.1 Driver home

File chính: `app/(driver)/index.tsx`

Hành vi:

- Hiển thị toggle online/offline.
- Khi bật online, gọi `setDriverOnline(true)`.
- Sau khi online, subscribe:
- `/topic/driver/{driverId}/request`
- `/user/queue/notifications`
- Gửi heartbeat `/app/driver.heartbeat` mỗi 15 giây.
- Lấy GPS hiện tại khi online và cập nhật map/status card.
- Khi có request, hiển thị card incoming trip với passenger, pickup, dropoff, fare, timer 30 giây.
- Accept gọi `respondToTrip(tripId, 'ACCEPT')`.
- Reject gọi `respondToTrip(tripId, 'REJECT')`.

Acceptance criteria:

- Toggle online đổi UI và gọi API/mock.
- Có incoming trip thì hiện card accept/reject.
- Reject đóng card và tiếp tục chờ.
- Accept chuyển sang active trip state.

### 6.2 Active trip state

Vẫn trong `app/(driver)/index.tsx` cho MVP, chưa cần route riêng.

Hành vi:

- Sau accept, hiển thị route pickup/dropoff.
- Gửi `/app/driver.location` mỗi 3-5 giây khi trip active.
- CTA trạng thái:
- `ACCEPTED` -> `ARRIVED`
- `ARRIVED` -> `IN_PROGRESS`
- `IN_PROGRESS` -> `COMPLETED`
- Mỗi CTA gọi `updateTripStatus()` và gửi `/app/trip.status`.
- Khi completed, dừng GPS loop, reset về online waiting.

Acceptance criteria:

- Driver có thể đi hết vòng đời trip.
- GPS loop dừng khi offline hoặc completed.
- App không tạo nhiều interval trùng nhau khi toggle online nhiều lần.

## 7. API contract front-end sẽ dùng

### 7.1 Booking estimate

Request:

```json
{
  "pickup": { "lat": 10.7769, "lng": 106.7009, "address": "123 Le Loi, Q1" },
  "dropoff": { "lat": 10.785, "lng": 106.68, "address": "456 CMT8, Q3" },
  "vehicleType": "CAR_4_SEAT"
}
```

Response:

```json
{
  "estimatedDistance": 4.2,
  "estimatedDuration": 18,
  "estimatedFare": 49600,
  "pricingConfigId": 1
}
```

### 7.2 Create booking

Request:

```json
{
  "pickup": { "lat": 10.7769, "lng": 106.7009, "address": "123 Le Loi, Q1" },
  "dropoff": { "lat": 10.785, "lng": 106.68, "address": "456 CMT8, Q3" },
  "vehicleType": "CAR_4_SEAT",
  "paymentMethod": "CASH",
  "pricingConfigId": 1,
  "estimatedFare": 49600
}
```

Response:

```json
{
  "tripId": 101,
  "status": "SEARCHING",
  "estimatedFare": 49600,
  "estimatedDistance": 4.2
}
```

### 7.3 Driver request payload

```json
{
  "tripId": 101,
  "passenger": { "id": 1, "fullName": "Nguyen Van A", "phone": "090..." },
  "pickup": { "lat": 10.7769, "lng": 106.7009, "address": "123 Le Loi, Q1" },
  "dropoff": { "lat": 10.785, "lng": 106.68, "address": "456 CMT8, Q3" },
  "estimatedFare": 49600
}
```

### 7.4 Driver location payload

```json
{
  "tripId": 101,
  "lat": 10.78,
  "lng": 106.69,
  "bearing": 120,
  "speed": 8.5
}
```

## 8. Edge cases bắt buộc xử lý

- User từ chối quyền location: vẫn cho chọn điểm trên map thủ công.
- GPS lấy vị trí quá lâu: timeout UI sau khoảng 10 giây và cho retry.
- Reverse geocode thất bại: dùng fallback `lat,lng` làm address tạm.
- Google Maps key thiếu: hiển thị map native nếu có thể, search chuyển sang fallback hoặc disabled message.
- Backend chưa chạy: mock adapter trả response demo cùng shape.
- Network lỗi khi estimate/booking: giữ draft trên màn, không mất lựa chọn của user.
- WebSocket mất kết nối: waiting-driver dùng REST fallback, driver tiếp tục hiển thị offline/reconnecting state.
- Driver offline khi đang active trip: dừng heartbeat và GPS interval.

## 9. Thứ tự triển khai

### Phase 1 - Foundation

- Tạo `types/ride.ts`.
- Tạo `lib/config.ts`.
- Tạo `lib/api.ts`, `lib/ride-api.ts`, `lib/mock-ride-api.ts`.
- Tạo `lib/location-service.ts`.
- Tạo `lib/realtime.ts` với mock fallback.
- Cập nhật `app.config.ts` hoặc `app.config.js` cho Google Maps env.

Done khi:

- TypeScript import được các module mới.
- App chưa đổi UI nhưng lint vẫn pass.
- Thiếu env không làm app crash.

### Phase 2 - Shared booking components

- Tạo `components/booking/MapPicker.tsx`.
- Tạo `components/booking/AddressSearch.tsx`.
- Tạo `components/booking/RoutePreview.tsx`.
- Tạo `components/booking/VehicleOptionCard.tsx`.

Done khi:

- Component dùng `react-native-maps`, không dùng WebView/Leaflet.
- Map có marker, GPS button, loading/error overlay.
- Components không tự phụ thuộc Expo Router để tái dùng được.

### Phase 3 - Passenger pickup/destination

- Refactor `pickup.tsx` dùng `MapPicker` + `AddressSearch`.
- Refactor `destination.tsx` dùng chung component và nhận pickup từ params.
- Encode/decode `LocationPoint` qua params bằng JSON string.
- Xóa logic Leaflet HTML/WebView khỏi hai màn booking này.

Done khi:

- User chọn được pickup bằng GPS/search/map.
- User chọn được destination bằng search/map.
- Route line xuất hiện sau khi có đủ hai điểm.

### Phase 4 - Estimate and booking

- Refactor `select-vehicle.tsx` để gọi `estimateBooking`.
- Chuẩn hóa vehicle enum theo backend.
- Hiển thị estimate loading/error/retry.
- Gọi `createBooking` khi user đặt xe.
- Truyền `tripId`, route, estimate sang waiting-driver.

Done khi:

- Fare/distance/duration đến từ API hoặc mock adapter.
- Booking success vào waiting-driver.
- Booking failure không làm mất route user đã chọn.

### Phase 5 - Passenger realtime tracking

- Refactor `waiting-driver.tsx`.
- Subscribe trip status/location/notification.
- Thêm map tracking với pickup/dropoff/driver marker.
- Thêm fallback polling driver location khi WebSocket disconnect.
- Dừng subscription/polling khi unmount.

Done khi:

- Mock realtime tự chuyển trạng thái demo được.
- Backend realtime thật có thể nối qua `EXPO_PUBLIC_WS_URL`.
- Không còn timer alert 5 giây hardcoded.

### Phase 6 - Driver workflow

- Refactor `app/(driver)/index.tsx`.
- Thêm online/offline toggle.
- Xin location permission khi bật online.
- Subscribe incoming request và notification.
- Gửi heartbeat khi online.
- Hiển thị incoming request card với accept/reject.
- Sau accept, chạy active trip state và gửi GPS interval.
- Cho driver cập nhật `ARRIVED`, `IN_PROGRESS`, `COMPLETED`.

Done khi:

- Driver có đủ flow online -> nhận cuốc -> accept/reject -> active trip -> completed.
- GPS/heartbeat interval cleanup đúng khi offline/unmount.
- Mock mode demo được nếu chưa có backend.

### Phase 7 - Validation and polish

- Chạy `cmd /c npm run lint`.
- Rà lại route params và TypeScript strict errors.
- Manual test passenger happy path.
- Manual test passenger permission denied.
- Manual test driver online/accept/reject/status.
- Kiểm tra Android emulator hoặc thiết bị thật nếu có.

Done khi:

- Lint pass.
- Không còn import WebView trong `pickup.tsx` và `destination.tsx`.
- App chạy được ở mock mode không cần backend.

## 10. Acceptance checklist cuối cùng

- Passenger bật GPS và thấy vị trí hiện tại trên map thật.
- Passenger thấy địa chỉ hiện tại từ reverse geocoding hoặc fallback tọa độ.
- Passenger tìm/chọn điểm đến và thấy tuyến pickup -> destination.
- Passenger chọn loại xe và thấy giá ước tính.
- Passenger tạo booking và vào màn chờ tài xế.
- Waiting screen nhận trạng thái chuyến và vị trí tài xế qua realtime hoặc mock.
- Driver bật online và nhận incoming trip.
- Driver accept/reject được cuốc.
- Driver gửi GPS và cập nhật trạng thái chuyến.
- App không crash khi thiếu backend, thiếu WebSocket URL hoặc thiếu Google key.
- `cmd /c npm run lint` pass.

