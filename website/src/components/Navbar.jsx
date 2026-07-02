"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

export default function Navbar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.username ? d : null))
      .catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/#features", label: t("nav.features") },
    { href: "/docs", label: t("nav.docs") },
    { href: "/leaderboard", label: t("nav.leaderboard") },
    { href: "/downloads", label: t("nav.downloads") },
  ];

  return (
    <header className="nav-root">
      <style jsx>{`
        .nav-root {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 12, 15, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--line);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 19px;
          letter-spacing: -0.02em;
        }
        .logo :global(img) {
          border-radius: 8px;
        }
        .links {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .link {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-2);
          transition: color 0.2s;
        }
        .link:hover, .link.active {
          color: var(--text);
        }
        .right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lang-switch {
          display: flex;
          border: 1px solid var(--line);
          border-radius: var(--radius-pill);
          overflow: hidden;
        }
        .lang-btn {
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          transition: all 0.2s;
        }
        .lang-btn.on {
          background: var(--brand-soft);
          color: var(--brand);
        }
        .user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px 6px 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-pill);
          background: var(--bg-raised);
        }
        .user-name {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--brand);
          font-weight: 700;
        }
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: var(--text-3);
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover { color: var(--text); background: var(--bg-hover); }
        .burger {
          display: none;
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
        }
        .mobile-menu {
          display: none;
        }
        @media (max-width: 900px) {
          .links { display: none; }
          .burger { display: block; }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 12px 24px 20px;
            border-top: 1px solid var(--line);
          }
          .mobile-menu :global(a) {
            padding: 12px 8px;
            font-size: 15px;
            color: var(--text-2);
            border-radius: 8px;
          }
          .mobile-menu :global(a:hover) {
            background: var(--bg-hover);
            color: var(--text);
          }
        }
      `}</style>

      <div className="nav-inner">
        <Link href="/" className="logo">
          <Image src="/logo.png" alt="Kickhat" width={30} height={30} />
          KICKHAT<span className="text-brand">_</span>
        </Link>

        <nav className="links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`link ${pathname === l.href ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="right">
          <div className="lang-switch">
            <button className={`lang-btn ${lang === "tr" ? "on" : ""}`} onClick={() => setLang("tr")}>TR</button>
            <button className={`lang-btn ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>EN</button>
          </div>

          {user ? (
            <div className="user-chip">
              <span className="user-name">@{user.username}</span>
              <Link href="/panel" className="icon-btn" title={t("nav.panel")}>
                <LayoutDashboard size={15} />
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="icon-btn" title={t("nav.admin")}>
                  <Shield size={15} />
                </Link>
              )}
              <button className="icon-btn" onClick={logout} title={t("nav.logout")}>
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              {t("nav.login")}
            </Link>
          )}

          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
