import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useChatStore } from '../store/chatStore';
import OllamaManualModal from './OllamaManualModal';
import { useTranslation } from 'react-i18next';

export default function ConnectModal({ onConnected }) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showOllamaManual, setShowOllamaManual] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');

  const { setChannelSlug, setChannelInfo, connectPusher, addToast, refreshModStatus, authToken, isDownloadingOllama, ollamaDownloadProgress, ollamaDownloadText, startOllamaDownload } = useChatStore();

  // ── API üzerinden bağlan ──────────────────────────────────────────
  const handleConnect = async (e) => {
    e.preventDefault();
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${cleanSlug}`, {
        headers: {
          'Accept': 'application/json',
          'Referer': `https://kick.com/${cleanSlug}`,
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
        },
      });

      if (res.status === 403) {
        setShowManual(true);
        setManualName(cleanSlug);
        setError('API erişimi engellendi. Chatroom ID\'yi manuel girin.');
        return;
      }
      if (res.status === 404) {
        throw new Error(`"${cleanSlug}" adında kanal bulunamadı.`);
      }
      if (!res.ok) {
        throw new Error(`API hatası (HTTP ${res.status}).`);
      }

      const info = await res.json();
      if (!info || !info.chatroom?.id) {
        throw new Error('Kanal bilgisi alınamadı.');
      }

      setChannelSlug(cleanSlug);
      setChannelInfo(info);
      connectPusher(info.chatroom.id);
      refreshModStatus();
      addToast(`${info.user?.username || cleanSlug} kanalına bağlanılıyor...`, 'success');
      onConnected?.();
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // ── Manuel ID ile bağlan ──────────────────────────────────────────
  const handleManualConnect = (e) => {
    e.preventDefault();
    const id = parseInt(manualId.trim(), 10);
    if (!id || isNaN(id)) {
      setError('Geçerli bir sayısal Chatroom ID girin.');
      return;
    }
    const name = manualName.trim() || `kanal-${id}`;

    setChannelSlug(name);
    setChannelInfo({
      chatroom: { id, slow_mode: false, subscribers_mode: false },
      user: { username: name, id: 0 },
    });
    connectPusher(id);
    addToast(`Chatroom ${id} bağlanılıyor...`, 'success');
    onConnected?.();
  };

  return (
    <div className="connect-screen">
      <div className="terminal-window">
        {/* Başlık çubuğu */}
        <div className="terminal-titlebar">
          <span className="terminal-dots">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </span>
          <span className="terminal-title">{t('connect.cli_title')}</span>
        </div>

        {/* Gövde */}
        <div className="terminal-body">
          {!showManual ? (
            <form onSubmit={handleConnect} style={{ display: 'contents' }}>
              <div className="terminal-line green">KICKHAT v0.1.0</div>
              <div className="terminal-line dim">{t('connect.instruction')}</div>

              {/* Durum satırı */}
              <div className="terminal-line">
                <span className="dim">token: </span>
                {authToken
                  ? <span className="green">{t('connect.token_defined')}</span>
                  : <span className="dim">{t('connect.token_undefined')}</span>}
              </div>

              <div className="terminal-spacer" />

              {/* Prompt girişi */}
              <label className="terminal-prompt">
                <span className="terminal-ps1">kickhat:~$</span>
                <input
                  id="channel-slug-input"
                  className="terminal-input"
                  type="text"
                  placeholder={t('connect.prompt_placeholder')}
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setError(''); }}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>

              {error && <div className="terminal-line error">✗ {error}</div>}

              <button
                id="connect-btn"
                className="terminal-btn primary"
                type="submit"
                disabled={loading || !slug.trim()}
              >
                {loading ? t('connect.connecting') : t('connect.btn_connect')}
              </button>

              <div className="terminal-spacer" />
              <div className="terminal-line dim">{t('connect.other_commands')}</div>
              <div className="terminal-actions">
                <button
                  id="manual-id-toggle"
                  className="terminal-btn ghost"
                  type="button"
                  onClick={() => { setShowManual(true); setError(''); }}
                >
                  --manual-id
                </button>
                <TokenButton />
              </div>

              <div className="terminal-spacer" />
              <div style={{ border: '1px dashed var(--border-dim)', padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="terminal-line" style={{ color: 'var(--kick-green)', fontWeight: 'bold' }}>{t('connect.ai_support')}</div>
                <div className="terminal-line dim" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  {t('connect.ai_desc')}
                </div>
                
                {isDownloadingOllama ? (
                  <div style={{ width: '100%', height: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', position: 'relative' }}>
                    <div style={{ width: `${ollamaDownloadProgress}%`, height: '100%', background: 'var(--kick-green)', transition: 'width 0.2s' }} />
                    <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', fontSize: '10px', color: '#fff', mixBlendMode: 'difference', lineHeight: '16px', fontWeight: 'bold' }}>
                      {ollamaDownloadText || `İndiriliyor: %${ollamaDownloadProgress}`}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                      className="terminal-btn primary" 
                      type="button" 
                      onClick={startOllamaDownload}
                      style={{ padding: '2px 8px', fontSize: '11px', flex: 1 }}
                    >
                      {t('connect.download_auto')}
                    </button>
                    <button 
                      className="terminal-btn ghost" 
                      type="button" 
                      onClick={() => setShowOllamaManual(true)}
                      style={{ padding: '2px 8px', fontSize: '11px', flex: 1 }}
                    >
                      {t('connect.download_manual')}
                    </button>
                  </div>
                )}
              </div>

            </form>
          ) : (
            <form onSubmit={handleManualConnect} style={{ display: 'contents' }}>
              <div className="terminal-line green">kickhat --manual-id</div>
              <div className="terminal-line dim">{t('connect.find_id_desc')}</div>
              <div className="terminal-line dim">
                {`kick.com/${manualName || 'kanal'} → F12 → Network → api/v2/channels → chatroom.id`}
              </div>

              <div className="terminal-spacer" />

              <label className="terminal-prompt">
                <span className="terminal-ps1">name:</span>
                <input
                  id="channel-name-input"
                  className="terminal-input"
                  type="text"
                  placeholder={t('connect.manual_name_placeholder')}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </label>

              <label className="terminal-prompt">
                <span className="terminal-ps1">id:&nbsp;&nbsp;</span>
                <input
                  id="chatroom-id-input"
                  className="terminal-input"
                  type="number"
                  placeholder={t('connect.manual_id_placeholder')}
                  value={manualId}
                  onChange={(e) => { setManualId(e.target.value); setError(''); }}
                  autoFocus
                />
              </label>

              {error && <div className="terminal-line error">✗ {error}</div>}

              <div className="terminal-actions">
                <button
                  className="terminal-btn ghost"
                  type="button"
                  onClick={() => { setShowManual(false); setError(''); }}
                >
                  {t('connect.btn_back')}
                </button>
                <button
                  id="manual-connect-btn"
                  className="terminal-btn primary"
                  type="submit"
                  disabled={!manualId.trim()}
                  style={{ flex: 1 }}
                >
                  {t('connect.btn_connect')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {showOllamaManual && <OllamaManualModal onClose={() => setShowOllamaManual(false)} />}
    </div>
  );
}

// ── Token Komutu ──────────────────────────────────────────────────────

function TokenButton() {
  const { t } = useTranslation();
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('kickhat:saved_token') || '');
  const [saveToken, setSaveToken] = useState(() => !!localStorage.getItem('kickhat:saved_token'));
  const { setAuthToken, addToast, refreshModStatus, authToken } = useChatStore();

  const handleSaveToken = async () => {
    if (!token.trim()) return;
    try {
      await invoke('set_auth_token', { token: token.trim() });
      setAuthToken(token.trim());
      
      if (saveToken) {
        localStorage.setItem('kickhat:saved_token', token.trim());
      } else {
        localStorage.removeItem('kickhat:saved_token');
      }
      
      refreshModStatus();
      addToast('Token kaydedildi ✓', 'success');
      setShowToken(false);
    } catch (err) {
      addToast('Token kaydedilemedi', 'error');
    }
  };

  if (!showToken) {
    return (
      <button
        id="enter-token-btn"
        className="terminal-btn ghost"
        type="button"
        onClick={() => setShowToken(true)}
      >
        {authToken ? t('connect.btn_token_change') : t('connect.btn_token')}
      </button>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="terminal-line dim">
        {t('connect.token_desc')}
      </div>
      <label className="terminal-prompt">
        <span className="terminal-ps1">token:</span>
        <input
          id="token-input"
          className="terminal-input"
          type="password"
          placeholder="eyJhbGciOi..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)' }}>
        <input 
          type="checkbox" 
          checked={saveToken} 
          onChange={(e) => setSaveToken(e.target.checked)} 
          style={{ accentColor: 'var(--kick-green)' }}
        />
        {t('connect.remember_me')}
      </label>
      <div className="terminal-actions">
        <button
          className="terminal-btn ghost"
          type="button"
          onClick={() => setShowToken(false)}
        >
          {t('connect.btn_cancel')}
        </button>
        <button
          id="save-token-btn"
          className="terminal-btn primary"
          type="button"
          onClick={handleSaveToken}
          disabled={!token.trim()}
          style={{ flex: 1 }}
        >
          {t('connect.btn_save')}
        </button>
      </div>
    </div>
  );
}
