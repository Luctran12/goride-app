# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger personal profile screen
- Phase: Profile API integration
- Branch: `personal_screen`
- Current commit scope: Add a dedicated passenger personal information screen opened from the profile menu and bind data from `GET /api/users/me`.
- Status: Implemented locally; lint passed, full TypeScript check is still blocked by existing React import errors in untouched template/booking files.

## Last Completed Checkpoint

- Commit: `9525c09` - Wire passenger trip cancellation
- Implementation log entry: `2026-05-26 - Phase 5 Passenger Realtime Tracking - Commit 7`
- Review status: User approved runtime/code review on 2026-05-26; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`.

## Next Checkpoint

- Runtime test `/(customer)/profile -> /(customer)/personal` on Expo Go or a native build after logging in against the configured backend.
- Confirm `GET /api/users/me` returns `fullName`, `phone`, `email`, `avatarUrl`, `status`, and `roles` with the current bearer token.
- Add a real edit-profile route or wire the existing CTA to `PUT /api/users/me` when that scope is approved.
