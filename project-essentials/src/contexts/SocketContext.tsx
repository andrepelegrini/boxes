import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface SocketContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  reconnectAttempt: number;
  
  // Authentication
  authenticate: (userId: string, token: string) => void;
  
  // Room management
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinChannel: (channelId: string) => void;
  
  // Subscriptions
  subscribeToTasks: (projectId: string) => void;
  subscribeToMessages: (channelId: string) => void;
  subscribeToAIJobs: () => void;
  subscribeToQueue: (queue: string) => void;
  
  // Interactions
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  updatePresence: (status: string) => void;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
  userId?: string;
  token?: string;
  autoConnect?: boolean;
}

export function SocketProvider({ 
  children, 
  userId, 
  token, 
  autoConnect = true 
}: SocketProviderProps) {
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [currentToken, setCurrentToken] = useState(token);

  const socket = useSocket(
    { autoConnect },
    { 
      userId: currentUserId, 
      token: currentToken,
      onConnect: () => {
      },
      onDisconnect: (reason) => {
      },
      onError: (error) => {
      }
    }
  );

  // Update credentials when props change
  useEffect(() => {
    if (userId !== currentUserId || token !== currentToken) {
      setCurrentUserId(userId);
      setCurrentToken(token);
      
      if (userId && token && socket.isConnected) {
        socket.authenticate(userId, token);
      }
    }
  }, [userId, token, currentUserId, currentToken, socket]);

  const contextValue: SocketContextType = {
    isConnected: socket.isConnected,
    isAuthenticated: socket.isAuthenticated,
    error: socket.error,
    reconnectAttempt: socket.reconnectAttempt,
    
    authenticate: (authUserId: string, authToken: string) => {
      setCurrentUserId(authUserId);
      setCurrentToken(authToken);
      socket.authenticate(authUserId, authToken);
    },
    
    joinProject: socket.joinProject,
    leaveProject: socket.leaveProject,
    joinChannel: socket.joinChannel,
    subscribeToTasks: socket.subscribeToTasks,
    subscribeToMessages: socket.subscribeToMessages,
    subscribeToAIJobs: socket.subscribeToAIJobs,
    subscribeToQueue: socket.subscribeToQueue,
    startTyping: socket.startTyping,
    stopTyping: socket.stopTyping,
    updatePresence: socket.updatePresence,
    connect: socket.connect,
    disconnect: socket.disconnect,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}

// Convenience hooks that use the context
export function useProjectConnection(projectId: string) {
  const socket = useSocketContext();
  
  useEffect(() => {
    if (socket.isAuthenticated && projectId) {
      socket.joinProject(projectId);
      socket.subscribeToTasks(projectId);
      
      return () => {
        socket.leaveProject(projectId);
      };
    }
  }, [socket.isAuthenticated, projectId, socket]);

  return {
    isConnected: socket.isConnected && socket.isAuthenticated,
    joinProject: socket.joinProject,
    leaveProject: socket.leaveProject,
  };
}

export function useChannelConnection(channelId: string) {
  const socket = useSocketContext();
  
  useEffect(() => {
    if (socket.isAuthenticated && channelId) {
      socket.joinChannel(channelId);
      socket.subscribeToMessages(channelId);
    }
  }, [socket.isAuthenticated, channelId, socket]);

  return {
    isConnected: socket.isConnected && socket.isAuthenticated,
    startTyping: () => socket.startTyping(channelId),
    stopTyping: () => socket.stopTyping(channelId),
  };
}

export function useAIJobConnection() {
  const socket = useSocketContext();
  
  useEffect(() => {
    if (socket.isAuthenticated) {
      socket.subscribeToAIJobs();
    }
  }, [socket.isAuthenticated, socket]);

  return {
    isConnected: socket.isConnected && socket.isAuthenticated,
  };
}

export function usePresenceManager() {
  const socket = useSocketContext();
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');

  const updateStatus = (newStatus: typeof status) => {
    setStatus(newStatus);
    if (socket.isAuthenticated) {
      socket.updatePresence(newStatus);
    }
  };

  // Auto-update presence based on page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    status,
    updateStatus,
    isConnected: socket.isConnected && socket.isAuthenticated,
  };
}