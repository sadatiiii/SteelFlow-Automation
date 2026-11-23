// All TABCO API endpoints are implemented as Pages Functions and use the shared D1 binding.
// No external Automation API origin or Google Sheets proxy is used here.
export async function onRequest({ request }) {
  return Response.json(
    { ok: false, error: "API route not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
