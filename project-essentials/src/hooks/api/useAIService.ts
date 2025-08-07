import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../../lib/axios';
import { queryKeys } from '../../lib/queryClient';

// Types
interface TaskAnalysisRequest {
  messages: string | Array<{ text: string; user: string; timestamp: string }>;
  context?: {
    project_id?: string;
    project_name?: string;
    team_members?: string[];
  };
  model?: string;
}

interface DetectedTask {
  title: string;
  description: string;
  assignee?: string;
  priority: string;
  status: string;
  source_message: string;
  source_user: string;
  source_timestamp?: string;
  estimated_hours?: number;
  due_date?: string;
  tags: string[];
}

interface TaskAnalysisResult {
  tasks: DetectedTask[];
  summary: string;
  confidence_score: number;
}

interface ProjectUpdateRequest {
  messages: string | object;
  project_context: {
    project_id?: string;
    project_name?: string;
    team_members?: string[];
  };
  model?: string;
}

interface ProjectUpdate {
  project_name: string;
  update_type: string;
  summary: string;
  details: string;
  impact: string;
  action_required: boolean;
  mentioned_by: string;
  timestamp: string;
}

interface ProjectUpdateResult {
  updates: ProjectUpdate[];
  overall_health: string;
  key_risks: string[];
  recommendations: string[];
  summary: string;
}

interface SummaryRequest {
  text: string;
  type?: string;
  options?: {
    max_length?: number;
    style?: 'bullet_points' | 'paragraph' | 'key_takeaways';
  };
}

interface SummaryResult {
  summary: string;
}

interface QueuedJobResponse {
  job_id: string;
  status: string;
}

interface JobStatusResult {
  id: string;
  queue: string;
  type: string;
  status: string;
  progress: any;
  data: any;
  result?: any;
  failed_reason?: string;
  created_at: string;
  processed_at?: string;
  finished_at?: string;
}

// Health check for AI service
export function useAIServiceHealth() {
  return useQuery({
    queryKey: ['ai-service', 'health'],
    queryFn: async () => {
      const response = await aiApi.get('/health');
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

// Analyze tasks from messages
export function useAnalyzeTasks() {
  return useMutation({
    mutationFn: async (request: TaskAnalysisRequest) => {
      const response = await aiApi.post('/api/ai/analyze-tasks', request);
      return response.data.data as TaskAnalysisResult;
    },
  });
}

// Analyze project updates
export function useAnalyzeProjectUpdates() {
  return useMutation({
    mutationFn: async (request: ProjectUpdateRequest) => {
      const response = await aiApi.post('/api/ai/analyze-project-updates', request);
      return response.data.data as ProjectUpdateResult;
    },
  });
}

// Generate summary
export function useSummarize() {
  return useMutation({
    mutationFn: async (request: SummaryRequest) => {
      const response = await aiApi.post('/api/ai/summarize', request);
      return response.data.data as SummaryResult;
    },
  });
}

// Queue analysis job
export function useQueueAnalysis() {
  return useMutation({
    mutationFn: async ({ 
      type, 
      data, 
      options 
    }: { 
      type: string; 
      data: any; 
      options?: any 
    }) => {
      const response = await aiApi.post('/api/ai/queue-analysis', {
        type,
        data,
        options
      });
      return response.data.data as QueuedJobResponse;
    },
  });
}

// Get job status
export function useJobStatus(jobId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.aiJob(jobId),
    queryFn: async () => {
      const response = await aiApi.get(`/api/ai/job/${jobId}`);
      return response.data.data as JobStatusResult;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds for active jobs
    },
  });
}

// Combined hook for task analysis with job tracking
export function useTaskAnalysisWithTracking() {
  const analyzeTasksMutation = useAnalyzeTasks();
  const queueAnalysisMutation = useQueueAnalysis();

  const analyzeWithTracking = async (request: TaskAnalysisRequest, useQueue = false) => {
    if (useQueue) {
      return queueAnalysisMutation.mutateAsync({
        type: 'task-analysis',
        data: request
      });
    } else {
      return analyzeTasksMutation.mutateAsync(request);
    }
  };

  return {
    analyze: analyzeWithTracking,
    isLoading: analyzeTasksMutation.isPending || queueAnalysisMutation.isPending,
    error: analyzeTasksMutation.error || queueAnalysisMutation.error,
    reset: () => {
      analyzeTasksMutation.reset();
      queueAnalysisMutation.reset();
    }
  };
}

// Batch operations
export function useBatchAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requests: TaskAnalysisRequest[]) => {
      const results = await Promise.allSettled(
        requests.map(request => 
          aiApi.post('/api/ai/analyze-tasks', request)
        )
      );

      return results.map((result, index) => ({
        index,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value.data.data : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    },
    onSuccess: (results) => {
      // Cache successful results
      results.forEach((result, index) => {
        if (result.success && result.data) {
          queryClient.setQueryData(
            ['ai-batch-analysis', index], 
            result.data
          );
        }
      });
    },
  });
}

// Smart cache invalidation based on analysis results
export function useInvalidateRelatedQueries() {
  const queryClient = useQueryClient();

  return (analysisResult: TaskAnalysisResult | ProjectUpdateResult) => {
    // Invalidate task-related queries if tasks were detected
    if ('tasks' in analysisResult && analysisResult.tasks.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    }

    // Invalidate project queries if updates were detected
    if ('updates' in analysisResult && analysisResult.updates.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    }
  };
}