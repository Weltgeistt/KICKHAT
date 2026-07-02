import React, { useRef, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';
import ChatMessage from './ChatMessage';
import PinnedMessageBar from './PinnedMessageBar';

const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const ScrollDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function ChatPanel() {
  const {
    messages,
    filterText,
    setFilterText,
    clearMessages,
    setIsPaused,
    chatroomId,
    channelSlug,
    addToast,
    subscribersMode,
    canModerate,
    isSubscriber,
  } = useChatStore();
  const { t } = useTranslation();

  // Abone modunda yalnızca abone / mod / yayıncı yazabilir
  const blockedBySubMode = subscribersMode && !canModerate && !isSubscriber;
  const canChat = !!chatroomId && !blockedBySubMode;

  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const atBottomRef = useRef(true); // anlık kaynak (effect kapanışında bayatlamaması için)
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Filtered messages
  const filtered = filterText
    ? messages.filter(
        (m) =>
          m.content?.toLowerCase().includes(filterText.toLowerCase()) ||
          m.username?.toLowerCase().includes(filterText.toLowerCase())
      )
    : messages;

  const jumpToBottom = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight; // anında, smooth değil → hızlı ve kesintisiz
    atBottomRef.current = true;
    setAtBottom(true);
    setNewCount(0);
    setIsPaused(false);
  }, [setIsPaused]);

  // Kaydırma durumunu izle
  const handleScroll = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    setIsPaused(!bottom);
    if (bottom) setNewCount(0);
  }, [setIsPaused]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Yeni mesaj geldiğinde: dipteysek anında dibe sabitle, değilsek sayacı artır.
  // Dep olarak `messages` (referans) kullanılıyor; `messages.length` 300 limitinde
  // sabit kaldığı için effect tetiklenmiyordu (otomatik takip duruyordu).
  useEffect(() => {
    if (atBottomRef.current) {
      const el = panelRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      setNewCount(0);
    } else {
      setNewCount((n) => n + 1);
    }
  }, [messages]);

  // İçerik yüksekliği değiştiğinde (yeni mesaj, geç yüklenen rozet/emote görselleri,
  // eski mesaj silinmesi) dipteysek dibe sabit kal.
  useEffect(() => {
    const content = contentRef.current;
    const el = panelRef.current;
    if (!content || !el) return;
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const scrollToBottom = jumpToBottom;

  function friendlySendError(raw) {
    const r = raw.toLowerCase();
    if (r.includes('not authenticated') || r.includes('unauthenticated'))
      return 'Bağlantı hatası: Lütfen geçerli bir Kick Token (Authorization Bearer) girdiğinizden emin olun.';
    if (r.includes('subscriber') || r.includes('abone mod'))
      return 'Bu kanal abone modunda — yazmak için abone olmalısın';
    if (r.includes('slow mode') || r.includes('slow_mode'))
      return 'Yavaş mod aktif — biraz bekleyip tekrar dene';
    if (r.includes('banned') || r.includes('banlı'))
      return 'Bu kanalda yazmaktan engellendiniz';
    if (r.includes('timeout'))
      return 'Timeout cezası devam ediyor — süre dolunca tekrar deneyebilirsin';
    if (r.includes('follower') || r.includes('takipçi'))
      return 'Bu kanal yalnızca takipçilere açık';
    if (r.includes('rate limit') || r.includes('429'))
      return 'Çok hızlı mesaj gönderiyorsun — biraz bekle';
    if (r.includes('401'))
      return 'Oturum süresi dolmuş veya token hatalı — token\'ı yenile';
    
    // Fallback: raw hatayı göster ki gerçek Kick API hatasını (örn. 403) görebilelim.
    return `Hata: ${raw}`;
  }

  const SLASH_COMMANDS = [
    { cmd: '/me',         args: '<mesaj>',              desc: 'Eylem mesajı gönder (üçüncü şahıs)' },
    { cmd: '/w',          args: '<kullanıcı> <mesaj>',  desc: 'Kullanıcıya özel mesaj gönder' },
    { cmd: '/clear',      args: '',                     desc: 'Ekrandaki sohbeti temizle' },
  ];

  const [showCommands, setShowCommands] = useState(false);
  const [filteredCmds, setFilteredCmds] = useState([]);
  const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);

  // Input değiştiğinde slash komutlarını filtrele
  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);
    if (val.startsWith('/') && !val.includes(' ')) {
      const q = val.toLowerCase();
      const matches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(q));
      setFilteredCmds(matches);
      setShowCommands(matches.length > 0);
      setSelectedCmdIdx(0);
    } else {
      setShowCommands(false);
    }
  };

  // Klavye navigasyonu
  const handleInputKeyDown = (e) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCmdIdx(i => Math.min(i + 1, filteredCmds.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedCmdIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredCmds[selectedCmdIdx]) {
          e.preventDefault();
          const chosen = filteredCmds[selectedCmdIdx];
          setChatInput(chosen.cmd + (chosen.args ? ' ' : ''));
          setShowCommands(false);
        }
      }
      if (e.key === 'Escape') setShowCommands(false);
    }
  };

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (showCommands && filteredCmds[selectedCmdIdx]) {
      const chosen = filteredCmds[selectedCmdIdx];
      setChatInput(chosen.cmd + (chosen.args ? ' ' : ''));
      setShowCommands(false);
      return;
    }
    if (blockedBySubMode) {
      addToast('Abone modu aktif — yazmak için bu kanala abone olmalısın', 'error');
      return;
    }
    const text = chatInput.trim();
    if (!text || !chatroomId || sending) return;

    // ── Özel yerel komutlar ──
    if (text.toLowerCase() === '/clear') {
      clearMessages();
      setChatInput('');
      return;
    }

    // ── Tüm mesajları ve Kick'in desteklediği komutları (/me vs) düz mesaj olarak gönderiyoruz ──
    setSending(true);
    try {
      await invoke('send_chat_message', { chatroomId, content: text });
      setChatInput('');
    } catch (err) {
      addToast(friendlySendError(String(err)), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
      {/* Sabitlenmiş mesaj — kayan şerit */}
      <PinnedMessageBar />

      {/* Filter Bar */}
      {showFilter && (
        <div className="filter-bar">
          <FilterIcon />
          <input
            id="chat-filter-input"
            className="filter-input"
            placeholder="Kullanıcı adı veya mesaj filtrele..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            autoFocus
          />
          {filterText && (
            <span className="msg-count">{filtered.length} sonuç</span>
          )}
          <button
            className="btn-icon"
            style={{ padding: '4px' }}
            onClick={() => { setFilterText(''); setShowFilter(false); }}
            title="Filtreyi kapat"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Chat Messages + yeni mesaj göstergesi (footer'ı kapatmaması için ayrı katman) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        id="chat-messages-panel"
        className="chat-panel"
        ref={panelRef}
        onScroll={handleScroll}
      >
        <div ref={contentRef}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div className="empty-state-title">
              {filterText ? (t('chat.no_match') || 'Eşleşen mesaj bulunamadı') : (t('chat.empty_title') || 'Chat mesajları burada görünecek')}
            </div>
            <div className="empty-state-desc">
              {filterText ? (t('chat.try_different') || 'Farklı bir arama deneyin.') : (t('chat.empty_desc') || 'Yayın aktifse mesajlar otomatik gelecek.')}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {filtered.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Yeni mesaj / en alta in göstergesi */}
      {!atBottom && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          <ScrollDownIcon />
          {newCount > 0 ? `${newCount} yeni mesaj` : 'En alta in'}
        </button>
      )}
      </div>

      {/* Bottom Toolbar + Chat Input */}
      <div className="chat-footer">
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          <span className="msg-count">{t('chat.msg_count', { count: messages.length }) || `${messages.length} mesaj`}</span>
          <div style={{ flex: 1 }} />
          <button
            id="filter-toggle-btn"
            className={`btn-icon ${showFilter ? 'active' : ''}`}
            onClick={() => setShowFilter((v) => !v)}
            title="Filtrele"
            style={showFilter ? { borderColor: 'var(--kick-green)', color: 'var(--kick-green)' } : {}}
          >
            <FilterIcon />
          </button>
          <button
            id="clear-chat-btn"
            className="btn-icon"
            onClick={() => {
              if (window.confirm('Chat geçmişini temizle?')) clearMessages();
            }}
            title="Geçmişi Temizle"
          >
            <ClearIcon />
          </button>
        </div>

        {/* Input */}
        <div style={{ position: 'relative' }}>
          {/* Slash Command Popup */}
          {showCommands && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderBottom: 'none', zIndex: 100, maxHeight: '220px', overflowY: 'auto'
            }}>
              <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                ⌨️ ↑↓ ile seç · Tab/Enter ile uygula · Esc ile kapat
              </div>
              {filteredCmds.map((c, i) => (
                <div
                  key={c.cmd}
                  onClick={() => { setChatInput(c.cmd + (c.args ? ' ' : '')); setShowCommands(false); }}
                  style={{
                    padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    background: i === selectedCmdIdx ? 'var(--bg-hover)' : 'transparent',
                    borderLeft: i === selectedCmdIdx ? '2px solid var(--kick-green)' : '2px solid transparent',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={() => setSelectedCmdIdx(i)}
                >
                  <span style={{ color: 'var(--kick-green)', fontWeight: 700, fontSize: '12px', minWidth: '110px', fontFamily: 'monospace' }}>{c.cmd}</span>
                  {c.args && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>{c.args}</span>}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: 'auto' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          )}
          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              id="chat-send-input"
              className={`chat-input ${subscribersMode ? 'sub-mode' : ''} ${blockedBySubMode ? 'blocked' : ''}`}
              type="text"
              placeholder={t('chat.placeholder') || "Mesaj gönder... (/ ile komut)"}
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              disabled={!canChat}
              maxLength={500}
            />
            <button
              id="chat-send-btn"
              className="send-btn"
              type="submit"
              disabled={!chatInput.trim() || !canChat || sending}
            >
              {sending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : (t('chat.send') || 'Gönder')}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
