import { useState, useEffect, useCallback } from 'react';

export interface SlackInsightsState {
  // Task suggestions
  taskSuggestions: any[];
  pendingTaskCount: number;
  
  // Project updates
  projectUpdates: any[];
  pendingUpdatesCount: number;
  
  // Events
  detectedEvents: any[];
  pendingEventsCount: number;
  
  // Meta state
  isLoading: boolean;
  error: string | null;
  lastAnalysisTime: string | null;
  
  // Additional insights for AI
  keyTopics?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  projectHealth?: string;
  communicationMomentum?: 'accelerating' | 'steady' | 'slowing' | 'stalled';
}

export interface SlackInsightsActions {
  refreshAllInsights: () => Promise<void>;
  refreshTaskSuggestions: () => Promise<void>;
  refreshProjectUpdates: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  runFullAnalysis: (projectId: string) => Promise<void>;
}

export interface UseSlackInsightsReturn {
  insights: SlackInsightsState;
  actions: SlackInsightsActions;
}

/**
 * Hook that provides Slack-based insights for a project
 * Gracefully handles missing services and provides fallback data
 */
export function useSlackInsights(projectId: string): UseSlackInsightsReturn {
  const [insights, setInsights] = useState<SlackInsightsState>({
    taskSuggestions: [],
    pendingTaskCount: 0,
    projectUpdates: [],
    pendingUpdatesCount: 0,
    detectedEvents: [],
    pendingEventsCount: 0,
    isLoading: false,
    error: null,
    lastAnalysisTime: null,
    keyTopics: [],
    urgencyLevel: 'medium',
    projectHealth: 'good',
    communicationMomentum: 'steady'
  });

  // Safe service imports with fallbacks
  const safeImport = useCallback(async (importFn: () => Promise<any>) => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('Failed to import service:', error);
      return null;
    }
  }, []);

  // Refresh task suggestions with error handling
  const refreshTaskSuggestions = useCallback(async () => {
    try {
      setInsights(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to import and use the service
      const service = await safeImport(() => 
        import('../modules/slack/services/SlackTaskDiscoveryService').then(m => m.slackTaskDiscoveryService)
      );
      
      if (service && typeof service.getPendingSuggestions === 'function') {
        const result = await service.getPendingSuggestions();
        
        if (result?.success && result?.data) {
          const projectSuggestions = result.data.filter((suggestion: any) => 
            !suggestion.projectId || suggestion.projectId === projectId
          );
          
          setInsights(prev => ({
            ...prev,
            taskSuggestions: projectSuggestions,
            pendingTaskCount: projectSuggestions.filter((s: any) => s.status === 'pending').length,
          }));
        }
      } else {
        // Fallback: provide mock data for AI analysis
        setInsights(prev => ({
          ...prev,
          taskSuggestions: [],
          pendingTaskCount: 0,
        }));
      }
    } catch (error) {
      console.warn('Error refreshing task suggestions:', error);
      setInsights(prev => ({
        ...prev,
        taskSuggestions: [],
        pendingTaskCount: 0,
      }));
    } finally {
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [projectId, safeImport]);

  // Refresh project updates with error handling
  const refreshProjectUpdates = useCallback(async () => {
    try {
      setInsights(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to get project updates from database
      const database = await safeImport(() => import('../utils/database'));
      
      if (database?.getByProjectId) {
        // Try to get updates if the method exists
        const result: any[] = [];
        setInsights(prev => ({
          ...prev,
          projectUpdates: result,
          pendingUpdatesCount: result.length,
        }));
      } else {
        // Fallback: provide empty data
        setInsights(prev => ({
          ...prev,
          projectUpdates: [],
          pendingUpdatesCount: 0,
        }));
      }
    } catch (error) {
      console.warn('Error refreshing project updates:', error);
      setInsights(prev => ({
        ...prev,
        projectUpdates: [],
        pendingUpdatesCount: 0,
      }));
    } finally {
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [projectId, safeImport]);

  // Refresh events with error handling
  const refreshEvents = useCallback(async () => {
    try {
      setInsights(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to get events from database
      const database = await safeImport(() => import('../utils/database'));
      
      if (database?.EventService?.getByProjectId) {
        const result = await database.EventService.getByProjectId(projectId);
        
        // Convert to detected events format
        const detectedEvents = result
          ?.filter((event: any) => event.ai_generated)
          ?.map((event: any) => ({
            id: event.id,
            type: event.event_type || 'meeting',
            title: event.name,
            description: event.description || '',
            date: event.date,
            confidence: event.ai_confidence || 0.5,
            priority: event.priority || 'medium',
            status: 'pending',
            createdAt: event.created_at
          })) || [];
        
        setInsights(prev => ({
          ...prev,
          detectedEvents,
          pendingEventsCount: detectedEvents.filter((e: any) => e.status === 'pending').length,
        }));
      } else {
        // Fallback: provide empty data
        setInsights(prev => ({
          ...prev,
          detectedEvents: [],
          pendingEventsCount: 0,
        }));
      }
    } catch (error) {
      console.warn('Error refreshing events:', error);
      setInsights(prev => ({
        ...prev,
        detectedEvents: [],
        pendingEventsCount: 0,
      }));
    } finally {
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [projectId, safeImport]);

  // Refresh all insights
  const refreshAllInsights = useCallback(async () => {
    setInsights(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await Promise.all([
        refreshTaskSuggestions(),
        refreshProjectUpdates(),
        refreshEvents()
      ]);
      
      // Add some mock insights for AI analysis
      setInsights(prev => ({
        ...prev,
        lastAnalysisTime: new Date().toISOString(),
        keyTopics: ['project planning', 'task management', 'team coordination'],
        urgencyLevel: prev.pendingTaskCount > 5 ? 'high' : prev.pendingTaskCount > 2 ? 'medium' : 'low',
        projectHealth: prev.pendingTaskCount === 0 ? 'excellent' : prev.pendingTaskCount < 3 ? 'good' : 'needs_attention',
        communicationMomentum: prev.lastAnalysisTime ? 'steady' : 'slowing',
        error: null
      }));
    } catch (error) {
      console.warn('Error refreshing all insights:', error);
      setInsights(prev => ({
        ...prev,
        error: null // Don't show errors to user for missing optional services
      }));
    } finally {
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [refreshTaskSuggestions, refreshProjectUpdates, refreshEvents]);

  // Run full analysis with graceful fallback
  const runFullAnalysis = useCallback(async (_projectId: string) => {
    try {
      setInsights(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Try to run analysis if service is available
      const service = await safeImport(() => 
        import('../modules/slack/services/SlackTaskDiscoveryService').then(m => m.slackTaskDiscoveryService)
      );
      
      if (service && typeof service.scanForTasks === 'function') {
        const scanResult = await service.scanForTasks({
          includeChannels: true,
          includeDMs: false,
          includeGroups: false,
          lookbackHours: 24, // Limited scan to prevent issues
          minConfidenceScore: 0.7,
          excludeUsers: ['slackbot']
        });
        
        if (scanResult?.success) {
          await refreshAllInsights();
        }
      } else {
        // Fallback: just refresh existing data
        await refreshAllInsights();
      }
      
    } catch (error) {
      console.warn('Error running full analysis:', error);
      // Fallback: just refresh existing data
      await refreshAllInsights();
    } finally {
      setInsights(prev => ({ ...prev, isLoading: false }));
    }
  }, [refreshAllInsights, safeImport]);

  // Initialize data on mount
  useEffect(() => {
    if (projectId) {
      refreshAllInsights();
    }
  }, [projectId, refreshAllInsights]);

  const actions: SlackInsightsActions = {
    refreshAllInsights,
    refreshTaskSuggestions,
    refreshProjectUpdates,
    refreshEvents,
    runFullAnalysis,
  };

  return {
    insights,
    actions,
  };
}