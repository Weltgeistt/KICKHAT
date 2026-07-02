/**
 * Chat komut yönlendirici.
 * "!" ile başlayan mesajları yakalar, ilgili komutu çalıştırır ve
 * cevabı kick_api.sendMessage ile chate yazar.
 *
 * Yetki seviyeleri: herkes · mod (moderatör + yayıncı) · yayıncı
 * Spam koruması: kanal+komut 5 sn · kullanıcı başına global 3 sn
 */
const { sendMessage } = require('./kick_api');
const { getUserLevel } = require('./games_and_xp');
const { verifyCodeFromChat } = require('./auth');
const { getChatStatistics, getChannelRank, getCustomCommands, setCustomCommand, deleteCustomCommand } = require('./db');
const games = require('./games');

const SITE_URL = process.env.SITE_URL || 'https://kickhat.net';

// --- Cooldown'lar ---
const CHANNEL_CD_MS = 5000;  // kanal+komut
const USER_CD_MS = 3000;     // kullanıcı başına global
const lastChannelUse = {};   // "slug:cmd" -> ts
const lastUserUse = {};      // "slug:user" -> ts

function onChannelCooldown(slug, cmd) {
    const key = `${slug}:${cmd}`;
    if (lastChannelUse[key] && Date.now() - lastChannelUse[key] < CHANNEL_CD_MS) return true;
    lastChannelUse[key] = Date.now();
    return false;
}

function onUserCooldown(slug, user) {
    const key = `${slug}:${user}`;
    if (lastUserUse[key] && Date.now() - lastUserUse[key] < USER_CD_MS) return true;
    lastUserUse[key] = Date.now();
    return false;
}

// --- Yardımcılar ---

function progressBar(current, total, width = 10) {
    const filled = Math.min(width, Math.round((current / total) * width));
    return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

const EIGHT_BALL = [
    'Kesinlikle evet! ✅', 'Evet, öyle görünüyor 👍', 'Bana sorarsan evet 😏',
    'Hiç sanmıyorum ❌', 'Kesinlikle hayır! 🙅', 'Pek olası değil 😬',
    'Belki... 🤔', 'Şu an söyleyemem, tekrar sor 🔮', 'Buna sen karar ver 😅',
    'Yıldızlar evet diyor ✨', 'İşaretler hayır diyor 🌑', 'Kesin gözüyle bakma 👀'
];

// --- Komut tanımları ---
// perm: 'all' | 'mod' | 'broadcaster' — game:true olanlar chat_games flag'ine tabi

const commands = {
    stats: {
        perm: 'all',
        desc: 'Kanalın istatistik sayfası',
        async run({ channelSlug }) {
            return `📊 Kanal istatistikleri: ${SITE_URL}/${channelSlug}/stats`;
        },
    },

    level: {
        perm: 'all',
        desc: 'Seviye, XP ilerlemesi ve kanal sırası',
        async run({ channelSlug, sender }) {
            const info = await getUserLevel(channelSlug, sender);
            if (!info) return `@${sender} henüz XP kazanmamışsın. Sohbete devam et! 💬`;
            const rank = await getChannelRank(channelSlug, sender);
            const bar = progressBar(info.xp % 100 === 0 && info.xp > 0 ? 100 : info.xp - (info.level - 1) * 100, 100);
            return `@${sender} → Seviye ${info.level} ⚡ ${info.xp}/${info.requiredXp} XP [${bar}]${rank ? ` · Kanal sırası: #${rank}` : ''}`;
        },
    },

    top: {
        perm: 'all',
        desc: 'Bu haftanın en aktif 5 izleyicisi',
        async run({ channelSlug }) {
            const rows = await getChatStatistics(channelSlug, 'week');
            if (!rows.length) return '📉 Bu hafta henüz veri yok.';
            const top5 = rows.slice(0, 5).map((r, i) => `${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${r.username} (${r.count})`).join(' · ');
            return `🏆 Haftanın en aktifleri: ${top5}`;
        },
    },

    verify: {
        perm: 'all',
        desc: 'Site hesabını Kick hesabınla eşleştirir',
        noCooldown: true,
        async run({ sender, args }) {
            const code = args[0];
            if (!code || !/^\d{6}$/.test(code)) {
                return `@${sender} kullanım: !verify 123456 (kodu ${SITE_URL}/login üzerinden alabilirsin)`;
            }
            const result = await verifyCodeFromChat(sender, code);
            return `@${sender} ${result.message}`;
        },
    },

    // --- Eğlence ---

    zar: {
        perm: 'all', game: true,
        desc: 'Zar atar (!zar veya !zar 100)',
        async run({ sender, args }) {
            const max = Math.min(Math.max(parseInt(args[0]) || 6, 2), 1000000);
            const roll = Math.floor(Math.random() * max) + 1;
            return `🎲 @${sender} zar attı: ${roll} (1-${max})`;
        },
    },

    yazitura: {
        perm: 'all', game: true,
        desc: 'Yazı tura atar',
        async run({ sender }) {
            return `🪙 @${sender} → ${Math.random() < 0.5 ? 'YAZI' : 'TURA'}!`;
        },
    },

    '8ball': {
        perm: 'all', game: true,
        desc: 'Sihirli 8 topuna soru sor',
        async run({ sender, args }) {
            if (!args.length) return `@${sender} bir soru sormalısın: !8ball bugün kazanacak mıyım?`;
            return `🔮 @${sender} ${EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)]}`;
        },
    },

    // --- Çekiliş ---

    cekilis: {
        perm: 'mod', game: true,
        desc: 'Çekiliş başlatır (!cekilis 5 → 5 dk)',
        async run({ channelSlug, chatroomId, args }) {
            const r = games.startRaffle(channelSlug, chatroomId, parseInt(args[0]) || 2);
            if (!r.ok) return '🎟️ Zaten aktif bir çekiliş var! (!cekilisbitir ile erken bitirebilirsin)';
            return `🎟️ ÇEKİLİŞ BAŞLADI! Katılmak için "!katil" yaz. Süre: ${r.minutes} dk · Ödül: 150 XP 🏆`;
        },
    },

    katil: {
        perm: 'all', game: true,
        desc: 'Aktif çekilişe katılır',
        noCooldown: true, silent: true,
        async run({ channelSlug, sender }) {
            games.joinRaffle(channelSlug, sender);
            return null; // sessiz — chat'i flood etmemek için
        },
    },

    cekilisbitir: {
        perm: 'mod', game: true,
        desc: 'Çekilişi erken bitirip kazananı seçer',
        async run({ channelSlug }) {
            if (!games.raffleActive(channelSlug)) return '🎟️ Aktif çekiliş yok.';
            await games.finishRaffle(channelSlug, true);
            return null; // duyuruyu finishRaffle atıyor
        },
    },

    // --- Kelime Tahmin ---

    kelimetahmin: {
        perm: 'mod', game: true,
        desc: 'Kelime tahmin oyunu başlatır',
        async run({ channelSlug, chatroomId }) {
            const g = games.startWordGame(channelSlug, chatroomId);
            if (!g.ok) return '🧠 Zaten aktif bir kelime oyunu var!';
            return `🧠 KELİME TAHMİN! ${g.length} harfli kelimeyi ilk bilen 100 XP kazanır: ${g.mask} (ipucu için: !ipucu)`;
        },
    },

    ipucu: {
        perm: 'all', game: true,
        desc: 'Aktif kelime oyununda harf açar',
        async run({ channelSlug }) {
            const h = games.giveHint(channelSlug);
            if (!h) return '🧠 Aktif kelime oyunu yok. (!kelimetahmin ile başlat)';
            return `💡 İpucu: ${h.mask}${h.last ? ' (son ipucuydu!)' : ''}`;
        },
    },

    // --- Özel komutlar (mod yönetimi) ---

    komutekle: {
        perm: 'mod',
        desc: 'Özel komut ekler (!komutekle !discord discord.gg/xyz)',
        async run({ channelSlug, sender, args }) {
            const name = (args[0] || '').replace(/^!/, '').toLowerCase();
            const response = args.slice(1).join(' ');
            if (!name || !response) return `@${sender} kullanım: !komutekle !komutadi verilecek cevap`;
            if (commands[name]) return `@${sender} "!${name}" yerleşik bir komut, üzerine yazılamaz.`;
            if (name.length > 25 || response.length > 400) return `@${sender} komut adı veya cevap çok uzun.`;
            const ok = await setCustomCommand(channelSlug, name, response, sender);
            return ok ? `✅ "!${name}" komutu eklendi.` : `❌ Komut eklenemedi.`;
        },
    },

    komutsil: {
        perm: 'mod',
        desc: 'Özel komutu siler (!komutsil !discord)',
        async run({ channelSlug, sender, args }) {
            const name = (args[0] || '').replace(/^!/, '').toLowerCase();
            if (!name) return `@${sender} kullanım: !komutsil !komutadi`;
            const ok = await deleteCustomCommand(channelSlug, name);
            return ok ? `🗑️ "!${name}" silindi.` : `@${sender} "!${name}" diye özel bir komut yok.`;
        },
    },

    komutlar: {
        perm: 'all',
        desc: 'Komut listesini gösterir',
        async run({ channelSlug }) {
            const custom = await getCustomCommands(channelSlug);
            const customPart = custom.length ? ` · Kanala özel: ${custom.map(c => '!' + c.command_name).join(' ')}` : '';
            return `🤖 !stats !level !top !zar !yazitura !8ball !cekilis !katil !kelimetahmin !ipucu !verify · Mod: !komutekle !komutsil${customPart} · Detay: ${SITE_URL}/docs`;
        },
    },
};

// Komut takma adları
const aliases = {
    xp: 'level', seviye: 'level', rank: 'level',
    commands: 'komutlar', help: 'komutlar', yardim: 'komutlar',
    coinflip: 'yazitura', dice: 'zar',
    raffle: 'cekilis', join: 'katil',
    hint: 'ipucu',
};

/**
 * Gelen chat mesajını işler; komutsa cevabı chate gönderir.
 * @param {object} ctx - { channelSlug, chatroomId, sender, content, isMod, isBroadcaster, gamesEnabled }
 * @returns {Promise<boolean>} Mesaj bir komut olarak işlendi mi
 */
async function handleChatCommand(ctx) {
    const { channelSlug, chatroomId, sender, content, isMod = false, isBroadcaster = false, gamesEnabled = true } = ctx;
    if (!content || !content.startsWith('!')) return false;

    const parts = content.slice(1).trim().split(/\s+/);
    let name = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);
    if (aliases[name]) name = aliases[name];

    try {
        let cmd = commands[name];

        // Yerleşik değilse kanala özel komutlara bak
        if (!cmd) {
            const custom = await getCustomCommands(channelSlug);
            const found = custom.find(c => c.command_name === name);
            if (!found) return false; // Tanınmayan komut — sessiz
            cmd = { perm: 'all', run: async () => found.response };
        }

        // Oyun komutları kapalıysa sessizce yoksay
        if (cmd.game && !gamesEnabled) return true;

        // Yetki kontrolü
        const canMod = isMod || isBroadcaster || sender.toLowerCase() === channelSlug.toLowerCase();
        if (cmd.perm === 'mod' && !canMod) return true;
        if (cmd.perm === 'broadcaster' && !isBroadcaster && sender.toLowerCase() !== channelSlug.toLowerCase()) return true;

        // Cooldown (verify ve katil muaf)
        if (!cmd.noCooldown) {
            if (onUserCooldown(channelSlug, sender)) return true;
            if (onChannelCooldown(channelSlug, name)) return true;
        }

        const reply = await cmd.run({ channelSlug, chatroomId, sender, args, isMod: canMod });
        if (reply) {
            await sendMessage(channelSlug, chatroomId, reply);
        }
    } catch (e) {
        console.error(`❌ Komut hatası (!${name}):`, e.message);
    }
    return true;
}

module.exports = { handleChatCommand };
