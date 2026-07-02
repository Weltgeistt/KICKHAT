import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';

export default function ResearchModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { customResearchChats, startCustomResearch, sendCustomResearchMessage } = useChatStore();
  const [topicInput, setTopicInput] = useState('');
  const [currentQuery, setCurrentQuery] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentQuery(null);
      setTopicInput('');
    }
  }, [isOpen]);

  const currentChat = currentQuery ? customResearchChats[currentQuery] : null;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.chatHistory]);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    const query = topicInput.trim();
    setCurrentQuery(query);
    if (!customResearchChats[query]) {
      startCustomResearch(query);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || currentChat?.isGenerating) return;
    sendCustomResearchMessage(currentQuery, chatInput);
    setChatInput('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-modal)',
        border: '1px solid var(--kick-green)',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 50px rgba(0,0,0,0.8)',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '20px', cursor: 'pointer', padding: '4px'
        }}>✕</button>

        {!currentQuery ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
            <div style={{ color: 'var(--kick-green)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('research.title') || "Ne Araştırmak İstiyorsunuz?"}</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px', fontSize: '13px' }}>
              {t('research.desc') || "İnternette taze haberleri tarar ve doğrudan size özel bir yayın taktiği sunar."}
            </p>
            <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder={t('research.placeholder') || "Örn: GTA 6 ne zaman çıkacak?"}
                autoFocus
                style={{
                  flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--kick-green)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '16px'
                }}
              />
              <button type="submit" style={{
                background: 'var(--kick-green)', color: '#000', border: 'none',
                padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'
              }}>{t('research.btn') || "Araştır"}</button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setCurrentQuery(null)} style={{
                background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                {t('research.back') || "Geri"}
              </button>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <h3 style={{ color: 'var(--kick-green)', margin: '0 0 4px 0', fontSize: '16px' }}>{currentQuery}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t('research.subtitle') || "İnternet bağlantılı serbest araştırma asistanı."}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentChat?.isGenerating && (!currentChat.chatHistory || currentChat.chatHistory.length === 0) ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--kick-green)' }}>
                  <div style={{ width: '30px', height: '30px', border: '2px solid rgba(83, 252, 24, 0.2)', borderTopColor: 'var(--kick-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                  <div style={{ fontSize: '13px' }}>{t('research.generating') || "İnternet taranıyor ve strateji üretiliyor..."}</div>
                </div>
              ) : (
                currentChat?.chatHistory?.map((msg, i) => (
                  <div key={i} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'var(--kick-green)' : 'var(--bg-hover)',
                    color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    maxWidth: '85%',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.role === 'assistant' && i === 0 && <div style={{ fontSize: '11px', color: 'var(--kick-green)', marginBottom: '6px', fontWeight: 'bold' }}>{t('research.result_title') || "⚡ ARAŞTIRMA SONUCU"}</div>}
                    {msg.content}
                  </div>
                ))
              )}
              {currentChat?.isGenerating && currentChat?.chatHistory?.length > 0 && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '12px', padding: '10px' }}>{t('research.searching') || "Araştırılıyor..."}</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                placeholder={t('research.ask_placeholder') || "Bu konu hakkında daha derin bir soru sor..."}
                disabled={currentChat?.isGenerating}
                style={{
                  flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', 
                  color: 'var(--text-primary)', padding: '12px', borderRadius: '6px', fontSize: '13px'
                }}
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || currentChat?.isGenerating}
                style={{
                  background: 'var(--kick-green)', color: '#000', border: 'none', 
                  padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                {t('research.ask_btn') || "Sor"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
