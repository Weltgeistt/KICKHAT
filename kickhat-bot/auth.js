const crypto = require('crypto');
const db = require('./db');

// Geçici doğrulama kodlarını tutan hafıza (production'da Redis kullanılabilir)
// Format: { "123456": { kick_username: "user1", expires: timestamp } }
const pendingVerifications = {};

/**
 * Kullanıcının sitesinde gördüğü 6 haneli rastgele bir doğrulama kodu üretir.
 * @param {string} kick_username - Bağlanmak istenen Kick kullanıcı adı
 * @returns {string} 6 haneli kod
 */
function generateVerificationCode(kick_username) {
    const code = crypto.randomInt(100000, 999999).toString();
    
    // Kod 10 dakika geçerli
    pendingVerifications[code] = {
        kick_username: kick_username.toLowerCase(),
        expires: Date.now() + 10 * 60 * 1000 
    };

    return code;
}

/**
 * Chat üzerinden "!verify 123456" gibi bir komut geldiğinde bunu doğrular
 * @param {string} sender - Mesajı atan Kick kullanıcısı
 * @param {string} code - Chat'e yazdığı 6 haneli kod
 * @returns {boolean} Doğrulama başarılı mı?
 */
async function verifyCodeFromChat(sender, code) {
    const record = pendingVerifications[code];
    
    if (!record) {
        return { success: false, message: "Geçersiz veya süresi dolmuş kod." };
    }

    if (Date.now() > record.expires) {
        delete pendingVerifications[code];
        return { success: false, message: "Kodun süresi dolmuş." };
    }

    if (record.kick_username !== sender.toLowerCase()) {
        return { success: false, message: "Bu kod başka bir kullanıcı için üretilmiş." };
    }

    // Doğrulama başarılı! Kullanıcıyı DB'ye ekle veya var olanı güncelle
    try {
        // Kullanıcıyı users tablosuna kaydet
        await db.pool.query(
            `INSERT INTO users (kick_username, role) VALUES ($1, 'user') ON CONFLICT (kick_username) DO NOTHING`,
            [sender.toLowerCase()]
        );
        
        // Kullanıldıktan sonra kodu sil
        delete pendingVerifications[code];
        
        return { success: true, message: "Hesap başarıyla bağlandı!" };
    } catch (e) {
        console.error("Auth DB Hatası:", e);
        return { success: false, message: "Veritabanı hatası oluştu." };
    }
}

/**
 * Süresi dolmuş kodları temizleyen döngü (Gereksiz RAM kullanımını önler)
 */
setInterval(() => {
    const now = Date.now();
    for (const code in pendingVerifications) {
        if (now > pendingVerifications[code].expires) {
            delete pendingVerifications[code];
        }
    }
}, 60 * 1000); // Her 1 dakikada bir temizle

module.exports = {
    generateVerificationCode,
    verifyCodeFromChat
};
