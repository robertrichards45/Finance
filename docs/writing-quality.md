# Writing and release standard

The builder plans and the optional premium application package share the same factual writing standard. Price is not a substitute for verified output. The public plan prices remain unchanged by this update; subscription entitlement and billing are separate unfinished launch work.

## Implemented workflow

1. Gather the actual target announcement and structured employment facts. The intake prompts for actions, tools, audience, scope and verified results. Unknown metrics should be omitted.
2. Write a tailored resume and a distinct cover letter using only supplied applicant facts. Federal, executive, entry-level and career-change tracks have different writing guidance. A two-page resume limit is a maximum; thin facts are not padded.
3. Validate exact supporting quotes and whole numeric tokens. A `9` is not supported by a source that only says `99`. Dates and hours are supplied by the document renderer.
4. Make a separate AI editorial request checking accuracy, targeting, specificity, the cover letter and readability. It compares the actual claims, not merely whether an evidence quote exists. Map important requirements to exact applicant sources or disclose an experience gap. No hiring prediction, eligibility determination or ATS score is produced.
5. If review fails, make one repair attempt and review again. Four provider requests is the maximum for a generation attempt. A persistent editorial failure does not automatically enter another three-attempt writing loop; it fails for attention without releasing files.
6. Render Word and PDF from the same content. Check page limits and extracted text. Work history is rendered in reverse chronological order. The customer's selected design, font and spacing are retained.
7. Customer changes require a new editorial check before replacement files are saved. Final factual confirmations and resolution of verification questions remain mandatory. Draft downloads remain disabled. Old drafts without the editorial pass cannot be approved.

The reviewer is another request to the configured AI model, not a human editor or an independent ground-truth service. Semantic accuracy and editorial judgment remain fallible. A review pass is necessary but does not certify accuracy. The applicant must inspect every claim and all application instructions.

## Budget and operations

The existing generation-attempt quota remains. A persistent additional quota caps all writer/reviewer requests, including manual-edit reviews, at `MAX_AI_JOBS_PER_DAY * 4` per UTC date (80 requests with the default 20). Quota reservation occurs before each request. This is not a dollar cap. Provider spend limits are still required. Worker interruption detection allows five minutes for writing, review and rendering.

## Verification

`tests/application-quality.test.js` checks unsupported numbers, inflated responsibility caught by the reviewer, repair/re-review, bounded failures, requirement/evidence validation, bad review structure, contact omission, duplicates, placeholders and the provider-request quota. These use controlled responses and do not establish real-model writing quality. Workflow tests verify manual-edit review and approval gates. The deterministic Word/PDF fixture is visually inspected separately.

Before charging, use fictional but realistic federal, private-sector and career-change applications with the live provider, inspect the resulting files and requirement map, and complete revision/delivery tests. Do not claim these manual acceptance tests passed until recorded.
