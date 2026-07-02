"use client";

import { motion, useAnimation } from "framer-motion";
import { Bot, ShieldAlert, Gamepad2, Terminal, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [terminalLines, setTerminalLines] = useState([]);
  
  const fullLogs = [
    "> kickhat-bot core initializing...",
    "> connection established to Kick.com WSS",
    "> authenticating as @AdemPoy...",
    "> [SUCCESS] Connected to chat!",
    "> loading AI moderation matrix...",
    "> strictness level: HIGH",
    "> awaiting messages..."
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < fullLogs.length) {
        setTerminalLines(prev => [...prev, fullLogs[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-wrapper">
      <style jsx>{`
        .landing-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Top Navbar */
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-logo {
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 700;
          color: var(--color-primary);
          letter-spacing: -1px;
        }

        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .nav-link {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: var(--color-text);
        }

        /* Hero Section */
        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 100px 80px;
          gap: 60px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
          font-family: var(--font-mono);
          font-size: 12px;
          margin-bottom: 32px;
          background: rgba(83, 252, 24, 0.05);
        }

        .hero-title {
          font-size: 64px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -2px;
          margin-bottom: 24px;
        }

        .hero-title span {
          color: var(--color-primary);
        }

        .hero-desc {
          font-size: 18px;
          color: var(--color-text-muted);
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
        }

        /* Terminal Mockup */
        .hero-visual {
          flex: 1;
          display: flex;
          justify-content: flex-end;
        }

        .terminal-window {
          width: 100%;
          max-width: 500px;
          background: #050505;
          border: 1px solid var(--glass-border);
          box-shadow: 0 0 0 1px rgba(83, 252, 24, 0.1), 0 24px 60px rgba(0, 0, 0, 0.8);
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #0a0a0a;
          border-bottom: 1px solid var(--glass-border);
        }

        .t-dot { width: 10px; height: 10px; border-radius: 50%; }
        .t-dot.r { background: #ff4757; }
        .t-dot.y { background: #ffa502; }
        .t-dot.g { background: var(--color-primary); }
        
        .t-title {
          margin-left: 10px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .terminal-body {
          padding: 20px;
          font-family: var(--font-mono);
          font-size: 13px;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .t-line { color: var(--color-text); }
        .t-line.success { color: var(--color-primary); font-weight: 700; }
        .t-line.highlight { color: #ffa502; }

        .cursor-blink {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: var(--color-primary);
          animation: blink 1s step-end infinite;
          vertical-align: middle;
          margin-left: 6px;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Features */
        .features {
          padding: 80px;
          background: #020202;
          border-top: 1px solid var(--glass-border);
        }

        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .section-header h2 {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -1px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          padding: 40px 30px;
          border: 1px solid var(--glass-border);
          background: #050505;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          border-color: var(--glass-border-active);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(83, 252, 24, 0.05);
        }

        .f-icon {
          color: var(--color-primary);
          margin-bottom: 24px;
        }

        .f-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .f-desc {
          color: var(--color-text-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        /* How It Works Section */
        .how-it-works {
          padding: 100px 80px;
          background: var(--color-bg);
          border-top: 1px solid var(--glass-border);
        }
        .hiw-title {
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 60px;
          letter-spacing: -1px;
        }
        .steps-container {
          display: flex;
          gap: 40px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .step-box {
          flex: 1;
          padding: 30px;
          background: #050505;
          border: 1px solid var(--glass-border);
          position: relative;
          transition: all 0.3s;
        }
        .step-box:hover {
          border-color: var(--color-primary);
        }
        .step-number {
          font-family: var(--font-mono);
          font-size: 48px;
          font-weight: 800;
          color: rgba(83, 252, 24, 0.15);
          position: absolute;
          top: 20px;
          right: 20px;
          line-height: 1;
        }
        .step-box h4 {
          font-size: 20px;
          margin-bottom: 12px;
          margin-top: 20px;
        }
        .step-box p {
          color: var(--color-text-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        /* Pricing Preview */
        .pricing {
          padding: 100px 80px;
          background: #020202;
          border-top: 1px solid var(--glass-border);
        }
        .pricing-title {
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .pricing-subtitle {
          text-align: center;
          color: var(--color-text-muted);
          margin-bottom: 60px;
          font-size: 16px;
        }
        .pricing-cards {
          display: flex;
          justify-content: center;
          gap: 30px;
          max-width: 900px;
          margin: 0 auto;
        }
        .p-card {
          flex: 1;
          padding: 40px;
          background: #050505;
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .p-card.pro {
          border-color: var(--glass-border-active);
          box-shadow: 0 0 40px rgba(83, 252, 24, 0.05);
          transform: scale(1.05);
        }
        .p-price {
          font-size: 40px;
          font-weight: 800;
          font-family: var(--font-mono);
        }
        .p-price span {
          font-size: 16px;
          color: var(--color-text-muted);
        }
        .p-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 30px;
          flex: 1;
        }
        .p-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--color-text-muted);
        }
      `}</style>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">KICKHAT_</div>
        <div className="nav-links">
          <Link href="#features" className="nav-link">Özellikler</Link>
          <Link href="/admin" className="nav-link">Yönetim Paneli</Link>
          <button className="btn-primary">Giriş Yap</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">
            <Terminal size={14} /> KICKCHAT v2.0
          </div>
          <h1 className="hero-title">
            Yayınların İçin<br />
            <span>Tam Kontrol.</span>
          </h1>
          <p className="hero-desc">
            Sıradan botları unutun. Kickhat, gelişmiş yapay zeka moderasyonu, dinamik XP sistemleri ve chat içi oyunlarıyla Kick yayıncılarına özel olarak tasarlanmış profesyonel araç setidir.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Hemen Başla</button>
            <Link href="/admin" className="btn-outline">
              Yönetici Paneli <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>

        <motion.div 
          className="hero-visual"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="t-dot r"></div>
              <div className="t-dot y"></div>
              <div className="t-dot g"></div>
              <div className="t-title">bash - kickhat_core</div>
            </div>
            <div className="terminal-body">
              {terminalLines.map((line, idx) => (
                <div key={idx} className={`t-line ${line?.includes('SUCCESS') ? 'success' : line?.includes('HIGH') ? 'highlight' : ''}`}>
                  {line}
                </div>
              ))}
              <div className="t-line">
                <span className="cursor-blink"></span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="section-header">
          <h2>Neden Kickhat?</h2>
        </div>
        <div className="grid">
          <div className="feature-card">
            <Bot size={32} className="f-icon" />
            <h3 className="f-title">Context-Aware AI</h3>
            <p className="f-desc">
              Mesajları kelime kelime değil, anlam bütünlüğüne göre inceler. Küfür, dini/milli hakaret veya spam girişimlerini bağlamdan anlar ve saniyesinde aksiyon alır.
            </p>
          </div>
          
          <div className="feature-card">
            <Gamepad2 size={32} className="f-icon" />
            <h3 className="f-title">Chat Oyunları & XP</h3>
            <p className="f-desc">
              Sohbetinizde etkileşimi %300 artırın. İzleyiciler mesaj attıkça XP kazanır, seviye atlar ve tahmin oyunlarıyla sohbette kalma süreleri zirveye çıkar.
            </p>
          </div>

          <div className="feature-card">
            <ShieldAlert size={32} className="f-icon" />
            <h3 className="f-title">Gelişmiş Strike Sistemi</h3>
            <p className="f-desc">
              Kullanıcılara doğrudan ban atmak yerine aşamalı ceza sistemi (1. Uyarı, 2. Timeout, 3. Ban) uygular. Katı kurallı (Zero-Tolerance) kelimelerde inisiyatif tanımaz.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="hiw-title">Sadece 3 Adımda Başla</h2>
        <div className="steps-container">
          <div className="step-box">
            <div className="step-number">01</div>
            <h4>Hesabını Bağla</h4>
            <p>Kickchat yönetim paneline gir ve !verify komutuyla saniyeler içinde Kick kanalını doğrula. Şifre veya tehlikeli yetki istemiyoruz.</p>
          </div>
          <div className="step-box">
            <div className="step-number">02</div>
            <h4>Ayarlarını Yap</h4>
            <p>AI moderasyonunun sertlik derecesini seç, yasaklı kelime havuzunu belirle ve chat oyunlarının XP çarpanlarını ayarla.</p>
          </div>
          <div className="step-box">
            <div className="step-number">03</div>
            <h4>Yayına Geç</h4>
            <p>Tauri tabanlı, bilgisayarını yormayan masaüstü uygulamamızı aç ve canlı yayınlarının keyfini çıkar. Kalanı Kickhat halleder.</p>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="pricing">
        <h2 className="pricing-title">Yayıncı Planları</h2>
        <p className="pricing-subtitle">Beta sürecinde tüm özellikler tamamen ücretsizdir!</p>
        
        <div className="pricing-cards">
          <div className="p-card">
            <h3>Standart</h3>
            <div className="p-price">₺0 <span>/ay</span></div>
            <p style={{color: 'var(--color-text-muted)', fontSize: '13px'}}>Temel yayıncı ihtiyaçları için.</p>
            <ul className="p-features">
              <li><Check size={16} color="var(--color-primary)" /> Temel Bot Komutları</li>
              <li><Check size={16} color="var(--color-primary)" /> Sabit Kelime Filtresi</li>
              <li><Check size={16} color="var(--color-primary)" /> Web Yönetim Paneli</li>
            </ul>
            <button className="btn-outline" style={{justifyContent: 'center', width: '100%'}}>Hemen Başla</button>
          </div>

          <div className="p-card pro">
            <h3 style={{color: 'var(--color-primary)'}}>Kickhat PRO</h3>
            <div className="p-price">₺0 <span>/ay (Beta)</span></div>
            <p style={{color: 'var(--color-text-muted)', fontSize: '13px'}}>Profesyonel yayıncılar için tam otomasyon.</p>
            <ul className="p-features">
              <li><Check size={16} color="var(--color-primary)" /> Gelişmiş AI Moderatör (Sınırsız)</li>
              <li><Check size={16} color="var(--color-primary)" /> 4 Farklı Dilde Destek</li>
              <li><Check size={16} color="var(--color-primary)" /> Chat Oyunları & XP Sistemi</li>
              <li><Check size={16} color="var(--color-primary)" /> Masaüstü (Tauri) Uygulaması</li>
              <li><Check size={16} color="var(--color-primary)" /> Öncelikli Sunucu Gücü</li>
            </ul>
            <button className="btn-primary" style={{justifyContent: 'center', width: '100%'}}>Pro'ya Geç (Ücretsiz)</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 80px', borderTop: '1px solid var(--glass-border)', background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>KICKHAT_</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>© 2026 Kickhat. Tüm Hakları Saklıdır.</div>
      </footer>
    </div>
  );
}
