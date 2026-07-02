require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pusher } = require('pusher-js');
const { initDB, saveMessage, markMessageDeleted, getUserMessages, getChatStatistics, getModerationLogs, getModerationSummary, getDashboardStats, getAdminOverview, getFeatureFlags, setFeatureFlag, getGlobalLeaderboard, getChannelSettings, setChannelSettings, getUserRole, saveKickTokens } = require('./db');
const { generateVerificationCode, consumeVerifiedCode } = require('./auth');
const { handleChatCommand } = require('./commands');
const { addXP } = require('./games_and_xp');
const { sendMessage } = require('./kick_api');
const games = require('./games');
const path = require('path');
// Add standard node fetch if node version is < 18, but Node 20 has global fetch.

const app = express();
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'kickhat-secret-key-123';

let VIP_CHANNELS = [];
try {
    VIP_CHANNELS = require('./vip.json');
} catch (e) {
    console.log("⚠️ vip.json bulunamadı. VIP kanallar otomatik dinlenmeyecek.");
}

// Pusher instances keyed by chatroomId → { pusher, channelSlug }
const activeConnections = {};

// Global feature flag'leri 30 sn'lik cache ile okur (her mesajda DB'ye gitmemek için)
let flagCache = { data: {}, fetchedAt: 0 };
async function getCachedFlags() {
    if (Date.now() - flagCache.fetchedAt > 30000) {
        flagCache = { data: await getFeatureFlags(), fetchedAt: Date.now() };
    }
    return flagCache.data;
}

// Gelen her chat mesajını işler: komutlar + oyun tahminleri + XP + Level Up bildirimi
async function processMessage(channelSlug, chatroomId, username, content, badges = []) {
    try {
        const flags = await getCachedFlags();
        const gamesEnabled = flags.chat_games !== false;
        const isMod = badges.some(b => b?.type === 'moderator');
        const isBroadcaster = badges.some(b => b?.type === 'broadcaster');

        // Komutlar ("!" ile başlayanlar) — işlendiyse XP verme
        const wasCommand = await handleChatCommand({
            channelSlug, chatroomId, sender: username, content,
            isMod, isBroadcaster, gamesEnabled,
        });
        if (wasCommand) return;

        // Aktif kelime oyunu varsa tahmini kontrol et (kazanan bonus XP alır)
        if (gamesEnabled && games.wordGameActive(channelSlug)) {
            const won = await games.checkGuess(channelSlug, chatroomId, username, content);
            if (won) return;
        }

        // XP sistemi (global chat_games flag'i kapalıysa çalışmaz)
        if (gamesEnabled) {
            const xp = await addXP(channelSlug, username);
            if (xp?.leveledUp) {
                await sendMessage(channelSlug, chatroomId, `🎉 @${username} seviye atladı! Yeni seviye: ${xp.newLevel} ⚡`);
            }
        }
    } catch (e) {
        console.error("❌ Mesaj işleme hatası:", e.message);
    }
}

function connectToChannel(channelSlug, chatroomId) {
    if (activeConnections[chatroomId]) {
        return false; // Zaten bağlı
    }

    const pusher = new Pusher('32cbd69e4b950bf97679', {
        cluster: 'us2',
        wsHost: 'ws-us2.pusher.com',
        wsPort: 443,
        wssPort: 443,
        forceTLS: true,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
    });

    const channelName = `chatrooms.${chatroomId}.v2`;
    const channel = pusher.subscribe(channelName);

    channel.bind('App\\Events\\ChatMessageEvent', (data) => {
        try {
            const msg = data;
            const dbMsg = {
                id: msg.id,
                channel_slug: channelSlug,
                username: msg.sender?.username || msg.sender?.slug,
                content: msg.content,
                created_at: msg.created_at
            };
            if (dbMsg.username && dbMsg.content) {
                saveMessage(dbMsg);
                processMessage(channelSlug, chatroomId, dbMsg.username, dbMsg.content, msg.sender?.identity?.badges || []);
            }
        } catch (e) {
            console.error("Message parse error:", e);
        }
    });

    channel.bind('App\\Events\\ChatMessageDeletedEvent', (data) => {
        if (data?.message?.id) {
            markMessageDeleted(data.message.id);
        }
    });

    activeConnections[chatroomId] = { pusher, channelSlug };
    console.log(`✅ Bot bağlandı: ${channelSlug} (Room: ${chatroomId})`);
    return true;
}

// VIP Kanallara otomatik bağlanma fonksiyonu
async function connectToVipChannels() {
    console.log("🌟 VIP Kanallara otomatik bağlantı başlatılıyor...");
    for (const channel of VIP_CHANNELS) {
        connectToChannel(channel.slug, channel.id);
    }
}

async function start() {
    await initDB();

    // Sunucu başlar başlamaz VIP kanallara gir
    await connectToVipChannels();

    app.use('/public', express.static(path.join(__dirname, 'public')));

    // Ana Sayfa (Landing Page)
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Temiz URL Yönlendirmeleri
    app.get('/:channel_slug/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });
    
    app.get('/:channel_slug/stats', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'stats.html'));
    });

    app.get('/:channel_slug/modlogs', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'modlogs.html'));
    });

    app.get('/:channel_slug', (req, res) => {
        res.redirect(`/${req.params.channel_slug}/dashboard`);
    });

    // 🌐 Herkese Açık Endpoint'ler (Auth gerekmez)
    // Top Chatters istatistiklerini getiren endpoint
    app.get('/api/stats/:channel_slug', async (req, res) => {
        const { channel_slug } = req.params;
        const period = req.query.period || 'all';
        const from   = req.query.from   || null;
        const to     = req.query.to     || null;
        const stats  = await getChatStatistics(channel_slug, period, from, to);
        res.json(stats);
    });

    // Moderasyon loglarını getiren endpoint
    app.get('/api/modlogs/:channel_slug', async (req, res) => {
        const { channel_slug } = req.params;
        const filters = {
            action:   req.query.action   || null,
            username: req.query.username || null,
            from:     req.query.from     || null,
            to:       req.query.to       || null,
            limit:    parseInt(req.query.limit) || 200,
        };
        const logs = await getModerationLogs(channel_slug, filters);
        res.json(logs);
    });

    // Moderasyon özeti (toplam uya rı/ban/timeout sayıları)
    app.get('/api/modlogs/:channel_slug/summary', async (req, res) => {
        const { channel_slug } = req.params;
        const summary = await getModerationSummary(channel_slug);
        res.json(summary);
    });

    // Yayıncı Dashboard endpoint'i
    app.get('/api/dashboard/:channel_slug', async (req, res) => {
        const { channel_slug } = req.params;
        const data = await getDashboardStats(channel_slug);
        if (!data) return res.status(500).json({ error: 'Dashboard verisi alınamadı' });
        res.json(data);
    });

    // Global XP liderlik tablosu (herkese açık)
    app.get('/api/leaderboard', async (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const rows = await getGlobalLeaderboard(limit);
        res.json(rows);
    });

    // 🔒 Güvenlik Middleware (Sadece bizim uygulamamız erişebilir)
    app.use((req, res, next) => {
        const key = req.headers['x-api-key'] || req.query.key;
        if (key !== API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    });

    // Masaüstü uygulamasının botu bir kanala sokmasını sağlayan endpoint
    app.post('/api/bot/join', (req, res) => {
        const { channelSlug, chatroomId } = req.body;
        if (!channelSlug || !chatroomId) return res.status(400).json({ error: 'channelSlug and chatroomId required' });

        const isNew = connectToChannel(channelSlug, chatroomId);
        if (isNew) {
            res.json({ message: 'Connected to ' + channelSlug });
        } else {
            res.json({ message: 'Already connected to ' + channelSlug });
        }
    });

    // Kullanıcının geçmiş mesajlarını getiren endpoint
    app.get('/api/history/:channel_slug/:username', async (req, res) => {
        const { channel_slug, username } = req.params;
        const messages = await getUserMessages(channel_slug, username);
        res.json(messages);
    });

    // 🛠️ Admin Paneli Endpoint'leri (API key korumalı — website sunucu tarafından çağrılır)
    // Global özet: bağlı kanallar, 24 saatlik metrikler, son moderasyon logları
    app.get('/api/admin/overview', async (req, res) => {
        const overview = await getAdminOverview();
        if (!overview) return res.status(500).json({ error: 'Admin özeti alınamadı' });

        // Canlı bağlantı bilgisi DB'den değil bellekten gelir
        overview.connected_channels = Object.values(activeConnections).map(c => c.channelSlug);
        overview.connected_count = overview.connected_channels.length;
        res.json(overview);
    });

    // Global feature flag'leri oku
    app.get('/api/admin/flags', async (req, res) => {
        const flags = await getFeatureFlags();
        res.json(flags);
    });

    // Global feature flag güncelle (örn: ai_moderation, chat_games)
    app.post('/api/admin/flags', async (req, res) => {
        const { feature_name, is_enabled } = req.body;
        if (!feature_name || typeof is_enabled !== 'boolean') {
            return res.status(400).json({ error: 'feature_name (string) ve is_enabled (boolean) gerekli' });
        }
        const ok = await setFeatureFlag(feature_name, is_enabled);
        if (!ok) return res.status(500).json({ error: 'Flag güncellenemedi' });
        res.json({ feature_name, is_enabled });
    });

    // 🔐 Website Giriş Akışı (API key korumalı — website sunucusu çağırır)
    // 1) Site kullanıcı adı için kod üretir → kullanıcı chate "!verify <kod>" yazar
    app.post('/api/auth/start', (req, res) => {
        const { kick_username } = req.body;
        if (!kick_username || !/^[a-zA-Z0-9_]{3,25}$/.test(kick_username)) {
            return res.status(400).json({ error: 'Geçerli bir kick_username gerekli' });
        }
        const code = generateVerificationCode(kick_username);
        res.json({ code, expires_in: 600 });
    });

    // 2) Site kodun chat'ten doğrulanmasını poll eder; doğrulanınca rolüyle döner
    app.get('/api/auth/status', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.status(400).json({ error: 'code gerekli' });
        const result = consumeVerifiedCode(code);
        if (!result.verified) return res.json({ verified: false });
        const role = await getUserRole(result.kick_username);
        res.json({ verified: true, kick_username: result.kick_username, role });
    });

    // 🔗 Kick OAuth: authorization code'u token'a çevirir ve kanalı "bağlanmış" yapar.
    // Kanal bu yetkiyi verince bot o kanala resmi API ile mesaj atabilir.
    app.post('/api/kick/exchange', async (req, res) => {
        const { code, code_verifier, redirect_uri } = req.body || {};
        if (!code || !code_verifier || !redirect_uri) {
            return res.status(400).json({ error: 'code, code_verifier ve redirect_uri gerekli' });
        }
        try {
            const tokenRes = await fetch('https://id.kick.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: process.env.KICK_CLIENT_ID,
                    client_secret: process.env.KICK_CLIENT_SECRET,
                    redirect_uri,
                    code,
                    code_verifier,
                }),
            });
            const token = await tokenRes.json();
            if (!tokenRes.ok || !token.access_token) {
                console.error('❌ Kick token exchange hatası:', JSON.stringify(token).slice(0, 300));
                return res.status(502).json({ error: 'Kick token exchange başarısız' });
            }

            // Token sahibinin kanalını öğren (slug + user id)
            let slug = null, userId = null;
            const chRes = await fetch('https://api.kick.com/public/v1/channels', {
                headers: { Authorization: `Bearer ${token.access_token}` },
            });
            if (chRes.ok) {
                const ch = await chRes.json();
                slug = ch?.data?.[0]?.slug || null;
                userId = ch?.data?.[0]?.broadcaster_user_id || null;
            }
            if (!slug) {
                const uRes = await fetch('https://api.kick.com/public/v1/users', {
                    headers: { Authorization: `Bearer ${token.access_token}` },
                });
                if (uRes.ok) {
                    const u = await uRes.json();
                    slug = (u?.data?.[0]?.name || '').toLowerCase() || null;
                    userId = u?.data?.[0]?.user_id || userId;
                }
            }
            if (!slug) return res.status(502).json({ error: 'Kick kullanıcı bilgisi alınamadı' });

            await saveKickTokens(slug, {
                kick_user_id: userId,
                access_token: token.access_token,
                refresh_token: token.refresh_token || null,
                expires_at: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString(),
                scopes: token.scope || '',
            });

            const role = await getUserRole(slug);
            console.log(`🔗 Kick kanalı bağlandı: ${slug} (user_id: ${userId})`);
            res.json({ username: slug, kick_user_id: userId, role });
        } catch (e) {
            console.error('❌ Kick exchange hatası:', e.message);
            res.status(500).json({ error: 'Exchange sırasında hata: ' + e.message });
        }
    });

    // 🎛️ Kanal bot ayarları (yayıncı paneli — sahiplik kontrolü website tarafında)
    app.get('/api/channel/:channel_slug/settings', async (req, res) => {
        const settings = await getChannelSettings(req.params.channel_slug);
        if (!settings) return res.status(500).json({ error: 'Ayarlar alınamadı' });
        res.json(settings);
    });

    app.post('/api/channel/:channel_slug/settings', async (req, res) => {
        const { ai_moderation_enabled, strictness_level, app_language, games_enabled } = req.body || {};
        const patch = {};
        if (typeof ai_moderation_enabled === 'boolean') patch.ai_moderation_enabled = ai_moderation_enabled;
        if ([1, 2, 3].includes(strictness_level)) patch.strictness_level = strictness_level;
        if (['tr', 'en', 'es', 'it', 'de'].includes(app_language)) patch.app_language = app_language;
        if (typeof games_enabled === 'boolean') patch.games_enabled = games_enabled;
        if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Güncellenecek geçerli alan yok' });

        const ok = await setChannelSettings(req.params.channel_slug, patch);
        if (!ok) return res.status(500).json({ error: 'Ayarlar kaydedilemedi' });
        res.json(await getChannelSettings(req.params.channel_slug));
    });



    app.listen(PORT, () => {
        console.log(`🚀 Kickhat Bot API çalışıyor: http://localhost:${PORT}`);
        console.log(`🔑 API Key: ${API_KEY}`);
    });
}

start();
