import { create } from 'zustand';

interface UIState {
  showCreateProjectModal: boolean;
  setShowCreateProjectModal: (show: boolean) => void;
  showCreateTaskModal: boolean;
  setShowCreateTaskModal: (show: boolean) => void;
  currentEditingProjectForTask: string | null;
  setCurrentEditingProjectForTask: (projectId: string | null) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showCreateProjectModal: false,
  setShowCreateProjectModal: (show) => set({ showCreateProjectModal: show }),
  showCreateTaskModal: false,
  setShowCreateTaskModal: (show) => set({ showCreateTaskModal: show }),
  currentEditingProjectForTask: null,
  setCurrentEditingProjectForTask: (projectId) => set({ currentEditingProjectForTask: projectId }),
  showSettingsModal: false,
  setShowSettingsModal: (show) => set({ showSettingsModal: show }),
}));
