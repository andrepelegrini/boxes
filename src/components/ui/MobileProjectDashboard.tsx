import React, { useState, useEffect } from 'react';
import { 
  FiMenu, 
  FiX, 
  FiTarget, 
  FiTrendingUp, 
  FiCalendar, 
  FiFileText, 
  FiMessageSquare,
  FiPlus,
} from 'react-icons/fi';
import { useAIInsights } from '../../../hooks/useAIInsights';

interface MobileProjectDashboardProps {
  project: any;
  tasks: any[];
  events: any[];
  documents: any[];
  checkIns: any[];
  slackMessages?: any[];
  onAddTask: () => void;
  onScheduleMeeting: () => void;
  onUploadFiles: () => void;
  onAIInsights: () => void;
}

type MobileSection = 'overview' | 'tasks' | 'insights' | 'timeline' | 'resources';

export const MobileProjectDashboard: React.FC<MobileProjectDashboardProps> = ({
  project,
  tasks,
  events,
  documents,
  slackMessages,
  onAddTask,
  onScheduleMeeting,
  onAIInsights,
}) => {
  const [activeSection, setActiveSection] = useState<MobileSection>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { insights, analytics, generateInsights, isLoading } = useAIInsights();

  useEffect(() => {
    if (project && tasks && events && documents) {
      generateInsights(project, tasks, events, documents, slackMessages);
    }
  }, [project, tasks, events, documents, slackMessages, generateInsights]);


  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const urgentTasks = tasks.filter(t => 
    !t.completed && (t.isBlocked || (t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)))
  );

  const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).slice(0, 3);
  const recentDocuments = documents.slice(0, 3);

  const MobileHeader = () => (
    <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-nubank">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary truncate">{project.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-textAccent">
              {Math.round(analytics.completionRate * 100)}% complete
            </span>
            <span className="text-sm text-textAccent">
              {activeTasks.length} active
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 text-textAccent hover:text-primary transition-colors"
        >
          {showMobileMenu ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <div className="border-t border-border bg-surface animate-nubank-slide-up">
          <div className="grid grid-cols-2 gap-1 p-4">
            {[
              { id: 'overview', label: 'Overview', icon: FiTarget },
              { id: 'tasks', label: 'Tasks', icon: FiTrendingUp },
              { id: 'insights', label: 'Insights', icon: FiMessageSquare },
              { id: 'timeline', label: 'Timeline', icon: FiCalendar },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveSection(id as MobileSection);
                  setShowMobileMenu(false);
                }}
                className={`
                  flex items-center justify-center gap-2 p-3 rounded-nubank transition-all duration-200
                  ${activeSection === id 
                    ? 'bg-primary text-white shadow-nubank-purple' 
                    : 'bg-background text-textAccent hover:bg-primary/10 hover:text-primary'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );

  const QuickActions = () => (
    <div className="grid grid-cols-2 gap-3 p-4">
      <button
        onClick={onAddTask}
        className="flex items-center justify-center gap-2 p-3 bg-primary text-white rounded-nubank font-medium shadow-nubank-purple"
      >
        <FiPlus className="w-4 h-4" />
        Add Task
      </button>
      <button
        onClick={onScheduleMeeting}
        className="flex items-center justify-center gap-2 p-3 bg-accent text-white rounded-nubank font-medium shadow-nubank-blue"
      >
        <FiCalendar className="w-4 h-4" />
        Meeting
      </button>
    </div>
  );

  const OverviewSection = () => (
    <div className="space-y-4">
      {/* Project Progress Card */}
      <div className="bg-surface border border-border rounded-nubank p-4 shadow-nubank">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-textOnSurface">Project Progress</h3>
          <span className="text-2xl font-bold text-primary">
            {Math.round(analytics.completionRate * 100)}%
          </span>
        </div>
        <div className="w-full bg-nubank-gray-200 rounded-full h-3 mb-3">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${analytics.completionRate * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-textOnSurface">{activeTasks.length}</div>
            <div className="text-xs text-textAccent">Active</div>
          </div>
          <div>
            <div className="text-lg font-bold text-success-DEFAULT">{completedTasks.length}</div>
            <div className="text-xs text-textAccent">Done</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warning-DEFAULT">{urgentTasks.length}</div>
            <div className="text-xs text-textAccent">Urgent</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-nubank p-4 text-center">
          <div className={`
            text-lg font-bold
            ${analytics.timelineHealth === 'on-track' ? 'text-success-DEFAULT' :
              analytics.timelineHealth === 'at-risk' ? 'text-warning-DEFAULT' :
              'text-danger-DEFAULT'
            }
          `}>
            {analytics.timelineHealth.replace('-', ' ').toUpperCase()}
          </div>
          <div className="text-xs text-textAccent mt-1">Timeline</div>
        </div>
        
        <div className="bg-surface border border-border rounded-nubank p-4 text-center">
          <div className="text-lg font-bold text-accent">
            {project.slackIntegration?.connected ? 'Connected' : 'Not Connected'}
          </div>
          <div className="text-xs text-textAccent mt-1">Slack</div>
        </div>
      </div>

      {/* Top Insights Preview */}
      {insights.length > 0 && (
        <div className="bg-nubank-orange-50 border border-nubank-orange-100 rounded-nubank p-4">
          <h4 className="font-medium text-nubank-gray-800 mb-2">Latest Insight</h4>
          <p className="text-sm text-nubank-gray-700 mb-2">{insights[0].description}</p>
          <button
            onClick={() => setActiveSection('insights')}
            className="text-sm text-nubank-orange-600 font-medium"
          >
            View all insights →
          </button>
        </div>
      )}
    </div>
  );

  const TasksSection = () => (
    <div className="space-y-4">
      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-danger-DEFAULT mb-3 px-4">Urgent Tasks</h3>
          <div className="space-y-3 px-4">
            {urgentTasks.slice(0, 3).map(task => (
              <div
                key={task.id}
                className="shadow-sm"
              >Task</div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      <div>
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="font-semibold text-textOnSurface">Active Tasks</h3>
          <span className="text-sm text-textAccent">{activeTasks.length} total</span>
        </div>
        <div className="space-y-3 px-4">
          {activeTasks.slice(0, 5).map(task => (
            <div
              key={task.id}
              className="shadow-sm"
            >Task</div>
          ))}
          
          {activeTasks.length > 5 && (
            <button className="w-full py-3 text-sm text-primary font-medium bg-primary/5 rounded-nubank">
              View {activeTasks.length - 5} more tasks
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const InsightsSection = () => (
    <div className="space-y-4 px-4">
      {isLoading ? (
        <div className="text-center py-8">
          <FiMessageSquare className="w-12 h-12 text-textAccent mx-auto mb-3 animate-pulse" />
          <p className="text-textAccent">Generating insights...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <FiMessageSquare className="w-12 h-12 text-textAccent mx-auto mb-3" />
          <p className="text-textAccent">No insights available yet</p>
          <button
            onClick={onAIInsights}
            className="mt-3 text-sm text-primary font-medium"
          >
            Generate insights
          </button>
        </div>
      ) : (
        insights.map((insight: any) => (
          <div
            key={insight.id}
            className={`
              border rounded-nubank p-4
              ${insight.type === 'warning' ? 'bg-danger-DEFAULT/5 border-danger-DEFAULT/20' :
                insight.type === 'celebration' ? 'bg-success-DEFAULT/5 border-success-DEFAULT/20' :
                insight.type === 'optimization' ? 'bg-nubank-orange-50 border-nubank-orange-100' :
                'bg-accent/5 border-accent/20'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-textOnSurface">{insight.title}</h4>
              <span className={`
                text-xs px-2 py-1 rounded
                ${insight.priority === 'high' ? 'bg-danger-DEFAULT/10 text-danger-DEFAULT' :
                  insight.priority === 'medium' ? 'bg-warning-DEFAULT/10 text-warning-DEFAULT' :
                  'bg-nubank-gray-100 text-nubank-gray-600'
                }
              `}>
                {insight.priority}
              </span>
            </div>
            <p className="text-sm text-textAccent mb-3">{insight.description}</p>
            {insight.actionable && (
              <button className="text-sm text-primary font-medium">
                Take action →
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );

  const TimelineSection = () => (
    <div className="space-y-4 px-4">
      <div className="bg-surface border border-border rounded-nubank p-4">
        <h3 className="font-semibold text-textOnSurface mb-3">Upcoming Events</h3>
        {upcomingEvents.length === 0 ? (
          <p className="text-textAccent text-sm">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-textOnSurface text-sm">{event.name}</h4>
                  <p className="text-xs text-textAccent">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-nubank p-4">
        <h3 className="font-semibold text-textOnSurface mb-3">Recent Documents</h3>
        {recentDocuments.length === 0 ? (
          <p className="text-textAccent text-sm">No documents available</p>
        ) : (
          <div className="space-y-2">
            {recentDocuments.map(doc => (
              <div key={doc.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-textAccent" />
                  <span className="text-sm text-textOnSurface truncate">{doc.name}</span>
                </div>
                <button className="text-xs text-primary">Open</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <QuickActions />

      <main className="pb-20">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'tasks' && <TasksSection />}
        {activeSection === 'insights' && <InsightsSection />}
        {activeSection === 'timeline' && <TimelineSection />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-nubank-elevated">
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: FiTarget },
            { id: 'tasks', label: 'Tasks', icon: FiTrendingUp },
            { id: 'insights', label: 'Insights', icon: FiMessageSquare },
            { id: 'timeline', label: 'Timeline', icon: FiCalendar },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as MobileSection)}
              className={`
                flex flex-col items-center gap-1 p-3 transition-colors
                ${activeSection === id 
                  ? 'text-primary bg-primary/5' 
                  : 'text-textAccent hover:text-primary'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default MobileProjectDashboard;