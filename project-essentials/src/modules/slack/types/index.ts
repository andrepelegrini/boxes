import { ItemTimestamps } from '../../common/types';

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  type?: 'channel' | 'group' | 'im' | 'mpim' | 'private_channel';
  user?: string; // User ID for direct messages
  memberCount?: number;
}

export interface SlackMessage {
  id: string;
  channelId: string;
  text: string;
  user: string;
  timestamp: string;
  threadTimestamp?: string;
  reactions?: SlackReaction[];
  files?: SlackFile[];
  mentionsTask?: boolean;
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
}

export interface SlackIntegration {
  channelId: string;
  channelName: string;
  connected: boolean;
  lastSyncAt?: string;
  syncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  authStatus: 'not_connected' | 'connected' | 'expired' | 'error';
}

export interface SlackSyncMetadata extends ItemTimestamps {
  id: string;
  projectId: string;
  channelId: string;
  channelName: string;
  lastSyncTimestamp?: string;
  lastMessageTimestamp?: string;
  isEnabled: boolean;
  syncIntervalMinutes?: number;
  syncStatus?: 'local' | 'synced' | 'conflict';
  lastSyncAt?: string;
  teamId?: string;
}

export interface SlackDerivedTask extends ItemTimestamps {
  id: string;
  projectId: string;
  slackChannelId: string;
  sourceMessageTs: string;
  sourceMessageText: string;
  suggestedTaskName: string;
  suggestedDescription: string;
  suggestedAssignee?: string;
  confidenceScore: number;
  status: 'suggested' | 'accepted' | 'rejected' | 'created';
  createdTaskId?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  syncStatus?: 'local' | 'synced' | 'conflict';
  lastSyncAt?: string;
  teamId?: string;
}

export interface SlackOAuthResponse {
  ok: boolean;
  accessToken?: string;
  access_token?: string; // Slack API uses snake_case
  teamId?: string;
  team_id?: string; // Slack API uses snake_case
  teamName?: string;
  userId?: string;
  userEmail?: string;
  scope?: string;
  // Additional Slack OAuth v2 fields
  app_id?: string;
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  } | null;
  is_enterprise_install?: boolean;
  bot_user_id?: string;
  bot_id?: string;
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  token_type?: string;
  error?: string;
}

export interface SlackConnectionStatus {
  isConnected: boolean;
  teamName?: string;
  userEmail?: string;
  lastChecked?: string;
  error?: string;
}

// Export unified integration types
export * from './integration';