# CareerLaunch Managed Payments

## Plans and provider configuration

Existing USD prices are preserved: access7 $4.99 once for seven days, monthly $12.99/month, annual $59.99/year. The legacy $99 product remains separate and cannot be selected through the new billing API.

Every new checkout explicitly sends `managed_payments: { enabled: true }`. There is no fallback to ordinary merchant-owned Checkout. The SDK is pinned to Stripe 23.0.0 and API version 2026-09-30.endive. Stripe controls tax, payment methods and Adaptive Pricing; the code does not pass `automatic_tax`, `payment_method_types` or `adaptive_pricing`. A fetched session/subscription must report Managed Payments enabled before access can be granted.

Sandbox resources:

| Plan | Product | Price |
| --- | --- | --- |
| Seven days | prod_VWqQLc1dbdM6R5 | price_1UVmjUBxDlvv3BXb5Hm6965b |
| Monthly | prod_VWqQJdui6wCp2l | price_1UVmjWBxDlvv3BXbmjLrxt0I |
| Annual | prod_VWqQoNpXPpIOcL | price_1UVmjYBxDlvv3BXbkZyZoGAy |

The sandbox product tax classifications are SaaS personal use (`txcd_10103000`) for manual access and cloud AI personal use (`txcd_10105001`) for Pro. The exact identifiers/descriptions were retrieved from Stripe's Tax Codes API. These sandbox choices are not a legal determination for live products. The owner must confirm the actual product classification and Stripe's Managed Payments eligibility before live activation. The self-service product is automated; a future human coaching/consulting offer must be assessed separately.

Cancellation/payment-method/invoice portal configuration: `bpc_1UVn1WBxDlvv3BXbzmYpQJ0G`, sandbox only. Cancellation is at period end, preserving verified paid access until expiry. Plan upgrades/proration are not enabled; finish or cancel the existing access before buying a different plan. Customers also receive Managed Payments transaction management through Link.

## Required Railway variables

- `STRIPE_MODE=sandbox` initially; account ID and all three `STRIPE_PRICE_*` bindings must match that environment.
- `STRIPE_ACCOUNT_ID`, `STRIPE_PRICE_ACCESS7`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PORTAL_CONFIGURATION_ID`.
- `STRIPE_SECRET_KEY`: a restricted test API key with the necessary Customer, Checkout, Price, Account-read, Invoice/InvoicePayment, Subscription, Charge and Portal permissions. Store privately in Railway; never chat, source control or logs.
- `STRIPE_WEBHOOK_SECRET`: existing sandbox endpoint secret. Updating its event list does not rotate the secret.
- `PAYMENTS_ENABLED=false`, `LIVE_PAYMENTS_APPROVED=false`, `INTAKE_ENABLED=false`, `LAUNCH_APPROVED=false` during preparation.
- Existing encrypted persistent storage, authentication, AI and verified transactional-email settings remain required.
- `AI_DRAFTS_PER_MONTH=10`: Pro generation/revision requests per UTC calendar month; manual editing does not consume that allowance. Generation retries are separately bounded. Editorial saves have a 30/day allowance plus the existing global provider-request cap.

`STRIPE_MODE=live` requires matching live resources/key, an account with charges enabled, `LIVE_PAYMENTS_APPROVED=true`, the completed launch gates and explicit `PAYMENTS_ENABLED=true`. No flags were enabled by this implementation.

## Private deployed sandbox testing

The owner can test before public launch using `SANDBOX_TEST_ENABLED=true` and `SANDBOX_CHECKOUT_ENABLED=true`, while keeping all four launch/live flags false. These switches work only with sandbox Stripe resources and complete infrastructure/email credentials. Open `/portal?qa=1` and request a sign-in link for the configured administrator email. Non-administrator login requests receive the same generic response but no email or access. An authenticated administrator gets sandbox intake/checkout; unauthenticated visitors and ordinary accounts remain closed. No live keys or live charges can use this QA path. Keep these QA flags off until the private credentials and sender are configured.

## Ownership, events and access

Customer IDs are created by the server and mapped to authenticated owners in encrypted storage. Client input selects only a known plan, never a price, customer, amount or entitlement. Provider account, price amount/currency/interval, customer ownership, quantity, mode and Managed Payments state are validated. Checkout uses a durable idempotency key and one pending attempt per owner. A browser success redirect grants nothing.

The raw-body signed webhook handles the exact event names exported by `lib/billing.js`. It retrieves current Stripe objects rather than trusting stale event snapshots. Subscription grants need a paid matching invoice and its verified line-item period. Renewal and cancellation update that grant; unpaid/paused/canceled states cannot grant access. Duplicate events do not extend access. Seven-day access starts at first verified fulfillment and does not renew. Checkout tax is checked separately from the unchanged base plan price. Local presentment currency does not replace the integration's USD price.

Refunds, disputes and fraud warnings suspend access for review. Subscription linkage follows Charge -> PaymentIntent -> InvoicePayment -> Invoice -> Subscription. Risk handling schedules cancellation at period end and notifies the operator. Winning one dispute does not clear another refund/fraud hold or silently restart renewal. The customer can still reach billing management. Refund decisions/evidence submission remain with Stripe and the operator; this code does not automatically issue refunds.

Billing records and event identifiers persist separately from the 30-day applicant-document cleanup to prevent replay/duplicate fulfillment and manage renewals. Deleting an application does not cancel a subscription; use billing management. Billing account deletion requires an operator workflow, not direct database-file deletion.

## Verification and remaining acceptance

Stripe accepted real sandbox Managed Payments Checkout creation for all three existing prices, including flexible subscription billing. Hosted monthly Checkout visibly showed the Sandbox badge, $12.99/month and Sold through Link. Its form was filled with fictional details and Stripe's public test card, with Link information saving disabled. **The final payment was not submitted:** automatic browser approval rejected even the sandbox submission and requires the user to click the final payment action. Do not bypass that gate using another tool.

Automated tests use controlled Stripe responses, real webhook signing verification, encrypted SQLite and actual Word/PDF rendering. They cover purchase ownership/CSRF, unpaid and mismatched purchases, replay/idempotency, paid access, invoice renewal, cancellation, risk suspension, file access and manual-only versus AI plans. They are not a substitute for the actual hosted purchase -> application login -> provider webhook -> documents test.

Before charging: configure the backend API key and verified email sender; let the user submit the sandbox payment; complete the full customer browser workflow, recurring renewal/failure/cancellation and refund acceptance; inspect actual Stripe invoice/tax behavior and webhook delivery; complete operational backup/support/policy review; connect/approve the live account and classifications. Keep all launch flags off until these pass.

Primary references: https://docs.stripe.com/payments/managed-payments/set-up, https://docs.stripe.com/payments/managed-payments/eligibility, https://docs.stripe.com/payments/managed-payments/update-checkout, https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing, https://docs.stripe.com/billing/subscriptions/webhooks.

Sandbox and live customer mappings, entitlements, events and payment ledgers use separate storage namespaces. Sandbox receipts are excluded from live revenue reports.
