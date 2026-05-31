import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function UserInfoModal({ username, color, onClose, onBan, onTimeout }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalHistory, setGlobalHistory] = useState(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  useEffect(() => {
    invoke('get_user_info', { username })
      .then((info) => setUserInfo(info))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  const followers = userInfo?.followers_count;
  const avatar = userInfo?.user?.profile_pic;
  const bio = userInfo?.user?.bio;
  const isAffiliate = userInfo?.is_affiliate;
  const isBanned = userInfo?.user?.is_banned;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(360px, 90vw)' }}>
        <div className="modal-header">
          <div className="modal-icon" style={{ background: 'var(--mod-info-dim)', border: '1px solid var(--mod-info)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mod-info)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="modal-title" style={{ color }}>@{username}</div>
            <div className="modal-subtitle">Kullanıcı Profili</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <>
            {/* User Card */}
            <div className="user-card">
              {avatar ? (
                <img className="user-card-avatar" src={avatar} alt={username} />
              ) : (
                <div className="user-card-avatar" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color,
                  background: `${color}22`,
                }}>
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="user-card-name" style={{ color }}>{username}</div>
                <div className="user-card-meta">
                  {followers != null ? `${formatNum(followers)} takipçi` : ''}
                  {isAffiliate ? ' • Affiliate' : ''}
                  {isBanned ? ' • 🚫 Banlı' : ''}
                </div>
              </div>
            </div>

            {bio && (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginBottom: '14px',
                lineHeight: 1.5,
                maxHeight: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {bio}
              </div>
            )}

            {/* Kick Profile Link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <a
                href={`https://kick.com/${username}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'var(--kick-green)',
                  textDecoration: 'none',
                  padding: '6px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)'
                }}
              >
                kick.com/{username} →
              </a>
              <button
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  fontSize: '12px',
                  color: 'var(--mod-info)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  opacity: 0.9,
                  justifyContent: 'center'
                }}
                disabled={fetchingHistory}
                onClick={() => setFetchingHistory(true)}
              >
                {fetchingHistory ? 'İframe Yükleniyor...' : '🔍 Uygulama İçi Global Chat Ara'}
              </button>

              {fetchingHistory && (
                <div style={{ marginTop: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <iframe
                    src={`https://kicklogz.com/search?q=${username}`}
                    width="100%"
                    height="300px"
                    style={{ border: 'none', background: 'var(--bg-base)' }}
                    title="Global History"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id={`user-timeout-btn-${username}`}
                className="btn"
                style={{
                  flex: 1,
                  background: 'var(--mod-timeout-dim)',
                  color: 'var(--mod-timeout)',
                  border: '1px solid rgba(255,165,2,0.3)',
                  padding: '8px',
                }}
                onClick={onTimeout}
              >
                ⏱ Timeout
              </button>
              <button
                id={`user-ban-btn-${username}`}
                className="btn btn-danger"
                style={{ flex: 1, padding: '8px' }}
                onClick={() => { onClose(); onBan(); }}
              >
                🚫 Banla
              </button>
            </div>
          </>
        )}

        <div className="modal-footer" style={{ marginTop: '16px' }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
