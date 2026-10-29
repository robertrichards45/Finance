# Deployment and rollback

## Existing deployment

Repository: robertrichards45/Finance. Railway project: optimistic-fascination; service: Finance; environment: production. Primary origin: https://resumebuilder.shop. Existing generated domain: https://finance-production-8730.up.railway.app. Custom domains target application port 8080.

## Controlled prelaunch deployment

1. Run Node 24 tests, upload/parser checks, actual Word/PDF rendering, dependency audit and syntax checks.
2. Push the existing development branch and inspect PR #1 and its Actions result.
3. Merge only the tested commit. Railway deploys main automatically. The Dockerfile supplies Node 24, LibreOffice and Poppler.
4. Verify `/health`, `/api/config`, marketing pages and disabled intake on the custom domain. Do not set `INTAKE_ENABLED=true` or `LAUNCH_APPROVED=true` for this prelaunch release.
5. Verify www HTTPS and its 308 canonical redirect once Railway DNS/certificate validation completes.

## Configuration needed for customer acceptance tests

Use Railway's Variables UI. Never paste secrets into chat or commit them. No new subscriptions or volume charges are approved by this change.

- Attach one persistent volume at `/data`; confirm `RAILWAY_VOLUME_MOUNT_PATH` is supplied automatically. Configure `DATA_DIR=/data`. Keep exactly one replica.
- Set `DATA_ENCRYPTION_KEY` to 64 cryptographically random hexadecimal characters. Back it up separately from the database. Losing it makes customer records unreadable.
- Set `AUTH_SECRET` to a separately generated random value of at least 48 characters. Rotation invalidates sessions and account identifiers; migration is required if orders already exist.
- Set `OPENAI_API_KEY` for a funded/restricted project and `OPENAI_MODEL=gpt-5.6-terra` (or another tested strict-schema compatible model).
- Set `RESEND_API_KEY`, a verified-domain `EMAIL_FROM`, and the intended `ADMIN_EMAIL`. Confirm domain SPF/DKIM with the actual email provider before sending.
- Optional `CLAMAV_HOST` and `CLAMAV_PORT` point to a private, updated ClamAV daemon. Until configured, uploads accept plain text only and refuse DOCX/PDF.
- Set retention (1–90 days, default 30), `MAX_AI_JOBS_PER_DAY` (default 20, capped at 100), and proposed `PACKAGE_PRICE_CENTS` (default 9900).
- Use an isolated acceptance environment with synthetic data to complete provider-backed tests. Only after the operator verifies readiness set both `LAUNCH_APPROVED=true` and `INTAKE_ENABLED=true`. Neither flag activates payments.

The readiness gate checks configuration presence and volume path; it cannot verify provider billing, domain verification, backup recovery, or legal policy completion. These require the acceptance checklist.

## Backups and recovery

Before public launch, enable encrypted Railway volume backups or implement an approved backup destination and retention schedule. A SQLite snapshot must use the SQLite backup API or a stopped application, not a blind live copy of only the main database file. Back up the data encryption key independently with restricted access. Restore to an isolated environment; verify sign-in, decrypt a synthetic order, compare document hashes, and test deletion. Backup configuration and restore have not been completed in this release.

## Rollback

Keep the previous Railway deployment available. For a bad web deployment, redeploy the last healthy version through Railway Deployments; original main was c0613616bc91c02af4a22ec30fb42442e6bc3e64. Keep intake paused while investigating. Rolling back to the old landing page stops the new APIs; do not remove or overwrite the persistent volume or encryption keys. This release's additive SQLite schema sets user_version=1. Never log applicant payloads or secrets while troubleshooting.
