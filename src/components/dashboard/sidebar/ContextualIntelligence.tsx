import React, { useMemo, useState } from 'react';
import { 
  FiZap, FiTarget, FiCheckCircle, 
  FiPlus, FiChevronDown, FiChevronUp, FiClock, FiBarChart, 
  FiUsers, FiCalendar, FiActivity, FiArrowRight, FiX
} from 'react-icons/fi';
import { Project } from '../../../types/app';

interface ProjectStats {
  activeProjects: number;
  nextUpProjects: number;
  shelfProjects: number;
  archivedProjects: number;
  totalProjects: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  totalTasks: number;
  capacityUsed: number;
  capacityTotal: number;
  capacityPercentage: number;
  isOverCapacity: boolean;
}

interface Insight {
  id: string;
  type: 'critical' | 'warning' | 'opportunity' | 'success' | 'info';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  projects?: string[];
  dismissible: boolean;
  expandable?: boolean;
  details?: string;
  impact?: 'high' | 'medium' | 'low';
}

interface ContextualIntelligenceProps {
  projects: Project[];
  stats: ProjectStats;
  onProjectAction?: (projectId: string, action: string) => void;
  onCreateProject?: () => void;
  className?: string;
}

export const ContextualIntelligence: React.FC<ContextualIntelligenceProps> = ({
  projects,
  stats,
  onProjectAction,
  onCreateProject,
  className = ''
}) => {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [panelExpanded, setPanelExpanded] = useState(true);

  // Generate contextual insights based on portfolio state
  const insights = useMemo((): Insight[] => {
    const insightList: Insight[] = [];

    // CRITICAL ALERTS (Red indicators)
    
    // Overdue tasks
    if (stats.overdueTasks > 0) {
      const overdueProjects = projects.filter(p => 
        p.status === 'active' && (p as any).overdueTasks > 0
      );
      
      insightList.push({
        id: 'overdue-tasks',
        type: 'critical',
        priority: 'urgent',
        icon: <FiClock className="w-4 h-4" />,
        title: 'Overdue Tasks Alert',
        description: `${stats.overdueTasks} task${stats.overdueTasks > 1 ? 's are' : ' is'} past due`,
        details: `Affecting ${overdueProjects.length} active project${overdueProjects.length !== 1 ? 's' : ''}. Immediate attention required to maintain project momentum.`,
        actionLabel: 'Review Tasks',
        onAction: () => {
          onProjectAction?.('overdue-tasks', 'overdue-tasks');
        },
        projects: overdueProjects.map(p => p.id),
        dismissible: false,
        expandable: true,
        impact: 'high'
      });
    }

    // Severe over-capacity
    if (stats.capacityPercentage > 120) {
      insightList.push({
        id: 'severe-capacity',
        type: 'critical',
        priority: 'urgent',
        icon: <FiBarChart className="w-4 h-4" />,
        title: 'Severe Capacity Overload',
        description: `${Math.round(stats.capacityPercentage - 100)}% over recommended capacity`,
        details: 'This level of overcommitment risks project quality and team burnout. Consider immediate workload rebalancing.',
        actionLabel: 'Rebalance Now',
        onAction: () => onProjectAction?.('capacity', 'rebalance'),
        dismissible: false,
        expandable: true,
        impact: 'high'
      });
    }

    // ACTIONABLE INSIGHTS (Amber indicators)

    // Projects ready to move
    const readyToActivate = projects.filter(p => 
      p.status === 'shelf' && p.isNextUp && stats.capacityPercentage < 90
    );
    
    if (readyToActivate.length > 0 && stats.activeProjects < 5) {
      insightList.push({
        id: 'ready-projects',
        type: 'opportunity',
        priority: 'high',
        icon: <FiTarget className="w-4 h-4" />,
        title: 'Projects Ready to Start',
        description: `${readyToActivate.length} project${readyToActivate.length > 1 ? 's are' : ' is'} ready to be activated`,
        details: `Current capacity allows for additional active projects. Consider promoting: ${readyToActivate.slice(0, 2).map(p => p.name).join(', ')}.`,
        actionLabel: 'Activate Projects',
        onAction: () => onProjectAction?.('ready', 'activate'),
        projects: readyToActivate.map(p => p.id),
        dismissible: true,
        expandable: true,
        impact: 'medium'
      });
    }

    // Capacity warning
    if (stats.capacityPercentage > 80 && stats.capacityPercentage <= 120) {
      insightList.push({
        id: 'capacity-warning',
        type: 'warning',
        priority: 'medium',
        icon: <FiUsers className="w-4 h-4" />,
        title: 'Approaching Capacity Limit',
        description: `Portfolio at ${Math.round(stats.capacityPercentage)}% capacity`,
        details: 'Consider completing current projects before taking on new ones. Review project priorities and timeline commitments.',
        actionLabel: 'Review Workload',
        onAction: () => onProjectAction?.('capacity', 'review'),
        dismissible: true,
        expandable: true,
        impact: 'medium'
      });
    }

    // Stalled projects detection
    const stalledProjects = projects.filter(p => {
      if (p.status !== 'active') return false;
      const lastUpdate = new Date(p.updatedAt || p.createdAt);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });

    if (stalledProjects.length > 0) {
      insightList.push({
        id: 'stalled-projects',
        type: 'warning',
        priority: 'medium',
        icon: <FiActivity className="w-4 h-4" />,
        title: 'Projects May Need Attention',
        description: `${stalledProjects.length} project${stalledProjects.length > 1 ? 's haven\'t' : ' hasn\'t'} been updated recently`,
        details: `Projects without recent activity may be blocked or need re-prioritization: ${stalledProjects.map(p => p.name).join(', ')}.`,
        actionLabel: 'Check Progress',
        onAction: () => onProjectAction?.('stalled', 'check'),
        projects: stalledProjects.map(p => p.id),
        dismissible: true,
        expandable: true,
        impact: 'medium'
      });
    }

    // CONTEXTUAL INFORMATION (Neutral indicators)

    // This week's priorities
    if (stats.activeProjects > 0) {
      const weeklyFocus = Math.min(stats.activeTasks, 5);
      insightList.push({
        id: 'weekly-focus',
        type: 'info',
        priority: 'low',
        icon: <FiCalendar className="w-4 h-4" />,
        title: 'This Week\'s Focus',
        description: `${weeklyFocus} priority task${weeklyFocus !== 1 ? 's' : ''} across active projects`,
        details: 'Focus on completing these key tasks to maintain project momentum and meet deadlines.',
        dismissible: true,
        expandable: false,
        impact: 'low'
      });
    }

    // Performance trends
    if (stats.totalTasks > 0) {
      const completionRate = Math.round((stats.completedTasks / stats.totalTasks) * 100);
      if (completionRate > 75) {
        insightList.push({
          id: 'excellent-progress',
          type: 'success',
          priority: 'low',
          icon: <FiCheckCircle className="w-4 h-4" />,
          title: 'Excellent Progress',
          description: `${completionRate}% of all tasks completed`,
          details: 'You\'re maintaining excellent momentum. Consider celebrating these wins and sharing progress with your team.',
          actionLabel: 'View Analytics',
          onAction: () => onProjectAction?.('progress', 'view'),
          dismissible: true,
          expandable: true,
          impact: 'low'
        });
      }
    }

    // Pipeline building suggestion
    if (stats.shelfProjects < 2 && stats.activeProjects > 0) {
      insightList.push({
        id: 'build-pipeline',
        type: 'opportunity',
        priority: 'low',
        icon: <FiPlus className="w-4 h-4" />,
        title: 'Build Your Project Pipeline',
        description: 'Consider adding future project ideas to your shelf',
        details: 'Having a pipeline of ideas helps maintain momentum when current projects are completed.',
        actionLabel: 'Add Ideas',
        ...(onCreateProject && { onAction: onCreateProject }),
        dismissible: true,
        expandable: false,
        impact: 'low'
      });
    }

    // First project prompt
    if (stats.totalProjects === 0) {
      insightList.push({
        id: 'first-project',
        type: 'opportunity',
        priority: 'high',
        icon: <FiPlus className="w-4 h-4" />,
        title: 'Start Your First Project',
        description: 'Create a project to begin organizing your work',
        details: 'Projects help you break down complex goals into manageable tasks and track progress over time.',
        actionLabel: 'Create Project',
        ...(onCreateProject && { onAction: onCreateProject }),
        dismissible: false,
        expandable: true,
        impact: 'high'
      });
    }

    // Filter out dismissed insights and sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return insightList
      .filter(insight => !dismissedInsights.has(insight.id))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5); // Limit to top 5 insights
  }, [projects, stats, dismissedInsights, onProjectAction, onCreateProject]);

  const dismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'critical':
        return {
          container: 'bg-nubank-pink-50 border-nubank-pink-200 border-l-nubank-pink-500',
          icon: 'text-nubank-pink-600 bg-nubank-pink-100',
          title: 'text-nubank-pink-900',
          description: 'text-nubank-pink-700',
          button: 'bg-nubank-pink-600 hover:bg-nubank-pink-700 text-white',
          dismiss: 'text-nubank-pink-500 hover:text-nubank-pink-700'
        };
      case 'warning':
        return {
          container: 'bg-nubank-orange-50 border-nubank-orange-200 border-l-nubank-orange-500',
          icon: 'text-nubank-orange-600 bg-nubank-orange-100',
          title: 'text-nubank-orange-900',
          description: 'text-nubank-orange-700',
          button: 'bg-nubank-orange-600 hover:bg-nubank-orange-700 text-white',
          dismiss: 'text-nubank-orange-500 hover:text-nubank-orange-700'
        };
      case 'opportunity':
        return {
          container: 'bg-nubank-blue-50 border-nubank-blue-200 border-l-nubank-blue-500',
          icon: 'text-nubank-blue-600 bg-nubank-blue-100',
          title: 'text-nubank-blue-900',
          description: 'text-nubank-blue-700',
          button: 'bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white',
          dismiss: 'text-nubank-blue-500 hover:text-nubank-blue-700'
        };
      case 'success':
        return {
          container: 'bg-nubank-purple-50 border-nubank-purple-200 border-l-nubank-purple-500',
          icon: 'text-nubank-purple-600 bg-nubank-purple-100',
          title: 'text-nubank-purple-900',
          description: 'text-nubank-purple-700',
          button: 'bg-nubank-purple-600 hover:bg-nubank-purple-700 text-white',
          dismiss: 'text-nubank-purple-500 hover:text-nubank-purple-700'
        };
      case 'info':
      default:
        return {
          container: 'bg-nubank-gray-50 border-nubank-gray-200 border-l-nubank-gray-400',
          icon: 'text-nubank-gray-600 bg-nubank-gray-100',
          title: 'text-nubank-gray-900',
          description: 'text-nubank-gray-700',
          button: 'bg-nubank-gray-600 hover:bg-nubank-gray-700 text-white',
          dismiss: 'text-nubank-gray-500 hover:text-nubank-gray-700'
        };
    }
  };

  // Auto-expand panel when critical alerts are present
  const hasCriticalAlerts = insights.some(insight => insight.type === 'critical');
  
  React.useEffect(() => {
    if (hasCriticalAlerts) {
      setPanelExpanded(true);
    }
  }, [hasCriticalAlerts]);

  return (
    <div className={`bg-white rounded-nubank-lg border border-nubank-gray-200 shadow-nubank transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="border-b border-nubank-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-nubank-orange-100">
              <FiZap className="w-4 h-4 text-nubank-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-nubank-gray-900">
              Intelligence
            </h2>
            {insights.length > 0 && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                hasCriticalAlerts 
                  ? 'bg-nubank-pink-100 text-nubank-pink-700'
                  : 'bg-nubank-blue-100 text-nubank-blue-700'
              }`}>
                {insights.length}
              </span>
            )}
          </div>
          
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            className="p-1 rounded transition-colors text-nubank-gray-500 hover:text-nubank-gray-700"
          >
            {panelExpanded ? 
              <FiChevronUp className="w-4 h-4" /> : 
              <FiChevronDown className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {panelExpanded && (
        <div className="p-4 space-y-3">
          {insights.length > 0 ? (
            insights.map((insight) => {
              const styles = getInsightStyles(insight.type);
              const isExpanded = expandedInsights.has(insight.id);
              
              return (
                <div
                  key={insight.id}
                  className={`border border-l-4 rounded-lg p-3 transition-all duration-200 ${styles.container}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full ${styles.icon} flex-shrink-0`}>
                        {insight.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-sm font-semibold ${styles.title}`}>
                            {insight.title}
                          </h3>
                          {insight.impact && (
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${styles.icon}`}>
                              {insight.impact}
                            </span>
                          )}
                        </div>
                        
                        <p className={`text-sm mt-1 ${styles.description}`}>
                          {insight.description}
                        </p>
                        
                        {insight.expandable && insight.details && isExpanded && (
                          <p className={`text-xs mt-2 ${styles.description} opacity-80`}>
                            {insight.details}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-2 mt-3">
                          {insight.actionLabel && insight.onAction && (
                            <button
                              onClick={insight.onAction}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors inline-flex items-center space-x-1 ${styles.button}`}
                            >
                              <span>{insight.actionLabel}</span>
                              <FiArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          
                          {insight.expandable && insight.details && (
                            <button
                              onClick={() => toggleInsightExpansion(insight.id)}
                              className={`text-xs ${styles.description} hover:opacity-80 transition-opacity`}
                            >
                              {isExpanded ? 'Show Less' : 'Learn More'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {insight.dismissible && (
                      <button
                        onClick={() => dismissInsight(insight.id)}
                        className={`p-1 rounded transition-colors ${styles.dismiss}`}
                        aria-label="Dismiss insight"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-nubank-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiCheckCircle className="w-6 h-6 text-nubank-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-nubank-gray-800 mb-1">All Clear</h3>
              <p className="text-xs text-nubank-gray-600">
                No actionable insights right now - you're doing great!
              </p>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};