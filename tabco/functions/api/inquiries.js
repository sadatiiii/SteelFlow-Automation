const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function base64url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getGoogleAccessToken(env) {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY secret.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsignedToken = header + "." + claims;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const assertion = unsignedToken + "." + base64url(signature);
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error("Google OAuth token exchange failed: " + (tokenData.error_description || tokenData.error || tokenResponse.status));
  }
  return tokenData.access_token;
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Origin not allowed." }, 403);
  }

  if (!env.GOOGLE_SHEET_ID) {
    return json({ error: "GOOGLE_SHEET_ID is not configured in Cloudflare." }, 503);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  let rawBody;
  try {
    rawBody = await request.text();
    if (rawBody.length > 12000) return json({ error: "Request is too large." }, 413);
  } catch {
    return json({ error: "Could not read request body." }, 400);
  }

  let input;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const fullName = String(input.full_name || "").trim();
  const companyName = String(input.company_name || "").trim();
  const email = String(input.email || "").trim();
  if (fullName.length < 2 || fullName.length > 120 ||
      companyName.length < 2 || companyName.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: "Please provide a valid name, company, and email address." }, 400);
  }

  const clean = (value, max) => String(value || "").trim().slice(0, max);
  const leadId = "WEB-" + crypto.randomUUID();
  const row = [
    leadId,
    companyName,
    clean(input.website, 300),
    clean(input.country, 100),
    clean(input.city, 100),
    "",
    fullName,
    "",
    email,
    "",
    clean(input.phone, 50),
    clean(input.note, 3000),
    "Normal",
    "New",
    "No",
    "Website inquiry"
  ];

  try {
    const accessToken = await getGoogleAccessToken(env);
    const range = encodeURIComponent("Leads!A:P");
    const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(env.GOOGLE_SHEET_ID) +
      "/values/" + range +
      ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

    const sheetsResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [row] })
    });

    if (!sheetsResponse.ok) {
      const details = await sheetsResponse.text();
      console.error("Google Sheets append failed:", sheetsResponse.status, details.slice(0, 1000));
      return json({ error: "Could not save the inquiry to Google Sheets. Check the service account access and sheet tab name." }, 502);
    }

    return json({ ok: true, lead_id: leadId, message: "Inquiry saved." }, 201);
  } catch (error) {
    console.error("Inquiry API error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The inquiry service is not configured correctly. Check Cloudflare secrets and Google service account settings." }, 503);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Allow": "POST, OPTIONS" } });
  }
  return json({ error: "Method Not Allowed" }, 405);
}
