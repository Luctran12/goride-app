# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Passenger-driver in-trip chat
- Phase: Stage 16 - Mobile trip messaging integration
- Branch: `codex/trip-chat`
- Current commit scope: Stage 16 review checkpoint
- Status: Chat implementation committed at `d3c8a6b`; awaiting user review and device/backend smoke testing

## Last Completed Checkpoint

- Commit: `d3c8a6b` - reliable in-trip chat for passenger and driver
- Validation: TypeScript passed; chat-scoped ESLint passed; full lint remains at the unchanged baseline of 11 pre-existing errors and 18 warnings.
- Review status: Manual contract/code review passed with no chat blocker; user review and runtime smoke testing are still required.

## Next Checkpoint

- Smoke test passenger and driver accounts against the backend `/messages` APIs and configured `/ws` or `/ws-native` endpoint.
- Confirm realtime receive, reconnect catch-up, read receipt, 429 cooldown, and terminal-trip read-only history on two devices/sessions.
- Address feedback in a small follow-up commit on the same branch before merge.

## Product Readiness Targets

- Connect passenger app flows (auth, estimate, booking, tracking) to backend REST/WS APIs.
- Connect driver app flows (online status, trip requests, status updates, GPS tracking) to backend REST/WS APIs.
- Connect passenger-driver chat to REST persistence and `/topic/trip/{tripId}` message/read topics.
