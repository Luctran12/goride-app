# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 4 - Estimate and booking
- Branch: codex/passenger-estimate-booking
- Current commit scope: Next commit - create booking and pass trip data to waiting driver
- Status: Ready for next commit after user approval

## Last Completed Checkpoint

- Commit: `2a332fc` - Make pickup and destination CTAs sticky
- Implementation log entry: `2026-05-24 - Phase 4 Estimate and Booking - Review Change 4`
- Review status: User approved runtime review on 2026-05-24; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`

## Next Checkpoint

- Commit 2 can wire `createBooking()` and pass `tripId`/estimate data into `waiting-driver`.
- Keep payment/promo params compatible with the upcoming booking request and waiting screen handoff.
- Preserve the approved sticky pickup/destination CTA behavior while editing booking flow.
- After each commit, run validation/review, update `docs/implementation-log.md`, then wait for user review before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` is refactored on `codex/passenger-pickup-destination` to use `MapPicker`, `AddressSearch`, GPS permission handling, and Expo-compatible `react-native-maps`.
- `app/(customer)/booking/destination.tsx` is refactored on `codex/passenger-destination-map` to use `MapPicker`, `AddressSearch`, pickup JSON decoding, destination reverse geocode, and route polyline.
- `app/(customer)/booking/select-vehicle.tsx` is refactored on `codex/passenger-estimate-booking` to parse JSON route params, call `estimateBooking()`, and use stable estimate effect dependencies.
- `app/(customer)/booking/waiting-driver.tsx` still uses a hardcoded timer/mock alert instead of realtime subscription.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` exists from commit `1d1e758`.
- `lib/realtime.ts` exists from commit `2cf377d`.
- `app.config.js` and cleaned Expo map/location config exist from commit `9b19b41`.
