// src/hooks/useProjectCheckInState.ts
import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import { ActivityLogActions } from './useActivityLogState';

export interface ProjectCheckIn {
  id: string;
  projectId: string;
  timestamp: string;
  text: string;
  mood: 'good' | 'neutral' | 'bad';
  workloadStatus: 'light' | 'manageable' | 'heavy';
}

export interface ProjectCheckInActions {
  addProjectCheckIn: (checkInData: Omit<ProjectCheckIn, 'id' | 'timestamp' | 'user'>) => void;
  getProjectCheckInsByProjectId: (projectId: string) => ProjectCheckIn[];
}

export const useProjectCheckInState = (
  addActivityLog: ActivityLogActions['addActivityLog']
): [ProjectCheckIn[], ProjectCheckInActions] => {
  const [projectCheckIns, setProjectCheckIns] = useState<ProjectCheckIn[]>(() => loadFromLocalStorage<ProjectCheckIn[]>('projectCheckIns_v2', []));

  useEffect(() => saveToLocalStorage('projectCheckIns_v2', projectCheckIns), [projectCheckIns]);

  const addProjectCheckIn = useCallback((checkInData: Omit<ProjectCheckIn, 'id' | 'timestamp' | 'user'>) => {
    const newCheckIn: ProjectCheckIn = {
      ...checkInData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      timestamp: new Date().toISOString(),
    };
    setProjectCheckIns(prev => [newCheckIn, ...prev]);
    addActivityLog({
      type: 'project',
      action: 'checkin',
      details: "Check-in da Caixa adicionado: \"" + checkInData.text.substring(0,30) + "...\"",
      projectId: checkInData.projectId
    });
  }, [addActivityLog, setProjectCheckIns]);

  const getProjectCheckInsByProjectId = useCallback((projectId: string) => {
    return projectCheckIns.filter(ci => ci.projectId === projectId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [projectCheckIns]);

  return [projectCheckIns, { addProjectCheckIn, getProjectCheckInsByProjectId }];
};