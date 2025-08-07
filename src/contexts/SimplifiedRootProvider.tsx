
import React, { ReactNode, useEffect, useState, useContext, createContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initDatabase } from '../utils/database';
import { useStore } from '../store/useStore';
import { ProjectDescriptionSuggestionProvider } from './ProjectDescriptionSuggestionContext';
import { ProjectProvider, useProjectContext } from './ProjectContext';
import { WhatsAppProvider } from './WhatsAppContext';
import { SlackGlobalProvider } from './SlackGlobalContext';

import { useTaskContext, TaskProvider } from './TaskContext';
import { useUIStore } from '../store';
import { useAIContext, AIProvider } from './AIContext';
import { User } from '../types/app';
import { useUserSettingsState } from '../hooks/useUserSettingsState';


const queryClient = new QueryClient();

interface SimplifiedRootProviderProps {
  children: ReactNode;
}

interface UserContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  logoutUser: () => void;
  // Add any other user-related functions or state here
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Singleton state to prevent duplicate initialization
let globalInitializationState: {
  isInitialized: boolean;
  isInitializing: boolean;
  initPromise: Promise<void> | null;
  isDatabaseReady: boolean;
  initError: string | null;
} = {
  isInitialized: false,
  isInitializing: false,
  initPromise: null,
  isDatabaseReady: false,
  initError: null
};

export const SimplifiedRootProvider: React.FC<SimplifiedRootProviderProps> = ({ children }) => {
  const mountId = React.useRef(Math.random().toString(36).substr(2, 9));
  const [isDatabaseReady, setIsDatabaseReady] = useState(globalInitializationState.isDatabaseReady);
  const [initError, setInitError] = useState<string | null>(globalInitializationState.initError);
  const [currentUser, setCurrentUser] = useState<User | null>({ id: '1', name: 'Guest User', email: 'guest@example.com' });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Only log on first mount
  if (!globalInitializationState.isInitialized && !globalInitializationState.isInitializing) {
    console.log(`🔵 [SimplifiedRootProvider] Initializing... (Mount ID: ${mountId.current})`);
  }

  useEffect(() => {
    let isMounted = true;

    const preInit = async () => {
      // If already initialized, just sync state
      if (globalInitializationState.isInitialized) {
        if (isMounted) {
          setIsDatabaseReady(globalInitializationState.isDatabaseReady);
          setInitError(globalInitializationState.initError);
        }
        return;
      }

      // If currently initializing, wait for the existing promise
      if (globalInitializationState.isInitializing && globalInitializationState.initPromise) {
        try {
          await globalInitializationState.initPromise;
          if (isMounted) {
            setIsDatabaseReady(globalInitializationState.isDatabaseReady);
            setInitError(globalInitializationState.initError);
          }
        } catch (error) {
          // Error is already handled in the main initialization
        }
        return;
      }

      // Start initialization
      globalInitializationState.isInitializing = true;
      console.log('🔵 [SimplifiedRootProvider] Starting database initialization...');
      
      globalInitializationState.initPromise = (async () => {
        try {
          await initDatabase();
          globalInitializationState.isDatabaseReady = true;
          globalInitializationState.initError = null;
          console.log('✅ [SimplifiedRootProvider] Database initialized successfully');
        } catch (error) {
          console.error('❌ [SimplifiedRootProvider] Database initialization failed:', error);
          globalInitializationState.isDatabaseReady = false;
          globalInitializationState.initError = error instanceof Error ? error.message : 'Database initialization failed';
        } finally {
          globalInitializationState.isInitialized = true;
          globalInitializationState.isInitializing = false;
        }
      })();

      try {
        await globalInitializationState.initPromise;
        if (isMounted) {
          setIsDatabaseReady(globalInitializationState.isDatabaseReady);
          setInitError(globalInitializationState.initError);
        }
      } catch (error) {
        // Error is already handled above
      }
    };

    preInit();

    return () => {
      isMounted = false;
    };
  }, []);

  const logoutUser = () => {
    // Implement actual logout logic here
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isDatabaseReady) {
    console.log('🔄 [SimplifiedRootProvider] Database not ready yet, showing loading state');
    if (initError) {
      console.error('❌ [SimplifiedRootProvider] Showing error state:', initError);
      return (
        <div className="min-h-screen flex items-center justify-center bg-nubank-gray-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Database Error</h2>
            <p className="text-nubank-gray-600 mb-4">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-nubank-purple-600 text-white rounded hover:bg-nubank-purple-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-nubank-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-nubank-purple-200 border-t-nubank-purple-600 rounded-full mx-auto mb-4"></div>
          <p className="text-nubank-gray-600">Initializing database...</p>
        </div>
      </div>
    );
  }

  console.log('✅ [SimplifiedRootProvider] Rendering provider tree');
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectDescriptionSuggestionProvider>
        <ProjectProvider>
          <TaskProvider>
            <AIProvider>
              <WhatsAppProvider>
                <SlackGlobalProvider>
                  <UserContext.Provider value={{ currentUser, isAuthenticated, logoutUser }}>
                    {children}
                  </UserContext.Provider>
                </SlackGlobalProvider>
              </WhatsAppProvider>
            </AIProvider>
          </TaskProvider>
        </ProjectProvider>
      </ProjectDescriptionSuggestionProvider>
    </QueryClientProvider>
  );
};

export default SimplifiedRootProvider;

// Context hooks
export const useAppContext = () => {
  const projectsContext = useProjectContext();
  const tasksContext = useTaskContext();
  const uiStore = useUIStore();
  const aiContext = useAIContext();
  const userContext = useContext(UserContext);
  
  // Get user settings with proper localStorage integration
  const [userSettings, userSettingsActions] = useUserSettingsState(
    // Placeholder addActivityLog function since we don't have proper activity logs here
    () => {}
  );
  
  return {
    // Projects
    projects: projectsContext?.projects || [],
    updateProject: projectsContext?.updateProject || (() => {}),
    getProjectIntelligence: aiContext?.getProjectIntelligence || (() => Promise.resolve(null)),
    addProject: projectsContext?.addProject || (() => {}),
    archiveProject: projectsContext?.archiveProject || (() => {}),
    getProjectWeight: projectsContext?.getProjectWeight || (() => 0),
    markProjectAsReviewed: projectsContext?.markProjectAsReviewed || (() => {}),
    promoteProjectToActive: projectsContext?.promoteProjectToActive || (() => {}),
    demoteProjectToShelf: projectsContext?.demoteProjectToShelf || (() => {}),
    toggleNextUp: projectsContext?.toggleNextUp || (() => {}),
    
    // Tasks
    tasks: tasksContext,
    updateTask: tasksContext?.updateTask || (() => {}),
    deleteTask: tasksContext?.deleteTask || (() => {}),
    
    // Documents
    addDocument: projectsContext?.addDocument || (() => {}),
    setCurrentEditingProjectForDocument: () => {}, // Not implemented in uiStore
    showAddDocumentModal: false, // Not implemented in uiStore
    setShowAddDocumentModal: () => {}, // Not implemented in uiStore
    
    // User/Settings
    currentUser: userContext?.currentUser || null, // Get from UserContext
    userMaxActiveProjects: userSettings.userMaxActiveProjects,
    userTeamCapacity: userSettings.userTeamCapacity,
    isAIAvailable: aiContext?.isAIAvailable || (() => false),
    geminiApiKey: aiContext?.geminiApiKey || '',
    updateGeminiApiKey: aiContext?.updateGeminiApiKey || (() => Promise.resolve(false)),
    isAIEnabled: aiContext?.isAIEnabled || false,
    testGeminiConnection: aiContext?.testGeminiConnection || (() => Promise.resolve(false)),
    updateUserSettings: userSettingsActions.updateUserSettings,
    
    // UI State
    showCreateProjectModal: uiStore.showCreateProjectModal,
    setShowCreateProjectModal: uiStore.setShowCreateProjectModal,
    showSettingsModal: uiStore.showSettingsModal,
    setShowSettingsModal: uiStore.setShowSettingsModal,
    activityLogs: [],
    
    // Events
    addEvent: projectsContext.addEvent,
    addProjectCheckIn: projectsContext.addProjectCheckIn,
    setCurrentEditingProjectForEvent: () => {}, // Not implemented in uiStore
    showCreateEventModal: false, // Not implemented in uiStore
    setShowCreateEventModal: () => {}, // Not implemented in uiStore
    
    // AI
    triggerAIAnalysis: aiContext?.triggerAIAnalysis || (() => Promise.resolve()),
  };
};

export const useAppProjects = () => {
  const projectsContext = useProjectContext();
  return {
    getProjectById: projectsContext.getProjectById,
    addEvent: projectsContext.addEvent,
    addDocument: projectsContext?.addDocument || (() => {}),
    promoteProjectToActive: projectsContext.promoteProjectToActive,
    toggleNextUp: projectsContext.toggleNextUp,
  };
};

export const useAppTasks = () => {
  const tasksContext = useTaskContext();
  
  return {
    addTask: tasksContext?.addTask || (() => {}),
  };
};

export const useAppUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAppUser must be used within a UserProvider');
  }
  return context;
};

export const useAppUI = () => {
  return useUIStore();
};

export const useAppAI = () => {
  return useAIContext();
};

export const useAppSlack = () => {
  // Placeholder for slack context
  return {};
};
