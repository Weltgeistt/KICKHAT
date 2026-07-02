"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="footer">
      <style jsx>{`
        .footer {
          border-top: 1px solid var(--line);
          background: var(--bg-raised);
          padding: 56px 0 32px;
          position: relative;
          z-index: 1;
        }
        .inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .top {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .brand {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
        }
        .brand p {
          margin-top: 10px;
          font-family: var(--font-body);
          font-weight: 400;
          font-size: 14px;
          color: var(--text-3);
          max-width: 280px;
        }
        .cols {
          display: flex;
          gap: 64px;
          flex-wrap: wrap;
        }
        .col h4 {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-3);
          margin-bottom: 14px;
        }
        .col :global(a) {
          display: block;
          font-size: 14px;
          color: var(--text-2);
          padding: 5px 0;
          transition: color 0.2s;
        }
        .col :global(a:hover) {
          color: var(--brand);
        }
        .bottom {
          border-top: 1px solid var(--line);
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          color: var(--text-3);
        }
      `}</style>

      <div className="inner">
        <div className="top">
          <div className="brand">
            KICKHAT<span className="text-brand">_</span>
            <p>{t("hero.desc")}</p>
          </div>
          <div className="cols">
            <div className="col">
              <h4>{t("footer.product")}</h4>
              <Link href="/#features">{t("nav.features")}</Link>
              <Link href="/downloads">{t("nav.downloads")}</Link>
              <Link href="/leaderboard">{t("nav.leaderboard")}</Link>
            </div>
            <div className="col">
              <h4>{t("footer.resources")}</h4>
              <Link href="/docs">{t("nav.docs")}</Link>
              <Link href="/login">{t("nav.login")}</Link>
            </div>
            <div className="col">
              <h4>{t("footer.legal")}</h4>
              <a href="https://github.com/ademiru" target="_blank" rel="noreferrer">Ademiru</a>
              <a href="https://github.com/Weltgeistt" target="_blank" rel="noreferrer">Poyland</a>
            </div>
          </div>
        </div>
        <div className="bottom">
          <span>© {new Date().getFullYear()} Kickhat. {t("footer.rights")}</span>
          <span className="mono">kickhat.net</span>
        </div>
      </div>
    </footer>
  );
}
