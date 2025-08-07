import { useState, useEffect } from 'react';
import { connectionStateManager, AllConnectionStates, ServiceConnectionState } from '../services/ConnectionStateManager';

interface UseConnectionStateReturn {
  connectionStates: AllConnectionStates;
  isLoading: boolean;
  disconnectGemini: () => Promise<void>;
  disconnectSlack: () => Promise<void>;
  refreshAllStates: () => Promise<AllConnectionStates>;
  refreshGeminiState: () => Promise<ServiceConnectionState>;
  refreshSlackState: () => Promise<ServiceConnectionState>;
}

export const useConnectionState = (): UseConnectionStateReturn => {
  const [connectionStates, setConnectionStates] = useState<AllConnectionStates>(connectionStateManager.getStates());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = connectionStateManager.subscribe((states) => {
      setConnectionStates(states);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    connectionStates,
    isLoading,
    disconnectGemini: connectionStateManager.disconnectGemini.bind(connectionStateManager),
    disconnectSlack: connectionStateManager.disconnectSlack.bind(connectionStateManager),
    refreshAllStates: connectionStateManager.refreshAllStates.bind(connectionStateManager),
    refreshGeminiState: connectionStateManager.refreshGeminiState.bind(connectionStateManager),
    refreshSlackState: connectionStateManager.refreshSlackState.bind(connectionStateManager),
  };
};