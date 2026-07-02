import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const KICK_CLIENT_ID = process.env.KICK_CLIENT_ID || "01KWHHDWMP9KTGPYGD82PJQVVE";
const SITE_URL = process.env.SITE_URL || "https://kickhat.net";
const SCOPES = "user:read channel:read chat:write";

// Kick OAuth 2.1 (PKCE zorunlu) — yetkilendirme başlangıcı
export async function GET() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("base64url");

  const cookieStore = await cookies();
  cookieStore.set("kick_oauth", `${verifier}.${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 dk
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: KICK_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/kick/callback`,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  redirect(`https://id.kick.com/oauth/authorize?${params}`);
}
