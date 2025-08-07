// src/hooks/useAIInsights.ts
import { useState, useCallback } from 'react';
import { useAppContext } from '../contexts/SimplifiedRootProvider';
import { Project, Task, EventItem, DocumentItem, SlackMessage } from './useProjectIntelligence';

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'celebration' | 'optimization' | 'risk';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface ProjectAnalytics {
  completionRate: number;
  timelineHealth: 'on-track' | 'at-risk' | 'off-track';
  budgetHealth: 'on-budget' | 'at-risk' | 'over-budget';
  communicationHealth: 'healthy' | 'at-risk' | 'unhealthy';
}

interface UseAIInsightsReturn {
  insights: Insight[];
  analytics: ProjectAnalytics;
  isLoading: boolean;
  error: string | null;
  generateInsights: (
    project: Project,
    tasks: Task[],
    events: EventItem[],
    documents: DocumentItem[],
    slackMessages?: SlackMessage[]
  ) => Promise<void>;
}

export const useAIInsights = (): UseAIInsightsReturn => {
  const { getProjectIntelligence } = useAppContext();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics>({
    completionRate: 0,
    timelineHealth: 'on-track',
    budgetHealth: 'on-budget',
    communicationHealth: 'healthy',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(async (
    project: Project,
    tasks: Task[],
    events: EventItem[],
    documents: DocumentItem[],
    slackMessages?: SlackMessage[]
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      if (getProjectIntelligence) {
        const intelligence = await getProjectIntelligence(project, tasks, events, documents, slackMessages);
        setInsights(intelligence.updates.map((update: any) => ({
          id: update.id,
          title: update.title,
          description: update.description,
          type: update.type,
          priority: update.priority,
          actionable: update.suggestedActions.length > 0,
        })));
        setAnalytics({
          completionRate: intelligence.projectHealth.completionRate,
          timelineHealth: intelligence.projectHealth.timelineHealth,
          budgetHealth: intelligence.projectHealth.budgetHealth,
          communicationHealth: intelligence.projectHealth.communicationHealth,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [getProjectIntelligence]);

  return { insights, analytics, isLoading, error, generateInsights };
};