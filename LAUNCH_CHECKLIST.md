# CareerLaunch AI — launch configuration checklist

## Already prepared
- Production domain: https://resumebuilder.shop
- Stripe sandbox product: prod_VWpXNqCLIDKznb (inactive)
- Stripe sandbox price: price_1UVls6BxDlvv3BXbIavWVOrx ($99 USD)
- Authenticated test Checkout session endpoint: POST /api/orders/:id/checkout
- Signed test webhook endpoint: POST /api/stripe/webhook
- Checkout is intentionally disabled for public customers.

## Required configuration (Railway production service)
Configure `STRIPE_SECRET_KEY` using a **test** secret key (`rk_test_...` preferred, with minimal Checkout permissions; `sk_test_...` is also supported), `STRIPE_PRICE_ID=price_1UVls6BxDlvv3BXbIavWVOrx`, and `STRIPE_WEBHOOK_SECRET` from a Stripe **test-mode** webhook destination targeting `https://resumebuilder.shop/api/stripe/webhook`. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. An unpaid completion is acknowledged without fulfillment; only a signed paid event is recorded.

The webhook implementation currently records `paid_test` for a verified, paid test Checkout session. It does not activate live fulfillment. Do not use a live Stripe secret key with this code.

Configure `RESEND_API_KEY` and `EMAIL_FROM` from a verified sending domain in Resend to enable customer sign-in links and document notifications.

Keep `INTAKE_ENABLED=false` and `LAUNCH_APPROVED=false` until a complete end-to-end customer test passes.

## Test before accepting real orders
1. Confirm Railway deploys the latest commit successfully and `/health` responds.
2. Run `npm test` and resolve failures.
3. Confirm test-mode email sign-in link delivery and authentication.
4. Create an order using fictional test data.
5. Create a Stripe test Checkout session and pay with a Stripe test card.
6. Confirm Stripe's signed webhook is accepted once and the test payment is recorded.
7. Generate a resume and cover letter; inspect accuracy, PDF/Word layout, revisions, approval and downloads.
8. Confirm customer emails, account access, data deletion, and refund/support processes.
9. Design and test production payment gating: generation and delivery must require verified paid status, not merely a browser redirect.
10. Only then configure live Stripe credentials and explicitly approve opening intake and live payments.

Do not commit Stripe or email secrets to GitHub.

## Writing quality
Generation and manual edits must pass the editorial checks in [docs/writing-quality.md](docs/writing-quality.md). Test representative live-provider results; mocked unit tests alone are not editorial acceptance. Builder plans are advertised at $4.99/$12.99/$59.99, but the existing sandbox price above is only for the separate $99 premium package. Do not connect those builder plan buttons to the premium price. Recurring billing, plan-specific quotas, cancellation and entitlements must be completed and tested first.
