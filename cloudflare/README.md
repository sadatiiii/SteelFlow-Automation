# TABCO on Cloudflare

Target architecture: Cloudflare Pages for the existing website, a Python Worker for the API, and D1 as the canonical database.

- Pages: public TABCO site and admin interface.
- Python Worker: API and server-side business logic.
- D1: leads, email history, orders, and append-only activity history.
- Gemini API: server-side email drafting; keep its key in Worker secrets.
- Email delivery: implement after choosing a Cloudflare-compatible provider. Do not assume raw SMTP sockets are available inside Workers.

## Current scaffold status

This is an initial scaffold, not yet a production replacement for the existing FastAPI backend.

- `worker/main.py` provides a D1-backed health check.
- `worker/wrangler.jsonc` declares the D1 binding. Replace its database ID only after creating the database.
- `migrations/0001_initial_schema.sql` defines the initial relational schema.
- Authentication, CRUD endpoints, Gemini integration, email delivery, frontend migration, and data import are still pending.

## Create D1

From the repository root, create the database:

```bash
npx wrangler d1 create tabco-db
```

Copy the returned database ID into `cloudflare/worker/wrangler.jsonc` in the `database_id` field. Never commit API keys, passwords, or other secrets.

Apply the migration only after verifying that the newly created database is empty:

```bash
npx wrangler d1 migrations apply tabco-db --remote --directory=cloudflare/migrations
```

Local development:

```bash
cd cloudflare/worker
uv run pywrangler dev
```

Deployment comes only after the D1 binding and migration are configured:

```bash
uv run pywrangler deploy
```

## Data migration safety

The existing Google Sheets workbook remains untouched during development. Export the `Leads` and `Emails` tabs to CSV and keep an independent backup before importing. The new D1 database becomes authoritative only after import and verification. Do not delete the old spreadsheet.

## Data model

- `leads`: all leads, regardless of status.
- `emails`: immutable history of drafts and sent messages, linked to a lead.
- `orders`: current order state, optionally linked to a lead.
- `activity_log`: append-only event history; each event can reference a lead and an order.
- `admin_users` and `admin_sessions`: server-side authentication records.

The admin UI must not store leads, emails, orders, credentials, or session tokens in localStorage. Use secure, HttpOnly cookies for sessions.