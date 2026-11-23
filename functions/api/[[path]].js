export async function onRequest({ request, env }) {
  const origin = (env.AUTOMATION_API_ORIGIN || "").replace(/\/$/, "");
  if (!origin) {
    return Response.json(
      { error: "Automation API is not configured. Set AUTOMATION_API_ORIGIN in Cloudflare Pages." },
      { status: 503 }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const upstream = await fetch(new Request(target.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual"
    }));
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch {
    return Response.json({ error: "Automation API is temporarily unavailable." }, { status: 502 });
  }
}
