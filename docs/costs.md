# Operating cost estimate

Planning estimates checked October 29, 2026. A 1 GB Railway volume was subsequently approved and provisioned. Live payment collection remains disabled.

- Railway container resources: $10 per GB RAM/month, $20 per vCPU/month, $0.05 per GB egress; persistent volume storage $0.15 per GB/month. The existing Hobby plan has a base subscription with included usage. A small low-volume service might fit a $5–20/month planning range, but actual CPU, memory, rendering, backup and scanner usage determine the bill. Other services in the account add to the same overall spend.
- SQLite has no separate database subscription. Encrypted records and generated files share the private persistent volume. A dedicated malware scanner and backups add hosting/storage usage; they have not been provisioned.
- Resend Free lists 3,000 transactional emails/month and 100/day. Paid plans start at $20/month. Use a verified sending domain. Do not enable a paid plan or overages without approval.
- The new adapter defaults to GPT-5.6 Terra, a configurable model supporting strict structured output. Listed input/output rates are $2/$12 per million tokens. An illustrative call with 4,000 input and 2,000 output tokens costs $0.032; 100 such calls cost $3.20. Writing now uses a writer plus a separate editorial review, with up to two repair/review cycles when needed: two to six requests per generation attempt. Revisions, retries and manual-edit reviews add usage. The worker caps generation attempts at 20/day by default and the persistent provider-request quota is 80/day across these operations. These are request-count budgets, not guaranteed dollar caps. Set provider project spend limits separately. Actual applicant length, reasoning and output usage vary.

A $1,000 startup budget does not need to be spent up front. Preserve most of it while testing demand; hosting and AI usage are recurring costs, and traffic or revenue is not guaranteed.

Sources:
- https://docs.railway.com/pricing/plans
- https://resend.com/pricing
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
