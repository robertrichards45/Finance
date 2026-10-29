# Acceptance evidence and remaining tests

## Automated synthetic coverage

The test suite covers the retained helper modules, readiness gates, encrypted persistence and tamper detection, one-use login links, session expiry, ownership, CSRF, order creation, bounded generation retries, revisions, factual approval, single-use authorized downloads, retention deletion, support visibility, email retry failures, upload validation, real Word/PDF extraction and rendering. Provider calls and email transport are injected fixtures in these tests. No fabricated provider success is used in production.

`node scripts/verify-documents.js` writes fictional files. Render them using LibreOffice and inspect all pages. Verify PDF text and two-page resume/one-page cover limits. The worker uses the same Word renderer in production; a render failure prevents review/delivery.

## Required before customer-ready status

- Configure persistent volume and credentials securely; verify restart persistence.
- Verify a real email sign-in link, one-time consumption, recovery by a new email link, and intended administrator access.
- Submit synthetic intake through the live browser, upload a sample resume, supply the target job description, and generate with the actual AI provider.
- Check factual output manually, ask for a revision, resolve questions, approve, and download all four final files.
- Confirm real notification delivery and administrator reporting. Exercise provider failure and retry visibility.
- Connect and test the real malware scanner with the standard EICAR test and safe DOCX/PDF fixtures before enabling binary uploads.
- Test mobile forms, keyboard navigation, contrast and assistive-technology flow. Browser checks of disabled prelaunch screens do not validate the enabled workflow.
- Complete backup/restore drill, publish the operator's public contact and final policies, and review customer data processing arrangements.
- Keep payment activation last. Hosted Stripe sandbox Checkout and signed payment recording are scaffolded. Live checkout, recurring-plan fulfillment, cancellation and refunds are not ready. Sandbox credentials and a full payment-to-delivery test remain required.

## Writing review update

See [writing-quality.md](writing-quality.md) for the separate editorial request, one repair/re-review cycle, exact evidence mapping, manual-edit checks and per-request quota. The deterministic suite now covers these gates; actual model acceptance remains distinct from mocked provider tests. Portal JavaScript and a malformed server-test expression were repaired so the customer screens and regression suite can run.

## Live provider probe — October 29, 2026

Railway deployment `aa814ced-a317-4e9a-b375-5349eca7743c` ran `scripts/verify-writing.js` successfully against the configured OpenAI provider. The hard-coded fictional federal Program Analyst application completed writing and a separate editorial request without repair, used 4,358 reported total tokens, and rendered all four files (one-page resume PDF and one-page cover PDF). Review of its logged fictional text confirmed the supplied 12-person scope and assisted role were retained; SQL was disclosed as a gap and requested as a clarification rather than invented. This was a server-side probe, not an email sign-in/Checkout/delivery acceptance test. Its requirement map also exposed an administrative date/hour instruction being paired with unrelated duties evidence; the follow-up calibration excludes such instructions from the experience map and has a regression test. The temporary Railway pre-deploy probe was removed after the test to avoid recurring provider calls on ordinary deployments.
