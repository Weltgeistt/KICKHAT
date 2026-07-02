"use client";

import { motion } from "framer-motion";
import { Users, Activity, ShieldBan, Zap, ToggleLeft, ToggleRight, Server, Search } from "lucide-react";
import { useState } from "react";

export default function AdminDashboard() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [gamesEnabled, setGamesEnabled] = useState(true);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="dashboard-wrapper">
      <style jsx>{`
        .dashboard-wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-bottom: 60px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .header h1 {
          font-size: 32px;
          margin-bottom: 8px;
          font-family: var(--font-mono);
          letter-spacing: -1px;
        }

        .header p {
          color: var(--color-text-muted);
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: #050505;
          border: 1px solid var(--glass-border);
          border-radius: 4px;
          width: 300px;
        }
        .search-bar input {
          background: transparent;
          border: none;
          color: var(--color-text);
          outline: none;
          width: 100%;
          font-size: 13px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }

        .stat-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: #050505;
          border: 1px solid var(--glass-border);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .stat-card::after {
          content: "";
          position: absolute;
          bottom: 0; left: 0; right: 0; height: 2px;
          background: var(--color-primary);
          opacity: 0.2;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: rgba(83, 252, 24, 0.05);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(83, 252, 24, 0.1);
        }

        .stat-info h4 {
          font-size: 13px;
          color: var(--color-text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-info p {
          font-size: 28px;
          font-weight: 700;
          font-family: var(--font-mono);
          margin-top: 4px;
        }

        .dashboard-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .panel {
          background: #050505;
          border: 1px solid var(--glass-border);
          border-radius: 4px;
          padding: 24px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--glass-border);
        }

        .panel-header h3 {
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .log-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #0a0a0a;
          border: 1px solid var(--glass-border);
          border-radius: 4px;
          transition: border-color 0.2s;
        }

        .log-item:hover {
          border-color: var(--glass-border-active);
        }

        .log-user {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--color-text);
        }

        .log-channel {
          color: var(--color-primary);
          font-size: 13px;
          margin-left: 8px;
        }

        .log-action {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 2px;
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
          letter-spacing: 0.5px;
        }

        .action-ban { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); }
        .action-warn { background: rgba(255, 165, 2, 0.1); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #0a0a0a;
          border: 1px solid var(--glass-border);
          border-radius: 4px;
        }
        
        .setting-info h4 {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .setting-info p {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: color 0.2s;
        }
        
        .toggle-btn.active {
          color: var(--color-primary);
        }
      `}</style>

      <div className="header">
        <div>
          <h1>Yönetim Paneli</h1>
          <p>Sistem durumu ve merkezi kontroller</p>
        </div>
        <div className="search-bar">
          <Search size={18} color="var(--color-text-muted)" />
          <input type="text" placeholder="Kullanıcı veya log ara..." />
        </div>
      </div>

      <motion.div 
        className="stats-grid"
        variants={containerVars}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h4>Bağlı Kanallar</h4>
            <p>1,248</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h4>Pro Abonelikler</h4>
            <p>342</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><ShieldBan size={24} /></div>
          <div className="stat-info">
            <h4>Engellenen Mesaj (24s)</h4>
            <p>8,591</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><Server size={24} /></div>
          <div className="stat-info">
            <h4>Sunucu Yükü</h4>
            <p style={{color: '#ffa502'}}>%42</p>
          </div>
        </motion.div>
      </motion.div>

      <div className="dashboard-main">
        {/* Sol Sütun: Canlı Loglar */}
        <motion.div 
          className="panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="panel-header">
            <h3><ShieldBan size={18} /> Canlı AI Moderasyon Akışı</h3>
            <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '11px' }}>TÜMÜNÜ GÖR</button>
          </div>

          <div className="log-list">
            <div className="log-item">
              <div>
                <span className="log-user">@toxic_user99</span> 
                <span className="log-channel">#haxi35</span>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Dini/Milli hakaret tespit edildi. [Zero Tolerance]</div>
              </div>
              <span className="log-action action-ban">KALICI BAN</span>
            </div>

            <div className="log-item">
              <div>
                <span className="log-user">@spammerboy</span> 
                <span className="log-channel">#dolphinemre</span>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Flood (Aynı mesajın art arda 5 tekrarı).</div>
              </div>
              <span className="log-action action-warn">1. UYARI</span>
            </div>

            <div className="log-item">
              <div>
                <span className="log-user">@angry_viewer</span> 
                <span className="log-channel">#poyland</span>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Saldırgan dil ve argo (2. Strike).</div>
              </div>
              <span className="log-action action-warn" style={{ color: '#ffa502', borderColor: 'rgba(255, 165, 2, 0.3)' }}>10 DK TIMEOUT</span>
            </div>
            
            <div className="log-item">
              <div>
                <span className="log-user">@link_spammer</span> 
                <span className="log-channel">#adem_poy</span>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>İzinsiz reklam bağlantısı paylaşıldı.</div>
              </div>
              <span className="log-action action-warn">MESAJ SİLİNDİ</span>
            </div>
          </div>
        </motion.div>

        {/* Sağ Sütun: Hızlı Ayarlar & Durum */}
        <motion.div 
          className="panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="panel-header">
            <h3><Zap size={18} /> Global Sistem Kontrolleri</h3>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <h4>AI Moderasyon Motoru</h4>
                <p>Tüm kanallardaki AI denetimini duraklatır/başlatır.</p>
              </div>
              <button 
                className={`toggle-btn ${aiEnabled ? 'active' : ''}`} 
                onClick={() => setAiEnabled(!aiEnabled)}
              >
                {aiEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Chat Oyunları (Mini Games)</h4>
                <p>Kullanıcı etkileşim oyunları global durumu.</p>
              </div>
              <button 
                className={`toggle-btn ${gamesEnabled ? 'active' : ''}`} 
                onClick={() => setGamesEnabled(!gamesEnabled)}
              >
                {gamesEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>
            
            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <div className="setting-info">
                <h4>Mevcut Plan Durumunuz</h4>
              </div>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '12px', background: 'rgba(83,252,24,0.05)', border: '1px solid var(--glass-border-active)', borderRadius: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Kurucu Hesabı (Sınırsız)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>Limitsiz API</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
