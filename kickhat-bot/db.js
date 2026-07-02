const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kickhat'
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                channel_slug TEXT NOT NULL,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_channel_user ON messages(channel_slug, username);

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                kick_username TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user', -- 'user', 'admin', 'founder'
                language TEXT DEFAULT 'tr', -- 'tr', 'en', 'de', 'es'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_type TEXT DEFAULT 'free',
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bot_settings (
                channel_slug TEXT PRIMARY KEY,
                ai_moderation_enabled BOOLEAN DEFAULT true,
                strictness_level INTEGER DEFAULT 2, -- 1: Relaxed, 2: Normal, 3: Strict
                app_language TEXT DEFAULT 'tr',
                games_enabled BOOLEAN DEFAULT true
            );

            CREATE TABLE IF NOT EXISTS user_xp (
                id SERIAL PRIMARY KEY,
                channel_slug TEXT NOT NULL,
                kick_username TEXT NOT NULL,
                xp_points INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                UNIQUE(channel_slug, kick_username)
            );

            CREATE TABLE IF NOT EXISTS feature_flags (
                feature_name TEXT PRIMARY KEY,
                is_enabled BOOLEAN DEFAULT true
            );

            CREATE TABLE IF NOT EXISTS moderation_logs (
                id SERIAL PRIMARY KEY,
                channel_slug TEXT NOT NULL,
                kick_username TEXT NOT NULL,
                action TEXT NOT NULL, -- 'warning', 'timeout', 'ban'
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS channel_commands (
                channel_slug TEXT NOT NULL,
                command_name TEXT NOT NULL,
                response TEXT NOT NULL,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (channel_slug, command_name)
            );

            CREATE TABLE IF NOT EXISTS kick_tokens (
                channel_slug TEXT PRIMARY KEY,
                kick_user_id BIGINT,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at TIMESTAMP,
                scopes TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Veritabanı (PostgreSQL) hazır.");
    } catch (e) {
        console.error("❌ PostgreSQL bağlantı hatası:", e.message);
    }
}

async function saveMessage(msg) {
    try {
        await pool.query(
            `INSERT INTO messages (id, channel_slug, username, content, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
            [msg.id, msg.channel_slug, msg.username, msg.content, msg.created_at || new Date().toISOString()]
        );
    } catch (e) {
        console.error("❌ Mesaj kaydedilemedi:", e.message);
    }
}

async function markMessageDeleted(id) {
    try {
        await pool.query(`UPDATE messages SET deleted = 1 WHERE id = $1`, [id]);
    } catch (e) {
        console.error("❌ Mesaj silindi olarak işaretlenemedi:", e.message);
    }
}

async function getUserMessages(channel_slug, username) {
    try {
        const res = await pool.query(
            `SELECT * FROM messages WHERE channel_slug = $1 AND username = $2 ORDER BY created_at DESC LIMIT 500`,
            [channel_slug, username]
        );
        return res.rows;
    } catch (e) {
        console.error("❌ Mesajlar getirilemedi:", e.message);
        return [];
    }
}

// --- Yeni Moderasyon Fonksiyonları ---

async function logModerationAction(channel_slug, kick_username, action, reason) {
    try {
        await pool.query(
            `INSERT INTO moderation_logs (channel_slug, kick_username, action, reason) VALUES ($1, $2, $3, $4)`,
            [channel_slug, kick_username, action, reason]
        );
    } catch (e) {
        console.error("❌ Moderasyon logu kaydedilemedi:", e.message);
    }
}

async function getUserStrikes(channel_slug, kick_username) {
    try {
        // Warning ve Timeout eylemlerini "strike" olarak sayıyoruz
        const res = await pool.query(
            `SELECT COUNT(*) as count FROM moderation_logs WHERE channel_slug = $1 AND kick_username = $2 AND action IN ('warning', 'timeout')`,
            [channel_slug, kick_username]
        );
        return parseInt(res.rows[0].count) || 0;
    } catch (e) {
        console.error("❌ Strike sayısı çekilemedi:", e.message);
        return 0;
    }
}

async function getChatStatistics(channel_slug, period = 'all', from = null, to = null) {
    try {
        let dateCondition = '';
        const values = [channel_slug];

        if (from && to) {
            // Özel tarih aralığı
            values.push(from);
            values.push(to);
            dateCondition = `AND created_at >= $2 AND created_at <= $3`;
        } else if (period === 'day') {
            dateCondition = `AND created_at >= NOW() - INTERVAL '1 day'`;
        } else if (period === 'week') {
            dateCondition = `AND created_at >= NOW() - INTERVAL '1 week'`;
        } else if (period === 'month') {
            dateCondition = `AND created_at >= NOW() - INTERVAL '1 month'`;
        } else if (period === 'year') {
            dateCondition = `AND created_at >= NOW() - INTERVAL '1 year'`;
        }

        const query = `
            SELECT username, COUNT(*) as count 
            FROM messages 
            WHERE channel_slug = $1 ${dateCondition}
            GROUP BY username 
            ORDER BY count DESC 
            LIMIT 100
        `;
        const res = await pool.query(query, values);
        return res.rows;
    } catch (e) {
        console.error("❌ İstatistikler çekilemedi:", e.message);
        return [];
    }
}

async function getModerationLogs(channel_slug, { action = null, username = null, from = null, to = null, limit = 200 } = {}) {
    try {
        const conditions = ['channel_slug = $1'];
        const values = [channel_slug];
        let i = 2;

        if (action && action !== 'all') {
            conditions.push(`action = $${i++}`);
            values.push(action);
        }
        if (username) {
            conditions.push(`kick_username ILIKE $${i++}`);
            values.push(`%${username}%`);
        }
        if (from) {
            conditions.push(`created_at >= $${i++}`);
            values.push(from);
        }
        if (to) {
            const toPlus = new Date(to);
            toPlus.setDate(toPlus.getDate() + 1);
            conditions.push(`created_at < $${i++}`);
            values.push(toPlus.toISOString().split('T')[0]);
        }

        const where = conditions.join(' AND ');
        const res = await pool.query(
            `SELECT id, kick_username, action, reason, created_at 
             FROM moderation_logs 
             WHERE ${where}
             ORDER BY created_at DESC 
             LIMIT $${i}`,
            [...values, limit]
        );
        return res.rows;
    } catch (e) {
        console.error("❌ Moderasyon logları çekilemedi:", e.message);
        return [];
    }
}

async function getModerationSummary(channel_slug) {
    try {
        const res = await pool.query(
            `SELECT action, COUNT(*) as count FROM moderation_logs WHERE channel_slug = $1 GROUP BY action`,
            [channel_slug]
        );
        const summary = { warning: 0, timeout: 0, ban: 0, total: 0 };
        res.rows.forEach(r => {
            summary[r.action] = parseInt(r.count);
            summary.total += parseInt(r.count);
        });
        return summary;
    } catch (e) {
        console.error("❌ Moderasyon özeti çekilemedi:", e.message);
        return { warning: 0, timeout: 0, ban: 0, total: 0 };
    }
}

async function getDashboardStats(channel_slug) {
    try {
        const [
            todayMsgs,
            weekMsgs,
            allMsgs,
            todayUsers,
            weekUsers,
            topChatters,
            recentMods,
            hourlyActivity,
            dailyTrend
        ] = await Promise.all([
            // Bugünkü mesaj sayısı
            pool.query(`SELECT COUNT(*) as count FROM messages WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '1 day'`, [channel_slug]),
            // Bu haftaki mesaj sayısı
            pool.query(`SELECT COUNT(*) as count FROM messages WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '7 days'`, [channel_slug]),
            // Toplam mesaj sayısı
            pool.query(`SELECT COUNT(*) as count FROM messages WHERE channel_slug=$1`, [channel_slug]),
            // Bugün kaç farklı kullanıcı yazdı
            pool.query(`SELECT COUNT(DISTINCT username) as count FROM messages WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '1 day'`, [channel_slug]),
            // Bu hafta kaç farklı kullanıcı yazdı
            pool.query(`SELECT COUNT(DISTINCT username) as count FROM messages WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '7 days'`, [channel_slug]),
            // Top 5 chatter (bu hafta)
            pool.query(`SELECT username, COUNT(*) as count FROM messages WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '7 days' GROUP BY username ORDER BY count DESC LIMIT 5`, [channel_slug]),
            // Son 5 moderasyon aksiyonu
            pool.query(`SELECT kick_username, action, reason, created_at FROM moderation_logs WHERE channel_slug=$1 ORDER BY created_at DESC LIMIT 5`, [channel_slug]),
            // Son 24 saatin saatlik dağılımı
            pool.query(`
                SELECT date_trunc('hour', created_at) as hour, COUNT(*) as count
                FROM messages
                WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY hour ORDER BY hour ASC
            `, [channel_slug]),
            // Son 7 günün günlük dağılımı
            pool.query(`
                SELECT date_trunc('day', created_at) as day, COUNT(*) as count
                FROM messages
                WHERE channel_slug=$1 AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY day ORDER BY day ASC
            `, [channel_slug]),
        ]);

        return {
            today_messages:  parseInt(todayMsgs.rows[0].count),
            week_messages:   parseInt(weekMsgs.rows[0].count),
            total_messages:  parseInt(allMsgs.rows[0].count),
            today_users:     parseInt(todayUsers.rows[0].count),
            week_users:      parseInt(weekUsers.rows[0].count),
            top_chatters:    topChatters.rows,
            recent_mods:     recentMods.rows,
            hourly_activity: hourlyActivity.rows,
            daily_trend:     dailyTrend.rows,
        };
    } catch (e) {
        console.error("❌ Dashboard istatistikleri çekilemedi:", e.message);
        return null;
    }
}

// --- Global Admin Fonksiyonları (website yönetim paneli için) ---

async function getAdminOverview() {
    try {
        const [
            msgs24h,
            users24h,
            modActions24h,
            totalChannels,
            recentLogs
        ] = await Promise.all([
            // Son 24 saatteki toplam mesaj (tüm kanallar)
            pool.query(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'`),
            // Son 24 saatte yazan farklı kullanıcı sayısı
            pool.query(`SELECT COUNT(DISTINCT username) as count FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'`),
            // Son 24 saatteki moderasyon aksiyonları
            pool.query(`SELECT COUNT(*) as count FROM moderation_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`),
            // Veritabanında mesajı olan toplam kanal sayısı
            pool.query(`SELECT COUNT(DISTINCT channel_slug) as count FROM messages`),
            // Tüm kanallardan son 10 moderasyon aksiyonu
            pool.query(`SELECT channel_slug, kick_username, action, reason, created_at FROM moderation_logs ORDER BY created_at DESC LIMIT 10`)
        ]);

        return {
            messages_24h:    parseInt(msgs24h.rows[0].count),
            active_users_24h: parseInt(users24h.rows[0].count),
            mod_actions_24h: parseInt(modActions24h.rows[0].count),
            total_channels:  parseInt(totalChannels.rows[0].count),
            recent_logs:     recentLogs.rows,
        };
    } catch (e) {
        console.error("❌ Admin özeti çekilemedi:", e.message);
        return null;
    }
}

async function getFeatureFlags() {
    try {
        const res = await pool.query(`SELECT feature_name, is_enabled FROM feature_flags`);
        const flags = {};
        res.rows.forEach(r => { flags[r.feature_name] = r.is_enabled; });
        return flags;
    } catch (e) {
        console.error("❌ Feature flag'ler çekilemedi:", e.message);
        return {};
    }
}

async function setFeatureFlag(featureName, isEnabled) {
    try {
        await pool.query(
            `INSERT INTO feature_flags (feature_name, is_enabled) VALUES ($1, $2)
             ON CONFLICT (feature_name) DO UPDATE SET is_enabled = $2`,
            [featureName, isEnabled]
        );
        return true;
    } catch (e) {
        console.error("❌ Feature flag güncellenemedi:", e.message);
        return false;
    }
}

// --- Liderlik Tablosu ---

async function getGlobalLeaderboard(limit = 50) {
    try {
        const res = await pool.query(
            `SELECT kick_username,
                    SUM(xp_points)::int AS total_xp,
                    MAX(level)::int     AS best_level,
                    COUNT(DISTINCT channel_slug)::int AS channel_count
             FROM user_xp
             GROUP BY kick_username
             ORDER BY total_xp DESC
             LIMIT $1`,
            [Math.min(limit, 100)]
        );
        return res.rows;
    } catch (e) {
        console.error("❌ Liderlik tablosu çekilemedi:", e.message);
        return [];
    }
}

// --- Kanal Bot Ayarları (yayıncı paneli için) ---

const DEFAULT_CHANNEL_SETTINGS = {
    ai_moderation_enabled: true,
    strictness_level: 2,
    app_language: 'tr',
    games_enabled: true,
};

async function getChannelSettings(channelSlug) {
    try {
        const res = await pool.query(
            `SELECT ai_moderation_enabled, strictness_level, app_language, games_enabled
             FROM bot_settings WHERE channel_slug = $1`,
            [channelSlug]
        );
        if (res.rows.length === 0) return { channel_slug: channelSlug, ...DEFAULT_CHANNEL_SETTINGS };
        return { channel_slug: channelSlug, ...res.rows[0] };
    } catch (e) {
        console.error("❌ Kanal ayarları çekilemedi:", e.message);
        return null;
    }
}

async function setChannelSettings(channelSlug, settings) {
    try {
        const merged = { ...DEFAULT_CHANNEL_SETTINGS, ...(await getChannelSettings(channelSlug) || {}), ...settings };
        await pool.query(
            `INSERT INTO bot_settings (channel_slug, ai_moderation_enabled, strictness_level, app_language, games_enabled)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (channel_slug) DO UPDATE SET
                ai_moderation_enabled = $2, strictness_level = $3, app_language = $4, games_enabled = $5`,
            [channelSlug, merged.ai_moderation_enabled, merged.strictness_level, merged.app_language, merged.games_enabled]
        );
        return true;
    } catch (e) {
        console.error("❌ Kanal ayarları kaydedilemedi:", e.message);
        return false;
    }
}

// --- Kanal başına özel komutlar (!komutekle ile eklenir) ---

async function getCustomCommands(channelSlug) {
    try {
        const res = await pool.query(
            `SELECT command_name, response FROM channel_commands WHERE channel_slug = $1 ORDER BY command_name`,
            [channelSlug]
        );
        return res.rows;
    } catch (e) {
        console.error("❌ Özel komutlar çekilemedi:", e.message);
        return [];
    }
}

async function setCustomCommand(channelSlug, commandName, response, createdBy) {
    try {
        await pool.query(
            `INSERT INTO channel_commands (channel_slug, command_name, response, created_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (channel_slug, command_name) DO UPDATE SET response = $3, created_by = $4`,
            [channelSlug, commandName.toLowerCase(), response, createdBy]
        );
        return true;
    } catch (e) {
        console.error("❌ Özel komut kaydedilemedi:", e.message);
        return false;
    }
}

async function deleteCustomCommand(channelSlug, commandName) {
    try {
        const res = await pool.query(
            `DELETE FROM channel_commands WHERE channel_slug = $1 AND command_name = $2`,
            [channelSlug, commandName.toLowerCase()]
        );
        return res.rowCount > 0;
    } catch (e) {
        console.error("❌ Özel komut silinemedi:", e.message);
        return false;
    }
}

// --- Kanal içi XP sırası ---

async function getChannelRank(channelSlug, kickUsername) {
    try {
        const res = await pool.query(
            `SELECT COUNT(*) + 1 AS rank FROM user_xp
             WHERE channel_slug = $1
               AND xp_points > (SELECT xp_points FROM user_xp WHERE channel_slug = $1 AND kick_username = $2)`,
            [channelSlug, kickUsername]
        );
        return parseInt(res.rows[0]?.rank) || null;
    } catch (e) {
        console.error("❌ Kanal sırası çekilemedi:", e.message);
        return null;
    }
}

// --- Kick OAuth token saklama (kanal yetkilendirmeleri) ---

async function saveKickTokens(channelSlug, { kick_user_id, access_token, refresh_token, expires_at, scopes }) {
    try {
        await pool.query(
            `INSERT INTO kick_tokens (channel_slug, kick_user_id, access_token, refresh_token, expires_at, scopes, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (channel_slug) DO UPDATE SET
                kick_user_id = $2, access_token = $3, refresh_token = $4,
                expires_at = $5, scopes = $6, updated_at = NOW()`,
            [channelSlug.toLowerCase(), kick_user_id, access_token, refresh_token, expires_at, scopes]
        );
        return true;
    } catch (e) {
        console.error("❌ Kick token kaydedilemedi:", e.message);
        return false;
    }
}

async function getKickTokens(channelSlug) {
    try {
        const res = await pool.query(`SELECT * FROM kick_tokens WHERE channel_slug = $1`, [channelSlug.toLowerCase()]);
        return res.rows[0] || null;
    } catch (e) {
        console.error("❌ Kick token okunamadı:", e.message);
        return null;
    }
}

// --- Kullanıcı rolü (admin koruması için) ---

async function getUserRole(kickUsername) {
    try {
        const res = await pool.query(
            `SELECT role FROM users WHERE kick_username = $1`,
            [kickUsername.toLowerCase()]
        );
        return res.rows[0]?.role || 'user';
    } catch (e) {
        console.error("❌ Kullanıcı rolü çekilemedi:", e.message);
        return 'user';
    }
}

module.exports = {
    pool,
    initDB,
    saveMessage,
    markMessageDeleted,
    getUserMessages,
    logModerationAction,
    getUserStrikes,
    getChatStatistics,
    getModerationLogs,
    getModerationSummary,
    getDashboardStats,
    getAdminOverview,
    getFeatureFlags,
    setFeatureFlag,
    getGlobalLeaderboard,
    getChannelSettings,
    setChannelSettings,
    getUserRole,
    saveKickTokens,
    getKickTokens,
    getCustomCommands,
    setCustomCommand,
    deleteCustomCommand,
    getChannelRank
};
