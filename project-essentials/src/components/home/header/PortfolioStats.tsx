import React from 'react';
import { FiTarget, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiActivity, FiLayers } from 'react-icons/fi';

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

interface PortfolioStatsProps {
  stats: ProjectStats;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: <FiLayers className="w-5 h-5" />,
      colorClass: 'text-primary bg-primary/10',
      description: 'Currently in progress'
    },
    {
      label: 'Next Up',
      value: stats.nextUpProjects,
      icon: <FiTarget className="w-5 h-5" />,
      colorClass: 'text-accent bg-accent/10',
      description: 'Ready to start'
    },
    {
      label: 'Active Tasks',
      value: stats.activeTasks,
      icon: <FiActivity className="w-5 h-5" />,
      colorClass: stats.overdueTasks > 0 ? 'text-danger-DEFAULT bg-danger-DEFAULT/10' : 'text-success-DEFAULT bg-success-DEFAULT/10',
      description: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'On track',
      alert: stats.overdueTasks > 0
    },
    {
      label: 'Completed Tasks',
      value: stats.completedTasks,
      icon: <FiCheckCircle className="w-5 h-5" />,
      colorClass: 'text-success-DEFAULT bg-success-DEFAULT/10',
      description: 'Total completed'
    },
    {
      label: 'Task Progress',
      value: stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%',
      icon: <FiTrendingUp className="w-5 h-5" />,
      colorClass: stats.totalTasks > 0 && (stats.completedTasks / stats.totalTasks) > 0.5 ? 'text-success-DEFAULT bg-success-DEFAULT/10' : 'text-warning-DEFAULT bg-warning-DEFAULT/10',
      description: `${stats.completedTasks}/${stats.totalTasks} tasks`
    },
    {
      label: 'On Shelf',
      value: stats.shelfProjects,
      icon: <FiTarget className="w-5 h-5" />,
      colorClass: 'text-textAccent bg-nubank-gray-100',
      description: 'Ideas & planning'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((stat, index) => (
        <div
          key={index}
          className="bg-surface border border-border rounded-nubank-lg p-4 sm:p-6 shadow-nubank hover:shadow-nubank-hover transition-all duration-300 group relative"
        >
          <div className="text-center space-y-3">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.colorClass} group-hover:scale-110 transition-transform duration-300 relative`}>
              {stat.icon}
              {stat.alert && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger-DEFAULT rounded-full flex items-center justify-center">
                  <FiAlertCircle className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-textOnSurface group-hover:scale-105 transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-textAccent">
                {stat.label}
              </div>
              <div className="text-xs text-textAccent/80">
                {stat.description}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};