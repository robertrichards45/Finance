# Free audience launch package

Published pages:
- /guides — the guide hub.
- /examples — three captioned one-minute example videos, downloads and transcripts.
- /federal-resume-guide — updated focused two-page guide.
- /military-to-civilian-resume
- /resume-employment-gaps
- /federal-police-resume

Videos are educational caption cards with fictional facts, not a recording of a live AI generation or a customer result. No audio, external music, paid generation service or customer information is used. Each MP4 is H.264, 720×1280, 24 fps and 60 seconds. The media includes a branded link-preview image.

The accompanying launch-posts.md has six ready-to-share posts, three video captions, a suggested two-week sequence and tagged links. No messages or social posts have been sent. No advertising budget was spent. Recruiting actual testers requires sharing these invitations with real people; no testers or testimonials have been invented.

The administrator dashboard now reports fixed, allowlisted source categories for estimated first visits observed in a week. No arbitrary UTM text, résumé content or contact details are stored. GPC removes source attribution and optional click events. Aggregate builder CTA and plan-selection clicks are not verified purchases and are not cross-account attribution.

During acceptance review, two broken HTTP import routes were found and corrected: /api/job-import had been wired to file upload extraction, and /api/import-resume was absent. Job import now uses the SSRF-protected importer with consent and per-account rate limits; structured résumé import requires Pro entitlement and consumes the shared AI allowance. New authenticated HTTP tests verify correct routing and unpaid protection. Real-provider structured extraction and public email/payment-to-delivery acceptance remain separate requirements.

Tests: 180 passed, 0 failed locally on Node 24. Public sender-domain readiness could not be freshly verified by a local DNS lookup because the resolver refused the queries; this is not evidence that DNS records exist or are absent. The previous verified sender-domain blocker remains unresolved until actual provider verification.

Before paying for traffic, complete verified public email and real-provider payment-to-delivery testing. These pages offer useful free reading and clearly disclose paid features. Sitemap inclusion makes them discoverable; indexing and traffic are not guaranteed.
