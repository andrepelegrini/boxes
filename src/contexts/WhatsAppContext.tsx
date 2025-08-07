import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { whatsAppTaskService } from '../services/WhatsAppTaskService';
import { useSocket } from '../hooks/useSocket';

// Types matching the Node.js service backend
export interface WhatsAppMessage {
  id: string;
  from: string;
  to?: string;
  body: string;
  type: string;
  timestamp: number;
  isGroupMsg: boolean;
  author?: string;
  chatId: string;
  hasMedia: boolean;
  receivedAt: string;
  processed_by_llm: boolean;
  work_related?: boolean;
  task_priority?: string;
  created_at: number;
}

export interface HealthStatus {
  last_heartbeat: number;
  consecutive_failures: number;
  last_recovery_attempt?: number;
  gap_count: number;
  monitoring_active: boolean;
}

export interface WhatsAppConnectionState {
  status: 'Disconnected' | 'Connecting' | 'QrCodeReady' | 'Connected' | 'Monitoring' | 'Reconnecting' | { Error: string };
  qr_code?: string;
  connected_since?: number;
  last_message_timestamp?: number;
  message_count: number;
  active_chats: string[];
  health_status: HealthStatus;
}

interface WhatsAppContextType {
  // Connection state
  connectionState: WhatsAppConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isMonitoring: boolean;
  qrCode?: string;
  isActivelyFetching: boolean;
  
  // Actions
  connect: (lookbackDays?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  refetchMessages: (lookbackDays?: number) => Promise<void>;
  checkLogin: () => Promise<void>;
  
  // Message handling
  getUnprocessedMessages: (limit?: number) => Promise<WhatsAppMessage[]>;
  markMessageProcessed: (messageId: string, workRelated: boolean, taskPriority?: string) => Promise<void>;
  
  // Status
  refreshStatus: () => Promise<void>;
  error?: string;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

// Singleton state to prevent duplicate initialization
let whatsAppGlobalState: {
  isInitialized: boolean;
  isInitializing: boolean;
  isServiceMissing: boolean;
  lastHealthCheck: number;
  healthCheckInterval: number;
} = {
  isInitialized: false,
  isInitializing: false,
  isServiceMissing: false,
  lastHealthCheck: 0,
  healthCheckInterval: 30000, // 30 seconds
};

export const WhatsAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'Disconnected',
    message_count: 0,
    active_chats: [],
    health_status: {
      last_heartbeat: 0,
      consecutive_failures: 0,
      gap_count: 0,
      monitoring_active: false,
    },
  });
  const [error, setError] = useState<string>();
  const [isServiceMissing, setIsServiceMissing] = useState(whatsAppGlobalState.isServiceMissing);

  // Setup socket connection for real-time WhatsApp status updates
  const socket = useSocket({}, {
    onConnect: () => {
      console.log('[WHATSAPP-DEBUG] Socket connected for WhatsApp updates');
    },
    onDisconnect: (reason) => {
      console.log('[WHATSAPP-DEBUG] Socket disconnected:', reason);
    },
    onError: (error) => {
      console.log('[WHATSAPP-DEBUG] Socket connection failed (expected if backend services not running):', error.message);
    }
  });

  // Computed states
  const isConnected = connectionState.status === 'Connected' || connectionState.status === 'Monitoring';
  const isConnecting = connectionState.status === 'Connecting';
  const isMonitoring = connectionState.status === 'Monitoring';
  const qrCode = connectionState.qr_code;
  
  // Additional computed state to detect active message fetching
  const hasRecentActivity = () => {
    const now = Date.now() / 1000;
    const timeSinceLastHeartbeat = now - connectionState.health_status.last_heartbeat;
    const hasRecentMessages = connectionState.message_count > 0;
    const hasRecentHeartbeat = timeSinceLastHeartbeat < 300; // Less than 5 minutes
    
    return hasRecentMessages && hasRecentHeartbeat;
  };
  
  const isActivelyFetching = hasRecentActivity();

  // Listen for WhatsApp status changes from Socket.io
  useEffect(() => {
    if (socket.socket?.connected) {
      const handleWhatsAppStatusChange = (statusData: any) => {
        console.log('[WHATSAPP-DEBUG] Received WhatsApp status change via socket:', statusData);
        
        // Map backend status to frontend status
        let frontendStatus: WhatsAppConnectionState['status'] = 'Disconnected';
        switch (statusData.status) {
          case 'disconnected':
            frontendStatus = 'Disconnected';
            break;
          case 'connecting':
            frontendStatus = 'Connecting';
            break;
          case 'qr_ready':
            frontendStatus = 'QrCodeReady';
            break;
          case 'connected':
            frontendStatus = 'Connected';
            break;
          case 'error':
            frontendStatus = { Error: statusData.last_error || 'Unknown error' };
            break;
        }

        const newState: WhatsAppConnectionState = {
          status: frontendStatus,
          qr_code: statusData.qr_code,
          connected_since: statusData.connected_since ? new Date(statusData.connected_since).getTime() / 1000 : undefined,
          message_count: statusData.message_count || 0,
          active_chats: [],
          health_status: {
            last_heartbeat: Date.now() / 1000,
            consecutive_failures: 0,
            gap_count: 0,
            monitoring_active: statusData.isReady || false,
          },
        };

        setConnectionState(newState);
        setError(undefined);
      };

      socket.socket.on('whatsapp-status-changed', handleWhatsAppStatusChange);

      return () => {
        socket.socket?.off('whatsapp-status-changed', handleWhatsAppStatusChange);
      };
    }
  }, [socket.socket?.connected, socket.socket]);

  // Fallback polling for initial load and when socket is not connected
  useEffect(() => {
    if (!socket.socket?.connected && !whatsAppGlobalState.isServiceMissing) {
      const interval = setInterval(() => {
        const now = Date.now();
        // Only check if enough time has passed since last check
        if (now - whatsAppGlobalState.lastHealthCheck > whatsAppGlobalState.healthCheckInterval) {
          refreshStatus();
          whatsAppGlobalState.lastHealthCheck = now;
        }
      }, whatsAppGlobalState.healthCheckInterval);
      return () => clearInterval(interval);
    }
  }, [socket.socket?.connected]);

  // Initial status load with singleton pattern
  useEffect(() => {
    const initialLoad = async () => {
      // If already initialized or initializing, skip
      if (whatsAppGlobalState.isInitialized || whatsAppGlobalState.isInitializing) {
        return;
      }

      // If service is already known to be missing, skip
      if (whatsAppGlobalState.isServiceMissing) {
        setIsServiceMissing(true);
        setConnectionState({
          status: { Error: 'WhatsApp service not running. Please start the whatsapp-service on port 3001.' },
          message_count: 0,
          active_chats: [],
          health_status: {
            last_heartbeat: 0,
            consecutive_failures: 0,
            gap_count: 0,
            monitoring_active: false,
          },
        });
        return;
      }

      whatsAppGlobalState.isInitializing = true;
      const initId = Math.random().toString(36).substr(2, 9);
      console.log(`[WHATSAPP-DEBUG] Starting WhatsApp context initialization... (Init ID: ${initId})`);
      
      // Check if Node.js WhatsApp service is running on port 3001
      try {
        console.log('[WHATSAPP-DEBUG] Checking WhatsApp service status on localhost:3001...');
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          const health = await response.json();
          console.log('[WHATSAPP-DEBUG] WhatsApp service is running:', health);
        } else {
          throw new Error(`Service not responding: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.error('[WHATSAPP-DEBUG] WhatsApp service check failed:', err);
        console.log('[WHATSAPP-DEBUG] Make sure the whatsapp-service is running on port 3001');
        
        whatsAppGlobalState.isServiceMissing = true;
        setIsServiceMissing(true);
        setConnectionState({
          status: { Error: 'WhatsApp service not running. Please start the whatsapp-service on port 3001.' },
          message_count: 0,
          active_chats: [],
          health_status: {
            last_heartbeat: 0,
            consecutive_failures: 0,
            gap_count: 0,
            monitoring_active: false,
          },
        });
        setError('WhatsApp service is not available on port 3001');
        whatsAppGlobalState.isInitializing = false;
        return;
      }
      
      // Try to get initial status
      try {
        await refreshStatus();
        console.log('[WHATSAPP-DEBUG] Initial status retrieved successfully');
      } catch (err) {
        console.log('[WHATSAPP-DEBUG] Initial status retrieval failed (service may not be running):', err);
        setConnectionState({
          status: 'Disconnected',
          message_count: 0,
          active_chats: [],
          health_status: {
            last_heartbeat: 0,
            consecutive_failures: 0,
            gap_count: 0,
            monitoring_active: false,
          },
        });
        setError('WhatsApp service is not available');
      } finally {
        whatsAppGlobalState.isInitialized = true;
        whatsAppGlobalState.isInitializing = false;
      }
    };
    
    initialLoad();
  }, []);

  const refreshStatus = async () => {
    // If service is known to be missing, skip the check
    if (whatsAppGlobalState.isServiceMissing) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const status = await response.json();
      setConnectionState(status);
      setError(undefined);
    } catch (err) {
      // Only log occasionally to avoid spam
      const now = Date.now();
      const timeSinceLastLog = now - whatsAppGlobalState.lastHealthCheck;
      
      if (timeSinceLastLog > 60000) { // Only log every minute
        console.log('[WHATSAPP-DEBUG] Failed to get WhatsApp status (service may not be running):', err);
        whatsAppGlobalState.lastHealthCheck = now;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const connect = async (lookbackDays?: number) => {
    try {
      setError(undefined);
      const response = await fetch(`http://localhost:3001/connect?lookback_days=${lookbackDays || 7}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh status to get the latest state
      setTimeout(() => refreshStatus(), 500);
      
      // If connected immediately, start monitoring (though monitoring is automatic in Node.js service)
      if (result.status === 'Connected') {
        await startMonitoring();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const disconnect = async () => {
    try {
      setError(undefined);
      
      // Stop task discovery service
      whatsAppTaskService.stopAutoProcessing();
      
      const response = await fetch('http://localhost:3001/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const startMonitoring = async () => {
    try {
      setError(undefined);
      // For the Node.js service, monitoring is automatic when connected
      // Just refresh status and start task processing
      await refreshStatus();
      
      // Start automatic task discovery
      whatsAppTaskService.startAutoProcessing();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const getUnprocessedMessages = async (limit?: number): Promise<WhatsAppMessage[]> => {
    try {
      const response = await fetch(`http://localhost:3001/messages/unprocessed?limit=${limit || 50}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const messages = await response.json();
      return messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    }
  };

  const markMessageProcessed = async (messageId: string, workRelated: boolean, taskPriority?: string) => {
    try {
      const response = await fetch(`http://localhost:3001/messages/${messageId}/mark-processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_related: workRelated,
          task_priority: taskPriority,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const refetchMessages = async (lookbackDays?: number) => {
    try {
      setError(undefined);
      const response = await fetch(`http://localhost:3001/messages/refetch?lookback_days=${lookbackDays || 7}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      await refreshStatus();
      
      // Trigger task service to process the messages
      whatsAppTaskService.processUnprocessedMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const checkLogin = async () => {
    try {
      setError(undefined);
      await refreshStatus();
      
      // If now connected, start task processing
      if (connectionState.status === 'Connected' || connectionState.status === 'Monitoring') {
        whatsAppTaskService.startAutoProcessing();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const value: WhatsAppContextType = {
    connectionState,
    isConnected,
    isConnecting,
    isMonitoring,
    qrCode,
    connect,
    disconnect,
    startMonitoring,
    refetchMessages,
    checkLogin,
    getUnprocessedMessages,
    markMessageProcessed,
    refreshStatus,
    error,
    isActivelyFetching,
  };

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
};

export const useWhatsApp = () => {
  const context = useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
};