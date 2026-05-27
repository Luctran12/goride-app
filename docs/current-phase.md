# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Realtime backend integration
- Phase: Phase 8 - STOMP/SockJS realtime wiring
- Branch: `codex/realtime-stomp`
- Current commit scope: Commit 1 - add STOMP/SockJS dependencies and remote realtime adapter
- Status: Ready for user review

## Last Completed Checkpoint

- Commit: `7d82144` - Merge validation polish phase
- Implementation log entry: `2026-05-27 - Phase 7 Validation and Polish - Closeout Check`
- Review status: User approved Phase 7, branch merged into `main`, and `main` pushed to GitHub on 2026-05-27.

## Next Checkpoint

- User reviews Phase 8 realtime adapter commit.
- CodeRabbit review attempted after commit; record result in implementation log.
- Wait for user approval before continuing to the next Phase 8 commit.

## Phase 8 Targets

- Add `@stomp/stompjs`, `sockjs-client`, and TypeScript support for SockJS.
- Replace remote realtime skeleton in `lib/realtime.ts` with a real STOMP client when `EXPO_PUBLIC_WS_URL` is configured.
- Keep mock realtime as the default fallback when no WebSocket URL exists.
- Subscribe to trip status, trip driver location, passenger notifications, and driver request topics.
- Publish driver location, driver heartbeat, and trip status messages to backend STOMP destinations.
- Preserve passenger/driver screen behavior in mock mode.
