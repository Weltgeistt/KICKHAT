import { cookies } from "next/headers";
import { readSession } from "@/lib/session";
import { botFetch } from "@/lib/botApi";

// Yayıncının kendi kanal özeti
export async function GET() {
  const session = await readSession(await cookies());
  if (!session) return Response.json({ error: "Giriş gerekli" }, { status: 401 });
  return botFetch(`/api/dashboard/${encodeURIComponent(session.username)}`);
}
