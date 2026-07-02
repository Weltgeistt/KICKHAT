# KICKHAT — Yapılacaklar Listesi

> Buraya yapmak istediğin her şeyi ekleyebilirsin. Yapay zeka bu listeyi okuyup devam edecek.
> Format: başına `- [ ]` koy, öncelikli olanları `⭐` ile işaretle.

---

## 🟡 Bekleyen Görevler (Sıradaki)

- [ ] Chat oyunları — `!kelimetahmin`, `!cekilis` komutları (altyapı hazır: commands.js'e eklenecek)
- [ ] AI moderasyonu sunucuda aktifleştir (`OPENAI_API_KEY` sunucu .env'inde boş)
- [ ] API_KEY'i güçlü bir değerle değiştir (masaüstü uygulamayla birlikte güncellenmeli)
- [ ] Deploy scriptlerini SSH key auth'a geçir (şifre düz metin duruyor)

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
- [x] Website v2 (2 Temmuz 2026): yeni "Aurora Dark" tasarım — landing, docs, downloads,
      leaderboard, kanal stats/modlogs, !verify girişi, yayıncı paneli, korumalı admin, TR/EN, SEO
      (eski tasarıma dönüş: git tag `eski-tasarim`)
- [x] DEPLOY (2 Temmuz 2026): kickhat.net canlıda — bot (pm2: kickhat-bot, :3000) +
      website (pm2: kickhat-web, :3001) + nginx → Next. Kick Dev API OAuth doğrulandı,
      XP sistemi canlı izleyicilere işliyor

---

## 💡 Fikir Havuzu (İleride Değerlendirilebilir)

- Kickarena oyunu chat oyunlarına entegre edilecek
- Abonelik/VIP sistemi (Premium özellikler)
- Kick OAuth entegrasyonu (gerçek login)
- SSH şifresi yerine key-based auth'a geçiş (deploy scriptleri düz metin şifre içeriyor)

---

_Son güncelleme: 2 Temmuz 2026_
