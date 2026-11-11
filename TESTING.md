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

The project developer has reported completing these manual checks in the external n8n workflow:

- Form submission received by n8n.
- Inquiry data written to Google Sheets.
- Notification email sent.
- AI-assisted email draft generated.

These are developer-reported tests. The workflow export and execution logs are not part of this repository, so this document does not claim independent verification of the external service.

For a repeatable demonstration, use fictional test details only. Do not submit real identity, payment, or other highly sensitive information.

## Important distinction: demo admin panel

The `/admin/` page stores records in the current browser's `localStorage`. It is not authenticated, is not shared between browsers, and is not connected to Google Sheets. It is a UI demonstration only, not a production order-management system.

## Before a public release

- [ ] Verify that the form URL in `tabco/script.js` is the intended active n8n endpoint.
- [ ] Test the workflow from the deployed website, not only from the n8n editor.
- [ ] Confirm where submitted data is stored and who can access it.
- [ ] Confirm that outgoing email drafts are reviewed by a human before sending.
- [ ] Check that no credentials or private tokens are committed to the repository.
- [ ] Verify all displayed technical and commercial information with the business.
