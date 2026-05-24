# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger realtime tracking
- Phase: Phase 5 - Passenger realtime tracking
- Branch: codex/passenger-realtime-tracking
- Current commit scope: Commit 1 - wire waiting-driver trip realtime subscription and REST fallback
- Status: In progress

## Last Completed Checkpoint

- Commit: `63483e0` - Create booking before waiting driver
- Implementation log entry: `2026-05-24 - Phase 4 Estimate and Booking - Commit 2`
- Review status: User approved runtime review on 2026-05-24; Phase 5 branch is stacked from `codex/passenger-estimate-booking` because `main` does not yet contain the approved Phase 4 commits

## Next Checkpoint

- Subscribe `waiting-driver` to trip status/location updates through `lib/realtime.ts` mock/remote interface.
- Add REST fallback polling with `getDriverLocation(tripId)` while realtime is disconnected or unavailable.
- Keep existing trip ID, route, estimate, payment, and promo summary visible.
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
