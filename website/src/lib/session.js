// HMAC imzalı, bağımlılıksız oturum çerezi.
// Değer formatı: base64url(JSON payload) + "." + HMAC-SHA256 imzası
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "kickhat-dev-session-secret-degistir";
export const SESSION_COOKIE = "kickhat_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

// Admin yetkisi: DB'deki role VEYA env'deki kurucu listesi
const ADMIN_USERS = (process.env.ADMIN_USERS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

/** Oturum değeri üretir. */
export function createSessionValue(username, role) {
  const payload = Buffer.from(
    JSON.stringify({ u: username.toLowerCase(), r: role, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Çerez değerini doğrular; geçersizse null döner. */
export function verifySessionValue(value) {
  if (!value || !value.includes(".")) return null;
  const [payload, sig] = value.split(".");
  const expected = sign(payload);
  // Zamanlama saldırılarına karşı sabit süreli karşılaştırma
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.u || Date.now() > data.exp) return null;
    return { username: data.u, role: data.r || "user" };
  } catch {
    return null;
  }
}

/** cookies() store'undan oturumu okur (server component / route handler). */
export async function readSession(cookieStore) {
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionValue(raw);
}

/** Kullanıcı admin mi? (DB rolü veya ADMIN_USERS env listesi) */
export function isAdmin(session) {
  if (!session) return false;
  if (["admin", "founder"].includes(session.role)) return true;
  return ADMIN_USERS.includes(session.username);
}

/** Set-Cookie başlığı için çerez seçenekleri */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
