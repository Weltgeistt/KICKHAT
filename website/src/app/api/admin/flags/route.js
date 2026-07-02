import { cookies } from "next/headers";
import { readSession, isAdmin } from "@/lib/session";
import { botFetch } from "@/lib/botApi";

async function requireAdmin() {
  const session = await readSession(await cookies());
  return isAdmin(session) ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Yetkisiz" }, { status: 403 });
  return botFetch("/api/admin/flags");
}

export async function POST(request) {
  if (!(await requireAdmin())) return Response.json({ error: "Yetkisiz" }, { status: 403 });

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
