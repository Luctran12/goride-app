# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger authentication API wiring
- Phase: Auth integration
- Branch: `mock_api`
- Current commit scope: Wire customer login/register to Spring Boot auth endpoints with axios and persisted JWT session storage.
- Status: Implemented; awaiting user runtime review with backend credentials.

## Last Completed Checkpoint

- Commit: `9525c09` - Wire passenger trip cancellation
- Implementation log entry: `2026-05-26 - Phase 5 Passenger Realtime Tracking - Commit 7`
- Review status: User approved runtime/code review on 2026-05-26; CodeRabbit CLI review blocked because `coderabbit` is not installed and this Windows shell has no `sh`.

## Next Checkpoint

- Runtime test login/register against `http://172.26.96.1:8080/api/v1`.
- Confirm the backend returns `data.accessToken` and `data.refreshToken` matching `docs/api-docs.json`.
- After user review, decide whether to gate customer routes by persisted session state or keep the current explicit login flow.
