# Changes In Implementation

Use this document to record implementation decisions that differ from `docs/TDD.md`.

Each entry should include:

- Date
- Branch
- Feature
- TDD expectation
- Implemented behavior
- Reason for change
- Impact

## 2026-05-23 - Realtime Foundation Skeleton

- Date: 2026-05-23
- Branch: `codex/frontend-foundation`
- Feature: Phase 1 Foundation - realtime service
- TDD expectation: WebSocket realtime uses STOMP over SockJS with subscriptions for trip status, trip location, personal notifications, and driver requests.
- Implemented behavior: `lib/realtime.ts` provides the front-end realtime interface and mock event bus fallback, while remote mode is only a connection-state skeleton because `@stomp/stompjs` and `sockjs-client` are not installed yet.
- Reason for change: Keep Commit 4 small and reviewable without adding new network-installed dependencies in the same commit.
- Impact: Mock realtime can support upcoming UI integration, but real backend WebSocket integration remains pending until STOMP/SockJS dependencies and connection logic are added.

## 2026-05-24 - Select Vehicle Payment And Promotion UI

- Date: 2026-05-24
- Branch: `codex/passenger-estimate-booking`
- Feature: Phase 4 Estimate and booking - select vehicle payment/promotion UI
- TDD expectation: Mobile MVP and frontend plan keep `PaymentMethod` as `CASH`; online MoMo/VNPay payment is listed outside this implementation scope.
- Implemented behavior: `select-vehicle` now offers selectable payment methods `CASH`, `MOMO`, and `VNPAY`, plus a promotion selector. The selected payment method and promo code are passed forward as route params, while fare estimate remains unchanged until backend/payment integration supports discounts and online payment processing.
- Reason for change: User requested payment method selection and a promotion box during runtime review of the select vehicle screen.
- Impact: UI can demo payment/promo choice earlier than planned. Backend/API contract may need to accept `MOMO`/`VNPAY` and promo code later; current estimate amount is not discounted locally to avoid conflicting with backend pricing.

## 2026-05-27 - Realtime Remote Adapter

- Date: 2026-05-27
- Branch: `codex/realtime-stomp`
- Feature: Phase 8 - STOMP/SockJS realtime wiring
- TDD expectation: WebSocket realtime uses STOMP over SockJS with subscriptions for trip status, trip location, personal notifications, and driver requests.
- Implemented behavior: `lib/realtime.ts` now uses `@stomp/stompjs` plus `sockjs-client` for remote mode when `EXPO_PUBLIC_WS_URL` exists, while keeping the mock event bus fallback when the env var is missing.
- Reason for change: This resolves the earlier Phase 1 realtime skeleton limitation while preserving backend-free demo mode for local UI review.
- Impact: Passenger and driver screens can now connect to the planned backend STOMP destinations. Real backend smoke testing is still required to confirm payload naming and auth expectations.

## 2026-06-01 - Passenger History Detail And Rebook UI

- Date: 2026-06-01
- Branch: `codex/passenger-trip-history`
- Feature: Phase 9 - Passenger activity/history
- TDD expectation: Trip history is part of Passenger App scope and ratings are modeled by the separate `ratings` table/API.
- Implemented behavior: Passenger Activity keeps the history list compact, opens an in-screen detail modal, and reads optional `passengerRating` data from `TripDetail`/mock history so the UI can show the rating the passenger already submitted.
- Reason for change: User requested compact history cards, richer detail on tap, rating display, and a `Dat lai` action from history.
- Impact: Front-end demo can show rating and rebook behavior before a dedicated rating lookup endpoint is wired. Backend may later replace embedded `passengerRating` with a separate trip-rating API response without changing the visible UI.

## 2026-06-01 - Local Backend Origin Update

- Date: 2026-06-01
- Branch: `codex/passenger-trip-history`
- Feature: Local API configuration
- TDD expectation: Backend base URL is environment/config driven.
- Implemented behavior: Default development backend origin changed from `http://192.168.1.8:8080` to `http://10.255.253.75:8080` in `lib/config.ts` while keeping env override behavior intact.
- Reason for change: User requested keeping their local URL update for runtime testing.
- Impact: Local/dev fallback points to the user's current backend host. Production or shared environments should still prefer `EXPO_PUBLIC_API_BASE_URL`.

## 2026-06-11 - Payment Methods And Voucher Front-end Adapter

- Date: 2026-06-11
- Branch: `codex/payment-vouchers`
- Feature: Stage 13 - Productize payment and vouchers
- TDD expectation: Payment module MVP records trip payments and supports `CASH`, with MoMo/VNPay designed as future providers. The current TDD/API docs do not define passenger payment-method inventory or voucher endpoints.
- Implemented behavior: Added front-end types and API adapters for `/payment-methods`, `/vouchers`, and `/vouchers/validate`, with mock fallback data and coming-soon status for MoMo/VNPay.
- Reason for change: Stage 13 needs Billing and booking promo screens to consume a real data source instead of hardcoded arrays while backend voucher/payment-method contracts are not yet present.
- Impact: Front-end can productize Billing and promo selection now. Backend later needs to expose matching endpoints or the adapter paths/DTOs must be adjusted.

## 2026-06-11 - Booking Voucher Payload Extension

- Date: 2026-06-11
- Branch: `codex/payment-vouchers`
- Feature: Stage 13 - Productize payment and vouchers
- TDD expectation: `POST /bookings` sends pickup, dropoff, vehicle type, payment method, pricing config, and estimated fare. The TDD does not define voucher fields in the booking payload.
- Implemented behavior: `BookingDraft` and `createBooking()` now support optional `voucherCode`, `discountAmount`, and `finalFare` fields after the booking screen validates a voucher.
- Reason for change: The passenger booking screen needs the selected voucher and discounted fare to survive the transition from promo validation to booking creation instead of being only visual state.
- Impact: Mock mode can demo discounted booking totals immediately. Backend integration must either accept these optional fields or return a contract mismatch that will be addressed during Stage 15 smoke testing.
