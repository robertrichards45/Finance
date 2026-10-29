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
- [x] Resend outbox transport is implemented; historical owner-email acceptance was observed.
- [ ] Public verified-domain sending and actual inbox delivery. Current restricted sender is a launch blocker.
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

## October 29 production finish additions

- [x] Signed-in customers can save incomplete unpaid drafts; AI and final exports retain paid authorization.
- [x] Guided builder, clearly labeled outline, refresh recovery and account autosave/version protection implemented.
- [x] Job URL SSRF controls, section rewrites, exact-source import proposals, document history and local encrypted snapshots implemented.
- [x] 177 local automated tests pass; zero known dependency vulnerabilities; fourteen public production routes pass smoke checks.
- [x] Current real-provider federal and career-change acceptance run passes and renders all four documents in successful Railway deployment `8dd444f0-3cba-4247-9122-08fb9f71d487`.
- [ ] Binary DOCX/PDF imports have a live malware scanner and genuine safe/EICAR verification. Until then, text only.
- [ ] Authenticated new/returning customer and administrator browser acceptance, mobile viewport and accessibility review.
- [ ] Independent encrypted backup destination, separate key protection and production recovery drill.
- [ ] Refund/business terms approved by the owner and qualified legal review as needed.
- [ ] AdSense publisher approval, owner agreement and suitable consent implementation. Ads remain disabled.

Search Console was directly observed as HTML-tag verified, sitemap Success with eight discovered URLs, homepage indexed, and services/federal/private-sector discovered but not indexed. Indexing requests for those four pages were accepted. Contact request outcome needs confirmation after Google authentication. Google does not guarantee indexing.
