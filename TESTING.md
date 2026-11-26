# Testing and Verification

This checklist separates repository-level checks from tests that require a deployed Cloudflare environment and valid external credentials. Do not mark a test complete merely because the corresponding source file exists.

## Public website

- [ ] Homepage loads over HTTPS.
- [ ] Product video and logo load.
- [ ] Product and inquiry navigation work.
- [ ] Phase 1 analysis link opens `/analysis.html`.
- [ ] Phase 2 analysis link opens `/phase2.html` from both the homepage and Phase 1 dossier.
- [ ] Persian layout, RTL direction, responsive layout, and shared dark/light theme work on all three pages.
- [ ] Phase 2 page displays the nine Business Model Canvas blocks.
- [ ] Time-savings calculator updates when any input changes, handles blank/negative values as zero, and labels output as an estimate rather than measured savings.

## Public inquiry -> D1

Use fictional test data only.

- [ ] Valid inquiry creates a Lead when the email is new.
- [ ] Valid inquiry creates an Order for every submission.
- [ ] Repeated inquiry from an existing email reuses the existing Lead but creates a new, separate Order.
- [ ] Invalid name/company/email is rejected with a clear 400 response.
- [ ] Invalid JSON, unsupported content type, and oversized request are rejected safely.
- [ ] D1 unavailable/insert failure returns an error and does not show a false success message.
- [ ] Empty states are understandable when there are no leads or orders.

## Admin and transaction workflow

- [ ] Admin setup can only initialize the first account with the setup secret.
- [ ] Login creates a server-side session; unauthenticated admin API requests are rejected.
- [ ] Overview, leads, orders, and activity views load from D1.
- [ ] Editing an order persists to D1 and writes an activity record.
- [ ] Every new inquiry remains a distinct order even when a lead already exists.
- [ ] Empty lead/order/email lists show a useful empty state.
- [ ] Existing orders and D1 records remain intact during deployment.

## Gemini draft workflow

Requires a valid `GEMINI_API_KEY` and available Gemini API quota.

- [ ] Generate rejects a missing lead ID and unknown lead.
- [ ] Generate rejects a lead without a valid contact email.
- [ ] A successful response contains a subject and body and stores a Draft record in D1.
- [ ] A Gemini 429/503 or malformed response is surfaced as a failure; no empty/false draft is stored.
- [ ] Admin can edit a saved draft before sending.
- [ ] No email is sent as a side effect of generating a draft.

## Gmail OAuth and sending

Requires Google OAuth client configuration, a valid refresh token, and Gmail send permission.

- [ ] Connect endpoint redirects to Google's OAuth consent screen.
- [ ] Callback validates the OAuth state cookie and does not expose tokens in logs.
- [ ] Refresh-token exchange succeeds after consent and the refresh token is stored only as a Cloudflare Secret.
- [ ] Sending without explicit confirmation is rejected.
- [ ] Sending with missing OAuth configuration is rejected with a clear error.
- [ ] A draft is marked Sent only after Gmail confirms successful delivery.
- [ ] Failed token refresh or Gmail API request does not mark the draft Sent.
- [ ] Use a controlled test recipient and verify the received message and sender identity.

## Deployment and security

- [ ] Cloudflare Pages production deployment uses the intended `main` commit.
- [ ] D1 binding is named `DB` and points to the intended database.
- [ ] Required secrets are configured in Cloudflare; no API keys, OAuth tokens, passwords, or session cookies are committed.
- [ ] Runtime logs are checked for errors without sharing cookies, authorization codes, or tokens.
- [ ] No production data is deleted or reset during testing.

## Evidence to retain for the phase presentation

Record the date, test case, expected result, actual result, and a redacted screenshot/log for each completed end-to-end test. Distinguish source inspection from a test performed against the deployed service.
