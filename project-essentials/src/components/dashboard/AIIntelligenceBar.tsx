import React, { useState } from 'react';
import { FiCpu, FiZap, FiArrowRight, FiChevronDown, FiChevronUp, FiTarget, FiClock } from 'react-icons/fi';
import { Project, Task } from '../../types/app';

interface AIIntelligenceBarProps {
  project: Project;
  tasks: Task[];
  derivedTasks?: any[];
  onAIInsights: () => void;
  onAddTask: () => void;
}

export const AIIntelligenceBar: React.FC<AIIntelligenceBarProps> = ({
  tasks,
  derivedTasks = [],
  onAIInsights,
  onAddTask
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeTasks = tasks.filter(t => !t.completed);
  const blockedTasks = tasks.filter(t => t.isBlocked);
  const overdueTasks = tasks.filter(t => 
    !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  );
  const aiSuggestions = derivedTasks.filter(t => t.status === 'suggested');

  const getSmartInsights = () => {
    const insights = [];
    
    if (blockedTasks.length > 0) {
      insights.push({
        type: 'warning',
        icon: FiTarget,
        text: `${blockedTasks.length} blocked task${blockedTasks.length > 1 ? 's' : ''} need attention`,
        action: 'View Kanban',
        priority: 'high'
      });
    }
    
    if (overdueTasks.length > 0) {
      insights.push({
        type: 'urgent',
        icon: FiClock,
        text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        action: 'Review Tasks',
        priority: 'high'
      });
    }
    
    if (aiSuggestions.length > 0) {
      insights.push({
        type: 'suggestion',
        icon: FiZap,
        text: `${aiSuggestions.length} AI-suggested task${aiSuggestions.length > 1 ? 's' : ''} available`,
        action: 'View Suggestions',
        priority: 'medium'
      });
    }
    
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        icon: FiTarget,
        text: 'Project is on track - great work!',
        action: 'Add New Task',
        priority: 'low'
      });
    }
    
    return insights.slice(0, 3); // Show max 3 insights
  };

  const smartInsights = getSmartInsights();
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border border-purple-500/20 shadow-xl">
      <div className="p-4">
        {/* Main Intelligence Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* AI Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <FiCpu className="w-5 h-5 text-white" />
            </div>
            
            {/* Project Intelligence */}
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white">AI Project Intelligence</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 text-sm font-medium">{completionRate}% Complete</span>
                </div>
              </div>
              
              {/* Primary Insight */}
              {smartInsights.length > 0 && (() => {
                const PrimaryIcon = smartInsights[0].icon;
                return (
                  <div className="flex items-center space-x-2 mt-1">
                    <PrimaryIcon className={`w-4 h-4 ${
                      smartInsights[0].type === 'urgent' ? 'text-red-400' :
                      smartInsights[0].type === 'warning' ? 'text-yellow-400' :
                      smartInsights[0].type === 'suggestion' ? 'text-blue-400' :
                      'text-green-400'
                    }`} />
                    <p className="text-purple-200 text-sm">{smartInsights[0].text}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onAIInsights}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-purple-500/25 font-medium text-sm"
            >
              <FiZap className="w-4 h-4" />
              <span>AI Insights</span>
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-purple-200 hover:text-white transition-colors"
            >
              {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Expanded Intelligence Panel */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-purple-500/20 animate-nubank-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* All Insights */}
              {smartInsights.map((insight, index) => {
                const InsightIcon = insight.icon;
                return (
                  <div key={index} className="bg-white/5 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <InsightIcon className={`w-4 h-4 ${
                        insight.type === 'urgent' ? 'text-red-400' :
                        insight.type === 'warning' ? 'text-yellow-400' :
                        insight.type === 'suggestion' ? 'text-blue-400' :
                        'text-green-400'
                      }`} />
                      <span className="text-white text-sm font-medium">{insight.action}</span>
                    </div>
                    <p className="text-purple-200 text-xs">{insight.text}</p>
                  </div>
                );
              })}
              
              {/* Quick Stats */}
              <div className="bg-white/5 rounded-lg p-3 backdrop-blur-sm md:col-span-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{activeTasks.length}</div>
                      <div className="text-xs text-purple-200">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{blockedTasks.length}</div>
                      <div className="text-xs text-purple-200">Blocked</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{aiSuggestions.length}</div>
                      <div className="text-xs text-purple-200">AI Suggestions</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={onAddTask}
                    className="flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm"
                  >
                    <span>Add Task</span>
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};