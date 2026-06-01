# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger trip rating
- Phase: Phase 10 - Passenger rating submission
- Branch: `codex/passenger-rating`
- Current commit scope: Commit 1 - rating API/mock foundation
- Status: In progress

## Last Completed Checkpoint

- Commit: `662959d` - Merge passenger trip history phase into `main`
- Implementation log entry: `2026-06-01 - Phase 9 Passenger Trip History - Closeout Check`
- Review status: User approved Phase 9, branch merged to `main`, and `main` pushed to GitHub on 2026-06-01.

## Next Checkpoint

- Add rating request/response types based on `POST /ratings` in `docs/TDD.md`.
- Add `submitTripRating()` to the ride API layer with mock adapter support.
- Keep the commit small and wait for user review before wiring the UI.

## Phase 10 Targets

- Let passengers submit a rating after a completed trip when no rating exists yet.
- Reuse Activity trip detail modal as the entry point for rating submission.
- Call `POST /ratings` in remote mode and update mock trip history in mock mode.
- Keep submitted rating visible in Activity history detail after submit.
- Preserve existing rebook and trip history behavior.
