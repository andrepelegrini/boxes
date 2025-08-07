
import { useState, useCallback } from 'react';
import { Task } from '../../types';
import { invoke } from '@tauri-apps/api/core';

export interface TaskActions {
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>;
  updateTask: (task: Task, status?: string) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  getTasksByProjectId: (projectId: string) => Promise<void>;
}

export const useTaskState = (
  addActivityLog: (projectId: string, message: string) => void
): [Task[], TaskActions] => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const getTasksByProjectId = useCallback(async (projectId: string) => {
    try {
      const fetchedTasks = await invoke<Task[]>('get_tasks_for_project', { projectId });
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks for project:', error);
    }
  }, []);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null> => {
    try {
      const taskId = await invoke<string>('create_task_from_suggestion', { taskData });

      const now = new Date().toISOString();
      const newTask: Task = {
        ...taskData,
        id: taskId,
        createdAt: now,
        updatedAt: now,
        completed: false,
      };

      setTasks(prev => [...prev, newTask]);
      
      if (taskData.projectId) {
        addActivityLog(taskData.projectId, `Task created: ${taskData.name}`);
      }

      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      return null;
    }
  }, [addActivityLog]);

  const updateTask = useCallback(async (updatedTask: Task) => {
    try {
      await invoke('update_task_field', { 
        taskId: updatedTask.id,
        field: 'name',
        value: updatedTask.name
      });
      await invoke('update_task_field', { 
        taskId: updatedTask.id,
        field: 'description',
        value: updatedTask.description
      });

      setTasks(prev => prev.map(task => task.id === updatedTask.id ? { ...task, ...updatedTask, updatedAt: new Date().toISOString() } : task));
      
      if (updatedTask.projectId) {
        addActivityLog(updatedTask.projectId, `Task updated: ${updatedTask.name}`);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [addActivityLog]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      await invoke('delete_task_by_id', { taskId });
      setTasks(prev => prev.filter(task => task.id !== taskId));

      if (taskToDelete?.projectId) {
        addActivityLog(taskToDelete.projectId, `Task deleted: ${taskToDelete.name}`);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [tasks, addActivityLog]);

  const toggleTaskComplete = useCallback(async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newCompletedState = !task.completed;

      await invoke('update_task_field', { 
        taskId,
        field: 'completed',
        value: newCompletedState
      });

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompletedState, updatedAt: new Date().toISOString() } : t));
      
      if (task.projectId) {
        const status = newCompletedState ? 'completed' : 'incomplete';
        addActivityLog(task.projectId, `Task marked as ${status}: ${task.name}`);
      }
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    }
  }, [tasks, addActivityLog]);

  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  const actions: TaskActions = {
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    getTaskById,
    getTasksByProjectId,
  };

  return [tasks, actions];
};