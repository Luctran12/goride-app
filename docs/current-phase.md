# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Productize payment and vouchers
- Phase: Stage 13 - Productize payment and vouchers
- Branch: `codex/payment-vouchers`
- Current commit scope: Commit 1 - add payment/voucher API and mock data layer
- Status: Waiting for user review

## Last Completed Checkpoint

- Commit: `3dddb06` - Add payment voucher API layer
- Implementation log entry: `2026-06-11 - Stage 13 Payment And Vouchers - Commit 1`
- Review status: CodeRabbit CLI unavailable; lint/typecheck/diff validation passed.

## Next Checkpoint

- Wait for user review of Commit 1.
- Commit 2: wire Billing screen to API/mock data.
- Commit 3: connect booking promo selector to voucher inventory and validation.
- Wait for user review after each Stage 13 commit.

## Product Readiness Targets

- Replace static billing/payment method data with API/mock-backed data.
- Add add/set default/remove payment method MVP behavior where feasible.
- Connect booking promo selector to voucher inventory.
- Keep MoMo/VNPay clearly marked as coming soon unless backend payment redirect/callback is ready.
