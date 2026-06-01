# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger trip rating
- Phase: Phase 10 - Passenger rating submission
- Branch: `codex/passenger-rating`
- Current commit scope: Commit 1 complete - rating API/mock foundation
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `ec4d4b3` - Add passenger rating API
- Implementation log entry: `2026-06-01 - Phase 10 Passenger Rating - Commit 1`
- Review status: Awaiting user review; CodeRabbit CLI review blocked because `coderabbit` is not installed and the installer failed in this Windows shell because `sh` is unavailable.

## Next Checkpoint

- User reviews Phase 10 rating API/mock foundation.
- Wait for user approval before wiring rating submission UI into Activity detail.

## Phase 10 Targets

- Let passengers submit a rating after a completed trip when no rating exists yet.
- Reuse Activity trip detail modal as the entry point for rating submission.
- Call `POST /ratings` in remote mode and update mock trip history in mock mode.
- Keep submitted rating visible in Activity history detail after submit.
- Preserve existing rebook and trip history behavior.
