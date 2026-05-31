import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

let pusherInstance = null;
let channelInstance = null;
let toastCounter = 0;

// ── Görünüm Ayarları (kalıcı) ────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  theme: 'terminal', // renk teması
  fontSize: 12,      // px — mesaj yazı boyutu
  lineHeight: 1.4,   // satır aralığı
  messageGap: 5,     // px — mesajlar arası boşluk
  timestamps: true,  // saat damgası göster
  compact: false,    // sıkışık mod (kutu kenarlıkları/iç boşluk küçülür)
  aiAnalysisInterval: 100, // AI analiz aralığı (dakika)
  aiFeaturesEnabled: true,
  aiApiProvider: 'local',
  aiCustomEndpoint: 'https://api.openai.com/v1/chat/completions',
  aiCustomApiKey: '',
  aiCustomModel: 'gpt-4o-mini',
  autoUpdateEnabled: true,
};

const SETTINGS_KEY = 'kickhat:settings';

// Geçerli tema kimlikleri (CSS'te tanımlı olanlar)
const VALID_THEMES = new Set([
  'terminal', 'gece', 'komur',
  'pastel-mor', 'pastel-pembe', 'pastel-nane', 'pastel-mavi', 'pastel-seftali',
]);

const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);

// localStorage'dan gelen değerleri doğrula — bozuk/eski değerler UI'yı kırmasın
function sanitizeSettings(s) {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    theme: VALID_THEMES.has(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    fontSize: num(s.fontSize, DEFAULT_SETTINGS.fontSize),
    lineHeight: num(s.lineHeight, DEFAULT_SETTINGS.lineHeight),
    messageGap: num(s.messageGap, DEFAULT_SETTINGS.messageGap),
    timestamps: !!s.timestamps,
    compact: !!s.compact,
    aiAnalysisInterval: num(s.aiAnalysisInterval, DEFAULT_SETTINGS.aiAnalysisInterval),
    aiFeaturesEnabled: s.aiFeaturesEnabled !== undefined ? !!s.aiFeaturesEnabled : DEFAULT_SETTINGS.aiFeaturesEnabled,
    aiApiProvider: ['local', 'custom'].includes(s.aiApiProvider) ? s.aiApiProvider : DEFAULT_SETTINGS.aiApiProvider,
    aiCustomEndpoint: typeof s.aiCustomEndpoint === 'string' ? s.aiCustomEndpoint : DEFAULT_SETTINGS.aiCustomEndpoint,
    aiCustomApiKey: typeof s.aiCustomApiKey === 'string' ? s.aiCustomApiKey : DEFAULT_SETTINGS.aiCustomApiKey,
    aiCustomModel: typeof s.aiCustomModel === 'string' ? s.aiCustomModel : DEFAULT_SETTINGS.aiCustomModel,
    autoUpdateEnabled: s.autoUpdateEnabled !== undefined ? !!s.autoUpdateEnabled : DEFAULT_SETTINGS.autoUpdateEnabled,
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return sanitizeSettings(JSON.parse(raw));
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function persistSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export const useChatStore = create((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────
  connected: false,
  connecting: false,
  channelSlug: '',
  channelInfo: null,
  chatroomId: null,
  authToken: null,

  // ── Chat ─────────────────────────────────────────────────────────
  messages: [],
  maxMessages: 300,
  filterText: '',
  lastTechnicalAlert: 0,

  // ── Mod settings ─────────────────────────────────────────────────
  slowMode: false,
  slowModeCooldown: 3,
  subscribersMode: false,

  // ── Permissions / Badges ─────────────────────────────────────────
  canModerate: false,
  isSubscriber: false,
  subscriberBadges: [],

  // ── UI State ─────────────────────────────────────────────────────
  isPaused: false,
  toasts: [],

  // ── Sabitlenmiş mesaj (kayan şerit) ──────────────────────────────
  pinnedMessage: null,
  setPinnedMessage: (msg) => set({ pinnedMessage: msg }),
  clearPinnedMessage: () => set({ pinnedMessage: null }),

  // ── Öne çıkarılan mesajlar (kullanıcı seçer, maks 16) ────────────
  featuredMessages: [],
  maxFeatured: 16,
  toggleFeatured: (msg) => {
    const { featuredMessages, maxFeatured, addToast } = get();
    if (featuredMessages.some((m) => m.id === msg.id)) {
      set({ featuredMessages: featuredMessages.filter((m) => m.id !== msg.id) });
      return;
    }
    if (featuredMessages.length >= maxFeatured) {
      addToast(`En fazla ${maxFeatured} mesaj öne çıkarılabilir`, 'warning');
      return;
    }
    set({ featuredMessages: [...featuredMessages, { id: msg.id, displayName: msg.displayName, username: msg.username, color: msg.color, content: msg.content }] });
  },
  clearFeatured: () => set({ featuredMessages: [] }),

  // ── AI Analysis ───────────────────────────────────────────────────
  aiAnalyses: [],
  topicChats: {},
  isAnalyzing: false,

  // ── Ollama Download ────────────────────────────────────────────────
  isDownloadingOllama: false,
  ollamaDownloadProgress: 0,
  ollamaDownloadText: '',
  
  startOllamaDownload: async () => {
    const { addToast } = get();
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    
    // Önce Ollama açık mı kontrol et
    try {
      const isRunning = await invoke('check_ollama_status');
      if (isRunning) {
        return get().pullLlamaModel();
      }
    } catch(e) {}

    set({ isDownloadingOllama: true, ollamaDownloadProgress: 0, ollamaDownloadText: "Ollama İndiriliyor..." });
    
    try {
      const unlisten = await listen('download_progress', (event) => {
        const { downloaded, total } = event.payload;
        if (total > 0) {
          const percent = Math.round((downloaded / total) * 100);
          set({ ollamaDownloadProgress: percent, ollamaDownloadText: `Ollama İndiriliyor: %${percent}` });
        }
      });

      addToast('Ollama indirmesi başladı...', 'success');
      const filePath = await invoke('download_ollama');
      
      unlisten();
      
      addToast('İndirme tamamlandı. Lütfen açılan ekrandan kurulumu tamamlayın.', 'success');
      set({ ollamaDownloadText: "Kurulumun bitmesi bekleniyor..." });
      
      await invoke('install_ollama', { path: filePath });
      
      // Ollama çalışana kadar 3 saniyede bir kontrol et
      const pollInterval = setInterval(async () => {
        try {
          const running = await invoke('check_ollama_status');
          if (running) {
            clearInterval(pollInterval);
            addToast('Ollama başlatıldı! Llama3 modeli indiriliyor...', 'success');
            get().pullLlamaModel();
          }
        } catch(e) {}
      }, 3000);
      
    } catch (e) {
      console.error(e);
      set({ isDownloadingOllama: false, ollamaDownloadProgress: 0 });
      addToast('İndirme/Kurulum hatası: ' + e, 'error');
    }
  },

  pullLlamaModel: async () => {
    const { addToast } = get();
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    
    set({ isDownloadingOllama: true, ollamaDownloadProgress: 0, ollamaDownloadText: "Llama3 İndiriliyor..." });
    
    try {
      const unlisten = await listen('pull_progress', (event) => {
        const { status, completed, total } = event.payload;
        if (total > 1) {
          const percent = Math.round((completed / total) * 100);
          set({ ollamaDownloadProgress: percent, ollamaDownloadText: `Llama3 İndiriliyor: %${percent}` });
        } else {
          set({ ollamaDownloadText: `Durum: ${status}` });
        }
      });

      addToast('Llama3 modeli çekiliyor, bu işlem internet hızınıza bağlı olarak birkaç dakika sürebilir...', 'success');
      
      await invoke('pull_ollama_model', { model: 'llama3' });
      unlisten();
      
      set({ isDownloadingOllama: false, ollamaDownloadProgress: 100 });
      addToast('Llama3 modeli başarıyla yüklendi! Artık yapay zeka özelliklerini kullanabilirsiniz.', 'success');
      
    } catch (e) {
      console.error(e);
      set({ isDownloadingOllama: false, ollamaDownloadProgress: 0 });
      addToast('Model indirme hatası: ' + e, 'error');
    }
  },

  // ── Auto Updater ──────────────────────────────────────────────────
  checkUpdate: async (interactive = false) => {
    const { addToast } = get();
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process').catch(() => ({ relaunch: null }));
      
      if (interactive) addToast('Güncellemeler kontrol ediliyor...', 'info');
      
      const update = await check();
      
      if (update) {
        addToast(`Yeni sürüm bulundu! (v${update.version}) İndiriliyor...`, 'success');
        let downloaded = 0;
        let contentLength = 0;
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              break;
            case 'Finished':
              addToast('İndirme tamamlandı! Yeniden başlatılıyor...', 'success');
              break;
          }
        });

        if (relaunch) {
          await relaunch();
        } else {
          addToast('Lütfen uygulamayı kapatıp tekrar açın.', 'warning');
        }
      } else {
        if (interactive) {
          addToast('Uygulamanız güncel!', 'success');
        }
      }
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      if (interactive) {
        addToast('Güncelleme kontrol edilemedi.', 'error');
      }
    }
  },

  generateTopicStrategy: async (analysisId, topicObj) => {
    const { aiAnalyses } = get();
    const analysis = aiAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const topicKey = `${analysisId}_${topicObj.title}`;

    set(state => ({
      topicChats: { ...state.topicChats, [topicKey]: { ...state.topicChats[topicKey], isGenerating: true } }
    }));

    // Haber detayını zenginleştirmek için anlık internet araması yapıyoruz
    let searchContext = "";
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('fetch_turkey_trends', { query: topicObj.title, timeframe: null });
      if (result && !result.includes("bulunamadı")) {
        searchContext = result.split('\n').slice(0, 3).map(r => {
          const parts = r.split(':::');
          return `Ek Haber Başlığı: ${parts[0]}\nEk Detay: ${parts[1] || ''}`;
        }).join('\n\n');
      }
    } catch (e) {
      console.error("Ekstra arama hatası:", e);
    }

    const queryContextText = analysis.customQuery 
      ? `\n\nÖZEL İSTEK: Yayıncı şu an özellikle "${analysis.customQuery}" konusu hakkında analiz ve tavsiye istiyor. Çekilen haberleri bu konuya odaklanarak değerlendir.` 
      : "";

    const promptText = `Yayıncı şu an yayında ve chat ile aşağıdaki haber hakkında konuşmak istiyor:
Ana Haber Başlığı: "${topicObj.title}"
Kısa Açıklama: "${topicObj.desc}"

Senin için interneti tarayıp bu haberle ilgili şu EKSTRA DETAYLARI bulduk (bu detayları harmanlayarak bilgi ver):
${searchContext}
${queryContextText}

GÖREVİN: 
1. ÖNCE, bu haber hakkında elinden geldiğince detaylı ve doyurucu bir bilgi ver. İnternetten çektiğimiz ekstra detayları kullanarak konuyu derinleştir. Kendi zekanı da kullan.
2. ANALİZ: Gerçeklere ve mantığa dayanarak akıl yürüt ve kısa bir durum değerlendirmesi yap.
3. EN SONDA, yayıncıya bu konuyu chate nasıl sunması gerektiğine dair doğrudan 1-2 maddelik ÇOK KISA, NET ve CANLI bir "Yayın Taktiği" ver.

KESİN KURALLAR:
1. SADECE TÜRKÇE YAZ. İngilizce yazarsan sistem çöker.
2. Robotik girişler ("Görevin..." vb.) yapma, doğrudan muhabbete girer gibi anlatmaya başla.`;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { settings } = get();
      
      let dataText;
      if (settings.aiApiProvider === 'custom') {
        const payload = {
          model: settings.aiCustomModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen Twitch/Kick yayıncılarına Türkçe bilgi ve taktik veren zeki, araştırmacı bir asistansın. ASLA İNGİLİZCE KONUŞMA. Sadece Türkçe.' },
            { role: 'user', content: promptText }
          ],
          temperature: 0.5,
          top_p: 0.9,
          max_tokens: 1024
        };
        const rawText = await invoke('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload
          }
        });
        dataText = JSON.parse(rawText);
        // OpenAI uyumlu API'ler genellikle "choices[0].message.content" döner
        if (dataText.choices && dataText.choices.length > 0) {
          dataText.message = dataText.choices[0].message;
        }
      } else {
        const rawText = await invoke('call_ollama', {
          payload: {
            model: 'llama3',
            messages: [
              { role: 'system', content: 'Sen Twitch/Kick yayıncılarına Türkçe bilgi ve taktik veren zeki, araştırmacı bir asistansın. ASLA İNGİLİZCE KONUŞMA. Sadece Türkçe.' },
              { role: 'user', content: promptText }
            ],
            stream: false,
            options: { temperature: 0.5, top_p: 0.9, num_predict: 1024 }
          }
        });
        dataText = JSON.parse(rawText);
      }
      
      let strategy = dataText.message?.content?.trim() || "Detaylı analiz oluşturulamadı.";

      set(state => ({
        topicChats: { 
          ...state.topicChats, 
          [topicKey]: { 
            strategy, 
            chatHistory: [{ role: 'assistant', content: strategy }], 
            isGenerating: false 
          } 
        }
      }));

    } catch (e) {
      console.error("Konu analiz hatası:", e);
      set(state => ({
        topicChats: { 
          ...state.topicChats, 
          [topicKey]: { 
            strategy: "Yazı üretilirken hata oluştu.", 
            chatHistory: [], 
            isGenerating: false 
          } 
        }
      }));
    }
  },

  sendTopicChatMessage: async (analysisId, topicObj, message) => {
    const topicKey = `${analysisId}_${topicObj.title}`;
    const currentChat = get().topicChats[topicKey];
    if (!currentChat) return;

    const newHistory = [...(currentChat.chatHistory || []), { role: 'user', content: message }];
    
    set(state => ({
      topicChats: { 
        ...state.topicChats, 
        [topicKey]: { ...currentChat, chatHistory: newHistory, isGenerating: true } 
      }
    }));

    try {
      // Sona eklenen kullanıcı mesajının arkasına Llama 3'ün kafasının karışmasını önleyecek sert bir kural ekliyoruz.
      const formattedHistory = newHistory.map((msg, index) => {
        if (msg.role === 'user' && index === newHistory.length - 1) {
          return { ...msg, content: msg.content + "\n\n(DİKKAT: YANITINI KESİNLİKLE TÜRKÇE OLARAK VER! İNGİLİZCE YAZMAN YASAKTIR. EĞER BİLGİ YETERSİZSE ASLA UYDURMA.)" };
        }
        return msg;
      });

      const messages = [
        { role: 'system', content: `Sen Twitch/Kick yayıncılarına taktik veren dürüst bir asistansın. Konu: "${topicObj.title}". Detay: "${topicObj.desc}".\n\nKURALLAR:\n1. ASLA İNGİLİZCE YAZMA. Yanıtların %100 Türkçe olmalı.\n2. BİLMEDİĞİNİ UYDURMA (Halüsinasyon YASAK). Sadece sana verilen "Detay" kısmındaki bilgileri kullan. Eğer kullanıcının sorduğu detaylar bu metinde yoksa, doğrudan "Maalesef elimdeki kısa haber özetinde bu detaylar (kimler olduğu, ne zaman kurulduğu vb.) yazmıyor. Sadece başlık bilgisine sahibim." diyerek dürüstçe cevap ver. Asla yalan bilgi üretme.` },
        ...formattedHistory
      ];

      const { invoke: inv2 } = await import('@tauri-apps/api/core');
      const { settings } = get();

      let dataText;
      if (settings.aiApiProvider === 'custom') {
        const rawText2 = await inv2('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload: {
              model: settings.aiCustomModel || 'gpt-4o-mini',
              messages,
              temperature: 0.5,
              top_p: 0.9,
              max_tokens: 1024
            }
          }
        });
        dataText = JSON.parse(rawText2);
        if (dataText.choices && dataText.choices.length > 0) {
          dataText.message = dataText.choices[0].message;
        }
      } else {
        const rawText2 = await inv2('call_ollama', {
          payload: {
            model: 'llama3',
            messages,
            stream: false,
            options: { temperature: 0.5, top_p: 0.9, num_predict: 1024 }
          }
        });
        dataText = JSON.parse(rawText2);
      }
      
      if (dataText.message?.content) {
        newHistory.push({ role: 'assistant', content: dataText.message.content.trim() });
      }

      set(state => ({
        topicChats: { 
          ...state.topicChats, 
          [topicKey]: { ...currentChat, chatHistory: newHistory, isGenerating: false } 
        }
      }));

    } catch (e) {
      console.error("Chat hatası:", e);
      set(state => ({
        topicChats: { 
          ...state.topicChats, 
          [topicKey]: { ...currentChat, chatHistory: newHistory, isGenerating: false } 
        }
      }));
    }
  },

  // ── Serbest Araştırma ───────────────────────────────────────────────
  customResearchChats: {},

  startCustomResearch: async (query) => {
    set(state => ({
      customResearchChats: { ...state.customResearchChats, [query]: { isGenerating: true, chatHistory: [], context: "" } }
    }));

    let searchContext = "İnternette bu konu hakkında taze bir haber özeti bulunamadı.";
    try {
      const result = await invoke('fetch_turkey_trends', { query: query, timeframe: null });
      if (result && !result.includes("bulunamadı")) {
        searchContext = result.split('\n').slice(0, 3).map(r => {
          const parts = r.split(':::');
          return `Başlık: ${parts[0]}\nDetay: ${parts[1] || ''}`;
        }).join('\n\n');
      }
    } catch (e) {
      console.error("Arama hatası:", e);
    }

    const promptText = `Yayıncı şu an yayında ve "${query}" konusunu araştırıyor. İnternetten şu taze haber/bilgi özetlerini çektik:
${searchContext}

GÖREVİN: 
1. ÖNCE, bu konu hakkında elinden geldiğince detaylı ve doyurucu bir bilgi ver. (Eğer sana verdiğim internet özetlerinde bilgi varsa onları detaylandır, eğer özetlerde bilgi YOKSA veya yetersizse kendi yapay zeka hafızanı/bilgi birikimini kullanarak konuyu detaylıca açıkla).
2. ANALİZ VE GELECEK ÖNGÖRÜSÜ: Eğer konunun gidişatı veya "ilerleyen günlerde ne olur" gibi bir analiz gerekiyorsa; KESİNLİKLE gerçek verilere, geçmiş olaylara ve mantığa dayanarak akıl yürüt. Sadece hayal gücüyle sallama, bir stratejist gibi veriye dayalı öngörüler sun.
3. EN SONDA, yayıncının bu konuyu yayında chat ile nasıl tartışabileceğine dair 1-2 maddelik canlı bir "Yayın Taktiği" ver.

KESİN KURALLAR:
1. SADECE TÜRKÇE YAZ. İngilizce yazarsan sistem çöker.
2. "Görevin..." veya "Taktik:" gibi robotik kalıpları bırak, doğrudan konuyu anlatmaya başla.`;

    try {
      const { invoke: inv3 } = await import('@tauri-apps/api/core');
      const { settings } = get();

      let dataText;
      if (settings.aiApiProvider === 'custom') {
        const rawText3 = await inv3('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload: {
              model: settings.aiCustomModel || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Sen Twitch/Kick yayıncılarına Türkçe bilgi ve taktik veren zeki, analitik düşünen bir asistansın. Gelecek öngörülerini gerçeklere dayandırırsın. ASLA İNGİLİZCE KONUŞMA.' },
                { role: 'user', content: promptText }
              ],
              temperature: 0.5,
              top_p: 0.9,
              max_tokens: 1024
            }
          }
        });
        dataText = JSON.parse(rawText3);
        if (dataText.choices && dataText.choices.length > 0) {
          dataText.message = dataText.choices[0].message;
        }
      } else {
        const rawText3 = await inv3('call_ollama', {
          payload: {
            model: 'llama3',
            messages: [
              { role: 'system', content: 'Sen Twitch/Kick yayıncılarına Türkçe bilgi ve taktik veren zeki, analitik düşünen bir asistansın. Gelecek öngörülerini gerçeklere dayandırırsın. ASLA İNGİLİZCE KONUŞMA.' },
              { role: 'user', content: promptText }
            ],
            stream: false,
            options: { temperature: 0.5, top_p: 0.9, num_predict: 1024 }
          }
        });
        dataText = JSON.parse(rawText3);
      }
      
      let strategy = dataText.message?.content?.trim() || "Detaylı analiz oluşturulamadı.";

      set(state => ({
        customResearchChats: { 
          ...state.customResearchChats, 
          [query]: { strategy, chatHistory: [{ role: 'assistant', content: strategy }], isGenerating: false, context: searchContext } 
        }
      }));
    } catch (e) {
      console.error("Araştırma hatası:", e);
      set(state => ({
        customResearchChats: { 
          ...state.customResearchChats, 
          [query]: { strategy: "Yazı üretilirken hata oluştu.", chatHistory: [], isGenerating: false, context: searchContext } 
        }
      }));
    }
  },

  sendCustomResearchMessage: async (query, message) => {
    const currentChat = get().customResearchChats[query];
    if (!currentChat) return;

    const newHistory = [...(currentChat.chatHistory || []), { role: 'user', content: message }];
    
    set(state => ({
      customResearchChats: { 
        ...state.customResearchChats, 
        [query]: { ...currentChat, chatHistory: newHistory, isGenerating: true } 
      }
    }));

    try {
      const formattedHistory = newHistory.map((msg, index) => {
        if (msg.role === 'user' && index === newHistory.length - 1) {
          return { ...msg, content: msg.content + "\n\n(DİKKAT: YANITINI KESİNLİKLE TÜRKÇE OLARAK VER! İNGİLİZCE YAZMAN YASAKTIR. GELECEK ANALİZİ YAPIYORSAN GERÇEK VERİLERE VE MANTIĞA DAYANARAK AKIL YÜRÜT.)" };
        }
        return msg;
      });

      const messages = [
        { role: 'system', content: `Sen Türkçe konuşan, analitik zekası yüksek ve öngörülü bir yayın asistanısın. Araştırılan Konu: "${query}". Konu bağlamı: "${currentChat.context}".\n\nKURALLAR:\n1. ASLA İNGİLİZCE YAZMA.\n2. Gelecek analizi veya tahmin istenirse, sadece eldeki gerçek bilgilere ve mantığa dayanarak akıl yürüt. Hayal ürünü fanteziler kurma.` },
        ...formattedHistory
      ];

      const { invoke: inv4 } = await import('@tauri-apps/api/core');
      const { settings } = get();

      let dataText;
      if (settings.aiApiProvider === 'custom') {
        const rawText4 = await inv4('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload: {
              model: settings.aiCustomModel || 'gpt-4o-mini',
              messages,
              temperature: 0.5,
              top_p: 0.9,
              max_tokens: 1024
            }
          }
        });
        dataText = JSON.parse(rawText4);
        if (dataText.choices && dataText.choices.length > 0) {
          dataText.message = dataText.choices[0].message;
        }
      } else {
        const rawText4 = await inv4('call_ollama', {
          payload: {
            model: 'llama3',
            messages,
            stream: false,
            options: { temperature: 0.5, top_p: 0.9, num_predict: 1024 }
          }
        });
        dataText = JSON.parse(rawText4);
      }
      
      if (dataText.message?.content) {
        newHistory.push({ role: 'assistant', content: dataText.message.content.trim() });
      }

      set(state => ({
        customResearchChats: { 
          ...state.customResearchChats, 
          [query]: { ...currentChat, chatHistory: newHistory, isGenerating: false } 
        }
      }));

    } catch (e) {
      console.error("Chat hatası:", e);
      set(state => ({
        customResearchChats: { 
          ...state.customResearchChats, 
          [query]: { ...currentChat, chatHistory: newHistory, isGenerating: false } 
        }
      }));
    }
  },

  generateDetailedAnalysis: async (analysisId) => {
    const { aiAnalyses } = get();
    const analysis = aiAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    set((state) => ({
      aiAnalyses: state.aiAnalyses.map(a => 
        a.id === analysisId ? { ...a, isGeneratingStrategy: true } : a
      )
    }));

    const queryContextText = analysis.customQuery 
      ? `\n\nÖZEL İSTEK: Yayıncı şu an özellikle "${analysis.customQuery}" konusu hakkında analiz ve tavsiye istiyor. Çekilen haberleri bu konuya odaklanarak değerlendir.` 
      : "";

    const agendaContent = analysis.news_summary 
      ? analysis.news_summary 
      : (analysis.newsData || "Şu an gündemde belirgin bir haber yok.");

    const promptText = `Aşağıda "Türkiye Genel Haber ve Gündemi" özetleri yer almaktadır:${queryContextText}

GÖREV: Aşağıdaki haber özetini ve gündemi oku.
Yayıncıya, SADECE BU HABERLER üzerinden chat ile nasıl muhabbet kurabileceğini anlat.

KURALLAR:
1. YANITINI KESİNLİKLE VE SADECE TÜRKÇE (TURKISH) OLARAK YAZACAKSIN. Yabancı dilde tek bir kelime bile yazma! "Here is the rewritten text" gibi saçmalıklar EKLEME.
2. ASLA YENİ HABER UYDURMA. Sadece sana verilen "TÜRKİYE GÜNCEL GÜNDEMİ" metnindeki konuları kullan. 
3. "Yayıncı haberi kısa sunmalı" gibi GENEL GEÇER TAVSİYELER VERME. Doğrudan habere girerek taktik ver.
4. Liste kullanma, akıcı bir paragraf halinde yaz.

TÜRKİYE GÜNCEL GÜNDEMİ:
${agendaContent}

LÜTFEN SADECE VE SADECE TÜRKÇE OLARAK, DOĞRUDAN STRATEJİYİ YAZ (Başka hiçbir açıklama yapma):`;

    try {
      const { invoke: inv5 } = await import('@tauri-apps/api/core');
      const { settings } = get();

      let dataText;
      if (settings.aiApiProvider === 'custom') {
        const rawText5 = await inv5('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload: {
              model: settings.aiCustomModel || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Sen sadece Türkçe (Turkish) konuşan, yayıncılara taktik veren profesyonel bir stratejistsin. Asla İngilizce veya başka bir dilde cevap vermezsin.' },
                { role: 'user', content: promptText }
              ],
              temperature: 0.4,
              top_p: 0.9,
              max_tokens: 1024
            }
          }
        });
        dataText = JSON.parse(rawText5);
        if (dataText.choices && dataText.choices.length > 0) {
          dataText.message = dataText.choices[0].message;
        }
      } else {
        const rawText5 = await inv5('call_ollama', {
          payload: {
            model: 'llama3',
            messages: [
              { role: 'system', content: 'Sen sadece Türkçe (Turkish) konuşan, yayıncılara taktik veren profesyonel bir stratejistsin. Asla İngilizce veya başka bir dilde cevap vermezsin.' },
              { role: 'user', content: promptText }
            ],
            stream: false,
            options: { temperature: 0.4, top_p: 0.9, num_predict: 1024 }
          }
        });
        dataText = JSON.parse(rawText5);
      }
      
      let newTips = ["Detaylı analiz oluşturulamadı."];
      if (dataText.message?.content && dataText.message.content.trim() !== '') {
        newTips = [dataText.message.content.trim()];
      }

      set((state) => ({
        aiAnalyses: state.aiAnalyses.map(a => 
          a.id === analysisId ? { ...a, isGeneratingStrategy: false, kickTips: newTips } : a
        )
      }));

    } catch (e) {
      console.error("Detaylı analiz hatası:", e);
      set((state) => ({
        aiAnalyses: state.aiAnalyses.map(a => 
          a.id === analysisId ? { ...a, isGeneratingStrategy: false, kickTips: ["Yazı üretilirken hata oluştu."] } : a
        )
      }));
    }
  },

  runAiAnalysis: async (customQuery = null, timeframe = null) => {
    const { messages, isAnalyzing, addToast } = get();
    if (isAnalyzing) return;
    if (messages.length === 0 && !customQuery) {
      addToast('Analiz edilecek mesaj yok.', 'warning');
      return;
    }
    
    set({ isAnalyzing: true });
    try {
      // Son 100 mesajı al
      const recentMsgs = messages.slice(-100).map(m => `${m.displayName || m.username}: ${m.content}`).join('\n');
      
      let turkeyTrends = "Gündem bulunamadı.";
      try {
        turkeyTrends = await invoke('fetch_turkey_trends', { query: customQuery, timeframe: timeframe });
      } catch (err) {
        console.error("Trend çekme hatası:", err);
      }
      
      const promptJson = `Aşağıda bir yayıncının canlı chat kayıtları ve anlık internet gündemi (RSS haberleri) bulunmaktadır. Sen profesyonel bir yayın asistanı ve metin yazarısın.

GÖREVİN: Chat mesajlarını ve İnternet Gündemini analiz edip aşağıdaki 4 kategoride tam ve eksiksiz bir JSON formatında özet çıkarmaktır.

KURALLAR:
1. questions: SADECE "Chat Mesajları" bölümündeki izleyici mesajlarına bakarak yayıncıya sorulan gerçek soruları listele. "İnternet Gündemi" (Haberler) kısmındaki yazıları ASLA BURAYA EKLEME. Gerçek bir izleyici sorusu yoksa boş bırak: []
2. topics: "Chat Mesajları" kısmında chat şu an ağırlıklı olarak ne konuşuyor? Sadece en çok konuşulan 1 veya 2 konuyu çok kısa (1-2 kelime) yaz. Haber başlıklarını buraya ekleme.
3. technical_issues: Eğer "Chat Mesajları" kısmında yayında "kasıyor", "dondu", "ses yok" gibi net bir şikayet varsa yaz. Yoksa sadece ["Sorun yok"] yaz.
4. news_summary: "İnternet Gündemi" kısmında verilen haber başlıklarını ve içeriklerini incele. Okuyucu için ilgi çekici, akıcı ve tek bir uzun paragraf halinde (yaklaşık 4-5 cümle) "İşte şu an internette öne çıkan haberler" tarzında bir özet yaz. Haberin detaylarını birleştirerek profesyonelce sun. EĞER GÜNDEM YOKSA "Şu an gündemde öne çıkan bir haber yok" yaz.

ÇOK ÖNEMLİ: Çıktın sadece JSON olmalıdır. Başka hiçbir metin ekleme.

İnternet Gündemi (Haberler):
${turkeyTrends}

Chat Mesajları:
${recentMsgs}

Beklenen JSON Formatı:
{
  "questions": ["gerçek bir soru 1"],
  "topics": ["konu başlığı"],
  "technical_issues": ["sorun yok"],
  "news_summary": "Buraya internet gündeminin akıcı, detaylı ve uzun bir özeti gelecek..."
}`;

      const { settings } = get();
      
      let dataJson;
      if (settings.aiApiProvider === 'custom') {
        // OpenAI için response_format kullanılabilir veya prompt'ta JSON istenebilir.
        const rawJson = await invoke('call_custom_ai', {
          req: {
            endpoint: settings.aiCustomEndpoint,
            api_key: settings.aiCustomApiKey,
            payload: {
              model: settings.aiCustomModel || 'gpt-4o-mini',
              messages: [{ role: 'user', content: promptJson }],
              temperature: 0.1,
              top_p: 0.9,
              response_format: { type: "json_object" }
            }
          }
        });
        const parsedResp = JSON.parse(rawJson);
        if (parsedResp.choices && parsedResp.choices.length > 0) {
          dataJson = { response: parsedResp.choices[0].message.content };
        } else {
          dataJson = { response: "{}" };
        }
      } else {
        const rawJson = await invoke('call_ollama_generate', {
          payload: {
            model: 'llama3',
            prompt: promptJson,
            stream: false,
            format: 'json',
            options: { temperature: 0.1, top_p: 0.9 }
          }
        });
        dataJson = JSON.parse(rawJson);
      }
      
      let parsed = { questions: [], topics: [], technical_issues: [] };
      try {
        const parsedJson = JSON.parse(dataJson.response);
        parsed = { ...parsed, ...parsedJson };
      } catch (e) {
        console.error("JSON Parse error:", e, dataJson.response);
        const match = dataJson.response.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = { ...parsed, ...JSON.parse(match[0]) };
          } catch(err) {}
        }
      }
      
      const analysisRecord = {
        id: Date.now(),
        timestamp: new Date().getTime(),
        customQuery,
        newsData: turkeyTrends,
        isGeneratingStrategy: false,
        questions: parsed.questions || [],
        topics: parsed.topics || [],
        technicalIssues: parsed.technical_issues || [],
        kickTips: []
      };
      
      set((state) => ({
        aiAnalyses: [analysisRecord, ...state.aiAnalyses].slice(0, 50)
      }));
      addToast('AI Analizi tamamlandı!', 'success');
      
    } catch (error) {
      console.error('AI Analiz Hatası:', error);
      addToast('Ollama API bağlantı hatası. Yerel Ollama (llama3) çalışıyor mu?', 'error');
    } finally {
      set({ isAnalyzing: false });
    }
  },

  // ── Görünüm Ayarları ─────────────────────────────────────────────
  settings: loadSettings(),

  setSetting: (key, value) => set((state) => {
    const settings = { ...state.settings, [key]: value };
    persistSettings(settings);
    return { settings };
  }),

  resetSettings: () => {
    persistSettings(DEFAULT_SETTINGS);
    return set({ settings: { ...DEFAULT_SETTINGS } });
  },

  // ── Actions ──────────────────────────────────────────────────────

  setChannelSlug: (slug) => set({ channelSlug: slug }),
  setAuthToken: (token) => set({ authToken: token }),
  setFilterText: (text) => set({ filterText: text }),
  setIsPaused: (paused) => set({ isPaused: paused }),

  setChannelInfo: (info) => set({
    channelInfo: info,
    chatroomId: info?.chatroom?.id || null,
    slowMode: info?.chatroom?.slow_mode || false,
    slowModeCooldown: info?.chatroom?.slow_mode_cooldown || 3,
    subscribersMode: info?.chatroom?.subscribers_mode || false,
    subscriberBadges: info?.subscriber_badges || [],
  }),

  setCanModerate: (v) => set({ canModerate: !!v }),

  // Giriş yapan kullanıcının bu kanalda yetkisi var mı kontrol et
  refreshModStatus: async () => {
    const { channelSlug, authToken } = get();
    if (!channelSlug || !authToken) {
      set({ canModerate: false, isSubscriber: false });
      return;
    }
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${channelSlug}/me`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        set({ canModerate: false, isSubscriber: false });
        return;
      }
      const me = await res.json();
      const can = !!(me?.is_broadcaster || me?.is_moderator || me?.is_super_admin || me?.is_admin);
      const sub = !!(me?.subscription || me?.is_subscribed || me?.is_subscriber);
      set({ canModerate: can, isSubscriber: sub });
    } catch {
      set({ canModerate: false, isSubscriber: false });
    }
  },

  addMessage: (msg) => {
    set((state) => {
      // Aynı mesaj iki kez gelirse (ağ tekrarı) yok say
      if (state.messages.some((m) => m.id === msg.id)) return state;

      // Teknik sorun radarı (basit keyword eşleştirme)
      const content = msg.content.toLowerCase();
      if (content.includes('kasıyor') || content.includes('ses yok') || content.includes('dondu') || content.includes('lag') || content.includes('drop var') || content.includes('ses kaymış')) {
        const now = Date.now();
        if (now - state.lastTechnicalAlert > 60000) { // 1 dakikada max 1 uyarı
          setTimeout(() => {
            get().addToast(`⚠️ DİKKAT (Teknik Şikayet): "${msg.content}"`, 'error');
            set({ lastTechnicalAlert: now });
          }, 0);
        }
      }

      const msgs = [...state.messages, msg];
      // Keep max 300 messages
      if (msgs.length > state.maxMessages) {
        msgs.splice(0, msgs.length - state.maxMessages);
      }
      return { messages: msgs };
    });
  },

  deleteMessageById: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, deleted: true } : m
      ),
    }));
  },

  clearMessages: () => set({ messages: [] }),

  setConnected: (connected) => set({ connected, connecting: false }),
  setConnecting: (connecting) => set({ connecting }),

  setSlowMode: (enabled, cooldown) => set({
    slowMode: enabled,
    slowModeCooldown: cooldown ?? get().slowModeCooldown,
  }),

  setSubscribersMode: (enabled) => set({ subscribersMode: enabled }),

  // ── Toast ─────────────────────────────────────────────────────────
  addToast: (message, type = 'success') => {
    const id = ++toastCounter;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  // ── Pusher Bağlantısı ─────────────────────────────────────────────
  connectPusher: (chatroomId) => {
    // Önceki bağlantıyı temizle
    if (pusherInstance) {
      pusherInstance.disconnect();
      pusherInstance = null;
      channelInstance = null;
    }

    set({ connecting: true });

    // Pusher'ı dinamik olarak import et
    import('pusher-js').then(({ default: Pusher }) => {
      pusherInstance = new Pusher('32cbd69e4b950bf97679', {
        cluster: 'us2',
        wsHost: 'ws-us2.pusher.com',
        wsPort: 443,
        wssPort: 443,
        forceTLS: true,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
      });

      const channelName = `chatrooms.${chatroomId}.v2`;
      channelInstance = pusherInstance.subscribe(channelName);

      pusherInstance.connection.bind('connected', () => {
        set({ connected: true, connecting: false });
        get().addToast('Chat\'e bağlandı ✓', 'success');
      });

      pusherInstance.connection.bind('disconnected', () => {
        set({ connected: false });
      });

      pusherInstance.connection.bind('error', (err) => {
        console.error('Pusher error:', err);
        set({ connected: false, connecting: false });
        get().addToast('Bağlantı hatası', 'error');
      });

      // ── Yeni mesaj ──────────────────────────────────────────────
      channelInstance.bind('App\\Events\\ChatMessageEvent', (data) => {
        const msg = parseChatMessage(data);
        if (msg) get().addMessage(msg);
      });

      // ── Mesaj silindi ────────────────────────────────────────────
      channelInstance.bind('App\\Events\\ChatMessageDeletedEvent', (data) => {
        if (data?.message?.id) {
          get().deleteMessageById(data.message.id);
        }
      });

      // ── Kullanıcı banlandı ───────────────────────────────────────
      channelInstance.bind('App\\Events\\UserBannedEvent', (data) => {
        if (data?.user?.slug) {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.username?.toLowerCase() === data.user.slug?.toLowerCase()
                ? { ...m, deleted: true }
                : m
            ),
          }));
          get().addToast(`${data.user.username} banlandı`, 'warning');
        }
      });

      // ── Chat cleared ─────────────────────────────────────────────
      channelInstance.bind('App\\Events\\ChatroomClearEvent', () => {
        get().clearMessages();
        get().addToast('Chat temizlendi', 'warning');
      });

      // ── Diğer Kick Olayları (Kicks Puanı, Abonelikler vb.) ───────
      channelInstance.bind_global((eventName, data) => {
        const knownEvents = [
          'App\\Events\\ChatMessageEvent',
          'App\\Events\\ChatMessageDeletedEvent',
          'App\\Events\\UserBannedEvent',
          'App\\Events\\ChatroomClearEvent',
          'pusher:subscription_succeeded',
          'pusher:pong'
        ];
        
        if (!knownEvents.includes(eventName) && data) {
          // console.log('[Pusher Event]', eventName, data); // Debug için eklenebilir

          let sysMessage = null;

          // Abonelik olayı
          if (eventName === 'App\\Events\\SubscriptionEvent') {
            sysMessage = {
              content: `${data.username} abone oldu! (${data.months} ay)`,
              username: data.username || 'Sistem',
              color: '#feca57'
            };
          }
          // Hediye abonelik
          else if (eventName === 'App\\Events\\GiftedSubscriptionsEvent') {
            sysMessage = {
              content: `${data.gifter_username}, ${data.gifted_usernames?.length || 1} kişiye abonelik hediye etti!`,
              username: data.gifter_username || 'Sistem',
              color: '#feca57'
            };
          }
          // Host olayı
          else if (eventName === 'App\\Events\\StreamHostEvent') {
            sysMessage = {
              content: `${data.host_username}, yayını hostladı! (${data.number_viewers} izleyici)`,
              username: data.host_username || 'Sistem',
              color: '#48dbfb'
            };
          }
          // Kicks Puanı ile mağaza eşyası alımı / Diğer bildirimler
          // Genelde Event isminde ItemBuy, Kicks, Store gibi kelimeler geçer veya data içinde item bulunur
          else if (
            eventName.includes('ItemBuy') || 
            eventName.includes('Kicks') || 
            eventName.includes('Redemption') ||
            (data.item_name && data.cost) ||
            (data.reward && data.reward.cost)
          ) {
            // Kick puan yapısı genel olarak data.user, data.item_name / data.reward şeklinde gelir
            const buyer = data.username || data.user?.username || data.sender?.username || 'Biri';
            const item = data.item_name || data.reward?.title || data.title || 'bir eşya';
            
            sysMessage = {
              content: `${buyer}, Kicks puanıyla '${item}' aldı!`,
              username: buyer,
              color: '#10ac84' // Dikkat çekici yeşil
            };
          }

          if (sysMessage) {
            const msgObj = {
              id: String(Date.now() + Math.random()),
              content: sysMessage.content,
              username: sysMessage.username,
              displayName: sysMessage.username,
              color: sysMessage.color,
              badges: [],
              timestamp: new Date(),
              deleted: false,
              type: 'system',
              metadata: { is_system_notification: true }
            };
            get().addMessage(msgObj);
          }
        }
      });


      // ── Mesaj sabitlendi ─────────────────────────────────────────
      channelInstance.bind('App\\Events\\PinnedMessageCreatedEvent', (data) => {
        const pin = parseChatMessage(data?.message || data);
        if (pin) {
          get().setPinnedMessage(pin);
          get().addToast('Bir mesaj sabitlendi 📌', 'success');
        }
      });

      // ── Sabit mesaj kaldırıldı ───────────────────────────────────
      channelInstance.bind('App\\Events\\PinnedMessageDeletedEvent', () => {
        get().clearPinnedMessage();
      });
    }).catch((err) => {
      console.error('Pusher yüklenemedi:', err);
      set({ connecting: false });
      get().addToast('Pusher yüklenemedi', 'error');
    });
  },

  disconnectPusher: () => {
    if (channelInstance) {
      channelInstance.unbind_all();
      channelInstance = null;
    }
    if (pusherInstance) {
      pusherInstance.disconnect();
      pusherInstance = null;
    }
    set({ connected: false, connecting: false, channelInfo: null, chatroomId: null, messages: [], canModerate: false, isSubscriber: false, subscriberBadges: [], pinnedMessage: null, featuredMessages: [] });
  },
}));

// ── Mesaj Parser ────────────────────────────────────────────────────────

function parseChatMessage(data) {
  try {
    const msg = data;
    return {
      id: msg.id || String(Date.now()),
      content: msg.content || '',
      username: msg.sender?.username || msg.sender?.slug || 'Bilinmeyen',
      displayName: msg.sender?.username || 'Bilinmeyen',
      userId: msg.sender?.id,
      color: msg.sender?.identity?.color || generateColor(msg.sender?.username || ''),
      badges: parseBadges(msg.sender?.identity?.badges || []),
      timestamp: new Date(msg.created_at || Date.now()),
      deleted: false,
      type: msg.type || 'message',
      metadata: msg.metadata || null,
    };
  } catch (e) {
    console.error('Mesaj parse hatası:', e, data);
    return null;
  }
}

// Kanalın abone rozetleri arasından kullanıcının abone ay sayısına uygun olanı seç
export function pickSubscriberBadge(subscriberBadges, months) {
  if (!Array.isArray(subscriberBadges) || subscriberBadges.length === 0) return null;
  const m = Number(months) || 0;
  // months <= kullanıcının ayı olanlar arasında en yükseğini seç
  const eligible = subscriberBadges
    .filter((b) => (Number(b?.months) || 0) <= m)
    .sort((a, b) => (Number(b?.months) || 0) - (Number(a?.months) || 0));
  const chosen = eligible[0] || [...subscriberBadges].sort((a, b) => (Number(a?.months) || 0) - (Number(b?.months) || 0))[0];
  const src = chosen?.badge_image?.src || chosen?.badge_image?.srcset;
  return src ? { src, months: chosen?.months } : null;
}

function parseBadges(badges) {
  return badges.map((b) => ({
    type: b.type || b.text?.toLowerCase() || 'unknown',
    text: b.text || '',
    count: b.count,
  }));
}

function generateColor(username) {
  // Kick gibi deterministik renk üret
  const colors = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
    '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
    '#10ac84', '#ee5a24', '#0abde3', '#8395a7',
    '#c8d6e5', '#576574', '#222f3e',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
