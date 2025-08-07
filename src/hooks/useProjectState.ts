// src/hooks/useProjectState.ts
import { useState, useEffect, useCallback } from 'react';
import {
  MAX_NEXT_UP_PROJECTS,
  PROJECT_STATUS_ACTIVE,
  PROJECT_STATUS_ARCHIVED,
  PROJECT_STATUS_SHELF
} from '../constants/appConstants';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import { ActivityLogActions } from './useActivityLogState';
import { useToast } from '../components/ui/Toast';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'shelf' | 'archived';
  createdAt: string;
  updatedAt: string;
  isNextUp?: boolean;
  strategicGoal?: string;
  slackChannelUrl?: string;
  lastReviewedAt?: string;
  archivedAt?: string;
  archiveReason?: string;
  aiAnalysis?: any;
}

export type ProjectStatus = 'active' | 'shelf' | 'archived';
export type ProjectDropZone = 'active' | 'shelf' | 'nextUp';
export type ProjectWeightCategory = 'light' | 'medium' | 'heavy' | 'overwhelming';

export interface ProjectWeightBreakdown {
  tasks: number;
  events: number;
  documents: number;
  stalePoints: number;
}

export interface DraggedProjectInfo {
  id: string;
  sourceZone: ProjectDropZone;
}

export interface AIAnalysisResults {
  summary: string;
  recommendations: string[];
  risks: string[];
  opportunities: string[];
  nextActions: string[];
  confidence: number;
  timestamp: string;
}

export interface ProjectActions {
  addProject: (projectData: { name: string; description?: string; strategicGoal?: string }) => Project | null;
  updateProject: (project: Project, activityMessage?: string) => void;
  _updateProjectAIAnalysis: (projectId: string, aiAnalysis: AIAnalysisResults, activityMessage?: string) => void;
  archiveProject: (projectId: string, reason: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  promoteProjectToActive: (projectId: string) => boolean;
  demoteProjectToShelf: (projectId: string) => void;
  toggleNextUp: (projectId: string) => void;
  handleProjectDrop: (draggedProjectInfo: DraggedProjectInfo, targetZone: ProjectDropZone) => void;
  markProjectAsReviewed: (projectId: string) => void;
  getProjectById: (projectId: string) => Project | undefined;
}

export const useProjectState = (
  addActivityLog: ActivityLogActions['addActivityLog'],
  userMaxActiveProjects: number
): [Project[], ProjectActions] => {
  const [projects, setProjects] = useState<Project[]>(() => loadFromLocalStorage<Project[]>('projects_v2', []));
  const { showFriendlyError } = useToast();

  useEffect(() => saveToLocalStorage('projects_v2', projects), [projects]);

  const _updateProjectInternal = useCallback((updatedProject: Project, activityMessage?: string) => {
    const now = new Date().toISOString();
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? {...updatedProject, updatedAt: now, slackChannelUrl: updatedProject.slackChannelUrl } : p));
    if (activityMessage && updatedProject.id) {
        addActivityLog({
          type: 'project',
          action: 'update',
          details: activityMessage,
          projectId: updatedProject.id
        });
    }
  }, [addActivityLog, setProjects]);
  
  const _updateProjectAIAnalysis = useCallback((projectId: string, aiAnalysis: AIAnalysisResults, activityMessage?: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === projectId);
      if (!project) return prev;
      
      const now = new Date().toISOString();
      const updatedProject = { ...project, aiAnalysis, updatedAt: now };
      
      if (activityMessage) {
        addActivityLog({
          type: 'project',
          action: 'ai_analysis',
          details: activityMessage,
          projectId: projectId
        });
      }
      
      return prev.map(p => p.id === projectId ? updatedProject : p);
    });
  }, [addActivityLog]);

  const updateProject = useCallback((updatedProject: Project, activityMessage?: string) => {
     _updateProjectInternal(updatedProject, activityMessage || "Detalhes da Caixa \"" + updatedProject.name + "\" atualizados.");
  }, [_updateProjectInternal]);

  const promoteProjectToActive = useCallback((projectId: string): boolean => {
    const activeProjectsCount = (projects || []).filter(p => p.status === PROJECT_STATUS_ACTIVE).length;
    if (activeProjectsCount >= userMaxActiveProjects) {
      showFriendlyError('🎯 Foco é Fundamental\n\nVocê já tem ' + activeProjectsCount + ' caixas em ação (limite: ' + userMaxActiveProjects + '). Finalize algo primeiro para manter a qualidade!');
      return false;
    }
    const project = (projects || []).find(p => p.id === projectId);
    if (project) {
      _updateProjectInternal({ ...project, status: PROJECT_STATUS_ACTIVE, isNextUp: false }, "Caixa \"" + project.name + "\" movida para 'Caixas Abertas'.");
      return true;
    }
    return false;
  }, [projects, userMaxActiveProjects, _updateProjectInternal]); 

  const demoteProjectToShelf = useCallback((projectId: string) => {
    const project = (projects || []).find(p => p.id === projectId);
    if (project) {
        _updateProjectInternal({ ...project, status: PROJECT_STATUS_SHELF, isNextUp: false }, "Caixa \"" + project.name + "\" movida para 'Caixas sendo Preenchidas'.");
    }
  }, [projects, _updateProjectInternal]); 

  const toggleNextUp = useCallback((projectId: string) => {
    setProjects(prevProjects => {
      const project = (prevProjects || []).find(p => p.id === projectId);
      if (!project || project.status !== PROJECT_STATUS_SHELF) return prevProjects;

      const currentlyNextUp = (prevProjects || []).filter(p => p.isNextUp && p.id !== projectId);
      const now = new Date().toISOString();
      
      if (project.isNextUp) {
        addActivityLog({
          type: 'project',
          action: 'remove_next_up',
          details: "Caixa \"" + project.name + "\" removida de 'Caixas Prontas para Abrir'.",
          projectId: projectId
        });
        return prevProjects.map(p => p.id === projectId ? { ...p, isNextUp: false, updatedAt: now } : p);
      } else {
        if (currentlyNextUp.length < MAX_NEXT_UP_PROJECTS) {
          addActivityLog({
            type: 'project',
            action: 'add_next_up',
            details: "Caixa \"" + project.name + "\" marcada como 'Pronta para Abrir'.",
            projectId: projectId
          });
          return prevProjects.map(p => p.id === projectId ? { ...p, isNextUp: true, updatedAt: now } : p);
        } else {
          showFriendlyError('⭐ Muitas Estrelas Brilhando\n\nVocê já tem ' + currentlyNextUp.length + ' caixas prontas para decolar (limite: ' + MAX_NEXT_UP_PROJECTS + '). Que tal ativar uma primeiro?');
          return prevProjects;
        }
      }
    });
  }, [addActivityLog, setProjects]);

  const handleProjectDrop = useCallback((draggedProjectInfo: DraggedProjectInfo, targetZone: ProjectDropZone) => {
    const { id: projectId, sourceZone } = draggedProjectInfo;
    const project = (projects || []).find(p => p.id === projectId);
    if (!project) return;

    if (targetZone === sourceZone) {
       if (sourceZone === 'shelf' && targetZone === 'nextUp' && project.isNextUp) return;
       if (sourceZone === 'nextUp' && targetZone === 'shelf' && !project.isNextUp) return;
       if (sourceZone === targetZone && !(sourceZone === 'shelf' && targetZone === 'nextUp' && !project.isNextUp) && !(sourceZone === 'nextUp' && targetZone==='shelf')) return;
    }

    let finalProjectState: Partial<Project> = {};
    let activityMessage = '';

    if (targetZone === 'active') {
      const activeCount = projects.filter(p => p.status === PROJECT_STATUS_ACTIVE && p.id !== projectId).length;
      if (activeCount >= userMaxActiveProjects) {
        showFriendlyError('🎯 Foco é Fundamental\n\nVocê já tem ' + activeCount + ' caixas em ação (limite: ' + userMaxActiveProjects + '). Finalize algo primeiro para manter a qualidade!');
        return;
      }
      finalProjectState = { status: PROJECT_STATUS_ACTIVE, isNextUp: false };
      activityMessage = "Caixa \"" + project.name + "\" movida para 'Caixas Abertas'.";
    } else if (targetZone === 'nextUp') {
      const nextUpCount = projects.filter(p => p.isNextUp && p.id !== projectId).length;
      if (nextUpCount >= MAX_NEXT_UP_PROJECTS) {
        showFriendlyError('⭐ Organização em Primeiro Lugar\n\nVocê já tem ' + nextUpCount + ' caixas prontas (limite: ' + MAX_NEXT_UP_PROJECTS + '). Ative uma primeiro para fazer espaço!');
        if (project.status === PROJECT_STATUS_ACTIVE) {
            finalProjectState = { status: PROJECT_STATUS_SHELF, isNextUp: false };
            activityMessage = "Caixa \"" + project.name + "\" movida para 'Caixas sendo Preenchidas' (limite de 'Prontas para Abrir' atingido).";
        } else {
            return;
        }
      } else {
        finalProjectState = { status: PROJECT_STATUS_SHELF, isNextUp: true };
        activityMessage = "Caixa \"" + project.name + "\" marcada como 'Pronta para Abrir'.";
      }
    } else {
      finalProjectState = { status: PROJECT_STATUS_SHELF, isNextUp: false };
      activityMessage = "Caixa \"" + project.name + "\" movida para 'Caixas sendo Preenchidas'.";
    }
    
    _updateProjectInternal({ ...project, ...finalProjectState }, activityMessage);

  }, [projects, userMaxActiveProjects, _updateProjectInternal]);

  const archiveProject = useCallback(async (projectId: string, reason: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === projectId);
      if (!project) return prev;
      
      // Disable connected Slack channels when archiving the project (async)
      (async () => {
        try {
          // Use simplified database access
          const { SlackSyncService } = await import('../modules/slack/services/SlackSyncService');
          const disabledCount = await SlackSyncService.disableChannelsForProject(projectId);
          if (disabledCount > 0) {
            console.log(`🔌 [useProjectState] Disabled ${disabledCount} Slack channels for archived project "${project.name}"`);
          }
        } catch (error) {
          console.error('❌ [useProjectState] Error disabling Slack channels for archived project:', error);
        }
      })();

      const now = new Date().toISOString();
      const updatedProject = {
        ...project,
        status: PROJECT_STATUS_ARCHIVED,
        archiveReason: reason,
        archivedAt: now,
        updatedAt: now,
        isNextUp: false
      };
      
      addActivityLog({
        type: 'project',
        action: 'archive',
        details: `Caixa "${project.name}" fechada/arquivada. Motivo: ${reason}`,
        projectId: projectId
      });
      
      return prev.map(p => p.id === projectId ? updatedProject : p);
    });
  }, [addActivityLog]); 
  
  const markProjectAsReviewed = useCallback((projectId: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === projectId);
      if (!project) return prev;
      
      const now = new Date().toISOString();
      const updatedProject = { ...project, lastReviewedAt: now, updatedAt: now };
      
      addActivityLog({
        type: 'project',
        action: 'review',
        details: `Caixa "${project.name}" marcada como revisada.`,
        projectId: projectId
      });
      
      return prev.map(p => p.id === projectId ? updatedProject : p);
    });
  }, [addActivityLog]); 

  const deleteProject = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.error('Project not found for deletion:', projectId);
      return;
    }

    try {
      // Import and call the enhanced ProjectService.delete method
      const { ProjectService } = await import('../utils/database');
      await ProjectService.delete(projectId);
      
      // Remove from local state after successful database deletion
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Log the deletion activity
      addActivityLog({
        type: 'project',
        action: 'delete',
        details: `🗑️ Project "${project.name}" permanently deleted with all related data`,
        projectId: projectId
      });
      
      console.log(`✅ Successfully deleted project "${project.name}" (${projectId})`);
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      showFriendlyError('Failed to delete project. Please try again.');
      throw error;
    }
  }, [projects, addActivityLog, showFriendlyError]);

  const getProjectById = useCallback((projectId: string) => projects.find(p => p.id === projectId), [projects]);

  const addProject = useCallback((projectData: { name: string; description?: string; strategicGoal?: string }): Project | null => {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      createdAt: now,
      updatedAt: now,
      status: 'shelf',
      isNextUp: false,
      lastReviewedAt: '',
      archivedAt: '',
      archiveReason: '',
      aiAnalysis: {},
      slackChannelUrl: ''
    };
    setProjects(prev => [newProject, ...prev]);
    addActivityLog({
      type: 'project',
      action: 'create',
      details: "Caixa \"" + newProject.name + "\" criada.",
      projectId: newProject.id
    });
    return newProject;
  }, [addActivityLog, setProjects]);

  return [projects, { addProject, updateProject, _updateProjectAIAnalysis, archiveProject, deleteProject, promoteProjectToActive, demoteProjectToShelf, toggleNextUp, handleProjectDrop, markProjectAsReviewed, getProjectById }];
};