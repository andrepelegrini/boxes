// Simple Slack credentials management

export interface SlackCredentials {
  access_token: string;
  team_id: string;
  team_name: string;
  user_id: string;
  scope: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  type?: 'channel' | 'group' | 'im' | 'mpim' | 'private_channel';
  user?: string; // User ID for direct messages
  memberCount?: number;
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
  scope: string;
}

export function validateSlackConfig(credentials: SlackCredentials): boolean {
  return !!(credentials.access_token && credentials.team_id);
}

// Simple mock implementations for build compatibility
export async function isSlackConfigured(): Promise<boolean> {
  return false;
}

export async function getSlackCredentials(): Promise<SlackCredentials | null> {
  return null;
}

export async function storeSlackCredentials(): Promise<void> {
  console.log('Storing Slack credentials (simplified)');
}

export async function deleteSlackCredentials(): Promise<void> {
  console.log('Deleting Slack credentials (simplified)');
}