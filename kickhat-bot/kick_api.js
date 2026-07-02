/**
 * Kick'e chat mesajı gönderme katmanı.
 *
 * Yol sırası:
 *  1. BOT HESABI (önerilen, Botrix mimarisi): Ayrı bir Kick hesabı (env: BOT_KICK_USERNAME)
 *     siteden "Kick ile Bağlan" ile yetki verir → onun user token'ıyla type:"user" gönderilir.
 *     Mesajlar o hesaptan görünür; kanallar o hesabı mod yapabilir. Token'lar DB'de, otomatik refresh.
 *  2. RESMÎ type:"bot" (app access token) — Kick şu an app'lere bot kimliği vermiyor (401/500),
 *     ileride açılırsa diye duruyor.
 *  3. GAYRIRESMÎ endpoint (env: KICK_SESSION_TOKEN) — kırılgan, son çare.
 */

const { getKickTokens, saveKickTokens } = require('./db');

const OAUTH_TOKEN_URL = 'https://id.kick.com/oauth/token';
const OFFICIAL_API_BASE = 'https://api.kick.com/public/v1';
const UNOFFICIAL_API_BASE = 'https://kick.com/api/v2';

// --- App access token (kanal sorguları + type:bot denemesi için) ---
let appToken = null;        // { access_token, expires_at }
const broadcasterIdCache = {}; // channelSlug -> broadcaster_user_id

function officialConfigured() {
    return !!(process.env.KICK_CLIENT_ID && process.env.KICK_CLIENT_SECRET);
}

function botAccountConfigured() {
    return !!(process.env.BOT_KICK_USERNAME && officialConfigured());
}

function unofficialConfigured() {
    return !!process.env.KICK_SESSION_TOKEN;
}

async function getAppToken() {
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
        throw new Error(`OAuth app token alınamadı (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    appToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return appToken.access_token;
}

/** Kanal slug'ından broadcaster_user_id bulur (cache'li). */
async function getBroadcasterId(channelSlug) {
    if (broadcasterIdCache[channelSlug]) return broadcasterIdCache[channelSlug];
    const token = await getAppToken();
    const res = await fetch(`${OFFICIAL_API_BASE}/channels?slug=${encodeURIComponent(channelSlug)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Kanal bilgisi alınamadı (${res.status})`);
    const data = await res.json();
    const id = data?.data?.[0]?.broadcaster_user_id;
    if (!id) throw new Error(`broadcaster_user_id bulunamadı: ${channelSlug}`);
    broadcasterIdCache[channelSlug] = id;
    return id;
}

// --- Bot hesabı user token yönetimi (DB + otomatik refresh) ---
async function getBotUserToken() {
    const botUser = (process.env.BOT_KICK_USERNAME || '').toLowerCase();
    if (!botUser) return null;

    const tok = await getKickTokens(botUser);
    if (!tok) {
        console.log(`ℹ️ Bot hesabı (${botUser}) henüz bağlanmamış — kickhat.net/login → "Kick ile Bağlan"`);
        return null;
    }

    // Süresi dolmak üzereyse yenile (5 dk pay)
    const expiresAt = tok.expires_at ? new Date(tok.expires_at).getTime() : 0;
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
        return tok.access_token;
    }

    if (!tok.refresh_token) {
        console.error(`⚠️ Bot hesabı token'ı süresi doldu ve refresh token yok — yeniden bağlanmalı.`);
        return null;
    }

    const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tok.refresh_token,
            client_id: process.env.KICK_CLIENT_ID,
            client_secret: process.env.KICK_CLIENT_SECRET,
        }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`⚠️ Bot token refresh başarısız (${res.status}): ${text.slice(0, 200)}`);
        return null;
    }
    const d = await res.json();
    await saveKickTokens(botUser, {
        kick_user_id: tok.kick_user_id,
        access_token: d.access_token,
        refresh_token: d.refresh_token || tok.refresh_token,
        expires_at: new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString(),
        scopes: d.scope || tok.scopes,
    });
    return d.access_token;
}

// --- Yol 1: Bot hesabıyla gönderim (type:user) ---
async function sendViaBotAccount(channelSlug, content) {
    const token = await getBotUserToken();
    if (!token) throw new Error('Bot hesabı token yok');
    const broadcasterId = await getBroadcasterId(channelSlug);

    const res = await fetch(`${OFFICIAL_API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcaster_user_id: broadcasterId, content, type: 'user' }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Bot hesabı gönderimi başarısız (${res.status}): ${text.slice(0, 200)}`);
    }
    return true;
}

// --- Yol 2: Resmî type:bot (şu an Kick tarafında kapalı görünüyor) ---
async function sendViaOfficialBot(channelSlug, content) {
    const token = await getAppToken();
    const broadcasterId = await getBroadcasterId(channelSlug);
    const res = await fetch(`${OFFICIAL_API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcaster_user_id: broadcasterId, content, type: 'bot' }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`type:bot gönderimi başarısız (${res.status}): ${text.slice(0, 200)}`);
    }
    return true;
}

// --- Yol 3: Gayrıresmî endpoint (yedek) ---
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
 * Kanala chat mesajı gönderir; yapılandırılmış yolları sırayla dener.
 * @returns {Promise<boolean>}
 */
async function sendMessage(channelSlug, chatroomId, content) {
    if (!content || !content.trim()) return false;

    if (botAccountConfigured()) {
        try {
            return await sendViaBotAccount(channelSlug, content);
        } catch (e) {
            console.error(`⚠️ Bot hesabı hatası (${channelSlug}):`, e.message);
        }
    }

    if (officialConfigured()) {
        try {
            return await sendViaOfficialBot(channelSlug, content);
        } catch (e) {
            console.error(`⚠️ type:bot hatası (${channelSlug}):`, e.message);
        }
    }

    if (unofficialConfigured()) {
        try {
            return await sendViaUnofficial(chatroomId, content);
        } catch (e) {
            console.error(`⚠️ Gayrıresmî gönderim hatası (${channelSlug}):`, e.message);
        }
    }

    if (!botAccountConfigured() && !officialConfigured() && !unofficialConfigured()) {
        console.log(`ℹ️ Mesaj gönderilemedi (yapılandırma yok): [${channelSlug}] ${content}`);
    }
    return false;
}

module.exports = {
    sendMessage,
    officialConfigured,
    botAccountConfigured,
    unofficialConfigured,
};
