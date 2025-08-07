import { useState, useCallback, useEffect, useRef } from 'react';

export interface SlackWebSocketStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: string;
  lastError?: string;
  connectionAttempts: number;
}

export interface SlackWebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface UseSlackWebSocketReturn {
  status: SlackWebSocketStatus;
  messages: SlackWebSocketMessage[];
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => void;
  clearMessages: () => void;
}

export function useSlackWebSocket(): UseSlackWebSocketReturn {
  const [status, setStatus] = useState<SlackWebSocketStatus>({
    isConnected: false,
    isConnecting: false,
    connectionAttempts: 0,
  });
  
  const [messages, setMessages] = useState<SlackWebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (status.isConnected || status.isConnecting) {
      return;
    }

    setStatus(prev => ({
      ...prev,
      isConnecting: true,
      connectionAttempts: prev.connectionAttempts + 1,
    }));

    // Note: In a real implementation, this would connect to Slack's WebSocket API
    // For now, this is a placeholder that simulates connection
    
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date().toISOString(),
        lastError: '',
      }));
    }, 1000);
  }, [status.isConnected, status.isConnecting]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
    
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (!status.isConnected) {
      return;
    }

    // In a real implementation, this would send via WebSocket
    
    // Simulate receiving a response
    const responseMessage: SlackWebSocketMessage = {
      type: `${type}_response`,
      data: { success: true, originalData: data },
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [responseMessage, ...prev].slice(0, 100)); // Keep last 100 messages
  }, [status.isConnected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    messages,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
  };
}