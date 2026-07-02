import { botFetch } from "@/lib/botApi";

export async function GET() {
  return botFetch("/api/admin/flags");
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.feature_name || typeof body.is_enabled !== "boolean") {
    return Response.json(
      { error: "feature_name (string) ve is_enabled (boolean) gerekli" },
      { status: 400 }
    );
  }
  return botFetch("/api/admin/flags", {
    method: "POST",
    body: JSON.stringify({
      feature_name: body.feature_name,
      is_enabled: body.is_enabled,
    }),
  });
}
