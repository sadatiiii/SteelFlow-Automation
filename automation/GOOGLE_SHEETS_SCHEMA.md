# Legacy Google Sheets schema (migration reference)

**Status: legacy.** The target architecture now uses Cloudflare D1 as the canonical database. This file is retained only as a reference for importing and validating the existing workbook.

- Do not create a new `Orders` Google Sheets tab.
- Do not treat Google Sheets as the primary database after the D1 migration is verified.
- Keep the existing `Leads` and `Emails` tabs unchanged as a backup until data import and validation are complete.
- Export both tabs to CSV before importing. Never delete or overwrite the source workbook during migration.

## Existing Leads columns

`Lead_ID, Company_Name, Website, Country, City, Company_Description, Contact_Name, Job_Title, Contact_Email, LinkedIn_URL, Phone, Personalization_Note, Priority, Lead_Status, Opt_Out, Notes`

## Existing Emails columns

`Email_ID, Lead_ID, Email_Number, Recipient_Email, Email_Subject, Email_Body, Send_Status, Created_At, Sent_At`

Some older workbooks may use `Recipient` instead of `Recipient_Email`; account for that alias during import.

## D1 destination

The current D1 schema is defined in `cloudflare/migrations/0001_initial_schema.sql`:
- `leads`
- `emails`
- `orders`
- `activity_log`
- `admin_users`
- `admin_sessions`

The `orders` table lives in D1, not in a new Google Sheets tab. The `activity_log` table is append-only and can associate an event with both a lead and an order.

## Import safety

- Preserve all original lead and email records.
- Keep sent email content immutable; a follow-up is a new email record.
- Validate row counts, identifiers, email history, and relationships after import.
- Do not switch production traffic to D1 until the imported data has been verified.
- Never commit service-account JSON, API keys, passwords, or real customer records.
