import { cookies } from "next/headers";
import { createSessionValue, SESSION_COOKIE, sessionCookieOptions, isAdmin, verifySessionValue } from "@/lib/session";

const BOT_API_URL = process.env.BOT_API_URL || "http://127.0.0.1:3000";
const BOT_API_KEY = process.env.BOT_API_KEY || "kickhat-secret-key-123";

// Kod doğrulandı mı diye bot'a sorar; doğrulandıysa oturum çerezini yazar.
export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "Geçersiz kod" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BOT_API_URL}/api/auth/status?code=${code}`, {
      headers: { "x-api-key": BOT_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json({ error: "Bot API hatası" }, { status: 502 });
    }
    const data = await res.json();

    if (!data.verified) {
      return Response.json({ verified: false });
    }

    // Doğrulandı → oturum çerezi oluştur
    const value = createSessionValue(data.kick_username, data.role || "user");
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, value, sessionCookieOptions());

    const session = verifySessionValue(value);
    return Response.json({
      verified: true,
      username: data.kick_username,
      isAdmin: isAdmin(session),
    });
  } catch (e) {
    return Response.json({ error: "Bot API'sine ulaşılamadı: " + e.message }, { status: 502 });
  }
}
