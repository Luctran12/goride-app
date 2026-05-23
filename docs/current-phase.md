# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Front-end mobile MVP foundation
- Phase: Phase 1 - Foundation
- Branch: codex/frontend-foundation
- Current commit scope: Commit 3 - location service for GPS, reverse geocode, and address search fallback
- Status: In progress

## Last Completed Checkpoint

- Commit: `efdaf73` - Add ride API client with mock adapter
- Implementation log entry: `2026-05-23 - Phase 1 Foundation - Commit 2`
- Review status: User reviewed, approved to continue

## Next Checkpoint

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
- `types/ride.ts` and `lib/config.ts` exist from commit `c599d6e`.
- `lib/api.ts`, `lib/ride-api.ts`, and `lib/mock-ride-api.ts` exist from commit `efdaf73`.
- `lib/location-service.ts` and `lib/realtime.ts` are still pending.
