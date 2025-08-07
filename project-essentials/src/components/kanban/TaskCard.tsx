import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types/app';
import { GripVertical, Clock, AlertTriangle } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';
import EditTaskModal from '../modal/TaskModal';

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragOverlay?: boolean;
}

// Minimal task card variants (Notion-style)
const taskCardVariants = cva(
  "bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer select-none group",
  {
    variants: {
      dragState: {
        default: "",
        dragging: "opacity-40 scale-[0.98] border-blue-300",
        overlay: "shadow-lg border-blue-400 rotate-1 scale-105",
      },
      blocked: {
        true: "border-red-300 bg-red-50/30",
        false: "",
      },
      priority: {
        urgent: "border-l-2 border-l-red-500",
        high: "border-l-2 border-l-orange-500",
        medium: "border-l-2 border-l-yellow-500",
        low: "border-l-2 border-l-blue-500",
        default: "",
      },
    },
    defaultVariants: {
      dragState: "default",
      blocked: false,
      priority: "default",
    },
  }
);

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdate,
  isDragOverlay = false,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        taskCardVariants({
          dragState: isDragOverlay ? 'overlay' : isDragging ? 'dragging' : 'default',
          blocked: task.isBlocked || false,
          priority: task.priority || 'default',
        })
      )}
    >
      {/* Minimal drag handle - invisible but functional */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 w-4 h-4 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        data-cypress="drag-handle"
        title="Arrastar tarefa"
      >
        <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>

      {/* Minimal content */}
      <div 
        className="p-3 relative"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('[data-cypress="drag-handle"]')) {
            console.log('📋 [TASK_CARD] User clicked task card to edit', {
              taskId: task.id,
              taskName: task.name || task.title,
              status: task.status
            });
            setIsEditModalOpen(true);
          }
        }}
      >
        {/* Title with icon indicators */}
        <div className="flex items-start gap-2 mb-1">
          <h4 className="text-sm text-gray-900 font-medium line-clamp-2 flex-1 leading-tight">
            {task.name || task.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.isBlocked && <AlertTriangle className="w-3 h-3 text-red-500" />}
            {isOverdue && <Clock className="w-3 h-3 text-red-600" />}
          </div>
        </div>

        {/* Minimal metadata row */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            {task.priority && (
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-sm ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase()}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              <span className="text-xs text-gray-400">
                {task.tags.slice(0, 1).join('')}
                {task.tags.length > 1 && ` +${task.tags.length - 1}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {task.assignee && (
              <span className="text-xs text-gray-500 truncate max-w-16">{task.assignee}</span>
            )}
            {task.dueDate && (
              <span className={isOverdue ? 'text-red-600' : 'text-gray-500'}>
                {new Date(task.dueDate).toLocaleDateString('pt-BR', { month: 'numeric', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Minimal progress bar */}
        {task.actualHours && task.estimatedHours && (
          <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-1 rounded-full ${
                  (task.actualHours / task.estimatedHours) > 1 
                    ? 'bg-red-500' 
                    : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${Math.min((task.actualHours / task.estimatedHours) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced drag state indicators */}
      {isDragging && (
        <>
          <div className="absolute inset-0 bg-blue-500/20 rounded-lg pointer-events-none" />
          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none animate-pulse" />
        </>
      )}
      {isDragOverlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg pointer-events-none" />
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-30 pointer-events-none" />
        </>
      )}
      
      {/* Edit Task Modal - Rendered at document body level */}
      {!isDragOverlay && isEditModalOpen && typeof document !== 'undefined' && 
        createPortal(
          <EditTaskModal
            isOpen={isEditModalOpen}
            task={task}
            onClose={() => setIsEditModalOpen(false)}
            onSave={(updatedTask: Partial<Task>) => {
              console.log('💾 [TASK_CARD] User saved task updates', {
                taskId: updatedTask.id,
                taskName: updatedTask.name || updatedTask.title
              });
              onUpdate({ ...task, ...updatedTask });
              setIsEditModalOpen(false);
            }}
          />,
          document.body
        )
      }
    </div>
  );
};