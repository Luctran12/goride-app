# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger trip history
- Phase: Phase 9 - Passenger activity/history
- Branch: `codex/passenger-trip-history`
- Current commit scope: Commit 2 complete - passenger Activity summary, detail modal, and rebook action
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `94802f9` - Add passenger activity history screen
- Implementation log entry: `2026-06-01 - Phase 9 Passenger Trip History - Commit 2`
- Review status: Awaiting user review; CodeRabbit CLI review blocked because `coderabbit` is not installed and the installer failed in this Windows shell because `sh` is unavailable.

## Next Checkpoint

- User reviews Phase 9 Activity/history compact cards, trip detail modal, and rebook behavior.
- Wait for user approval before starting the next commit.

## Phase 9 Targets

- Add passenger booking history API wrapper for `GET /bookings?page=1&size=20`.
- Add mock trip history data so Activity can render without backend.
- Add a Passenger Activity screen linked from Home/Profile/Bottom nav.
- Display compact route/date/fare cards, detail modal with driver/route/rating/code, and empty/loading/error states.
- Preserve mock-mode behavior and avoid changing existing booking flow.
