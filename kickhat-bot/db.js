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

module.exports = { initDB, saveMessage, markMessageDeleted, getUserMessages };
