# TABCO Admin Google Sheets Schema

Google Sheets is the source of truth. The browser must never persist business records in localStorage.

## Existing tabs

Keep the existing `Leads` and `Emails` tabs and preserve their current data and headers. The backend must read all leads, not only leads eligible for a first-contact draft.

### Leads
Keep the existing header row:
`Lead_ID, Company_Name, Website, Country, City, Company_Description, Contact_Name, Job_Title, Contact_Email, LinkedIn_URL, Phone, Personalization_Note, Priority, Lead_Status, Opt_Out, Notes`

### Emails
Keep the existing header row and support both legacy `Recipient` and canonical `Recipient_Email`:
`Email_ID, Lead_ID, Email_Number, Recipient_Email, Email_Subject, Email_Body, Send_Status, Created_At, Sent_At`

Every draft and sent email remains a separate row. Do not overwrite sent email content when a later follow-up draft is created.

## New tab: Orders

Create a worksheet named `Orders` with this exact first row:

`Order_ID, Lead_ID, Customer_Name, Contact_Name, Contact_Email, Contact_Phone, Product, Quantity, Unit, Order_Status, Shipping_Status, Forwarder, Tracking_Number, Order_Date, Expected_Ship_Date, Created_At, Updated_At, Notes, Is_Archived`

Rules:
- `Order_ID` is unique and stable.
- `Lead_ID` is optional, but when present must refer to a row in `Leads`.
- `Order_Status` describes the commercial order state (for example: Quotation, Confirmed, In_Production, Completed, Cancelled).
- `Shipping_Status` describes delivery progress (for example: Pending, Ready_to_Ship, In_Transit, Delivered).
- `Is_Archived` is `Yes` or `No`; do not physically delete orders through the admin UI.
- Store dates in ISO 8601 format. Keep quantities numeric where possible.

## Existing tab: Activity_log

Preserve the user's existing columns exactly:

`Activity_ID, Lead_ID, Activity_Date, Activity_Type, Contact_Channel, Message_Summary, Outcome, Next_Action, Next_Action_Date, Notes`

Rules:
- Append a new row for every meaningful order creation, edit, status change, archive action, and relevant customer interaction.
- Never update or delete historical activity rows.
- Put the related order identifier in `Notes` using a consistent prefix such as `Order_ID=ORD-...` until an explicit `Order_ID` column is approved.
- Use ISO 8601 timestamps for `Activity_Date` and `Next_Action_Date` when known.
- Keep `Lead_ID` blank only for orders that are not linked to a lead.

## Access and safety

- Share the spreadsheet with the backend service-account email as Editor.
- Do not add service-account JSON, API keys, passwords, or real customer records to this repository.
- Do not rename, reorder, or delete existing columns during setup.
- The application must validate required headers and report missing columns; it must not silently rewrite or replace existing rows.
