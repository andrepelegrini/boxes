// Simple Slack Task Discovery Hook

import { useState, useCallback } from 'react';

export interface TaskDiscoveryConfig {
  includeChannels: boolean;
  includeDMs: boolean;
  includeGroups: boolean;
  lookbackHours: number;
  minConfidenceScore: number;
  excludeConversations?: string[];
  excludeUsers?: string[];
}

export interface SlackConversation {
  id: string;
  name: string;
  isDM: boolean;
  isGroup: boolean;
}

export interface UseSlackTaskDiscoveryReturn {
  taskSuggestions: any[];
  pendingSuggestions: any[]; // Added for ConnectTab compatibility
  isAnalyzing: boolean;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  suggestionCounts: {
    pending: number;
    accepted: number;
    rejected: number;
    // Additional stats for dashboard display
    dms?: number;
    groups?: number;
  }; // Added for ConnectTab compatibility
  conversations: SlackConversation[];
  config: TaskDiscoveryConfig | null;
  error?: string; // Error state
  
  // Actions
  analyzeChannel: (projectId: string, channelId: string) => Promise<void>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshSuggestions: () => Promise<void>; // Alias for refresh
  scanForTasks: (projectId: string, channelId: string) => Promise<void>; // Alias for analyzeChannel
  loadConversations: () => Promise<void>;
  updateConfig: (config: TaskDiscoveryConfig) => Promise<void>;
}

export function useSlackTaskDiscovery(): UseSlackTaskDiscoveryReturn {
  const [taskSuggestions, setTaskSuggestions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversations, setConversations] = useState<SlackConversation[]>([]);
  const [error, setError] = useState<string>();
  const [config, setConfig] = useState<TaskDiscoveryConfig | null>({
    includeChannels: true,
    includeDMs: true,
    includeGroups: true,
    lookbackHours: 24,
    minConfidenceScore: 0.6,
    excludeConversations: [],
    excludeUsers: ['slackbot'],
  });

  const analyzeChannel = useCallback(async (projectId: string, channelId: string) => {
    setIsAnalyzing(true);
    setError(undefined);
    try {
      console.log(`🤖 Analyzing channel ${channelId} for project ${projectId}`);
      // Placeholder for actual analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTaskSuggestions([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      console.error('Analysis failed:', err);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    console.log(`✅ Accepting suggestion ${suggestionId}`);
    setTaskSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    console.log(`❌ Rejecting suggestion ${suggestionId}`);
    setTaskSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing task suggestions');
    setTaskSuggestions([]);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      console.log('🔄 Loading Slack conversations');
      // Placeholder - this should load actual conversations from Slack API
      setConversations([
        { id: 'C1234', name: 'general', isDM: false, isGroup: false },
        { id: 'C5678', name: 'random', isDM: false, isGroup: false },
        { id: 'D9012', name: 'john.doe', isDM: true, isGroup: false },
      ]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: TaskDiscoveryConfig) => {
    try {
      console.log('🔧 Updating task discovery config', newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  }, []);

  const pendingCount = taskSuggestions.filter(s => s.status === 'pending').length;
  const acceptedCount = taskSuggestions.filter(s => s.status === 'accepted').length;
  const rejectedCount = taskSuggestions.filter(s => s.status === 'rejected').length;
  
  const pendingSuggestions = taskSuggestions.filter(s => s.status === 'pending');
  const suggestionCounts = {
    pending: pendingCount,
    accepted: acceptedCount,
    rejected: rejectedCount,
    // Placeholder values for DM and group counts
    dms: 0,
    groups: 0
  };

  return {
    taskSuggestions,
    pendingSuggestions,
    isAnalyzing,
    pendingCount,
    acceptedCount,
    rejectedCount,
    suggestionCounts,
    conversations,
    config,
    error,
    analyzeChannel,
    acceptSuggestion,
    rejectSuggestion,
    refresh,
    refreshSuggestions: refresh, // Alias for refresh
    scanForTasks: analyzeChannel, // Alias for analyzeChannel
    loadConversations,
    updateConfig
  };
}