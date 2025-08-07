import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

interface SocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseSocketOptions {
  userId?: string;
  token?: string;
  projectId?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
}

export function useSocket(config: SocketConfig = {}, options: UseSocketOptions = {}) {
  const {
    url = 'http://localhost:3007',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 2000,
  } = config;

  const {
    userId,
    token,
    projectId,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const disconnectReasonRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(url, {
      autoConnect: false,
      reconnection: false, // Disable reconnection to prevent spam
      reconnectionAttempts: 0,
      reconnectionDelay,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 0,
      timeout: 10000,
      forceNew: false,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      setReconnectAttempt(0);
    });

    socket.on('disconnect', (reason) => {
      disconnectReasonRef.current = reason;
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('connect_error', (err) => {
      console.log('[SOCKET] Connection failed, this is expected if backend services are not running');
      // Don't set error state for expected connection failures
      // setError(err.message);
    });

    socket.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt);
    });

    // Authentication response
    socket.on('authenticated', (data) => {
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error);
      }
    });

    // Real-time data updates
    socket.on('task-updated', (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(data.projectId) });
    });

    socket.on('new-message', (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.slackMessages(data.channelId) });
    });

    socket.on('job-updated', (data) => {
      queryClient.setQueryData(
        ['queue-service', 'job', data.queue, data.id],
        data
      );
    });

    socket.on('ai-job-updated', (data) => {
      queryClient.setQueryData(
        queryKeys.aiJob(data.id),
        data
      );
    });

    socket.on('project-updated', (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    });

    socket.on('presence-update', (data) => {
      // Update user presence in cache
    });

    socket.on('user-typing', (data) => {
      // Handle typing indicators
    });

    socket.on('user-stopped-typing', (data) => {
      // Handle typing indicators
    });

    socket.on('whatsapp-status-changed', (data) => {
      // Invalidate WhatsApp status queries to trigger refresh
      queryClient.setQueryData(['whatsapp', 'status'], data);
    });

    // Connect the socket with a small delay to ensure services are ready
    const connectTimer = setTimeout(() => {
      socket.connect();
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
      socket.disconnect();
    };
  }, [url, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);

  // Handle authentication when credentials change
  useEffect(() => {
    if (socketRef.current?.connected && userId && token) {
      socketRef.current.emit('authenticate', { userId, token });
    }
  }, [userId, token, isConnected]);

  // Handle project joining when projectId changes
  useEffect(() => {
    if (socketRef.current?.connected && isAuthenticated && projectId) {
      socketRef.current.emit('join-project', projectId);
    }
  }, [projectId, isConnected, isAuthenticated]);

  // Handle callback invocations
  useEffect(() => {
    if (isConnected) {
      onConnect?.();
    }
  }, [isConnected, onConnect]);

  useEffect(() => {
    if (error) {
      onError?.(new Error(error));
    }
  }, [error, onError]);

  // Handle disconnect tracking for callback
  useEffect(() => {
    if (!isConnected && disconnectReasonRef.current) {
      onDisconnect?.(disconnectReasonRef.current);
      disconnectReasonRef.current = null;
    }
  }, [isConnected, onDisconnect]);

  // Authentication
  const authenticate = useCallback((authUserId: string, authToken: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('authenticate', { userId: authUserId, token: authToken });
    }
  }, []);

  // Room management
  const joinProject = useCallback((newProjectId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join-project', newProjectId);
    }
  }, [isAuthenticated]);

  const leaveProject = useCallback((projectIdToLeave: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-project', projectIdToLeave);
    }
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected && isAuthenticated) {
      socketRef.current.emit('join-channel', channelId);
    }
  }, [isAuthenticated]);

  // Subscriptions
  const subscribeToTasks = useCallback((taskProjectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe-tasks', taskProjectId);
    }
  }, []);

  const subscribeToMessages = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe-messages', channelId);
    }
  }, []);

  const subscribeToAIJobs = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe-ai-jobs');
    }
  }, []);

  const subscribeToQueue = useCallback((queue: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe-queue-jobs', queue);
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', { channelId });
    }
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', { channelId });
    }
  }, []);

  // Presence
  const updatePresence = useCallback((status: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-presence', status);
    }
  }, []);

  // Connection control
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    // State
    isConnected,
    isAuthenticated,
    error,
    reconnectAttempt,
    
    // Methods
    authenticate,
    joinProject,
    leaveProject,
    joinChannel,
    subscribeToTasks,
    subscribeToMessages,
    subscribeToAIJobs,
    subscribeToQueue,
    startTyping,
    stopTyping,
    updatePresence,
    connect,
    disconnect,
    
    // Raw socket for advanced usage
    socket: socketRef.current,
  };
}

// Specialized hooks for common use cases
export function useProjectSocket(projectId: string, userId?: string, token?: string) {
  return useSocket(
    { autoConnect: !!projectId },
    {
      userId,
      token,
      projectId,
      onConnect: () => {
      },
    }
  );
}

export function useChannelSocket(channelId: string, userId?: string, token?: string) {
  const socket = useSocket({}, { userId, token });
  
  useEffect(() => {
    if (socket.isAuthenticated && channelId) {
      socket.joinChannel(channelId);
      socket.subscribeToMessages(channelId);
    }
  }, [socket.isAuthenticated, channelId, socket]);

  return socket;
}

export function useTaskSocket(projectId: string, userId?: string, token?: string) {
  const socket = useSocket({}, { userId, token });
  
  useEffect(() => {
    if (socket.isAuthenticated && projectId) {
      socket.subscribeToTasks(projectId);
    }
  }, [socket.isAuthenticated, projectId, socket]);

  return socket;
}

export function useAIJobSocket(userId?: string, token?: string) {
  const socket = useSocket({}, { userId, token });
  
  useEffect(() => {
    if (socket.isAuthenticated) {
      socket.subscribeToAIJobs();
    }
  }, [socket.isAuthenticated, socket]);

  return socket;
}