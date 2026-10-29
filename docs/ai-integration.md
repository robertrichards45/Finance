# AI drafting integration — preparation only

The module lib/ai-draft.js builds fact-constrained chat messages and validates structured JSON output. It does not call any AI API or expose an endpoint.

Before enabling generation:
- Select a provider and configure its API key as a Railway environment variable, never in GitHub or client-side code.
- Add a server-side authenticated order/job endpoint with body-size limits, rate limits, abuse controls and consent.
- Avoid logging submitted resume content, job postings or AI output.
- Use strict response validation, timeouts, bounded retries and cost limits.
- Implement human review: even valid JSON may contain fabricated facts, so the applicant must verify the draft.
- Add DOCX/PDF generation and secure delivery only after authorization and retention controls are in place.
- Keep payment disabled until everything above is tested.

lib/draft-export.js currently provides escaped printable HTML and plain text, not Word/PDF file generation.
