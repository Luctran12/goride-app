# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Front-end mobile MVP foundation
- Phase: Phase 1 - Foundation
- Branch: main
- Current commit scope: Not started
- Status: Ready to create the first feature branch from `main`

## Last Completed Checkpoint

- Commit: None for front-end implementation phases
- Implementation log entry: None
- Review status: Not started

## Next Checkpoint

- Create branch `codex/frontend-foundation` from `main`.
- Commit 1: add shared ride types and front-end config.
- Commit 2: add API client, ride API wrapper, and mock API adapter.
- Commit 3: add location service for GPS, reverse geocode, and address search fallback.
- Commit 4: add realtime service skeleton with mock fallback.
- Commit 5: update Expo map configuration if Google Maps env support is needed.
- After each commit, run review, update `docs/implementation-log.md`, then update this file before continuing.

## Phase Assessment From Main

- `app/(customer)/booking/pickup.tsx` still uses `react-native-webview` and Leaflet HTML.
- `app/(customer)/booking/destination.tsx` still uses `react-native-webview` and Leaflet HTML.
- `app/(customer)/booking/select-vehicle.tsx` still calculates distance locally and uses static vehicle prices.
- `app/(customer)/booking/waiting-driver.tsx` still uses a hardcoded timer/mock alert instead of realtime subscription.
- `app/(driver)/index.tsx` is still a static waiting screen without online toggle, request subscription, or GPS loop.
- No `types/ride.ts`, `lib/api.ts`, `lib/ride-api.ts`, `lib/location-service.ts`, or `lib/realtime.ts` files exist yet.
