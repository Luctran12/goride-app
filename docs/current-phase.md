# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger profile edit UI
- Phase: Stage 12 - Finish passenger profile edit
- Branch: `codex/passenger-profile-edit-ui`
- Current commit scope: Commit 1 - add editable personal profile form
- Status: Waiting for user review

## Last Completed Checkpoint

- Commit: `c7e2bef` - Add passenger profile edit form
- Implementation log entry: `2026-06-11 - Stage 12 Passenger Profile Edit UI - Commit 1`
- Review status: CodeRabbit CLI unavailable; installer failed on Windows because `sh` is not available; lint/typecheck/diff validation passed.

## Next Checkpoint

- Wait for user review of Commit 1.
- Commit 2: refresh Profile screen after returning from Personal and polish state sync if needed.
- Wait for user review after each Stage 12 commit.

## Product Readiness Targets

- Wire `app/(customer)/personal.tsx` into `updateMyProfile()`.
- Add edit/save/cancel UI for full name, phone, email, and avatar URL.
- Add validation, inline errors, loading state, and success state.
- Refresh profile display after save in the same app session.
