"use client";

import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, MessageSquare, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";

export default function LoginPage() {
  const { t } = useLang();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [step, setStep] = useState("form"); // form | code | done
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // Kick OAuth dönüş hatası (?error=kick_*) varsa göster
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err?.startsWith("kick")) setError(t("login.kickError"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start(e) {
    e.preventDefault();
    setError(null);
    const name = username.trim();
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(name)) {
      setError(t("login.invalidUser"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kick_username: name }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error || "start failed");
      setCode(data.code);
      setStep("code");

      // Chat'ten doğrulamayı bekle (3 sn'de bir poll)
      pollRef.current = setInterval(async () => {
        try {
          const st = await fetch(`/api/auth/status?code=${data.code}`);
          const sd = await st.json();
          if (sd.verified) {
            clearInterval(pollRef.current);
            setStep("done");
            setTimeout(() => {
              router.push(sd.isAdmin ? "/admin" : "/panel");
              router.refresh();
            }, 1200);
          }
        } catch {}
      }, 3000);
    } catch {
      setError(t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 480 }}>
      <style jsx>{`
        .box { padding: 40px 36px; }
        .icon-top {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--brand-soft);
          border: 1px solid var(--line-brand);
          color: var(--brand);
          margin-bottom: 24px;
        }
        h1 { font-size: 28px; margin-bottom: 10px; }
        .sub { color: var(--text-2); font-size: 14.5px; margin-bottom: 28px; }
        .kick-desc { font-size: 12.5px; color: var(--text-3); margin-bottom: 4px; }
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
          color: var(--text-3);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .divider::before, .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--line);
        }
        .err { color: var(--danger); font-size: 13.5px; }
        .code-box {
          margin: 20px 0;
          padding: 20px;
          text-align: center;
          background: var(--bg-elevated);
          border: 1px dashed var(--line-brand);
          border-radius: var(--radius);
        }
        .code-cmd {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 700;
          color: var(--brand);
          letter-spacing: 0.04em;
          user-select: all;
        }
        .waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--text-2);
          font-size: 14px;
          margin-top: 8px;
        }
        .spin { animation: spin 1.2s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .expires { text-align: center; font-size: 12.5px; color: var(--text-3); margin-top: 14px; }
        .done {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 20px 0;
          color: var(--brand);
          font-weight: 600;
        }
      `}</style>

      <motion.div className="card box" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="icon-top"><KeyRound size={26} /></div>
        <h1>{t("login.title")}</h1>
        <p className="sub">{t("login.sub")}</p>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <a href="/api/kick/connect" className="btn btn-primary" style={{ width: "100%", marginBottom: 6 }}>
                <Zap size={16} /> {t("login.kick")}
              </a>
              <p className="kick-desc">{t("login.kickDesc")}</p>
              <div className="divider"><span>{t("login.or")}</span></div>
              <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  className="input"
                  placeholder={t("login.username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {error && <span className="err">{error}</span>}
                <button className="btn btn-ghost" disabled={busy} type="submit">
                  {busy ? <Loader2 size={16} className="spin" /> : <MessageSquare size={16} />}
                  {t("login.start")}
                </button>
              </form>
            </motion.div>
          )}

          {step === "code" && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <strong>{t("login.codeTitle")}</strong>
              <p className="sub" style={{ margin: "8px 0 0" }}>{t("login.codeDesc1")}</p>
              <div className="code-box">
                <div className="code-cmd">!verify {code}</div>
              </div>
              <div className="waiting">
                <Loader2 size={16} className="spin" /> {t("login.waiting")}
              </div>
              <div className="expires">{t("login.expires")}</div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" className="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <CheckCircle2 size={44} />
              {t("login.success")}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
