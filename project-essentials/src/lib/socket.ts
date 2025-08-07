import { io, Socket } from 'socket.io-client';
import { queryClient, invalidateQueries } from './queryClient';

class SocketManager {
  private socket: Socket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url = 'http://localhost:3007') {
    if (this.socket) {
      return this.socket;
    }


    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
    });

    // Real-time data update events
    this.socket.on('project:updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['api', 'projects', data.projectId] });
      invalidateQueries.projects();
    });

    this.socket.on('task:created', (data) => {
      invalidateQueries.tasks();
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['api', 'projects', data.projectId] });
      }
    });

    this.socket.on('task:updated', (data) => {
      invalidateQueries.tasks();
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['api', 'projects', data.projectId] });
      }
    });

    this.socket.on('slack:message', (data) => {
      invalidateQueries.slack();
    });

    this.socket.on('whatsapp:message', (data) => {
      invalidateQueries.whatsapp();
    });

    this.socket.on('ai:analysis:complete', (data) => {
      queryClient.invalidateQueries({ queryKey: ['api', 'ai', 'job', data.jobId] });
      
      // Invalidate related data based on analysis type
      if (data.type === 'task-analysis') {
        invalidateQueries.tasks();
      } else if (data.type === 'project-updates') {
        invalidateQueries.projects();
      }
    });

    // System notifications
    this.socket.on('notification', (data) => {
      // You could integrate with a toast notification system here
      // toast.info(data.message);
    });
  }

  emit(event: string, data: any) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }

  // Subscribe to specific project updates
  subscribeToProject(projectId: string) {
    this.emit('subscribe:project', { projectId });
  }

  unsubscribeFromProject(projectId: string) {
    this.emit('unsubscribe:project', { projectId });
  }

  // Subscribe to AI job updates
  subscribeToAIJob(jobId: string) {
    this.emit('subscribe:ai-job', { jobId });
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

// React hook for Socket.io
export function useSocket() {
  return {
    connect: socketManager.connect.bind(socketManager),
    disconnect: socketManager.disconnect.bind(socketManager),
    emit: socketManager.emit.bind(socketManager),
    isConnected: socketManager.isConnected.bind(socketManager),
    subscribeToProject: socketManager.subscribeToProject.bind(socketManager),
    unsubscribeFromProject: socketManager.unsubscribeFromProject.bind(socketManager),
    subscribeToAIJob: socketManager.subscribeToAIJob.bind(socketManager),
  };
}

export default socketManager;