"use client";

import { motion } from "framer-motion";
import { TerminalSquare, Clock } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

export default function DocsPage() {
  const { t } = useLang();

  const commands = [
    { cmd: "!stats", desc: t("docs.statsDesc"), aliases: "—" },
    { cmd: "!level", desc: t("docs.levelDesc"), aliases: "!xp, !seviye" },
    { cmd: "!verify <kod>", desc: t("docs.verifyDesc"), aliases: "—" },
    { cmd: "!komutlar", desc: t("docs.helpDesc"), aliases: "!help, !yardim, !commands" },
  ];

  return (
    <div className="container section">
      <style jsx>{`
        .head { margin-bottom: 40px; }
        .cmd-cell {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--brand);
          white-space: nowrap;
        }
        .alias-cell {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-3);
        }
        .note {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 24px;
          padding: 14px 18px;
          font-size: 14px;
          color: var(--text-2);
        }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="badge"><TerminalSquare size={14} /> Kickhat Bot</span>
        <h1 className="section-title" style={{ marginTop: 18 }}>{t("docs.title")}</h1>
        <p className="section-sub">{t("docs.sub")}</p>
      </motion.div>

      <motion.div className="card" style={{ overflow: "hidden" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t("docs.cmd")}</th>
              <th>{t("docs.desc")}</th>
              <th>{t("docs.aliases")}</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((c) => (
              <tr key={c.cmd}>
                <td className="cmd-cell">{c.cmd}</td>
                <td>{c.desc}</td>
                <td className="alias-cell">{c.aliases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div className="card note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Clock size={16} color="var(--warn)" />
        {t("docs.cooldownNote")}
      </motion.div>
    </div>
  );
}
