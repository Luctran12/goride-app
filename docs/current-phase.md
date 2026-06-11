# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Productize payment and vouchers
- Phase: Stage 13 - Productize payment and vouchers
- Branch: `codex/payment-vouchers`
- Current commit scope: Commit 4 - add remove payment method UI in Billing
- Status: User approved Commit 4; Stage 13 ready to merge

## Last Completed Checkpoint

- Commit: `15a9732` - Add billing payment removal UI
- Implementation log entry: `2026-06-11 - Stage 13 Payment And Vouchers - Commit 4`
- Review status: User approved Commit 4; CodeRabbit CLI unavailable; lint/typecheck/diff validation passed.

## Next Checkpoint

- Merge `codex/payment-vouchers` into `main` and push when requested.
- After Stage 13 merge, start Stage 14 - Driver product shell.

## Product Readiness Targets

- Replace static billing/payment method data with API/mock-backed data.
- Add add/set default/remove payment method MVP behavior where feasible.
- Connect booking promo selector to voucher inventory.
- Keep MoMo/VNPay clearly marked as coming soon unless backend payment redirect/callback is ready.
