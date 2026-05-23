# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Front-end mobile MVP foundation
- Phase: Phase 1 - Foundation
- Branch: codex/frontend-foundation
- Current commit scope: Commit 2 - API client, ride API wrapper, and mock API adapter
- Status: In progress

## Last Completed Checkpoint

- Commit: `c599d6e` - Add frontend foundation types and config
- Implementation log entry: `2026-05-23 - Phase 1 Foundation - Commit 1`
- Review status: User reviewed, approved to continue

## Next Checkpoint

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
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`; `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` are in the current commit scope; `lib/location-service.ts` and `lib/realtime.ts` are still pending.
