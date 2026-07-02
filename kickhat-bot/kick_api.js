/**
 * Kick'e chat mesajı gönderme katmanı.
 *
 * İki yol destekler (öncelik sırasıyla):
 *  1. RESMÎ Kick Dev API (dev.kick.com) — OAuth client_credentials + chat:write scope.
 *     Gerekli env: KICK_CLIENT_ID, KICK_CLIENT_SECRET
 *  2. GAYRIRESMÎ endpoint — Kick hesabının oturum token'ı ile doğrudan gönderim.
 *     Gerekli env: KICK_SESSION_TOKEN (kırılgan; Cloudflare'a takılabilir, sadece yedek)
 *
 * Hiçbiri yapılandırılmamışsa sendMessage sessizce false döner (bot salt-okunur çalışır).
 */

const OAUTH_TOKEN_URL = 'https://id.kick.com/oauth/token';
const OFFICIAL_API_BASE = 'https://api.kick.com/public/v1';
const UNOFFICIAL_API_BASE = 'https://kick.com/api/v2';

// --- Resmî API: app access token yönetimi ---
let appToken = null;        // { access_token, expires_at }
const broadcasterIdCache = {}; // channelSlug -> broadcaster_user_id

function officialConfigured() {
    return !!(process.env.KICK_CLIENT_ID && process.env.KICK_CLIENT_SECRET);
}

function unofficialConfigured() {
    return !!process.env.KICK_SESSION_TOKEN;
}

async function getAppToken() {
    // Token hâlâ geçerliyse yeniden kullan (60 sn güvenlik payı)
    if (appToken && Date.now() < appToken.expires_at - 60000) {
        return appToken.access_token;
    }

    const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.KICK_CLIENT_ID,
            client_secret: process.env.KICK_CLIENT_SECRET,
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OAuth token alınamadı (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    appToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return appToken.access_token;
}

/**
 * Kanal slug'ından broadcaster_user_id bulur (resmî API, cache'li).
 */
async function getBroadcasterId(channelSlug) {
    if (broadcasterIdCache[channelSlug]) return broadcasterIdCache[channelSlug];

    const token = await getAppToken();
    const res = await fetch(`${OFFICIAL_API_BASE}/channels?slug=${encodeURIComponent(channelSlug)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Kanal bilgisi alınamadı (${res.status})`);
    }

    const data = await res.json();
    const id = data?.data?.[0]?.broadcaster_user_id;
    if (!id) throw new Error(`broadcaster_user_id bulunamadı: ${channelSlug}`);

    broadcasterIdCache[channelSlug] = id;
    return id;
}

// --- Yol 1: Resmî API ile gönderim ---
async function sendViaOfficial(channelSlug, content) {
    const token = await getAppToken();
    const broadcasterId = await getBroadcasterId(channelSlug);

    const res = await fetch(`${OFFICIAL_API_BASE}/chat`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            broadcaster_user_id: broadcasterId,
            content: content,
            type: 'bot',
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Resmî API gönderimi başarısız (${res.status}): ${text.slice(0, 200)}`);
    }
    return true;
}

// --- Yol 2: Gayrıresmî endpoint ile gönderim (yedek) ---
async function sendViaUnofficial(chatroomId, content) {
    const res = await fetch(`${UNOFFICIAL_API_BASE}/messages/send/${chatroomId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.KICK_SESSION_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ content, type: 'message' }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Gayrıresmî gönderim başarısız (${res.status}): ${text.slice(0, 200)}`);
    }
    return true;
}

/**
 * Kanala chat mesajı gönderir. Resmî API'yi dener, olmazsa gayrıresmî yola düşer.
 * @param {string} channelSlug - Kanal adı (resmî yol için)
 * @param {number|string} chatroomId - Chatroom ID (gayrıresmî yol için)
 * @param {string} content - Gönderilecek mesaj
 * @returns {Promise<boolean>} Gönderim başarılı mı
 */
async function sendMessage(channelSlug, chatroomId, content) {
    if (!content || !content.trim()) return false;

    if (officialConfigured()) {
        try {
            return await sendViaOfficial(channelSlug, content);
        } catch (e) {
            console.error(`⚠️ Resmî API hatası (${channelSlug}):`, e.message);
            // Resmî yol çöktüyse gayrıresmî yedeğe düş
        }
    }

    if (unofficialConfigured()) {
        try {
            return await sendViaUnofficial(chatroomId, content);
        } catch (e) {
            console.error(`⚠️ Gayrıresmî gönderim hatası (${channelSlug}):`, e.message);
        }
    }

    if (!officialConfigured() && !unofficialConfigured()) {
        console.log(`ℹ️ Mesaj gönderilemedi (yapılandırma yok, salt-okunur mod): [${channelSlug}] ${content}`);
    }
    return false;
}

module.exports = {
    sendMessage,
    // Test/teşhis için dışa açık
    officialConfigured,
    unofficialConfigured,
};
