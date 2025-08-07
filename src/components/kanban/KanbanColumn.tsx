import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, KanbanColumnId } from '../../types/app';
import { TaskCard } from './TaskCard';
import SuggestedTaskCard from '../SuggestedTaskCard';
import { useAIFeedback } from '../../hooks/useAIFeedback';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { getColumnDisplayInfo } from './utils';

interface ColumnDefinition {
  id: KanbanColumnId;
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  color?: string;
  bgColor?: string;
  borderColor?: string;
}

interface KanbanColumnProps {
  column: ColumnDefinition;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  projectId: string;
}

// Minimal column variants (Notion-style)
const columnVariants = cva(
  "h-full flex flex-col rounded-lg border border-gray-200 bg-gray-50/30 transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      dragState: {
        default: "",
        over: "border-blue-300 bg-blue-50/50",
        overlay: "opacity-50",
      },
    },
    defaultVariants: {
      dragState: "default",
    },
  }
);

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onUpdateTask,
  onDeleteTask,
  projectId: _projectId,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });
  const { submitFeedback } = useAIFeedback();
  
  // Memoize task IDs for SortableContext
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);

  const handleSuggestedTaskAccept = async (task: Task, updatedTask?: Task) => {
    const taskToAccept = updatedTask || task;
    const acceptedTask: Task = {
      ...taskToAccept,
      status: 'descobrindo',
      updatedAt: new Date().toISOString(),
    };
    
    onUpdateTask(acceptedTask);
    
    // Submit AI feedback for acceptance
    await submitFeedback(
      task.id,
      'task_suggestion',
      'approve',
      task.description || '',
      _projectId,
    );
  };

  const handleSuggestedTaskReject = async (task: Task) => {
    onDeleteTask(task.id);
    
    // Submit AI feedback for rejection
    await submitFeedback(
      task.id,
      'task_suggestion',
      'reject',
      task.description || '',
      _projectId,
    );
  };

  const handleSuggestedTaskChange = (updatedTask: Task) => {
    // Update the task with user modifications
    onUpdateTask(updatedTask);
    
    // Submit AI feedback for modification
    submitFeedback(
      updatedTask.id,
      'task_suggestion',
      'modify',
      updatedTask.description || '',
      _projectId,
    );
  };


  return (
    <div
      ref={setNodeRef}
      className={cn(
        columnVariants({ 
          dragState: isOver ? 'over' : 'default' 
        }),
        column.bgColor || 'bg-gray-50',
        column.borderColor || 'border-gray-200'
      )}
    >
      {/* Minimal column header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {column.icon && (
              <column.icon className="w-4 h-4 text-gray-600" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Minimal tasks container */}
      <div className="flex-1 min-h-[200px] overflow-y-auto p-2">
        <SortableContext 
          items={taskIds} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="group relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {column.id === 'sugestoes' ? (
                <div className="relative">
                  <SuggestedTaskCard
                    task={task}
                    onAccept={(updatedTask: Task) => handleSuggestedTaskAccept(task, updatedTask)}
                    onReject={() => handleSuggestedTaskReject(task)}
                    onChange={handleSuggestedTaskChange}
                  />
                  {/* Enhanced AI suggestion glow with animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-amber-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none animate-pulse"></div>
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 rounded-lg opacity-0 group-hover:opacity-20 blur transition-all duration-300 pointer-events-none"></div>
                </div>
              ) : (
                <div className="relative">
                  <TaskCard
                    task={task}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                  />
                  {/* Smart priority indicators */}
                  {task.priority === 'urgent' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  {task.isBlocked && (
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                  {task.dueDate && new Date(task.dueDate) < new Date() && !task.completed && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-400 py-8">
              <p className="text-xs text-gray-500 text-center">
                {getColumnDisplayInfo(column.id).emptyMessage}
              </p>
            </div>
          )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};