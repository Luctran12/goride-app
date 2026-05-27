# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger authentication API wiring
- Phase: Auth integration
- Branch: `mock_api`
- Current commit scope: Protect customer screens behind a persisted auth session and refresh expired access tokens through `/auth/refresh`.
- Status: Implemented; awaiting user runtime review with backend credentials.

## Last Completed Checkpoint

- Commit: `9525c09` - Wire passenger trip cancellation
- Implementation log entry: `2026-05-26 - Phase 5 Passenger Realtime Tracking - Commit 7`
- Review status: User approved runtime/code review on 2026-05-26; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`.

## Next Checkpoint

- Runtime test unauthenticated direct navigation to `/(customer)`, `/(customer)/profile`, `/(customer)/billing`, and booking routes.
- Runtime test login/register against the configured auth base URL and confirm customer routes become reachable only after token storage succeeds.
- Runtime test an expired access token path to confirm `/auth/refresh` returns and persists a new `data.accessToken`.
