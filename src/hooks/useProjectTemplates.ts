// src/hooks/useProjectTemplates.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import ProjectTemplateService, { 
  ProjectTemplate, 
  TemplateUsageAnalytics 
} from '../services/ProjectTemplateService';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
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

interface Task {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
  status: string;
}

interface EventItem {
  id: string;
  name: string;
  description?: string;
  date: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProjectTemplatesReturn {
  // State
  templates: ProjectTemplate[];
  popularTemplates: ProjectTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  getAllTemplates: () => ProjectTemplate[];
  getTemplatesByCategory: (category: ProjectTemplate['category']) => ProjectTemplate[];
  getTemplateById: (id: string) => ProjectTemplate | undefined;
  searchTemplates: (query: string) => ProjectTemplate[];
  getRecommendedTemplates: (preferences?: {
    categories?: ProjectTemplate['category'][];
    difficulty?: ProjectTemplate['difficulty'];
    recentProjects?: string[];
  }) => ProjectTemplate[];
  
  // Template Management
  createCustomTemplate: (
    baseTemplate: ProjectTemplate,
    customizations: {
      name: string;
      description: string;
      projectData?: Partial<Project>;
      tasks?: Partial<Task>[];
      events?: Partial<EventItem>[];
    }
  ) => ProjectTemplate | null;
  
  generateProjectFromTemplate: (
    templateId: string,
    customizations: {
      projectName?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      customFields?: Record<string, any>;
    }
  ) => { project: Partial<Project>; tasks: Partial<Task>[]; events: Partial<EventItem>[] } | null;
  
  rateTemplate: (templateId: string, rating: number, feedback?: string) => void;
  deleteTemplate: (templateId: string) => boolean;
  
  // Import/Export
  exportTemplate: (templateId: string) => string | null;
  importTemplate: (templateJson: string) => ProjectTemplate | null;
  
  // Analytics
  getTemplateAnalytics: (templateId: string) => TemplateUsageAnalytics | undefined;
  
  // Utilities
  refreshTemplates: () => void;
  clearError: () => void;
}

export const useProjectTemplates = (): UseProjectTemplatesReturn => {
  const serviceRef = useRef<ProjectTemplateService | null>(null);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    try {
      setIsLoading(true);
      if (!serviceRef.current) {
        serviceRef.current = new ProjectTemplateService();
      }
      refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize template service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTemplates = useCallback(() => {
    if (!serviceRef.current) return;
    
    try {
      const allTemplates = serviceRef.current.getAllTemplates();
      const popular = serviceRef.current.getPopularTemplates(5);
      
      setTemplates(allTemplates);
      setPopularTemplates(popular);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, []);

  const getAllTemplates = useCallback((): ProjectTemplate[] => {
    if (!serviceRef.current) return [];
    return serviceRef.current.getAllTemplates();
  }, []);

  const getTemplatesByCategory = useCallback((category: ProjectTemplate['category']): ProjectTemplate[] => {
    if (!serviceRef.current) return [];
    return serviceRef.current.getTemplatesByCategory(category);
  }, []);

  const getTemplateById = useCallback((id: string): ProjectTemplate | undefined => {
    if (!serviceRef.current) return undefined;
    return serviceRef.current.getTemplateById(id);
  }, []);

  const searchTemplates = useCallback((query: string): ProjectTemplate[] => {
    if (!serviceRef.current) return [];
    try {
      return serviceRef.current.searchTemplates(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    }
  }, []);

  const getRecommendedTemplates = useCallback((preferences?: {
    categories?: ProjectTemplate['category'][];
    difficulty?: ProjectTemplate['difficulty'];
    recentProjects?: string[];
  }): ProjectTemplate[] => {
    if (!serviceRef.current) return [];
    try {
      return serviceRef.current.getRecommendedTemplates(preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
      return [];
    }
  }, []);

  const createCustomTemplate = useCallback((
    baseTemplate: ProjectTemplate,
    customizations: {
      name: string;
      description: string;
      projectData?: Partial<Project>;
      tasks?: Partial<Task>[];
      events?: Partial<EventItem>[];
    }
  ): ProjectTemplate | null => {
    if (!serviceRef.current) return null;
    
    try {
      const newTemplate = serviceRef.current.createCustomTemplate(baseTemplate, customizations);
      refreshTemplates();
      return newTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      return null;
    }
  }, [refreshTemplates]);

  const generateProjectFromTemplate = useCallback((
    templateId: string,
    customizations: {
      projectName?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      customFields?: Record<string, any>;
    }
  ): { project: Partial<Project>; tasks: Partial<Task>[]; events: Partial<EventItem>[] } | null => {
    if (!serviceRef.current) return null;
    
    try {
      const result = serviceRef.current.generateProjectFromTemplate(templateId, customizations);
      refreshTemplates(); // Refresh to update usage count
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project from template');
      return null;
    }
  }, [refreshTemplates]);

  const rateTemplate = useCallback((templateId: string, rating: number, feedback?: string): void => {
    if (!serviceRef.current) return;
    
    try {
      serviceRef.current.rateTemplate(templateId, rating, feedback);
      refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rate template');
    }
  }, [refreshTemplates]);

  const deleteTemplate = useCallback((templateId: string): boolean => {
    if (!serviceRef.current) return false;
    
    try {
      const success = serviceRef.current.deleteTemplate(templateId);
      if (success) {
        refreshTemplates();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }, [refreshTemplates]);

  const exportTemplate = useCallback((templateId: string): string | null => {
    if (!serviceRef.current) return null;
    
    try {
      return serviceRef.current.exportTemplate(templateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export template');
      return null;
    }
  }, []);

  const importTemplate = useCallback((templateJson: string): ProjectTemplate | null => {
    if (!serviceRef.current) return null;
    
    try {
      const template = serviceRef.current.importTemplate(templateJson);
      if (template) {
        refreshTemplates();
      }
      return template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import template');
      return null;
    }
  }, [refreshTemplates]);

  const getTemplateAnalytics = useCallback((templateId: string): TemplateUsageAnalytics | undefined => {
    if (!serviceRef.current) return undefined;
    return serviceRef.current.getTemplateAnalytics(templateId);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    templates,
    popularTemplates,
    isLoading,
    error,
    
    // Actions
    getAllTemplates,
    getTemplatesByCategory,
    getTemplateById,
    searchTemplates,
    getRecommendedTemplates,
    
    // Template Management
    createCustomTemplate,
    generateProjectFromTemplate,
    rateTemplate,
    deleteTemplate,
    
    // Import/Export
    exportTemplate,
    importTemplate,
    
    // Analytics
    getTemplateAnalytics,
    
    // Utilities
    refreshTemplates,
    clearError
  };
};

// Helper hook for template categories and difficulties
export const useTemplateConstants = () => {
  const categories: { value: ProjectTemplate['category']; label: string }[] = [
    { value: 'desenvolvimento', label: 'Desenvolvimento' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'pesquisa', label: 'Pesquisa' },
    { value: 'design', label: 'Design' },
    { value: 'negocio', label: 'Negócio' },
    { value: 'pessoal', label: 'Pessoal' },
    { value: 'educacao', label: 'Educação' }
  ];

  const difficulties: { value: ProjectTemplate['difficulty']; label: string }[] = [
    { value: 'iniciante', label: 'Iniciante' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'avancado', label: 'Avançado' }
  ];

  const getDifficultyColor = (difficulty: ProjectTemplate['difficulty']) => {
    switch (difficulty) {
      case 'iniciante': return 'text-nubank-green-600 bg-nubank-green-100';
      case 'intermediario': return 'text-nubank-orange-600 bg-nubank-orange-100';
      case 'avancado': return 'text-nubank-pink-600 bg-nubank-pink-100';
    }
  };

  const getCategoryColor = (category: ProjectTemplate['category']) => {
    switch (category) {
      case 'desenvolvimento': return 'text-nubank-purple-600 bg-nubank-purple-100';
      case 'marketing': return 'text-nubank-pink-600 bg-nubank-pink-100';
      case 'pesquisa': return 'text-nubank-blue-600 bg-nubank-blue-100';
      case 'design': return 'text-nubank-orange-600 bg-nubank-orange-100';
      case 'negocio': return 'text-nubank-green-600 bg-nubank-green-100';
      case 'pessoal': return 'text-nubank-gray-600 bg-nubank-gray-100';
      case 'educacao': return 'text-nubank-blue-600 bg-nubank-blue-100';
    }
  };

  return {
    categories,
    difficulties,
    getDifficultyColor,
    getCategoryColor
  };
};

export default useProjectTemplates;