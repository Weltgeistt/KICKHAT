"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Home } from "lucide-react";

export default function AdminShell({ username, children }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="admin-container">
      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          position: relative;
          z-index: 1;
        }
        .admin-sidebar {
          width: 250px;
          background: var(--bg-raised);
          border-right: 1px solid var(--line);
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .admin-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
          padding: 0 10px;
        }
        .admin-logo :global(img) { border-radius: 7px; }
        .whoami {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--brand);
          padding: 0 10px;
          margin-bottom: 32px;
        }
        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .nav-list :global(a), .nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: var(--radius-sm);
          color: var(--text-2);
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          font-family: var(--font-body);
        }
        .nav-list :global(a:hover), .nav-list :global(a.active) {
          background: var(--brand-soft);
          color: var(--brand);
        }
        .nav-btn.logout { color: var(--danger); margin-top: auto; }
        .nav-btn.logout:hover { background: var(--danger-soft); }
        .admin-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
        }
        @media (max-width: 800px) {
          .admin-sidebar { display: none; }
          .admin-content { padding: 24px 16px; }
        }
      `}</style>

      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Image src="/logo.png" alt="" width={26} height={26} />
          Kickhat Admin
        </div>
        <div className="whoami">@{username}</div>
        <ul className="nav-list">
          <li>
            <Link href="/admin" className="active">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
          </li>
          <li>
            <Link href="/">
              <Home size={18} /> Siteye Dön
            </Link>
          </li>
        </ul>
        <button className="nav-btn logout" onClick={logout}>
          <LogOut size={18} /> Çıkış Yap
        </button>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}
