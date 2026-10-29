# Order state and privacy controls

The current state-machine code models a future workflow: draft → consented → queued → generating → review → approved → delivered. Failed jobs can be retried; deleted jobs cannot transition. The order ID is generated with cryptographic randomness.

This is **not** a production order service. There is no database, authentication, authorization, upload endpoint, or secure document storage yet. An unpredictable ID is not a substitute for authentication. The customer review checklist is a server-side helper, not a verified customer approval event until a secure session is implemented.

Before accepting real customer information: implement authenticated sessions or expiring signed access tokens, CSRF protections, strict authorization checks, encrypted storage with retention limits, data deletion, audit events without PII, malware scanning for uploads, and abuse protection. Never expose raw order details by ID alone.

Payments remain the final phase.
