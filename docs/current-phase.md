# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 4 - Estimate and booking
- Branch: codex/passenger-estimate-booking
- Current commit scope: Commit 1 - refactor `select-vehicle` to parse JSON route params and call `estimateBooking`
- Status: In progress

## Last Completed Checkpoint

- Local main merge: `92f5cd2` - Merge passenger destination map flow
- Review status: User reviewed and approved the Phase 3 destination map flow before this branch.
- `main` is ahead of `origin/main` locally with the reviewed destination merge; push was not requested at this checkpoint.

## Next Checkpoint

- Commit 1: refactor `app/(customer)/booking/select-vehicle.tsx` to consume `pickup`/`dropoff`, use `RoutePreview` + `VehicleOptionCard`, and call `estimateBooking()` for selected vehicle.
- Keep actual `createBooking()` for a later small commit unless the estimate refactor remains very small.
- After each commit, run validation/review, update `docs/implementation-log.md`, then wait for user review before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` is refactored on `codex/passenger-pickup-destination` to use `MapPicker`, `AddressSearch`, GPS permission handling, and Expo-compatible `react-native-maps`.
- `app/(customer)/booking/destination.tsx` is refactored on `codex/passenger-destination-map` to use `MapPicker`, `AddressSearch`, pickup JSON decoding, destination reverse geocode, and route polyline.
- `app/(customer)/booking/select-vehicle.tsx` still calculates distance locally and uses static vehicle prices.
- `app/(customer)/booking/waiting-driver.tsx` still uses a hardcoded timer/mock alert instead of realtime subscription.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` exists from commit `1d1e758`.
- `lib/realtime.ts` exists from commit `2cf377d`.
- `app.config.js` and cleaned Expo map/location config exist from commit `9b19b41`.
