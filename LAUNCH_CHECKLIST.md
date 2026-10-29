# CareerLaunch launch checklist

The current payment implementation and sandbox resource bindings are documented in [docs/managed-payments.md](docs/managed-payments.md). This supersedes the legacy per-application test checkout.

- Configure the private Stripe backend test key and verified transactional-email sender.
- Complete the user-submitted hosted sandbox payment and the full customer sign-in, webhook, paid-access, generation/revision, factual approval and download flow.
- Test seven-day expiry, Pro renewals, failures, cancellation, refunds/disputes and restart persistence.
- Inspect actual tax invoices, localized presentment, notification delivery, backups/restore, support and final policies.
- Confirm live account and product eligibility with Stripe before changing any live configuration.
- Keep PAYMENTS_ENABLED, LIVE_PAYMENTS_APPROVED, INTAKE_ENABLED and LAUNCH_APPROVED false until acceptance passes.
