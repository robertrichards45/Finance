# CareerLaunch AI

CareerLaunch AI is the résumé, cover-letter, and application builder deployed at https://resumebuilder.shop in the **Finance** Railway service.

## Production status

- The public site and customer portal are deployed.
- Stripe live Checkout opens successfully and uses live price IDs configured in Railway. The Stripe catalog is checked at startup, and the website verifies Stripe session ownership, amounts, and payment status before granting access.
- Stripe webhook signature validation and webhook delivery are implemented. An accepted webhook is **not** proof that a paid transaction has been completed.
- The first **real paid** purchase → webhook → entitlement → document generation → download workflow still needs an authorized end-to-end acceptance test. Do not claim a completed payment was verified until it has actually happened.
- Login uses a retrying Resend outbox and preserves the selected plan. Public delivery is blocked until the resumebuilder.shop sender domain is verified; the current resend.dev sender is restricted. Acceptance does not establish inbox delivery.
- Users returning from Stripe see payment-verification status and a retry path; this does not create an additional payment.

## Run and verify

Use Node 24, LibreOffice Writer, Poppler, and Liberation fonts. The Dockerfile installs document tools for Railway.

```bash
npm ci --ignore-scripts
npm audit --omit=dev --audit-level=high
npm test
node scripts/verify-documents.js
node --check app.js && node --check server.js
npm start
```

The document verification script generates fictional documents in ignored `test-output/`. Tests use mock Stripe objects; passing tests do not constitute a live charge.

## Implemented

- Responsive marketing, intake, customer portal, design studio, administrator, and policy pages.
- From-scratch résumé intake, improvement of existing résumé, job-targeted application drafts, and federal résumé guidance.
- Email-link authentication, HttpOnly session cookies, CSRF protections, origin checks, and ownership enforcement.
- Encrypted persistent records on a Railway volume.
- Stripe one-time 7-Day Access, Monthly Pro, and Annual Pro Checkout; customer billing portal and cancel-renewal route.
- Signed Stripe webhooks; customer-scoped checkout reconciliation; refund, dispute, expiry, and subscription handling.
- AI writing with factual-evidence validation, editorial review, revision support, and bounded job queues.
- Editable Word/PDF résumé and cover-letter outputs, document-quality checks, private single-use downloads, retention cleanup, and user deletion.
- Transactional email outbox with retry and administrator-visible failures.

## Operations

The production Railway application uses `STRIPE_MODE`, `STRIPE_SECRET_KEY`, `STRIPE_ACCOUNT_ID`, the three `STRIPE_PRICE_*` variables, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PORTAL_CONFIGURATION_ID`. Keep credentials in Railway, never GitHub. The application refuses mismatched Stripe account, price, amount, customer, and environment information.

A 200 response from `/api/billing/checkout` means a secure Stripe session was created, **not** that payment was completed. Entitlements are granted only after Stripe confirms a paid, matching session.

See [deployment](docs/deployment.md), [audit](docs/audit.md), [acceptance](docs/acceptance.md), and [launch checklist](LAUNCH_CHECKLIST.md). The older managed-payments implementation notes are historical and do not describe the current standard Stripe Checkout configuration.
