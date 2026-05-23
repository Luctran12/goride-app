# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Shared booking map/location UI components
- Phase: Phase 2 - Shared booking components
- Branch: codex/map-location-components
- Current commit scope: Commit 3 - reusable `RoutePreview` component
- Status: In progress

## Last Completed Checkpoint

- Commit: `8946b50` - Add reusable address search component
- Implementation log entry: `2026-05-23 - Phase 2 Shared Booking Components - Commit 2`
- Review status: User reviewed, approved to continue; CodeRabbit CLI review blocked by missing WSL/bash environment

## Next Checkpoint

- Commit 3: create reusable `RoutePreview` for pickup/dropoff summary, distance, duration, and fare display.
- Later Phase 2 commit: `VehicleOptionCard`.
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
