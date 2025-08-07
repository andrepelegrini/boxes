import { useState, useEffect, useCallback } from 'react';
import { useAIContext } from '../contexts/AIContext';
import { useSlackInsights } from './useSlackInsights';
import OverviewAIService, {
  SmartNextAction,
  ProjectHealthInsight,
  TaskPriorityInsight,
  MeetingSuggestion,
  RiskAlert,
  MilestoneRecommendation,
  CommunicationInsight
} from '../services/OverviewAIService';

export interface OverviewAIInsights {
  nextActions: SmartNextAction[];
  projectHealth: ProjectHealthInsight;
  taskPriority: TaskPriorityInsight;
  meetingSuggestions: MeetingSuggestion[];
  riskAlerts: RiskAlert[];
  milestoneRecommendations: MilestoneRecommendation;
  communicationInsights: CommunicationInsight;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshInsights: () => Promise<void>;
}

export interface UseOverviewAIProps {
  project: any;
  tasks: any[];
  events?: any[];
  documents?: any[];
  activityLogs?: any[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useOverviewAI = ({
  project,
  tasks,
  events = [],
  documents = [],
  activityLogs = [],
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}: UseOverviewAIProps): OverviewAIInsights => {
  // State for all insights
  const [nextActions, setNextActions] = useState<SmartNextAction[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealthInsight>({
    overallHealth: 'good',
    healthScore: 75,
    indicators: {
      velocity: { status: 'good', trend: 'stable', recommendation: '', score: 75 },
      teamAlignment: { score: 75, issues: [], suggestions: [] },
      riskFactors: { level: 'low', risks: [], mitigations: [] },
      momentum: { status: 'steady', factors: [], recommendations: [] }
    },
    priorityActions: [],
    confidence: 0.75
  });
  const [taskPriority, setTaskPriority] = useState<TaskPriorityInsight>({
    recommendedNext: [],
    blockerResolution: [],
    opportunityTasks: []
  });
  const [meetingSuggestions, setMeetingSuggestions] = useState<MeetingSuggestion[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [milestoneRecommendations, setMilestoneRecommendations] = useState<MilestoneRecommendation>({
    nextMilestone: {
      suggestedGoal: '',
      timeframe: '',
      requiredActions: [],
      dependencies: [],
      successCriteria: []
    }
  });
  const [communicationInsights, setCommunicationInsights] = useState<CommunicationInsight>({
    projectMomentum: 'steady',
    alignmentScore: 75,
    keyDiscussions: [],
    missingVoices: [],
    suggestedCommunications: [],
    communicationHealth: 'good'
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get AI context and Slack insights
  const { triggerAIAnalysis } = useAIContext();
  const { insights: slackInsights } = useSlackInsights(project.id);

  // Get AI service instance
  const aiService = OverviewAIService.getInstance();

  // Main function to refresh all insights
  const refreshInsights = useCallback(async () => {
    if (!project || !tasks) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Generating comprehensive AI insights for project:', project.name);
      
      const insights = await aiService.generateComprehensiveInsights(
        project,
        tasks,
        events,
        documents,
        activityLogs,
        slackInsights,
        triggerAIAnalysis
      );

      // Update all state
      setNextActions(insights.nextActions);
      setProjectHealth(insights.projectHealth);
      setTaskPriority(insights.taskPriority);
      setMeetingSuggestions(insights.meetingSuggestions);
      setRiskAlerts(insights.riskAlerts);
      setMilestoneRecommendations(insights.milestoneRecommendations);
      setCommunicationInsights(insights.communicationInsights);
      setLastUpdated(new Date());

      console.log('✅ AI insights generated successfully:', {
        nextActions: insights.nextActions.length,
        healthScore: insights.projectHealth.healthScore,
        risks: insights.riskAlerts.length,
        meetings: insights.meetingSuggestions.length
      });

    } catch (err) {
      console.error('❌ Failed to generate AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, [
    project,
    tasks,
    events,
    documents,
    activityLogs,
    slackInsights,
    triggerAIAnalysis,
    aiService
  ]);

  // Initial load and dependency updates
  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      refreshInsights();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshInsights]);

  // Lightweight refresh when task completion status changes
  useEffect(() => {
    // Only trigger if we have existing insights and task completion has changed
    if (lastUpdated && tasks.length > 0) {
      const completedCount = tasks.filter(t => t.completed).length;
      const previousCompletedCount = projectHealth.indicators?.velocity?.score || 0;
      
      // If completion count changed significantly, refresh insights
      if (Math.abs(completedCount - previousCompletedCount) > 0) {
        console.log('📊 Task completion changed, refreshing insights...');
        refreshInsights();
      }
    }
  }, [tasks.map(t => t.completed).join(','), refreshInsights, lastUpdated, projectHealth]);

  // Enhanced debugging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && lastUpdated) {
      console.log('🤖 Overview AI Insights Updated:', {
        project: project.name,
        nextActions: nextActions.length,
        healthScore: projectHealth.healthScore,
        momentum: communicationInsights.projectMomentum,
        risks: riskAlerts.length,
        timestamp: lastUpdated
      });
    }
  }, [lastUpdated, project.name, nextActions.length, projectHealth.healthScore, communicationInsights.projectMomentum, riskAlerts.length]);

  return {
    nextActions,
    projectHealth,
    taskPriority,
    meetingSuggestions,
    riskAlerts,
    milestoneRecommendations,
    communicationInsights,
    isLoading,
    error,
    lastUpdated,
    refreshInsights
  };
};

// Helper hook for getting specific insight types
export const useProjectHealthScore = (projectHealth: ProjectHealthInsight) => {
  return {
    score: projectHealth.healthScore,
    status: projectHealth.overallHealth,
    trend: projectHealth.indicators.velocity.trend,
    riskLevel: projectHealth.indicators.riskFactors.level,
    momentum: projectHealth.indicators.momentum.status
  };
};

// Helper hook for getting urgent actions only
export const useUrgentActions = (nextActions: SmartNextAction[]) => {
  return nextActions.filter(action => 
    action.urgency === 'immediate' || 
    (action.urgency === 'today' && action.impact === 'high')
  );
};

// Helper hook for getting critical risks
export const useCriticalRisks = (riskAlerts: RiskAlert[]) => {
  return riskAlerts.filter(risk => 
    risk.impact === 'critical' || 
    (risk.impact === 'high' && risk.probability === 'high')
  );
};

// Helper hook for getting high-priority meetings
export const useUrgentMeetings = (meetingSuggestions: MeetingSuggestion[]) => {
  return meetingSuggestions.filter(meeting => 
    meeting.urgency === 'immediate' || meeting.urgency === 'this_week'
  );
};

export default useOverviewAI;