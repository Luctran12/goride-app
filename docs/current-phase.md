# Current Phase

Use this document to track the active feature, phase, branch, commit scope, and review checkpoint.

## Active Work

- Feature: Productize payment and vouchers
- Phase: Stage 13 - Productize payment and vouchers
- Branch: `codex/payment-vouchers`
- Current commit scope: Commit 1 - add payment/voucher API and mock data layer
- Status: Implementation in progress

## Last Completed Checkpoint

- Commit: `adad6b5` - Merge passenger profile edit UI
- Implementation log entry: `2026-06-11 - Stage 12 Passenger Profile Edit UI Merge`
- Review status: User approved Stage 12; post-merge validation passed.

## Next Checkpoint

- Create Stage 13 feature branch from `main`.
- Commit 1: create shared payment/voucher types plus API/mock adapters.
- Commit 2: wire Billing screen to API/mock data.
- Commit 3: connect booking promo selector to voucher inventory and validation.
- Wait for user review after each Stage 13 commit.

## Product Readiness Targets

- Replace static billing/payment method data with API/mock-backed data.
- Add add/set default/remove payment method MVP behavior where feasible.
- Connect booking promo selector to voucher inventory.
- Keep MoMo/VNPay clearly marked as coming soon unless backend payment redirect/callback is ready.
