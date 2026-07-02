// Bot API'sine sunucu tarafından erişim yardımcısı.
// API anahtarı sadece sunucuda kalır (NEXT_PUBLIC_ önekli DEĞİL).
const BOT_API_URL = process.env.BOT_API_URL || "http://127.0.0.1:3000";
const BOT_API_KEY = process.env.BOT_API_KEY || "kickhat-secret-key-123";

/**
 * Bot API'sine istek atar ve JSON cevabını Response olarak döndürür.
 * @param {string} path - Örn: "/api/admin/overview"
 * @param {RequestInit} [init] - fetch seçenekleri (method, body vs.)
 */
export async function botFetch(path, init = {}) {
  try {
    const res = await fetch(`${BOT_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BOT_API_KEY,
        ...(init.headers || {}),
      },
      // Admin verisi her zaman güncel olmalı, cache'leme
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return Response.json(
        { error: data?.error || `Bot API hatası (${res.status})` },
        { status: res.status }
      );
    }
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: "Bot API'sine ulaşılamadı: " + e.message },
      { status: 502 }
    );
  }
}
