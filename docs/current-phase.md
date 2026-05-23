# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Front-end mobile MVP foundation
- Phase: Phase 1 - Foundation
- Branch: codex/frontend-foundation
- Current commit scope: Commit 5 - Expo map configuration if Google Maps env support is needed
- Status: User reviewed; ready to merge into `main`

## Last Completed Checkpoint

- Commit: `9b19b41` - Add Expo Google Maps env config
- Implementation log entry: `2026-05-23 - Phase 1 Foundation - Commit 5`
- Review status: User reviewed and approved; CodeRabbit CLI review blocked by missing WSL/bash environment

## Next Checkpoint

- Phase 1 Foundation is complete.
- Next phase candidate: Phase 2 - shared map/location UI components (`MapPicker`, `AddressSearch`, `RoutePreview`) on a new branch from `main` after the foundation branch is approved/merged.
- Do not start Phase 2 until user review is complete and branch strategy is confirmed.

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
