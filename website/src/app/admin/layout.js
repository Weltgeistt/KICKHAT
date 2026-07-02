"use client";

import Link from "next/link";
import { LayoutDashboard, Users, ShieldAlert, Settings, LogOut } from "lucide-react";

export default function AdminLayout({ children }) {
  return (
    <div className="admin-container">
      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }

        .admin-sidebar {
          width: 260px;
          background: var(--glass-bg);
          border-right: 1px solid var(--glass-border);
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .admin-logo {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 800;
          color: var(--color-primary);
          margin-bottom: 40px;
          letter-spacing: -0.5px;
        }

        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--color-text-muted);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-item:hover, .nav-item.active {
          background: rgba(83, 252, 24, 0.1);
          color: var(--color-primary);
        }

        .nav-item.logout {
          margin-top: auto;
          color: #ff4757;
        }
        
        .nav-item.logout:hover {
          background: rgba(255, 71, 87, 0.1);
          color: #ff4757;
        }

        .admin-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
        }
      `}</style>

      <aside className="admin-sidebar">
        <div className="admin-logo">Kickhat Admin</div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ul className="nav-list">
            <li>
              <Link href="/admin" className="nav-item active">
                <LayoutDashboard size={20} />
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="nav-item">
                <Users size={20} />
                Kullanıcılar
              </Link>
            </li>
            <li>
              <Link href="/admin/logs" className="nav-item">
                <ShieldAlert size={20} />
                Mod Logları
              </Link>
            </li>
            <li>
              <Link href="/admin/settings" className="nav-item">
                <Settings size={20} />
                Sistem Ayarları
              </Link>
            </li>
          </ul>

          <Link href="/" className="nav-item logout">
            <LogOut size={20} />
            Çıkış Yap
          </Link>
        </nav>
      </aside>

      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
