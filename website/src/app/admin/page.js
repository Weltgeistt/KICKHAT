"use client";

import { motion } from "framer-motion";
import { Users, Activity, ShieldBan, Zap, ToggleLeft, ToggleRight, Server, Search, AlertTriangle, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const REFRESH_MS = 30000;

// Moderasyon aksiyonunu rozet metni + stiline çevirir
function actionBadge(action) {
  switch (action) {
    case "ban":     return { label: "KALICI BAN", cls: "action-ban" };
    case "timeout": return { label: "TIMEOUT", cls: "action-warn", style: { color: "#ffa502", borderColor: "rgba(255, 165, 2, 0.3)" } };
    case "warning": return { label: "UYARI", cls: "action-warn" };
    default:        return { label: (action || "?").toUpperCase(), cls: "action-warn" };
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [flags, setFlags] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [ovRes, flagRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/admin/flags"),
      ]);
      if (!ovRes.ok) {
        const err = await ovRes.json().catch(() => null);
        throw new Error(err?.error || `Sunucu hatası (${ovRes.status})`);
      }
      setOverview(await ovRes.json());
      if (flagRes.ok) setFlags(await flagRes.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(t);
  }, [loadData]);

  async function toggleFlag(name) {
    const next = !(flags[name] ?? true);
    setFlags((f) => ({ ...f, [name]: next })); // iyimser güncelleme
    const res = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_name: name, is_enabled: next }),
    });
    if (!res.ok) {
      setFlags((f) => ({ ...f, [name]: !next })); // başarısızsa geri al
      setError("Ayar kaydedilemedi — bot API'sine ulaşılamıyor olabilir.");
    }
  }

  const aiEnabled = flags.ai_moderation ?? true;
  const gamesEnabled = flags.chat_games ?? true;

  const logs = (overview?.recent_logs || []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.kick_username?.toLowerCase().includes(q) ||
      log.channel_slug?.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q)
    );
  });

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

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(255, 71, 87, 0.08);
          border: 1px solid rgba(255, 71, 87, 0.35);
          border-radius: 4px;
          color: #ff6b7a;
          font-size: 14px;
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

        .log-time {
          color: var(--color-text-muted);
          font-size: 11px;
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
          white-space: nowrap;
        }

        .action-ban { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); }
        .action-warn { background: rgba(255, 165, 2, 0.1); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); }

        .empty-state {
          padding: 32px;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 14px;
        }

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

        .channel-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .channel-chip {
          font-family: var(--font-mono);
          font-size: 12px;
          padding: 4px 10px;
          border: 1px solid var(--glass-border-active);
          border-radius: 2px;
          color: var(--color-primary);
          background: rgba(83, 252, 24, 0.05);
        }
      `}</style>

      <div className="header">
        <div>
          <h1>Yönetim Paneli</h1>
          <p>Sistem durumu ve merkezi kontroller</p>
        </div>
        <div className="search-bar">
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Kullanıcı, kanal veya sebep ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <motion.div
        className="stats-grid"
        variants={containerVars}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><Server size={24} /></div>
          <div className="stat-info">
            <h4>Bağlı Kanallar</h4>
            <p>{loading ? "…" : overview?.connected_count ?? "—"}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><MessageSquare size={24} /></div>
          <div className="stat-info">
            <h4>Mesaj (24s)</h4>
            <p>{loading ? "…" : (overview?.messages_24h ?? 0).toLocaleString("tr-TR")}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h4>Aktif Kullanıcı (24s)</h4>
            <p>{loading ? "…" : (overview?.active_users_24h ?? 0).toLocaleString("tr-TR")}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="stat-card">
          <div className="stat-icon"><ShieldBan size={24} /></div>
          <div className="stat-info">
            <h4>Mod Aksiyonu (24s)</h4>
            <p>{loading ? "…" : (overview?.mod_actions_24h ?? 0).toLocaleString("tr-TR")}</p>
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
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              30 sn'de bir yenilenir
            </span>
          </div>

          <div className="log-list">
            {loading && <div className="empty-state">Yükleniyor…</div>}
            {!loading && logs.length === 0 && (
              <div className="empty-state">
                {search ? "Aramayla eşleşen log yok." : "Henüz moderasyon aksiyonu yok. AI moderatör devreye girince loglar burada akacak."}
              </div>
            )}
            {logs.map((log, idx) => {
              const badge = actionBadge(log.action);
              return (
                <div className="log-item" key={log.id ?? idx}>
                  <div>
                    <span className="log-user">@{log.kick_username}</span>
                    <span className="log-channel">#{log.channel_slug}</span>
                    <span className="log-time">{timeAgo(log.created_at)}</span>
                    <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                      {log.reason || "Sebep belirtilmemiş"}
                    </div>
                  </div>
                  <span className={`log-action ${badge.cls}`} style={badge.style}>{badge.label}</span>
                </div>
              );
            })}
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
                onClick={() => toggleFlag("ai_moderation")}
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
                onClick={() => toggleFlag("chat_games")}
              >
                {gamesEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>

            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <div className="setting-info">
                <h4><Activity size={14} style={{ display: "inline", marginRight: "6px" }} />Canlı Dinlenen Kanallar</h4>
              </div>
              {loading ? (
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Yükleniyor…</p>
              ) : (overview?.connected_channels?.length ?? 0) === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Bot şu an hiçbir kanalı dinlemiyor.</p>
              ) : (
                <div className="channel-chips">
                  {overview.connected_channels.map((slug) => (
                    <span className="channel-chip" key={slug}>#{slug}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
