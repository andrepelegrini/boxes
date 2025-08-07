const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const winston = require('winston');
const redis = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
require('dotenv').config();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/socket-service.log' })
  ]
});

class SocketService {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = process.env.SOCKET_PORT || 3007;
    this.connectedClients = new Map();
    
    this.setupExpress();
    this.setupSocketIO();
    this.setupRedis();
    this.setupRoutes();
  }

  setupExpress() {
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true
    }));
    this.app.use(express.json());
  }

  async setupRedis() {
    if (process.env.REDIS_HOST) {
      try {
        const pubClient = redis.createClient({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        });
        
        const subClient = pubClient.duplicate();
        
        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);

        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis adapter configured for Socket.io clustering');
      } catch (error) {
        logger.warn('⚠️ Redis not available, running in single instance mode', { error: error.message });
      }
    }
  }

  setupSocketIO() {
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Health check endpoint
    this.io.engine.on('connection_error', (err) => {
      logger.error('Socket.io connection error:', err);
    });
  }

  handleConnection(socket) {
    const clientInfo = {
      id: socket.id,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: new Date(),
      rooms: new Set(),
      userId: null,
      projectId: null
    };

    this.connectedClients.set(socket.id, clientInfo);
    
    logger.info('🔌 Client connected', { 
      socketId: socket.id, 
      ip: clientInfo.ip,
      totalClients: this.connectedClients.size 
    });

    // Authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(socket, data);
    });

    // Room management
    socket.on('join-project', (projectId) => {
      this.handleJoinProject(socket, projectId);
    });

    socket.on('leave-project', (projectId) => {
      this.handleLeaveProject(socket, projectId);
    });

    socket.on('join-channel', (channelId) => {
      this.handleJoinChannel(socket, channelId);
    });

    // Real-time event subscriptions
    socket.on('subscribe-tasks', (projectId) => {
      socket.join(`tasks:${projectId}`);
      logger.info('📋 Client subscribed to tasks', { socketId: socket.id, projectId });
    });

    socket.on('subscribe-messages', (channelId) => {
      socket.join(`messages:${channelId}`);
      logger.info('💬 Client subscribed to messages', { socketId: socket.id, channelId });
    });

    socket.on('subscribe-ai-jobs', () => {
      socket.join('ai-jobs');
      logger.info('🤖 Client subscribed to AI jobs', { socketId: socket.id });
    });

    socket.on('subscribe-queue-jobs', (queue) => {
      socket.join(`queue:${queue}`);
      logger.info('⚡ Client subscribed to queue', { socketId: socket.id, queue });
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
      socket.to(`messages:${data.channelId}`).emit('user-typing', {
        userId: clientInfo.userId,
        channelId: data.channelId,
        timestamp: new Date()
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(`messages:${data.channelId}`).emit('user-stopped-typing', {
        userId: clientInfo.userId,
        channelId: data.channelId,
        timestamp: new Date()
      });
    });

    // Presence updates
    socket.on('update-presence', (status) => {
      clientInfo.presence = status;
      this.broadcastPresenceUpdate(socket, status);
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error', { socketId: socket.id, error });
    });
  }

  handleAuthentication(socket, data) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    // In a real app, verify the token here
    if (data.token && data.userId) {
      clientInfo.userId = data.userId;
      clientInfo.token = data.token;
      clientInfo.authenticated = true;
      
      socket.emit('authenticated', { success: true });
      logger.info('🔐 Client authenticated', { socketId: socket.id, userId: data.userId });
    } else {
      socket.emit('authenticated', { success: false, error: 'Invalid credentials' });
      logger.warn('❌ Authentication failed', { socketId: socket.id });
    }
  }

  handleJoinProject(socket, projectId) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (!clientInfo.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    const roomName = `project:${projectId}`;
    socket.join(roomName);
    clientInfo.rooms.add(roomName);
    clientInfo.projectId = projectId;

    socket.emit('joined-project', { projectId, memberCount: this.io.sockets.adapter.rooms.get(roomName)?.size || 1 });
    socket.to(roomName).emit('user-joined-project', { 
      userId: clientInfo.userId, 
      projectId,
      timestamp: new Date()
    });

    logger.info('🏢 Client joined project', { socketId: socket.id, projectId, userId: clientInfo.userId });
  }

  handleLeaveProject(socket, projectId) {
    const clientInfo = this.connectedClients.get(socket.id);
    const roomName = `project:${projectId}`;
    
    socket.leave(roomName);
    clientInfo.rooms.delete(roomName);
    
    if (clientInfo.projectId === projectId) {
      clientInfo.projectId = null;
    }

    socket.to(roomName).emit('user-left-project', { 
      userId: clientInfo.userId, 
      projectId,
      timestamp: new Date()
    });

    logger.info('🚪 Client left project', { socketId: socket.id, projectId, userId: clientInfo.userId });
  }

  handleJoinChannel(socket, channelId) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (!clientInfo.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    const roomName = `channel:${channelId}`;
    socket.join(roomName);
    clientInfo.rooms.add(roomName);

    socket.emit('joined-channel', { channelId });
    logger.info('📺 Client joined channel', { socketId: socket.id, channelId, userId: clientInfo.userId });
  }

  broadcastPresenceUpdate(socket, status) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    // Broadcast to all rooms the user is in
    clientInfo.rooms.forEach(room => {
      socket.to(room).emit('presence-update', {
        userId: clientInfo.userId,
        status,
        timestamp: new Date()
      });
    });
  }

  handleDisconnection(socket, reason) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (clientInfo) {
      // Notify rooms about user leaving
      clientInfo.rooms.forEach(room => {
        socket.to(room).emit('user-disconnected', {
          userId: clientInfo.userId,
          timestamp: new Date()
        });
      });

      this.connectedClients.delete(socket.id);
      
      logger.info('🔌 Client disconnected', { 
        socketId: socket.id, 
        userId: clientInfo.userId,
        reason,
        duration: new Date() - clientInfo.connectedAt,
        totalClients: this.connectedClients.size 
      });
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'socket-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedClients: this.connectedClients.size,
        rooms: this.io.sockets.adapter.rooms.size
      });
    });

    // Broadcast endpoint for other services
    this.app.post('/api/broadcast', (req, res) => {
      const { room, event, data } = req.body;
      
      if (!room || !event) {
        return res.status(400).json({ error: 'Room and event are required' });
      }

      this.io.to(room).emit(event, data);
      
      logger.info('📢 Broadcast sent', { room, event, dataKeys: Object.keys(data || {}) });
      
      res.json({ 
        success: true, 
        recipients: this.io.sockets.adapter.rooms.get(room)?.size || 0 
      });
    });

    // Get connected clients info
    this.app.get('/api/clients', (req, res) => {
      const clients = Array.from(this.connectedClients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        connectedAt: client.connectedAt,
        rooms: Array.from(client.rooms),
        authenticated: client.authenticated || false,
        presence: client.presence
      }));

      res.json({ clients, count: clients.length });
    });

    // Get room info
    this.app.get('/api/rooms/:roomName', (req, res) => {
      const { roomName } = req.params;
      const room = this.io.sockets.adapter.rooms.get(roomName);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const members = Array.from(room).map(socketId => {
        const client = this.connectedClients.get(socketId);
        return client ? {
          socketId,
          userId: client.userId,
          connectedAt: client.connectedAt,
          presence: client.presence
        } : { socketId };
      });

      res.json({
        roomName,
        memberCount: room.size,
        members
      });
    });
  }

  // Methods for other services to trigger events
  broadcastTaskUpdate(projectId, taskData) {
    this.io.to(`tasks:${projectId}`).emit('task-updated', {
      projectId,
      task: taskData,
      timestamp: new Date()
    });
  }

  broadcastNewMessage(channelId, messageData) {
    this.io.to(`messages:${channelId}`).emit('new-message', {
      channelId,
      message: messageData,
      timestamp: new Date()
    });
  }

  broadcastJobUpdate(jobData) {
    // Broadcast to specific queue listeners
    this.io.to(`queue:${jobData.queue}`).emit('job-updated', jobData);
    
    // Broadcast AI jobs to AI subscribers
    if (jobData.queue === 'ai-analysis') {
      this.io.to('ai-jobs').emit('ai-job-updated', jobData);
    }
  }

  broadcastProjectUpdate(projectId, updateData) {
    this.io.to(`project:${projectId}`).emit('project-updated', {
      projectId,
      update: updateData,
      timestamp: new Date()
    });
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`🚀 Socket.io service running on port ${this.port}`);
      logger.info(`📡 WebSocket endpoint: ws://localhost:${this.port}`);
      logger.info(`🌐 Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Create and start the service
const socketService = new SocketService();
socketService.start();

// Export for programmatic access
module.exports = socketService;