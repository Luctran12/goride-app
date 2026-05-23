# Changes In Implementation

Use this document to record implementation decisions that differ from `docs/TDD.md`.

Each entry should include:

- Date
- Branch
- Feature
- TDD expectation
- Implemented behavior
- Reason for change
- Impact

## 2026-05-23 - Realtime Foundation Skeleton

- Date: 2026-05-23
- Branch: `codex/frontend-foundation`
- Feature: Phase 1 Foundation - realtime service
- TDD expectation: WebSocket realtime uses STOMP over SockJS with subscriptions for trip status, trip location, personal notifications, and driver requests.
- Implemented behavior: `lib/realtime.ts` provides the front-end realtime interface and mock event bus fallback, while remote mode is only a connection-state skeleton because `@stomp/stompjs` and `sockjs-client` are not installed yet.
- Reason for change: Keep Commit 4 small and reviewable without adding new network-installed dependencies in the same commit.
- Impact: Mock realtime can support upcoming UI integration, but real backend WebSocket integration remains pending until STOMP/SockJS dependencies and connection logic are added.
