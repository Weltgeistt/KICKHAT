import React, { useState, useEffect } from 'react';
import { useChatStore } from './store/chatStore';
import TitleBar from './components/TitleBar';
import ConnectModal from './components/ConnectModal';
import ModerationBar from './components/ModerationBar';
import ChatPanel from './components/ChatPanel';
import AiAnalysisTab from './components/AiAnalysisTab';
import ToastContainer from './components/ToastContainer';
import SettingsModal from './components/SettingsModal';
import ResearchModal from './components/ResearchModal';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t } = useTranslation();
  const { channelInfo, disconnectPusher, settings, runAiAnalysis, setAuthToken } = useChatStore();
  const [view, setView] = useState('connect'); // 'connect' | 'chat' | 'analysis'
  const [showSettings, setShowSettings] = useState(false);
  const [showResearch, setShowResearch] = useState(false);

  // Kayıtlı token varsa otomatik yükle
  useEffect(() => {
    const savedToken = localStorage.getItem('kickhat:saved_token');
    if (savedToken) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_auth_token', { token: savedToken }).then(() => {
          setAuthToken(savedToken);
        }).catch(console.error);
      });
    }
  }, [setAuthToken]);

  useEffect(() => {
    if (settings.autoUpdateEnabled) {
      const { checkUpdate } = useChatStore.getState();
      const timer = setTimeout(() => {
        checkUpdate(false).catch(console.error);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [settings.autoUpdateEnabled]);

  // Otomatik analiz timer'ı
  useEffect(() => {
    if (view === 'connect') return;
    const intervalMs = (settings.aiAnalysisInterval || 100) * 60 * 1000;
    const timer = setInterval(() => {
      runAiAnalysis();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [view, settings.aiAnalysisInterval, runAiAnalysis]);

  // Görünüm ayarlarını kök elemana CSS değişkeni olarak uygula
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chat-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--chat-line-height', String(settings.lineHeight));
    root.style.setProperty('--chat-msg-gap', `${settings.messageGap}px`);
    root.classList.toggle('appearance-compact', !!settings.compact);
    root.classList.toggle('appearance-no-ts', !settings.timestamps);
    [...root.classList].filter((c) => c.startsWith('theme-')).forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${settings.theme}`);
  }, [settings]);

  // Eğer AI özellikleri kapatılırsa ve şu an AI sekmesindeysek Chat'e dön
  useEffect(() => {
    if (!settings.aiFeaturesEnabled && view === 'analysis') {
      setView('chat');
    }
  }, [settings.aiFeaturesEnabled, view]);

  const handleConnected = () => {
    setView('chat');
  };

  const handleDisconnect = () => {
    disconnectPusher();
    setView('connect');
  };

  const channelName = channelInfo?.user?.username;

  return (
    <div className="app-container">
      {/* Custom Title Bar */}
      <TitleBar
        subtitle={view === 'chat' ? channelName : t('app.disconnected')}
        onOpenSettings={() => setShowSettings(true)}
        onOpenResearch={() => setShowResearch(true)}
      />

      {/* Main Content */}
      {view === 'connect' ? (
        <ConnectModal onConnected={handleConnected} />
      ) : (
        <>
          {/* Mod Bar */}
          <ModerationBar view={view} onViewChange={setView} onDisconnect={handleDisconnect} />

          {/* Content Panels */}
          {view === 'chat' && <ChatPanel />}
          {view === 'analysis' && <AiAnalysisTab />}
        </>
      )}

      {/* Settings */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Research Modal */}
      <ResearchModal isOpen={showResearch} onClose={() => setShowResearch(false)} />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
