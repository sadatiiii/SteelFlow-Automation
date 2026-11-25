const COOKIE = "tabco_admin_session";
const SESSION_DAYS = 7;
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { ...noStore, ...headers } });
const clean = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const id = (prefix) => prefix + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase();

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const part = raw.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function setCookie(token, maxAge) {
  return COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}
function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
async function requireAdmin(request, db) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const hash = await digest(token);
  const row = await db.prepare(`SELECT s.user_id, u.username FROM admin_sessions s
    JOIN admin_users u ON u.user_id=s.user_id
    WHERE s.session_id_hash=? AND s.expires_at > ? AND u.is_active=1`)
    .bind(hash, new Date().toISOString()).first();
  return row || null;
}
async function logActivity(db, values) {
  await db.prepare(`INSERT INTO activity_log
    (activity_id, lead_id, order_id, activity_date, activity_type, contact_channel, message_summary, outcome, next_action, next_action_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id("ACT"), values.lead_id || null, values.order_id || null, new Date().toISOString(),
      clean(values.activity_type, 100), clean(values.contact_channel, 80),
      clean(values.message_summary, 1000), clean(values.outcome, 300),
      clean(values.next_action, 500), clean(values.next_action_date, 40), clean(values.notes, 2000)).run();
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (path[0] === "google" && path[1] === "callback" && request.method === "GET") {
    const state = url.searchParams.get("state") || "";
    const expectedState = cookieValue(request, "tabco_google_oauth_state");
    const code = url.searchParams.get("code") || "";
    const clearState = "tabco_google_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
    if (!state || !expectedState || state !== expectedState || !code) {
      return new Response("OAuth verification failed. Return to the TABCO admin panel and try connecting Gmail again.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": clearState } });
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return new Response("Google OAuth credentials are missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Cloudflare Pages secrets, then redeploy.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": clearState } });
    }
    const redirectUri = env.GOOGLE_REDIRECT_URI || (url.origin + "/api/google/callback");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokens.refresh_token) {
      console.error("Google OAuth token exchange failed:", tokens.error || tokenResponse.status);
      return new Response("Google did not return a refresh token. Reconnect Gmail from TABCO admin and approve offline access. Error: " + clean(tokens.error_description || tokens.error || "refresh_token_missing", 300), { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": clearState } });
    }
    const safeToken = String(tokens.refresh_token).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
    const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TABCO Gmail connected</title><body style="font:16px system-ui;max-width:760px;margin:8vh auto;padding:24px;background:#101714;color:#f1f4ed"><h1 style="color:#c9f36a">Gmail authorization successful</h1><p>Copy this refresh token and add it to Cloudflare Pages as a Secret named <b>GOOGLE_REFRESH_TOKEN</b>. Do not share it or commit it to GitHub. Then redeploy the Pages project.</p><textarea id="token" readonly style="width:100%;min-height:110px;padding:12px;box-sizing:border-box">${safeToken}</textarea><p><button onclick="navigator.clipboard.writeText(document.getElementById('token').value)" style="padding:12px 18px;background:#c9f36a;border:0;border-radius:8px;font-weight:700">Copy refresh token</button></p><p>After saving the secret, return to <a style="color:#c9f36a" href="/admin/">TABCO Admin</a>.</p></body></html>`;
    return new Response(page, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": clearState, "X-Content-Type-Options": "nosniff" } });
  }
  if (path[0] !== "admin") return json({ ok: false, error: "API route not found." }, 404);
  if (!sameOrigin(request)) return json({ ok: false, error: "Origin not allowed." }, 403);
  const db = env.DB;
  if (!db) return json({ ok: false, error: "D1 binding DB is missing from this Pages deployment." }, 503);
  const method = request.method;
  const route = path.slice(1);
  const body = async () => {
    try { return await request.json(); } catch { throw new Error("Invalid JSON body."); }
  };

  try {
    if (route[0] === "setup" && method === "POST") {
      const input = await body();
      if (!env.ADMIN_SETUP_KEY || !input.setup_key || input.setup_key !== env.ADMIN_SETUP_KEY)
        return json({ ok: false, error: "Admin setup key is invalid or not configured." }, 403);
      const count = await db.prepare("SELECT COUNT(*) AS n FROM admin_users").first();
      if (Number(count?.n || 0) > 0) return json({ ok: false, error: "Admin account has already been initialized." }, 409);
      const username = clean(input.username, 80);
      const password = String(input.password || "");
      if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(username) || password.length < 12 || password.length > 200)
        return json({ ok: false, error: "Use a username of at least 3 characters and a password of at least 12 characters." }, 400);
      const salt = crypto.randomUUID() + crypto.randomUUID();
      const hash = await passwordHash(password, salt);
      await db.prepare("INSERT INTO admin_users (user_id, username, password_hash, password_salt, is_active) VALUES (?, ?, ?, ?, 1)")
        .bind(id("USR"), username, hash, salt).run();
      return json({ ok: true, message: "Admin account initialized. Sign in now." }, 201);
    }

    if (route[0] === "login" && method === "POST") {
      const input = await body();
      const username = clean(input.username, 80);
      const user = await db.prepare("SELECT * FROM admin_users WHERE username=? AND is_active=1").bind(username).first();
      if (!user) return json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, 401);
      const hash = await passwordHash(String(input.password || ""), user.password_salt);
      if (hash !== user.password_hash) return json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, 401);
      const token = crypto.randomUUID() + crypto.randomUUID();
      const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
      await db.prepare("INSERT INTO admin_sessions (session_id_hash, user_id, expires_at) VALUES (?, ?, ?)")
        .bind(await digest(token), user.user_id, expires).run();
      await db.prepare("UPDATE admin_users SET last_login_at=? WHERE user_id=?").bind(new Date().toISOString(), user.user_id).run();
      return json({ ok: true, user: { username: user.username } }, 200, { "Set-Cookie": setCookie(token, SESSION_DAYS * 86400) });
    }

    if (route[0] === "session" && method === "GET") {
      const admin = await requireAdmin(request, db);
      return admin ? json({ ok: true, user: { username: admin.username } }) : json({ ok: false }, 401);
    }
    if (route[0] === "logout" && method === "POST") {
      const token = cookieValue(request, COOKIE);
      if (token) await db.prepare("DELETE FROM admin_sessions WHERE session_id_hash=?").bind(await digest(token)).run();
      return json({ ok: true }, 200, { "Set-Cookie": setCookie("", 0) });
    }

    const admin = await requireAdmin(request, db);
    if (!admin) return json({ ok: false, error: "برای ادامه وارد پنل مدیریت شوید." }, 401);

    if (route[0] === "google" && route[1] === "connect" && method === "GET") {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return json({ ok: false, error: "ابتدا GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET را در Cloudflare تنظیم کنید." }, 503);
      const state = crypto.randomUUID() + crypto.randomUUID();
      const redirectUri = env.GOOGLE_REDIRECT_URI || (url.origin + "/api/google/callback");
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.send",
        access_type: "offline", prompt: "consent", include_granted_scopes: "true", state
      }).toString();
      return new Response(null, { status: 302, headers: {
        "Location": authUrl.toString(), "Cache-Control": "no-store",
        "Set-Cookie": "tabco_google_oauth_state=" + encodeURIComponent(state) + "; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600"
      }});
    }

    if (route[0] === "overview" && method === "GET") {
      const [leads, orders, drafts, sent, recent] = await Promise.all([
        db.prepare("SELECT COUNT(*) AS n FROM leads").first(),
        db.prepare("SELECT COUNT(*) AS n FROM orders WHERE is_archived=0").first(),
        db.prepare("SELECT COUNT(*) AS n FROM emails WHERE send_status='Draft'").first(),
        db.prepare("SELECT COUNT(*) AS n FROM emails WHERE send_status='Sent'").first(),
        db.prepare("SELECT activity_id, activity_date, activity_type, message_summary, outcome FROM activity_log ORDER BY activity_date DESC LIMIT 8").all()
      ]);
      return json({ ok: true, stats: { leads: leads.n, orders: orders.n, drafts: drafts.n, sent: sent.n }, recent: recent.results || [] });
    }

    if (route[0] === "leads" && route.length === 1 && method === "GET") {
      const q = "%" + clean(url.searchParams.get("q"), 120) + "%";
      const result = await db.prepare(`SELECT l.*,
        (SELECT COUNT(*) FROM orders o WHERE o.lead_id=l.lead_id AND o.is_archived=0) AS order_count,
        (SELECT COUNT(*) FROM emails e WHERE e.lead_id=l.lead_id) AS email_count
        FROM leads l WHERE l.company_name LIKE ? OR l.contact_name LIKE ? OR l.contact_email LIKE ? OR l.phone LIKE ?
        ORDER BY l.updated_at DESC LIMIT 250`).bind(q,q,q,q).all();
      return json({ ok: true, leads: result.results || [] });
    }

    if (route[0] === "leads" && route.length === 1 && method === "POST") {
      const input = await body();
      const company = clean(input.company_name,160);
      if (company.length < 2) return json({ ok: false, error: "نام شرکت الزامی است." }, 400);
      const leadId = id("LEAD"), now = new Date().toISOString();
      await db.prepare(`INSERT INTO leads
        (lead_id, company_name, website, country, city, contact_name, job_title, contact_email, phone, personalization_note, priority, lead_status, opt_out, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(leadId, company, clean(input.website,300), clean(input.country,100), clean(input.city,100),
          clean(input.contact_name,160), clean(input.job_title,120), clean(input.contact_email,254),
          clean(input.phone,50), clean(input.personalization_note,3000), clean(input.priority,40)||"Normal",
          clean(input.lead_status,60)||"New", clean(input.opt_out,10)||"No", clean(input.notes,3000), now, now).run();
      await logActivity(db, { lead_id: leadId, activity_type: "Lead created", contact_channel: "Admin", message_summary: "Customer record created", outcome: "Saved" });
      return json({ ok: true, lead_id: leadId }, 201);
    }

    if (route[0] === "leads" && route.length === 2 && method === "GET") {
      const leadId = route[1];
      const [lead, orders, emails, activities] = await Promise.all([
        db.prepare("SELECT * FROM leads WHERE lead_id=?").bind(leadId).first(),
        db.prepare("SELECT * FROM orders WHERE lead_id=? ORDER BY updated_at DESC").bind(leadId).all(),
        db.prepare("SELECT * FROM emails WHERE lead_id=? ORDER BY created_at DESC").bind(leadId).all(),
        db.prepare("SELECT * FROM activity_log WHERE lead_id=? ORDER BY activity_date DESC LIMIT 100").bind(leadId).all()
      ]);
      if (!lead) return json({ ok: false, error: "مشتری پیدا نشد." }, 404);
      return json({ ok: true, lead, orders: orders.results || [], emails: emails.results || [], activities: activities.results || [] });
    }

    if (route[0] === "leads" && route.length === 2 && method === "PATCH") {
      const input = await body(), leadId = route[1];
      const fields = ["company_name","website","country","city","contact_name","job_title","contact_email","phone","lead_status","opt_out","priority","notes","personalization_note"];
      const allowed = Object.fromEntries(fields.filter(k => input[k] !== undefined).map(k => [k, clean(input[k], 3000)]));
      const keys = Object.keys(allowed);
      if (!keys.length) return json({ ok: false, error: "No changes supplied." }, 400);
      const sets = keys.map(k => k + "=?").join(", ");
      await db.prepare("UPDATE leads SET " + sets + ", updated_at=? WHERE lead_id=?")
        .bind(...keys.map(k => allowed[k]), new Date().toISOString(), leadId).run();
      await logActivity(db, { lead_id: leadId, activity_type: "Lead updated", contact_channel: "Admin", message_summary: "Customer record updated", outcome: "Saved" });
      return json({ ok: true });
    }

    if (route[0] === "orders" && route.length === 1 && method === "GET") {
      const q = "%" + clean(url.searchParams.get("q"), 120) + "%";
      const result = await db.prepare(`SELECT o.*, l.company_name FROM orders o LEFT JOIN leads l ON l.lead_id=o.lead_id
        WHERE o.is_archived=0 AND (o.order_id LIKE ? OR o.customer_name LIKE ? OR o.contact_name LIKE ? OR o.contact_phone LIKE ? OR o.tracking_number LIKE ?)
        ORDER BY o.updated_at DESC LIMIT 250`).bind(q,q,q,q,q).all();
      return json({ ok: true, orders: result.results || [] });
    }

    if (route[0] === "orders" && route.length === 1 && method === "POST") {
      const input = await body();
      const orderId = clean(input.order_id, 80) || id("ORD");
      const leadId = clean(input.lead_id, 80) || null;
      const customer = clean(input.customer_name, 160);
      if (!customer) return json({ ok: false, error: "نام مشتری الزامی است." }, 400);
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO orders (order_id, lead_id, customer_name, contact_name, contact_email, contact_phone, product, quantity, unit, order_status, shipping_status, forwarder, tracking_number, order_date, expected_ship_date, created_at, updated_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(orderId, leadId, customer, clean(input.contact_name,160), clean(input.contact_email,254), clean(input.contact_phone,50),
          clean(input.product,200), Number(input.quantity) || null, clean(input.unit,40), clean(input.order_status,60) || "Quotation",
          clean(input.shipping_status,60) || "Pending", clean(input.forwarder,160), clean(input.tracking_number,160),
          clean(input.order_date,40) || null, clean(input.expected_ship_date,40) || null, now, now, clean(input.notes,3000)).run();
      await logActivity(db, { lead_id: leadId, order_id: orderId, activity_type: "Order created", contact_channel: "Admin", message_summary: "Order " + orderId + " created", outcome: "Saved" });
      return json({ ok: true, order_id: orderId }, 201);
    }

    if (route[0] === "orders" && route.length === 2 && method === "PATCH") {
      const orderId = route[1], input = await body();
      const fields = ["lead_id","customer_name","contact_name","contact_email","contact_phone","product","quantity","unit","order_status","shipping_status","forwarder","tracking_number","order_date","expected_ship_date","notes"];
      const allowed = Object.fromEntries(fields.filter(k => input[k] !== undefined).map(k => [k, k === "quantity" ? (Number(input[k]) || null) : clean(input[k],3000)]));
      const keys = Object.keys(allowed);
      if (!keys.length) return json({ ok: false, error: "No changes supplied." }, 400);
      await db.prepare("UPDATE orders SET " + keys.map(k => k + "=?").join(", ") + ", updated_at=? WHERE order_id=? AND is_archived=0")
        .bind(...keys.map(k => allowed[k]), new Date().toISOString(), orderId).run();
      const order = await db.prepare("SELECT lead_id FROM orders WHERE order_id=?").bind(orderId).first();
      await logActivity(db, { lead_id: order?.lead_id, order_id: orderId, activity_type: "Order updated", contact_channel: "Admin", message_summary: "Order " + orderId + " updated", outcome: "Saved" });
      return json({ ok: true });
    }

    if (route[0] === "orders" && route.length === 2 && method === "DELETE") {
      const orderId = route[1];
      await db.prepare("UPDATE orders SET is_archived=1, updated_at=? WHERE order_id=?").bind(new Date().toISOString(), orderId).run();
      const order = await db.prepare("SELECT lead_id FROM orders WHERE order_id=?").bind(orderId).first();
      await logActivity(db, { lead_id: order?.lead_id, order_id: orderId, activity_type: "Order archived", contact_channel: "Admin", message_summary: "Order " + orderId + " archived", outcome: "Archived" });
      return json({ ok: true });
    }

    if (route[0] === "activity" && method === "GET") {
      const result = await db.prepare(`SELECT a.*, l.company_name, o.customer_name
        FROM activity_log a LEFT JOIN leads l ON l.lead_id=a.lead_id
        LEFT JOIN orders o ON o.order_id=a.order_id
        ORDER BY a.activity_date DESC LIMIT 300`).all();
      return json({ ok: true, activities: result.results || [] });
    }

    if (route[0] === "activity" && method === "POST") {
      const input = await body();
      if (!clean(input.activity_type,100)) return json({ ok: false, error: "نوع فعالیت الزامی است." }, 400);
      await logActivity(db, input);
      return json({ ok: true }, 201);
    }

    if (route[0] === "emails" && route[1] === "generate" && method === "POST") {
      const input = await body();
      const leadId = clean(input.lead_id, 80);
      if (!leadId) return json({ ok: false, error: "ابتدا مشتری را انتخاب کنید." }, 400);
      const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || env.GOOGLE_API_KEY;
      if (!geminiKey) return json({ ok: false, error: "کلید Gemini در Cloudflare پیدا نشد. نام Secret را GEMINI_API_KEY قرار دهید." }, 503);
      const lead = await db.prepare("SELECT * FROM leads WHERE lead_id=?").bind(leadId).first();
      if (!lead || !lead.contact_email) return json({ ok: false, error: "مشتری یا ایمیل معتبر پیدا نشد." }, 400);
      const order = input.order_id
        ? await db.prepare("SELECT * FROM orders WHERE order_id=? AND lead_id=?").bind(clean(input.order_id,80),leadId).first()
        : await db.prepare("SELECT * FROM orders WHERE lead_id=? AND is_archived=0 ORDER BY created_at DESC LIMIT 1").bind(leadId).first();
      const prompt = [
        "You are the professional B2B sales correspondence assistant for TABCO, an industrial manufacturer/supplier of square twisted bars used in grating.",
        "Write a concise, credible first-contact or follow-up email in English unless the customer data clearly indicates another language.",
        "Never invent prices, certifications, delivery dates, stock, customer history, technical capabilities, or promises.",
        "Use only facts supplied below. If details are missing, ask clear questions instead of making assumptions.",
        "Return ONLY valid JSON with exactly two string properties: subject and body. No markdown fences.",
        "TABCO brand context: industrial precision, professional long-term cooperation, product: square twisted bar for grating; known sizes may include 4x4, 5x5, 6x6, 8x8, 10x10 mm. Do not claim every size is currently available.",
        "Customer: " + JSON.stringify({company:lead.company_name,contact:lead.contact_name,email:lead.contact_email,country:lead.country,city:lead.city,website:lead.website,notes:lead.notes,personalization:lead.personalization_note}),
        "Related request/order: " + JSON.stringify(order ? {id:order.order_id,product:order.product,quantity:order.quantity,unit:order.unit,status:order.order_status,notes:order.notes} : null),
        "Requested email sequence number: " + String((await db.prepare("SELECT COALESCE(MAX(email_number),0)+1 AS n FROM emails WHERE lead_id=?").bind(leadId).first())?.n || 1)
      ].join("\n\n");
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(geminiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: {
            type: "OBJECT", properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
            required: ["subject", "body"]
          } }
        })
      });
      const generated = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Gemini API error:", generated);
        return json({ ok: false, error: generated.error?.message || "Gemini نتوانست پیش‌نویس را تولید کند." }, 502);
      }
      const rawText = generated.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
      if (!rawText) return json({ ok: false, error: "پاسخ Gemini خالی بود." }, 502);
      let draft;
      try { draft = JSON.parse(rawText); } catch { return json({ ok: false, error: "فرمت پاسخ Gemini معتبر نبود؛ دوباره تلاش کنید." }, 502); }
      const subject = clean(draft.subject,240), emailBody = clean(draft.body,12000);
      if (!subject || !emailBody) return json({ ok: false, error: "Gemini موضوع یا متن ایمیل را تولید نکرد." }, 502);
      const n = await db.prepare("SELECT COALESCE(MAX(email_number),0)+1 AS n FROM emails WHERE lead_id=?").bind(leadId).first();
      const emailId = id("EML"), now = new Date().toISOString();
      await db.prepare("INSERT INTO emails (email_id, lead_id, email_number, recipient_email, email_subject, email_body, send_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?)")
        .bind(emailId, leadId, n.n, lead.contact_email, subject, emailBody, now).run();
      await logActivity(db, { lead_id: leadId, order_id: order?.order_id, activity_type: "AI email drafted", contact_channel: "Gemini", message_summary: "Gemini generated email draft #" + n.n, outcome: "Awaiting admin review" });
      return json({ ok: true, email_id: emailId, email_number: n.n, recipient_email: lead.contact_email, email_subject: subject, email_body: emailBody }, 201);
    }

    if (route[0] === "emails" && route.length === 1 && method === "GET") {
      const result = await db.prepare(`SELECT e.*, l.company_name, l.contact_name FROM emails e
        LEFT JOIN leads l ON l.lead_id=e.lead_id ORDER BY e.created_at DESC LIMIT 300`).all();
      return json({ ok: true, emails: result.results || [] });
    }

    if (route[0] === "emails" && route.length === 1 && method === "POST") {
      const input = await body(), leadId = clean(input.lead_id,80);
      const lead = await db.prepare("SELECT lead_id, contact_email FROM leads WHERE lead_id=?").bind(leadId).first();
      if (!lead || !lead.contact_email) return json({ ok: false, error: "مشتری یا ایمیل معتبر پیدا نشد." }, 400);
      const n = await db.prepare("SELECT COALESCE(MAX(email_number),0)+1 AS n FROM emails WHERE lead_id=?").bind(leadId).first();
      const emailId = id("EML");
      await db.prepare("INSERT INTO emails (email_id, lead_id, email_number, recipient_email, email_subject, email_body, send_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?)")
        .bind(emailId, leadId, n.n, lead.contact_email, clean(input.email_subject,240), clean(input.email_body,12000), new Date().toISOString()).run();
      return json({ ok: true, email_id: emailId }, 201);
    }

    if (route[0] === "emails" && route.length === 2 && method === "PATCH") {
      const input = await body();
      await db.prepare("UPDATE emails SET email_subject=?, email_body=? WHERE email_id=? AND send_status='Draft'")
        .bind(clean(input.email_subject,240), clean(input.email_body,12000), route[1]).run();
      return json({ ok: true });
    }

    if (route[0] === "emails" && route.length === 3 && route[2] === "send" && method === "POST") {
      const input = await body();
      if (input.confirm !== true) return json({ ok: false, error: "برای ارسال، تأیید صریح مدیر لازم است." }, 400);
      const emailId = route[1];
      const email = await db.prepare("SELECT * FROM emails WHERE email_id=?").bind(emailId).first();
      if (!email || email.send_status !== "Draft") return json({ ok: false, error: "فقط پیش‌نویس‌های ذخیره‌شده قابل ارسال هستند." }, 409);
      if (!email.recipient_email || !email.email_subject || !email.email_body) return json({ ok: false, error: "گیرنده، موضوع و متن ایمیل باید کامل باشند." }, 400);
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
        return json({ ok: false, error: "اتصال Gmail کامل نیست. ابتدا Gmail را از پنل متصل کنید و Secret با نام GOOGLE_REFRESH_TOKEN را در Cloudflare ذخیره کنید." }, 503);
      }
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" })
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error("Gmail token refresh failed:", tokenData.error || tokenResponse.status);
        return json({ ok: false, error: "دریافت مجوز موقت Gmail ناموفق بود؛ اتصال Gmail را دوباره بررسی کن." }, 502);
      }
      const utf8Base64 = value => {
        const bytes = new TextEncoder().encode(value);
        let binary = "";
        for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
        return btoa(binary);
      };
      const subjectEncoded = "=?UTF-8?B?" + utf8Base64(email.email_subject) + "?=";
      const mime = [
        "To: " + email.recipient_email,
        "From: TABCO <tabcoyazd@gmail.com>",
        "Subject: " + subjectEncoded,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        utf8Base64(email.email_body)
      ].join("\r\n");
      const raw = utf8Base64(mime).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
      const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Authorization": "Bearer " + tokenData.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ raw })
      });
      const gmailResult = await gmailResponse.json().catch(() => ({}));
      if (!gmailResponse.ok) {
        console.error("Gmail send failed:", gmailResult.error?.message || gmailResponse.status);
        return json({ ok: false, error: gmailResult.error?.message || "ارسال از Gmail ناموفق بود." }, 502);
      }
      await db.prepare("UPDATE emails SET send_status='Sent' WHERE email_id=? AND send_status='Draft'").bind(emailId).run();
      await logActivity(db, { lead_id: email.lead_id, activity_type: "Email sent", contact_channel: "Gmail", message_summary: "Email #" + email.email_number + " sent to " + email.recipient_email, outcome: "Sent" });
      return json({ ok: true, message_id: gmailResult.id || null });
    }

    return json({ ok: false, error: "Admin API route not found." }, 404);
  } catch (error) {
    console.error("TABCO admin API error:", error);
    return json({ ok: false, error: error.message || "Internal server error." }, 500);
  }
}
