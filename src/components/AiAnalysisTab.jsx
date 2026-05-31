import React from 'react';
import { useChatStore } from '../store/chatStore';

// Kutu başlıkları için ikonlar
const Icons = {
  Question: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Topic: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Warning: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Trending: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
};

function DashboardCard({ title, icon, children, color = 'var(--text-primary)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color, fontWeight: 'bold', fontSize: '13px' }}>
        {icon}
        {title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {children}
      </div>
    </div>
  );
}

function AnalysisModal({ isOpen, onClose, content, isGenerating }) {
  if (!isOpen && !isGenerating) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={!isGenerating ? onClose : undefined}>
      <div style={{
        backgroundColor: 'var(--bg-modal)',
        border: '1px solid var(--kick-green)',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '650px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 10px 50px rgba(0,0,0,0.8)',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        {isGenerating ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(83, 252, 24, 0.2)', borderTopColor: 'var(--kick-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h3 style={{ color: 'var(--kick-green)', marginBottom: '8px' }}>Yapay Zeka Analiz Ediyor...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Türkiye gündemi taranıp size özel strateji yazılıyor. (Bu işlem 10-20 saniye sürebilir)</p>
          </div>
        ) : (
          <>
            <button onClick={onClose} style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '20px', cursor: 'pointer', padding: '4px'
            }}>✕</button>
            <h3 style={{ color: 'var(--kick-green)', marginTop: 0, marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              Detaylı Yapay Zeka Analizi
            </h3>
            <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {content}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.toString() };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'red', padding: '20px', zIndex: 99999, color: 'white' }}>
          <h2>Modal Çöktü!</h2>
          <p>{this.state.errorMsg}</p>
          <button onClick={() => this.setState({ hasError: false })}>Kapat</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function InteractiveAnalysisModal({ isOpen, onClose, analysis }) {
  const { topicChats, generateTopicStrategy, sendTopicChatMessage } = useChatStore();
  const [selectedTopic, setSelectedTopic] = React.useState(null);
  const [chatInput, setChatInput] = React.useState('');
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedTopic(null);
    }
  }, [isOpen]);

  const topics = React.useMemo(() => {
    if (!analysis || !analysis.newsData) return [];
    return analysis.newsData.split('\n').filter(l => l.trim().length > 5).map(item => {
      const parts = item.split(':::');
      return {
        title: parts[0] ? parts[0].replace(/\(http.*\)/g, '').trim() : '',
        desc: parts[1] ? parts[1].replace(/<[^>]*>?/gm, '').trim() : ''
      };
    });
  }, [analysis]);

  const topicKey = selectedTopic ? `${analysis.id}_${selectedTopic.title}` : null;
  const currentChat = (topicKey && topicChats) ? topicChats[topicKey] : null;

  const handleSelectTopic = (topic) => {
    setSelectedTopic(topic);
    const key = `${analysis.id}_${topic.title}`;
    if (!topicChats || !topicChats[key]) {
      generateTopicStrategy(analysis.id, topic);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || currentChat?.isGenerating) return;
    sendTopicChatMessage(analysis.id, selectedTopic, chatInput);
    setChatInput('');
  };

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.chatHistory]);

  if (!isOpen) return null;

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

        {!selectedTopic ? (
          <>
            <h3 style={{ color: 'var(--kick-green)', marginTop: 0, marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              Gündem Başlıkları (Analiz İçin Seçin)
            </h3>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topics.map((t, i) => (
                <div key={i} onClick={() => handleSelectTopic(t)} style={{
                  background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', 
                  cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s'
                }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--kick-green)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{t.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t.desc.substring(0, 150)}...</div>
                </div>
              ))}
              {topics.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Gündem bulunamadı.</div>}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setSelectedTopic(null)} style={{
                background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Geri
              </button>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <h3 style={{ color: 'var(--kick-green)', margin: '0 0 4px 0', fontSize: '16px' }}>{selectedTopic.title}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Yapay zeka ile bu konu hakkında konuşuyorsunuz.</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentChat?.isGenerating && (!currentChat.chatHistory || currentChat.chatHistory.length === 0) ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--kick-green)' }}>
                  <div style={{ width: '30px', height: '30px', border: '2px solid rgba(83, 252, 24, 0.2)', borderTopColor: 'var(--kick-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                  <div style={{ fontSize: '13px' }}>Strateji Üretiliyor...</div>
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
                    {msg.role === 'assistant' && i === 0 && <div style={{ fontSize: '11px', color: 'var(--kick-green)', marginBottom: '6px', fontWeight: 'bold' }}>⚡ ANA STRATEJİ</div>}
                    {msg.content}
                  </div>
                ))
              )}
              {currentChat?.isGenerating && currentChat?.chatHistory?.length > 0 && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '12px', padding: '10px' }}>Yapay zeka yazıyor...</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                placeholder="Bu haberle ilgili bir şey sor..."
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
                Gönder
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpandableText({ text }) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const maxLength = 120;
  const safeText = String(text || '');
  
  if (safeText.length <= maxLength) {
    return <span>{safeText}</span>;
  }
  
  return (
    <span>
      {`${safeText.slice(0, maxLength)}... `}
      <button 
        onClick={() => setModalOpen(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--kick-green)', 
          cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 'bold',
          marginLeft: '4px', textDecoration: 'underline'
        }}
      >
        Detayları Oku
      </button>
      <AnalysisModal isOpen={modalOpen} onClose={() => setModalOpen(false)} content={safeText} />
    </span>
  );
}

function ListRenderer({ items, emptyText }) {
  const safeItems = Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
  
  if (safeItems.length === 0) return <div style={{ fontStyle: 'italic', opacity: 0.7 }}>{emptyText}</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {safeItems.map((item, idx) => (
        <li key={idx} style={{ color: 'var(--text-primary)' }}>
          <ExpandableText text={item} />
        </li>
      ))}
    </ul>
  );
}

export default function AiAnalysisTab() {
  const { aiAnalyses, isAnalyzing, runAiAnalysis, generateDetailedAnalysis, settings } = useChatStore();
  const [customSearch, setCustomSearch] = React.useState('');
  const [timeframe, setTimeframe] = React.useState('');
  const [strategyModalOpen, setStrategyModalOpen] = React.useState(false);

  const latestAnalysis = aiAnalyses[0];

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (!customSearch.trim()) return;
    runAiAnalysis(customSearch.trim(), timeframe);
  };

  return (
    <div className="chat-panel" style={{ padding: '16px', overflowY: 'auto', background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--kick-green)', margin: '0 0 4px 0' }}>Akıllı Chat Asistanı</h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Otomatik güncelleme: {settings.aiAnalysisInterval} dakikada bir.
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => runAiAnalysis(null, timeframe)} 
          disabled={isAnalyzing}
          style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {isAnalyzing && <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>}
          {isAnalyzing ? 'Analiz ediliyor...' : 'Şimdi Yenile'}
        </button>
      </div>

      <form onSubmit={handleCustomSearch} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Özel analiz iste (örn: Valorant güncellemesi, derbi maçı...)" 
          value={customSearch}
          onChange={(e) => setCustomSearch(e.target.value)}
          className="form-input"
          style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
        />
        <select 
          value={timeframe} 
          onChange={(e) => setTimeframe(e.target.value)}
          className="form-input"
          style={{ width: '130px', padding: '8px 10px', fontSize: '12px', background: 'var(--bg-card)' }}
        >
          <option value="">Her Zaman</option>
          <option value="1d">Son 24 Saat</option>
          <option value="3d">Son 3 Gün</option>
          <option value="7d">Son 1 Hafta</option>
        </select>
        <button 
          type="submit" 
          disabled={!customSearch.trim() || isAnalyzing}
          className="btn"
          style={{ padding: '8px 16px', background: 'var(--border)', color: 'var(--text-primary)', border: '1px solid var(--border-hover)' }}
        >
          Analiz Et
        </button>
      </form>

      {aiAnalyses.length === 0 && !isAnalyzing && (
        <div className="empty-state" style={{ padding: '40px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <div className="empty-state-title" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Bekleniyor...</div>
          <div className="empty-state-desc" style={{ marginTop: '8px' }}>Chat verileri toplandıktan sonra "Şimdi Yenile" butonuna basarak veya bir konu aratarak analizi başlatabilirsiniz.</div>
        </div>
      )}

      {latestAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Son Güncelleme: <strong>{new Date(latestAnalysis.timestamp).toLocaleTimeString()}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            
            <DashboardCard title="Gözden Kaçan Sorular" icon={<Icons.Question />} color="#ffb454">
              <ListRenderer items={latestAnalysis.questions} emptyText="Şu an için belirgin bir soru tespit edilmedi." />
            </DashboardCard>

            <DashboardCard title="Gündem / Konu Başlıkları" icon={<Icons.Topic />} color="#6ea1ff">
              <ListRenderer items={latestAnalysis.topics} emptyText="Chat şu an sakin, belirgin bir gündem yok." />
            </DashboardCard>

            <DashboardCard title="Teknik Durum" icon={<Icons.Warning />} color="#ff6b6b">
              <ListRenderer items={latestAnalysis.technicalIssues} emptyText="Yayında donma veya kasma şikayeti bulunmuyor." />
            </DashboardCard>

          </div>

          <div style={{ width: '100%' }}>
            <DashboardCard title="Kick Trendleri & Tavsiyeler" icon={<Icons.Trending />} color="var(--kick-green)">
              {latestAnalysis.news_summary ? (
                <div style={{ marginBottom: '16px', background: 'var(--bg-hover)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>📡 Anlık İnternet Gündemi (Kısa)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {latestAnalysis.news_summary}
                  </div>
                </div>
              ) : latestAnalysis.newsData ? (
                <div style={{ marginBottom: '16px', background: 'var(--bg-hover)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>📡 Anlık İnternet Gündemi (Kısa)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {latestAnalysis.newsData.split('\n').filter(l => l.trim().length > 5).slice(0, 3).map((item, idx) => {
                      const parts = item.split(':::');
                      const title = parts[0] ? parts[0].replace(/\(http.*\)/g, '').trim() : '';
                      const desc = parts[1] ? parts[1].replace(/<[^>]*>?/gm, '').trim() : '';
                      return (
                        <div key={idx} style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '4px', borderLeft: '2px solid var(--kick-green)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>{title.substring(0, 80)}{title.length > 80 ? '...' : ''}</div>
                          {desc && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{desc.substring(0, 120)}{desc.length > 120 ? '...' : ''}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div style={{ textAlign: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', marginTop: '10px' }}>
                <button 
                  onClick={() => setStrategyModalOpen(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  Haberleri İncele & Taktik Al
                </button>
              </div>
              
              <ModalErrorBoundary>
                <InteractiveAnalysisModal 
                  isOpen={strategyModalOpen} 
                  onClose={() => setStrategyModalOpen(false)} 
                  analysis={latestAnalysis} 
                />
              </ModalErrorBoundary>
            </DashboardCard>

          </div>
          
          {aiAnalyses.length > 1 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px' }}>GEÇMİŞ ÖZETLER (Son 5)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiAnalyses.slice(1, 6).map(a => (
                  <div key={a.id} style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '8px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                    <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
                      {a.topics && a.topics[0] ? a.topics[0] : 'Özet bulunamadı'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
