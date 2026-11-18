# AI Use Disclosure

This document describes how AI assistance is used in the TABCO academic project. The student remains responsible for understanding, reviewing, testing, and presenting the submitted work.

## AI assistance during development

ChatGPT was used as a development assistant for tasks such as:
- discussing the project scope and business problem;
- drafting and refining website text and project documentation;
- suggesting and reviewing HTML, CSS, and JavaScript changes;
- explaining code behavior and helping investigate errors;
- structuring the business analysis and presentation narrative.

The website's existing layout, visual theme, and assets were retained as the project's design baseline. AI-generated suggestions were reviewed and adapted rather than treated as automatically correct.

## AI in the business workflow

The Python FastAPI service in `automation/` includes an AI-assisted step that generates an editable first-contact email draft from lead information. Gemini is called server-side. The draft is saved to Google Sheets and is displayed in `/admin/email-drafts.html`; a human can edit it and must explicitly confirm before SMTP sending. Runtime credentials are supplied through environment variables and are not committed.

The AI step should be presented as draft preparation, not autonomous commercial approval or sending, unless the live workflow confirms otherwise.

## Human responsibility

The student/developer is responsible for:
- verifying product dimensions, weights, capacity, and business claims with the source information;
- checking generated text for accuracy and appropriate wording;
- testing the form and external workflow;
- protecting service credentials and customer data;
- explaining the code and AI-assisted parts during the academic presentation.

AI assistance does not constitute market research or proof of customer demand. Any unvalidated customer-problem statements are explicitly identified as hypotheses in the analysis dossier.
