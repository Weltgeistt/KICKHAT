"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

const PERIODS = ["all", "day", "week", "month", "year"];

export default function ChannelStatsPage({ params }) {
  const { channel } = use(params);
  const { t } = useLang();
  const [rows, setRows] = useState(null);
  const [period, setPeriod] = useState("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [custom, setCustom] = useState(false);

  const load = useCallback(async () => {
    let url = `/api/public/stats/${channel}?period=${period}`;
    if (custom && from && to) url = `/api/public/stats/${channel}?from=${from}&to=${to}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, [channel, period, from, to, custom]);

  useEffect(() => {
    setRows(null);
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [load]);

  const max = rows?.length ? Number(rows[0].count) : 1;

  return (
    <div className="container section" style={{ maxWidth: 860 }}>
      <style jsx>{`
        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }
        .channel-name {
          font-family: var(--font-mono);
          color: var(--brand);
        }
        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          align-items: center;
        }
        .chip {
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--line);
          background: transparent;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip.on {
          background: var(--brand-soft);
          border-color: var(--line-brand);
          color: var(--brand);
        }
        .date-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .date-row :global(input[type="date"]) {
          color-scheme: dark;
          width: auto;
        }
        .list { display: flex; flex-direction: column; }
        .row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 20px;
          border-bottom: 1px solid var(--line);
        }
        .row:last-child { border-bottom: none; }
        .rank {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--text-3);
          width: 44px;
          font-size: 14px;
        }
        .rank.top { color: var(--brand); }
        .name {
          font-family: var(--font-mono);
          font-weight: 700;
          min-width: 140px;
          font-size: 14px;
        }
        .bar-track { flex: 1; height: 8px; border-radius: 4px; background: var(--bg-elevated); overflow: hidden; }
        .bar {
          height: 100%;
          border-radius: 4px;
          background: var(--brand-gradient);
          transition: width 0.6s var(--ease);
        }
        .count {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-2);
          min-width: 90px;
          text-align: right;
        }
        .empty { padding: 48px; text-align: center; color: var(--text-3); }
        .refresh-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-3);
          font-family: var(--font-mono);
        }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="badge"><BarChart3 size={14} /> {t("channelStats.title")}</span>
          <h1 className="section-title" style={{ marginTop: 16 }}>
            <span className="channel-name">#{channel}</span>
          </h1>
          <p className="section-sub">{t("channelStats.topChatters")}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span className="refresh-note"><RefreshCw size={12} /> {t("channelStats.autoRefresh")}</span>
          <Link href={`/${channel}/modlogs`} className="btn btn-ghost btn-sm">{t("channelStats.viewModlogs")}</Link>
        </div>
      </motion.div>

      <div className="filters">
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`chip ${!custom && period === p ? "on" : ""}`}
            onClick={() => { setCustom(false); setPeriod(p); }}
          >
            {t(`channelStats.${p}`)}
          </button>
        ))}
        <button className={`chip ${custom ? "on" : ""}`} onClick={() => setCustom(!custom)}>
          {t("channelStats.from")}–{t("channelStats.to")}
        </button>
      </div>

      {custom && (
        <div className="date-row">
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-muted">→</span>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={load}>{t("channelStats.search")}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(""); setTo(""); setCustom(false); }}>
            {t("channelStats.clear")}
          </button>
        </div>
      )}

      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {rows === null ? (
          <div className="list">
            {[...Array(8)].map((_, i) => (
              <div className="row" key={i}><div className="skeleton" style={{ height: 18, width: "100%" }}>.</div></div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">{t("channelStats.empty")}</div>
        ) : (
          <div className="list">
            {rows.slice(0, 50).map((r, i) => (
              <div className="row" key={r.username}>
                <span className={`rank ${i < 3 ? "top" : ""}`}>#{i + 1}</span>
                <span className="name">{r.username}</span>
                <div className="bar-track">
                  <div className="bar" style={{ width: `${Math.max(4, (Number(r.count) / max) * 100)}%` }} />
                </div>
                <span className="count">{Number(r.count).toLocaleString()} {t("channelStats.messages")}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
