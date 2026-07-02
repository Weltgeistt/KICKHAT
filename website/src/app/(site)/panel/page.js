"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Gamepad2, Languages, ToggleLeft, ToggleRight, BarChart3, ShieldAlert, MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

const LANG_OPTIONS = ["tr", "en", "es", "it", "de"];

export default function PanelPage() {
  const { t } = useLang();
  const router = useRouter();
  const [me, setMe] = useState(undefined); // undefined: yükleniyor, null: giriş yok
  const [settings, setSettings] = useState(null);
  const [dash, setDash] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.username) {
          router.replace("/login");
          return;
        }
        setMe(d);
        fetch("/api/panel/settings").then((r) => r.json()).then(setSettings).catch(() => {});
        fetch("/api/panel/dashboard").then((r) => (r.ok ? r.json() : null)).then(setDash).catch(() => {});
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function save(patch) {
    const prev = settings;
    const next = { ...settings, ...patch };
    setSettings(next); // iyimser
    try {
      const res = await fetch("/api/panel/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      setToast(t("panel.saved"));
    } catch {
      setSettings(prev);
      setToast(t("panel.saveError"));
    }
    setTimeout(() => setToast(null), 2500);
  }

  if (!me) return null;

  const stats = [
    { icon: MessageSquare, label: t("panel.todayMsg"), val: dash?.today_messages },
    { icon: MessageSquare, label: t("panel.weekMsg"), val: dash?.week_messages },
    { icon: BarChart3, label: t("panel.totalMsg"), val: dash?.total_messages },
    { icon: Users, label: t("panel.todayUsers"), val: dash?.today_users },
  ];

  return (
    <div className="container section" style={{ maxWidth: 980 }}>
      <style jsx>{`
        .head { margin-bottom: 32px; }
        .welcome { color: var(--text-2); font-size: 15px; }
        .welcome b { font-family: var(--font-mono); color: var(--brand); }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .stat {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .stat-ic {
          width: 42px; height: 42px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand-soft);
          border: 1px solid var(--line-brand);
          color: var(--brand);
          flex-shrink: 0;
        }
        .stat h5 { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-body); }
        .stat p { font-family: var(--font-mono); font-size: 22px; font-weight: 700; }
        .grid2 {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 20px;
        }
        @media (max-width: 800px) { .grid2 { grid-template-columns: 1fr; } }
        .panel-box { padding: 26px; }
        .panel-box h3 {
          font-size: 16px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--line);
          display: flex; align-items: center; gap: 8px;
        }
        .setting {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
        }
        .setting:last-child { border-bottom: none; }
        .s-info h4 { font-size: 14.5px; margin-bottom: 3px; display: flex; align-items: center; gap: 8px; }
        .s-info p { font-size: 12.5px; color: var(--text-3); }
        .toggle {
          background: none; border: none; cursor: pointer;
          color: var(--text-3); transition: color 0.2s;
          flex-shrink: 0;
        }
        .toggle.on { color: var(--brand); }
        .seg {
          display: flex;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          overflow: hidden;
          flex-shrink: 0;
        }
        .seg button {
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 600;
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          transition: all 0.2s;
        }
        .seg button.on { background: var(--brand-soft); color: var(--brand); }
        .links-col { display: flex; flex-direction: column; gap: 10px; }
        .toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          padding: 12px 22px;
          background: var(--bg-elevated);
          border: 1px solid var(--line-brand);
          border-radius: var(--radius-sm);
          color: var(--brand);
          font-weight: 600;
          font-size: 14px;
          z-index: 200;
          box-shadow: var(--shadow-card);
        }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="section-title">{t("panel.title")}</h1>
        <p className="welcome">{t("panel.welcome")}, <b>@{me.username}</b></p>
      </motion.div>

      <div className="stats-row">
        {stats.map(({ icon: Icon, label, val }, i) => (
          <motion.div key={label} className="card stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="stat-ic"><Icon size={20} /></div>
            <div>
              <h5>{label}</h5>
              <p>{val === undefined || val === null ? "…" : Number(val).toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid2">
        <motion.div className="card panel-box" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3><Bot size={17} /> {t("panel.settings")}</h3>

          <div className="setting">
            <div className="s-info">
              <h4>{t("panel.aiTitle")}</h4>
              <p>{t("panel.aiDesc")}</p>
            </div>
            <button
              className={`toggle ${settings?.ai_moderation_enabled ? "on" : ""}`}
              onClick={() => save({ ai_moderation_enabled: !settings?.ai_moderation_enabled })}
              disabled={!settings}
            >
              {settings?.ai_moderation_enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>

          <div className="setting">
            <div className="s-info">
              <h4>{t("panel.strictness")}</h4>
            </div>
            <div className="seg">
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  className={settings?.strictness_level === lvl ? "on" : ""}
                  onClick={() => save({ strictness_level: lvl })}
                  disabled={!settings}
                >
                  {t(`panel.s${lvl}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="setting">
            <div className="s-info">
              <h4><Gamepad2 size={15} /> {t("panel.games")}</h4>
              <p>{t("panel.gamesDesc")}</p>
            </div>
            <button
              className={`toggle ${settings?.games_enabled ? "on" : ""}`}
              onClick={() => save({ games_enabled: !settings?.games_enabled })}
              disabled={!settings}
            >
              {settings?.games_enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>

          <div className="setting">
            <div className="s-info">
              <h4><Languages size={15} /> {t("panel.lang")}</h4>
            </div>
            <div className="seg">
              {LANG_OPTIONS.map((l) => (
                <button
                  key={l}
                  className={settings?.app_language === l ? "on" : ""}
                  onClick={() => save({ app_language: l })}
                  disabled={!settings}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div className="card panel-box" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <h3><BarChart3 size={17} /> {t("panel.links")}</h3>
          <div className="links-col">
            <Link href={`/${me.username}/stats`} className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>
              <BarChart3 size={16} /> {t("panel.statsPage")}
            </Link>
            <Link href={`/${me.username}/modlogs`} className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>
              <ShieldAlert size={16} /> {t("panel.modlogsPage")}
            </Link>
          </div>
        </motion.div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
