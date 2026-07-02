"use client";

import { motion } from "framer-motion";
import { Download, ExternalLink, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

const REPO = "Weltgeistt/KICKHAT";

export default function DownloadsPage() {
  const { t } = useLang();
  const [release, setRelease] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const asset = (data.assets || []).find((a) => /\.(exe|msi)$/i.test(a.name));
        setRelease({
          version: data.tag_name,
          url: asset?.browser_download_url || data.html_url,
          name: asset?.name,
        });
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <style jsx>{`
        .wrap { text-align: center; }
        .icon-hero {
          width: 84px;
          height: 84px;
          margin: 0 auto 28px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--brand-soft);
          border: 1px solid var(--line-brand);
          color: var(--brand);
        }
        .dl-box {
          margin-top: 40px;
          padding: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .version {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text-3);
        }
        .req { font-size: 13px; color: var(--text-3); margin-top: 6px; }
      `}</style>

      <motion.div className="wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="icon-hero"><MonitorSmartphone size={38} /></div>
        <h1 className="section-title">{t("downloads.title")}</h1>
        <p className="section-sub" style={{ margin: "0 auto" }}>{t("downloads.sub")}</p>

        <div className="card dl-box">
          {state === "loading" && <span className="text-muted">{t("downloads.loading")}</span>}
          {state === "error" && <span className="text-muted">{t("downloads.fetchError")}</span>}
          {state === "ok" && release?.version && (
            <span className="version">{t("downloads.version")}: {release.version}</span>
          )}

          <a
            href={state === "ok" ? release.url : `https://github.com/${REPO}/releases/latest`}
            className="btn btn-primary"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            <Download size={18} /> {t("downloads.windows")}
          </a>

          <a
            href={`https://github.com/${REPO}/releases`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <ExternalLink size={15} /> {t("downloads.allReleases")}
          </a>

          <span className="req">{t("downloads.req")}</span>
        </div>
      </motion.div>
    </div>
  );
}
