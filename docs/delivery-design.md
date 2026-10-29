# Customer document delivery design

Current modules generate printable HTML and plain text from a validated draft object. No server endpoint, customer account, document upload, DOCX/PDF, email or payment exists yet.

## Recommended production workflow
1. Customer gives consent and uploads information through an authenticated or single-use session.
2. Server validates input, strips unnecessary sensitive information and stores it in private encrypted storage with a retention limit.
3. Queue a generation job, enforce cost/rate limits, and log only non-sensitive job metadata.
4. AI returns a structured draft; applicant reviews and edits each factual claim.
5. Generate DOCX and PDF server-side using maintained libraries; test layout and PDF text extraction.
6. Store generated files privately, then issue short-lived authorized download links.
7. Email a notification without attaching personal documents or including private details.
8. Support revision requests, expiry, deletion and failed-job recovery.

Do not rely on local Railway filesystem for persistent order storage. Do not expose an unauthenticated endpoint that processes customer resume data. Payments will be integrated last.
