"use client";

import { motion } from "framer-motion";
import { TerminalSquare, Clock, Gamepad2, Shield, Sparkles, Wrench } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

// Komut dokümanı — açıklamalar iki dilde inline tutulur
const CATEGORIES = [
  {
    id: "general",
    icon: TerminalSquare,
    title: { tr: "Genel Komutlar", en: "General Commands" },
    commands: [
      {
        cmd: "!stats",
        perm: "all",
        aliases: "—",
        desc: { tr: "Kanalın canlı istatistik sayfasının linkini verir (top chatter'lar, aktivite).", en: "Returns the channel's live statistics page link (top chatters, activity)." },
        example: "!stats",
      },
      {
        cmd: "!level",
        perm: "all",
        aliases: "!xp · !seviye · !rank",
        desc: { tr: "Seviyeni, XP ilerlemeni (ilerleme çubuğuyla) ve kanal içi sıranı gösterir.", en: "Shows your level, XP progress (with a progress bar) and your rank in the channel." },
        example: "!level → Seviye 7 ⚡ 642/700 XP [▰▰▰▰▰▰▰▰▱▱] · #12",
      },
      {
        cmd: "!top",
        perm: "all",
        aliases: "—",
        desc: { tr: "Bu haftanın en aktif 5 izleyicisini mesaj sayılarıyla listeler.", en: "Lists this week's 5 most active viewers with message counts." },
        example: "!top → 🥇 viewer1 (523) · 🥈 viewer2 (417) …",
      },
      {
        cmd: "!verify <kod>",
        perm: "all",
        aliases: "—",
        desc: { tr: "kickhat.net hesabını Kick hesabınla eşleştirir (şifresiz giriş).", en: "Links your kickhat.net account with your Kick account (passwordless sign-in)." },
        example: "!verify 123456",
      },
      {
        cmd: "!komutlar",
        perm: "all",
        aliases: "!help · !yardim · !commands",
        desc: { tr: "Kanalda aktif tüm komutları (kanala özel olanlar dahil) listeler.", en: "Lists all active commands in the channel (including custom ones)." },
        example: "!komutlar",
      },
    ],
  },
  {
    id: "fun",
    icon: Sparkles,
    title: { tr: "Eğlence", en: "Fun" },
    commands: [
      {
        cmd: "!zar [max]",
        perm: "all",
        aliases: "!dice",
        desc: { tr: "Zar atar. Sayı verirsen 1 ile o sayı arasında atar.", en: "Rolls a die. Pass a number to roll between 1 and that number." },
        example: "!zar · !zar 100",
      },
      {
        cmd: "!yazitura",
        perm: "all",
        aliases: "!coinflip",
        desc: { tr: "Yazı tura atar.", en: "Flips a coin." },
        example: "!yazitura → 🪙 YAZI!",
      },
      {
        cmd: "!8ball <soru>",
        perm: "all",
        aliases: "—",
        desc: { tr: "Sihirli 8 topuna soru sor, kaderine razı ol.", en: "Ask the magic 8-ball a question and accept your fate." },
        example: "!8ball bugün kazanacak mıyım?",
      },
    ],
  },
  {
    id: "games",
    icon: Gamepad2,
    title: { tr: "Chat Oyunları", en: "Chat Games" },
    commands: [
      {
        cmd: "!cekilis [dk]",
        perm: "mod",
        aliases: "!raffle",
        desc: { tr: "XP çekilişi başlatır (varsayılan 2 dk, en fazla 30). Süre bitince kazanan otomatik açıklanır. Ödül: 150 XP.", en: "Starts an XP raffle (default 2 min, max 30). Winner is announced automatically. Prize: 150 XP." },
        example: "!cekilis 5",
      },
      {
        cmd: "!katil",
        perm: "all",
        aliases: "!join",
        desc: { tr: "Aktif çekilişe katılır (sessiz — chat'i doldurmaz, tekrar yazmak avantaj sağlamaz).", en: "Joins the active raffle (silent — doesn't flood chat; typing again gives no advantage)." },
        example: "!katil",
      },
      {
        cmd: "!cekilisbitir",
        perm: "mod",
        aliases: "—",
        desc: { tr: "Çekilişi erken bitirir ve kazananı hemen seçer.", en: "Ends the raffle early and picks the winner immediately." },
        example: "!cekilisbitir",
      },
      {
        cmd: "!kelimetahmin",
        perm: "mod",
        aliases: "—",
        desc: { tr: "Kelime tahmin oyunu başlatır: bot maskeli kelime verir, ilk doğru yazan 100 XP kazanır. 3 dk içinde bilinmezse oyun biter.", en: "Starts a word-guess game: the bot posts a masked word; first correct guess wins 100 XP. Game ends after 3 minutes." },
        example: "!kelimetahmin → 🧠 6 harf: k ▪ ▪ ▪ ▪ ▪",
      },
      {
        cmd: "!ipucu",
        perm: "all",
        aliases: "!hint",
        desc: { tr: "Aktif kelime oyununda bir harf daha açar.", en: "Reveals one more letter in the active word game." },
        example: "!ipucu → 💡 k l ▪ ▪ ▪ ▪",
      },
    ],
  },
  {
    id: "mod",
    icon: Shield,
    title: { tr: "Moderatör Komutları", en: "Moderator Commands" },
    commands: [
      {
        cmd: "!komutekle !ad <cevap>",
        perm: "mod",
        aliases: "—",
        desc: { tr: "Kanala özel komut ekler. Yerleşik komutların üzerine yazılamaz.", en: "Adds a channel-specific custom command. Built-ins can't be overridden." },
        example: "!komutekle !discord discord.gg/kanal",
      },
      {
        cmd: "!komutsil !ad",
        perm: "mod",
        aliases: "—",
        desc: { tr: "Kanala özel komutu siler.", en: "Deletes a channel-specific custom command." },
        example: "!komutsil !discord",
      },
    ],
  },
];

const PERM_LABEL = {
  all: { tr: "Herkes", en: "Everyone", cls: "badge-neutral" },
  mod: { tr: "Mod+", en: "Mod+", cls: "badge-warn" },
};

export default function DocsPage() {
  const { t, lang } = useLang();

  return (
    <div className="container section" style={{ maxWidth: 980 }}>
      <style jsx>{`
        .head { margin-bottom: 40px; }
        .cat { margin-bottom: 40px; }
        .cat-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          margin-bottom: 16px;
          font-family: var(--font-mono);
          color: var(--brand);
        }
        .cmd-cell {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--brand);
          white-space: nowrap;
          font-size: 13px;
        }
        .alias-cell {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-3);
          white-space: nowrap;
        }
        .example {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-3);
          margin-top: 6px;
          display: block;
        }
        .example::before { content: '> '; color: var(--brand); }
        .note {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          padding: 14px 18px;
          font-size: 13.5px;
          color: var(--text-2);
        }
        @media (max-width: 700px) {
          .hide-mobile { display: none; }
        }
      `}</style>

      <motion.div className="head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="badge"><TerminalSquare size={14} /> KICKHAT_BOT</span>
        <h1 className="section-title" style={{ marginTop: 18 }}>{t("docs.title")}</h1>
        <p className="section-sub">{t("docs.sub")}</p>
      </motion.div>

      {CATEGORIES.map((cat, ci) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.id}
            className="cat"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * ci }}
          >
            <div className="cat-title"><Icon size={18} /> {cat.title[lang] || cat.title.tr}</div>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("docs.cmd")}</th>
                    <th>{t("docs.perm")}</th>
                    <th>{t("docs.desc")}</th>
                    <th className="hide-mobile">{t("docs.aliases")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.commands.map((c) => (
                    <tr key={c.cmd}>
                      <td className="cmd-cell">{c.cmd}</td>
                      <td>
                        <span className={`badge ${PERM_LABEL[c.perm].cls}`} style={{ fontSize: 10, padding: "3px 8px" }}>
                          {PERM_LABEL[c.perm][lang] || PERM_LABEL[c.perm].tr}
                        </span>
                      </td>
                      <td>
                        {c.desc[lang] || c.desc.tr}
                        <span className="example">{c.example}</span>
                      </td>
                      <td className="alias-cell hide-mobile">{c.aliases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      })}

      <motion.div className="card note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Clock size={16} color="var(--warn)" />
        {t("docs.cooldownNote")}
      </motion.div>
      <motion.div className="card note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <Wrench size={16} color="var(--brand)" />
        {t("docs.customNote")}
      </motion.div>
    </div>
  );
}
