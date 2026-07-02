import { botFetch } from "@/lib/botApi";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const username = body?.kick_username?.trim();
  if (!username || !/^[a-zA-Z0-9_]{3,25}$/.test(username)) {
    return Response.json({ error: "Geçersiz kullanıcı adı" }, { status: 400 });
  }
  return botFetch("/api/auth/start", {
    method: "POST",
    body: JSON.stringify({ kick_username: username }),
  });
}
