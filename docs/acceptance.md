# Acceptance evidence and remaining tests

## Automated synthetic coverage

The test suite covers the retained helper modules, readiness gates, encrypted persistence and tamper detection, one-use login links, session expiry, ownership, CSRF, order creation, bounded generation retries, revisions, factual approval, single-use authorized downloads, retention deletion, support visibility, email retry failures, upload validation, real Word/PDF extraction and rendering. Provider calls and email transport are injected fixtures in these tests. No fabricated provider success is used in production.

`node scripts/verify-documents.js` writes fictional files. Render them using LibreOffice and inspect all pages. Verify PDF text and two-page resume/one-page cover limits. The worker uses the same Word renderer in production; a render failure prevents review/delivery.

## Required before customer-ready status

- Persistent `/data` volume and production configuration were inspected. Verify a controlled production restart/persistence drill without altering customer records.
- Verify a real email sign-in link, one-time consumption, recovery by a new email link, and intended administrator access.
- Submit synthetic intake through the live browser, upload a sample resume, supply the target job description, and generate with the actual AI provider.
- Check factual output manually, ask for a revision, resolve questions, approve, and download all four final files.
- Confirm real notification delivery and administrator reporting. Exercise provider failure and retry visibility.
- Connect and test the real malware scanner with the standard EICAR test and safe DOCX/PDF fixtures before enabling binary uploads.
- Test mobile forms, keyboard navigation, contrast and assistive-technology flow. Desktop guided entry and browser-tab recovery were tested; this does not validate a mobile viewport or an authenticated delivery workflow.
- Complete backup/restore drill, publish the operator's public contact and final policies, and review customer data processing arrangements.
- Live hosted Checkout and signed lifecycle processing are implemented. The connector exposes only the live account; real-provider sandbox completion, cancellation and renewal tests require a sandbox connection. Completed-payment-to-delivery remains unverified. Never substitute mock events or a Checkout HTTP 200 for payment proof.

## Writing review update

See [writing-quality.md](writing-quality.md) for the separate editorial request, one repair/re-review cycle, exact evidence mapping, manual-edit checks and per-request quota. The deterministic suite now covers these gates; actual model acceptance remains distinct from mocked provider tests. Portal JavaScript and a malformed server-test expression were repaired so the customer screens and regression suite can run.

## Live provider probe — October 29, 2026

Railway deployment `aa814ced-a317-4e9a-b375-5349eca7743c` ran `scripts/verify-writing.js` successfully against the configured OpenAI provider. The hard-coded fictional federal Program Analyst application completed writing and a separate editorial request without repair, used 4,358 reported total tokens, and rendered all four files (one-page resume PDF and one-page cover PDF). Review of its logged fictional text confirmed the supplied 12-person scope and assisted role were retained; SQL was disclosed as a gap and requested as a clarification rather than invented. This was a server-side probe, not an email sign-in/Checkout/delivery acceptance test. Its requirement map also exposed an administrative date/hour instruction being paired with unrelated duties evidence; the follow-up calibration excludes such instructions from the experience map and has a regression test. The temporary Railway pre-deploy probe was removed after the test to avoid recurring provider calls on ordinary deployments.

## Production finish regression results — October 29, 2026

The local Node 24 suite now passes 177/177 tests, including free unpaid drafts and conflict protection, SSRF defenses, editorial factual gates, invalid source-map retries bounded to three attempts, section-only revisions, exact-source import proposals, federal target grade/series isolation, manual saving after AI quota exhaustion, encrypted SQLite snapshot/restore and advertising gates. Dependency audit: zero known vulnerabilities.

Fourteen production public routes, enabled intake/live Checkout configuration, sitemap, security headers and blocked private source/database paths passed the live smoke script. This does not authenticate a customer or verify payment. The source-map regression was found through a real provider acceptance failure; failed deployments left the prior successful version live.

DOCX/PDF fixture generation produced twelve files across classic, sidebar and bold designs. LibreOffice renders of the classic resume/letter and sidebar/bold resumes were visually inspected at one page each without clipping or overlapping text. This is fictional fixture QA, not a claim that every applicant history or font choice has been inspected.

Public email is a launch blocker: EMAIL_FROM remains on restricted `resend.dev`; resumebuilder.shop was registered in Resend but DNS verification is `not_started`. Domain records are prepared, but Namecheap authentication is required. Queued/accepted email is not confirmed delivery.

See [production-audit-2026-10-29.md](production-audit-2026-10-29.md) and the later acceptance report for exact commit/deployment/provider results and remaining work.

## Current provider acceptance — October 29, 2026

Commit `8fac1de92811859899d92e78c6f5c8c084e9bbc6`, Railway deployment `8dd444f0-3cba-4247-9122-08fb9f71d487`: SUCCESS. Logs contain CAREERLAUNCH_PROVIDER_PROBE_PASS, both case results, application startup and Stripe catalog verification.

- Federal specialized experience: 5,241 reported total tokens across writing/review/repair; 1-page resume and 1-page letter, all four DOCX/PDF files. SQL correctly recorded as a gap. Assisted responsibilities and supplied 12/99 numbers retained.
- Private career change: 10,136 reported total tokens across writing/review/repair; 1-page resume and 1-page letter, all four DOCX/PDF files. Editorial review corrected the generic Scheduling skill to shift-availability communication; no scheduling authority or confidential-records experience was invented.

Exact successful input/draft pairs were replayed through the same local DOCX/LibreOffice renderer; the resulting four PDF pages were visually inspected. No clipping, overlaps, duplicate closing, missing heading or unreadable text was observed. Reported token usage is not an invoice or average production cost, and these two examples do not establish quality for every applicant. The temporary pre-deploy command was removed after the successful test.

Production /health reports backupStatus=ok and a stored snapshot timestamp. This verifies a local snapshot was recorded, not an off-volume production restoration drill.
