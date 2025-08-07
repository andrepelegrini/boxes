import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databaseApi } from '../../lib/axios';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'on-shelf' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  nextUp: boolean;
  color?: string;
  tags?: string[];
  startDate?: string;
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tasks?: any[];
  _count?: {
    tasks: number;
    documents: number;
    events: number;
  };
}

interface CreateProjectData {
  name: string;
  description?: string;
  status?: 'active' | 'on-shelf' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  color?: string;
  tags?: string[];
  startDate?: string;
  dueDate?: string;
  userId: string;
}

interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Fetch all projects
export function useProjects(userId?: string, options = {}) {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: async () => {
      const response = await databaseApi.get('/projects', {
        params: { userId, includeArchived: false }
      });
      return response.data.data as Project[];
    },
    enabled: !!userId,
    ...options
  });
}

// Fetch single project
export function useProject(projectId: string, options = {}) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      const response = await databaseApi.get(`/projects/${projectId}`);
      return response.data.data as Project;
    },
    enabled: !!projectId,
    ...options
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await databaseApi.post('/projects', data);
      return response.data.data as Project;
    },
    onSuccess: () => {
      invalidateQueries.projects();
    },
  });
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProjectData) => {
      const response = await databaseApi.patch(`/projects/${id}`, data);
      return response.data.data as Project;
    },
    onSuccess: (data) => {
      // Update the specific project in cache
      queryClient.setQueryData(queryKeys.project(data.id), data);
      // Invalidate the projects list
      invalidateQueries.projects();
    },
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      await databaseApi.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSuccess: (projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
      // Invalidate the projects list
      invalidateQueries.projects();
    },
  });
}

// Optimistic update for quick actions
export function useToggleProjectNextUp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, nextUp }: { id: string; nextUp: boolean }) => {
      const response = await databaseApi.patch(`/projects/${id}`, { nextUp });
      return response.data.data as Project;
    },
    onMutate: async ({ id, nextUp }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.project(id) });
      
      // Snapshot previous value
      const previousProject = queryClient.getQueryData(queryKeys.project(id));
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.project(id), (old: Project | undefined) => 
        old ? { ...old, nextUp } : old
      );
      
      return { previousProject };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.project(id), context.previousProject);
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(data.id) });
        invalidateQueries.projects();
      }
    },
  });
}