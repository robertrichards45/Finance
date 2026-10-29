# Repository audit and implementation

Audited both branches (`main`, `feature/order-intake-preview`), draft PR #1, repository metadata, and Actions for head acf9e0f2cae5d881663751b5cf82fa51897cf84f. The original main branch was a static landing page served by a small Node HTTP server. The draft PR contained disconnected helper modules and browser-only intake. Its last Actions run 40818668149 passed; the original local suite passed 37 tests.

## Findings addressed

- No persistent intake, authentication, ownership enforcement, background workflow, administration or delivery endpoints existed. Added these with fail-closed launch gates.
- Original document generation mixed resume, cover letter and verification items into one draft. Added separate deliverables and rendered Word-to-PDF page validation.
- Original AI adapter accepted JSON mode with no connection to orders. Added a separate strict-schema adapter tied to jobs and source-evidence validation. Preserved existing helpers and tests for compatibility.
- No package lock existed. Added a lockfile, Node 24 runtime and repeatable CI/Docker dependency installation.
- Added bounded upload parsing, scanner-required Word/PDF intake, consent checks and upload limits.
- Replaced outdated roadmap-only documentation. Existing historical helper documentation remains as background; current README and deployment guide are authoritative.

## Remaining launch blockers

Railway's Finance Variables page showed **No Environment Variables** during the audit. A durable volume and provider setup have not been verified. Actual OpenAI responses, verified transactional email delivery, live customer authentication, malware-scanner connectivity, backup/restore, and the complete live acceptance workflow remain unverified. Public operator/support contact and final commercial policies must be supplied before launch. Payments remain disabled and unimplemented.

Repository visibility is public. No real credentials or applicant documents were added. Source visibility does not expose encrypted customer data when storage is configured correctly, but private visibility is recommended before commercial operation. Visibility was not changed.

## Operational limitations

Single instance and single replica only: the in-process worker and SQLite volume are not a distributed queue. Increase architecture capacity before scaling horizontally. DOCX pagination varies between viewers; the delivered PDF is the server-rendered Word output. Automated source and number checks cannot prove every semantic claim; explicit applicant verification remains required. Imported resume text is supporting context: customers must confirm structured employment history. No automated external job-URL fetch is enabled. No live AI quality claim is made from mocked tests.
