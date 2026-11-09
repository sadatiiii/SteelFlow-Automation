export async function onRequestGet({ env }) {
  // اول از KV می‌خونه، اگه نبود از Environment Variable
  const url =
    (env.CONFIG && (await env.CONFIG.get("N8N_FORM_URL"))) ||
    env.N8N_FORM_URL ||
    "";

  return Response.json(
    { N8N_FORM_URL: url },
    { headers: { "Cache-Control": "no-store" } }
  );
}