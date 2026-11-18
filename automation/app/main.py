import json
import os
import re
import smtplib
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any

import gspread
import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from google.oauth2.service_account import Credentials

app = FastAPI(title="TABCO Sales Automation API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

LEADS_HEADERS = [
    "Lead_ID", "Company_Name", "Website", "Country", "City",
    "Company_Description", "Contact_Name", "Job_Title", "Contact_Email",
    "LinkedIn_URL", "Phone", "Personalization_Note", "Priority",
    "Lead_Status", "Opt_Out", "Notes",
]
EMAIL_HEADERS = [
    "Email_ID", "Lead_ID", "Email_Number", "Recipient_Email", "Email_Subject",
    "Email_Body", "Send_Status", "Created_At", "Sent_At",
]

class Inquiry(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    company_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(default="", max_length=50)
    country: str = Field(default="", max_length=100)
    city: str = Field(default="", max_length=100)
    website: str = Field(default="", max_length=300)
    note: str = Field(default="", max_length=3000)

class DraftUpdate(BaseModel):
    subject: str = Field(min_length=3, max_length=240)
    body: str = Field(min_length=20, max_length=12000)

class SendRequest(BaseModel):
    confirm_send: bool = False

def require_admin(authorization: str | None = Header(default=None)):
    expected = os.getenv("ADMIN_TOKEN", "")
    if not expected:
        raise HTTPException(503, "Admin access is not configured")
    if authorization != f"Bearer {expected}":
        raise HTTPException(401, "Unauthorized")
    return True

def worksheets():
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    sheet_id = os.getenv("GOOGLE_SHEET_ID", "")
    if not raw or not sheet_id:
        raise HTTPException(503, "Google Sheets credentials are not configured")
    try:
        info = json.loads(raw)
        creds = Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        book = gspread.authorize(creds).open_by_key(sheet_id)
        leads = book.worksheet("Leads")
        emails = book.worksheet("Emails")
        ensure_headers(leads, LEADS_HEADERS)
        ensure_headers(emails, EMAIL_HEADERS)
        return leads, emails
    except Exception as exc:
        raise HTTPException(502, f"Google Sheets connection failed: {exc}")

def ensure_headers(sheet, headers):
    existing = sheet.row_values(1)
    if not existing:
        sheet.append_row(headers)
    elif existing != headers:
        aliases = {"Recipient_Email": {"Recipient", "Recipient_Email"}} if sheet.title == "Emails" else {}
        missing = [h for h in headers if h not in existing and not (aliases.get(h, set()) & set(existing))]
        for header in missing:
            sheet.update_cell(1, len(existing) + 1, header)
            existing.append(header)

def rows_as_dicts(sheet):
    values = sheet.get_all_values()
    if not values:
        return []
    headers = values[0]
    return [dict(zip(headers, row + [""] * (len(headers) - len(row)))) for row in values[1:] if any(row)]

def append_record(sheet, record):
    headers = sheet.row_values(1)
    if not headers:
        raise HTTPException(500, f"Sheet {sheet.title} has no header row")
    row = []
    for header in headers:
        if header == "Recipient_Email":
            row.append(record.get("Recipient_Email", record.get("Recipient", "")))
        elif header == "Recipient":
            row.append(record.get("Recipient", record.get("Recipient_Email", "")))
        else:
            row.append(record.get(header, ""))
    sheet.append_row(row, value_input_option="USER_ENTERED")

def update_by_id(sheet, id_column, record_id, updates):
    values = sheet.get_all_values()
    if not values:
        raise HTTPException(404, "Record not found")
    headers = values[0]
    if id_column not in headers:
        raise HTTPException(500, f"Missing {id_column} column")
    id_col = headers.index(id_column) + 1
    for row_num, row in enumerate(values[1:], start=2):
        if len(row) >= id_col and row[id_col - 1] == record_id:
            for key, value in updates.items():
                if key in headers:
                    sheet.update_cell(row_num, headers.index(key) + 1, value)
            return
    raise HTTPException(404, "Record not found")

def valid_email(value):
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value or ""))

@app.get("/api/health")
def health():
    return {"ok": True, "service": "TABCO automation"}

@app.post("/api/inquiries")
def submit_inquiry(data: Inquiry):
    leads, _ = worksheets()
    email = str(data.email).strip().lower()
    existing = rows_as_dicts(leads)
    if any((r.get("Contact_Email", "").strip().lower() == email and r.get("Lead_Status") != "Rejected") for r in existing):
        return {"ok": True, "message": "Your request has already been recorded."}
    lead_id = "WEB-" + uuid.uuid4().hex[:10].upper()
    append_record(leads, {
        "Lead_ID": lead_id, "Company_Name": data.company_name.strip(),
        "Website": data.website.strip(), "Country": data.country.strip(),
        "City": data.city.strip(), "Company_Description": "",
        "Contact_Name": data.full_name.strip(), "Job_Title": "",
        "Contact_Email": email, "LinkedIn_URL": "", "Phone": data.phone.strip(),
        "Personalization_Note": data.note.strip(), "Priority": "Normal",
        "Lead_Status": "New", "Opt_Out": "No", "Notes": "Website inquiry",
    })
    return {"ok": True, "lead_id": lead_id}

def generate_email(lead: dict[str, Any]) -> tuple[str, str]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "GEMINI_API_KEY is not configured")
    prompt = f"""Write a personalized first-contact B2B email for TABCO in professional international English.
Use only these verified company/product facts: TABCO manufactures square steel bars for the industrial grating industry; sizes 4x4, 5x5, 6x6, 8x8 and 10x10 mm; production capacity 1 tonne per 4 hours; 5x5 weight 192 g/m²; 6x6 weight 256 g/m²; automatic twisting process; custom production may be discussed. Do not invent certifications, standards, prices, stock, delivery times, export capability, partnerships, or unverified customer needs. Do not describe TABCO as a finished-grating-panel supplier.
Lead data:
Company: {lead.get('Company_Name','')}
Country: {lead.get('Country','')}
City: {lead.get('City','')}
Description: {lead.get('Company_Description','')}
Contact: {lead.get('Contact_Name','')}
Job title: {lead.get('Job_Title','')}
Website: {lead.get('Website','')}
Personalization note: {lead.get('Personalization_Note','')}
Write 100-160 words, one low-pressure CTA, include TABCO Sales Team and https://tabcoyazd.ir/.
Return only JSON with string keys email_subject and email_body."""
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
    try:
        response = requests.post(
            url + "?key=" + api_key,
            json={"contents": [{"parts": [{"text": prompt}]}],
                  "generationConfig": {"responseMimeType": "application/json"}},
            timeout=45,
        )
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)
        return result["email_subject"], result["email_body"]
    except Exception as exc:
        raise HTTPException(502, f"AI draft generation failed: {exc}")

@app.get("/api/admin/leads", dependencies=[Depends(require_admin)])
def list_leads():
    leads, emails = worksheets()
    email_rows = rows_as_dicts(emails)
    sent_ids = {r.get("Lead_ID") for r in email_rows if r.get("Send_Status") == "Sent"}
    draft_ids = {r.get("Lead_ID") for r in email_rows if r.get("Send_Status") in ("Draft", "Pending_Approval")}
    result = []
    for lead in rows_as_dicts(leads):
        email = lead.get("Contact_Email", "").strip()
        if (valid_email(email) and lead.get("Opt_Out", "No").strip().lower() != "yes"
                and lead.get("Lead_Status", "").strip() == "New"
                and lead.get("Lead_ID") not in sent_ids
                and lead.get("Lead_ID") not in draft_ids):
            result.append(lead)
    return {"leads": result}

@app.post("/api/admin/leads/{lead_id}/draft", dependencies=[Depends(require_admin)])
def create_draft(lead_id: str):
    leads, emails = worksheets()
    lead = next((r for r in rows_as_dicts(leads) if r.get("Lead_ID") == lead_id), None)
    if not lead:
        raise HTTPException(404, "Lead not found")
    if lead.get("Lead_Status") != "New" or lead.get("Opt_Out", "No").lower() == "yes":
        raise HTTPException(409, "Lead is not eligible")
    email_rows = rows_as_dicts(emails)
    if any(r.get("Lead_ID") == lead_id and r.get("Send_Status") in ("Sent", "Draft", "Pending_Approval") for r in email_rows):
        raise HTTPException(409, "This lead already has a sent email or draft")
    subject, body = generate_email(lead)
    email_id = "EM-" + uuid.uuid4().hex[:10].upper()
    number = 1 + sum(1 for r in email_rows if r.get("Lead_ID") == lead_id)
    created = datetime.now(timezone.utc).isoformat()
    append_record(emails, {
        "Email_ID": email_id, "Lead_ID": lead_id, "Email_Number": number,
        "Recipient_Email": lead["Contact_Email"], "Email_Subject": subject,
        "Email_Body": body, "Send_Status": "Draft", "Created_At": created,
        "Sent_At": "",
    })
    update_by_id(leads, "Lead_ID", lead_id, {"Lead_Status": "Pending_Approval"})
    return {"draft": {"Email_ID": email_id, "Lead_ID": lead_id, "Email_Number": number, "Recipient_Email": lead["Contact_Email"], "Email_Subject": subject, "Email_Body": body, "Send_Status": "Draft"}}

@app.get("/api/admin/drafts", dependencies=[Depends(require_admin)])
def list_drafts():
    _, emails = worksheets()
    drafts = [r for r in rows_as_dicts(emails) if r.get("Send_Status") == "Draft"]
    return {"drafts": drafts}

@app.put("/api/admin/drafts/{email_id}", dependencies=[Depends(require_admin)])
def edit_draft(email_id: str, data: DraftUpdate):
    _, emails = worksheets()
    update_by_id(emails, "Email_ID", email_id, {"Email_Subject": data.subject, "Email_Body": data.body, "Send_Status": "Draft"})
    draft = next((r for r in rows_as_dicts(emails) if r.get("Email_ID") == email_id), None)
    return {"ok": True, "draft": draft}

@app.post("/api/admin/drafts/{email_id}/send", dependencies=[Depends(require_admin)])
def send_draft(email_id: str, request: SendRequest):
    if not request.confirm_send:
        raise HTTPException(400, "Explicit send confirmation is required")
    leads, emails = worksheets()
    draft = next((r for r in rows_as_dicts(emails) if r.get("Email_ID") == email_id), None)
    if not draft:
        raise HTTPException(404, "Draft not found")
    if draft.get("Send_Status") != "Draft":
        raise HTTPException(409, "Only an editable draft can be sent")
    msg = EmailMessage()
    msg["Subject"] = draft.get("Email_Subject", "")
    msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", ""))
    msg["To"] = draft.get("Recipient_Email", draft.get("Recipient", ""))
    msg.set_content(draft.get("Email_Body", ""))
    try:
        host = os.getenv("SMTP_HOST", "")
        port = int(os.getenv("SMTP_PORT", "587"))
        user = os.getenv("SMTP_USER", "")
        password = os.getenv("SMTP_PASSWORD", "")
        if not all([host, user, password, msg["From"]]):
            raise RuntimeError("SMTP environment variables are incomplete")
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
    except Exception as exc:
        raise HTTPException(502, f"Email sending failed: {exc}")
    sent_at = datetime.now(timezone.utc).isoformat()
    update_by_id(emails, "Email_ID", email_id, {"Send_Status": "Sent", "Sent_At": sent_at})
    update_by_id(leads, "Lead_ID", draft["Lead_ID"], {"Lead_Status": "Contacted"})
    return {"ok": True, "sent_at": sent_at}
