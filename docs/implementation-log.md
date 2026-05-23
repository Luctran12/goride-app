# Implementation Log

## 2026-05-23 - Phase 1 Foundation - Commit 1

- Branch: `codex/frontend-foundation`
- Commit: `c599d6e`
- Scope: Added shared ride domain types and front-end environment config.
- Files changed:
  - `types/ride.ts`
  - `lib/config.ts`
  - `docs/current-phase.md`
- Behavior implemented:
  - Added shared `Coordinates`, `LocationPoint`, `VehicleType`, `PaymentMethod`, `TripStatus`, booking, pricing, trip detail, driver request, driver location, and WebSocket notification types.
  - Added `lib/config.ts` to read `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WS_URL`, and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
  - Added derived config flags for mock API, mock realtime, and Google Maps key availability.
  - Updated `docs/current-phase.md` to track branch `codex/frontend-foundation` and current commit scope.
- Validation:
  - Ran `cmd /c npm run lint`.
  - Result: passed with 0 errors.
  - Existing warnings remain in current booking screens: unused imports/state, `useMemo` dependency warnings, and missing effect dependencies.
- Review:
  - Review skill/tool was not available in this session, so a manual review was performed.
  - No blocking findings found in this commit.
  - Config falls back safely when env vars are missing.
  - Types match the TDD public API shape closely enough for the next API-client commit.
- Known risks:
  - `lib/config.ts` is not consumed yet, so runtime behavior has not changed.
  - Realtime package dependencies are not added yet; that belongs to a later commit.
  - Existing booking screen lint warnings remain outside this commit scope.

## 2026-05-23 - Phase 1 Foundation - Commit 2

- Branch: `codex/frontend-foundation`
- Commit: `efdaf73`
- Scope: Added API client, ride API wrapper, and mock adapter for backend-free demo mode.
- Files changed:
  - `lib/api.ts`
  - `lib/ride-api.ts`
  - `lib/mock-ride-api.ts`
  - `docs/current-phase.md`
- Behavior implemented:
  - Added `apiRequest<T>()` with JSON body handling, bearer token support, normalized `ApiError`, and safe non-JSON response parsing.
  - Added in-memory `setAccessToken()` and `getAccessToken()` helpers for the future auth flow.
  - Added ride API wrappers for pricing, booking estimate, booking creation, trip detail, driver location fallback, driver online status, driver trip response, and trip status update.
  - Added mock API adapter with pricing configs, Haversine distance calculation, fare estimate calculation, mock trip storage, mock driver location, and driver status responses.
  - Mock driver reject keeps the trip in `SEARCHING`, matching the TDD flow where the system continues matching another driver.
- Validation:
  - Ran `cmd /c npm run lint`.
  - Result: passed with 0 errors.
  - Existing warnings remain in current booking screens and were not introduced by this commit.
- Review:
  - Review skill/tool was not available in this session, so a manual review was performed.
  - No blocking findings found in this commit.
  - API paths match the TDD REST contract for the covered endpoints.
  - Mock adapter response shapes match the front-end types and planned screens.
- Known risks:
  - Access token storage is in-memory only until the real auth flow is implemented.
  - Mock trip storage resets on app reload.
  - UI screens do not consume the API layer yet; integration starts in later phases.
