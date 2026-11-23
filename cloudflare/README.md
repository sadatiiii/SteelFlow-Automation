# TABCO Cloudflare architecture

## One source of truth

The canonical data store for the whole TABCO website and admin system is the existing Cloudflare D1 database:

- Database: `tabco-db`
- Database ID: `df8d72a4-3e88-4881-9cd4-5f722d288b79`
- Pages Functions D1 binding name: `DB`

The public inquiry form, CRM/leads, email drafts and history, order tracking, and activity timeline must all read/write through the same Pages Functions API and the same `DB` binding.

Do not use Google Sheets as an application database. Do not store business records, credentials, or admin sessions in browser storage. Google Sheets is retained only as a manual backup until a verified export/import process is completed.

## Runtime

- Cloudflare Pages serves the website and its API under `/api/*`.
- Pages Functions use `context.env.DB` to access D1 directly.
- There is no `AUTOMATION_API_ORIGIN` setting and no external API proxy.
- `functions/api/[[path]].js` is only a not-found fallback; each API endpoint has its own Pages Function route.
- `cloudflare/worker/` is an earlier Python Worker prototype. It is not the live Pages API and must not be treated as deployed or connected.

## Existing database

The initial schema has already been applied manually in the D1 SQL Console. The application tables are:

- `leads`
- `emails`
- `orders`
- `activity_log`
- `admin_users`
- `admin_sessions`

Do not re-run the initial schema migration against the existing database without checking its current state first.

## Pages D1 binding

The Pages project must have a D1 binding named exactly `DB` pointing to the existing `tabco-db` database. Configure it in Cloudflare Pages under Settings → Bindings → D1 database bindings, for the production environment (and Preview if previews are used), then redeploy. The Pages Function will return a clear 503 if this binding is absent; it must never silently fall back to Sheets or browser storage.

## Security and unfinished work

- Public inquiry submissions are validated and inserted into `leads` and `activity_log` in a D1 batch.
- Duplicate email addresses are detected against existing non-rejected leads; existing CRM records are not overwritten by a public form submission.
- Before treating the public form as production-ready, add abuse protection such as Turnstile and rate limiting.
- Admin login, secure HttpOnly sessions, leads/orders CRUD, email draft/history endpoints, Gemini drafting, and provider-based email delivery are still being implemented.
- Email delivery must require an explicit human approval. Do not send automatically.
- Never claim the admin pages are D1-backed until their browser code has been migrated and tested against the Pages API.

## Backup and migration

Keep the existing Google Sheets workbook untouched as a backup. Export and verify the Leads and Emails data before importing anything into D1. Do not create an Orders tab or make Sheets the primary data source.
