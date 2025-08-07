import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { slackApi } from '../../lib/axios';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';

// Types
interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
  topic: string;
  purpose: string;
  num_members?: number;
}

interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  channel: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
}

interface ChannelHistory {
  messages: SlackMessage[];
  has_more: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  icon?: any;
}

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  display_name: string;
  email: string;
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
}

interface MessageRequest {
  text?: string;
  blocks?: any;
  thread_ts?: string;
  reply_broadcast?: boolean;
}

interface SyncRequest {
  channel_name?: string;
  project_id?: string;
}

interface AnalyzeRequest {
  messages: SlackMessage[];
  analysis_type?: string;
  project_context?: any;
}

interface ChannelHistoryOptions {
  limit?: number;
  cursor?: string;
  oldest?: string;
  latest?: string;
}

// Health check for Slack service
export function useSlackServiceHealth() {
  return useQuery({
    queryKey: ['slack-service', 'health'],
    queryFn: async () => {
      const response = await slackApi.get('/health');
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

// Test Slack connection
export function useSlackConnectionTest() {
  return useQuery({
    queryKey: ['slack-service', 'test'],
    queryFn: async () => {
      const response = await slackApi.get('/api/slack/test');
      return response.data as { success: boolean; team_name: string; connected_at: string };
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get Slack channels
export function useSlackChannels(options = {}) {
  return useQuery({
    queryKey: queryKeys.slackChannels(),
    queryFn: async () => {
      const response = await slackApi.get('/api/slack/channels');
      return response.data.channels as SlackChannel[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options
  });
}

// Get channel history
export function useChannelHistory(
  channelId: string, 
  options: ChannelHistoryOptions = {},
  queryOptions = {}
) {
  return useQuery({
    queryKey: [...queryKeys.slackMessages(channelId), options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.cursor) params.append('cursor', options.cursor);
      if (options.oldest) params.append('oldest', options.oldest);
      if (options.latest) params.append('latest', options.latest);

      const url = `/api/slack/channels/${channelId}/history${params.toString() ? `?${params}` : ''}`;
      const response = await slackApi.get(url);
      return response.data as ChannelHistory;
    },
    enabled: !!channelId,
    staleTime: 30 * 1000, // 30 seconds
    ...queryOptions
  });
}

// Infinite query for channel history pagination
export function useInfiniteChannelHistory(channelId: string, options: Omit<ChannelHistoryOptions, 'cursor'> = {}) {
  return useQuery({
    queryKey: [...queryKeys.slackMessages(channelId), 'infinite', options],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (pageParam) params.append('cursor', pageParam);
      if (options.oldest) params.append('oldest', options.oldest);
      if (options.latest) params.append('latest', options.latest);

      const url = `/api/slack/channels/${channelId}/history${params.toString() ? `?${params}` : ''}`;
      const response = await slackApi.get(url);
      return response.data as ChannelHistory;
    },
    enabled: !!channelId,
  });
}

// Join channel
export function useJoinChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await slackApi.post(`/api/slack/channels/${channelId}/join`);
      return response.data.channel as SlackChannel;
    },
    onSuccess: (data, channelId) => {
      // Update channel in cache to reflect membership
      queryClient.setQueryData(queryKeys.slackChannels(), (old: SlackChannel[] | undefined) => 
        old?.map(channel => 
          channel.id === channelId 
            ? { ...channel, is_member: true }
            : channel
        ) || []
      );
      
      // Invalidate channel-specific queries
      invalidateQueries.slack();
    },
  });
}

// Send message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, request }: { channelId: string; request: MessageRequest }) => {
      const response = await slackApi.post(`/api/slack/channels/${channelId}/message`, request);
      return response.data.ts as string;
    },
    onSuccess: (_, { channelId }) => {
      // Invalidate channel history to show new message
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.slackMessages(channelId) 
      });
    },
  });
}

// Get team info
export function useSlackTeam() {
  return useQuery({
    queryKey: ['slack-service', 'team'],
    queryFn: async () => {
      const response = await slackApi.get('/api/slack/team');
      return response.data.team as SlackTeam;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get user info
export function useSlackUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['slack-service', 'user', userId],
    queryFn: async () => {
      const response = await slackApi.get(`/api/slack/users/${userId}`);
      return response.data.user as SlackUser;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Sync channel
export function useSyncChannel() {
  return useMutation({
    mutationFn: async ({ channelId, request }: { channelId: string; request: SyncRequest }) => {
      const response = await slackApi.post(`/api/slack/sync/${channelId}`, request);
      return response.data.job_id as string;
    },
  });
}

// Analyze messages
export function useAnalyzeMessages() {
  return useMutation({
    mutationFn: async (request: AnalyzeRequest) => {
      const response = await slackApi.post('/api/slack/analyze', request);
      return response.data.job_id as string;
    },
  });
}

// Combined hooks for common workflows
export function useSlackChannelWorkflow(channelId: string) {
  const channels = useSlackChannels();
  const history = useChannelHistory(channelId);
  const joinChannel = useJoinChannel();
  const sendMessage = useSendMessage();
  const syncChannel = useSyncChannel();
  const analyzeMessages = useAnalyzeMessages();

  const channel = channels.data?.find(c => c.id === channelId);
  const isJoined = channel?.is_member || false;

  const joinAndFetch = async () => {
    if (!isJoined) {
      await joinChannel.mutateAsync(channelId);
    }
    return history.refetch();
  };

  const sendAndRefresh = async (message: MessageRequest) => {
    const ts = await sendMessage.mutateAsync({ channelId, request: message });
    history.refetch();
    return ts;
  };

  const syncAndAnalyze = async (projectId?: string) => {
    const syncJobId = await syncChannel.mutateAsync({ 
      channelId, 
      request: { 
        channel_name: channel?.name,
        project_id: projectId 
      } 
    });

    const analyzeJobId = await analyzeMessages.mutateAsync({
      messages: history.data?.messages || [],
      analysis_type: 'task-detection',
      project_context: { project_id: projectId }
    });

    return { syncJobId, analyzeJobId };
  };

  return {
    channel,
    isJoined,
    messages: history.data?.messages || [],
    hasMore: history.data?.has_more || false,
    isLoading: channels.isLoading || history.isLoading,
    error: channels.error || history.error,
    joinAndFetch,
    sendAndRefresh,
    syncAndAnalyze,
    refetch: () => {
      channels.refetch();
      history.refetch();
    }
  };
}

// Hook for message search and filtering
export function useSlackMessageSearch(channelId: string, searchTerm: string) {
  const history = useChannelHistory(channelId);

  const filteredMessages = useMemo(() => {
    if (!history.data?.messages || !searchTerm) {
      return history.data?.messages || [];
    }

    return history.data.messages.filter(message =>
      message.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.user.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history.data?.messages, searchTerm]);

  return {
    messages: filteredMessages,
    totalMessages: history.data?.messages.length || 0,
    filteredCount: filteredMessages.length,
    isLoading: history.isLoading,
    error: history.error,
    refetch: history.refetch
  };
}

// Real-time message updates (polling-based)
export function useRealtimeChannelHistory(channelId: string, enabled = true) {
  return useChannelHistory(channelId, {}, {
    enabled: enabled && !!channelId,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchOnWindowFocus: true,
  });
}