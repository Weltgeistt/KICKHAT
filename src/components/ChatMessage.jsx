import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useChatStore, pickSubscriberBadge } from '../store/chatStore';
import TimeoutModal from './TimeoutModal';
import UserInfoModal from './UserInfoModal';

// Linkleri varsayılan tarayıcıda aç (webview içinde gezinmeyi engelle)
function openExternal(url) {
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  openUrl(full).catch(() => { try { window.open(full, '_blank'); } catch { /* ignore */ } });
}

// Düz metni URL'lere göre parçala → tıklanabilir <a> üret
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,!?:;)\]}'"])/gi;
function renderTextWithLinks(text, keyPrefix) {
  const out = [];
  let last = 0;
  let m;
  URL_REGEX.lastIndex = 0;
  while ((m = URL_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const url = m[0];
    out.push(
      <a
        key={`${keyPrefix}-l-${m.index}`}
        className="msg-link"
        href={url}
        onClick={(e) => { e.preventDefault(); openExternal(url); }}
      >
        {url}
      </a>
    );
    last = m.index + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ── Icons ─────────────────────────────────────────────────────────────

const BanIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const TimeoutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ── Badges (Kick orijinal rozet ikonları) ──────────────────────────────

// Kick rozetlerinin imzası: sekizgen arka plan + beyaz iç ikon
const OCTA = 'M7 0H17L24 7V17L17 24H7L0 17V7Z';

// Kick'in sohbet kimlik rozetleri — her biri kendi rengi/ikonuyla
const KICK_BADGES = {
  // Yayıncı kendi chatine yazınca → mor sekizgen + beyaz mikrofon
  broadcaster: {
    title: 'Yayıncı',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#9147ff" />
        <g transform="translate(5 5) scale(0.5833)" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
          <path d="M12 19v3" />
          <path d="M8 22h8" />
        </g>
      </svg>
    ),
  },
  // Moderatör → mavi sekizgen + belirgin beyaz kılıç
  moderator: {
    title: 'Moderatör',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#1e7fe8" />
        <g transform="translate(3.5 3.5) scale(0.7083)" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" />
          <line x1="11" y1="19" x2="5" y2="13" />
          <line x1="8" y1="16" x2="4" y2="20" />
          <line x1="5" y1="21" x2="3" y2="19" />
        </g>
      </svg>
    ),
  },
  global_moderator: {
    title: 'Global Moderatör',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#00c7ac" />
        <g transform="translate(3.5 3.5) scale(0.7083)" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" />
          <line x1="11" y1="19" x2="5" y2="13" />
          <line x1="8" y1="16" x2="4" y2="20" />
          <line x1="5" y1="21" x2="3" y2="19" />
        </g>
      </svg>
    ),
  },
  // VIP → altın taç
  vip: {
    title: 'VIP',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#241a02" />
        <g transform="translate(4 4) scale(0.6667)">
          <path d="M3 8l4.5 3.2L12 4.5l4.5 6.7L21 8l-1.7 10.5H4.7z" fill="#f5b800" />
          <rect x="4.7" y="19" width="14.6" height="1.8" fill="#f5b800" />
        </g>
      </svg>
    ),
  },
  // OG → pembe sekizgen + altın "OG"
  og: {
    title: 'OG',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#eb0e8c" />
        <text x="12" y="16.6" textAnchor="middle" fontSize="11.5" fontWeight="800" letterSpacing="-0.8" fontFamily="Inter, system-ui, sans-serif" fill="#f5b800">OG</text>
      </svg>
    ),
  },
  // Kurucu → altın daire + sıra numarası
  founder: {
    title: 'Kurucu',
    icon: (badge) => (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11.5" fill="#f5b800" />
        <text x="12" y="16.4" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" fill="#1a1a1a">
          {badge?.count || 1}
        </text>
      </svg>
    ),
  },
  verified: {
    title: 'Doğrulanmış',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#53fc18" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  // Kick resmi ekip → yeşil sekizgen + Kick'in blok "K" logosu
  staff: {
    title: 'Kick Ekibi',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d={OCTA} fill="#53fc18" />
        <path d="M7 7 v10 h3 v-4 l4 4 h3.2 l-5.2-5 5.2-5 h-3.2 l-4 4 V7 Z" fill="#0a0a0a" />
      </svg>
    ),
  },
  gift: {
    title: 'Hediye Abonelik',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#53fc18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
        <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
      </svg>
    ),
  },
  sub_gift: {
    title: 'Hediye Abonelik',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#53fc18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
        <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
      </svg>
    ),
  },
  subscriber: {
    title: 'Abone',
    icon: (
      <svg viewBox="0 0 24 24" fill="#53fc18">
        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
      </svg>
    ),
  },
};

// Kick'te bazı rozetler eşanlamlı gelebilir → normalize et
const BADGE_ALIASES = {
  sub_gifter: 'gift',
  subgifter: 'gift',
  gifter: 'gift',
  founders: 'founder',
};

function BadgeIcon({ badge, subscriberBadges }) {
  const raw = (badge?.type || '').toLowerCase();
  const type = BADGE_ALIASES[raw] || raw;

  // Abone rozeti → kanalın kendi abonelik logosunu yükle (varsa)
  if (type === 'subscriber') {
    const sub = pickSubscriberBadge(subscriberBadges, badge?.count);
    if (sub?.src) {
      return (
        <img
          className="badge-img"
          src={sub.src}
          alt={`${sub.months ?? badge?.count ?? ''} ay abone`}
          title={badge?.count ? `${badge.count} ay abone` : 'Abone'}
        />
      );
    }
  }

  const b = KICK_BADGES[type];
  if (!b) return null;

  let title = b.title;
  if (badge?.count) {
    if (type === 'gift') title = `${badge.count} hediye abonelik`;
    else if (type === 'subscriber') title = `${badge.count} ay abone`;
    else if (type === 'founder') title = `${badge.count}. kurucu`;
  }

  const iconNode = typeof b.icon === 'function' ? b.icon(badge) : b.icon;
  return <span className="badge-svg" title={title}>{iconNode}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────

function ReplyContextView({ currentMessage }) {
  const messages = useChatStore((s) => s.messages);
  const subscriberBadges = useChatStore((s) => s.subscriberBadges);
  
  const chain = React.useMemo(() => {
    const result = [];
    let current = currentMessage;
    let limit = 10;
    
    // Geriye dönük alıntı zincirini (reply chain) takip et
    while (current && current.metadata?.original_message?.id && limit > 0) {
      const parentId = current.metadata.original_message.id;
      const parentInStore = messages.find(m => m.id === parentId);
      
      if (parentInStore) {
        result.unshift(parentInStore);
        current = parentInStore;
      } else {
        // Mesaj chatStore'dan silinmişse (çok eskiyse) metadata içinden kurtar
        result.unshift({
          id: parentId,
          content: current.metadata.original_message.content,
          displayName: current.metadata.original_sender.username,
          username: current.metadata.original_sender.username,
          color: 'var(--text-muted)',
          badges: [],
          deleted: false,
          fallback: true
        });
        break;
      }
      limit--;
    }
    return result;
  }, [messages, currentMessage]);

  if (chain.length === 0) return null;

  return (
    <div style={{ marginTop: '10px', marginBottom: '6px', padding: '14px 12px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '-8px', left: '12px', background: 'var(--bg-input)', padding: '0 6px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '4px' }}>
        ALINTI AKIŞI
      </div>
      {chain.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', opacity: m.deleted ? 0.5 : 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '1px' }}>
            {m.badges?.map((b, i) => (
              <BadgeIcon key={i} badge={b} subscriberBadges={subscriberBadges} />
            ))}
            <span style={{ color: m.color, fontWeight: 700 }}>{m.displayName}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>:</span>
          </span>
          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word', fontStyle: m.fallback ? 'italic' : 'normal' }}>
            {m.content}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChatMessage({ message }) {
  const { chatroomId, deleteMessageById, addToast, canModerate, subscriberBadges, toggleFeatured, featuredMessages } = useChatStore();
  const isFeatured = featuredMessages.some((m) => m.id === message.id);
  const userXpDataRaw = useChatStore((s) => s.userXp && s.userXp[message?.username]);
  const userXpData = userXpDataRaw || { xp: 0, level: 1 };
  
  const [timeoutModal, setTimeoutModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // 'ban' | 'delete'

  // Context menüyü dışarı tıklayınca kapatma
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const renderContent = (content) => {
    if (!content) return null;
    const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emoteRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{renderTextWithLinks(content.substring(lastIndex, match.index), lastIndex)}</span>);
      }
      parts.push(
        <img
          key={match.index}
          src={`https://files.kick.com/emotes/${match[1]}/fullsize`}
          alt={match[2]}
          title={match[2]}
          style={{ height: '24px', verticalAlign: 'middle', display: 'inline-block', margin: '0 2px' }}
        />
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={lastIndex}>{renderTextWithLinks(content.substring(lastIndex), lastIndex)}</span>);
    }

    return parts;
  };

  const formatTime = (ts) => {
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Ban ────────────────────────────────────────────────────────────
  const handleBan = useCallback(async () => {
    if (!chatroomId || actionLoading) return;
    if (!window.confirm(`${message.username} kullanıcısını kalıcı olarak banlıyorsunuz. Emin misiniz?`)) return;

    setActionLoading('ban');
    try {
      await invoke('ban_user', {
        chatroomId,
        username: message.username,
        permanent: true,
      });
      addToast(`${message.username} banlandı`, 'warning');
    } catch (err) {
      addToast('Ban işlemi başarısız: ' + String(err), 'error');
    } finally {
      setActionLoading(null);
    }
  }, [chatroomId, message.username, actionLoading]);

  // ── Timeout ────────────────────────────────────────────────────────
  const handleTimeout = useCallback((durationSeconds) => {
    if (!chatroomId) return;
    invoke('timeout_user', {
      chatroomId,
      username: message.username,
      duration: durationSeconds,
    })
      .then(() => addToast(`${message.username} ${formatDuration(durationSeconds)} timeout aldı`, 'warning'))
      .catch((err) => addToast('Timeout başarısız: ' + String(err), 'error'));
    setTimeoutModal(false);
  }, [chatroomId, message.username]);

  // ── Delete ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!chatroomId || actionLoading) return;
    setActionLoading('delete');
    try {
      await invoke('delete_message', {
        chatroomId,
        messageId: message.id,
      });
      deleteMessageById(message.id);
      addToast('Mesaj silindi', 'success');
    } catch (err) {
      addToast('Silme başarısız: ' + String(err), 'error');
    } finally {
      setActionLoading(null);
    }
  }, [chatroomId, message.id, actionLoading]);

  // ── Tarayıcıda Ara (Sağ Tık) ─────────────────────────────────────────
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!message.content || message.deleted) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [message.content, message.deleted]);

  return (
    <>
      <div
        className={`chat-message new-message ${message.deleted ? 'deleted' : ''} ${isFeatured ? 'is-featured' : ''}`}
        data-message-id={message.id}
        data-username={message.username}
        onContextMenu={handleContextMenu}
        title="Tarayıcıda aramak için sağ tıklayın"
      >
        {/* Timestamp */}
        <span className="msg-timestamp">{formatTime(message.timestamp)}</span>

        {/* Content */}
        <div className="msg-content">
          {/* Reply Block */}
          {(message.type === 'reply' || message.metadata?.original_sender) && message.metadata?.original_message && (
            <>
              <div 
                style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '6px', borderLeft: '2px solid var(--border-dim)', opacity: 0.9, cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => setShowContext(!showContext)}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderLeftColor = 'var(--kick-green)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.borderLeftColor = 'var(--border-dim)'; }}
                title="Aralarındaki geçmişi gör"
              >
                <span style={{ fontWeight: 600 }}>@{message.metadata.original_sender.username}</span>: <span style={{ fontStyle: 'italic' }}>{message.metadata.original_message.content}</span>
              </div>
              {showContext && (
                <ReplyContextView currentMessage={message} />
              )}
            </>
          )}

          <span className="msg-header" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px', verticalAlign: 'middle' }}>
            {/* Badges */}
            {message.badges?.length > 0 && (
              <span className="msg-badges">
                {message.badges.map((b, i) => (
                  <BadgeIcon key={i} badge={b} subscriberBadges={subscriberBadges} />
                ))}
              </span>
            )}
            
            {/* Level Badge (Gamification) */}
            {useChatStore.getState().settings.games_active && message.username && (
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--border)', 
                  color: 'var(--kick-green)', 
                  fontSize: '9px', 
                  fontWeight: 'bold',
                  padding: '0 4px', 
                  borderRadius: '4px',
                  height: '14px',
                  marginLeft: '2px',
                  border: '1px solid var(--border-dim)'
                }}
                title={`Level ${userXpData.level} (${userXpData.xp} XP)`}
              >
                Lvl.{userXpData.level}
              </span>
            )}

            {/* Username */}
            <span
              className="msg-username"
              style={{ color: message.color }}
              onClick={() => setInfoModal(true)}
            >
              {message.displayName}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>:</span>
          </span>

          {/* Message text */}
          <span className="msg-text">
            {message.deleted ? (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                [Mesaj silindi]
              </span>
            ) : (
              renderContent(message.content)
            )}
          </span>
        </div>

        {/* Action Buttons */}
        {!message.deleted && (
          <div className="msg-actions">
            {/* Öne çıkar (herkes) — şeride ekle/çıkar */}
            <button
              className={`mod-action-btn feature ${isFeatured ? 'active' : ''}`}
              onClick={() => toggleFeatured(message)}
              title={isFeatured ? 'Şeritten çıkar' : 'Öne çıkar (şeride ekle)'}
            >
              <StarIcon filled={isFeatured} />
              <span className="tooltip">{isFeatured ? 'Çıkar' : 'Öne çıkar'}</span>
            </button>

            {/* Aşağıdaki moderasyon butonları yalnızca yetkili kullanıcıda */}
            {canModerate && <>
            {/* Info */}
            <button
              id={`info-btn-${message.id}`}
              className="mod-action-btn info"
              onClick={() => setInfoModal(true)}
              title="Kullanıcı Bilgisi"
            >
              <InfoIcon />
              <span className="tooltip">Profil</span>
            </button>

            {/* Timeout */}
            <button
              id={`timeout-btn-${message.id}`}
              className="mod-action-btn timeout"
              onClick={() => setTimeoutModal(true)}
              title="Timeout"
            >
              <TimeoutIcon />
              <span className="tooltip">Timeout</span>
            </button>

            {/* Delete */}
            <button
              id={`delete-btn-${message.id}`}
              className="mod-action-btn delete"
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              title="Mesajı Sil"
            >
              {actionLoading === 'delete' ? (
                <span className="spinner" style={{ width: 10, height: 10 }} />
              ) : (
                <DeleteIcon />
              )}
              <span className="tooltip">Sil</span>
            </button>

            {/* Ban */}
            <button
              id={`ban-btn-${message.id}`}
              className="mod-action-btn ban"
              onClick={handleBan}
              disabled={actionLoading === 'ban'}
              title="Banla"
            >
              {actionLoading === 'ban' ? (
                <span className="spinner" style={{ width: 10, height: 10 }} />
              ) : (
                <BanIcon />
              )}
              <span className="tooltip">Ban</span>
            </button>
            </>}
          </div>
        )}
      </div>

      {/* Modals */}
      {timeoutModal && (
        <TimeoutModal
          username={message.username}
          onConfirm={handleTimeout}
          onClose={() => setTimeoutModal(false)}
        />
      )}

      {infoModal && (
        <UserInfoModal
          username={message.username}
          color={message.color}
          onClose={() => setInfoModal(false)}
          onBan={handleBan}
          onTimeout={() => { setInfoModal(false); setTimeoutModal(true); }}
        />
      )}

      {/* Özel Sağ Tık Menüsü */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '4px 0',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          minWidth: '160px'
        }}>
          <button 
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              const query = encodeURIComponent(message.content);
              openExternal(`https://www.google.com/search?q=${query}`);
              setContextMenu(null);
            }}
          >
            <span style={{ fontSize: '14px' }}>🔍</span> Tarayıcıda Ara
          </button>
        </div>
      )}
    </>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} saniye`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} dakika ${s} saniye` : `${m} dakika`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m ? `${h} saat ${m} dakika` : `${h} saat`;
}
