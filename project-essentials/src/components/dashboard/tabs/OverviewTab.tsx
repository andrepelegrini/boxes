import React, { useState } from 'react';
import { Project, Task, EventItem, DocumentItem, ActivityLog } from '../../../types/app';
import { 
  FiTarget, FiZap, FiActivity, 
  FiAlertTriangle, FiCalendar, FiFileText, FiBarChart,
  FiArrowRight, FiStar, FiRefreshCw,
  FiPlayCircle, FiMessageSquare, FiFlag,
  FiShield
} from 'react-icons/fi';
import { useOverviewAI, useUrgentActions, useCriticalRisks } from '../../../hooks/useOverviewAI';

interface OverviewTabProps {
  project: Project;
  tasks: Task[];
  events?: EventItem[];
  documents?: DocumentItem[];
  activityLogs?: ActivityLog[];
  onSwitchToTab?: (tab: string) => void;
  onAddTask?: () => void;
  onScheduleMeeting?: () => void;
  onUploadFiles?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  project, 
  tasks,
  events = [],
  documents = [],
  activityLogs = [],
  onSwitchToTab,
  onAddTask,
  onScheduleMeeting,
  onUploadFiles
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'actions' | 'risks' | 'insights'>('overview');
  
  // Get comprehensive AI insights
  const aiInsights = useOverviewAI({
    project,
    tasks,
    events,
    documents,
    activityLogs
  });

  // Helper data
  const urgentActions = useUrgentActions(aiInsights.nextActions);
  const criticalRisks = useCriticalRisks(aiInsights.riskAlerts);
  
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overdueTasks = tasks.filter(task => 
    !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
  ).length;
  const blockedTasks = tasks.filter(task => task.isBlocked).length;

  // Health status styling
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'text-red-600 bg-red-50 border-red-200';
      case 'today': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'this_week': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiBarChart, badge: undefined },
    { id: 'actions', label: 'Actions', icon: FiPlayCircle, badge: urgentActions.length },
    { id: 'risks', label: 'Risks', icon: FiShield, badge: criticalRisks.length },
    { id: 'insights', label: 'AI Insights', icon: FiZap, badge: undefined }
  ] as const;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header with AI Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getHealthColor(aiInsights.projectHealth.overallHealth)}`}>
            <FiTarget className="w-4 h-4" />
            <span>Health: {aiInsights.projectHealth.overallHealth}</span>
            <span className="font-bold">{aiInsights.projectHealth.healthScore}%</span>
          </div>
          {aiInsights.isLoading && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
        <button
          onClick={aiInsights.refreshInsights}
          disabled={aiInsights.isLoading}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiRefreshCw className={`w-4 h-4 ${aiInsights.isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                activeSection === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content based on active section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center relative">
              <div className={`text-2xl font-bold ${
                (overdueTasks + blockedTasks) > 0 ? 'text-red-600' : 'text-gray-400'
              }`}>
                {overdueTasks + blockedTasks}
              </div>
              <div className="text-sm text-gray-600">Issues</div>
              {(overdueTasks + blockedTasks) > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Project Progress</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Next Milestone */}
          {aiInsights.milestoneRecommendations.nextMilestone && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
              <div className="flex items-start space-x-3">
                <FiFlag className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Next Milestone</h3>
                  <p className="text-sm text-gray-700 mb-2">{aiInsights.milestoneRecommendations.nextMilestone.suggestedGoal}</p>
                  <div className="text-xs text-purple-600 font-medium">
                    Target: {aiInsights.milestoneRecommendations.nextMilestone.timeframe}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Smart Next Actions</h3>
            <span className="text-sm text-gray-600">{aiInsights.nextActions.length} suggested</span>
          </div>
          
          <div className="space-y-3">
            {aiInsights.nextActions.map((action) => (
              <div
                key={action.id}
                className={`p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getUrgencyColor(action.urgency)}`}
                onClick={action.onClick}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{action.action}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        action.impact === 'high' ? 'bg-red-100 text-red-800' :
                        action.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {action.impact} impact
                      </span>
                    </div>
                    <p className="text-sm opacity-90 mb-2">{action.reasoning}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span>⏱️ {action.estimatedTime}</span>
                      <span>🚨 {action.urgency}</span>
                    </div>
                  </div>
                  <FiArrowRight className="w-4 h-4 text-current opacity-60" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Task Priority Insights */}
          {aiInsights.taskPriority.recommendedNext.length > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h4 className="font-medium text-blue-900 mb-3">Recommended Next Tasks</h4>
              <div className="space-y-2">
                {aiInsights.taskPriority.recommendedNext.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <div className="font-medium text-sm">{item.task.title}</div>
                      <div className="text-xs text-gray-600">{item.reasoning}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.quickWin && <FiStar className="w-4 h-4 text-yellow-500" title="Quick Win" />}
                      <button 
                        onClick={() => onSwitchToTab?.('kanban')}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FiArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Meeting Suggestions */}
          {aiInsights.meetingSuggestions.length > 0 && (
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
              <h4 className="font-medium text-purple-900 mb-3">Suggested Meetings</h4>
              <div className="space-y-2">
                {aiInsights.meetingSuggestions.map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-white rounded border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{meeting.purpose}</div>
                        <div className="text-xs text-gray-600 mt-1">{meeting.reasoning}</div>
                        <div className="text-xs text-purple-600 mt-1">{meeting.estimatedDuration} • {meeting.urgency}</div>
                      </div>
                      <button 
                        onClick={onScheduleMeeting}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <FiCalendar className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'risks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            <span className="text-sm text-gray-600">{aiInsights.riskAlerts.length} risks identified</span>
          </div>
          
          {aiInsights.riskAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiShield className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <div className="font-medium">No Major Risks Detected</div>
              <div className="text-sm">Project appears to be on track</div>
            </div>
          ) : (
            <div className="space-y-3">
              {aiInsights.riskAlerts.map((risk) => (
                <div
                  key={risk.id}
                  className={`p-4 rounded-lg border ${
                    risk.impact === 'critical' ? 'bg-red-50 border-red-200' :
                    risk.impact === 'high' ? 'bg-orange-50 border-orange-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{risk.risk}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        risk.probability === 'high' ? 'bg-red-100 text-red-800' :
                        risk.probability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {risk.probability} probability
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        risk.impact === 'critical' ? 'bg-red-100 text-red-800' :
                        risk.impact === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {risk.impact} impact
                      </span>
                    </div>
                  </div>
                  
                  {risk.earlyWarningSignals.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">Warning Signs:</div>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {risk.earlyWarningSignals.map((signal: string, index: number) => (
                          <li key={index}>{signal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {risk.preventiveActions.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</div>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {risk.preventiveActions.map((action: string, index: number) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <span>⏰ Address by: {risk.timeToAddress}</span>
                    <span>📊 Confidence: {Math.round(risk.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FiZap className="w-4 h-4" />
              <span>Confidence: {Math.round(aiInsights.projectHealth.confidence * 100)}%</span>
            </div>
          </div>
          
          {/* Project Health Dashboard */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-medium text-gray-900 mb-3">Project Health Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Velocity</span>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(aiInsights.projectHealth.indicators.velocity.status)}`}>
                    {aiInsights.projectHealth.indicators.velocity.status}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Momentum</span>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    aiInsights.projectHealth.indicators.momentum.status === 'accelerating' ? 'text-green-600 bg-green-50 border-green-200' :
                    aiInsights.projectHealth.indicators.momentum.status === 'steady' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                    aiInsights.projectHealth.indicators.momentum.status === 'slowing' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                    'text-red-600 bg-red-50 border-red-200'
                  }`}>
                    {aiInsights.projectHealth.indicators.momentum.status}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Team Alignment</span>
                  <span className="text-sm font-medium">{aiInsights.projectHealth.indicators.teamAlignment.score}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    aiInsights.projectHealth.indicators.riskFactors.level === 'low' ? 'text-green-600 bg-green-50 border-green-200' :
                    aiInsights.projectHealth.indicators.riskFactors.level === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                    aiInsights.projectHealth.indicators.riskFactors.level === 'high' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                    'text-red-600 bg-red-50 border-red-200'
                  }`}>
                    {aiInsights.projectHealth.indicators.riskFactors.level}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Communication Insights */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-medium text-gray-900 mb-3">Communication Health</h4>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Overall Health</span>
              <div className={`px-3 py-1 text-sm font-medium rounded-full ${getHealthColor(aiInsights.communicationInsights.communicationHealth)}`}>
                {aiInsights.communicationInsights.communicationHealth}
              </div>
            </div>
            
            {aiInsights.communicationInsights.suggestedCommunications.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Suggested Communications:</div>
                <div className="space-y-2">
                  {aiInsights.communicationInsights.suggestedCommunications.map((comm: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <FiMessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{comm.message}</div>
                        <div className="text-xs text-gray-600">To: {comm.recipients.join(', ')} • {comm.urgency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Milestone Progress */}
          {aiInsights.milestoneRecommendations.currentMilestone && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-900 mb-3">Milestone Progress</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{aiInsights.milestoneRecommendations.currentMilestone.name}</span>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(aiInsights.milestoneRecommendations.currentMilestone.feasibilityAssessment)}`}>
                      {aiInsights.milestoneRecommendations.currentMilestone.feasibilityAssessment.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Target: {aiInsights.milestoneRecommendations.currentMilestone.targetDate}</div>
                </div>
                
                {aiInsights.milestoneRecommendations.currentMilestone.suggestedAdjustments && (
                  <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="text-sm font-medium text-yellow-800 mb-1">Suggested Adjustments:</div>
                    {aiInsights.milestoneRecommendations.currentMilestone.suggestedAdjustments.scopeChanges?.map((change: string, index: number) => (
                      <div key={index} className="text-xs text-yellow-700">• {change}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions - Always Visible */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={onAddTask}
            className="flex items-center justify-center space-x-2 p-2 bg-white rounded border hover:shadow-sm transition-all text-sm"
          >
            <FiTarget className="w-4 h-4 text-blue-600" />
            <span>Add Task</span>
          </button>
          
          <button
            onClick={onScheduleMeeting}
            className="flex items-center justify-center space-x-2 p-2 bg-white rounded border hover:shadow-sm transition-all text-sm"
          >
            <FiCalendar className="w-4 h-4 text-purple-600" />
            <span>Schedule</span>
          </button>
          
          <button
            onClick={onUploadFiles}
            className="flex items-center justify-center space-x-2 p-2 bg-white rounded border hover:shadow-sm transition-all text-sm"
          >
            <FiFileText className="w-4 h-4 text-green-600" />
            <span>Add Files</span>
          </button>
          
          <button
            onClick={() => onSwitchToTab?.('kanban')}
            className="flex items-center justify-center space-x-2 p-2 bg-white rounded border hover:shadow-sm transition-all text-sm"
          >
            <FiActivity className="w-4 h-4 text-orange-600" />
            <span>View Tasks</span>
          </button>
        </div>
      </div>

      {/* Recent Activity - Compact */}
      {activityLogs.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <span className="text-xs text-gray-500">{activityLogs.length} total</span>
          </div>
          
          <div className="space-y-2">
            {activityLogs.slice(0, 3).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded text-sm">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
          
          {activityLogs.length > 3 && (
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2">
              View all activity →
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {aiInsights.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <FiAlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">AI Analysis Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{aiInsights.error}</p>
        </div>
      )}
      
      {/* Last Updated Info */}
      {aiInsights.lastUpdated && (
        <div className="text-center text-xs text-gray-500">
          Last updated: {formatTimeAgo(aiInsights.lastUpdated.toISOString())}
        </div>
      )}
    </div>
  );
};

export default OverviewTab;