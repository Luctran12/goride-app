# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger post-trip rating
- Phase: Phase 11 - Passenger completed-trip rating polish
- Branch: `codex/passenger-completion-rating`
- Current commit scope: Commit 1 complete - wire TripCompletionCard rating submit
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `e983e29` - Wire completed trip rating submit
- Implementation log entry: `2026-06-04 - Phase 11 Passenger Completed Rating - Commit 1`
- Review status: Validation passed; CodeRabbit review workflow blocked because the CLI is unavailable and install approval was rejected.

## Next Checkpoint

- Wait for user review of Commit 1 before starting the next Phase 11 commit.
- If approved, continue polishing passenger post-trip completion behavior.
- If user requests changes, implement them on the same branch in a new small commit.

## Phase 11 Targets

- Let passengers rate immediately when a trip reaches `COMPLETED`.
- Preserve the Activity history rating flow from Phase 10.
- Reuse the existing `TripCompletionCard` UI instead of adding a new route.
- Avoid duplicate rating submissions while a request is in flight.
- Keep mock-mode and backend-mode behavior aligned with `POST /ratings`.
