const { pool } = require('./db');

/**
 * Kullanıcı mesaj attıkça XP kazandırır ve gerekirse seviye atlatır.
 * @param {string} channelSlug - Kanal adı
 * @param {string} kickUsername - Kullanıcı adı
 * @returns {Promise<{leveledUp: boolean, newLevel: number}|null>} Seviye durumu (hata olursa null)
 */
async function addXP(channelSlug, kickUsername) {
    try {
        // Rastgele 1 ile 5 arası XP
        const xpGained = Math.floor(Math.random() * 5) + 1;

        const res = await pool.query(
            `SELECT xp_points, level FROM user_xp WHERE channel_slug = $1 AND kick_username = $2`,
            [channelSlug, kickUsername]
        );

        if (res.rows.length === 0) {
            // İlk kez mesaj atıyor
            await pool.query(
                `INSERT INTO user_xp (channel_slug, kick_username, xp_points, level) VALUES ($1, $2, $3, 1)
                 ON CONFLICT (channel_slug, kick_username) DO NOTHING`,
                [channelSlug, kickUsername, xpGained]
            );
            return { leveledUp: false, newLevel: 1 };
        }

        const currentXp = res.rows[0].xp_points;
        const currentLevel = res.rows[0].level;

        const newXp = currentXp + xpGained;
        let newLevel = currentLevel;

        // Seviye hesaplama (Örn: Her 100 XP'de 1 level)
        const requiredXp = currentLevel * 100;
        let leveledUp = false;

        if (newXp >= requiredXp) {
            newLevel += 1;
            leveledUp = true;
        }

        await pool.query(
            `UPDATE user_xp SET xp_points = $1, level = $2 WHERE channel_slug = $3 AND kick_username = $4`,
            [newXp, newLevel, channelSlug, kickUsername]
        );

        if (leveledUp) {
            console.log(`🎉 [Level Up] ${kickUsername} seviye atladı! Yeni seviye: ${newLevel}`);
        }
        return { leveledUp, newLevel };
    } catch (e) {
        console.error("❌ XP Ekleme Hatası:", e.message);
        return null;
    }
}

/**
 * Kullanıcının mevcut seviye/XP bilgisini getirir (!level komutu için).
 */
async function getUserLevel(channelSlug, kickUsername) {
    try {
        const res = await pool.query(
            `SELECT xp_points, level FROM user_xp WHERE channel_slug = $1 AND kick_username = $2`,
            [channelSlug, kickUsername]
        );
        if (res.rows.length === 0) return null;
        const { xp_points, level } = res.rows[0];
        return { xp: xp_points, level, requiredXp: level * 100 };
    } catch (e) {
        console.error("❌ Seviye bilgisi çekilemedi:", e.message);
        return null;
    }
}

/**
 * Oyun/çekiliş ödülü olarak bonus XP ekler (seviye hesaplamasıyla birlikte).
 */
async function addBonusXP(channelSlug, kickUsername, amount) {
    try {
        await pool.query(
            `INSERT INTO user_xp (channel_slug, kick_username, xp_points, level)
             VALUES ($1, $2, $3, 1)
             ON CONFLICT (channel_slug, kick_username)
             DO UPDATE SET xp_points = user_xp.xp_points + $3`,
            [channelSlug, kickUsername, amount]
        );
        // Bonus sonrası seviye güncelle
        await pool.query(
            `UPDATE user_xp SET level = GREATEST(level, FLOOR(xp_points / 100.0) + 1)
             WHERE channel_slug = $1 AND kick_username = $2`,
            [channelSlug, kickUsername]
        );
        return true;
    } catch (e) {
        console.error("❌ Bonus XP eklenemedi:", e.message);
        return false;
    }
}

module.exports = {
    addXP,
    getUserLevel,
    addBonusXP
};
