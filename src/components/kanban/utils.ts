import { Active, DataRef, Over } from '@dnd-kit/core';
import { Task, KanbanColumnId } from '../../../types';

// Type definitions for drag data
export interface TaskDragData {
  type: 'Task';
  task: Task;
}

export interface SuggestedTaskDragData {
  type: 'SuggestedTask';
  task: Task;
}

export interface ColumnDragData {
  type: 'Column';
  column: {
    id: KanbanColumnId;
    title: string;
    description: string;
  };
}

export type DragData = TaskDragData | SuggestedTaskDragData | ColumnDragData;

// Type guards for drag data validation
export function hasDraggableData<T extends Active | Over>(
  entry: T | null | undefined
): entry is T & {
  data: DataRef<DragData>;
} {
  if (!entry) {
    return false;
  }

  const data = entry.data.current;

  if (data?.type === 'Task' || data?.type === 'SuggestedTask' || data?.type === 'Column') {
    return true;
  }

  return false;
}

export function isTaskDragData(data: any): data is TaskDragData {
  return data?.type === 'Task';
}

export function isSuggestedTaskDragData(data: any): data is SuggestedTaskDragData {
  return data?.type === 'SuggestedTask';
}

export function isColumnDragData(data: any): data is ColumnDragData {
  return data?.type === 'Column';
}

// Helper to determine if a task is AI-generated
export function isAIGeneratedTask(task: Task): boolean {
  return (
    task.status === 'sugestoes' ||
    task.description?.includes('AI-generated') ||
    task.name?.includes('[AI]') ||
    task.assignee === 'AI' ||
    (!task.status && task.id?.startsWith('ai-'))
  );
}

// Helper to get the appropriate column for a task
export function getTaskColumn(task: Task): KanbanColumnId {
  // Handle legacy status values
  if (task.status) {
    // Map legacy status values to valid columns
    const statusMapping: Record<string, KanbanColumnId> = {
      'pending': 'descobrindo',
      'todo': 'descobrindo',
      'in-progress': 'realizando',
      'in_progress': 'realizando',
      'done': 'concluidas',
      'completed': 'concluidas',
      // Valid column IDs
      'sugestoes': 'sugestoes',
      'descobrindo': 'descobrindo',
      'realizando': 'realizando',
      'concluidas': 'concluidas',
    };
    
    const mappedStatus = statusMapping[task.status.toLowerCase()];
    if (mappedStatus) {
      return mappedStatus;
    }
    
    // If we have an unknown status, log it and use default logic
    console.warn(`Unknown task status '${task.status}' for task ${task.id}`);
  }
  
  // AI-generated tasks without explicit status go to suggestions
  if (isAIGeneratedTask(task)) {
    return 'sugestoes';
  }
  
  // Regular tasks default based on completed status
  return task.completed ? 'concluidas' : 'descobrindo';
}

// Helper to validate column transition
export function isValidColumnTransition(
  _from: KanbanColumnId,
  _to: KanbanColumnId
): boolean {
  // Allow free movement between all columns
  return true;
}

// Helper to get column display info
export function getColumnDisplayInfo(columnId: KanbanColumnId) {
  const columnInfo = {
    sugestoes: {
      title: 'AI Suggestions',
      description: 'AI-powered task recommendations',
      emptyMessage: 'Nenhuma sugestão da IA',
      emptySubMessage: 'Aguardando sugestões inteligentes...',
    },
    descobrindo: {
      title: 'Discovery',
      description: 'Exploring and planning',
      emptyMessage: 'Nenhuma tarefa',
      emptySubMessage: 'Arraste tarefas aqui ou crie uma nova',
    },
    realizando: {
      title: 'In Progress',
      description: 'Active development',
      emptyMessage: 'Nenhuma tarefa',
      emptySubMessage: 'Arraste tarefas aqui quando começar a trabalhar',
    },
    concluidas: {
      title: 'Completed',
      description: 'Done and delivered',
      emptyMessage: 'Nenhuma tarefa',
      emptySubMessage: 'Tarefas concluídas aparecerão aqui',
    },
  };

  return columnInfo[columnId];
}