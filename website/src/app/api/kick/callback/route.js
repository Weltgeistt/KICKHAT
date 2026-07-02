import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionValue, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const BOT_API_URL = process.env.BOT_API_URL || "http://127.0.0.1:3000";
const BOT_API_KEY = process.env.BOT_API_KEY || "kickhat-secret-key-123";
const SITE_URL = process.env.SITE_URL || "https://kickhat.net";

// Kick OAuth dönüşü: code'u bot üzerinden token'a çevir, kanalı bağla, oturum aç
export async function GET(request) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const saved = cookieStore.get("kick_oauth")?.value || "";
  cookieStore.delete("kick_oauth");

  if (oauthError) redirect(`/login?error=kick_denied`);

  const [verifier, savedState] = saved.split(".");
  if (!code || !state || !verifier || state !== savedState) {
    redirect(`/login?error=kick_state`);
  }

  let username = null;
  let role = "user";
  try {
    const res = await fetch(`${BOT_API_URL}/api/kick/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": BOT_API_KEY },
      cache: "no-store",
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        redirect_uri: `${SITE_URL}/api/kick/callback`,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.username) {
      console.error("Kick exchange başarısız:", data);
      redirect(`/login?error=kick_exchange`);
    }
    username = data.username;
    role = data.role || "user";
  } catch (e) {
    // redirect() throw'ları buraya da düşer; gerçek hataysa login'e gönder
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    redirect(`/login?error=kick_exchange`);
  }

  // Kanal bağlandı → aynı zamanda siteye giriş yap
  cookieStore.set(SESSION_COOKIE, createSessionValue(username, role), sessionCookieOptions());
  redirect(`/panel?kick=connected`);
}
