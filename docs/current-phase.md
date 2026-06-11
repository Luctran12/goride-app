# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Remote logging/error reporting
- Phase: Stage 11.5 - Product hardening before Stage 12
- Branch: `codex/remote-error-reporting`
- Current commit scope: Add non-blocking remote error reporting and root app error boundary
- Status: Waiting for user review before Stage 12

## Last Completed Checkpoint

- Commit: `e3da561` - Add remote error reporting
- Implementation log entry: `2026-06-11 - Stage 11.5 Remote Logging/Error Reporting`
- Review status: CodeRabbit CLI unavailable; install request rejected; lint/typecheck/diff validation passed.

## Next Checkpoint

- Wait for user review of `e3da561`.
- If approved, merge Stage 11.5 as appropriate.
- Start Stage 12 - finish passenger profile edit UI.

## Product Readiness Targets

- Add remote reporting for unhandled app errors and selected API failures.
- Keep reporting disabled/no-op when no reporting endpoint is configured.
- Avoid blocking passenger/driver flows if reporting fails.
- Preserve user local backend URL changes in `lib/config.ts`.
