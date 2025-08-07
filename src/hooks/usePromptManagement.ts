import { useState, useEffect, useCallback } from 'react';
import { CustomPrompt, PromptCategory, PromptManagementService, UpdatePromptRequest } from '../services/PromptManagementService';

interface PromptManagementState {
  prompts: CustomPrompt[];
  categories: PromptCategory[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface PromptManagementActions {
  loadPrompts: () => Promise<void>;
  updatePrompt: (promptId: string, request: UpdatePromptRequest) => Promise<CustomPrompt>;
  resetPromptToDefault: (promptId: string) => Promise<CustomPrompt>;
  ratePrompt: (promptId: string, rating: number, notes?: string) => Promise<CustomPrompt>;
  getPromptByKey: (promptKey: string) => Promise<CustomPrompt | null>;
  initializeDefaults: () => Promise<void>;
}

export const usePromptManagement = () => {
  const [state, setState] = useState<PromptManagementState>({
    prompts: [],
    categories: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [prompts, categories] = await Promise.all([
        PromptManagementService.getAllPrompts(),
        PromptManagementService.getPromptsByCategory()
      ]);

      setState(prev => ({
        ...prev,
        prompts,
        categories,
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load prompts');
      setLoading(false);
    }
  }, [setLoading, setError]);

  const updatePrompt = useCallback(async (promptId: string, request: UpdatePromptRequest): Promise<CustomPrompt> => {
    try {
      setError(null);
      const updatedPrompt = await PromptManagementService.updatePrompt(promptId, request);
      
      // Update the prompt in state
      setState(prev => ({
        ...prev,
        prompts: prev.prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p),
        categories: prev.categories.map(category => ({
          ...category,
          prompts: category.prompts.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
        })),
        lastUpdated: new Date().toISOString()
      }));

      return updatedPrompt;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      setError(error instanceof Error ? error.message : 'Failed to update prompt');
      throw error;
    }
  }, [setError]);

  const resetPromptToDefault = useCallback(async (promptId: string): Promise<CustomPrompt> => {
    try {
      setError(null);
      const resetPrompt = await PromptManagementService.resetPromptToDefault(promptId);
      
      // Update the prompt in state
      setState(prev => ({
        ...prev,
        prompts: prev.prompts.map(p => p.id === resetPrompt.id ? resetPrompt : p),
        categories: prev.categories.map(category => ({
          ...category,
          prompts: category.prompts.map(p => p.id === resetPrompt.id ? resetPrompt : p)
        })),
        lastUpdated: new Date().toISOString()
      }));

      return resetPrompt;
    } catch (error) {
      console.error('Failed to reset prompt:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset prompt');
      throw error;
    }
  }, [setError]);

  const ratePrompt = useCallback(async (promptId: string, rating: number, notes?: string): Promise<CustomPrompt> => {
    return updatePrompt(promptId, { user_rating: rating, performance_notes: notes || null });
  }, [updatePrompt]);

  const getPromptByKey = useCallback(async (promptKey: string): Promise<CustomPrompt | null> => {
    try {
      return await PromptManagementService.getPromptByKey(promptKey);
    } catch (error) {
      console.error('Failed to get prompt by key:', error);
      setError(error instanceof Error ? error.message : 'Failed to get prompt');
      return null;
    }
  }, [setError]);

  const initializeDefaults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await PromptManagementService.initializeDefaultPrompts();
      await loadPrompts(); // Reload after initialization
    } catch (error) {
      console.error('Failed to initialize default prompts:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize prompts');
      setLoading(false);
    }
  }, [loadPrompts, setLoading, setError]);

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const actions: PromptManagementActions = {
    loadPrompts,
    updatePrompt,
    resetPromptToDefault,
    ratePrompt,
    getPromptByKey,
    initializeDefaults,
  };

  return {
    state,
    actions,
    // Convenience getters
    isLoading: state.loading,
    hasError: !!state.error,
    error: state.error,
    prompts: state.prompts,
    categories: state.categories,
    lastUpdated: state.lastUpdated,
  };
};

// Specialized hook for getting a specific prompt
export const usePrompt = (promptKey: string) => {
  const [prompt, setPrompt] = useState<CustomPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrompt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await PromptManagementService.getPromptByKey(promptKey);
      setPrompt(result);
    } catch (err) {
      console.error('Failed to load prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  }, [promptKey]);

  useEffect(() => {
    if (promptKey) {
      loadPrompt();
    }
  }, [promptKey, loadPrompt]);

  return {
    prompt,
    loading,
    error,
    reload: loadPrompt,
  };
};

// Hook for tracking prompt usage
export const usePromptUsage = () => {
  const recordUsage = useCallback(async (
    promptKey: string, 
    success: boolean, 
    executionTimeMs: number, 
    tokenCount?: number
  ) => {
    try {
      await PromptManagementService.recordPromptUsage(promptKey, success, executionTimeMs, tokenCount);
    } catch (error) {
      console.warn('Failed to record prompt usage:', error);
      // Don't throw as this is analytics and shouldn't break main flow
    }
  }, []);

  return { recordUsage };
};