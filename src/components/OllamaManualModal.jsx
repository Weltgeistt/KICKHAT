import React from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';

export default function OllamaManualModal({ onClose }) {
  return (
    <div className="settings-popover" role="dialog" style={{ zIndex: 9999, top: '20%', left: '50%', transform: 'translate(-50%, 0)', width: '380px', height: 'auto', maxHeight: 'none' }}>
      <div className="settings-pop-header">
        <span className="terminal-ps1">kickhat:~$</span>
        <span className="settings-pop-title">install --ollama --manual</span>
      </div>
      
      <div className="settings-pop-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p className="dim" style={{ fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
          Yapay zeka asistanı yerel (offline) modda tamamen ücretsiz ve reklamsız çalışabilmek için Ollama isimli açık kaynaklı yapay zeka aracına ihtiyaç duyar.
        </p>

        <ol style={{ fontSize: '11px', color: 'var(--text-main)', paddingLeft: '16px', margin: '4px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Aşağıdaki butona tıklayarak Ollama'nın kurulum dosyasını indirin ve kurun.</li>
          <li>Kurulum bittikten sonra bilgisayarınızda bir komut satırı (CMD / Terminal / PowerShell) açın.</li>
          <li>Aşağıdaki komutu girerek gerekli (llama3) dil modelini indirin:</li>
        </ol>

        <div style={{ background: 'var(--bg-main)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <code style={{ color: 'var(--kick-green)', fontSize: '12px' }}>ollama run llama3</code>
          <button 
            className="terminal-btn ghost" 
            type="button" 
            onClick={() => {
              navigator.clipboard.writeText('ollama run llama3');
              const btn = document.getElementById('copy-ollama-btn');
              if (btn) btn.innerText = 'Kopyalandı!';
              setTimeout(() => { if(btn) btn.innerText = 'Kopyala'; }, 2000);
            }}
            id="copy-ollama-btn"
            style={{ fontSize: '10px', padding: '2px 4px' }}
          >
            Kopyala
          </button>
        </div>
        
        <p className="dim" style={{ fontSize: '11px', margin: 0, marginTop: '4px' }}>
          Model indikten sonra uygulamadaki yapay zeka özelliklerini hemen kullanmaya başlayabilirsiniz.
        </p>

        <div className="settings-divider" />
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button className="terminal-btn ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            Kapat
          </button>
          <button 
            className="terminal-btn primary" 
            type="button" 
            onClick={() => openUrl('https://ollama.com/download')} 
            style={{ flex: 2 }}
          >
            İndirme Sayfasına Git ↗
          </button>
        </div>
      </div>
    </div>
  );
}
