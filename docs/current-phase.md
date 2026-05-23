# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 3 - Passenger pickup/destination
- Branch: codex/passenger-pickup-destination
- Current commit scope: Commit 1 - refactor pickup screen to `MapPicker` and `AddressSearch`
- Status: In progress

## Last Completed Checkpoint

- Phase 2 branch `codex/map-location-components` was user reviewed and merged into local `main`.
- Commit: `f8fc50b` - Record phase 2 review checkpoint
- Merge: `main` contains the reusable booking components needed for Phase 3.

## Next Checkpoint

- Commit 1: replace `app/(customer)/booking/pickup.tsx` WebView/Leaflet flow with `MapPicker`, `AddressSearch`, GPS permission handling, reverse geocode, and legacy + JSON route params.
- Later commit: refactor `app/(customer)/booking/destination.tsx` with the same components and pickup decoding.
- After each commit, run validation/review, update `docs/implementation-log.md`, then wait for user review before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` still uses `react-native-webview` and Leaflet HTML.
- `app/(customer)/booking/destination.tsx` still uses `react-native-webview` and Leaflet HTML.
- `app/(customer)/booking/select-vehicle.tsx` still calculates distance locally and uses static vehicle prices.
- `app/(customer)/booking/waiting-driver.tsx` still uses a hardcoded timer/mock alert instead of realtime subscription.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` exists from commit `1d1e758`.
- `lib/realtime.ts` exists from commit `2cf377d`.
- `app.config.js` and cleaned Expo map/location config exist from commit `9b19b41`.
