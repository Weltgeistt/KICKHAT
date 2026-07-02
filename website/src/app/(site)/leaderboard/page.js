"use client";

import { motion } from "framer-motion";
import { Trophy, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

export default function LeaderboardPage() {
  const { t } = useLang();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/public/leaderboard?limit=50")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError(true));
  }, []);

  const medal = (i) =>
    i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : null;

  return (
    <div className="container section" style={{ maxWidth: 860 }}>
      <style jsx>{`
        .head { margin-bottom: 36px; }
        .rank-cell {
          font-family: var(--font-mono);
          font-weight: 700;
          width: 70px;
        }
        .user-cell {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--text);
        }
        .xp-cell {
          font-family: var(--font-mono);
          color: var(--brand);
          font-weight: 700;
        }
        .lvl-cell { font-family: var(--font-mono); }
        .empty {
          padding: 48px;
          text-align: center;
          color: var(--text-3);
          font-size: 15px;
        }
        .sk-row { height: 20px; width: 100%; }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="badge"><Trophy size={14} /> Kickhat XP</span>
        <h1 className="section-title" style={{ marginTop: 18 }}>{t("leaderboard.title")}</h1>
        <p className="section-sub">{t("leaderboard.sub")}</p>
      </motion.div>

      <motion.div className="card" style={{ overflow: "hidden" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {error ? (
          <div className="empty">{t("leaderboard.error")}</div>
        ) : rows === null ? (
          <table className="table">
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i}><td><div className="skeleton sk-row">.</div></td></tr>
              ))}
            </tbody>
          </table>
        ) : rows.length === 0 ? (
          <div className="empty">{t("leaderboard.empty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("leaderboard.rank")}</th>
                <th>{t("leaderboard.user")}</th>
                <th>{t("leaderboard.level")}</th>
                <th>{t("leaderboard.channels")}</th>
                <th style={{ textAlign: "right" }}>{t("leaderboard.xp")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.kick_username}>
                  <td className="rank-cell">
                    {medal(i) ? <Medal size={18} color={medal(i)} /> : `#${i + 1}`}
                  </td>
                  <td className="user-cell">@{r.kick_username}</td>
                  <td className="lvl-cell">Lv. {r.best_level}</td>
                  <td className="lvl-cell">{r.channel_count}</td>
                  <td className="xp-cell" style={{ textAlign: "right" }}>
                    {Number(r.total_xp).toLocaleString()}
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
