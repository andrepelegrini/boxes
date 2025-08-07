import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for 5xx errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // You could show a toast notification here
      },
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  all: ['api'] as const,
  
  // Projects
  projects: () => [...queryKeys.all, 'projects'] as const,
  project: (id: string) => [...queryKeys.projects(), id] as const,
  
  // Tasks
  tasks: () => [...queryKeys.all, 'tasks'] as const,
  task: (id: string) => [...queryKeys.tasks(), id] as const,
  tasksByProject: (projectId: string) => [...queryKeys.tasks(), 'project', projectId] as const,
  
  // Documents
  documents: () => [...queryKeys.all, 'documents'] as const,
  document: (id: string) => [...queryKeys.documents(), id] as const,
  
  // Events
  events: () => [...queryKeys.all, 'events'] as const,
  event: (id: string) => [...queryKeys.events(), id] as const,
  
  // Slack
  slack: () => [...queryKeys.all, 'slack'] as const,
  slackChannels: () => [...queryKeys.slack(), 'channels'] as const,
  slackMessages: (channelId?: string) => 
    channelId 
      ? [...queryKeys.slack(), 'messages', channelId] as const
      : [...queryKeys.slack(), 'messages'] as const,
  
  // WhatsApp
  whatsapp: () => [...queryKeys.all, 'whatsapp'] as const,
  whatsappStatus: () => [...queryKeys.whatsapp(), 'status'] as const,
  whatsappMessages: () => [...queryKeys.whatsapp(), 'messages'] as const,
  
  // AI
  ai: () => [...queryKeys.all, 'ai'] as const,
  aiJob: (jobId: string) => [...queryKeys.ai(), 'job', jobId] as const,
  
  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  
  // Settings
  settings: () => [...queryKeys.all, 'settings'] as const,
  setting: (key: string) => [...queryKeys.settings(), key] as const,
};

// Cache invalidation helpers
export const invalidateQueries = {
  projects: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects() }),
  tasks: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks() }),
  documents: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents() }),
  events: () => queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
  slack: () => queryClient.invalidateQueries({ queryKey: queryKeys.slack() }),
  whatsapp: () => queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp() }),
  all: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
};