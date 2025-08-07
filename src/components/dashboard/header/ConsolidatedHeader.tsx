import React, { useMemo } from 'react';
import { FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiTarget, FiPlus, FiEye } from 'react-icons/fi';

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

interface ConsolidatedHeaderProps {
  stats: ProjectStats;
  onCreateProject: () => void;
  onToggleAnalytics?: () => void;
  userMaxActiveProjects: number;
  className?: string;
}

export const ConsolidatedHeader: React.FC<ConsolidatedHeaderProps> = ({
  stats,
  onCreateProject,
  onToggleAnalytics,
  userMaxActiveProjects,
  className = ''
}) => {
  // Critical alerts calculation
  const criticalAlerts = useMemo(() => {
    const alerts = [];
    
    if (stats.overdueTasks > 0) {
      alerts.push({
        type: 'overdue',
        count: stats.overdueTasks,
        message: `${stats.overdueTasks} task${stats.overdueTasks > 1 ? 's' : ''} overdue`,
        severity: 'critical' as const
      });
    }
    
    if (stats.isOverCapacity) {
      alerts.push({
        type: 'capacity',
        count: Math.round(stats.capacityPercentage - 100),
        message: `${Math.round(stats.capacityPercentage - 100)}% over capacity`,
        severity: 'warning' as const
      });
    }
    
    return alerts;
  }, [stats.overdueTasks, stats.isOverCapacity, stats.capacityPercentage]);

  // Focus items calculation
  const focusItems = useMemo(() => {
    let count = 0;
    if (stats.nextUpProjects > 0) count += stats.nextUpProjects;
    if (stats.activeTasks > 0) count += Math.min(stats.activeTasks, 5); // Cap at 5 for display
    return count;
  }, [stats.nextUpProjects, stats.activeTasks]);

  const progressPercentage = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  // Capacity indicator logic
  const capacityInfo = useMemo(() => {
    const percentage = stats.capacityPercentage;
    
    if (stats.isOverCapacity) {
      return {
        color: 'from-danger-DEFAULT to-danger-DEFAULT/80',
        bgColor: 'bg-danger-DEFAULT/10',
        textColor: 'text-danger-DEFAULT',
        icon: <FiAlertTriangle className="w-4 h-4" />,
        message: 'Over capacity',
        status: 'Over Capacity'
      };
    }
    
    if (percentage > 80) {
      return {
        color: 'from-warning-DEFAULT to-warning-DEFAULT/80',
        bgColor: 'bg-warning-DEFAULT/10',
        textColor: 'text-warning-DEFAULT',
        icon: <FiTrendingUp className="w-4 h-4" />,
        message: 'Near capacity',
        status: 'High Load'
      };
    }
    
    if (percentage > 50) {
      return {
        color: 'from-accent to-accent/80',
        bgColor: 'bg-accent/10',
        textColor: 'text-accent',
        icon: <FiTrendingUp className="w-4 h-4" />,
        message: 'Balanced workload',
        status: 'Balanced'
      };
    }
    
    return {
      color: 'from-success-DEFAULT to-success-DEFAULT/80',
      bgColor: 'bg-success-DEFAULT/10',
      textColor: 'text-success-DEFAULT',
      icon: <FiCheckCircle className="w-4 h-4" />,
      message: 'Great capacity for new projects',
      status: 'Available'
    };
  }, [stats.capacityPercentage, stats.isOverCapacity]);

  return (
    <header className={`bg-white border border-gray-200 rounded-xl shadow-lg p-4 ${className}`}>
      <div className="px-2">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* LEFT: Portfolio Status Summary */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <FiTrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {stats.activeProjects}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Active Projects</div>
                </div>
              </div>

              {/* Health Indicator */}
              <div className="flex items-center space-x-2">
                {criticalAlerts.length > 0 ? (
                  <div className="flex items-center space-x-2 bg-red-50 text-red-600 px-3 py-1 rounded-full">
                    <FiAlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{criticalAlerts.length} alert{criticalAlerts.length > 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-green-50 text-green-600 px-3 py-1 rounded-full">
                    <FiCheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Healthy</span>
                  </div>
                )}
              </div>
            </div>

            {/* Critical Alerts Row */}
            {criticalAlerts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {criticalAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 rounded-md text-xs font-medium flex items-center space-x-1 ${
                      alert.severity === 'critical'
                        ? 'bg-nubank-pink-100 text-nubank-pink-700 border border-nubank-pink-200'
                        : 'bg-nubank-orange-100 text-nubank-orange-700 border border-nubank-orange-200'
                    }`}
                  >
                    <FiAlertTriangle className="w-3 h-3" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* This Week's Focus */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center space-x-2 text-xs">
                <FiTarget className="w-3 h-3 text-blue-500" />
                <span className="text-gray-600 font-medium">This week:</span>
                <span className="font-bold text-gray-900">{focusItems} items</span>
                <span className="text-gray-400">•</span>
                <span className="text-blue-600 font-semibold">{progressPercentage}% completed</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Team Focus Capacity & Actions */}
          <div className="flex-1 lg:max-w-md space-y-3">
            {/* Team Focus Capacity */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`${capacityInfo.textColor} flex-shrink-0`}>
                    {capacityInfo.icon}
                  </div>
                  <h3 className={`text-sm font-bold ${capacityInfo.textColor}`}>
                    Team Focus Capacity
                  </h3>
                </div>
                <span className={`text-xs font-bold ${capacityInfo.textColor} bg-white px-2 py-0.5 rounded-full`}>
                  {stats.capacityUsed} / {stats.capacityTotal} points ({Math.round(stats.capacityPercentage)}%)
                </span>
              </div>
              
              <div className="w-full bg-white rounded-full h-2 mb-2 shadow-inner">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${capacityInfo.color} transition-all duration-500 ease-out shadow-sm`}
                  style={{ width: `${Math.min(stats.capacityPercentage, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className={`${capacityInfo.textColor} font-semibold`}>
                  {capacityInfo.status}: {capacityInfo.message}
                </span>
                <span className="text-gray-600 font-medium">
                  Max {userMaxActiveProjects} active projects
                </span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={onCreateProject}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105 hover:shadow-xl flex items-center space-x-2"
              >
                <FiPlus className="w-4 h-4" />
                <span>New Project</span>
              </button>
              
              {onToggleAnalytics && (
                <button
                  onClick={onToggleAnalytics}
                  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-lg flex items-center space-x-2"
                >
                  <FiEye className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};