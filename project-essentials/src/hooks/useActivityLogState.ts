// src/hooks/useActivityLogState.ts
import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  details: string;
  projectId: string;
}

export interface ActivityLogActions {
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  getActivityLogsByProjectId: (projectId: string) => ActivityLog[];
}

export const useActivityLogState = (): [ActivityLog[], ActivityLogActions] => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadFromLocalStorage<ActivityLog[]>('activityLogs_v2', []));

  useEffect(() => saveToLocalStorage('activityLogs_v2', activityLogs), [activityLogs]);

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      timestamp: new Date().toISOString(),
      ...log
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 500)); // Keep last 500 logs
  }, []);

  const getActivityLogsByProjectId = useCallback((projectId: string) => {
    return activityLogs.filter(log => log.projectId === projectId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs]);

  return [activityLogs, { addActivityLog, getActivityLogsByProjectId }];
};