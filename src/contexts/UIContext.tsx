import { createContext, useContext } from 'react';

interface UIContextType {
  showCreateProjectModal?: boolean;
  setShowCreateProjectModal?: (show: boolean) => void;
  showAddDocumentModal?: boolean;
  setShowAddDocumentModal?: (show: boolean) => void;
  showCreateEventModal?: boolean;
  setShowCreateEventModal?: (show: boolean) => void;
  showSettingsModal?: boolean;
  setShowSettingsModal?: (show: boolean) => void;
  setCurrentEditingProjectForDocument?: (projectId: string | null) => void;
  setCurrentEditingProjectForEvent?: (projectId: string | null) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUIContext = () => {
  const context = useContext(UIContext);
  return context;
};

export default UIContext;