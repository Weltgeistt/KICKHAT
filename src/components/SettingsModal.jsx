import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import OllamaManualModal from './OllamaManualModal';
import { useTranslation } from 'react-i18next';

// ── Tema paleti ────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'terminal',      name: 'Terminal', bg: '#000000', accent: '#53fc18' },
  { id: 'gece',          name: 'Gece',     bg: '#0d1320', accent: '#6ea1ff' },
  { id: 'komur',         name: 'Kömür',    bg: '#161514', accent: '#ffb454' },
  { id: 'pastel-mor',    name: 'Mor',      bg: '#f3eefb', accent: '#9b7bd4' },
  { id: 'pastel-pembe',  name: 'Pembe',    bg: '#fbeef3', accent: '#e07ba6' },
  { id: 'pastel-nane',   name: 'Nane',     bg: '#e9f7f0', accent: '#4cb98c' },
  { id: 'pastel-mavi',   name: 'Mavi',     bg: '#eaf2fb', accent: '#5b9bd5' },
  { id: 'pastel-seftali',name: 'Şeftali',  bg: '#fdf0e9', accent: '#e88c5a' },
];

// ── Tema seçici ───────────────────────────────────────────────────────────
function ThemePicker({ value, onChange }) {
  return (
    <div className="theme-grid">
      {THEMES.map((t) => {
        const isLight = t.bg !== '#000000' && parseInt(t.bg.slice(1, 3), 16) > 80;
        return (
          <button
            key={t.id}
            type="button"
            className={`theme-swatch ${value === t.id ? 'active' : ''}`}
            style={{ background: t.bg }}
            title={t.name}
            onClick={() => onChange(t.id)}
          >
            <span className="theme-swatch-accent" style={{ background: t.accent }} />
            {value === t.id && <span className="theme-swatch-check">●</span>}
            <span className="theme-swatch-name" style={{ color: isLight ? '#333' : '#ddd' }}>{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Dil seçici ───────────────────────────────────────────────────────────
function LanguagePicker({ value, onChange }) {
  const langs = [
    { id: 'tr', label: 'TR', name: 'Türkçe' },
    { id: 'en', label: 'EN', name: 'English' },
    { id: 'it', label: 'IT', name: 'Italiano' },
    { id: 'es', label: 'ES', name: 'Español' },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {langs.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`terminal-btn ${value?.startsWith(l.id) ? 'primary' : 'ghost'}`}
          style={{ flex: 1, padding: '6px 0', fontSize: '12px' }}
          onClick={() => {
            onChange(l.id);
            try { localStorage.setItem('kickhat:lang', l.id); } catch(e){}
          }}
          title={l.name}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// ── Tek bir kaydırıcı satırı ──────────────────────────────────────────────
function SettingSlider({ label, value, min, max, step, unit, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  return (
    <div className="setting-row">
      <div className="setting-label">
        <span>{label}</span>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={tempValue}
              autoFocus
              onBlur={() => {
                setIsEditing(false);
                let val = parseFloat(tempValue);
                if (isNaN(val)) val = min;
                val = Math.max(min, Math.min(max, val));
                onChange(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
              }}
              onChange={(e) => setTempValue(e.target.value)}
              style={{
                width: '50px',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--kick-green)',
                borderRadius: '4px',
                textAlign: 'right',
                padding: '2px 4px',
                outline: 'none',
                fontFamily: 'monospace',
                fontSize: '11px'
              }}
            />
            {unit && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{unit}</span>}
          </div>
        ) : (
          <span 
            className="setting-value" 
            onClick={() => { setIsEditing(true); setTempValue(value); }} 
            style={{ cursor: 'text', borderBottom: '1px dashed var(--text-muted)', paddingBottom: '1px' }}
            title="Değiştirmek için tıkla"
          >
            {value}{unit}
          </span>
        )}
      </div>
      <input
        type="range"
        className="setting-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// ── Aç/kapa anahtarı ──────────────────────────────────────────────────────
function SettingToggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      className={`setting-toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="setting-toggle-text"><span>{label}</span></span>
      <span className="setting-switch"><span className="setting-knob" /></span>
    </button>
  );
}

export default function SettingsModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const { settings, setSetting, resetSettings, addToast, isDownloadingOllama, ollamaDownloadProgress, ollamaDownloadText, startOllamaDownload } = useChatStore();
  const [showOllamaManual, setShowOllamaManual] = useState(false);

  const handleReset = () => {
    resetSettings();
    addToast('Ayarlar sıfırlandı', 'success');
  };

  return (
    <>
      {/* Şeffaf tıklama yakalayıcı — chat görünür kalsın */}
      <div className="settings-backdrop" onClick={onClose} />

      <div className="settings-popover" role="dialog">
        <div className="settings-pop-header">
          <span className="terminal-ps1">kickhat:~$</span>
          <span className="settings-pop-title">config --görünüm</span>
        </div>

        <div className="settings-pop-body">
          <div className="setting-label" style={{ marginBottom: 4 }}><span>{t('settings.language')}</span></div>
          <LanguagePicker 
            value={i18n.language} 
            onChange={(id) => i18n.changeLanguage(id)} 
          />

          <div className="setting-label" style={{ marginBottom: 2 }}><span>{t('settings.theme')}</span></div>
          <ThemePicker value={settings.theme} onChange={(id) => setSetting('theme', id)} />

          <div className="settings-divider" />

          <SettingSlider
            label={t('settings.font_size') || "Yazı boyutu"}
            value={settings.fontSize}
            min={10} max={20} step={1} unit="px"
            onChange={(v) => setSetting('fontSize', v)}
          />
          <SettingSlider
            label={t('settings.line_height') || "Satır aralığı"}
            value={settings.lineHeight}
            min={1} max={2.2} step={0.1} unit=""
            onChange={(v) => setSetting('lineHeight', Math.round(v * 10) / 10)}
          />
          <SettingSlider
            label={t('settings.msg_gap') || "Mesaj arası boşluk"}
            value={settings.messageGap}
            min={0} max={14} step={1} unit="px"
            onChange={(v) => setSetting('messageGap', v)}
          />

          <div className="settings-divider" />

          <SettingToggle
            label={t('settings.timestamp') || "Saat damgası"}
            checked={settings.timestamps}
            onChange={(v) => setSetting('timestamps', v)}
          />
          <SettingToggle
            label={t('settings.compact_mode') || "Sıkışık mod"}
            checked={settings.compact}
            onChange={(v) => setSetting('compact', v)}
          />

          <div className="settings-divider" />

          <SettingSlider
            label={t('settings.ai_interval') || "AI Analiz Sıklığı"}
            value={settings.aiAnalysisInterval}
            min={1} max={300} step={1} unit=" dk"
            onChange={(v) => setSetting('aiAnalysisInterval', v)}
          />

          <div className="settings-divider" />
          <div className="setting-label" style={{ marginBottom: 4, color: 'var(--kick-green)' }}><span>{t('settings.updates') || "Güncellemeler"}</span></div>
          <SettingToggle
            label={t('settings.games_active') || "Chat Oyunları (XP Sistemi)"}
            checked={settings.games_active}
            onChange={(v) => setSetting('games_active', v)}
          />
          <SettingToggle
            label={t('settings.auto_update') || "Otomatik Güncellemeleri Denetle"}
            checked={settings.autoUpdateEnabled}
            onChange={(v) => setSetting('autoUpdateEnabled', v)}
          />
          <div style={{ marginTop: '8px', paddingBottom: '8px' }}>
            <button 
              className="terminal-btn primary" 
              type="button"
              onClick={() => useChatStore.getState().checkUpdate(true)}
              style={{ width: '100%' }}
            >
              {t('settings.check_update') || "Güncellemeleri Denetle"}
            </button>
          </div>

          <div className="settings-divider" />
          <div className="setting-label" style={{ marginBottom: 4, color: 'var(--kick-green)' }}><span>{t('settings.ai_settings') || "Yapay Zeka (AI) Ayarları"}</span></div>
          
          <SettingToggle
            label={t('settings.ai_enable') || "Yapay Zeka Özelliklerini Aktif Et"}
            checked={settings.aiFeaturesEnabled}
            onChange={(v) => setSetting('aiFeaturesEnabled', v)}
          />

          {settings.aiFeaturesEnabled && (
            <div style={{ marginTop: 8, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="setting-row" style={{ marginBottom: '8px' }}>
                <span className="dim">{t('settings.provider') || "Sağlayıcı:"}</span>
                <select 
                  className="terminal-input" 
                  style={{ width: '120px', padding: '2px 4px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-main)', outline: 'none' }}
                  value={settings.aiApiProvider}
                  onChange={(e) => setSetting('aiApiProvider', e.target.value)}
                >
                  <option value="local" style={{ background: 'var(--bg-main)' }}>{t('settings.local') || "Yerel (Ollama)"}</option>
                  <option value="custom" style={{ background: 'var(--bg-main)' }}>{t('settings.custom_api') || "Özel API (Custom)"}</option>
                </select>
              </div>

              {settings.aiApiProvider === 'local' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="dim" style={{ fontSize: '11px', lineHeight: '1.3' }}>{t('settings.ollama_desc') || "Yerel model kullanabilmek için Ollama yüklü olmalı."}</span>
                  
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
                        {t('connect.download_auto') || "Otomatik İndir ve Kur"}
                      </button>
                      <button 
                        className="terminal-btn ghost" 
                        type="button" 
                        onClick={() => setShowOllamaManual(true)}
                        style={{ padding: '2px 8px', fontSize: '11px', flex: 1 }}
                      >
                        {t('connect.download_manual') || "Manuel Kurulum"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="dim" style={{ fontSize: '11px', lineHeight: '1.3', marginBottom: '4px' }}>{t('settings.custom_desc') || "OpenAI, Groq vb. uyumlu API'leri kullanabilirsiniz."}</span>
                  <label className="terminal-prompt" style={{ margin: 0, paddingLeft: 0 }}>
                    <span className="terminal-ps1" style={{ fontSize: '10px', minWidth: '40px' }}>URL:</span>
                    <input 
                      className="terminal-input" 
                      style={{ fontSize: '11px', padding: '2px' }}
                      value={settings.aiCustomEndpoint} 
                      onChange={(e) => setSetting('aiCustomEndpoint', e.target.value)}
                      placeholder="https://api.openai.com/v1/chat/completions"
                    />
                  </label>
                  <label className="terminal-prompt" style={{ margin: 0, paddingLeft: 0 }}>
                    <span className="terminal-ps1" style={{ fontSize: '10px', minWidth: '40px' }}>Key:</span>
                    <input 
                      type="password"
                      className="terminal-input" 
                      style={{ fontSize: '11px', padding: '2px' }}
                      value={settings.aiCustomApiKey} 
                      onChange={(e) => setSetting('aiCustomApiKey', e.target.value)}
                      placeholder="sk-..."
                    />
                  </label>
                  <label className="terminal-prompt" style={{ margin: 0, paddingLeft: 0 }}>
                    <span className="terminal-ps1" style={{ fontSize: '10px', minWidth: '40px' }}>Model:</span>
                    <input 
                      className="terminal-input" 
                      style={{ fontSize: '11px', padding: '2px' }}
                      value={settings.aiCustomModel} 
                      onChange={(e) => setSetting('aiCustomModel', e.target.value)}
                      placeholder="gpt-4o-mini"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="settings-divider" />

          <button className="terminal-btn ghost" type="button" onClick={handleReset} style={{ width: '100%', marginTop: 4 }}>
            {t('settings.reset') || "--reset (varsayılan)"}
          </button>
        </div>
      </div>
      
      {showOllamaManual && <OllamaManualModal onClose={() => setShowOllamaManual(false)} />}
    </>
  );
}
