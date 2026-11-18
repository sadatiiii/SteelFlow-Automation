# TABCO Python Sales Automation

This service replaces the n8n form + lead-selection + AI-draft + Gmail workflow.

## Architecture

- Static TABCO pages stay on Cloudflare Pages.
- `tabco/functions/api/[[path]].js` proxies same-origin `/api/*` requests to this API.
- This FastAPI service runs in Docker on a host that supports always-on containers.
- Google Sheets remains the source of truth for the `Leads` and `Emails` tabs.
- Gemini creates an email draft. A human edits and explicitly sends it from the admin drafts page.

## Required environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_SHEET_ID` | Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Entire Google service-account JSON, as one-line JSON |
| `GEMINI_API_KEY` | Gemini API key |
| `ADMIN_TOKEN` | Long random secret used by the draft-review page |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Usually 587 for STARTTLS |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP/app password |
| `SMTP_FROM` | Optional sender address; defaults to SMTP_USER |
| `CORS_ORIGINS` | Optional comma-separated origins; Pages proxy makes browser calls same-origin |

Do not commit real values. Configure them as secrets on the Docker host.

## Google Sheets setup

Share the spreadsheet with the service-account email as an Editor. The workbook must contain tabs named `Leads` and `Emails`.

The `Leads` header row must include:
`Lead_ID, Company_Name, Website, Country, City, Company_Description, Contact_Name, Job_Title, Contact_Email, LinkedIn_URL, Phone, Personalization_Note, Priority, Lead_Status, Opt_Out, Notes`

The `Emails` header row must include:
`Email_ID, Lead_ID, Email_Number, Recipient, Email_Subject, Email_Body, Send_Status, Created_At, Sent_At`

The service refuses to silently remap an existing sheet with missing columns. Check header names before first use.

## Run locally

```bash
docker build -t tabco-automation ./automation
docker run --rm -p 8000:8000 --env-file automation/.env tabco-automation
```

Health check: `GET /api/health`.

## Cloudflare Pages configuration

Set the Pages project variable `AUTOMATION_API_ORIGIN` to the base URL of the running API, without a trailing slash. The Pages Function forwards `/api/*` to that origin. Never put service-account JSON, Gemini keys, SMTP passwords, or the admin token in frontend variables.

## Human approval and duplicate protection

- Only valid-email leads with `Lead_Status=New` and `Opt_Out` other than Yes are offered.
- A lead with a Draft, Pending_Approval, or Sent email is not offered for another first-contact draft.
- Draft edits are saved to the Emails tab.
- Sending requires a separate explicit confirmation action.
- After successful SMTP submission, the email is logged as Sent and the lead becomes Contacted.

SMTP acceptance does not guarantee inbox delivery. Review bounce and reply handling separately.
