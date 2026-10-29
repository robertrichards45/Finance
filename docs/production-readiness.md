# CareerLaunch AI production readiness

The live landing page is prelaunch only. This branch adds a browser-only sample intake and a server-side input validation module with Node built-in tests. It does **not** accept real orders.

## Launch blockers
- Verify Railway live domain and deployment health externally.
- Restrict repository visibility and audit secrets.
- Build authenticated or unguessable order sessions, consent, retention and deletion policy, rate limits, upload scanning and storage.
- Integrate Stripe Checkout server-side and verify webhook signatures. Never treat redirect success as proof of payment.
- Integrate AI provider server-side; require fact-only generation and user review.
- Generate DOCX and PDF, securely deliver links with expiration, send transactional email, and handle failed jobs.
- Add automated tests for payment, authorization, privacy, document generation and retries.
- Publish terms, privacy notice, refund policy and support contact before taking money.

Do not collect sensitive customer information until secure storage and access controls exist. No API keys or payment secrets belong in the public GitHub repository.
