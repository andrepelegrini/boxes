import React from 'react';
import { FiX, FiTrendingUp, FiTarget, FiActivity, FiBarChart2, FiUsers } from 'react-icons/fi';

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

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
  tasks: any[];
  activityLogs: any[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  projects,
  tasks,
}) => {
  if (!isOpen) return null;

  // Calculate stats from raw data
  const stats: ProjectStats = React.useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const nextUpProjects = projects.filter(p => p.status === 'next_up').length;
    const shelfProjects = projects.filter(p => p.status === 'shelf').length;
    const archivedProjects = projects.filter(p => p.status === 'archived').length;
    const totalProjects = projects.length;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const activeTasks = tasks.filter(t => t.status === 'active' || t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => {
      if (t.dueDate && t.status !== 'completed') {
        return new Date(t.dueDate) < new Date();
      }
      return false;
    }).length;
    const totalTasks = tasks.length;

    // Calculate capacity (simplified - using task count as weight)
    const capacityUsed = activeTasks;
    const capacityTotal = totalProjects * 10; // Assume 10 tasks per project capacity
    const capacityPercentage = capacityTotal > 0 ? (capacityUsed / capacityTotal) * 100 : 0;
    const isOverCapacity = capacityPercentage > 100;

    return {
      activeProjects,
      nextUpProjects,
      shelfProjects,
      archivedProjects,
      totalProjects,
      completedTasks,
      activeTasks,
      overdueTasks,
      totalTasks,
      capacityUsed,
      capacityTotal,
      capacityPercentage,
      isOverCapacity
    };
  }, [projects, tasks]);

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const averageTasksPerProject = stats.totalProjects > 0 ? Math.round(stats.totalTasks / stats.totalProjects) : 0;

  const analyticsData = [
    {
      title: 'Project Distribution',
      icon: FiTarget,
      color: 'text-nubank-purple-600',
      bgColor: 'bg-nubank-purple-100',
      data: [
        { label: 'Active Projects', value: stats.activeProjects, color: 'bg-nubank-purple-500' },
        { label: 'Next Up Projects', value: stats.nextUpProjects, color: 'bg-nubank-blue-500' },
        { label: 'Shelf Projects', value: stats.shelfProjects, color: 'bg-nubank-gray-400' },
        { label: 'Archived Projects', value: stats.archivedProjects, color: 'bg-nubank-gray-300' }
      ]
    },
    {
      title: 'Task Performance',
      icon: FiActivity,
      color: 'text-nubank-blue-600',
      bgColor: 'bg-nubank-blue-100',
      data: [
        { label: 'Completed Tasks', value: stats.completedTasks, color: 'bg-success-DEFAULT' },
        { label: 'Active Tasks', value: stats.activeTasks, color: 'bg-nubank-blue-500' },
        { label: 'Overdue Tasks', value: stats.overdueTasks, color: 'bg-danger-DEFAULT' }
      ]
    },
    {
      title: 'Capacity Management',
      icon: FiBarChart2,
      color: 'text-nubank-orange-600',
      bgColor: 'bg-nubank-orange-100',
      data: [
        { label: 'Current Capacity', value: `${Math.round(stats.capacityPercentage)}%`, color: stats.isOverCapacity ? 'bg-danger-DEFAULT' : 'bg-success-DEFAULT' },
        { label: 'Weight Used', value: stats.capacityUsed, color: 'bg-nubank-orange-500' },
        { label: 'Total Capacity', value: stats.capacityTotal, color: 'bg-nubank-gray-400' }
      ]
    }
  ];

  const keyMetrics = [
    { label: 'Total Projects', value: stats.totalProjects, icon: FiTarget },
    { label: 'Total Tasks', value: stats.totalTasks, icon: FiActivity },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: FiTrendingUp },
    { label: 'Avg Tasks/Project', value: averageTasksPerProject, icon: FiUsers }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-nubank-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-nubank-lg">
        <div className="bg-white border-b border-nubank-gray-200 px-6 py-4 flex items-center justify-between rounded-t-nubank-lg flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-nubank-purple-500 to-nubank-blue-500 rounded-full flex items-center justify-center">
              <FiBarChart2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-nubank-gray-900">Portfolio Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-nubank-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-nubank-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {keyMetrics.map((metric, index) => (
              <div key={index} className="bg-nubank-gray-50 rounded-nubank p-4 text-center">
                <metric.icon className="w-6 h-6 text-nubank-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-nubank-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-nubank-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Analytics Sections */}
          <div className="space-y-6">
            {analyticsData.map((section, index) => (
              <div key={index} className="bg-white border border-nubank-gray-200 rounded-nubank-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-8 h-8 ${section.bgColor} rounded-full flex items-center justify-center`}>
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-nubank-gray-900">{section.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.data.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-3 bg-nubank-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-nubank-gray-700">{item.label}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-nubank-gray-900">{item.value}</span>
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual representation for capacity */}
                {section.title === 'Capacity Management' && (
                  <div className="mt-4">
                    <div className="w-full bg-nubank-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          stats.isOverCapacity ? 'bg-danger-DEFAULT' : 'bg-success-DEFAULT'
                        }`}
                        style={{ width: `${Math.min(stats.capacityPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-nubank-gray-600 mt-1">
                      <span>0%</span>
                      <span className={stats.isOverCapacity ? 'text-danger-DEFAULT font-medium' : ''}>
                        {Math.round(stats.capacityPercentage)}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Health Summary */}
          <div className="bg-gradient-to-r from-nubank-blue-50 to-nubank-purple-50 border border-nubank-blue-200 rounded-nubank-lg p-6">
            <h3 className="text-lg font-semibold text-nubank-gray-900 mb-4 flex items-center space-x-2">
              <FiTrendingUp className="w-5 h-5 text-nubank-blue-600" />
              <span>Portfolio Health</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-nubank-gray-800 mb-2">Strengths</h4>
                <ul className="space-y-1 text-sm text-nubank-gray-700">
                  {completionRate >= 70 && <li>• High task completion rate ({completionRate}%)</li>}
                  {!stats.isOverCapacity && <li>• Good capacity management</li>}
                  {stats.overdueTasks === 0 && <li>• No overdue tasks</li>}
                  {stats.activeProjects > 0 && <li>• Active project portfolio</li>}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-nubank-gray-800 mb-2">Areas for Improvement</h4>
                <ul className="space-y-1 text-sm text-nubank-gray-700">
                  {completionRate < 70 && <li>• Consider improving task completion rate</li>}
                  {stats.isOverCapacity && <li>• Portfolio is over capacity - consider prioritizing</li>}
                  {stats.overdueTasks > 0 && <li>• {stats.overdueTasks} overdue tasks need attention</li>}
                  {stats.activeProjects === 0 && <li>• No active projects - consider starting one</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};