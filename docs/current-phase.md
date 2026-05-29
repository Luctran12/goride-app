# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger trip history
- Phase: Phase 9 - Passenger activity/history
- Branch: `codex/passenger-trip-history`
- Current commit scope: Commit 1 complete - booking history API/mock adapter
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `ae58e1c` - Add passenger booking history API
- Implementation log entry: `2026-05-29 - Phase 9 Passenger Trip History - Commit 1`
- Review status: Awaiting user review; CodeRabbit CLI review blocked because `coderabbit` is not installed and the installer escalation was rejected in this run.

## Next Checkpoint

- User reviews Phase 9 booking history API/mock foundation.
- Wait for user approval before implementing the Activity screen commit.

## Phase 9 Targets

- Add passenger booking history API wrapper for `GET /bookings?page=1&size=20`.
- Add mock trip history data so Activity can render without backend.
- Add a Passenger Activity screen linked from Home/Profile/Bottom nav.
- Display trip status, route, fare, driver, date, empty/loading/error states.
- Preserve mock-mode behavior and avoid changing existing booking flow.
