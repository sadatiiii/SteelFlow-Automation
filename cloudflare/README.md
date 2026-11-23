# TABCO on Cloudflare

Target architecture: Cloudflare Pages for the existing website, a Python Worker for the API, and D1 as the canonical database.

- Pages: public TABCO site and admin interface.
- Python Worker: API and server-side business logic.
- D1: leads, email history, orders, and append-only activity history.
- Gemini API: server-side email drafting; keep its key in Worker secrets.
- Email delivery: implement after choosing a Cloudflare-compatible provider. Do not assume raw SMTP sockets are available inside Workers.

## Current status

- The D1 database `tabco-db` has been created and the initial schema was applied manually in the Cloudflare D1 SQL Console.
- The six application tables are present: `leads`, `emails`, `orders`, `activity_log`, `admin_users`, and `admin_sessions`.
- `worker/main.py` includes a health endpoint that checks the D1 binding and required schema.
- `POST /api/inquiries` is implemented but deliberately disabled by default. Do not enable it until abuse protection (for example, Turnstile and/or rate limiting) is configured.
- Authentication, admin CRUD, Gemini integration, email delivery, frontend migration, and data import are still pending.
- This Worker has not yet been deployed or connected to the live Pages site.

## Worker configuration

The Wrangler configuration is at `worker/wrangler.jsonc`. It references the existing D1 database through the `DB` binding and points migrations to `../migrations`.

The schema has already been applied through the dashboard SQL Console. Do not run the initial migration again unless you have first checked migration state and understand the effect.

## Data migration safety

The existing Google Sheets workbook remains untouched during development. Export the `Leads` and `Emails` tabs to CSV and keep an independent backup before importing. D1 becomes authoritative only after import and verification. Do not delete the old spreadsheet.

## Data model

- `leads`: all leads, regardless of status.
- `emails`: drafts and sent-message history, linked to a lead.
- `orders`: current order state, optionally linked to a lead.
- `activity_log`: append-only event history; each event can reference a lead and an order.
- `admin_users` and `admin_sessions`: server-side authentication records.

The admin UI must not store leads, emails, orders, credentials, or session tokens in localStorage. Use secure, HttpOnly cookies for sessions.
