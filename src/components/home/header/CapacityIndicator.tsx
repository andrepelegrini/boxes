import React, { useMemo } from 'react';
import { FiTrendingUp, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

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

interface CapacityIndicatorProps {
  stats: ProjectStats;
  userMaxActiveProjects: number;
}

export const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({
  stats,
  userMaxActiveProjects,
}) => {
  const capacityInfo = useMemo(() => {
    const percentage = stats.capacityPercentage;
    
    if (stats.isOverCapacity) {
      return {
        color: 'from-danger-DEFAULT to-danger-DEFAULT/80',
        bgColor: 'bg-danger-DEFAULT/10',
        textColor: 'text-danger-DEFAULT',
        icon: <FiAlertTriangle className="w-5 h-5" />,
        message: 'Over capacity - consider completing or archiving projects',
        status: 'Over Capacity'
      };
    }
    
    if (percentage > 80) {
      return {
        color: 'from-warning-DEFAULT to-warning-DEFAULT/80',
        bgColor: 'bg-warning-DEFAULT/10',
        textColor: 'text-warning-DEFAULT',
        icon: <FiTrendingUp className="w-5 h-5" />,
        message: 'Near capacity - focus on current projects',
        status: 'High Load'
      };
    }
    
    if (percentage > 50) {
      return {
        color: 'from-accent to-accent/80',
        bgColor: 'bg-accent/10',
        textColor: 'text-accent',
        icon: <FiTrendingUp className="w-5 h-5" />,
        message: 'Good momentum - balanced workload',
        status: 'Balanced'
      };
    }
    
    return {
      color: 'from-success-DEFAULT to-success-DEFAULT/80',
      bgColor: 'bg-success-DEFAULT/10',
      textColor: 'text-success-DEFAULT',
      icon: <FiCheckCircle className="w-5 h-5" />,
      message: 'Great capacity for new projects',
      status: 'Available'
    };
  }, [stats.capacityPercentage, stats.isOverCapacity]);

  return (
    <div className={`${capacityInfo.bgColor} border border-current/20 rounded-nubank-lg p-6`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`${capacityInfo.textColor} flex-shrink-0`}>
          {capacityInfo.icon}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${capacityInfo.textColor}`}>
              Team Focus Capacity
            </h3>
            <span className={`text-sm font-bold ${capacityInfo.textColor}`}>
              {stats.capacityUsed} / {stats.capacityTotal} points ({Math.round(stats.capacityPercentage)}%)
            </span>
          </div>
          
          <div className="w-full bg-white/50 rounded-full h-3 shadow-inner overflow-hidden">
            <div 
              className={`h-3 rounded-full bg-gradient-to-r ${capacityInfo.color} transition-all duration-500 ease-out shadow-sm relative overflow-hidden`}
              style={{ width: `${Math.min(stats.capacityPercentage, 100)}%` }}
            >
              {stats.capacityPercentage > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`text-sm ${capacityInfo.textColor}`}>
          <span className="font-semibold">{capacityInfo.status}:</span> {capacityInfo.message}
        </div>
        
        <div className="text-xs text-current/80">
          Max {userMaxActiveProjects} active projects
        </div>
      </div>
      
      {stats.isOverCapacity && (
        <div className="mt-3 p-3 bg-white/80 rounded-nubank border border-current/30">
          <p className="text-xs text-danger-DEFAULT font-medium">
            💡 Tip: Consider moving some active projects to "Next Up" or archiving completed ones
          </p>
        </div>
      )}
    </div>
  );
};