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
