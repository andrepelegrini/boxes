
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Project } from '../modules/projects/types';

interface ProjectDescriptionSuggestion {
  id: string;
  projectId: string;
  projectName: string;
  channelName: string;
  currentDescription: string;
  suggestedDescription: string;
  suggestedNextSteps: string[];
  isFirstTime: boolean;
  isSignificantChange: boolean;
  changeReason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ProjectDescriptionSuggestionContextType {
  pendingDescriptionSuggestions: ProjectDescriptionSuggestion[];
  addSuggestion: (suggestion: Omit<ProjectDescriptionSuggestion, 'id' | 'status' | 'createdAt'>) => void;
  approveSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
}

const ProjectDescriptionSuggestionContext = createContext<ProjectDescriptionSuggestionContextType | undefined>(undefined);

interface ProjectDescriptionSuggestionProviderProps {
  children: ReactNode;
}

export const ProjectDescriptionSuggestionProvider: React.FC<ProjectDescriptionSuggestionProviderProps> = ({ children }) => {
  const [pendingDescriptionSuggestions, setPendingDescriptionSuggestions] = useState<ProjectDescriptionSuggestion[]>([]);

  const addSuggestion = useCallback((suggestion: Omit<ProjectDescriptionSuggestion, 'id' | 'status' | 'createdAt'>) => {
    const newSuggestion: ProjectDescriptionSuggestion = {
      ...suggestion,
      id: `suggestion_${suggestion.projectId}_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setPendingDescriptionSuggestions(prev => [...prev, newSuggestion]);
  }, []);

  const approveSuggestion = useCallback((suggestionId: string) => {
    setPendingDescriptionSuggestions(prev =>
      prev.map(s => (s.id === suggestionId ? { ...s, status: 'approved' } : s))
    );
  }, []);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    setPendingDescriptionSuggestions(prev =>
      prev.map(s => (s.id === suggestionId ? { ...s, status: 'rejected' } : s))
    );
  }, []);

  return (
    <ProjectDescriptionSuggestionContext.Provider
      value={{
        pendingDescriptionSuggestions,
        addSuggestion,
        approveSuggestion,
        rejectSuggestion,
      }}
    >
      {children}
    </ProjectDescriptionSuggestionContext.Provider>
  );
};

export const useProjectDescriptionSuggestion = (): ProjectDescriptionSuggestionContextType => {
  const context = useContext(ProjectDescriptionSuggestionContext);
  if (context === undefined) {
    throw new Error('useProjectDescriptionSuggestion must be used within a ProjectDescriptionSuggestionProvider');
  }
  return context;
};
