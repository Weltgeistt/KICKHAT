"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

const ACTIONS = ["all", "warning", "timeout", "ban"];

export default function ChannelModlogsPage({ params }) {
  const { channel } = use(params);
  const { t, lang } = useLang();
  const [logs, setLogs] = useState(null);
  const [action, setAction] = useState("all");
  const [username, setUsername] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (action !== "all") qs.set("action", action);
    if (username.trim()) qs.set("username", username.trim());
    try {
      const res = await fetch(`/api/public/modlogs/${channel}?${qs}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    }
  }, [channel, action, username]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // yazma sırasında debounce
    return () => clearTimeout(timer);
  }, [load]);

  const badgeFor = (a) =>
    a === "ban" ? "badge-danger" : a === "timeout" ? "badge-warn" : "badge-neutral";

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
        .channel-name { font-family: var(--font-mono); color: var(--brand); }
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
        .search { max-width: 220px; margin-left: auto; }
        .user-cell { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
        .date-cell { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-3); white-space: nowrap; }
        .reason-cell { color: var(--text-2); font-size: 14px; }
        .empty { padding: 48px; text-align: center; color: var(--text-3); }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="badge"><ShieldAlert size={14} /> AI Moderation</span>
          <h1 className="section-title" style={{ marginTop: 16 }}>
            {t("modlogs.title")} <span className="channel-name">#{channel}</span>
          </h1>
        </div>
        <Link href={`/${channel}/stats`} className="btn btn-ghost btn-sm">{t("modlogs.viewStats")}</Link>
      </motion.div>

      <div className="filters">
        {ACTIONS.map((a) => (
          <button key={a} className={`chip ${action === a ? "on" : ""}`} onClick={() => setAction(a)}>
            {a === "all" ? t("modlogs.allActions") : t(`modlogs.${a}`)}
          </button>
        ))}
        <input
          className="input search"
          placeholder={t("modlogs.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <motion.div className="card" style={{ overflow: "hidden" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {logs === null ? (
          <div className="empty">{t("common.loading")}</div>
        ) : logs.length === 0 ? (
          <div className="empty">{t("modlogs.empty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("modlogs.user")}</th>
                <th>{t("modlogs.action")}</th>
                <th>{t("modlogs.reason")}</th>
                <th>{t("modlogs.date")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="user-cell">@{log.kick_username}</td>
                  <td><span className={`badge ${badgeFor(log.action)}`} style={{ fontSize: 11, padding: "4px 10px" }}>{t(`modlogs.${log.action}`) || log.action}</span></td>
                  <td className="reason-cell">{log.reason || "—"}</td>
                  <td className="date-cell">
                    {new Date(log.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
