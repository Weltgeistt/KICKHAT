/**
 * Chat komut yönlendirici.
 * "!" ile başlayan mesajları yakalar, ilgili komutu çalıştırır ve
 * cevabı kick_api.sendMessage ile chate yazar.
 */
const { sendMessage } = require('./kick_api');
const { getUserLevel } = require('./games_and_xp');
const { verifyCodeFromChat } = require('./auth');

const SITE_URL = process.env.SITE_URL || 'https://kickhat.net';

// Spam koruması: kanal+komut başına bekleme süresi (ms)
const COMMAND_COOLDOWN_MS = 5000;
const lastUsed = {}; // "channelSlug:command" -> timestamp

function isOnCooldown(channelSlug, command) {
    const key = `${channelSlug}:${command}`;
    const now = Date.now();
    if (lastUsed[key] && now - lastUsed[key] < COMMAND_COOLDOWN_MS) {
        return true;
    }
    lastUsed[key] = now;
    return false;
}

// --- Komut tanımları ---
const commands = {
    async stats({ channelSlug }) {
        return `📊 Kanal istatistikleri: ${SITE_URL}/${channelSlug}/stats`;
    },

    async level({ channelSlug, sender }) {
        const info = await getUserLevel(channelSlug, sender);
        if (!info) {
            return `@${sender} henüz XP kazanmamışsın. Sohbete devam et! 💬`;
        }
        return `@${sender} → Seviye ${info.level} (${info.xp}/${info.requiredXp} XP) ⚡`;
    },

    async verify({ sender, args }) {
        const code = args[0];
        if (!code || !/^\d{6}$/.test(code)) {
            return `@${sender} kullanım: !verify 123456 (kodu ${SITE_URL} üzerinden alabilirsin)`;
        }
        const result = await verifyCodeFromChat(sender, code);
        return `@${sender} ${result.message}`;
    },

    async komutlar() {
        return `🤖 Komutlar: !stats · !level · !verify <kod> · !komutlar`;
    },
};

// Komut takma adları
const aliases = {
    xp: 'level',
    seviye: 'level',
    commands: 'komutlar',
    help: 'komutlar',
    yardim: 'komutlar',
};

/**
 * Gelen chat mesajını işler; komutsa cevabı chate gönderir.
 * @param {object} ctx - { channelSlug, chatroomId, sender, content }
 * @returns {Promise<boolean>} Mesaj bir komut olarak işlendi mi
 */
async function handleChatCommand({ channelSlug, chatroomId, sender, content }) {
    if (!content || !content.startsWith('!')) return false;

    const parts = content.slice(1).trim().split(/\s+/);
    let name = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    if (aliases[name]) name = aliases[name];
    const command = commands[name];
    if (!command) return false; // Tanınmayan komutlar sessizce yoksayılır

    // !verify kullanıcıya özel olduğu için cooldown'dan muaf
    if (name !== 'verify' && isOnCooldown(channelSlug, name)) return true;

    try {
        const reply = await command({ channelSlug, chatroomId, sender, args });
        if (reply) {
            await sendMessage(channelSlug, chatroomId, reply);
        }
    } catch (e) {
        console.error(`❌ Komut hatası (!${name}):`, e.message);
    }
    return true;
}

module.exports = { handleChatCommand };
