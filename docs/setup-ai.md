# AI integration setup

The server-side adapter in lib/ai-provider.js calls an AI model only when invoked by trusted server code. No public endpoint is enabled.

Set OPENAI_API_KEY in Railway environment variables only after secure intake, consent, authentication, rate limits, and retention controls are in place. OPENAI_MODEL is optional and must support JSON output. Never put credentials in GitHub or browser code.

lib/generate-documents.js produces DOCX and PDF buffers with docx and pdfkit, but does not save or deliver them yet. Customers must verify all facts. Payment integration is deliberately last.
