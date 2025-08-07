import React, { createContext, useContext, ReactNode } from 'react';
import { useStore } from '../store/useStore';
import { Project, DocumentItem, EventItem } from '../types';

interface ProjectContextType {
  projects: Project[];
  updateProject: (project: Project) => void;
  addProject: (project: Project) => void;
  archiveProject: (projectId: string) => void;
  getProjectWeight: (projectId: string) => number;
  markProjectAsReviewed: (projectId: string) => void;
  promoteProjectToActive: (projectId: string) => void;
  demoteProjectToShelf: (projectId: string) => void;
  toggleNextUp: (projectId: string) => void;
  addDocument: (document: DocumentItem) => void;
  addEvent: (event: EventItem) => void;
  addProjectCheckIn: (projectId: string, checkIn: any) => void;
  getProjectById: (projectId: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const {
    projects,
    updateProject,
    addProject,
    archiveProject,
    getProjectWeight,
    markProjectAsReviewed,
    promoteProjectToActive,
    demoteProjectToShelf,
    toggleNextUp,
    addDocument,
    addEvent,
    addProjectCheckIn,
  } = useStore();

  const getProjectById = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  const contextValue: ProjectContextType = {
    projects,
    updateProject,
    addProject,
    archiveProject,
    getProjectWeight,
    markProjectAsReviewed,
    promoteProjectToActive,
    demoteProjectToShelf,
    toggleNextUp,
    addDocument,
    addEvent,
    addProjectCheckIn,
    getProjectById,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
