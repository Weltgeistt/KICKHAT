import React, { useState } from 'react';

const TIMEOUT_OPTIONS = [
  { label: '1 Dakika', seconds: 60 },
  { label: '5 Dakika', seconds: 300 },
  { label: '10 Dakika', seconds: 600 },
  { label: '30 Dakika', seconds: 1800 },
  { label: '1 Saat', seconds: 3600 },
  { label: '1 Gün', seconds: 86400 },
];

export default function TimeoutModal({ username, onConfirm, onClose }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');

  const handleConfirm = () => {
    let seconds;
    if (selected !== null) {
      seconds = selected;
    } else {
      const parsed = parseInt(custom, 10);
      seconds = (parsed > 0 ? parsed * 60 : 60);
    }
    onConfirm(seconds);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-icon" style={{ background: 'var(--mod-timeout-dim)', border: '1px solid var(--mod-timeout)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mod-timeout)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div className="modal-title">Timeout</div>
            <div className="modal-subtitle">{username} için süre seçin</div>
          </div>
        </div>

        <div className="timeout-options">
          {TIMEOUT_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              id={`timeout-opt-${opt.seconds}`}
              className={`timeout-option ${selected === opt.seconds ? 'selected' : ''}`}
              onClick={() => { setSelected(opt.seconds); setCustom(''); }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '12px' }}>
          <label className="form-label">Özel Süre (dakika)</label>
          <input
            id="timeout-custom-input"
            className="form-input"
            type="number"
            min="1"
            placeholder="Dakika girin..."
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button
            id="timeout-confirm-btn"
            className="btn"
            style={{ background: 'var(--mod-timeout-dim)', color: 'var(--mod-timeout)', border: '1px solid rgba(255,165,2,0.3)' }}
            onClick={handleConfirm}
            disabled={!selected && !custom}
          >
            Timeout Ver
          </button>
        </div>
      </div>
    </div>
  );
}
