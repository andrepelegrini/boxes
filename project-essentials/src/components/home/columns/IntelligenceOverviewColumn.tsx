import React, { useMemo, useCallback } from 'react';
import { FiZap, FiTrendingUp, FiAlertTriangle, FiTarget, FiCheckCircle, FiPlus, FiEye } from 'react-icons/fi';
import { Project } from '../../../types/app';
import { useAppProjects } from '../../../contexts/SimplifiedRootProvider';
import { useSlackTaskDiscovery } from '../../../modules/slack/hooks';

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

interface IntelligenceOverviewColumnProps {
  projects: Project[];
  stats: ProjectStats;
  onAIInsights: () => void;
  onCreateProject: () => void;
}

export const IntelligenceOverviewColumn: React.FC<IntelligenceOverviewColumnProps> = ({
  projects,
  stats,
  onAIInsights,
  onCreateProject,
}) => {
  const { promoteProjectToActive, toggleNextUp } = useAppProjects();
  const { suggestionCounts } = useSlackTaskDiscovery();

  const handleInsightAction = useCallback(async (insight: any) => {
    try {
      switch (insight.action) {
        case 'Review overdue items':
          // Action handled by UI - no backend storage needed
          console.log('Review overdue items action triggered');
          break;

        case 'Create new project':
          onCreateProject?.();
          break;

        case 'Activate next project':
          const nextUpProject = projects.find(p => p.isNextUp);
          if (nextUpProject) {
            promoteProjectToActive(nextUpProject.id);
          }
          break;

        case 'Review shelf projects':
          // Action handled by UI - no backend storage needed
          console.log('Review shelf projects action triggered');
          break;

        default:
          // Handle any other insight actions
          console.log(`Insight action triggered: ${insight.action}`);
      }
    } catch (error) {
      console.error('Failed to handle insight action:', error);
    }
  }, [projects, promoteProjectToActive, toggleNextUp, onCreateProject]);
  const portfolioInsights = useMemo(() => {
    const insights = [];

    // Overdue tasks insight
    if (stats.overdueTasks > 0) {
      insights.push({
        id: 'overdue-tasks',
        type: 'alert',
        icon: <FiAlertTriangle className="w-4 h-4" />,
        title: 'Overdue Tasks Need Attention',
        description: `${stats.overdueTasks} task${stats.overdueTasks > 1 ? 's are' : ' is'} overdue across your projects`,
        action: 'Review overdue items',
        priority: 'high'
      });
    }

    // Capacity management insight
    if (stats.isOverCapacity) {
      insights.push({
        id: 'over-capacity',
        type: 'warning',
        icon: <FiTrendingUp className="w-4 h-4" />,
        title: 'Over Capacity',
        description: 'Consider archiving completed projects or moving some to "Next Up"',
        action: 'Optimize workload',
        priority: 'high'
      });
    } else if (stats.capacityPercentage < 30 && stats.nextUpProjects > 0) {
      insights.push({
        id: 'available-capacity',
        type: 'opportunity',
        icon: <FiTarget className="w-4 h-4" />,
        title: 'Available Capacity',
        description: `You have room to promote ${Math.min(stats.nextUpProjects, 2)} project${stats.nextUpProjects > 1 ? 's' : ''} from "Next Up"`,
        action: 'Activate projects',
        priority: 'medium'
      });
    }

    // Progress insight
    if (stats.completedTasks > 0 && stats.totalTasks > 0) {
      const overallProgress = (stats.completedTasks / stats.totalTasks) * 100;
      if (overallProgress > 75) {
        insights.push({
          id: 'great-progress',
          type: 'success',
          icon: <FiCheckCircle className="w-4 h-4" />,
          title: 'Excellent Progress',
          description: `${Math.round(overallProgress)}% of all tasks completed - great momentum!`,
          action: 'Keep it up',
          priority: 'low'
        });
      }
    }

    // Project creation suggestion
    if (stats.totalProjects === 0) {
      insights.push({
        id: 'first-project',
        type: 'opportunity',
        icon: <FiPlus className="w-4 h-4" />,
        title: 'Start Your Journey',
        description: 'Create your first project to begin organizing your work',
        action: 'Create project',
        priority: 'high'
      });
    } else if (stats.shelfProjects === 0 && stats.activeProjects < 3) {
      insights.push({
        id: 'planning-projects',
        type: 'opportunity',
        icon: <FiTarget className="w-4 h-4" />,
        title: 'Build Your Pipeline',
        description: 'Consider adding some ideas to your project shelf for future development',
        action: 'Add ideas',
        priority: 'low'
      });
    }

    // AI Task Suggestions insight - highest priority
    const totalPendingSuggestions = Object.values(suggestionCounts || {}).reduce((sum, count) => sum + count, 0);
    if (totalPendingSuggestions > 0) {
      insights.unshift({ // Add to beginning for highest priority
        id: 'ai-task-suggestions',
        type: 'ai-insight',
        icon: <FiZap className="w-4 h-4" />,
        title: 'AI Task Suggestions Available',
        description: `${totalPendingSuggestions} task${totalPendingSuggestions > 1 ? 's' : ''} suggested from your team communications`,
        action: 'Review suggestions',
        priority: 'high',
        count: totalPendingSuggestions
      });
    }

    return insights.slice(0, 3); // Show top 3 insights
  }, [projects, stats, suggestionCounts]);

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'alert':
        return {
          bg: 'bg-danger-DEFAULT/10',
          border: 'border-danger-DEFAULT/20',
          text: 'text-danger-DEFAULT',
          button: 'bg-danger-DEFAULT hover:bg-danger-DEFAULT/90'
        };
      case 'warning':
        return {
          bg: 'bg-warning-DEFAULT/10',
          border: 'border-warning-DEFAULT/20',
          text: 'text-warning-DEFAULT',
          button: 'bg-warning-DEFAULT hover:bg-warning-DEFAULT/90'
        };
      case 'success':
        return {
          bg: 'bg-success-DEFAULT/10',
          border: 'border-success-DEFAULT/20',
          text: 'text-success-DEFAULT',
          button: 'bg-success-DEFAULT hover:bg-success-DEFAULT/90'
        };
      case 'ai-insight':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
          border: 'border-purple-200',
          text: 'text-purple-700',
          button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25'
        };
      default:
        return {
          bg: 'bg-accent/10',
          border: 'border-accent/20',
          text: 'text-accent',
          button: 'bg-accent hover:bg-accent/90'
        };
    }
  };

  return (
    <div className="bg-surface rounded-nubank-lg border border-border shadow-nubank">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-textOnSurface flex items-center">
            <FiZap className="w-5 h-5 mr-3 text-nubank-orange-500" />
            Portfolio Intelligence
          </h2>
          <button
            onClick={onAIInsights}
            className="text-sm text-nubank-orange-600 hover:text-nubank-orange-700 transition-colors"
          >
            Generate insights
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {portfolioInsights.length > 0 ? (
          portfolioInsights.map((insight) => {
            const colors = getInsightColor(insight.type);
            return (
              <div
                key={insight.id}
                className={`${colors.bg} ${colors.border} border rounded-nubank p-4 transition-all duration-300 hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${colors.text} flex-shrink-0 mt-0.5`}>
                    {insight.icon}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className={`font-semibold ${colors.text} text-sm`}>
                        {insight.title}
                      </h4>
                      <p className="text-sm text-nubank-gray-700 mt-1">
                        {insight.description}
                      </p>
                    </div>
                    
                    <button
                      onClick={insight.id === 'first-project' ? onCreateProject : insight.id === 'ai-task-suggestions' ? () => window.location.href = '#/ai-suggestions' : () => handleInsightAction(insight)}
                      className={`text-xs font-medium ${colors.button} text-white px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 flex items-center gap-1.5`}
                    >
                      {insight.id === 'ai-task-suggestions' && <FiEye className="w-3 h-3" />}
                      {insight.action}
                      {insight.count && (
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-bold">
                          {insight.count}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <FiZap className="w-12 h-12 text-nubank-orange-300 mx-auto mb-3" />
            <p className="text-sm text-textAccent">
              No actionable insights right now - you're doing great!
            </p>
          </div>
        )}
        
        <div className="border-t border-border pt-4">
          <button
            onClick={onAIInsights}
            className="w-full text-sm text-nubank-orange-600 hover:text-nubank-orange-700 transition-colors py-2 px-3 border border-nubank-orange-200 rounded-nubank hover:bg-nubank-orange-50"
          >
            Analyze my portfolio with AI
          </button>
        </div>
      </div>
    </div>
  );
};