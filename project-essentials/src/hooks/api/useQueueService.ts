import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueApi } from '../../lib/axios';
import { queryKeys } from '../../lib/queryClient';

// Types
interface JobRequest {
  queue: string;
  type: string;
  data: any;
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
    remove_on_complete?: boolean;
  };
}

interface JobResponse {
  id: string;
  queue: string;
  type: string;
  status: string;
  created_at: string;
}

interface JobStatus {
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

interface QueueJobs {
  waiting: JobInfo[];
  active: JobInfo[];
  completed: JobInfo[];
  failed: JobInfo[];
}

interface JobInfo {
  id: string;
  type: string;
  data?: any;
  progress?: any;
  result?: any;
  failed_reason?: string;
  created_at: string;
  finished_at?: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface SlackSyncRequest {
  project_id: string;
  channel_id: string;
  channel_name: string;
  access_token: string;
  last_timestamp?: number;
}

interface MessageAnalysisRequest {
  messages: any;
  analysis_type: string;
  project_context?: any;
}

// Health check for Queue service
export function useQueueServiceHealth() {
  return useQuery({
    queryKey: ['queue-service', 'health'],
    queryFn: async () => {
      const response = await queueApi.get('/health');
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

// Add job to queue
export function useAddJob() {
  return useMutation({
    mutationFn: async (request: JobRequest) => {
      const response = await queueApi.post('/api/queue/jobs', request);
      return response.data.job as JobResponse;
    },
  });
}

// Get job status
export function useJobStatus(queue: string, jobId: string, enabled = true) {
  return useQuery({
    queryKey: ['queue-service', 'job', queue, jobId],
    queryFn: async () => {
      const response = await queueApi.get(`/api/queue/jobs/${queue}/${jobId}`);
      return response.data.job as JobStatus;
    },
    enabled: enabled && !!queue && !!jobId,
    refetchInterval: (data) => {
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds for active jobs
    },
  });
}

// Get all jobs for a queue
export function useQueueJobs(queue: string, enabled = true) {
  return useQuery({
    queryKey: ['queue-service', 'jobs', queue],
    queryFn: async () => {
      const response = await queueApi.get(`/api/queue/jobs/${queue}`);
      return response.data.jobs as QueueJobs;
    },
    enabled: enabled && !!queue,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Cancel job
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queue, jobId }: { queue: string; jobId: string }) => {
      const response = await queueApi.delete(`/api/queue/jobs/${queue}/${jobId}`);
      return response.data.result;
    },
    onSuccess: (_, { queue, jobId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['queue-service', 'job', queue, jobId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['queue-service', 'jobs', queue] 
      });
    },
  });
}

// Get queue statistics
export function useQueueStats() {
  return useQuery({
    queryKey: ['queue-service', 'stats'],
    queryFn: async () => {
      const response = await queueApi.get('/api/queue/stats');
      return response.data.stats as Record<string, QueueStats>;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Slack-specific operations
export function useSlackSync() {
  return useMutation({
    mutationFn: async (request: SlackSyncRequest) => {
      const response = await queueApi.post('/api/queue/slack/sync-channel', request);
      return response.data.job as JobResponse;
    },
  });
}

export function useSlackAnalysis() {
  return useMutation({
    mutationFn: async (request: MessageAnalysisRequest) => {
      const response = await queueApi.post('/api/queue/slack/analyze-messages', request);
      return response.data.job as JobResponse;
    },
  });
}

// AI analysis operations
export function useAITaskDetection() {
  return useMutation({
    mutationFn: async ({ 
      messages, 
      project_context, 
      options 
    }: { 
      messages: any; 
      project_context?: any; 
      options?: any 
    }) => {
      const response = await queueApi.post('/api/queue/ai/detect-tasks', {
        messages,
        project_context,
        options
      });
      return response.data.job as JobResponse;
    },
  });
}

export function useProjectAnalysis() {
  return useMutation({
    mutationFn: async ({ 
      messages, 
      project_context, 
      update_type 
    }: { 
      messages: any; 
      project_context: any; 
      update_type?: string 
    }) => {
      const response = await queueApi.post('/api/queue/ai/analyze-project-updates', {
        messages,
        project_context,
        update_type
      });
      return response.data.job as JobResponse;
    },
  });
}

// WhatsApp operations
export function useWhatsAppSync() {
  return useMutation({
    mutationFn: async ({ 
      chat_id, 
      last_timestamp, 
      sync_type 
    }: { 
      chat_id: string; 
      last_timestamp?: number; 
      sync_type?: string 
    }) => {
      const response = await queueApi.post('/api/queue/whatsapp/sync-messages', {
        chat_id,
        last_timestamp,
        sync_type
      });
      return response.data.job as JobResponse;
    },
  });
}

export function useWhatsAppAnalysis() {
  return useMutation({
    mutationFn: async ({ 
      messages, 
      analysis_type, 
      context 
    }: { 
      messages: any; 
      analysis_type: string; 
      context?: any 
    }) => {
      const response = await queueApi.post('/api/queue/whatsapp/analyze', {
        messages,
        analysis_type,
        context
      });
      return response.data.job as JobResponse;
    },
  });
}

// Combined hook for job creation and tracking
export function useJobWithTracking() {
  const addJobMutation = useAddJob();
  const queryClient = useQueryClient();

  const createAndTrackJob = async (request: JobRequest) => {
    const job = await addJobMutation.mutateAsync(request);
    
    // Start polling for job status
    queryClient.setQueryData(
      ['queue-service', 'job', job.queue, job.id],
      job
    );

    return job;
  };

  return {
    createJob: createAndTrackJob,
    isLoading: addJobMutation.isPending,
    error: addJobMutation.error,
    reset: addJobMutation.reset,
  };
}

// Batch job operations
export function useBatchJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requests: JobRequest[]) => {
      const results = await Promise.allSettled(
        requests.map(request => 
          queueApi.post('/api/queue/jobs', request)
        )
      );

      return results.map((result, index) => ({
        index,
        success: result.status === 'fulfilled',
        job: result.status === 'fulfilled' ? result.value.data.job : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    },
    onSuccess: (results) => {
      // Cache successful job results
      results.forEach((result) => {
        if (result.success && result.job) {
          queryClient.setQueryData(
            ['queue-service', 'job', result.job.queue, result.job.id],
            result.job
          );
        }
      });
    },
  });
}

// Queue management hooks
export function useQueueManagement(queue: string) {
  const jobs = useQueueJobs(queue);
  const cancelJob = useCancelJob();
  const addJob = useAddJob();

  const retryFailedJobs = async () => {
    if (!jobs.data?.failed) return;

    const retryPromises = jobs.data.failed.map(failedJob => 
      addJob.mutateAsync({
        queue,
        type: failedJob.type,
        data: failedJob.data,
        options: { priority: 1 } // High priority for retries
      })
    );

    return Promise.allSettled(retryPromises);
  };

  const clearCompleted = async () => {
    if (!jobs.data?.completed) return;

    const cancelPromises = jobs.data.completed.map(completedJob =>
      cancelJob.mutateAsync({ queue, jobId: completedJob.id })
    );

    return Promise.allSettled(cancelPromises);
  };

  return {
    jobs: jobs.data,
    isLoading: jobs.isLoading,
    error: jobs.error,
    retryFailedJobs,
    clearCompleted,
    cancelJob: (jobId: string) => cancelJob.mutateAsync({ queue, jobId }),
    refetch: jobs.refetch,
  };
}