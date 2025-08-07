import React, { useMemo, memo } from 'react';
import { FiAlertTriangle, FiClock, FiTarget, FiPlus, FiActivity } from 'react-icons/fi';
import { Project } from '../../types/app';
import { PROJECT_STATUS_ACTIVE } from '../../constants/appConstants';

interface ProjectStatusHeaderProps {
  projects: Project[];
  onCreateProject: () => void;
  className?: string;
}

interface CriticalAlert {
  id: string;
  type: 'overdue' | 'stalled' | 'over_capacity';
  message: string;
  count: number;
  color: 'red' | 'amber' | 'green';
}

const ProjectStatusHeader: React.FC<ProjectStatusHeaderProps> = memo(({
  projects,
  onCreateProject,
  className = ''
}) => {
  const statusMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === PROJECT_STATUS_ACTIVE);
    const totalProjects = projects.length;
    
    // Calculate progress percentage across all active projects
    const totalProgress = activeProjects.length > 0 
      ? Math.round(activeProjects.reduce((sum, project) => {
          // Simulate progress calculation - in real app this would come from tasks
          const daysSinceCreated = Math.floor(
            (new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + Math.min(daysSinceCreated * 2, 100); // Simulate progress
        }, 0) / activeProjects.length)
      : 0;

    // Calculate stalled projects (no activity in last 7 days)
    const stalledProjects = activeProjects.filter(project => {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    }).length;

    // Critical alerts
    const alerts: CriticalAlert[] = [];
    
    if (stalledProjects > 0) {
      alerts.push({
        id: 'stalled',
        type: 'stalled',
        message: `${stalledProjects} projeto${stalledProjects > 1 ? 's' : ''} sem atividade`,
        count: stalledProjects,
        color: 'amber'
      });
    }

    if (activeProjects.length > 3) {
      alerts.push({
        id: 'over_capacity',
        type: 'over_capacity',
        message: 'Muitos projetos ativos - considere focar',
        count: activeProjects.length,
        color: 'red'
      });
    }

    // Simulate due today count
    const dueTodayCount = Math.floor(Math.random() * 3); // In real app, calculate from tasks

    return {
      totalProgress,
      activeCount: activeProjects.length,
      totalCount: totalProjects,
      dueTodayCount,
      alerts,
      hasHealthyState: alerts.length === 0 && activeProjects.length > 0
    };
  }, [projects]);

  const getStatusColor = () => {
    if (statusMetrics.alerts.some(a => a.color === 'red')) return 'red';
    if (statusMetrics.alerts.some(a => a.color === 'amber')) return 'amber';
    return 'green';
  };

  const statusColor = getStatusColor();

  const getStatusBackground = () => {
    switch (statusColor) {
      case 'red':
        return 'from-red-50 to-red-100 border-red-200';
      case 'amber':
        return 'from-amber-50 to-amber-100 border-amber-200';
      default:
        return 'from-green-50 to-green-100 border-green-200';
    }
  };

  const getAlertIcon = (type: CriticalAlert['type']) => {
    switch (type) {
      case 'stalled':
        return <FiClock className="w-4 h-4" />;
      case 'over_capacity':
        return <FiAlertTriangle className="w-4 h-4" />;
      default:
        return <FiActivity className="w-4 h-4" />;
    }
  };

  return (
    <header 
      className={`w-full h-auto lg:h-16 bg-gradient-to-r ${getStatusBackground()} border-b-2 px-4 sm:px-6 py-3 lg:py-0 shadow-sm ${className}`}
      role="banner"
      aria-label="Status do portfólio de projetos"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Left Section: Critical Alerts & Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Critical Alerts */}
          {statusMetrics.alerts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {statusMetrics.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                    alert.color === 'red'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                  role="alert"
                  aria-live="polite"
                >
                  {getAlertIcon(alert.type)}
                  <span className="hidden sm:inline">{alert.message}</span>
                  <span className="sm:hidden">Atenção</span>
                  <span className="bg-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                    {alert.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            statusMetrics.hasHealthyState && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs sm:text-sm font-semibold">
                <FiTarget className="w-4 h-4" />
                <span>Tudo em ordem</span>
              </div>
            )
          )}

          {/* Progress Indicator */}
          <div className="flex items-center space-x-3">
            <div className="text-xs sm:text-sm text-nubank-gray-700">
              <span className="font-semibold text-base sm:text-lg">{statusMetrics.totalProgress}%</span>
              <span className="ml-1 hidden sm:inline">progresso médio</span>
              <span className="ml-1 sm:hidden">progresso</span>
            </div>
            <div className="w-20 sm:w-24 h-2 bg-white rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 ${
                  statusMetrics.totalProgress > 80
                    ? 'bg-green-500'
                    : statusMetrics.totalProgress > 50
                    ? 'bg-nubank-purple-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${statusMetrics.totalProgress}%` }}
                role="progressbar"
                aria-valuenow={statusMetrics.totalProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso médio dos projetos"
              />
            </div>
          </div>

          {/* Due Today Count */}
          {statusMetrics.dueTodayCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs sm:text-sm font-semibold">
              <FiClock className="w-4 h-4" />
              <span className="hidden sm:inline">{statusMetrics.dueTodayCount} vencendo hoje</span>
              <span className="sm:hidden">{statusMetrics.dueTodayCount} hoje</span>
            </div>
          )}
        </div>

        {/* Right Section: Project Count & Action */}
        <div className="flex items-center justify-between sm:justify-start space-x-4">
          <div className="text-xs sm:text-sm text-nubank-gray-700">
            <span className="font-semibold">{statusMetrics.activeCount}</span>
            <span className="mx-1">de</span>
            <span className="font-semibold">{statusMetrics.totalCount}</span>
            <span className="ml-1 hidden sm:inline">projetos ativos</span>
            <span className="ml-1 sm:hidden">ativos</span>
          </div>

          <button
            onClick={onCreateProject}
            className="flex items-center bg-nubank-purple-600 hover:bg-nubank-purple-700 text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-nubank text-xs sm:text-sm"
            aria-label="Criar novo projeto"
          >
            <FiPlus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nova Ideia</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
    </header>
  );
});

ProjectStatusHeader.displayName = 'ProjectStatusHeader';

export default ProjectStatusHeader;