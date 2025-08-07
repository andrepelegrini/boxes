import React from 'react';
import { FiPlus, FiCalendar, FiFileText, FiCpu, FiTarget } from 'react-icons/fi';

interface UnifiedActionBarProps {
  onAddTask?: () => void;
  onScheduleMeeting?: () => void;
  onUploadFiles?: () => void;
  onAIInsights?: () => void;
  onCreateProject?: () => void;
  context: 'main-dashboard' | 'project-dashboard';
  className?: string;
}

export const UnifiedActionBar: React.FC<UnifiedActionBarProps> = ({
  onAddTask,
  onScheduleMeeting,
  onUploadFiles,
  onAIInsights,
  onCreateProject,
  context,
  className = ''
}) => {
  const actions = [
    ...(context === 'main-dashboard' ? [{
      icon: FiPlus,
      label: 'New Project',
      onClick: onCreateProject,
      primary: true,
      color: 'bg-nubank-purple-600 hover:bg-nubank-purple-700'
    }] : []),
    ...(context === 'project-dashboard' ? [{
      icon: FiTarget,
      label: 'Add Task',
      onClick: onAddTask,
      primary: true,
      color: 'bg-nubank-purple-600 hover:bg-nubank-purple-700'
    }] : []),
    {
      icon: FiCalendar,
      label: 'Schedule',
      onClick: onScheduleMeeting,
      primary: false,
      color: 'bg-nubank-gray-100 hover:bg-nubank-gray-200 text-nubank-gray-700'
    },
    {
      icon: FiFileText,
      label: 'Upload',
      onClick: onUploadFiles,
      primary: false,
      color: 'bg-nubank-gray-100 hover:bg-nubank-gray-200 text-nubank-gray-700'
    },
    {
      icon: FiCpu,
      label: 'AI Insights',
      onClick: onAIInsights,
      primary: false,
      color: 'bg-nubank-orange-100 hover:bg-nubank-orange-200 text-nubank-orange-700'
    }
  ].filter(action => action.onClick);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              action.primary 
                ? `${action.color} text-white shadow-sm hover:shadow-md transform hover:scale-[1.02]`
                : `${action.color} border border-nubank-gray-300`
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};