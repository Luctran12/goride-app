# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Realtime backend integration
- Phase: Phase 8 - STOMP/SockJS realtime wiring
- Branch: `codex/realtime-stomp`
- Current commit scope: Phase 8 closeout assessment
- Status: Ready to merge

## Last Completed Checkpoint

- Commit: `51b0b0d` - Surface realtime publish failures
- Implementation log entry: `2026-05-28 - Phase 8 Realtime Backend Integration - Commit 4`
- Review status: User approved Phase 8 commit 4 on 2026-05-28; CodeRabbit CLI review remained blocked because `coderabbit` is not installed.

## Next Checkpoint

- Merge `codex/realtime-stomp` back to `main` and push `main` after user approves this closeout checkpoint.

## Phase 8 Targets

- Add `@stomp/stompjs`, `sockjs-client`, and TypeScript support for SockJS.
- Replace remote realtime skeleton in `lib/realtime.ts` with a real STOMP client when `EXPO_PUBLIC_WS_URL` is configured.
- Keep mock realtime as the default fallback when no WebSocket URL exists.
- Subscribe to trip status, trip driver location, passenger notifications, and driver request topics.
- Publish driver location, driver heartbeat, and trip status messages to backend STOMP destinations.
- Preserve passenger/driver screen behavior in mock mode.
