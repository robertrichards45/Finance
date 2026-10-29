# CareerLaunch AI production acceptance checklist

This checklist separates **technical readiness** from **confirmed paid customer delivery**.

## Confirmed

- [x] Public domain and production Railway service run over HTTPS.
- [x] Live Stripe account and all three price objects are accessible from production.
- [x] The website can create a live Stripe-hosted Checkout Session (HTTP 200).
- [x] The Stripe webhook endpoint has accepted an event (HTTP 200).
- [x] The application has a persisted checkout record, signed-webhook validation, customer/plan/amount checks, and replay-safe entitlement grants.
- [x] Automated tests cover purchase setup, payment activation in mocked Stripe, subscription changes, refunds, expired access, and cross-customer protections.
- [x] The customer portal has purchase-first and build-first routes, email-link sign-in, selected-plan preservation, billing management, and a status refresh after checkout.
- [x] Resend production logs show successful acceptance of login emails. Earlier authentication errors were resolved.
- [x] The test suite and deployment run through GitHub Actions and Railway.

## Still requires verification

- [ ] An authorized real payment with a valid payment method, followed by a confirmed **paid** Checkout Session.
- [ ] Confirm that the matching Stripe webhook (or return-page reconciliation) activates the correct 7-Day, Monthly Pro, or Annual Pro entitlement.
- [ ] Generate, review, approve, and download the purchased DOCX and PDF files under that entitlement.
- [ ] Confirm customer receipt/invoice delivery, support reply delivery, and a working cancellation link for a real subscription.
- [ ] Verify a real cancellation, billing renewal, and expired entitlement in a controlled test without unwanted charges.
- [ ] Confirm live backups/restore, accessibility on mobile devices, and policy wording with the site owner.

## Safety rules

- A Checkout HTTP 200 or webhook HTTP 200 **does not** prove a customer paid. Never grant access from unverified redirects, client requests, or unsigned webhook payloads.
- Never test with a real charge without specific authorization. Use mock Stripe objects for routine CI.
- Keep keys and webhook signing secrets in Railway variables, not GitHub or logs.
- Never change or redeploy unrelated Railway projects.
- If a live Stripe request fails, inspect the earliest failing Stripe operation, sanitized error code, and production request status before changing configuration.
