# TABCO — D1-first architecture

## Canonical data store

All business data for the TABCO website and admin workspace belongs in one Cloudflare D1 database:

- Database: `tabco-db`
- Database ID: `df8d72a4-3e88-4881-9cd4-5f722d288b79`
- Binding name used by Pages Functions: `DB`

The public inquiry form, CRM, customer profiles, orders, email drafts/history, and activity timeline all use this binding. No business records are stored in browser storage. Google Sheets is a backup/export source only and is not queried by the application.

## Runtime

- Cloudflare Pages serves the website and all API routes under `/api/*`.
- Pages Functions access D1 through `context.env.DB`.
- There is no `AUTOMATION_API_ORIGIN` and no external API proxy.
- `functions/api/inquiries.js` writes public inquiries to D1.
- `functions/api/[[path]].js` implements the authenticated admin API.
- `cloudflare/worker/` is an earlier Python Worker prototype, not used by the current Pages frontend.

## Required Cloudflare Pages configuration

In the Pages project for `tabcoyazd.ir`, configure:

1. Settings → Bindings → D1 database bindings.
2. Add a binding with variable name exactly `DB`.
3. Select the existing database `tabco-db` (ID above).
4. Apply to Production. Also apply to Preview only if preview deployments will be used.
5. Save and trigger a new deployment.

The application intentionally returns HTTP 503 when this binding is missing. It must never fall back to Google Sheets or local browser storage.

Add a Pages secret named `ADMIN_SETUP_KEY` before first admin initialization. Use a long random value and keep it private. Open `/admin/`, choose “راه‌اندازی اولیه؟”, and use that key to create the first admin account. The API only permits this operation while the `admin_users` table is empty. The password is stored as a PBKDF2 hash with a random salt; sessions are opaque, hashed in D1, and delivered through Secure, HttpOnly, SameSite=Strict cookies.

## D1 schema

The existing schema was already applied manually through the D1 SQL Console. Application tables:

- `leads`
- `emails`
- `orders`
- `activity_log`
- `admin_users`
- `admin_sessions`

Do not rerun the initial migration on the existing database without checking its current state.

## Current application behavior

- Public inquiry: validates and inserts into `leads` and `activity_log` in one D1 batch; duplicate email submissions do not overwrite an existing CRM record.
- CRM: lists all leads, searches them, and shows linked orders, email history, and activity.
- Orders: create, edit, search, archive (not hard-delete), and append activity records.
- Emails: create and edit drafts, retain sent-message records, and list history. Sending is deliberately disabled until a Workers-compatible email provider is configured and human approval flow is tested.
- Activity: add and browse timeline events.
- Authentication: first-admin bootstrap requires `ADMIN_SETUP_KEY`; login uses PBKDF2 password verification and D1-backed sessions.

## Production hardening still required

Before using the system with real customer data:
- Add Cloudflare Turnstile and rate limiting to the public inquiry endpoint.
- Add login rate limiting and review session expiry/revocation behavior.
- Configure and test a transactional email provider before enabling sending.
- Test every route against the production D1 binding and verify the live deployment.
- Export the existing Google Sheets Leads and Emails tabs and preserve an independent backup before any import. Import only after mapping and deduplication are reviewed.

The old Google Sheets workbook must remain untouched as a backup until a verified migration is completed. Do not create an Orders tab or make Sheets the primary data source.
