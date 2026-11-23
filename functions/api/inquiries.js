function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Allow": "POST, OPTIONS", "Cache-Control": "no-store" }
    });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  // This endpoint writes directly to the same Cloudflare D1 database used by TABCO.
  // Bind the existing database as "DB" in Pages > Settings > Functions > D1 database bindings.
  const db = env.DB;
  if (!db) {
    return json({
      ok: false,
      error: "D1 is not bound to this Pages deployment. Bind tabco-db as DB."
    }, 503);
  }

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: "Origin not allowed." }, 403);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "Content-Type must be application/json." }, 415);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return json({ ok: false, error: "Request is too large." }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  const fullName = clean(input.full_name, 120);
  const companyName = clean(input.company_name, 160);
  const email = clean(input.email, 254).toLowerCase();
  const phone = clean(input.phone, 50);
  const country = clean(input.country, 100);
  const city = clean(input.city, 100);
  const website = clean(input.website, 300);
  const note = clean(input.note, 3000);

  if (fullName.length < 2 || companyName.length < 2 ||
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return json({
      ok: false,
      error: "Please provide a valid name, company, and email address."
    }, 400);
  }

  const leadId = "WEB-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const activityId = "ACT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const now = new Date().toISOString();

  try {
    const existing = await db.prepare(
      "SELECT lead_id FROM leads WHERE lower(contact_email) = ? AND lead_status != 'Rejected' LIMIT 1"
    ).bind(email).first();

    if (existing) {
      // Do not silently overwrite an existing CRM record submitted by another channel.
      return json({
        ok: true,
        duplicate: true,
        lead_id: existing.lead_id,
        message: "A request with this email address is already recorded."
      }, 200);
    }

    await db.batch([
      db.prepare(`INSERT INTO leads (
        lead_id, company_name, website, country, city, contact_name,
        contact_email, phone, personalization_note, priority, lead_status,
        opt_out, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', 'New', 'No',
                'Website inquiry', ?, ?)`)
        .bind(leadId, companyName, website, country, city, fullName, email,
              phone, note, now, now),
      db.prepare(`INSERT INTO activity_log (
        activity_id, lead_id, activity_date, activity_type, contact_channel,
        message_summary, outcome, notes
      ) VALUES (?, ?, ?, 'Website inquiry', 'Website',
                'New collaboration inquiry received through tabcoyazd.ir',
                'Recorded in D1', 'Public inquiry form')`)
        .bind(activityId, leadId, now)
    ]);

    return json({ ok: true, duplicate: false, lead_id: leadId, message: "Inquiry saved." }, 201);
  } catch (error) {
    console.error("D1 inquiry insert failed:", error);
    return json({ ok: false, error: "The inquiry could not be saved. Please try again later." }, 503);
  }
}
