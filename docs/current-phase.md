# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 3 - Passenger pickup/destination
- Branch: codex/passenger-destination-map
- Current commit scope: Commit 2 - refactor destination screen to `MapPicker` and `AddressSearch`
- Status: User reviewed and approved; ready to merge to main

## Last Completed Checkpoint

- Commit: `5a26736` - Refactor passenger destination screen
- Implementation log entry: `2026-05-24 - Phase 3 Passenger Pickup/Destination - Commit 2`
- Review status: User reviewed and approved; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`

## Next Checkpoint

- Commit this review checkpoint, then merge `codex/passenger-destination-map` into `main` locally.
- Next phase candidate after merge: Phase 4 - estimate and booking flow in `select-vehicle.tsx`.
- Start Phase 4 from `main` on a new branch after the merge checkpoint is complete.
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
