export interface SlackIntegrationConfig {
  autoLoadCredentials?: boolean;
  autoCheckConnection?: boolean;
  enableOAuthCallbackListener?: boolean;
  cacheChannels?: boolean;
  defaultSyncInterval?: number;
  enableTaskDiscovery?: boolean;
  enableNotifications?: boolean;
  enableWebSocket?: boolean;
}

export interface SlackConnectionStatus {
  isConnected: boolean;
  hasCredentials: boolean;
  hasAccessToken: boolean;
  lastChecked?: string;
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  topic?: string;
  purpose?: string;
  memberCount?: number;
  lastActivity?: string;
}

export interface SlackProjectSyncData {
  projectId: string;
  channelId: string;
  channelName: string;
  lastSyncAt?: string;
  messageCount: number;
  isActive: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastError?: string;
}

export interface SlackIntegrationState {
  connectionStatus: SlackConnectionStatus;
  availableChannels: SlackChannel[];
  projectSyncData: Record<string, SlackProjectSyncData>;
  loading: {
    connection: boolean;
    channels: boolean;
    sync: boolean;
  };
  errors: {
    connection?: string;
    channels?: string;
    sync?: string;
  };
}

export interface SlackIntegrationActions {
  // Connection management
  connect: () => Promise<boolean>;
  disconnect: () => void;
  checkConnection: () => Promise<boolean>;
  
  // Channel management
  loadChannels: () => Promise<SlackChannel[]>;
  refreshChannels: () => Promise<SlackChannel[]>;
  
  // Project sync management
  connectProjectToChannel: (projectId: string, channelId: string) => Promise<boolean>;
  disconnectProjectFromChannel: (projectId: string) => Promise<void>;
  syncProject: (projectId: string) => Promise<boolean>;
  
  // Configuration
  updateConfig: (config: Partial<SlackIntegrationConfig>) => void;
  resetToDefaults: () => void;
}

export interface UseSlackIntegrationReturn {
  state: SlackIntegrationState;
  actions: SlackIntegrationActions;
  config: SlackIntegrationConfig;
  isConnected: boolean;
  isConfigured: boolean;
  hasError: boolean;
  isLoading: boolean;
}

// Event types for Slack integration
export interface SlackIntegrationEvent {
  type: 'connection_changed' | 'channels_updated' | 'sync_completed' | 'error_occurred';
  data: any;
  timestamp: string;
}

// OAuth flow types
export interface SlackOAuthState {
  state: string;
  redirectUri: string;
  scopes: string[];
  teamId?: string;
}

export interface SlackOAuthResponse {
  accessToken: string;
  refreshToken?: string;
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  scope: string;
  expiresIn?: number;
}