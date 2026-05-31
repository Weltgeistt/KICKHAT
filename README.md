# Chathaxi - Kick Chat Moderasyon Aracı

Kick yayıncıları için gerçek zamanlı chat takibi ve moderasyon (ban, timeout, mesaj silme) işlemlerini basit butonlarla halledebileceğiniz Tauri tabanlı masaüstü uygulaması.

## Nasıl Çalıştırılır?

Projeyi geliştirici modunda (kodları düzenlerken anında görmek için) başlatmak:
1. Terminali açın ve projenin klasöründe olduğunuzdan emin olun.
2. Şu komutu çalıştırın:
   ```bash
   npm run tauri dev
   ```
   *İlk açılışta Rust derlemeleri yapacağı için biraz sürebilir, ardından uygulama penceresi otomatik olarak açılacaktır.*

## Nasıl EXE Haline Getirilir? (Build)

Uygulamayı kurulum dosyası veya doğrudan çalıştırılabilir bir `.exe` (Windows) haline getirmek isterseniz:
1. Terminalde şu komutu çalıştırın:
   ```bash
   npm run tauri build
   ```
2. İşlem tamamlandığında uygulamanız `src-tauri/target/release/bundle` klasörü içerisinde hazır olacaktır.

## Teknik Altyapı
- **Frontend:** React + Vite (Arayüz ve WebSocket Pusher bağlantısı)
- **Backend:** Tauri / Rust (Performans ve yetkilendirilmiş API istekleri)
