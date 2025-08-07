
import { create } from 'zustand';
import { Project, Task, EventItem, DocumentItem, ActivityLog, AIAnalysisResults } from '../types';

interface AppState {
  projects: Project[];
  tasks: Task[];
  events: EventItem[];
  documents: DocumentItem[];
  activityLogs: ActivityLog[];
  geminiApiKey: string;
  isAIEnabled: boolean;
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
  addProjectCheckIn: (projectId: string, checkIn: any) => void; // Assuming checkIn type for now
}

export const useStore = create<AppState>((set) => ({
  projects: [],
  tasks: [],
  events: [],
  documents: [],
  activityLogs: [],
  geminiApiKey: '',
  isAIEnabled: false,
  updateProject: (updatedProject) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === updatedProject.id ? updatedProject : project
    ),
  })),
  addProject: (newProject) => set((state) => ({
    projects: [...state.projects, newProject],
  })),
  archiveProject: (projectId) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, status: 'archived' } : project
    ),
  })),
  getProjectWeight: (projectId) => {
    // Placeholder for actual implementation
    return 0;
  },
  markProjectAsReviewed: (projectId) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, lastReviewed: new Date().toISOString() } : project
    ),
  })),
  promoteProjectToActive: (projectId) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, status: 'active' } : project
    ),
  })),
  demoteProjectToShelf: (projectId) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, status: 'on-shelf' } : project
    ),
  })),
  toggleNextUp: (projectId) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, nextUp: !project.nextUp } : project
    ),
  })),
  addDocument: (newDocument) => set((state) => ({
    documents: [...state.documents, newDocument],
  })),
  addEvent: (newEvent) => set((state) => ({
    events: [...state.events, newEvent],
  })),
  addProjectCheckIn: (projectId, checkIn) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId
        ? { ...project, checkIns: [...(project.checkIns || []), checkIn] }
        : project
    ),
  })),
}));
