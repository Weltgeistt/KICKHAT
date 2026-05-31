import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

// Icons
const MinimizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect y="4.5" width="10" height="1" rx="0.5"/>
  </svg>
);

const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="1" y="1" width="8" height="8" rx="1"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const KickLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--kick-green)">
    <path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm3 5v10h2v-4l4 4h3l-5-5 5-5h-3l-4 4V7H7z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>
);

export default function TitleBar({ subtitle, onOpenSettings, onOpenResearch }) {
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch(e) { console.error(e); }
  };
  
  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      const maximized = await win.isMaximized();
      if (maximized) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch (e) {
      console.error("Maximize error:", e);
    }
  };

  const handleFullscreen = async () => {
    try {
      const win = getCurrentWindow();
      const isFs = await win.isFullscreen();
      await win.setFullscreen(!isFs);
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch(e) { console.error(e); }
  };

  return (
    <div data-tauri-drag-region style={{
      height: '32px',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      userSelect: 'none',
      paddingLeft: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
        <img src="/logo.png" width="24" height="24" style={{ borderRadius: '4px', objectFit: 'cover' }} alt="Logo" />
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>KickHat</span>
        {subtitle && (
          <>
            <span style={{ color: 'var(--border)', fontSize: '10px' }}>|</span>
            <span style={{ fontSize: '11px', color: 'var(--kick-green)', fontWeight: '500' }}>{subtitle}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        <div 
          onClick={onOpenResearch}
          style={{
            width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--kick-green)', transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          title="Araştırma Yap"
        >
          <SearchIcon />
        </div>
        <button
          id="settings-btn"
          className="btn-icon"
          style={{ width: 28, height: 28, borderRadius: 0 }}
          onClick={onOpenSettings}
          title="Ayarlar"
        >
          <SettingsIcon />
        </button>
        <button
          className="btn-icon"
          style={{ width: 28, height: 28, borderRadius: 0 }}
          onClick={handleMinimize}
          title="Küçült"
        >
          <MinimizeIcon />
        </button>
        <button
          className="btn-icon"
          style={{ width: 28, height: 28, borderRadius: 0 }}
          onClick={handleFullscreen}
          title="Tam Ekran (F11)"
        >
          <FullscreenIcon />
        </button>
        <button
          className="btn-icon"
          style={{ width: 28, height: 28, borderRadius: 0 }}
          onClick={handleMaximize}
          title="Büyüt/Küçült"
        >
          <MaximizeIcon />
        </button>
        <button
          id="window-close-btn"
          className="btn-icon"
          style={{ width: 28, height: 28, borderRadius: 0, color: 'var(--mod-ban)' }}
          onClick={handleClose}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mod-ban-dim)'}
          onMouseLeave={(e) => e.currentTarget.style.background = ''}
          title="Kapat"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
