import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Define types inline since the file doesn't exist
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  workingHours: {
    start: string;
    end: string;
  };
  timezone: string;
}

export interface LocalUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  picture?: string;
  isAdmin?: boolean;
  createdAt: string;
  lastActiveAt: string;
  preferences: UserPreferences;
}

interface LocalUserContextValue {
  user: LocalUser | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (profile: Partial<Pick<LocalUser, 'name' | 'email' | 'avatar' | 'picture' | 'isAdmin'>>) => Promise<void>;
  logout: () => Promise<void>;
  
  // Getters
  getUserIdentifier: () => string;
  getDisplayName: () => string;
  getUserTimezone: () => string;
  isInWorkingHours: () => boolean;
  
  // Utilities
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const LocalUserContext = createContext<LocalUserContextValue | null>(null);

export function useLocalUser(): LocalUserContextValue {
  const context = useContext(LocalUserContext);
  if (!context) {
    throw new Error('useLocalUser must be used within a LocalUserProvider');
  }
  return context;
}

interface LocalUserProviderProps {
  children: React.ReactNode;
}

export function LocalUserProvider({ children }: LocalUserProviderProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initializeUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Mocking the service call
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockUser: LocalUser = {
        id: '123',
        name: 'Local User',
        email: 'local@user.com',
        picture: undefined,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            slack: true,
          },
          workingHours: {
            start: '09:00',
            end: '17:00',
          },
          timezone: 'America/New_York',
        },
      };
      setUser(mockUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao inicializar usuário local:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user) return;
    
    setError(null);
    
    try {
      // Mocking the service call
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedUser: LocalUser = {
        ...user,
        preferences: {
          ...user.preferences,
          ...preferences,
        },
      };
      setUser(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar preferências:', error);
      throw error;
    }
  }, [user]);

  const updateProfile = useCallback(async (profile: Partial<Pick<LocalUser, 'name' | 'email' | 'avatar' | 'picture' | 'isAdmin'>>) => {
    if (!user) return;
    
    setError(null);
    
    try {
      // Mocking the service call
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedUser: LocalUser = {
        ...user,
        ...profile,
      };
      setUser(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    await initializeUser();
  }, [initializeUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear user data
      setUser(null);
      // Clear any stored credentials/tokens if they exist
      // This is a placeholder - in a real app you'd clear localStorage, cookies, etc.
      console.log('User logged out successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setError(errorMessage);
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserIdentifier = useCallback(() => {
    return user?.id || 'unknown';
  }, [user]);

  const getDisplayName = useCallback(() => {
    return user?.name || 'Unknown User';
  }, [user]);

  const getUserTimezone = useCallback(() => {
    return user?.preferences.timezone || 'UTC';
  }, [user]);

  const isInWorkingHours = useCallback(() => {
    return true; // Mocking this for now
  }, []);

  // Initialize user on mount
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Update last active time periodically
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      // Mocking this for now
    };

    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);
    
    // Update on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const contextValue: LocalUserContextValue = {
    user,
    isLoading,
    error,
    
    // Actions
    initializeUser,
    updatePreferences,
    updateProfile,
    logout,
    
    // Getters
    getUserIdentifier,
    getDisplayName,
    getUserTimezone,
    isInWorkingHours,
    
    // Utilities
    refreshUser,
    clearError,
  };

  return (
    <LocalUserContext.Provider value={contextValue}>
      {children}
    </LocalUserContext.Provider>
  );
}

// Export the context for direct access if needed
export { LocalUserContext };