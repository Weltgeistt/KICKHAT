# KICKHAT Yapılacaklar Listesi (TODO)

Bu dosya projede eksik kalan, yapılacak ve geliştirilecek özellikleri takip etmek için oluşturulmuştur.

## 🚧 Bekleyen Görevler

- [ ] **Level/XP Bildirim Sistemi:** Kullanıcılar mesaj yazarak XP kazanıp seviye atlıyor. Ancak seviye atladıklarında (Level Up) ekranda veya chatte bir kutlama / bildirim çıkmıyor. (`kickhat-bot/games_and_xp.js`)
- [ ] **Chat Oyunları (Botrix Tarzı):** Chatte kelime bulmaca, çekiliş gibi etkileşimi artıracak mini oyun akışlarının ve WebSocket bildirimlerinin hazırlanması. (`kickhat-bot/games_and_xp.js` -> `startChatGame` fonksiyonu)
- [ ] **Frontend Entegrasyonları:** Backend tarafında çalışan level, oyun ve AI uyarı/ban işlemlerinin ön yüzdeki (React/Tauri) arayüzde görsel olarak desteklenmesi.

---

## 📌 Son Durum Kaydı (15 Haziran 2026)

* **Nerede Kaldık:** Projenin iskeleti, veritabanı yapısı (PostgreSQL), Pusher ile Kick chat dinleme sistemi ve OpenAI entegrasyonlu Moderasyon botu tamamlanmıştı. Bunun üzerine, dışarıdan (chat komutuyla) paylaşılabilecek şık ve dinamik bir **İstatistik Web Sayfası** (`public/stats.html`) eklendi. Veritabanına `getChatStatistics` eklendi ve Backend `index.js` üzerinden `/api/stats` endpoint'i ile dışarıya veri açıldı.
* **Sıradaki Adım:** İstatistikleri inceledikten sonra veya yayıncının domain/server yapılandırmasına karar verdikten sonra; ya diğer TODO görevleri (Level bildirimleri vb.) kodlanacak ya da masaüstü arayüzüne (Frontend) dokunuşlar yapılacak.
