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
