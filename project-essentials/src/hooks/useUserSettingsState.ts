// src/hooks/useUserSettingsState.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  MAX_ACTIVE_PROJECTS as DEFAULT_MAX_ACTIVE_PROJECTS, 
  TEAM_COMFORTABLE_WEIGHT_CAPACITY_ITEMS as DEFAULT_TEAM_CAPACITY,
  USER_SETTINGS_MAX_ACTIVE_PROJECTS_KEY, 
  USER_SETTINGS_TEAM_CAPACITY_KEY
} from '../constants/appConstants';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import { ActivityLogActions } from './useActivityLogState';

export interface UserSettings {
  userMaxActiveProjects: number;
  userTeamCapacity: number;
}

export interface UserSettingsActions {
  updateUserSettings: (settings: { maxActiveProjects?: number; teamCapacity?: number }) => void;
}

export const useUserSettingsState = (
  addActivityLog: ActivityLogActions['addActivityLog']
): [UserSettings, UserSettingsActions] => {
  const [userMaxActiveProjects, setUserMaxActiveProjects] = useState<number>(() => 
    loadFromLocalStorage<number>(USER_SETTINGS_MAX_ACTIVE_PROJECTS_KEY, DEFAULT_MAX_ACTIVE_PROJECTS)
  );
  const [userTeamCapacity, setUserTeamCapacity] = useState<number>(() =>
    loadFromLocalStorage<number>(USER_SETTINGS_TEAM_CAPACITY_KEY, DEFAULT_TEAM_CAPACITY)
  );

  useEffect(() => saveToLocalStorage(USER_SETTINGS_MAX_ACTIVE_PROJECTS_KEY, userMaxActiveProjects), [userMaxActiveProjects]);
  useEffect(() => saveToLocalStorage(USER_SETTINGS_TEAM_CAPACITY_KEY, userTeamCapacity), [userTeamCapacity]);

  const updateUserSettings = useCallback((settings: { maxActiveProjects?: number; teamCapacity?: number }) => {
    if (settings.maxActiveProjects !== undefined) {
      setUserMaxActiveProjects(settings.maxActiveProjects);
    }
    if (settings.teamCapacity !== undefined) {
      setUserTeamCapacity(settings.teamCapacity);
    }
    addActivityLog({
      type: 'system',
      action: 'settings_update',
      details: 'Configurações do aplicativo atualizadas.',
      projectId: 'system'
    });
  }, [addActivityLog]);

  return [{ userMaxActiveProjects, userTeamCapacity }, { updateUserSettings }];
};