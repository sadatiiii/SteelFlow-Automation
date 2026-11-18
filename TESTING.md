# Testing and Verification

This file distinguishes source-code checks from external workflow tests.

## Website checks

The repository is a static HTML/CSS/JavaScript website. Before presenting a new deployment, manually verify:

- [ ] Homepage loads over HTTPS.
- [ ] Product video and logo load.
- [ ] Navigation anchors work.
- [ ] The Business Analysis link opens `/analysis.html`.
- [ ] Analysis page links back to the homepage and inquiry form.
- [ ] Persian text direction and layout are correct.
- [ ] Dark/light theme toggle works on the homepage and analysis page.
- [ ] Mobile layout is usable at a narrow viewport.
- [ ] Privacy and demo admin pages load.

## Inquiry workflow checks

The following checks require a configured Docker API and external Google/Gemini/SMTP credentials:

- Inquiry form submission accepted by the Python API.
- Inquiry data written to the Leads tab.
- Editable AI draft saved to the Emails tab.
- Edited draft sent only after explicit human confirmation.

The source code is committed, but external integrations must be tested after secrets and hosting are configured.

For a repeatable demonstration, use fictional test details only. Do not submit real identity, payment, or other highly sensitive information.

## Important distinction: demo admin panel

The `/admin/` page stores records in the current browser's `localStorage`. It is not authenticated, is not shared between browsers, and is not connected to Google Sheets. It is a UI demonstration only, not a production order-management system.

## Before a public release

- [ ] Verify `AUTOMATION_API_ORIGIN` points to the running Python API.
- [ ] Test the inquiry and draft-review flow from the deployed website.
- [ ] Confirm where submitted data is stored and who can access it.
- [ ] Confirm the send action requires an explicit human confirmation.
- [ ] Check that no credentials or private tokens are committed to the repository.
- [ ] Verify all displayed technical and commercial information with the business.
