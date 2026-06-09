# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger post-trip rating
- Phase: Phase 11 - Passenger completed-trip rating polish
- Branch: `codex/passenger-completion-rating`
- Current commit scope: Commit 2 - sync existing completed-trip rating state
- Status: In progress

## Last Completed Checkpoint

- Commit: `e983e29` - Wire completed trip rating submit
- Implementation log entry: `2026-06-04 - Phase 11 Passenger Completed Rating - Commit 1`
- Review status: User approved Commit 1 on 2026-06-09.

## Next Checkpoint

- Pass existing `passengerRating` data into the completed-trip card.
- Keep the rating card in success/read-only mode if the trip has already been rated.
- Update the waiting-driver trip detail state immediately after a successful rating submit.
- Validate, commit, run review workflow, document implementation log, then wait for user review.

## Phase 11 Targets

- Let passengers rate immediately when a trip reaches `COMPLETED`.
- Preserve the Activity history rating flow from Phase 10.
- Reuse the existing `TripCompletionCard` UI instead of adding a new route.
- Avoid duplicate rating submissions while a request is in flight.
- Keep mock-mode and backend-mode behavior aligned with `POST /ratings`.
