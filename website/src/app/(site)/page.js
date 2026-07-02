"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, ShieldAlert, Gamepad2, BarChart3, TerminalSquare, MonitorSmartphone, Check, ChevronRight, Sparkles } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Home() {
  const { t } = useLang();

  const features = [
    { icon: Bot, k: "ai" },
    { icon: Gamepad2, k: "xp" },
    { icon: ShieldAlert, k: "strike" },
    { icon: BarChart3, k: "stats" },
    { icon: TerminalSquare, k: "commands" },
    { icon: MonitorSmartphone, k: "desktop" },
  ];

  return (
    <div className="home">
      <style jsx>{`
        /* ---------- Hero ---------- */
        .hero {
          padding: 110px 0 90px;
          text-align: center;
          position: relative;
        }
        .hero-title {
          font-size: clamp(40px, 7vw, 72px);
          letter-spacing: -0.03em;
          margin: 28px 0 20px;
        }
        .hero-title .grad {
          color: var(--brand);
          text-shadow: 0 0 30px var(--brand-glow);
        }
        .hero-desc {
          font-size: 18px;
          color: var(--text-2);
          max-width: 620px;
          margin: 0 auto 36px;
        }
        .hero-cta {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .hero-chat {
          max-width: 560px;
          margin: 72px auto 0;
          text-align: left;
        }
        .chat-window {
          background: var(--bg-raised);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .chat-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-3);
        }
        .t-dot { width: 10px; height: 10px; border-radius: 50%; }
        .t-dot.r { background: #ff4757; }
        .t-dot.y { background: #ffa502; }
        .t-dot.g { background: var(--brand); box-shadow: 0 0 8px var(--brand-glow); }
        .chat-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .msg { display: flex; gap: 10px; font-size: 14px; line-height: 1.5; }
        .msg .who { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
        .who.viewer { color: #7dd3fc; }
        .who.bot { color: var(--brand); }
        .msg.bot-msg {
          background: var(--brand-soft);
          border: 1px solid var(--line-brand);
          border-radius: 10px;
          padding: 10px 14px;
        }

        /* ---------- Features ---------- */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }
        .feature {
          padding: 30px 28px;
        }
        .f-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--brand-soft);
          color: var(--brand);
          border: 1px solid var(--line-brand);
          margin-bottom: 20px;
        }
        .feature h3 { font-size: 19px; margin-bottom: 10px; }
        .feature p { font-size: 14.5px; color: var(--text-2); }

        /* ---------- How ---------- */
        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }
        .step {
          padding: 30px 28px;
          position: relative;
        }
        .step-no {
          font-family: var(--font-mono);
          font-size: 44px;
          font-weight: 700;
          color: rgba(83, 252, 24, 0.18);
          line-height: 1;
          margin-bottom: 18px;
        }
        .step h4 { font-size: 19px; margin-bottom: 10px; }
        .step p { font-size: 14.5px; color: var(--text-2); }

        /* ---------- Pricing ---------- */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          max-width: 820px;
          margin: 48px auto 0;
        }
        .price-card { padding: 36px 32px; display: flex; flex-direction: column; }
        .price-card.pro { border-color: var(--line-brand); box-shadow: var(--shadow-glow); }
        .plan-name { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
        .plan-name.pro-name { color: var(--brand); }
        .plan-desc { font-size: 13.5px; color: var(--text-3); margin-bottom: 20px; }
        .price { font-family: var(--font-mono); font-size: 42px; font-weight: 700; margin-bottom: 24px; }
        .price span { font-size: 15px; color: var(--text-3); font-weight: 400; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 11px; margin-bottom: 30px; flex: 1; }
        .plan-features li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-2); }

        .center { text-align: center; }
        .center .section-sub { margin: 0 auto; }
      `}</style>

      {/* Hero */}
      <section className="hero container">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <span className="badge">
            <Sparkles size={14} /> {t("hero.badge")}
          </span>
          <h1 className="hero-title">
            {t("hero.title1")}<br />
            <span className="grad">{t("hero.title2")}</span>
          </h1>
          <p className="hero-desc">{t("hero.desc")}</p>
          <div className="hero-cta">
            <Link href="/login" className="btn btn-primary">
              {t("hero.cta1")} <ChevronRight size={16} />
            </Link>
            <Link href="/docs" className="btn btn-ghost">
              {t("hero.cta2")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="hero-chat"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="chat-window">
            <div className="chat-head">
              <span className="t-dot r" />
              <span className="t-dot y" />
              <span className="t-dot g" />
              <span style={{ marginLeft: 8 }}>bash — kickhat_core · kick.com/poyland</span>
            </div>
            <div className="chat-body">
              <div className="msg">
                <span className="who viewer">izleyici42:</span>
                <span>!level</span>
              </div>
              <div className="msg bot-msg">
                <span className="who bot">KickhatBot:</span>
                <span>@izleyici42 → Seviye 7 (642/700 XP) ⚡</span>
              </div>
              <div className="msg">
                <span className="who viewer">izleyici42:</span>
                <span>!stats</span>
              </div>
              <div className="msg bot-msg">
                <span className="who bot">KickhatBot:</span>
                <span>📊 kickhat.net/poyland/stats</span>
              </div>
              <div className="msg bot-msg">
                <span className="who bot">KickhatBot:</span>
                <span>🎉 @izleyici42 seviye atladı! Yeni seviye: 8 ⚡</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="section" style={{ background: "var(--bg-raised)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <h2 className="section-title">{t("features.title")}</h2>
            <p className="section-sub">{t("features.sub")}</p>
          </motion.div>
          <div className="grid">
            {features.map(({ icon: Icon, k }, i) => (
              <motion.div
                key={k}
                className="card card-hover feature"
                style={{ background: "var(--bg)", textAlign: "left" }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <div className="f-icon"><Icon size={22} /></div>
                <h3>{t(`features.${k}.title`)}</h3>
                <p>{t(`features.${k}.desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container center">
          <motion.h2 className="section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {t("how.title")}
          </motion.h2>
          <div className="steps">
            {[1, 2, 3].map((n, i) => (
              <motion.div
                key={n}
                className="card card-hover step"
                style={{ textAlign: "left" }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <div className="step-no">0{n}</div>
                <h4>{t(`how.s${n}t`)}</h4>
                <p>{t(`how.s${n}d`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section" style={{ background: "var(--bg-raised)", borderTop: "1px solid var(--line)" }}>
        <div className="container center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="section-title">{t("pricing.title")}</h2>
            <p className="section-sub">{t("pricing.sub")}</p>
          </motion.div>

          <div className="pricing-grid">
            <motion.div
              className="card price-card"
              style={{ background: "var(--bg)", textAlign: "left" }}
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            >
              <div className="plan-name">{t("pricing.free")}</div>
              <div className="plan-desc">{t("pricing.freeDesc")}</div>
              <div className="price">₺0 <span>{t("pricing.month")}</span></div>
              <ul className="plan-features">
                {["f1", "f2", "f3"].map((k) => (
                  <li key={k}><Check size={16} color="var(--brand)" /> {t(`pricing.${k}`)}</li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-ghost" style={{ width: "100%" }}>{t("pricing.cta")}</Link>
            </motion.div>

            <motion.div
              className="card price-card pro"
              style={{ background: "var(--bg)", textAlign: "left" }}
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            >
              <div className="plan-name pro-name">{t("pricing.pro")}</div>
              <div className="plan-desc">{t("pricing.proDesc")}</div>
              <div className="price">₺0 <span>{t("pricing.beta")}</span></div>
              <ul className="plan-features">
                {["p1", "p2", "p3", "p4", "p5"].map((k) => (
                  <li key={k}><Check size={16} color="var(--brand)" /> {t(`pricing.${k}`)}</li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-primary" style={{ width: "100%" }}>{t("pricing.ctaPro")}</Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
