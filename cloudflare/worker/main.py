import re
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from workers import asgi

app = FastAPI(title="TABCO Admin API", version="2.1.0")

EXPECTED_TABLES = {
    "leads",
    "emails",
    "orders",
    "activity_log",
    "admin_users",
    "admin_sessions",
}


def get_db(request: Request):
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env else None
    if db is None:
        raise HTTPException(status_code=503, detail="D1 database binding is not configured")
    return db


class Inquiry(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    company_name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(default="", max_length=50)
    country: str = Field(default="", max_length=100)
    city: str = Field(default="", max_length=100)
    website: str = Field(default="", max_length=300)
    note: str = Field(default="", max_length=3000)


def clean(value: str) -> str:
    return value.strip()


@app.get("/api/health")
async def health(request: Request):
    db = get_db(request)
    try:
        result = await db.prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).run()
        found = {row["name"] for row in (result.results or [])}
        missing = sorted(EXPECTED_TABLES - found)
    except Exception:
        raise HTTPException(status_code=503, detail="D1 database is unavailable")

    if missing:
        return {
            "status": "needs_attention",
            "service": "tabco-admin-api",
            "database": "connected",
            "missing_tables": missing,
        }

    return {
        "status": "ok",
        "service": "tabco-admin-api",
        "database": "connected",
        "schema": "ready",
    }


@app.get("/api")
async def api_root():
    return {"service": "TABCO Admin API", "version": "2.1.0"}


@app.post("/api/inquiries", status_code=201)
async def submit_inquiry(data: Inquiry, request: Request):
    env = request.scope.get("env")
    if str(getattr(env, "INQUIRY_FORM_ENABLED", "false")).lower() != "true":
        raise HTTPException(status_code=503, detail="The inquiry endpoint is not enabled yet")
    db = get_db(request)
    email = clean(data.email).lower()
    if not re.fullmatch(r"[^\\s@]+@[^\\s@]+\\.[^\\s@]+", email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address")

    try:
        existing = await db.prepare(
            "SELECT lead_id FROM leads WHERE lower(contact_email) = ? AND lead_status != 'Rejected' LIMIT 1"
        ).bind(email).run()
        if existing.results:
            return {
                "ok": True,
                "message": "Your request has already been recorded.",
                "duplicate": True,
            }

        lead_id = "WEB-" + uuid.uuid4().hex[:12].upper()
        now = datetime.now(timezone.utc).isoformat()
        values = (
            lead_id,
            clean(data.company_name),
            clean(data.website),
            clean(data.country),
            clean(data.city),
            clean(data.full_name),
            email,
            clean(data.phone),
            clean(data.note),
            now,
        )
        await db.prepare(
            """INSERT INTO leads (
                lead_id, company_name, website, country, city, contact_name,
                contact_email, phone, personalization_note, lead_status, opt_out,
                priority, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', 'No', 'Normal',
                      'Website inquiry', ?, ?)"""
        ).bind(*values[:9], now, now).run()

        await db.prepare(
            """INSERT INTO activity_log (
                activity_id, lead_id, activity_date, activity_type,
                contact_channel, message_summary, outcome, notes
            ) VALUES (?, ?, ?, 'Website inquiry', 'Website',
                      'New inquiry received through the TABCO website',
                      'Recorded in D1', 'Public website form')"""
        ).bind("ACT-" + uuid.uuid4().hex[:12].upper(), lead_id, now).run()

        return {"ok": True, "lead_id": lead_id, "message": "Inquiry saved."}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="The inquiry could not be saved")


Default = asgi.entrypoint(app)
