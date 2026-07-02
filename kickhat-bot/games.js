/**
 * Chat oyun motoru — kanal başına bellekte durum tutar.
 *  - Çekiliş:      !cekilis <dk> → izleyiciler !katil → süre bitince kazanan
 *  - Kelime Tahmin: !kelimetahmin → bot ipucu verir, ilk doğru yazan kazanır
 * Kazananlara bonus XP yazılır ve chate duyurulur.
 */
const { sendMessage } = require('./kick_api');
const { addBonusXP } = require('./games_and_xp');

const RAFFLE_XP = 150;
const WORD_XP = 100;

// channelSlug -> { participants: Set, timer, endsAt, chatroomId }
const raffles = {};
// channelSlug -> { word, revealed, timer, chatroomId, hintsGiven }
const wordGames = {};

const WORDS = [
    'yayın', 'klavye', 'monitör', 'kulaklık', 'mikrofon', 'kamera', 'oyuncu', 'turnuva',
    'galibiyet', 'strateji', 'karakter', 'seviye', 'görev', 'hazine', 'kalkan', 'kılıç',
    'ejderha', 'büyücü', 'zindan', 'harita', 'sandık', 'iksir', 'zafer', 'meydan',
    'takım', 'rekabet', 'şampiyon', 'madalya', 'enerji', 'refleks', 'taktik', 'savunma',
    'hücum', 'gol', 'derbi', 'transfer', 'antrenman', 'kupa', 'lider', 'efsane'
];

function trLower(s) {
    // Türkçe karakter güvenli küçültme (I→ı, İ→i)
    return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

// ---------- ÇEKİLİŞ ----------

function startRaffle(channelSlug, chatroomId, minutes) {
    if (raffles[channelSlug]) return { ok: false, reason: 'already' };
    const mins = Math.min(Math.max(minutes || 2, 1), 30);

    raffles[channelSlug] = {
        participants: new Set(),
        chatroomId,
        endsAt: Date.now() + mins * 60000,
        timer: setTimeout(() => finishRaffle(channelSlug), mins * 60000),
    };
    return { ok: true, minutes: mins };
}

function joinRaffle(channelSlug, username) {
    const r = raffles[channelSlug];
    if (!r) return false;
    const before = r.participants.size;
    r.participants.add(username);
    return r.participants.size > before; // ilk katılım mı
}

async function finishRaffle(channelSlug, early = false) {
    const r = raffles[channelSlug];
    if (!r) return { ok: false };
    clearTimeout(r.timer);
    delete raffles[channelSlug];

    const list = [...r.participants];
    if (list.length === 0) {
        await sendMessage(channelSlug, r.chatroomId, '🎟️ Çekiliş bitti ama katılan olmadı 😢');
        return { ok: true, winner: null };
    }
    const winner = list[Math.floor(Math.random() * list.length)];
    await addBonusXP(channelSlug, winner, RAFFLE_XP);
    await sendMessage(
        channelSlug, r.chatroomId,
        `🎉 Çekilişi kazanan: @${winner}! (${list.length} katılımcı arasından) +${RAFFLE_XP} XP 🏆${early ? ' [erken bitirildi]' : ''}`
    );
    return { ok: true, winner };
}

function raffleActive(channelSlug) {
    return !!raffles[channelSlug];
}

// ---------- KELİME TAHMİN ----------

function maskWord(word, revealed) {
    return word.split('').map((ch, i) => (i < revealed ? ch : '▪')).join(' ');
}

function startWordGame(channelSlug, chatroomId) {
    if (wordGames[channelSlug]) return { ok: false, reason: 'already' };
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];

    wordGames[channelSlug] = {
        word,
        revealed: 1,
        chatroomId,
        hintsGiven: 0,
        // 3 dk içinde bilinmezse oyun biter
        timer: setTimeout(async () => {
            const g = wordGames[channelSlug];
            if (!g) return;
            delete wordGames[channelSlug];
            await sendMessage(channelSlug, chatroomId, `⏰ Süre doldu! Kimse bilemedi. Kelime: "${g.word}"`);
        }, 3 * 60000),
    };
    return { ok: true, mask: maskWord(word, 1), length: word.length };
}

function giveHint(channelSlug) {
    const g = wordGames[channelSlug];
    if (!g) return null;
    if (g.revealed >= g.word.length - 1) return { mask: maskWord(g.word, g.revealed), last: true };
    g.revealed += 1;
    g.hintsGiven += 1;
    return { mask: maskWord(g.word, g.revealed), last: false };
}

/**
 * Her normal chat mesajı için çağrılır; aktif oyun varsa tahmini kontrol eder.
 * @returns {Promise<boolean>} Mesaj kazanan tahminse true
 */
async function checkGuess(channelSlug, chatroomId, username, content) {
    const g = wordGames[channelSlug];
    if (!g) return false;
    if (trLower(content.trim()) !== trLower(g.word)) return false;

    clearTimeout(g.timer);
    delete wordGames[channelSlug];
    await addBonusXP(channelSlug, username, WORD_XP);
    await sendMessage(
        channelSlug, chatroomId,
        `🧠 @${username} doğru bildi! Kelime: "${g.word}" → +${WORD_XP} XP 🎯`
    );
    return true;
}

function wordGameActive(channelSlug) {
    return !!wordGames[channelSlug];
}

module.exports = {
    startRaffle,
    joinRaffle,
    finishRaffle,
    raffleActive,
    startWordGame,
    giveHint,
    checkGuess,
    wordGameActive,
};
