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

module.exports = { 
    initDB, 
    saveMessage, 
    markMessageDeleted, 
    getUserMessages,
    logModerationAction,
    getUserStrikes,
    getChatStatistics,
    getModerationLogs,
    getModerationSummary,
    getDashboardStats
};
