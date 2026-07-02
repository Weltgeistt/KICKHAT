import { cookies } from "next/headers";
import { readSession } from "@/lib/session";
import { botFetch } from "@/lib/botApi";

// Yayıncı sadece KENDİ kanalının ayarlarını okuyabilir/yazabilir
// (Kick'te kanal slug'ı == kullanıcı adı)

export async function GET() {
  const session = await readSession(await cookies());
  if (!session) return Response.json({ error: "Giriş gerekli" }, { status: 401 });
  return botFetch(`/api/channel/${encodeURIComponent(session.username)}/settings`);
}

export async function POST(request) {
  const session = await readSession(await cookies());
  if (!session) return Response.json({ error: "Giriş gerekli" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  return botFetch(`/api/channel/${encodeURIComponent(session.username)}/settings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
