import React, { useMemo } from 'react';
import { FiActivity, FiCalendar, FiFileText, FiTarget, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Project, ActivityLog } from '../../../types/app';

interface ActivityColumnProps {
  activityLogs: ActivityLog[];
  projects: Project[];
  onViewAll: () => void;
}

export const ActivityColumn: React.FC<ActivityColumnProps> = ({
  activityLogs,
  projects,
  onViewAll,
}) => {
  const navigate = useNavigate();

  const recentActivity = useMemo(() => {
    return activityLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3) // Show last 3 activities
      .map(log => {
        const project = projects.find(p => p.id === log.projectId);
        return {
          ...log,
          projectName: project?.name || 'Unknown Project',
          projectStatus: project?.status || 'unknown'
        };
      });
  }, [activityLogs, projects]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffTime = Math.abs(now.getTime() - activityTime.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityTime.toLocaleDateString();
  };

  const getActivityIcon = (message: string | undefined) => {
    if (!message) {
      return <FiActivity className="w-3 h-3 text-textAccent" />;
    }
    if (message.includes('created') || message.includes('added')) {
      return <FiTarget className="w-3 h-3 text-success-DEFAULT" />;
    }
    if (message.includes('completed') || message.includes('finished')) {
      return <FiTarget className="w-3 h-3 text-success-DEFAULT" />;
    }
    if (message.includes('document') || message.includes('file')) {
      return <FiFileText className="w-3 h-3 text-accent" />;
    }
    if (message.includes('meeting') || message.includes('event')) {
      return <FiCalendar className="w-3 h-3 text-warning-DEFAULT" />;
    }
    return <FiActivity className="w-3 h-3 text-textAccent" />;
  };

  const handleActivityClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-primary';
      case 'shelf':
        return 'text-textAccent';
      default:
        return 'text-textAccent';
    }
  };

  return (
    <div className="bg-surface rounded-nubank-lg border border-border shadow-nubank">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-textOnSurface flex items-center">
            <FiActivity className="w-5 h-5 mr-3 text-accent" />
            Recent Activity
          </h3>
          {recentActivity.length > 0 && (
            <button
              onClick={onViewAll}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              View all
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-background rounded-nubank hover:bg-nubank-gray-50 transition-colors cursor-pointer group"
                onClick={() => handleActivityClick(activity.projectId)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.message)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-textOnSurface leading-relaxed">
                    {activity.message || 'Activity occurred'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium ${getProjectStatusColor(activity.projectStatus)}`}>
                      {activity.projectName}
                    </span>
                    <span className="text-xs text-textAccent">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
                
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-textAccent hover:text-primary">
                  <FiExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiActivity className="w-12 h-12 text-textAccent mx-auto mb-3 opacity-50" />
            <p className="text-sm text-textAccent mb-4">No recent activity</p>
            <p className="text-xs text-textAccent/80">
              Activity will appear here as you work on your projects
            </p>
          </div>
        )}
      </div>
    </div>
  );
};