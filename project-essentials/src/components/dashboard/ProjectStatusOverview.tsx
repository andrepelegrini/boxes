import React, { useState } from 'react';
import { FiInfo, FiChevronDown, FiChevronUp, FiTarget, FiClock, FiCheckCircle, FiAlertTriangle, FiEdit3, FiZap, FiSave, FiX } from 'react-icons/fi';
import { Project, Task } from '../../types/app';

interface ProjectStatusOverviewProps {
  project: Project;
  tasks: Task[];
  onAddTask: () => void;
  onUpdateProject?: (updates: Partial<Project>) => void;
  onGenerateDescription?: () => void;
}

export const ProjectStatusOverview: React.FC<ProjectStatusOverviewProps> = ({
  project,
  tasks,
  onAddTask,
  onUpdateProject,
  onGenerateDescription
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(project.description || '');

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const blockedTasks = tasks.filter(t => t.isBlocked);
  const overdueTasks = tasks.filter(t => 
    !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const getProjectStatus = () => {
    if (overdueTasks.length > 0) {
      return {
        type: 'urgent',
        label: 'Behind Schedule',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10'
      };
    }
    if (blockedTasks.length > 0) {
      return {
        type: 'warning',
        label: 'Needs Attention',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10'
      };
    }
    if (completionRate >= 80) {
      return {
        type: 'success',
        label: 'On Track',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10'
      };
    }
    return {
      type: 'progress',
      label: 'In Progress',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    };
  };

  const projectStatus = getProjectStatus();

  const handleSaveDescription = () => {
    if (onUpdateProject) {
      onUpdateProject({ description: editedDescription });
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setEditedDescription(project.description || '');
    setIsEditingDescription(false);
  };

  return (
    <div className="bg-white border-b border-nubank-gray-200">
      <div className="container mx-auto px-6 py-4">
        {/* Main Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Project Status Icon */}
            <div className={`w-12 h-12 ${projectStatus.bgColor} rounded-full flex items-center justify-center border-2 ${projectStatus.color.replace('text-', 'border-')}`}>
              <FiTarget className={`w-6 h-6 ${projectStatus.color}`} />
            </div>
            
            {/* Project Overview */}
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${projectStatus.bgColor} ${projectStatus.color}`}>
                    {projectStatus.label}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-3 bg-nubank-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-nubank-purple-500 to-nubank-purple-600 transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className="text-nubank-gray-700 text-sm font-semibold">{completionRate}% Complete</span>
                  </div>
                </div>
              </div>
              
              {/* Task Status Summary */}
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-nubank-gray-600 text-sm">{completedTasks.length} completed</span>
                <span className="text-nubank-gray-400">•</span>
                <span className="text-nubank-gray-600 text-sm">{activeTasks.length} in progress</span>
                {blockedTasks.length > 0 && (
                  <>
                    <span className="text-nubank-gray-400">•</span>
                    <span className="text-red-600 text-sm font-medium">{blockedTasks.length} blocked</span>
                  </>
                )}
                {overdueTasks.length > 0 && (
                  <>
                    <span className="text-nubank-gray-400">•</span>
                    <span className="text-orange-600 text-sm font-medium">{overdueTasks.length} overdue</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddTask}
              className="flex items-center space-x-2 px-4 py-2 bg-nubank-purple-600 text-white rounded-lg hover:bg-nubank-purple-700 transition-colors font-medium text-sm"
            >
              <FiTarget className="w-4 h-4" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-nubank-gray-500 hover:text-nubank-gray-700 hover:bg-nubank-gray-50 rounded-lg transition-colors"
            >
              {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Expanded Project Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-nubank-gray-200 animate-nubank-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project Description */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-nubank-gray-900 text-base font-semibold flex items-center space-x-2">
                    <FiInfo className="w-4 h-4" />
                    <span>Project Description</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    {onGenerateDescription && (
                      <button
                        onClick={onGenerateDescription}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-nubank-purple-50 text-nubank-purple-700 rounded-lg hover:bg-nubank-purple-100 transition-colors font-medium"
                        title="Generate description with AI"
                      >
                        <FiZap className="w-4 h-4" />
                        <span>AI Generate</span>
                      </button>
                    )}
                    {!isEditingDescription ? (
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-nubank-gray-100 text-nubank-gray-600 rounded-lg hover:bg-nubank-gray-200 transition-colors font-medium"
                        title="Edit description"
                      >
                        <FiEdit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveDescription}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
                          title="Save changes"
                        >
                          <FiSave className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-nubank-gray-100 text-nubank-gray-600 rounded-lg hover:bg-nubank-gray-200 transition-colors font-medium"
                          title="Cancel editing"
                        >
                          <FiX className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {isEditingDescription ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full h-24 px-4 py-3 text-sm bg-white border border-nubank-gray-300 rounded-lg text-nubank-gray-900 placeholder-nubank-gray-500 focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent resize-none"
                    placeholder="Enter project description..."
                    autoFocus
                  />
                ) : (
                  <div className="bg-nubank-gray-50 rounded-lg p-4">
                    {project.description ? (
                      <p className="text-nubank-gray-700 text-sm leading-relaxed">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-nubank-gray-500 text-sm italic">
                        No description provided. Add one to help team members understand the project goals.
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Task Overview Stats */}
              <div className="bg-nubank-gray-50 rounded-lg p-4">
                <h3 className="text-nubank-gray-900 text-base font-semibold mb-4 flex items-center space-x-2">
                  <FiTarget className="w-4 h-4" />
                  <span>Task Overview</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-nubank-gray-700 text-sm">Completed</span>
                    </div>
                    <span className="text-nubank-gray-900 font-medium">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiTarget className="w-4 h-4 text-blue-500" />
                      <span className="text-nubank-gray-700 text-sm">Active</span>
                    </div>
                    <span className="text-nubank-gray-900 font-medium">{activeTasks.length}</span>
                  </div>
                  {blockedTasks.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FiAlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-nubank-gray-700 text-sm">Blocked</span>
                      </div>
                      <span className="text-nubank-gray-900 font-medium">{blockedTasks.length}</span>
                    </div>
                  )}
                  {overdueTasks.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-red-500" />
                        <span className="text-nubank-gray-700 text-sm">Overdue</span>
                      </div>
                      <span className="text-nubank-gray-900 font-medium">{overdueTasks.length}</span>
                    </div>
                  )}
                </div>
                
                {/* Progress Summary */}
                <div className="mt-4 pt-4 border-t border-nubank-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-nubank-gray-700 text-sm font-medium">Overall Progress</span>
                    <span className="text-nubank-gray-600 text-sm">{completedTasks.length} of {tasks.length}</span>
                  </div>
                  <div className="w-full bg-nubank-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-nubank-purple-500 to-nubank-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};