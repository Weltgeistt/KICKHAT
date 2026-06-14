const db = require('./db');
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

// Desteklenen Diller
const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'es', 'it', 'fr', 'pt'];

/**
 * Gelen mesajı analiz edip Strike (Uyarı) veya Ban işlemi uygular.
 * @param {string} channelSlug - Kanalın adı (örn: haxi35)
 * @param {string} username - Mesajı atan kişi
 * @param {string} messageContent - Mesajın içeriği
 * @param {string} botLanguage - Botun cevap vereceği dil
 * @returns {object} { action: 'none' | 'warning' | 'timeout' | 'ban', reason: string, aiMessage: string }
 */
async function analyzeMessage(channelSlug, username, messageContent, botLanguage = 'tr') {
    const systemPrompt = `
    Sen bir Twitch/Kick tarzı platformda çalışan profesyonel, yapay zeka destekli bir sohbet moderatörüsün.
    Hedefin chat ortamını temiz tutmaktır. 
    Kullanıcının gönderdiği mesajı analiz et ve aşağıdaki tam JSON formatında cevap ver:
    {"is_violation": boolean, "violation_type": "none" | "red_line" | "profanity" | "spam", "suggested_message": "kullanıcıya verilecek cevap"}
    
    KURALLAR:
    1. "red_line" (KIRMIZI ÇİZGİ): Dini değerlere, milli veya vatani değerlere (özellikle Türkiye'ye) edilen her türlü ağır hakaret ve küfür. Buna SIFIR tolerans göster.
    2. "profanity": Normal küfürler, hakaretler, toksik söylemler.
    3. "spam": Aynı harflerin/kelimelerin çok fazla tekrarı, flood yapılması.
    4. Cevapları kesinlikle seçilen dile (${botLanguage}) uygun, çok kısa, esprili ve otoriter bir moderatör edasıyla ver. Dini/Milli hakaret ise sert ol. Temiz ise suggested_message boş olsun.
    `;

    let aiResponse = { is_violation: false, violation_type: 'none', suggested_message: '' };

    try {
        if (process.env.OPENAI_API_KEY) {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Hızlı ve ucuz model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Kullanıcı: ${username}\nMesaj: "${messageContent}"` }
                ],
                response_format: { type: "json_object" }
            });
            aiResponse = JSON.parse(completion.choices[0].message.content);
        } else {
            // API key yoksa test amaçlı basit kontrol (Mock fallback)
            if (messageContent.includes('dini') || messageContent.includes('vatan')) {
                aiResponse = { is_violation: true, violation_type: 'red_line', suggested_message: 'Bu kanalda kırmızı çizgileri aşamazsın.' };
            } else if (messageContent.includes('küfür')) {
                aiResponse = { is_violation: true, violation_type: 'profanity', suggested_message: 'Hey, kelimelerine dikkat et lütfen!' };
            }
        }
    } catch (e) {
        console.error("AI Analiz Hatası:", e);
        return { action: 'none', reason: 'AI Hatası', aiMessage: '' };
    }

    if (!aiResponse.is_violation) {
        return { action: 'none', reason: 'Mesaj temiz', aiMessage: '' };
    }

    let finalAction = 'none';
    let finalReason = '';
    let finalAiMessage = aiResponse.suggested_message;

    // Kırmızı Çizgi Kontrolü
    if (aiResponse.violation_type === 'red_line') {
        finalAction = 'ban';
        finalReason = 'Dini/Milli Kırmızı Çizgi İhlali';
    } else {
        // Strike Sistemi (Normal İhlaller)
        const previousStrikes = await db.getUserStrikes(channelSlug, username);

        if (previousStrikes === 0) {
            finalAction = 'warning';
            finalReason = '1. Uyarı';
        } else if (previousStrikes === 1) {
            finalAction = 'timeout';
            finalReason = '2. Uyarı - Timeout';
            finalAiMessage = `Tekrar kural ihlali yaptığın için bir süre susturuldun. ${aiResponse.suggested_message}`;
        } else {
            finalAction = 'ban';
            finalReason = '3. Uyarı - Kalıcı Ban';
            finalAiMessage = 'Kuralları 3 kez ihlal ettiğin için kanaldan uzaklaştırıldın.';
        }
    }

    // Veritabanına Logla
    await db.logModerationAction(channelSlug, username, finalAction, finalReason);

    return { action: finalAction, reason: finalReason, aiMessage: finalAiMessage };
}

module.exports = {
    SUPPORTED_LANGUAGES,
    analyzeMessage
};
