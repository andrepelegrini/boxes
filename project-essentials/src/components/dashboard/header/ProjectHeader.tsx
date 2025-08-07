import React, { useState, useMemo } from 'react';
import { FiPlus, FiCalendar, FiFileText, FiTrendingUp, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Project, Task, EventItem, DocumentItem } from '../../../types/app';
import { AIProjectBrief } from './AIProjectBrief';
import { QuickStatsBar } from './QuickStatsBar';

interface ProjectHeaderProps {
  project: Project;
  tasks: Task[];
  events: EventItem[];
  documents: DocumentItem[];
  onAddTask: () => void;
  onScheduleMeeting: () => void;
  onUploadFiles: () => void;
  onAIInsights: () => void;
  onUpdateProject?: (project: Project) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  tasks,
  events,
  documents,
  onAddTask,
  onScheduleMeeting,
  onUploadFiles,
  onAIInsights,
  onUpdateProject,
}) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const quickStats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeTasks = tasks.filter(t => !t.completed).length;
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const teamMembers = new Set(tasks.map(t => t.assignee).filter(Boolean)).size;
    const upcomingDeadlines = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      progress: progressPercentage,
      activeTasks,
      teamMembers,
      upcomingDeadlines,
      hasOverdue: overdueTasks > 0
    };
  }, [tasks]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Navigation and Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-nubank-gray-100 transition-colors group flex-shrink-0"
          title="Back to Dashboard"
        >
          <FiArrowLeft className="w-4 h-4 text-textAccent group-hover:text-primary transition-colors" />
        </button>
        
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              defaultValue={project.name}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 w-full"
              onBlur={async (e) => {
                setIsEditingTitle(false);
                const newName = e.target.value.trim();
                if (newName && newName !== project.name && onUpdateProject) {
                  try {
                    await onUpdateProject({ ...project, name: newName });
                  } catch (error) {
                    console.error('Failed to update project name:', error);
                    // Reset to original name if update fails
                    e.target.value = project.name;
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              autoFocus
            />
          ) : (
            <h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary cursor-pointer hover:bg-primary/5 rounded px-2 py-1 transition-colors truncate"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit project name"
            >
              {project.name}
            </h1>
          )}
        </div>
      </div>

      {/* AI Brief Section */}
      <AIProjectBrief 
        project={project}
        tasks={tasks}
        events={events}
        documents={documents}
        {...(onUpdateProject && { onUpdateProject })}
      />

      {/* Quick Stats Bar */}
      <QuickStatsBar stats={quickStats} />

      {/* Action Buttons - Mobile responsive */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={onAddTask}
          className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-primary text-textOnPrimary rounded-nubank font-medium hover:bg-primary/90 shadow-nubank-purple hover:shadow-nubank-purple-hover transition-all duration-300 animate-nubank-scale text-sm sm:text-base"
        >
          <FiPlus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Task</span>
        </button>
        
        <button
          onClick={onScheduleMeeting}
          className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-accent text-white rounded-nubank font-medium hover:bg-accent/90 shadow-nubank-blue hover:shadow-nubank-blue-hover transition-all duration-300 text-sm sm:text-base"
        >
          <FiCalendar className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Schedule Meeting</span>
          <span className="sm:hidden">Meeting</span>
        </button>
        
        <button
          onClick={onUploadFiles}
          className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-secondary text-secondary-foreground border border-border rounded-nubank font-medium hover:bg-secondary/80 transition-all duration-300 text-sm sm:text-base"
        >
          <FiFileText className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Upload Files</span>
          <span className="sm:hidden">Files</span>
        </button>
        
        <button
          onClick={onAIInsights}
          className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-nubank-orange-500 text-white rounded-nubank font-medium hover:bg-nubank-orange-600 transition-all duration-300 text-sm sm:text-base"
        >
          <FiTrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">AI Insights</span>
          <span className="sm:hidden">AI</span>
        </button>
      </div>
    </div>
  );
};