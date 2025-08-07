import React from 'react';
import { FiTarget, FiTrendingUp, FiUsers, FiClock, FiAlertTriangle } from 'react-icons/fi';

interface QuickStats {
  progress: number;
  activeTasks: number;
  teamMembers: number;
  upcomingDeadlines: number;
  hasOverdue: boolean;
}

interface QuickStatsBarProps {
  stats: QuickStats;
}

export const QuickStatsBar: React.FC<QuickStatsBarProps> = ({ stats }) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'text-success-DEFAULT bg-success-DEFAULT/10';
    if (progress >= 50) return 'text-accent bg-accent/10';
    if (progress >= 25) return 'text-warning-DEFAULT bg-warning-DEFAULT/10';
    return 'text-danger-DEFAULT bg-danger-DEFAULT/10';
  };

  const getTasksColor = (activeTasks: number, hasOverdue: boolean) => {
    if (hasOverdue) return 'text-danger-DEFAULT bg-danger-DEFAULT/10';
    if (activeTasks > 10) return 'text-warning-DEFAULT bg-warning-DEFAULT/10';
    return 'text-success-DEFAULT bg-success-DEFAULT/10';
  };

  const getDeadlinesColor = (upcomingDeadlines: number) => {
    if (upcomingDeadlines > 5) return 'text-danger-DEFAULT bg-danger-DEFAULT/10';
    if (upcomingDeadlines > 2) return 'text-warning-DEFAULT bg-warning-DEFAULT/10';
    return 'text-success-DEFAULT bg-success-DEFAULT/10';
  };

  const statItems = [
    {
      label: 'Progress',
      value: `${stats.progress}%`,
      icon: <FiTarget className="w-5 h-5" />,
      colorClass: getProgressColor(stats.progress),
      trend: stats.progress > 50 ? 'up' : stats.progress > 25 ? 'stable' : 'down'
    },
    {
      label: 'Active Tasks',
      value: stats.activeTasks,
      icon: <FiTrendingUp className="w-5 h-5" />,
      colorClass: getTasksColor(stats.activeTasks, stats.hasOverdue),
      alert: stats.hasOverdue
    },
    {
      label: 'Team Members',
      value: stats.teamMembers || 'Solo',
      icon: <FiUsers className="w-5 h-5" />,
      colorClass: 'text-accent bg-accent/10'
    },
    {
      label: 'Due This Week',
      value: stats.upcomingDeadlines,
      icon: <FiClock className="w-5 h-5" />,
      colorClass: getDeadlinesColor(stats.upcomingDeadlines),
      alert: stats.upcomingDeadlines > 3
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat, index) => (
        <div
          key={index}
          className="bg-surface border border-border rounded-nubank-lg p-6 shadow-nubank hover:shadow-nubank-hover transition-all duration-300 group"
        >
          <div className="text-center space-y-3">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.colorClass} group-hover:scale-110 transition-transform duration-300`}>
              {stat.icon}
              {stat.alert && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger-DEFAULT rounded-full flex items-center justify-center">
                  <FiAlertTriangle className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="text-3xl font-bold text-textOnSurface group-hover:scale-105 transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-textAccent">
                {stat.label}
              </div>
            </div>

            {stat.trend && (
              <div className="flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${
                  stat.trend === 'up' ? 'bg-success-DEFAULT' : 
                  stat.trend === 'down' ? 'bg-danger-DEFAULT' : 
                  'bg-warning-DEFAULT'
                } animate-nubank-pulse`} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};