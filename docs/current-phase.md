# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger-driver in-trip chat
- Phase: Stage 16 - Mobile trip messaging integration
- Branch: `codex/trip-chat`
- Current commit scope: Chat contracts, REST/realtime sync, shared conversation screen, and passenger/driver entry points
- Status: Existing mobile work checkpointed at `d11183e`; implementing the backend trip-messaging contract

## Last Completed Checkpoint

- Commit: `d11183e` - checkpoint existing mobile changes before chat implementation
- Validation: Existing work has 11 pre-existing JSX lint errors and 18 warnings; `.env` remains local and uncommitted.
- Review status: User explicitly requested the checkpoint before chat development.

## Next Checkpoint

- Implement cursor sync, stable `clientMessageId`, message de-duplication, read state, unread count, and reconnect recovery.
- Add one shared chat experience reachable from the active passenger and driver trip screens.
- Validate TypeScript and touched-file lint, then perform a manual contract review against the backend docs.

## Product Readiness Targets

- Connect passenger app flows (auth, estimate, booking, tracking) to backend REST/WS APIs.
- Connect driver app flows (online status, trip requests, status updates, GPS tracking) to backend REST/WS APIs.
- Connect passenger-driver chat to REST persistence and `/topic/trip/{tripId}` message/read topics.
