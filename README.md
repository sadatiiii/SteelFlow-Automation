# TABCO — Digital Product Inquiry MVP

**Academic project · Phase 1 business analysis and minimum viable product**

TABCO is an industrial B2B product presentation and inquiry workflow for a manufacturer of special square bars used in the grating industry. The project digitizes the first part of the buyer journey: learning about the product, reviewing available specifications, and submitting a structured collaboration or purchase inquiry.

> This repository contains the static website source. The n8n workflow and its external service configuration are operated separately and are not included in this repository.

## Live project

- Website: https://tabcoyazd.ir/
- Business analysis: https://tabcoyazd.ir/analysis.html
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
| Inquiry form | n8n form embedded in the homepage, with a direct-link fallback |
| Theme and language | Dark/light theme and Persian/English language controls |
| Analysis dossier | Separate Persian page at `tabco/analysis.html` |
| Demo order panel | Browser-local `localStorage` example; not a central order system |
| Privacy page | Basic explanation of form data and third-party processing |

## External workflow (operated separately)

The intended and manually tested flow reported by the project developer is:

```text
Buyer
  |
  v
TABCO product page and inquiry form
  |
  v
n8n workflow (external to this repository)
  |
  +----> Google Sheets: inquiry record
  |
  +----> Email notification
  |
  +----> AI-assisted email draft
```

The developer has reported manually testing form submission, Google Sheets writing, notification email delivery, and AI-assisted draft generation. These are developer-reported test results; the workflow definition is not committed here, so the individual n8n nodes and service configuration cannot be independently inspected from this repository.

Google Sheets is used as an external structured record store in the reported workflow. **This project does not currently implement a dedicated relational database.**

The AI-assisted step prepares a draft; do not describe it as automatically sending a final commercial offer unless a human approval and sending step has been verified in the live workflow.

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

The inquiry form depends on the separately configured n8n service and may not behave like the production form in a local/offline environment.

## Deployment notes

The website is deployed separately from the n8n workflow. The static site root is the `tabco/` directory. The repository does not currently include a Docker Compose file, a frontend build pipeline, or a GitHub Actions deployment workflow. Keep the existing hosting configuration when publishing changes.

The n8n form URL is configured in `tabco/script.js`. A public form endpoint is visible to website visitors by design; never place API keys, passwords, private tokens, or service credentials in frontend files.

## Known limitations and risks

- Market demand and customer pain points have not yet been quantified through documented field research.
- The n8n workflow is external to this repository and is not version-controlled here.
- Google Sheets is an external storage service, not a relational database owned by this codebase.
- The order panel under `/admin/` is a local demonstration using browser `localStorage`. It has no authentication and is not connected to the inquiry workflow or a shared database. Do not use it for real customer or shipment records.
- The website does not process online payments.
- Availability, pricing, production lead time, shipping, and final technical suitability require direct confirmation.
- Third-party workflow, email, spreadsheet, and AI services introduce availability and configuration dependencies.

## Phase 1 presentation

The public analysis dossier is available at `/analysis.html`. It covers:

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
