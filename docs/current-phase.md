# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 3 - Passenger pickup/destination
- Branch: codex/passenger-destination-map
- Current commit scope: Commit 2 - refactor destination screen to `MapPicker` and `AddressSearch`
- Status: In progress

## Last Completed Checkpoint

- Main merge: `23cec00` - Merge passenger pickup map flow
- Main push: `origin/main` is up to date with the pickup map flow and Expo-native dependency alignment.
- Review status: User reviewed and approved the pickup map flow before this branch.

## Next Checkpoint

- Commit 2: refactor `app/(customer)/booking/destination.tsx` with `MapPicker`, `AddressSearch`, pickup JSON decoding, destination reverse geocode, and route preview line.
- Keep legacy params (`pickupLat`, `pickupLng`, `pickupLabel`, `destLat`, `destLng`, `destLabel`) during migration so `select-vehicle.tsx` remains compatible until Phase 4.
- After each commit, run validation/review, update `docs/implementation-log.md`, then wait for user review before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` is refactored on `codex/passenger-pickup-destination` to use `MapPicker`, `AddressSearch`, GPS permission handling, and Expo-compatible `react-native-maps`.
- `app/(customer)/booking/destination.tsx` still uses `react-native-webview` and Leaflet HTML.
- `app/(customer)/booking/select-vehicle.tsx` still calculates distance locally and uses static vehicle prices.
- `app/(customer)/booking/waiting-driver.tsx` still uses a hardcoded timer/mock alert instead of realtime subscription.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` exists from commit `1d1e758`.
- `lib/realtime.ts` exists from commit `2cf377d`.
- `app.config.js` and cleaned Expo map/location config exist from commit `9b19b41`.
