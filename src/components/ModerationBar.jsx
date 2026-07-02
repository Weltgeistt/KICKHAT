import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';

// ── Icons ────────────────────────────────────────────────────────────────

const DisconnectIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ViewersIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function ModerationBar({ view, onViewChange, onDisconnect }) {
  const { t } = useTranslation();
  const { channelInfo, channelSlug, connected, connecting, settings } = useChatStore();

  const streamerName = channelInfo?.user?.username || channelSlug || '—';
  const avatar = channelInfo?.user?.profile_pic;
  const isLive = channelInfo?.livestream?.is_live;
  const viewers = channelInfo?.livestream?.viewer_count;

  return (
    <div className="mod-bar">
      {/* Channel Info */}
      <div className="mod-bar-channel">
        {avatar ? (
          <img className="channel-avatar" src={avatar} alt={streamerName} />
        ) : (
          <div className="channel-avatar-placeholder">
            {streamerName.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="channel-name">{streamerName}</span>
            {isLive && (
              <span className="live-badge">
                <span className="live-dot" />
                LIVE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div className={`status-dot ${connected ? 'connected' : connecting ? 'connecting' : 'disconnected'}`} />
            <span className="status-text">
              {connected ? (t('app.connected_status') || 'Bağlı') : connecting ? (t('app.connecting_status') || 'Bağlanıyor...') : (t('app.disconnected_status') || 'Bağlı değil')}
            </span>
            {viewers != null && viewers > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>•</span>
                <ViewersIcon />
                <span className="status-text">{formatViewers(viewers)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', margin: '0 10px' }}>
        <button 
          className={`toggle-btn ${view === 'chat' ? 'active' : ''}`}
          onClick={() => onViewChange('chat')}
        >
          {t('app.tab_chat') || 'Chat'}
        </button>
        {settings?.aiFeaturesEnabled && (
          <button 
            className={`toggle-btn ${view === 'analysis' ? 'active' : ''}`}
            onClick={() => onViewChange('analysis')}
          >
            {t('app.tab_ai') || 'AI Analiz'}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="mod-bar-controls">
        <button
          id="disconnect-btn"
          className="btn-icon"
          onClick={onDisconnect}
          title="Bağlantıyı kes"
          style={{ color: 'var(--mod-ban)' }}
        >
          <DisconnectIcon />
        </button>
      </div>
    </div>
  );
}

function formatViewers(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
