# Production audit — October 29, 2026

Scope: robertrichards45/Finance only. Baseline efb8df5c55bfc3fc3e5e363a4107dbbfc2593b8c; Railway deployment d1bd8da8-b346-4219-b396-7348e93d9cbf SUCCESS, production service d562ccba-6f29-440a-bb1d-c689a3020abe. Persistent encrypted SQLite volume /data, single replica. Baseline: 149/149 automated tests passed locally. No real purchase performed.

## Working and verified

- Existing HTTPS site, matching GitHub/Railway commit, startup Stripe catalog verification in production logs.
- Baseline automated tests: signed mock events, plan expiry, account isolation, CSRF, login tokens, real DOCX/PDF conversion, bounded AI fixtures, upload parser fixtures.
- Prior direct Google UI observations in this session: HTML tag successfully verified, sitemap submission accepted, report Success / 8 discovered URLs. Homepage indexed. Services, federal and private-sector pages discovered/not indexed; indexing requests accepted. Contact inspection was unknown to Google; request in flight before browser session reset.

## Implemented, provider acceptance incomplete

- Live Checkout, webhook processing, subscriptions, billing portal, Resend outbox, OpenAI writing/editorial passes. A live Checkout opening and Resend acceptance do not establish paid fulfillment or inbox delivery.
- Only live Stripe account is exposed by the connector; no sandbox account or readable sandbox credentials are available. Provider-backed sandbox transactions remain blocked pending sandbox connection. Do not substitute mocks for this acceptance test.
- Historical fictional OpenAI probe recorded in docs/acceptance.md; repeat tests against current deployment needed.

## Baseline defects / incomplete features (historical findings before fixes)

- Service.create and Service.update authorize paid access before saving; contradict build-first promise.
- Strict complete-intake validation prevents incremental draft saves. No autosave/version conflict handling.
- Builder is a long form, disabled for signed-out users with no local continuation flow.
- Sign-in links include internal qa=1 parameter. Customer errors and plan disclosures inconsistent.
- Seven-day manual editing still incurs paid AI editorial review, despite no AI entitlement.
- Multiple outdated prelaunch/no-checkout statements, including policies and privacy; Managed Payments disclosure is inaccurate for current standard Checkout.
- Job URLs are only saved, never fetched. Binary uploads correctly fail closed because no production CLAMAV_HOST is configured.
- No automatic backups, restoration evidence, job variants/history UI, or detailed funnel instrumentation.
- Ad integration was prepared in an earlier isolated checkout but is not yet deployed. Google account has no AdSense publisher account; application requires owner agreement.

## Risks and operational decisions

- Do not weaken billing, session, CSRF or file ownership protections to enable free draft saving.
- No production storage schema migration is needed for encrypted draft payload additions.
- No new paid scanner/backup service or real-money payment is authorized by this audit. Infrastructure additions that incur fees require a concrete owner decision.
- Refund/cancellation terms require operator/legal review; correcting false statements does not constitute legal approval or authorize business-term changes.
- Backup snapshots on the same volume improve recovery but are not disaster recovery; an independently stored key and off-volume encrypted copy are required.
- AdSense approval, actual provider delivery, mobile accessibility, current federal rules and real rendered document inspection remain separate acceptance items.

## Implemented remediation

Free incomplete draft creation/update, account autosave/version conflicts, guided steps and tab recovery replace the baseline pay-before-save behavior. Generated writing and exports still require entitlements. Manual seven-day writing does not call AI. Pro edits can save with basic/manual review after the shared AI allowance is exhausted.

Secure allowlisted job URL import, Pro exact-quote structured import proposals, section rewrites, five prior writing revisions, lifecycle email outbox notifications, aggregate operational telemetry, encrypted local snapshots/restore tests, advertisement preparation (disabled), a cover-letter guide and accurate public payment disclosures are committed. These are implementation results; provider acceptance and full browser acceptance are listed separately.

The current local suite is 177/177. Production probes identified valid target-series numbers being rejected and duplicate letter closings; both were corrected with regression tests. Invalid reviewer source maps now receive bounded repair attempts while malformed/oversized structures still fail closed. Actual current provider acceptance is reported separately.

Public Resend sender verification, a connected Stripe sandbox, live malware scanning, independent backups and key protection, authenticated full customer/admin delivery, real mobile/a11y acceptance, cost reconciliation and final policy approval remain incomplete. Do not label the site fully launched merely because configuration flags permit purchases.
