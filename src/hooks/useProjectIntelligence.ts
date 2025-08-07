// src/hooks/useProjectIntelligence.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

// Define types inline since the file doesn't exist
export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isNextUp?: boolean;
  strategicGoal?: string;
  slackChannelUrl?: string;
  lastReviewedAt?: string;
  archivedAt?: string;
  archiveReason?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
  status: string;
}

export interface EventItem {
  id: string;
  name: string;
  description?: string;
  date: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  description?: string;
  url?: string;
  type: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlackMessage {
  id: string;
  text: string;
  timestamp: string;
  user: string;
  channel: string;
}

export interface IntelligenceAnalysis {
  projectHealth: any;
  updates: any[];
  nextReviewDate: string;
}

export interface ProjectUpdate {
  id: string;
  type: 'task_suggestion' | 'milestone_update' | 'risk_alert' | 'progress_insight' | 'stakeholder_change' | 'timeline_adjustment';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  isReviewed: boolean;
  isApplied: boolean;
  createdAt: string;
  suggestedActions: any[];
}

export interface MonitoringConfig {
  automaticUpdates: boolean;
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

interface ProjectIntelligenceState {
  isAnalyzing: boolean;
  currentAnalysis: IntelligenceAnalysis | null;
  pendingUpdates: ProjectUpdate[];
  reviewedUpdates: ProjectUpdate[];
  appliedUpdates: ProjectUpdate[];
  error: string | null;
  lastAnalysisAt: string | null;
  nextScheduledAnalysis: string | null;
}

interface UseProjectIntelligenceReturn {
  state: ProjectIntelligenceState;
  actions: {
    analyzeProject: (
      project: Project,
      tasks: Task[],
      events: EventItem[],
      documents: DocumentItem[],
      slackMessages?: SlackMessage[]
    ) => Promise<void>;
    detectChanges: (
      previousState: any,
      currentState: any
    ) => Promise<void>;
    reviewUpdate: (updateId: string) => void;
    applyUpdate: (updateId: string, project: Project) => Promise<void>;
    dismissUpdate: (updateId: string) => void;
    setMonitoringConfig: (projectId: string, config: MonitoringConfig) => void;
    getMonitoringConfig: (projectId: string) => MonitoringConfig;
    clearError: () => void;
    scheduleAnalysis: (projectId: string, interval: number) => void;
    cancelScheduledAnalysis: (projectId: string) => void;
  };
}

export const useProjectIntelligence = (apiKey?: string): UseProjectIntelligenceReturn => {
  const [state, setState] = useState<ProjectIntelligenceState>({
    isAnalyzing: false,
    currentAnalysis: null,
    pendingUpdates: [],
    reviewedUpdates: [],
    appliedUpdates: [],
    error: null,
    lastAnalysisAt: null,
    nextScheduledAnalysis: null
  });

  const serviceRef = useRef<any | null>(null);
  const scheduledAnalysisTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize service
  useEffect(() => {
    if (apiKey) {
      // serviceRef.current = new ProjectIntelligenceService(apiKey);
    }
  }, [apiKey]);

  // Update API key when it changes
  useEffect(() => {
    if (serviceRef.current && apiKey) {
      serviceRef.current.updateApiKey(apiKey);
    }
  }, [apiKey]);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isAnalyzing: false }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const analyzeProject = useCallback(async (
    project: Project,
    tasks: Task[],
    events: EventItem[],
    documents: DocumentItem[],
    slackMessages?: SlackMessage[]
  ) => {
    if (!serviceRef.current || !serviceRef.current.isAvailable()) {
      setError('Serviço de inteligência não disponível. Configure sua chave API.');
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const analysis = await serviceRef.current.analyzeProjectIntelligence(
        project, tasks, events, documents, slackMessages
      );

      setState(prev => {
        // Separate updates by status
        const pendingUpdates = analysis.updates.filter((u: any) => !u.isReviewed && !u.isApplied);
        const reviewedUpdates = analysis.updates.filter((u: any) => u.isReviewed && !u.isApplied);
        const appliedUpdates = analysis.updates.filter((u: any) => u.isApplied);

        return {
          ...prev,
          isAnalyzing: false,
          currentAnalysis: analysis,
          pendingUpdates: [...prev.pendingUpdates, ...pendingUpdates],
          reviewedUpdates: [...prev.reviewedUpdates, ...reviewedUpdates],
          appliedUpdates: [...prev.appliedUpdates, ...appliedUpdates],
          lastAnalysisAt: new Date().toISOString(),
          nextScheduledAnalysis: analysis.nextReviewDate,
          error: null
        };
      });

    } catch (error) {
      console.error('Error during project intelligence analysis:', error);
      setError(error instanceof Error ? error.message : 'Erro durante análise do projeto');
    }
  }, [setError]);

  // Debounced version to prevent excessive change detection
  const debouncedDetectChanges = useDebounce(useCallback(async (
    previousState: {
      project: Project;
      tasks: Task[];
      events: EventItem[];
      lastSlackSync?: string;
    },
    currentState: {
      project: Project;
      tasks: Task[];
      events: EventItem[];
      newSlackMessages?: SlackMessage[];
    }
  ) => {
    if (!serviceRef.current) return;

    try {
      const updates = await serviceRef.current.detectProjectChanges(
        previousState, currentState
      );

      if (updates.length > 0) {
        setState(prev => ({
          ...prev,
          pendingUpdates: [...prev.pendingUpdates, ...updates]
        }));
      }
    } catch (error) {
      console.error('Error detecting project changes:', error);
      // Don't set error for change detection failures - not critical
    }
  }, []), 1000); // 1 second debounce for change detection

  // Keep the original function name for API compatibility
  const detectChanges = debouncedDetectChanges;

  const reviewUpdate = useCallback((updateId: string) => {
    setState(prev => {
      const update = prev.pendingUpdates.find(u => u.id === updateId);
      if (!update) return prev;

      const updatedUpdate = { ...update, isReviewed: true };

      return {
        ...prev,
        pendingUpdates: prev.pendingUpdates.filter(u => u.id !== updateId),
        reviewedUpdates: [...prev.reviewedUpdates, updatedUpdate]
      };
    });

    if (serviceRef.current) {
      serviceRef.current.markUpdateAsReviewed(updateId);
    }
  }, []);

  const applyUpdate = useCallback(async (updateId: string, project: Project) => {
    if (!serviceRef.current) return;

    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const success = await serviceRef.current.applyUpdate(updateId, project);
      
      if (success) {
        setState(prev => {
          const update = [...prev.pendingUpdates, ...prev.reviewedUpdates]
            .find(u => u.id === updateId);
          
          if (!update) return { ...prev, isAnalyzing: false };

          const updatedUpdate = { ...update, isApplied: true, isReviewed: true };

          return {
            ...prev,
            pendingUpdates: prev.pendingUpdates.filter(u => u.id !== updateId),
            reviewedUpdates: prev.reviewedUpdates.filter(u => u.id !== updateId),
            appliedUpdates: [...prev.appliedUpdates, updatedUpdate],
            isAnalyzing: false
          };
        });
      } else {
        setError('Falha ao aplicar atualização');
      }
    } catch (error) {
      console.error('Error applying update:', error);
      setError(error instanceof Error ? error.message : 'Erro ao aplicar atualização');
    }
  }, [setError]);

  const dismissUpdate = useCallback((updateId: string) => {
    setState(prev => ({
      ...prev,
      pendingUpdates: prev.pendingUpdates.filter(u => u.id !== updateId),
      reviewedUpdates: prev.reviewedUpdates.filter(u => u.id !== updateId)
    }));
  }, []);

  const setMonitoringConfig = useCallback((projectId: string, config: MonitoringConfig) => {
    if (serviceRef.current) {
      serviceRef.current.setMonitoringConfig(projectId, config);
      
      // Update scheduled analysis based on new config
      if (config.automaticUpdates) {
        const intervalMs = getIntervalMs(config.updateFrequency);
        scheduleAnalysis(projectId, intervalMs);
      } else {
        cancelScheduledAnalysis(projectId);
      }
    }
  }, []);

  const getMonitoringConfig = useCallback((projectId: string): MonitoringConfig => {
    return serviceRef.current?.getMonitoringConfig(projectId) || {
      slackAnalysisEnabled: true,
      taskProgressTracking: true,
      timelineMonitoring: true,
      stakeholderTracking: true,
      automaticUpdates: false,
      updateFrequency: 'daily',
      confidenceThreshold: 70
    };
  }, []);

  // Debounced version to prevent excessive scheduling
  const debouncedScheduleAnalysis = useDebounce(useCallback((projectId: string, interval: number) => {
    // Cancel existing timeout
    const existingTimeout = scheduledAnalysisTimeouts.current.get(projectId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new analysis
    const timeout = setTimeout(() => {
      // This would trigger an analysis for the specific project
      // Implementation depends on how projects are accessed globally
      console.log(`Scheduled analysis triggered for project ${projectId}`);
    }, interval);

    scheduledAnalysisTimeouts.current.set(projectId, timeout);

    setState(prev => ({
      ...prev,
      nextScheduledAnalysis: new Date(Date.now() + interval).toISOString()
    }));
  }, []), 2000); // 2 second debounce for scheduling

  // Keep the original function name for API compatibility
  const scheduleAnalysis = debouncedScheduleAnalysis;

  const cancelScheduledAnalysis = useCallback((projectId: string) => {
    const existingTimeout = scheduledAnalysisTimeouts.current.get(projectId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      scheduledAnalysisTimeouts.current.delete(projectId);
    }

    setState(prev => ({
      ...prev,
      nextScheduledAnalysis: null
    }));
  }, []);

  // Helper function to convert frequency to milliseconds
  const getIntervalMs = (frequency: MonitoringConfig['updateFrequency']): number => {
    switch (frequency) {
      case 'realtime': return 5 * 60 * 1000; // 5 minutes
      case 'hourly': return 60 * 60 * 1000; // 1 hour
      case 'daily': return 24 * 60 * 60 * 1000; // 1 day
      case 'weekly': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 24 * 60 * 60 * 1000; // 1 day
    }
  };

  // Cleanup scheduled timeouts on unmount
  useEffect(() => {
    return () => {
      scheduledAnalysisTimeouts.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      scheduledAnalysisTimeouts.current.clear();
    };
  }, []);

  return {
    state,
    actions: {
      analyzeProject,
      detectChanges,
      reviewUpdate,
      applyUpdate,
      dismissUpdate,
      setMonitoringConfig,
      getMonitoringConfig,
      clearError,
      scheduleAnalysis,
      cancelScheduledAnalysis
    }
  };
};

export default useProjectIntelligence;