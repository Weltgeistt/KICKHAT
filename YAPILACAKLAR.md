# KICKHAT — Yapılacaklar Listesi

> Buraya yapmak istediğin her şeyi ekleyebilirsin. Yapay zeka bu listeyi okuyup devam edecek.
> Format: başına `- [ ]` koy, öncelikli olanları `⭐` ile işaretle.

---

## 🟡 Bekleyen Görevler (Sıradaki)

- [ ] ⭐ dev.kick.com'dan app oluştur (client_id/secret al) → bot'un chate YAZABİLMESİ için gerekli.
      Sunucuda `.env` içine `KICK_CLIENT_ID` ve `KICK_CLIENT_SECRET` eklenecek (bkz: kickhat-bot/.env.example)
- [ ] Chat oyunları — `!kelimetahmin`, `!cekilis` komutları (altyapı hazır: commands.js'e eklenecek)
- [ ] Stats sayfasına kanal renk teması eklenmesi (Kick yeşili korunsun ama branding olsun)
- [ ] Website admin paneline giriş koruması (şu an panel herkese açık; sadece proxy API key gizli)
- [ ] Sunucuya deploy: yeni bot kodu + website (Next.js) yayına alınacak

---

## ✅ Tamamlananlar

- [x] PostgreSQL veritabanı kurulumu (messages, users, user_xp, moderation_logs vs.)
- [x] Pusher/WebSocket ile Kick chat dinleme ve mesajları kaydetme
- [x] AI moderasyon sistemi (OpenAI GPT-4o-mini, red line + strike sistemi)
- [x] XP sistemi temeli (mesaj başına XP, level hesaplama)
- [x] İstatistik API endpoint'i (`/api/stats/:channel_slug?period=...`)
- [x] Top Chatters web sayfası (Podium, bar grafik, filtreler, 60s otomatik yenileme)
- [x] Stats sayfasına özel tarih aralığı arama (date picker + Ara / Temizle butonları)
- [x] Stats sayfası tasarımı iyileştirildi (premium dark UI, animasyonlar)
- [x] Domain alındı ve sunucuya bağlandı (kickhat.net)
- [x] Website (Next.js): landing + admin panel — admin paneli GERÇEK verilere bağlandı
      (`/api/admin/overview` + `/api/admin/flags`, API key sunucu tarafında gizli)
- [x] Global feature flag sistemi (ai_moderation, chat_games — panel toggle'ları DB'ye yazıyor)
- [x] Chat botu altyapısı: komut yönlendirici (!stats, !level, !verify, !komutlar) + cooldown
- [x] Kick'e mesaj gönderme katmanı (kick_api.js): resmî Dev API birincil, gayrıresmî yedek
- [x] Level Up bildirimi — seviye atlayınca chate mesaj gidiyor (gönderim yapılandırılınca aktif)
- [x] Pool bug'ı düzeltildi (auth.js ve games_and_xp.js her çağrıda yeni bağlantı havuzu açıyordu)
- [x] .gitignore düzeltildi — root şifreli deploy scriptleri ve vip.json artık gerçekten gizli

---

## 💡 Fikir Havuzu (İleride Değerlendirilebilir)

- Kickarena oyunu chat oyunlarına entegre edilecek
- Abonelik/VIP sistemi (Premium özellikler)
- Kick OAuth entegrasyonu (gerçek login)
- SSH şifresi yerine key-based auth'a geçiş (deploy scriptleri düz metin şifre içeriyor)

---

_Son güncelleme: 2 Temmuz 2026_
