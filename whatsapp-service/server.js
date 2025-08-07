const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { io: SocketClient } = require('socket.io-client');
const axios = require('axios');

// Enhanced logging utility
const log = {
    info: (message, data = null) => {
        // Logging disabled
    },
    warn: (message, data = null) => {
        // Logging disabled
    },
    error: (message, error = null) => {
        // Logging disabled
    },
    debug: (message, data = null) => {
        // Logging disabled
    }
};

class WhatsAppService {
    constructor() {
        log.info('🚀 Initializing WhatsApp Service...');
        
        this.client = null;
        this.isReady = false;
        this.currentQR = null;
        this.status = 'disconnected'; // disconnected, connecting, qr_ready, connected, error
        this.lastError = null;
        this.messageCount = 0;
        this.connectedSince = null;
        this.messages = []; // Store recent messages
        this.lookbackDays = 7; // Default lookback period
        this.queuedStatusChange = null; // Store status changes when socket is not connected
        
        this.initializeClient();
        this.setupSocketClient();
        this.setupExpress();
        
        // Check for existing session and auto-connect if available
        this.checkExistingSession();
        
        log.info('✅ WhatsApp Service initialization complete');
    }
    
    initializeClient() {
        log.info('🔧 Setting up WhatsApp Web client...');
        
        try {
            // Initialize WhatsApp client with local authentication
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: 'project-boxes-whatsapp',
                    dataPath: './whatsapp-session'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });
            
            this.setupClientEvents();
            log.info('✅ WhatsApp Web client setup complete');
            
        } catch (error) {
            log.error('❌ Failed to initialize WhatsApp client', error);
            this.status = 'error';
            this.lastError = error.message;
        }
    }

    setupSocketClient() {
        log.info('🔗 Setting up Socket.io client connection...');
        
        try {
            this.socketClient = SocketClient('http://localhost:3007', {
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                timeout: 20000,
                transports: ['websocket', 'polling']
            });
    
            // Enhanced error handling
            this.socketClient.on('connect_error', (error) => {
                log.error('Socket connection error:', error);
                this.retryConnection();
            });
    
            // Add retry mechanism
            this.socketClient.on('disconnect', () => {
                log.warn('🔌 Disconnected from Socket.io server');
                setTimeout(() => this.socketClient.connect(), 5000);
            });
        } catch (error) {
            log.error('❌ Failed to setup Socket.io client', error);
        }
    }

    // Add retry method
    retryConnection() {
        if (!this.socketClient.connected) {
            log.info('Attempting to reconnect to Socket.io server...');
            setTimeout(() => {
                this.socketClient.connect();
            }, 5000);
        }
    }

    emitStatusChange() {
        const statusData = {
            status: this.status,
            isReady: this.isReady,
            qr_code: this.currentQR,
            connected_since: this.connectedSince,
            message_count: this.messageCount,
            last_error: this.lastError,
            timestamp: new Date().toISOString()
        };

        if (this.socketClient?.connected) {
            this.socketClient.emit('whatsapp-status-changed', statusData);
            // Status change emitted via Socket.io (debug logging disabled)
        } else {
            log.warn('🔌 Cannot emit status change - Socket.io not connected', { 
                status: this.status, 
                socketConnected: false,
                hasSocketClient: !!this.socketClient
            });
            
            // Queue the status change for when socket connects
            this.queuedStatusChange = statusData;
            
            // Try to emit after a short delay
            setTimeout(() => {
                if (this.socketClient?.connected && this.queuedStatusChange) {
                    this.socketClient.emit('whatsapp-status-changed', this.queuedStatusChange);
                    log.info('✅ Queued status change emitted after delay', { status: this.queuedStatusChange.status });
                    this.queuedStatusChange = null;
                }
            }, 2000);
        }
    }
    
    setupClientEvents() {
        log.info('🔗 Setting up WhatsApp client event handlers...');
        
        // QR Code event
        this.client.on('qr', async (qr) => {
            log.info('📱 QR Code received from WhatsApp Web');
            try {
                // Generate QR code as base64 data URL
                this.currentQR = await QRCode.toDataURL(qr);
                this.status = 'qr_ready';
                this.lastError = null;
                
                log.info('✅ QR Code generated successfully', {
                    qrLength: this.currentQR.length,
                    status: this.status
                });
                this.emitStatusChange();
            } catch (error) {
                log.error('❌ Failed to generate QR code', error);
                this.status = 'error';
                this.lastError = 'Failed to generate QR code';
                this.emitStatusChange();
            }
        });
        
        // Ready event
        this.client.on('ready', async () => {
            log.info('🎉 WhatsApp Web client is ready!');
            this.isReady = true;
            this.status = 'connected';
            this.connectedSince = new Date().toISOString();
            this.currentQR = null; // Clear QR code
            this.lastError = null;
            
            log.info('✅ WhatsApp connection established', {
                status: this.status,
                connectedSince: this.connectedSince
            });

            // Fetch historical messages based on lookback period
            try {
                log.info('📥 Fetching historical messages on connection', { lookbackDays: this.lookbackDays });
                
                const lookbackDate = new Date();
                lookbackDate.setDate(lookbackDate.getDate() - this.lookbackDays);
                
                const chats = await this.client.getChats();
                let historicalMessages = [];
                
                for (const chat of chats.slice(0, 10)) { // Limit to first 10 chats on initial load
                    try {
                        const messages = await chat.fetchMessages({ limit: 50 });
                        
                        const recentMessages = messages.filter(msg => {
                            const msgDate = new Date(msg.timestamp * 1000);
                            return msgDate >= lookbackDate;
                        });
                        
                        for (const message of recentMessages) {
                            const processedMessage = {
                                id: message.id._serialized,
                                from: message.from,
                                to: message.to,
                                body: message.body,
                                type: message.type,
                                timestamp: new Date(message.timestamp * 1000).toISOString(),
                                isGroupMsg: message.isGroupMsg,
                                author: message.author,
                                chatId: message.id.remote,
                                hasMedia: message.hasMedia,
                                receivedAt: new Date(message.timestamp * 1000).toISOString()
                            };
                            
                            historicalMessages.push(processedMessage);
                        }
                        
                    } catch (chatError) {
                        log.warn('⚠️ Failed to fetch initial messages from chat', { 
                            chatId: chat.id._serialized, 
                            error: chatError.message 
                        });
                    }
                }
                
                // Sort and store messages
                historicalMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                this.messages = historicalMessages.slice(0, 100);
                this.messageCount = historicalMessages.length;
                
                log.info('✅ Historical messages fetched on connection');

                // Send historical messages to AI service for analysis
                if (historicalMessages.length > 0) {
                    try {
                        log.info('📤 Sending historical messages for AI analysis');

                        const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3005';
                        const response = await axios.post(`${queueServiceUrl}/api/queue/whatsapp/analyze`, {
                            messages: historicalMessages,
                            analysisType: 'task-detection',
                            context: {
                                source: 'whatsapp-historical',
                                lookbackDays: this.lookbackDays
                            }
                        });

                        log.info('✅ Historical messages sent for AI analysis successfully');
                    } catch (aiError) {
                        log.error('❌ Failed to send historical messages for AI analysis', aiError);
                    }
                }
                
            } catch (error) {
                log.error('❌ Failed to fetch historical messages on connection', error);
            }
            
            // Emit status change after everything is ready
            this.emitStatusChange();
        });
        
        // Authentication success
        this.client.on('authenticated', () => {
            log.info('🔐 WhatsApp authentication successful');
        });
        
        // Authentication failure
        this.client.on('auth_failure', (message) => {
            log.error('🔒 WhatsApp authentication failed', { message });
            this.status = 'error';
            this.lastError = 'Authentication failed: ' + message;
            this.emitStatusChange();
        });
        
        // Disconnection
        this.client.on('disconnected', (reason) => {
            log.warn('🔌 WhatsApp client disconnected', { reason });
            this.isReady = false;
            this.status = 'disconnected';
            this.connectedSince = null;
            this.currentQR = null;
            this.emitStatusChange();
        });
        
        // Message received
        this.client.on('message', async (message) => {
            // New message received (silent logging)
            
            try {
                // Process and store message
                const processedMessage = {
                    id: message.id._serialized,
                    from: message.from,
                    to: message.to,
                    body: message.body,
                    type: message.type,
                    timestamp: new Date(message.timestamp * 1000).toISOString(),
                    isGroupMsg: message.isGroupMsg,
                    author: message.author,
                    chatId: message.from,
                    hasMedia: message.hasMedia,
                    receivedAt: new Date().toISOString()
                };
                
                // Store in recent messages (keep last 100)
                this.messages.unshift(processedMessage);
                if (this.messages.length > 100) {
                    this.messages = this.messages.slice(0, 100);
                }
                
                this.messageCount++;
                
                // Message processed and stored (silent)

                // Send new message to AI service for analysis
                try {
                    // Sending new message for AI analysis (silent)

                    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3005';
                    const response = await axios.post(`${queueServiceUrl}/api/queue/whatsapp/analyze`, {
                        messages: [processedMessage],
                        analysisType: 'task-detection',
                        context: {
                            source: 'whatsapp-realtime',
                            messageId: processedMessage.id
                        }
                    });

                    // New message sent for AI analysis successfully (silent)
                } catch (aiError) {
                    log.error('❌ Failed to send new message for AI analysis', aiError);
                }
                
            } catch (error) {
                log.error('❌ Failed to process message', error);
            }
        });
        
        // Error handling
        this.client.on('change_state', (state) => {
            log.debug('🔄 WhatsApp client state changed', { state });
        });
        
        log.info('✅ WhatsApp client event handlers setup complete');
    }
    
    async checkExistingSession() {
        log.info('🔍 Checking for existing WhatsApp session...');
        
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Check if session directory exists
            const sessionPath = path.join(__dirname, 'whatsapp-session', 'session-project-boxes-whatsapp');
            
            if (fs.existsSync(sessionPath)) {
                log.info('📁 Session directory found, attempting auto-connect...');
                
                // Set status to connecting
                this.status = 'connecting';
                this.emitStatusChange();
                
                // Auto-initialize the client to check existing session
                setTimeout(async () => {
                    try {
                        await this.client.initialize();
                        log.info('🔄 Auto-initialization started for existing session');
                    } catch (error) {
                        log.error('❌ Auto-initialization failed', error);
                        this.status = 'disconnected';
                        this.emitStatusChange();
                    }
                }, 2000); // Wait 2 seconds for all setup to complete
            } else {
                log.info('📂 No existing session found, staying disconnected');
            }
        } catch (error) {
            log.error('❌ Error checking existing session', error);
        }
    }
    
    setupExpress() {
        log.info('🌐 Setting up Express HTTP server...');
        
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        
        // Simplified request logging (only for important endpoints)
        this.app.use((req, res, next) => {
            if (req.path !== '/health' && req.path !== '/status') {
                log.debug(`📡 HTTP ${req.method} ${req.path}`);
            }
            next();
        });
        
        this.setupRoutes();
        
        const PORT = process.env.PORT || 3001;
        this.server = this.app.listen(PORT, () => {
            log.info(`🚀 WhatsApp Service HTTP server running on port ${PORT}`);
        });
    }
    
    setupRoutes() {
        log.info('🛣️ Setting up HTTP API routes...');
        
        // Health check
        this.app.get('/health', (req, res) => {
            const health = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                whatsapp: {
                    status: this.status,
                    isReady: this.isReady,
                    messageCount: this.messageCount,
                    connectedSince: this.connectedSince,
                    hasQR: !!this.currentQR,
                    lastError: this.lastError
                }
            };
            
            // Health check requested (silent)
            res.json(health);
        });
        
        // Get connection status
        this.app.get('/status', (req, res) => {
            const status = {
                status: this.status,
                isReady: this.isReady,
                qr_code: this.currentQR,
                connected_since: this.connectedSince,
                message_count: this.messageCount,
                last_error: this.lastError,
                health_status: {
                    last_heartbeat: Date.now(),
                    consecutive_failures: 0,
                    gap_count: 0,
                    monitoring_active: this.isReady
                }
            };
            
            // Status requested (silent)
            
            res.json(status);
        });
        
        // Connect/Initialize WhatsApp
        this.app.post('/connect', async (req, res) => {
            const lookbackDays = req.query.lookback_days ? parseInt(req.query.lookback_days) : 7;
            log.info('🔗 Connection request received', { lookbackDays });
            
            try {
                if (this.status === 'connected') {
                    log.warn('⚠️ Already connected, returning current status');
                    return res.json({ status: this.status, message: 'Already connected' });
                }
                
                if (this.status === 'connecting' || this.status === 'qr_ready') {
                    log.warn('⚠️ Connection in progress, returning current status');
                    return res.json({ status: this.status, message: 'Connection in progress' });
                }
                
                // Store lookback setting for message fetching
                this.lookbackDays = lookbackDays;
                
                log.info('🚀 Initializing WhatsApp Web connection...', { lookbackDays });
                this.status = 'connecting';
                this.emitStatusChange();
                
                await this.client.initialize();
                
                log.info('✅ WhatsApp Web initialization started');
                res.json({ status: this.status, message: 'Connection initiated' });
                
            } catch (error) {
                log.error('❌ Failed to connect WhatsApp', error);
                this.status = 'error';
                this.lastError = error.message;
                res.status(500).json({ error: error.message, status: this.status });
            }
        });
        
        // Disconnect WhatsApp
        this.app.post('/disconnect', async (req, res) => {
            log.info('🔌 Disconnect request received');
            
            try {
                if (this.client && typeof this.client.destroy === 'function') {
                    await this.client.destroy();
                    log.info('✅ WhatsApp client destroyed');
                }
                
                this.isReady = false;
                this.status = 'disconnected';
                this.connectedSince = null;
                this.currentQR = null;
                this.messageCount = 0;
                this.messages = [];
                this.emitStatusChange();
                
                log.info('✅ WhatsApp disconnection complete');
                res.json({ status: this.status, message: 'Disconnected successfully' });
                
            } catch (error) {
                log.error('❌ Failed to disconnect WhatsApp', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get recent messages
        this.app.get('/messages', (req, res) => {
            const limit = parseInt(req.query.limit) || 50;
            const messages = this.messages.slice(0, limit);
            
            log.debug('📬 Messages requested', {
                requestedLimit: limit,
                returnedCount: messages.length,
                totalAvailable: this.messages.length
            });
            
            res.json(messages);
        });
        
        // Get unprocessed messages (for compatibility with existing Tauri code)
        this.app.get('/messages/unprocessed', (req, res) => {
            const limit = parseInt(req.query.limit) || 50;
            // For now, return all recent messages as "unprocessed"
            const messages = this.messages.slice(0, limit).map(msg => ({
                ...msg,
                processed_by_llm: false,
                work_related: null,
                task_priority: null,
                created_at: Math.floor(new Date(msg.receivedAt).getTime() / 1000)
            }));
            
            log.debug('📥 Unprocessed messages requested', {
                requestedLimit: limit,
                returnedCount: messages.length
            });
            
            res.json(messages);
        });
        
        // Mark message as processed
        this.app.post('/messages/:messageId/mark-processed', (req, res) => {
            const { messageId } = req.params;
            const { work_related, task_priority } = req.body;
            
            log.info('✅ Message marked as processed', {
                messageId,
                work_related,
                task_priority
            });
            
            // In a real implementation, you'd update a database
            // For now, just acknowledge the request
            res.json({ success: true, messageId, work_related, task_priority });
        });

        // Refetch messages with lookback period
        this.app.post('/messages/refetch', async (req, res) => {
            const lookbackDays = req.query.lookback_days ? parseInt(req.query.lookback_days) : this.lookbackDays;
            
            log.info('🔄 Refetch messages requested', { lookbackDays });
            
            try {
                if (!this.isReady) {
                    return res.status(400).json({ 
                        error: 'WhatsApp not connected',
                        status: this.status 
                    });
                }

                // Update lookback setting
                this.lookbackDays = lookbackDays;
                
                log.info('📥 Fetching historical messages', { lookbackDays });
                
                // Calculate the date threshold
                const lookbackDate = new Date();
                lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
                
                // Get all chats
                const chats = await this.client.getChats();
                let totalMessages = [];
                
                for (const chat of chats) {
                    try {
                        // Fetch messages from this chat within the lookback period
                        const messages = await chat.fetchMessages({ 
                            limit: 100 // Limit per chat to avoid overwhelming
                        });
                        
                        // Filter messages within lookback period
                        const recentMessages = messages.filter(msg => {
                            const msgDate = new Date(msg.timestamp * 1000);
                            return msgDate >= lookbackDate;
                        });
                        
                        // Process messages
                        for (const message of recentMessages) {
                            const processedMessage = {
                                id: message.id._serialized,
                                from: message.from,
                                to: message.to,
                                body: message.body,
                                type: message.type,
                                timestamp: new Date(message.timestamp * 1000).toISOString(),
                                isGroupMsg: message.isGroupMsg,
                                author: message.author,
                                chatId: message.id.remote,
                                hasMedia: message.hasMedia,
                                receivedAt: new Date(message.timestamp * 1000).toISOString(),
                                processed_by_llm: false,
                                work_related: null,
                                task_priority: null,
                                created_at: message.timestamp * 1000
                            };
                            
                            totalMessages.push(processedMessage);
                        }
                        
                    } catch (chatError) {
                        log.warn('⚠️ Failed to fetch messages from chat', { 
                            chatId: chat.id._serialized, 
                            error: chatError.message 
                        });
                    }
                }
                
                // Sort by timestamp (newest first)
                totalMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Update our local messages cache
                this.messages = totalMessages.slice(0, 100); // Keep last 100
                
                log.info('✅ Messages refetched successfully', {
                    totalFetched: totalMessages.length,
                    lookbackDays,
                    dateFrom: lookbackDate.toISOString()
                });
                
                res.json(totalMessages);
                
            } catch (error) {
                log.error('❌ Failed to refetch messages', error);
                res.status(500).json({ 
                    error: error.message,
                    lookbackDays 
                });
            }
        });
        
        log.info('✅ HTTP API routes setup complete');
    }
    
    async shutdown() {
        log.info('🔄 Initiating graceful shutdown...');
        
        try {
            // Disconnect WhatsApp client
            if (this.client) {
                await this.client.destroy();
                log.info('✅ WhatsApp client disconnected');
            }
    
            // Close Socket.io connection
            if (this.socketClient) {
                this.socketClient.close();
                log.info('✅ Socket.io connection closed');
            }
    
            // Close Express server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
                log.info('✅ HTTP server closed');
            }
    
            log.info('✅ Shutdown complete');
            return true;
        } catch (error) {
            log.error('❌ Error during shutdown', error);
            return false;
        }
    }
}

// Initialize service
log.info('🌟 Starting WhatsApp Service...');

const service = new WhatsAppService();

// Graceful shutdown
process.on('SIGINT', async () => {
    log.info('🛑 Received SIGINT, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log.info('🛑 Received SIGTERM, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log.error('💥 Uncaught Exception', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log.error('💥 Unhandled Rejection', reason);
    process.exit(1);
});

log.info('🎉 WhatsApp Service startup complete!');


async function validateConfiguration() {
    const checks = [
        {
            name: 'Gemini API Key',
            check: async () => {
                const key = process.env.GEMINI_API_KEY;
                return {
                    valid: !!key,
                    message: key ? 'Valid' : 'Missing API key'
                };
            }
        },
        {
            name: 'WhatsApp Session Directory',
            check: async () => {
                const fs = require('fs').promises;
                try {
                    await fs.access('./whatsapp-session');
                    return { valid: true, message: 'Directory accessible' };
                } catch {
                    return { valid: false, message: 'Directory not accessible' };
                }
            }
        },
        {
            name: 'Chrome/Puppeteer',
            check: async () => {
                try {
                    const browser = await puppeteer.launch({ headless: true });
                    await browser.close();
                    return { valid: true, message: 'Browser launched successfully' };
                } catch (e) {
                    return { valid: false, message: e.message };
                }
            }
        }
    ];

    const results = await Promise.all(checks.map(async (check) => {
        const result = await check.check();
        return { name: check.name, ...result };
    }));

    return results;
}