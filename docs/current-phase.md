# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger trip history
- Phase: Phase 9 - Passenger activity/history
- Branch: `codex/passenger-trip-history`
- Current commit scope: Commit 1 - add booking history API/mock adapter
- Status: In progress

## Last Completed Checkpoint

- Commit: `beea140` - Merge realtime STOMP phase
- Implementation log entry: `2026-05-28 - Phase 8 Realtime Backend Integration - Closeout Check`
- Review status: User approved Phase 8, branch merged into `main`, and `main` pushed to GitHub.

## Next Checkpoint

- Commit booking history API/mock foundation after validation.
- Attempt CodeRabbit review; currently expected to be blocked unless the CLI is installed in this Windows environment.
- Wait for user review before continuing to the next Phase 9 commit.

## Phase 9 Targets

- Add passenger booking history API wrapper for `GET /bookings?page=1&size=20`.
- Add mock trip history data so Activity can render without backend.
- Add a Passenger Activity screen linked from Home/Profile/Bottom nav.
- Display trip status, route, fare, driver, date, empty/loading/error states.
- Preserve mock-mode behavior and avoid changing existing booking flow.
