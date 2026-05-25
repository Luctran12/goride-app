# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger realtime tracking
- Phase: Phase 5 - Passenger realtime tracking
- Branch: codex/passenger-realtime-tracking
- Current commit scope: Next commit - ETA polish or realtime adapter hardening
- Status: Ready for next commit after user approval

## Last Completed Checkpoint

- Commit: `4844021` - Add mock passenger trip progression
- Implementation log entry: `2026-05-25 - Phase 5 Passenger Realtime Tracking - Commit 4`
- Review status: User approved runtime/code review on 2026-05-25; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`

## Next Checkpoint

- Continue Phase 5 with ETA polish or realtime adapter hardening depending on runtime feedback.
- Preserve existing trip ID, route, estimate, payment, promo, driver detail, realtime state, and tracking summary behavior.
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
