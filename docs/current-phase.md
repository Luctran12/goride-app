# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger pickup/destination screens
- Phase: Phase 3 - Passenger pickup/destination
- Branch: codex/passenger-pickup-destination
- Current commit scope: Review fix - align Expo native dependency versions for map runtime
- Status: User reviewed and approved; merging to main

## Last Completed Checkpoint

- Commit: `71f4688` - Align Expo native dependency versions
- Implementation log entry: `2026-05-24 - Phase 3 Passenger Pickup/Destination - Review Fix 1`
- Review status: User reviewed and approved; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`

## Next Checkpoint

- Commit this review checkpoint, merge `codex/passenger-pickup-destination` into `main`, then push `main` to GitHub.
- After merge/push, next Phase 3 commit can refactor `app/(customer)/booking/destination.tsx` with `MapPicker`, `AddressSearch`, pickup JSON decoding, and route preview line.
- Do not start the destination refactor until the merge/push checkpoint is complete.
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
