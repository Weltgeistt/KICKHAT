require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pusher } = require('pusher-js');
const { initDB, saveMessage, markMessageDeleted, getUserMessages } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'kickhat-secret-key-123';

// Pusher instances keyed by chatroomId
const activeConnections = {};

async function start() {
    await initDB();

    app.get('/', (req, res) => res.send('Kickhat Bot is running.'));

    // Güvenlik Middleware (Sadece bizim uygulamamız erişebilir)
    app.use((req, res, next) => {
        const key = req.headers['x-api-key'] || req.query.key;
        if (key !== API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    });

    // Masaüstü uygulamasının botu bir kanala sokmasını sağlayan endpoint
    app.post('/api/bot/join', (req, res) => {
        const { channelSlug, chatroomId } = req.body;
        if (!channelSlug || !chatroomId) return res.status(400).json({ error: 'channelSlug and chatroomId required' });

        if (activeConnections[chatroomId]) {
            return res.json({ message: 'Already connected to ' + channelSlug });
        }

        const pusher = new Pusher('32cbd69e4b950bf97679', {
            cluster: 'us2',
            wsHost: 'ws-us2.pusher.com',
            wsPort: 443,
            wssPort: 443,
            forceTLS: true,
            disableStats: true,
            enabledTransports: ['ws', 'wss'],
        });

        const channelName = `chatrooms.${chatroomId}.v2`;
        const channel = pusher.subscribe(channelName);

        channel.bind('App\\Events\\ChatMessageEvent', (data) => {
            try {
                const msg = data;
                const dbMsg = {
                    id: msg.id,
                    channel_slug: channelSlug,
                    username: msg.sender?.username || msg.sender?.slug,
                    content: msg.content,
                    created_at: msg.created_at
                };
                if (dbMsg.username && dbMsg.content) {
                    saveMessage(dbMsg);
                }
            } catch (e) {
                console.error("Message parse error:", e);
            }
        });

        channel.bind('App\\Events\\ChatMessageDeletedEvent', (data) => {
            if (data?.message?.id) {
                markMessageDeleted(data.message.id);
            }
        });

        activeConnections[chatroomId] = pusher;
        console.log(`✅ Bot bağlandı: ${channelSlug} (Room: ${chatroomId})`);
        
        res.json({ message: 'Connected to ' + channelSlug });
    });

    // Kullanıcının geçmiş mesajlarını getiren endpoint
    app.get('/api/history/:channel_slug/:username', async (req, res) => {
        const { channel_slug, username } = req.params;
        const messages = await getUserMessages(channel_slug, username);
        res.json(messages);
    });

    app.listen(PORT, () => {
        console.log(`🚀 Kickhat Bot API çalışıyor: http://localhost:${PORT}`);
        console.log(`🔑 API Key: ${API_KEY}`);
    });
}

start();
