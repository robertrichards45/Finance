# CareerLaunch AI

Existing Finance application deployed on Railway at https://resumebuilder.shop. This release contains a commercial prelaunch site and a gated customer workflow. **It is not approved for public customer processing or payments.**

## Run and verify

Use Node 24, LibreOffice Writer, Poppler and Liberation fonts. The Dockerfile installs the document tools for Railway. Run `npm ci --ignore-scripts`, `npm test`, then `npm start`. `node scripts/verify-documents.js` creates four fictional QA documents under ignored `test-output/`.

## Implemented

- Marketing, service, intake, customer portal, administration, and policy pages.
- Email-link authentication, HttpOnly cookies, CSRF and ownership checks.
- AES-256-GCM encrypted SQLite records on a configured persistent volume.
- Bounded AI queue, source-evidence checks, factual review, revisions, failed-job retries and operational reporting.
- Four separate editable Word/PDF documents; final PDFs are rendered from Word and checked for page limits.
- Restricted text uploads; DOCX/PDF require ClamAV and isolated bounded parsing.
- Private, expiring, single-use downloads; retention cleanup and application deletion.
- Transactional email outbox with retries and visible failures.

## Launch gates

See [deployment](docs/deployment.md), [audit](docs/audit.md), and [acceptance](docs/acceptance.md). Missing configuration keeps customer processing disabled. Checkout has no active route or payment integration.
