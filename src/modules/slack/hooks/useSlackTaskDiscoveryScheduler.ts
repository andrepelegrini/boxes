import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SchedulerConfig,
  slackTaskDiscoveryScheduler 
} from '../services/SlackTaskDiscoveryScheduler';
import { TaskDiscoveryConfig } from '../services/SlackTaskDiscoveryService';

export interface UseSlackTaskDiscoverySchedulerReturn {
  // State
  isRunning: boolean;
  status: {
    isRunning: boolean;
    nextRunAt?: string;
    intervalMinutes: number;
    lastRunAt?: string;
  };
  config: {
    scheduler: SchedulerConfig;
    discovery: TaskDiscoveryConfig;
  };
  lastScanResult: {
    success: boolean;
    newSuggestions: number;
    error?: string;
    timestamp?: string;
  } | null;

  // Actions
  start: () => void;
  stop: () => void;
  runManualScan: () => Promise<void>;
  updateConfig: (schedulerConfig: Partial<SchedulerConfig>, discoveryConfig?: Partial<TaskDiscoveryConfig>) => void;
  
  // Events
  onNewSuggestions: (callback: (count: number) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useSlackTaskDiscoveryScheduler(): UseSlackTaskDiscoverySchedulerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(slackTaskDiscoveryScheduler.getStatus());
  const [config, setConfig] = useState(slackTaskDiscoveryScheduler.getConfig());
  const [lastScanResult, setLastScanResult] = useState<UseSlackTaskDiscoverySchedulerReturn['lastScanResult']>(null);
  const [newSuggestionsCallback, setNewSuggestionsCallback] = useState<((count: number) => void) | null>(null);
  const [errorCallback, setErrorCallback] = useState<((error: string) => void) | null>(null);

  // Use ref to track interval to prevent memory leaks
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update status periodically with proper cleanup
  useEffect(() => {
    const updateStatus = () => {
      try {
        setIsRunning(slackTaskDiscoveryScheduler.isSchedulerRunning());
        setStatus(slackTaskDiscoveryScheduler.getStatus());
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating scheduler status:', error);
        }
      }
    };

    // Initial update
    updateStatus();
    
    // Clear any existing interval
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
    }
    
    // Set new interval
    statusUpdateIntervalRef.current = setInterval(updateStatus, 30000); // Update every 30 seconds
    
    return () => {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
    };
  }, []); // Empty dependency array to prevent recreation

  // Set up callbacks on the scheduler with debouncing to prevent excessive updates
  const callbackUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear previous timeout
    if (callbackUpdateTimeoutRef.current) {
      clearTimeout(callbackUpdateTimeoutRef.current);
    }
    
    // Debounce callback updates to prevent rapid reconfiguration
    callbackUpdateTimeoutRef.current = setTimeout(() => {
      try {
        slackTaskDiscoveryScheduler.updateConfig({
          onNewSuggestions: (count: number) => {
            newSuggestionsCallback?.(count);
          },
          onError: (error: string) => {
            errorCallback?.(error);
          },
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating scheduler callbacks:', error);
        }
      }
    }, 100); // 100ms debounce
    
    return () => {
      if (callbackUpdateTimeoutRef.current) {
        clearTimeout(callbackUpdateTimeoutRef.current);
        callbackUpdateTimeoutRef.current = null;
      }
    };
  }, [newSuggestionsCallback, errorCallback]);

  const start = useCallback(() => {
    try {
      slackTaskDiscoveryScheduler.start();
      setIsRunning(true);
      setStatus(slackTaskDiscoveryScheduler.getStatus());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error starting scheduler:', error);
      }
    }
  }, []);

  const stop = useCallback(() => {
    try {
      slackTaskDiscoveryScheduler.stop();
      setIsRunning(false);
      setStatus(slackTaskDiscoveryScheduler.getStatus());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error stopping scheduler:', error);
      }
    }
  }, []);

  const runManualScan = useCallback(async () => {
    try {
      const result = await slackTaskDiscoveryScheduler.runManualScan();
      setLastScanResult({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error running manual scan:', error);
      }
      setLastScanResult({
        success: false,
        newSuggestions: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const updateConfig = useCallback((
    schedulerConfig: Partial<SchedulerConfig>, 
    discoveryConfig?: Partial<TaskDiscoveryConfig>
  ) => {
    try {
      slackTaskDiscoveryScheduler.updateConfig(schedulerConfig, discoveryConfig);
      setConfig(slackTaskDiscoveryScheduler.getConfig());
      setStatus(slackTaskDiscoveryScheduler.getStatus());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating scheduler config:', error);
      }
    }
  }, []);

  const onNewSuggestions = useCallback((callback: (count: number) => void) => {
    setNewSuggestionsCallback(() => callback);
  }, []);

  const onError = useCallback((callback: (error: string) => void) => {
    setErrorCallback(() => callback);
  }, []);

  return {
    // State
    isRunning,
    status,
    config,
    lastScanResult,

    // Actions
    start,
    stop,
    runManualScan,
    updateConfig,

    // Events
    onNewSuggestions,
    onError,
  };
}