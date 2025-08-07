import { createContext, useContext, ReactNode, useState } from 'react';
import { Task } from '../types';

interface TaskContextType {
  tasks?: Task[];
  addTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask?: (taskId: string, updates: Partial<Task>) => void;
  deleteTask?: (taskId: string) => void;
  setShowCreateTaskModal?: (show: boolean) => void;
  showCreateTaskModal?: boolean;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const contextValue: TaskContextType = {
    tasks,
    showCreateTaskModal,
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},
    setShowCreateTaskModal,
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  return context;
};

export default TaskContext;