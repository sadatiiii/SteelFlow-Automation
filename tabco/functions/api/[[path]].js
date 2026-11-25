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
      return json({ ok: false, error: "ارسال ایمیل تا زمان اتصال سرویس ارسال امن و تنظیم تأیید انسانی فعال نیست." }, 501);
    }

    return json({ ok: false, error: "Admin API route not found." }, 404);
  } catch (error) {
    console.error("TABCO admin API error:", error);
    return json({ ok: false, error: error.message || "Internal server error." }, 500);
  }
}
