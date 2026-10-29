# CareerLaunch AI architecture (planned)

## Trust boundaries

1. Browser: marketing and demo only; never embed secrets or trust browser-submitted prices.
2. API: authenticate customers, validate requests, enforce size limits, and generate order IDs.
3. Stripe: create server-side Checkout sessions; fulfill only after signature-verified payment webhooks.
4. Database: persistent order state, payment references, consent records, and delivery status.
5. Object storage: private uploads, short-lived signed download URLs, malware/type checks, and deletion schedule.
6. AI worker: process only consented applicant content, preserve verified facts, require review of ambiguous claims, and produce DOCX/PDF.
7. Email: deliver secure links rather than attachments containing sensitive information.

## Order state machine

DRAFT -> CHECKOUT_PENDING -> PAID -> GENERATING -> REVIEW_REQUIRED / READY -> DELIVERED

Failures -> RETRY_PENDING or SUPPORT_REQUIRED; refunds and chargebacks handled independently.

## Launch gates

No production checkout until database, webhook idempotency, authorization, retention, and end-to-end tests are complete. No claim of guaranteed interviews or hiring. Admin routes require separate authentication.
