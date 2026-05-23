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

## 2026-05-23 - Phase 1 Foundation - Commit 3

- Branch: `codex/frontend-foundation`
- Commit: `1d1e758`
- Scope: Added location service for GPS permissions, current location, reverse geocode, Google Places search, and Expo geocode fallback.
- Files changed:
  - `lib/location-service.ts`
  - `docs/current-phase.md`
  - `docs/implementation-log.md`
- Behavior implemented:
  - Added `requestLocationPermission()` to check device location services and request foreground location permission.
  - Added `getCurrentLocationPoint()` with balanced GPS accuracy, timeout support, reverse geocode, and current-location label.
  - Added `reverseGeocode()` with formatted Vietnamese address output and coordinate fallback when geocoding fails.
  - Added `searchPlaces()` that uses Google Places Autocomplete when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` exists and Expo geocode fallback when it does not.
  - Added `getPlaceDetails()` for resolving Google `placeId` into final coordinates/address.
  - Added `getDefaultLocationPoint()` for TP. Hồ Chí Minh fallback map center.
- Validation:
  - Ran `cmd /c npm run lint`.
  - Result: passed with 0 errors.
  - Ran `cmd /c npx tsc --noEmit`.
  - Result: failed due existing project-wide JSX React import errors in app/components files.
  - Ran filtered `tsc` check for `location-service` and `lib\\` paths.
  - Result: no matching errors for the new location service files.
- Review:
  - Review skill/tool was not available in this session, so a manual review was performed.
  - No blocking findings found in this commit.
  - Permission, GPS disabled, timeout, reverse geocode fallback, and missing Google key paths are represented.
  - Google search returns predictions with `placeId`; future UI should call `getPlaceDetails()` before confirming a Google prediction.
- Known risks:
  - Google Places requests are direct client-side calls and depend on the app key restrictions being configured correctly.
  - Expo geocode fallback quality depends on platform/provider support.
  - `tsc --noEmit` still fails on existing React import issues outside this commit scope.

## 2026-05-23 - Phase 1 Foundation - Commit 4

- Branch: `codex/frontend-foundation`
- Commit: `2cf377d`
- Scope: Added realtime service skeleton with mock fallback.
- Files changed:
  - `lib/realtime.ts`
  - `docs/current-phase.md`
  - `docs/implementation-log.md`
  - `docs/changes-in-implementation.md`
- Behavior implemented:
  - Added realtime connection state helpers with mock/remote mode reporting.
  - Added subscription APIs for trip status/location, notifications, and driver requests.
  - Added mock event bus support for notifications, driver requests, trip status, and driver location updates.
  - Added send helpers for driver location, driver heartbeat, and trip status.
  - Added mock trip accepted/location progress and mock driver request events for upcoming UI integration.
  - Documented the temporary deviation from STOMP/SockJS real backend integration in `docs/changes-in-implementation.md`.
- Validation:
  - Ran `cmd /c npm run lint`.
  - Result: passed with 0 errors.
  - Ran filtered `tsc` check for `realtime` and `lib\\` paths.
  - Result: no matching errors for the new realtime service files.
- Review:
  - Review skill/tool was not available in this session, so a manual review was performed.
  - No blocking findings found in this commit.
  - Mock realtime has unsubscribe support for registered handlers.
  - Remote mode is intentionally a skeleton until STOMP/SockJS dependencies are added.
- Known risks:
  - Real backend WebSocket/STOMP integration is not implemented yet.
  - Mock timers are lightweight demo timers and are not persisted across reloads.
  - UI screens do not consume the realtime layer yet; integration starts in later phases.
