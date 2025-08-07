import React, { useState, useMemo, memo } from 'react';
import { 
  FiTarget, FiActivity, FiUsers, FiCalendar, FiTrendingUp, 
  FiChevronDown, FiChevronUp, FiCpu, FiAlertCircle,
  FiCheckCircle, FiClock, FiStar
} from 'react-icons/fi';
import { Project, Task } from '../../types/app';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_SHELF } from '../../constants/appConstants';

interface CompactProjectSidebarProps {
  projects: Project[];
  tasks?: Task[];
  className?: string;
}

interface ProjectMetrics {
  progressPercentage: number;
  activeTasks: number;
  teamSize: number;
  dueSoonCount: number;
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'risk' | 'suggestion';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
}

const CompactProjectSidebar: React.FC<CompactProjectSidebarProps> = memo(({
  projects,
  tasks = [],
  className = ''
}) => {
  const [isAIInsightsExpanded, setIsAIInsightsExpanded] = useState(true);

  const metrics = useMemo((): ProjectMetrics => {
    const activeProjects = projects.filter(p => p.status === PROJECT_STATUS_ACTIVE);
    const activeTasks = tasks.filter(t => !t.completed);
    
    // Calculate average progress across active projects
    const totalProgress = activeProjects.length > 0
      ? activeProjects.reduce((sum, project) => {
          // Simulate progress calculation
          const daysSinceCreated = Math.floor(
            (new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + Math.min(daysSinceCreated * 3, 100);
        }, 0) / activeProjects.length
      : 0;

    // Simulate team size calculation
    const uniqueAssignees = new Set(tasks.map(t => t.assignee).filter(Boolean));
    const teamSize = uniqueAssignees.size || 1;

    // Calculate tasks due this week
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    const dueSoonCount = activeTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate <= oneWeekFromNow;
    }).length;

    return {
      progressPercentage: Math.round(totalProgress),
      activeTasks: activeTasks.length,
      teamSize,
      dueSoonCount
    };
  }, [projects, tasks]);

  const aiInsights = useMemo((): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Generate contextual insights based on current state
    if (metrics.dueSoonCount > 5) {
      insights.push({
        id: 'high-workload',
        type: 'risk',
        priority: 'high',
        title: 'Carga alta detectada',
        description: `${metrics.dueSoonCount} tarefas vencem esta semana. Considere redistribuir.`,
        actionable: true
      });
    }

    if (metrics.progressPercentage < 30) {
      insights.push({
        id: 'slow-progress',
        type: 'recommendation',
        priority: 'medium',
        title: 'Progresso lento',
        description: 'Projetos com pouca evolução. Revisar bloqueios?',
        actionable: true
      });
    }

    const nextUpProjects = projects.filter(p => p.status === PROJECT_STATUS_SHELF && p.isNextUp);
    if (nextUpProjects.length > 2) {
      insights.push({
        id: 'many-next-up',
        type: 'suggestion',
        priority: 'low',
        title: 'Muitos projetos priorizados',
        description: 'Foco em menos projetos pode aumentar eficiência.',
        actionable: true
      });
    }

    // Add positive insight if things are going well
    if (metrics.progressPercentage > 70 && metrics.dueSoonCount < 3) {
      insights.push({
        id: 'good-momentum',
        type: 'recommendation',
        priority: 'low',
        title: 'Excelente momentum!',
        description: 'Projetos avançando bem. Mantenha o ritmo.',
        actionable: false
      });
    }

    return insights.slice(0, 3); // Limit to 3 insights
  }, [metrics, projects]);

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'risk':
        return <FiAlertCircle className="w-3 h-3" />;
      case 'recommendation':
        return <FiTrendingUp className="w-3 h-3" />;
      default:
        return <FiCpu className="w-3 h-3" />;
    }
  };

  const getInsightColor = (type: AIInsight['type'], priority: AIInsight['priority']) => {
    if (type === 'risk') return 'text-red-600 bg-red-50 border-red-200';
    if (priority === 'high') return 'text-amber-600 bg-amber-50 border-amber-200';
    if (priority === 'medium') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <aside 
      className={`w-full bg-white rounded-lg shadow-sm border border-nubank-gray-200 ${className}`}
      role="complementary"
      aria-label="Métricas e insights do projeto"
    >
      <div className="p-4 space-y-4">
        
        {/* Project Metrics Block */}
        <div className="bg-nubank-gray-50 rounded-lg p-3 border border-nubank-gray-100">
          <h3 className="text-sm font-semibold text-nubank-gray-800 mb-3 flex items-center">
            <FiTarget className="w-4 h-4 mr-2 text-nubank-purple-600" />
            Métricas do Portfólio
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-nubank-gray-600">
                <FiActivity className="w-3 h-3 mr-1" />
                <span className="text-xs">Progresso:</span>
              </div>
              <span className="font-semibold text-nubank-gray-800">{metrics.progressPercentage}%</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-nubank-gray-600">
                <FiCheckCircle className="w-3 h-3 mr-1" />
                <span className="text-xs">Tarefas ativas:</span>
              </div>
              <span className="font-semibold text-nubank-gray-800">{metrics.activeTasks}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-nubank-gray-600">
                <FiUsers className="w-3 h-3 mr-1" />
                <span className="text-xs">Time:</span>
              </div>
              <span className="font-semibold text-nubank-gray-800">{metrics.teamSize} pessoa{metrics.teamSize > 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-nubank-gray-600">
                <FiClock className="w-3 h-3 mr-1" />
                <span className="text-xs">Esta semana:</span>
              </div>
              <span className={`font-semibold ${metrics.dueSoonCount > 3 ? 'text-amber-600' : 'text-nubank-gray-800'}`}>
                {metrics.dueSoonCount} due
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-nubank-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  metrics.progressPercentage > 70
                    ? 'bg-green-500'
                    : metrics.progressPercentage > 40
                    ? 'bg-nubank-purple-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${metrics.progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={metrics.progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso do portfólio: ${metrics.progressPercentage}%`}
              />
            </div>
          </div>
        </div>

        {/* AI Insights Block */}
        <div className="bg-nubank-orange-50 rounded-lg border border-nubank-orange-100">
          <button
            onClick={() => setIsAIInsightsExpanded(!isAIInsightsExpanded)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-nubank-orange-100 transition-colors rounded-lg"
            aria-expanded={isAIInsightsExpanded}
            aria-controls="ai-insights-content"
          >
            <h3 className="text-sm font-semibold text-nubank-orange-800 flex items-center">
              <FiCpu className="w-4 h-4 mr-2" />
              AI Insights ({aiInsights.length})
            </h3>
            {isAIInsightsExpanded ? (
              <FiChevronUp className="w-4 h-4 text-nubank-orange-600" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-nubank-orange-600" />
            )}
          </button>
          
          {isAIInsightsExpanded && (
            <div id="ai-insights-content" className="px-3 pb-3 space-y-2">
              {aiInsights.length > 0 ? (
                aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-2 rounded border text-xs ${getInsightColor(insight.type, insight.priority)}`}
                  >
                    <div className="flex items-start space-x-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="opacity-90 leading-relaxed">{insight.description}</p>
                        {insight.actionable && (
                          <button className="mt-1 text-xs underline hover:no-underline">
                            Revisar agora
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <FiStar className="w-6 h-6 text-nubank-orange-400 mx-auto mb-2" />
                  <p className="text-xs text-nubank-orange-700">
                    Tudo funcionando bem!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-nubank-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center space-x-1 py-2 px-3 text-xs bg-nubank-purple-50 text-nubank-purple-700 rounded border border-nubank-purple-200 hover:bg-nubank-purple-100 transition-colors">
              <FiCalendar className="w-3 h-3" />
              <span>Revisar</span>
            </button>
            <button className="flex items-center justify-center space-x-1 py-2 px-3 text-xs bg-nubank-blue-50 text-nubank-blue-700 rounded border border-nubank-blue-200 hover:bg-nubank-blue-100 transition-colors">
              <FiTrendingUp className="w-3 h-3" />
              <span>Relatório</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});

CompactProjectSidebar.displayName = 'CompactProjectSidebar';

export default CompactProjectSidebar;