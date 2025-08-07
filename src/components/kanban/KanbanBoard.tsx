import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  TouchSensor,
  DragOverlay,
  DropAnimation,
  defaultDropAnimationSideEffects,
  closestCorners,
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { Task, KanbanColumnId } from '../../types/app';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useAIFeedback } from '../../hooks/useAIFeedback';
import { FiActivity, FiTrendingUp, FiTarget, FiFilter } from 'react-icons/fi';
import { 
  hasDraggableData, 
  isTaskDragData, 
  isSuggestedTaskDragData,
  getTaskColumn,
  isValidColumnTransition 
} from './utils';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  projectId: string;
  searchTerm?: string;
  filterBy?: string;
  sortBy?: string;
  onOpenGlobalTriage?: () => void;
  globalSuggestionsCount?: number;
}

const COLUMN_DEFINITIONS = [
  { 
    id: 'descobrindo' as KanbanColumnId, 
    title: 'Discovery', 
    description: 'Exploring and planning',
    icon: FiActivity,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200'
  },
  { 
    id: 'realizando' as KanbanColumnId, 
    title: 'In Progress', 
    description: 'Active development',
    icon: FiTrendingUp,
    color: 'from-orange-500 to-yellow-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-yellow-50',
    borderColor: 'border-orange-200'
  },
  { 
    id: 'concluidas' as KanbanColumnId, 
    title: 'Completed', 
    description: 'Done and delivered',
    icon: FiTarget,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    borderColor: 'border-green-200'
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
  projectId,
  searchTerm = '',
  filterBy = 'all',
  sortBy = 'created',
  onOpenGlobalTriage,
  globalSuggestionsCount = 0,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const pickedUpTaskColumn = useRef<KanbanColumnId | null>(null);
  const [backgroundProcesses, setBackgroundProcesses] = useState({
    analyzingPatterns: false,
    optimizingFlow: false,
    predictingBottlenecks: false
  });
  const { submitFeedback } = useAIFeedback();

  // Simulate AI background processes for beautiful UX
  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundProcesses(() => ({
        analyzingPatterns: Math.random() > 0.85,
        optimizingFlow: Math.random() > 0.9,
        predictingBottlenecks: Math.random() > 0.8
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced sensors configuration for better accessibility and responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for more responsive drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Slightly reduced delay
        tolerance: 5, // Reduced tolerance for better precision
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Enhanced drop animation configuration
  const dropAnimation: DropAnimation = {
    duration: 300,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  

  // Filter and organize tasks by column
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Apply search filter
      if (searchTerm && !task.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !task.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Apply status filter
      if (filterBy === 'blocked' && !task.isBlocked) return false;
      if (filterBy === 'overdue' && (!task.dueDate || new Date(task.dueDate) > new Date())) return false;
      if (filterBy === 'in-progress' && task.status !== 'realizando') return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || 'low'] || 1) - (priorityOrder[a.priority || 'low'] || 1);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [tasks, searchTerm, filterBy, sortBy]);

  // Organize tasks by column using improved logic
  const tasksByColumn = useMemo(() => {
    const columns: Record<KanbanColumnId, Task[]> = {
      sugestoes: [],
      descobrindo: [],
      realizando: [],
      concluidas: [],
    };

    filteredTasks.forEach(task => {
      const columnId = getTaskColumn(task);
      
      // Safety check: ensure columnId is valid
      if (columns[columnId]) {
        columns[columnId].push(task);
      } else {
        // This shouldn't happen with our improved getTaskColumn logic
        console.error(`Invalid column ${columnId} for task ${task.id}, defaulting to descobrindo`);
        columns.descobrindo.push(task);
      }
    });

    return columns;
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (!hasDraggableData(active)) {
      return;
    }

    const data = active.data.current;
    if (isTaskDragData(data) || isSuggestedTaskDragData(data)) {
      setActiveTask(data.task);
      // Store the original column for better feedback and validation
      pickedUpTaskColumn.current = getTaskColumn(data.task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === 'Task' || active.data.current?.type === 'SuggestedTask';
    const isOverATask = over.data.current?.type === 'Task' || over.data.current?.type === 'SuggestedTask';

    if (!isActiveATask) return;

    const activeTask = active.data.current?.task;
    if (!activeTask) return;

    // Handle dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      const overTask = over.data.current?.task;
      if (!overTask) return;
      
      const activeColumn = getTaskColumn(activeTask);
      const overColumn = getTaskColumn(overTask);
      
      if (activeColumn !== overColumn) {
        // Moving to a different column
        if (!isValidColumnTransition(activeColumn, overColumn)) {
          console.warn(`Invalid transition from ${activeColumn} to ${overColumn}`);
          return;
        }

        // Update task to new column
        const updatedTask: Task = {
          ...activeTask,
          status: overColumn,
          completed: overColumn === 'concluidas',
          updatedAt: new Date().toISOString(),
        };

        onUpdateTask(updatedTask);

        // Submit AI feedback if it's an AI task being accepted
        if (activeColumn === 'sugestoes' && overColumn === 'descobrindo') {
          submitFeedback(
            activeTask.id,
            'task_suggestion',
            'approve',
            activeTask.description || '',
            projectId,
          );
        }
      }
      // If same column, we'll handle reordering separately if needed
    }

    const isOverAColumn = over.data.current?.type === 'Column';

    // Handle dropping a Task directly over a column
    if (isActiveATask && isOverAColumn) {
      const targetColumnId = overId as KanbanColumnId;
      const currentColumn = getTaskColumn(activeTask);
      
      if (currentColumn !== targetColumnId) {
        // Validate transition
        if (!isValidColumnTransition(currentColumn, targetColumnId)) {
          console.warn(`Invalid transition from ${currentColumn} to ${targetColumnId}`);
          return;
        }

        // Update task to new column
        const updatedTask: Task = {
          ...activeTask,
          status: targetColumnId,
          completed: targetColumnId === 'concluidas',
          updatedAt: new Date().toISOString(),
        };

        onUpdateTask(updatedTask);

        // Submit AI feedback if it's an AI task being accepted
        if (currentColumn === 'sugestoes' && targetColumnId === 'descobrindo') {
          submitFeedback(
            activeTask.id,
            'task_suggestion',
            'approve',
            activeTask.description || '',
            projectId,
          );
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    pickedUpTaskColumn.current = null;
    
    if (!over || !hasDraggableData(active)) {
      return;
    }

    const activeData = active.data.current;
    
    // Handle task reordering within the same column
    if (isTaskDragData(activeData) || isSuggestedTaskDragData(activeData)) {
      const activeTaskId = active.id as string;
      const overTaskId = over.id as string;
      
      // Check if we're dropping on another task (for reordering)
      const overTask = tasks.find(t => t.id === overTaskId);
      if (overTask && activeTaskId !== overTaskId) {
        const activeTask = activeData.task;
        const activeColumn = getTaskColumn(activeTask);
        const overColumn = getTaskColumn(overTask);
        
        // Only reorder within the same column
        if (activeColumn === overColumn) {
          console.log(`Reordering task ${activeTaskId} within ${activeColumn} column`);
          // The actual reordering is handled by the SortableContext in KanbanColumn
          // We could implement custom order tracking here if needed
        }
      }
    }
    
    // All other drag operations (column changes) are handled in handleDragOver
  };

  // AI-powered insights about workflow
  const workflowInsights = useMemo(() => {
    const insights = [];
    const blockedTasks = tasks.filter(t => t.isBlocked).length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;
    const discoveryTasks = tasksByColumn['descobrindo']?.length || 0;
    const inProgressTasks = tasksByColumn['realizando']?.length || 0;
    
    if (blockedTasks > 0) {
      insights.push({
        type: 'warning',
        message: `${blockedTasks} task${blockedTasks > 1 ? 's are' : ' is'} blocked`,
        suggestion: 'Review blockers to maintain flow'
      });
    }
    
    if (inProgressTasks > discoveryTasks && discoveryTasks < 2) {
      insights.push({
        type: 'optimization',
        message: 'Discovery pipeline is running low',
        suggestion: 'Consider planning ahead to maintain velocity'
      });
    }
    
    if (overdueTasks > 0) {
      insights.push({
        type: 'urgent',
        message: `${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
        suggestion: 'Prioritize overdue items'
      });
    }
    
    return insights.slice(0, 2);
  }, [tasks, tasksByColumn]);

  return (
    <div className="flex-1 h-full relative">
      {/* AI Workflow Analysis Banner */}
      {workflowInsights.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg border border-purple-200/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-3 h-3 text-white" />
                </div>
                {Object.values(backgroundProcesses).some(Boolean) && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {workflowInsights.map((insight, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.type === 'urgent' ? 'bg-red-400 animate-pulse' :
                      insight.type === 'warning' ? 'bg-orange-400' :
                      'bg-blue-400'
                    }`}></div>
                    <span className="text-sm text-purple-800 font-medium">{insight.message}</span>
                    <span className="text-xs text-purple-600">→ {insight.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Global Triage Button and Background process indicators */}
            <div className="flex items-center space-x-3">
              {onOpenGlobalTriage && (
                <button
                  onClick={onOpenGlobalTriage}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                  title="Triagem Global de Tarefas"
                >
                  <FiFilter className="w-3 h-3" />
                  <span className="hidden sm:inline">Triagem</span>
                  {globalSuggestionsCount > 0 && (
                    <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                      {globalSuggestionsCount}
                    </span>
                  )}
                </button>
              )}
              
              {/* Background process indicators */}
              <div className="flex items-center space-x-1">
                {backgroundProcesses.analyzingPatterns && (
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" title="Analyzing patterns"></div>
                )}
                {backgroundProcesses.optimizingFlow && (
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" title="Optimizing flow"></div>
                )}
                {backgroundProcesses.predictingBottlenecks && (
                  <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" title="Predicting bottlenecks"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-3 h-full">
          {COLUMN_DEFINITIONS.map(column => {
            const columnTasks = tasksByColumn[column.id] || [];
            
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                projectId={projectId}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="transform rotate-2 shadow-2xl opacity-95 scale-105 transition-all cursor-grabbing">
              <TaskCard
                task={activeTask}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};