import { invoke } from '../utils/tauri';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  source: string;
}

export interface SlackRealTimeEvent {
  type: 'message' | 'task_suggestion' | 'project_update' | 'event_detection';
  projectId?: string;
  channelId?: string;
  data: any;
}

export interface WebSocketConnection {
  id: string;
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private connectionConfigs: Map<string, WebSocketConnection> = new Map();
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Slack real-time API simulation (since Slack Events API requires webhooks)
  private slackPollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.setupHeartbeat();
  }

  /**
   * Connect to Slack real-time events (using polling simulation)
   */
  async connectToSlackRealTime(projectId: string): Promise<void> {
    const connectionId = `slack-realtime-${projectId}`;
    
    // Clear any existing polling
    this.disconnectSlackRealTime(projectId);
    
    // Set up connection config
    this.connectionConfigs.set(connectionId, {
      id: connectionId,
      url: `slack-realtime://${projectId}`,
      status: 'connecting',
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    });

    try {
      // Start polling for Slack changes
      const pollingInterval = setInterval(async () => {
        await this.pollSlackForChanges(projectId);
      }, 30000); // Poll every 30 seconds

      this.slackPollingIntervals.set(projectId, pollingInterval);
      
      // Update connection status
      const config = this.connectionConfigs.get(connectionId)!;
      config.status = 'connected';
      config.lastPing = new Date();
      
      
      // Notify handlers of connection
      this.notifyHandlers('connection', {
        type: 'connection',
        payload: { status: 'connected', projectId },
        timestamp: new Date().toISOString(),
        source: 'slack-realtime'
      });
      
    } catch (error) {
      const config = this.connectionConfigs.get(connectionId);
      if (config) {
        config.status = 'error';
      }
      throw error;
    }
  }

  /**
   * Disconnect from Slack real-time events
   */
  disconnectSlackRealTime(projectId: string): void {
    const connectionId = `slack-realtime-${projectId}`;
    
    // Clear polling interval
    const interval = this.slackPollingIntervals.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.slackPollingIntervals.delete(projectId);
    }
    
    // Update connection status
    const config = this.connectionConfigs.get(connectionId);
    if (config) {
      config.status = 'disconnected';
    }
    
  }

  /**
   * Connect to a generic WebSocket
   */
  async connectWebSocket(id: string, url: string): Promise<void> {
    // Close existing connection if any
    this.disconnectWebSocket(id);

    const config: WebSocketConnection = {
      id,
      url,
      status: 'connecting',
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };

    this.connectionConfigs.set(id, config);

    try {
      const websocket = new WebSocket(url);
      
      websocket.onopen = () => {
        config.status = 'connected';
        config.reconnectAttempts = 0;
        config.lastPing = new Date();
        
        this.notifyHandlers('connection', {
          type: 'connection',
          payload: { status: 'connected', id },
          timestamp: new Date().toISOString(),
          source: 'websocket'
        });
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(id, message);
        } catch (error) {
        }
      };

      websocket.onclose = () => {
        config.status = 'disconnected';
        
        // Attempt reconnection if not intentional
        if (config.reconnectAttempts < config.maxReconnectAttempts) {
          this.scheduleReconnection(id);
        }
      };

      websocket.onerror = (error) => {
        config.status = 'error';
      };

      this.connections.set(id, websocket);
      
    } catch (error) {
      config.status = 'error';
      throw error;
    }
  }

  /**
   * Disconnect a WebSocket
   */
  disconnectWebSocket(id: string): void {
    const websocket = this.connections.get(id);
    if (websocket) {
      websocket.close();
      this.connections.delete(id);
    }

    const config = this.connectionConfigs.get(id);
    if (config) {
      config.status = 'disconnected';
    }

    // Clear any pending reconnection
    const timeout = this.reconnectTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(id);
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(connectionId: string, message: any): boolean {
    const websocket = this.connections.get(connectionId);
    const config = this.connectionConfigs.get(connectionId);
    
    if (!websocket || !config || config.status !== 'connected') {
      return false;
    }

    try {
      websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, handler: (message: WebSocketMessage) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * Unsubscribe from message types
   */
  unsubscribe(messageType: string, handler: (message: WebSocketMessage) => void): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(id: string): WebSocketConnection | null {
    return this.connectionConfigs.get(id) || null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connectionConfigs.values());
  }

  /**
   * Check if connected to Slack real-time for a project
   */
  isConnectedToSlackRealTime(projectId: string): boolean {
    const connectionId = `slack-realtime-${projectId}`;
    const config = this.connectionConfigs.get(connectionId);
    return config?.status === 'connected' || false;
  }

  // Private methods

  private async pollSlackForChanges(projectId: string): Promise<void> {
    try {
      // Check for new AI-generated items
      const pendingItems = await invoke('get_pending_ai_items', { projectId });
      
      if (pendingItems && (
        pendingItems.ai_tasks?.length > 0 ||
        pendingItems.ai_events?.length > 0 ||
        pendingItems.pending_updates?.length > 0
      )) {
        // Notify about new AI suggestions
        this.notifyHandlers('slack-ai-update', {
          type: 'slack-ai-update',
          payload: pendingItems,
          timestamp: new Date().toISOString(),
          source: 'slack-polling'
        });
      }

      // Update last ping time
      const connectionId = `slack-realtime-${projectId}`;
      const config = this.connectionConfigs.get(connectionId);
      if (config) {
        config.lastPing = new Date();
      }

    } catch (error) {
      
      // If polling fails consistently, mark as error
      const connectionId = `slack-realtime-${projectId}`;
      const config = this.connectionConfigs.get(connectionId);
      if (config) {
        config.status = 'error';
      }
    }
  }

  private handleWebSocketMessage(connectionId: string, message: WebSocketMessage): void {
    // Update last ping time
    const config = this.connectionConfigs.get(connectionId);
    if (config) {
      config.lastPing = new Date();
    }

    // Notify specific handlers
    this.notifyHandlers(message.type, message);
    
    // Notify general message handlers
    this.notifyHandlers('message', message);
  }

  private notifyHandlers(messageType: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
        }
      });
    }
  }

  private scheduleReconnection(connectionId: string): void {
    const config = this.connectionConfigs.get(connectionId);
    if (!config) return;

    config.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, config.reconnectAttempts), 30000); // Exponential backoff, max 30s


    const timeout = setTimeout(async () => {
      try {
        if (connectionId.startsWith('slack-realtime-')) {
          const projectId = connectionId.replace('slack-realtime-', '');
          await this.connectToSlackRealTime(projectId);
        } else {
          await this.connectWebSocket(connectionId, config.url);
        }
      } catch (error) {
      }
    }, delay);

    this.reconnectTimeouts.set(connectionId, timeout);
  }

  private setupHeartbeat(): void {
    // Send heartbeat every 30 seconds to maintain connections
    setInterval(() => {
      this.connections.forEach((websocket, id) => {
        if (websocket.readyState === WebSocket.OPEN) {
          this.sendMessage(id, {
            type: 'ping',
            timestamp: new Date().toISOString()
          });
        }
      });
    }, 30000);
  }

  /**
   * Cleanup all connections
   */
  disconnect(): void {
    // Disconnect all WebSockets
    this.connections.forEach((_, id) => {
      this.disconnectWebSocket(id);
    });

    // Disconnect all Slack real-time polling
    this.slackPollingIntervals.forEach((interval, projectId) => {
      clearInterval(interval);
      this.disconnectSlackRealTime(projectId);
    });

    // Clear all handlers
    this.messageHandlers.clear();
    
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    webSocketService.disconnect();
  });
}