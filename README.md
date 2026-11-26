# TABCO — Digital Product Inquiry MVP

**Academic project · Phase 1 and Phase 2 business analysis and minimum viable product**

TABCO is an industrial B2B product presentation and inquiry workflow for a manufacturer of special square bars used in the grating industry. The project digitizes the first part of the buyer journey: learning about the product, reviewing available specifications, and submitting a structured collaboration or purchase inquiry.

The public site is served from `tabco/` using Cloudflare Pages. Server-side API routes are implemented as Cloudflare Pages Functions under `tabco/functions/` and use the D1 binding `DB` for the current admin CRM and inquiry records. Older Python automation components remain in the repository as separate/legacy automation code and are not the active D1 admin API.

## Live project

- Website: https://tabcoyazd.ir/
- Phase 1 analysis: https://tabcoyazd.ir/analysis.html
- Phase 2 analysis: https://tabcoyazd.ir/phase2.html
- Source code: https://github.com/sadatiiii/SteelFlow-Automation

## Business problem and value proposition

Industrial buyers may need to collect product information, confirm dimensions and availability, and communicate project requirements through calls, email, messaging apps, or intermediaries. When information is exchanged across separate channels, requests can be incomplete and follow-up may require repeated clarification.

TABCO provides a single public product page and a structured inquiry form. The intended value is clearer product discovery, more consistent initial request capture, and a more organized starting point for sales communication.

**Evidence boundary:** These pain points are working business hypotheses, not quantified market findings. The repository does not contain documented customer interviews, market-size research, or measured conversion results. Field validation is a next step.

## Idea classification

The project is best classified as an **adaptive idea**: it applies existing web and workflow-automation technologies to improve an existing industrial product inquiry and sales process. It does not introduce a new physical product category or operate as an open marketplace.

## What is implemented in this repository

| Component | Current implementation |
|---|---|
| Product website | Static HTML, CSS and vanilla JavaScript |
| Product information | Available sizes and the currently supplied weight values |
| Product media | Local product video and logo assets |
| Inquiry form | Dedicated bilingual first-party page at `/inquiry/` |
| Theme and language | Dark/light theme and Persian/English language controls, including the inquiry page |
| Analysis dossiers | Persian Phase 1 and Phase 2 pages at `/analysis.html` and `/phase2.html` |
| Admin CRM | Cloudflare Pages Functions + Cloudflare D1 (leads, orders, emails, activity log) |
| Admin authentication | Session cookie backed by D1 admin users and sessions |
| Privacy page | Basic explanation of form data and third-party processing |

## Current Cloudflare workflow

```text
Buyer
  |
  v
TABCO product page -> dedicated inquiry page
  |
  v
Cloudflare Pages Function -> D1
  |                     |
  |                     +--> create/reuse Lead
  |                     +--> create a separate Order for every inquiry
  |                     +--> write activity log
  v
Admin panel (authenticated session)
  |
  +--> review leads and orders
  +--> Gemini prepares an editable email draft
  +--> admin reviews/edits the draft
  +--> explicit confirmation before Gmail send
```

The active admin API is `tabco/functions/api/[[path]].js`. The inquiry endpoint is `tabco/functions/api/inquiries.js`. The D1 schema is documented in `cloudflare/migrations/0001_initial_schema.sql`. Gemini uses `GEMINI_API_KEY`; Gmail sending uses Google OAuth credentials and a refresh token. These are Cloudflare secrets and must never be committed.

The Phase 2 dossier describes the intended business model and workflow. The live integrations still require end-to-end testing in the deployed environment; source-code presence alone does not prove that external credentials, quotas, OAuth, or delivery are working.

## Online and offline boundary

**Online:** product presentation, specification review, inquiry submission, workflow processing, inquiry recording, notifications, and draft preparation.

**Offline:** final technical review, price and delivery confirmation, negotiation, manufacturing, quality control, packaging, loading, and shipping.

The website supports the commercial process; it does not replace physical production or final business agreements.

## Product information currently displayed

- Available dimensions: 4×4, 5×5, 6×6, 8×8 and 10×10 mm.
- Supplied weight information: 192 g/m² for 5×5 and 256 g/m² for 6×6.
- Reported production capacity: one tonne in four hours.

These values are presented from the information supplied for the project. Confirm technical specifications and commercial availability with the business before relying on them for an order.

## Repository structure

```text
.
├── README.md
├── AI_DISCLOSURE.md
├── TESTING.md
└── tabco/
    ├── index.html
    ├── analysis.html
    ├── styles.css
    ├── script.js
    ├── assets/
    │   ├── logo.jpeg
    │   └── 1.mp4
    ├── admin/
    │   └── index.html
    └── privacy/
        └── index.html
```

## Run locally

This is a static site; there is no package manager or build step in the repository.

From the repository root, run any static HTTP server, for example:

```bash
python3 -m http.server 8000 --directory tabco
```

Then open:

- http://localhost:8000/
- http://localhost:8000/analysis.html

The inquiry form requires the Cloudflare Pages Functions deployment and the D1 binding to be configured.

## Deployment notes

The static site and Pages Functions are deployed together from the existing Cloudflare Pages project. Preserve its current build/output configuration. Configure the D1 database binding named `DB` and the required secrets in Cloudflare Pages: `ADMIN_SETUP_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_REFRESH_TOKEN` as applicable. Never put credentials in frontend files or Git history.

## Known limitations and risks

- Market demand and customer pain points have not yet been quantified through documented field research.
- The Python API source is version-controlled, but it requires external secrets and an always-on Docker host.
- Google Sheets is an external storage service, not a relational database owned by this codebase.
- The order panel under `/admin/` remains a local demonstration using browser `localStorage`; it is separate from the new email-draft review page.
- The website does not process online payments.
- Availability, pricing, production lead time, shipping, and final technical suitability require direct confirmation.
- Third-party workflow, email, spreadsheet, and AI services introduce availability and configuration dependencies.

## Phase 1 and Phase 2 presentation

The Phase 1 dossier is available at `/analysis.html`; the Phase 2 dossier is available at `/phase2.html`. Phase 2 covers the formulated value proposition, transaction-cost analysis, intermediary functions, disintermediation, nine-block Business Model Canvas, revenue architecture, substitute analysis, connected MVP scenarios, error/empty states, and an assumption-based time-savings calculator. It explicitly labels missing market evidence instead of inventing it.

Phase 1 covers:

1. Business introduction and value proposition.
2. Customer problem and friction hypotheses.
3. The eight idea-maturity questions.
4. Adaptive-idea classification.
5. Online/offline activity boundaries.
6. Customer journey.
7. MVP architecture and current implementation status.
8. Limitations and validation work still required.

## Project documentation

- [AI use disclosure](AI_DISCLOSURE.md)
- [Manual testing guide and current test status](TESTING.md)

## License

No open-source license has been specified. All rights and reuse permissions remain with the repository owner unless a license is added.
