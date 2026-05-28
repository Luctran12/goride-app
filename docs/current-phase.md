# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Realtime backend integration
- Phase: Phase 8 - STOMP/SockJS realtime wiring
- Branch: `codex/realtime-stomp`
- Current commit scope: Commit 4 complete - realtime publish feedback for driver sends
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `51b0b0d` - Surface realtime publish failures
- Implementation log entry: `2026-05-28 - Phase 8 Realtime Backend Integration - Commit 4`
- Review status: Awaiting user review for commit 4; CodeRabbit CLI review blocked because `coderabbit` is not installed and the installer escalation was rejected in this run.

## Next Checkpoint

- User reviews Phase 8 realtime publish feedback commit.
- Wait for user approval before continuing to the next Phase 8 commit.

## Phase 8 Targets

- Add `@stomp/stompjs`, `sockjs-client`, and TypeScript support for SockJS.
- Replace remote realtime skeleton in `lib/realtime.ts` with a real STOMP client when `EXPO_PUBLIC_WS_URL` is configured.
- Keep mock realtime as the default fallback when no WebSocket URL exists.
- Subscribe to trip status, trip driver location, passenger notifications, and driver request topics.
- Publish driver location, driver heartbeat, and trip status messages to backend STOMP destinations.
- Preserve passenger/driver screen behavior in mock mode.
