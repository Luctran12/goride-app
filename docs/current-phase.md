# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Driver trip flow
- Phase: Phase 6 - Driver realtime flow
- Branch: codex/driver-flow
- Current commit scope: Commit 1 - driver online shell with realtime request listener
- Status: In progress

## Last Completed Checkpoint

- Commit: `f52bac1` - Merge passenger realtime tracking phase into `main`
- Implementation log entry: `2026-05-26 - Phase 5 Passenger Realtime Tracking - Merge`
- Review status: Phase 5 passenger commits approved by user and pushed to GitHub `main` on 2026-05-26

## Next Checkpoint

- Replace the static driver waiting screen with online/offline state, location permission handling, heartbeat, and incoming request subscription.
- Keep accept/reject and active trip status updates for follow-up commits.
- After each commit, run validation/review, update `docs/implementation-log.md`, then wait for user review before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` is refactored on `codex/passenger-pickup-destination` to use `MapPicker`, `AddressSearch`, GPS permission handling, and Expo-compatible `react-native-maps`.
- `app/(customer)/booking/destination.tsx` is refactored on `codex/passenger-destination-map` to use `MapPicker`, `AddressSearch`, pickup JSON decoding, destination reverse geocode, and route polyline.
- `app/(customer)/booking/select-vehicle.tsx` is refactored on `codex/passenger-estimate-booking` to parse JSON route params, call `estimateBooking()`, and use stable estimate effect dependencies.
- `app/(customer)/booking/waiting-driver.tsx` is now wired to shared realtime trip subscription, driver marker rendering, REST fallback polling, and trip detail hydration on `codex/passenger-realtime-tracking`.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` exists from commit `1d1e758`.
- `lib/realtime.ts` exists from commit `2cf377d`.
- `app.config.js` and cleaned Expo map/location config exist from commit `9b19b41`.
