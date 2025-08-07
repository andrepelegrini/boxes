import React, { useMemo } from 'react';
import { FiAlertTriangle, FiClock, FiUsers, FiBarChart2, FiX, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

interface Project {
  id: string;
  name: string;
  status: string;
  overdueTasks?: number;
  blockedTasks?: number;
  weight?: number;
  isOverCapacity?: boolean;
}

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  isOverdue?: boolean;
  projectId: string;
}

interface CriticalAlert {
  id: string;
  type: 'overdue' | 'blocked' | 'capacity' | 'attention';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  projects?: string[];
  tasks?: string[];
  canDismiss?: boolean;
}

interface CriticalAlertsProps {
  projects: Project[];
  tasks?: Task[];
  capacityUsed: number;
  capacityTotal: number;
  onAlertAction?: (alertId: string, action: string) => void;
  onDismissAlert?: (alertId: string) => void;
  className?: string;
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({
  projects,
  tasks = [],
  capacityUsed,
  capacityTotal,
  onAlertAction,
  onDismissAlert,
  className = ''
}) => {
  const alerts = useMemo((): CriticalAlert[] => {
    const alertList: CriticalAlert[] = [];

    // Overdue tasks alert
    const overdueTasks = tasks.filter(task => task.isOverdue);
    if (overdueTasks.length > 0) {
      const affectedProjects = [...new Set(overdueTasks.map(task => task.projectId))];
      alertList.push({
        id: 'overdue-tasks',
        type: 'overdue',
        severity: 'critical',
        title: 'Overdue Tasks',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} past due across ${affectedProjects.length} project${affectedProjects.length > 1 ? 's' : ''}`,
        count: overdueTasks.length,
        actionLabel: 'Review Tasks',
        onAction: () => onAlertAction?.('overdue-tasks', 'review'),
        projects: affectedProjects,
        tasks: overdueTasks.map(t => t.id),
        canDismiss: false
      });
    }

    // Capacity overflow alert
    const capacityPercentage = capacityTotal > 0 ? (capacityUsed / capacityTotal) * 100 : 0;
    if (capacityPercentage > 100) {
      alertList.push({
        id: 'over-capacity',
        type: 'capacity',
        severity: 'warning',
        title: 'Over Capacity',
        message: `Portfolio is ${Math.round(capacityPercentage - 100)}% over recommended capacity`,
        count: Math.round(capacityPercentage - 100),
        actionLabel: 'Rebalance',
        onAction: () => onAlertAction?.('over-capacity', 'rebalance'),
        canDismiss: true
      });
    }

    // Blocked projects alert
    const blockedProjects = projects.filter(p => (p.blockedTasks || 0) > 0);
    if (blockedProjects.length > 0) {
      const totalBlockedTasks = blockedProjects.reduce((sum, p) => sum + (p.blockedTasks || 0), 0);
      alertList.push({
        id: 'blocked-projects',
        type: 'blocked',
        severity: 'warning',
        title: 'Blocked Tasks',
        message: `${totalBlockedTasks} task${totalBlockedTasks > 1 ? 's are' : ' is'} blocked in ${blockedProjects.length} project${blockedProjects.length > 1 ? 's' : ''}`,
        count: totalBlockedTasks,
        actionLabel: 'Unblock',
        onAction: () => onAlertAction?.('blocked-projects', 'unblock'),
        projects: blockedProjects.map(p => p.id),
        canDismiss: true
      });
    }

    // Projects needing attention (80% capacity warning)
    if (capacityPercentage > 80 && capacityPercentage <= 100) {
      alertList.push({
        id: 'capacity-warning',
        type: 'attention',
        severity: 'info',
        title: 'Approaching Capacity',
        message: `Portfolio is at ${Math.round(capacityPercentage)}% capacity`,
        actionLabel: 'Plan Ahead',
        onAction: () => onAlertAction?.('capacity-warning', 'plan'),
        canDismiss: true
      });
    }

    // Sort by severity
    return alertList.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [projects, tasks, capacityUsed, capacityTotal, onAlertAction]);

  const getAlertIcon = (type: CriticalAlert['type']) => {
    switch (type) {
      case 'overdue':
        return <FiClock className="w-4 h-4" />;
      case 'blocked':
        return <FiAlertTriangle className="w-4 h-4" />;
      case 'capacity':
        return <FiBarChart2 className="w-4 h-4" />;
      case 'attention':
        return <FiUsers className="w-4 h-4" />;
      default:
        return <FiAlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertStyles = (severity: CriticalAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-nubank-pink-50 border-nubank-pink-200 border-l-nubank-pink-500',
          icon: 'text-nubank-pink-600 bg-nubank-pink-100',
          title: 'text-nubank-pink-900',
          message: 'text-nubank-pink-700',
          button: 'bg-nubank-pink-600 hover:bg-nubank-pink-700 text-white',
          dismiss: 'text-nubank-pink-500 hover:text-nubank-pink-700'
        };
      case 'warning':
        return {
          container: 'bg-nubank-orange-50 border-nubank-orange-200 border-l-nubank-orange-500',
          icon: 'text-nubank-orange-600 bg-nubank-orange-100',
          title: 'text-nubank-orange-900',
          message: 'text-nubank-orange-700',
          button: 'bg-nubank-orange-600 hover:bg-nubank-orange-700 text-white',
          dismiss: 'text-nubank-orange-500 hover:text-nubank-orange-700'
        };
      case 'info':
        return {
          container: 'bg-nubank-blue-50 border-nubank-blue-200 border-l-nubank-blue-500',
          icon: 'text-nubank-blue-600 bg-nubank-blue-100',
          title: 'text-nubank-blue-900',
          message: 'text-nubank-blue-700',
          button: 'bg-nubank-blue-600 hover:bg-nubank-blue-700 text-white',
          dismiss: 'text-nubank-blue-500 hover:text-nubank-blue-700'
        };
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={`bg-nubank-blue-50 border border-nubank-blue-200 border-l-4 border-l-nubank-blue-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-nubank-blue-100">
            <FiCheckCircle className="w-4 h-4 text-nubank-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-nubank-blue-900">All Clear</h3>
            <p className="text-sm text-nubank-blue-700">No critical issues requiring immediate attention</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert) => {
        const styles = getAlertStyles(alert.severity);
        return (
          <div
            key={alert.id}
            className={`border border-l-4 rounded-lg p-4 transition-all duration-200 ${styles.container}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${styles.icon} flex-shrink-0`}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-sm font-semibold ${styles.title}`}>
                      {alert.title}
                    </h3>
                    {alert.count && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.icon}`}>
                        {alert.count}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${styles.message}`}>
                    {alert.message}
                  </p>
                  
                  {alert.actionLabel && alert.onAction && (
                    <button
                      onClick={alert.onAction}
                      className={`mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center space-x-1 ${styles.button}`}
                    >
                      <span>{alert.actionLabel}</span>
                      <FiArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {alert.canDismiss && onDismissAlert && (
                <button
                  onClick={() => onDismissAlert(alert.id)}
                  className={`p-1 rounded transition-colors ${styles.dismiss}`}
                  aria-label="Dismiss alert"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};