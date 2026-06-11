# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Productize payment and vouchers
- Phase: Stage 13 - Productize payment and vouchers
- Branch: `codex/payment-vouchers`
- Current commit scope: Commit 4 - add remove payment method UI in Billing
- Status: Waiting for user review

## Last Completed Checkpoint

- Commit: `15a9732` - Add billing payment removal UI
- Implementation log entry: `2026-06-11 - Stage 13 Payment And Vouchers - Commit 4`
- Review status: CodeRabbit CLI unavailable; lint/typecheck/diff validation passed.

## Next Checkpoint

- Wait for user review of Commit 4.
- If approved, close Stage 13 and merge/push when requested.

## Product Readiness Targets

- Replace static billing/payment method data with API/mock-backed data.
- Add add/set default/remove payment method MVP behavior where feasible.
- Connect booking promo selector to voucher inventory.
- Keep MoMo/VNPay clearly marked as coming soon unless backend payment redirect/callback is ready.
