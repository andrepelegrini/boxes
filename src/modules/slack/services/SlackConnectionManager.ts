/**
 * Simplified Slack Connection Manager
 * Handles persistent session management and reliable connection state
 */

import { invoke } from '../../../utils/tauri';

export interface ConnectionState {
  isConfigured: boolean;
  isConnected: boolean;
  isAuthenticating: boolean;
  teamName?: string;
  teamId?: string;
  clientId?: string;
  lastConnected?: string;
  error?: {
    type: string;
    message: string;
  };
  connectionStatus: {
    hasAccessToken: boolean;
    isConnected: boolean;
    hasCredentials: boolean;
    teamName?: string;
  };
  // Channel management state
  channels: Array<{ 
    id: string; 
    name: string; 
    is_member?: boolean; 
    is_private?: boolean;
    purpose?: { value: string };
    topic?: { value: string };
    num_members?: number;
  }>;
  loading: {
    channels: boolean;
    credentials: boolean;
  };
  // Additional properties for setup wizard compatibility
  credentials?: {
    client_id: string;
    client_secret: string;
  };
  oauth: {
    isInProgress: boolean;
  };
}

export interface ConnectionStatus {
  status: 'disconnected' | 'configured' | 'authenticated' | 'connected' | 'error';
  message: string;
  canRetry: boolean;
  nextStep?: 'configure' | 'authenticate' | 'connect_channels';
  error?: string;
}

class SlackConnectionManager {
  private state: ConnectionState = {
    isConfigured: false,
    isConnected: false,
    isAuthenticating: false,
    channels: [],
    loading: {
      channels: false,
      credentials: false,
    },
    connectionStatus: {
      hasAccessToken: false,
      isConnected: false,
      hasCredentials: false,
    },
    oauth: {
      isInProgress: false,
    },
  };

  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private storageKey = 'slack_connection_state';
  private initialized = false;
  
  // Rate limiting & circuit breaker
  private lastApiCall = 0;
  private apiCallCount = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerResetTime = 0;
  private readonly MIN_API_INTERVAL = 30000; // 30 seconds between API calls
  private readonly MAX_API_CALLS_PER_HOUR = 50; // Conservative limit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes

  constructor() {
    // Don't initialize immediately - wait for first access
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    
    await this.loadPersistedState();
    this.startConnectionHealthCheck();
    this.initialized = true;
  }

  // State management
  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state); // Immediate callback with current state
    
    // Ensure initialization happens in background
    this.ensureInitialized().then(() => {
      listener(this.state); // Update with initialized state
    });
    
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<ConnectionState>) {
    this.state = { ...this.state, ...updates };
    this.persistState();
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Persistence
  private async persistState() {
    try {
      // Skip in test environment
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
        return;
      }
      
      const persistData = {
        isConfigured: this.state.isConfigured,
        isConnected: this.state.isConnected,
        teamName: this.state.teamName,
        teamId: this.state.teamId,
        clientId: this.state.clientId,
        lastConnected: this.state.lastConnected,
      };
      
      await invoke('store_setting', {
        key: this.storageKey,
        value: JSON.stringify(persistData)
      });
    } catch (error) {
      console.error('Failed to persist connection state:', error);
    }
  }

  private async loadPersistedState() {
    try {
      // Skip in test environment
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
        return;
      }
      
      // First, check if we have actual credentials in keychain
      const credentialStatus = await this.checkKeychainCredentials();
      
      // Then load our persisted UI state
      const stored = await invoke<string>('get_setting', { key: this.storageKey });
      if (stored) {
        const persistData = JSON.parse(stored);
        this.state = {
          ...this.state,
          ...persistData,
          isAuthenticating: false, // Never persist auth state
          error: undefined, // Clear old errors
        };
      }

      // Reconcile state with actual credential status
      if (credentialStatus.hasValidCredentials && credentialStatus.hasAccessToken) {
        // We have valid credentials - ensure we're marked as connected
        this.state = {
          ...this.state,
          isConfigured: true,
          isConnected: true,
          clientId: credentialStatus.clientId,
          teamName: credentialStatus.teamName,
          teamId: credentialStatus.teamId,
        };
      } else if (credentialStatus.hasValidCredentials && !credentialStatus.hasAccessToken) {
        // We have client credentials but no access token - mark as configured but not connected
        this.state = {
          ...this.state,
          isConfigured: true,
          isConnected: false,
          clientId: credentialStatus.clientId,
          credentials: { client_id: credentialStatus.clientId, client_secret: '' }, // Add credentials object
        };
      } else {
        // No valid credentials - mark as disconnected
        this.state = {
          ...this.state,
          isConfigured: false,
          isConnected: false,
          clientId: undefined,
          teamName: undefined,
          teamId: undefined,
        };
      }

      this.notifyListeners();

      // Auto-verify connection is now handled by health check only
      // No immediate verification to prevent duplicate API calls on startup
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  // Helper method to check keychain credentials
  private async checkKeychainCredentials(): Promise<{
    hasValidCredentials: boolean;
    hasAccessToken: boolean;
    clientId?: string;
    teamName?: string;
    teamId?: string;
  }> {
    try {
      const result = await invoke<{
        client_id: string;
        client_secret: string;
        access_token?: string;
        team_id?: string;
        team_name?: string;
      } | null>('get_slack_credentials');

      if (result && result.client_id && result.client_secret) {
        return {
          hasValidCredentials: true,
          hasAccessToken: !!result.access_token,
          clientId: result.client_id,
          teamName: result.team_name,
          teamId: result.team_id,
        };
      }

      return {
        hasValidCredentials: false,
        hasAccessToken: false,
      };
    } catch (error) {
      return {
        hasValidCredentials: false,
        hasAccessToken: false,
      };
    }
  }

  // Connection operations
  async configure(clientId: string, clientSecret: string): Promise<void> {
    await this.ensureInitialized();
    this.updateState({ error: undefined });

    try {
      const result = await invoke<{ success: boolean; error?: string }>('slack_store_credentials', {
        credentials: { client_id: clientId, client_secret: clientSecret }
      });

      if (result.success) {
        this.updateState({
          isConfigured: true,
          clientId,
          error: undefined,
        });
      } else {
        throw new Error(result.error || 'Failed to store credentials');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Configuration failed';
      this.updateState({ error: message });
      throw error;
    }
  }

  async authenticate(): Promise<void> {
    await this.ensureInitialized();
    if (!this.state.isConfigured || !this.state.clientId) {
      throw new Error('Must configure credentials first');
    }

    this.updateState({ isAuthenticating: true, error: undefined });

    try {
      const result = await invoke<{ success: boolean; url?: string; error?: string }>('slack_start_oauth', {
        clientId: this.state.clientId
      });

      if (result.success && result.url) {
        // OAuth will continue in callback
        // Don't update isAuthenticating here - let callback handle it
      } else {
        throw new Error(result.error || 'Failed to start authentication');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      this.updateState({ isAuthenticating: false, error: message });
      throw error;
    }
  }

  async completeAuthentication(code: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.state.isConfigured) {
      throw new Error('Must configure credentials first');
    }

    try {
      const result = await invoke<{ 
        success: boolean; 
        data?: { team?: { name: string; id: string } }; 
        error?: string;
      }>('slack_complete_oauth', { code });

      if (result.success && result.data) {
        this.updateState({
          isConnected: true,
          isAuthenticating: false,
          teamName: result.data.team?.name,
          teamId: result.data.team?.id,
          lastConnected: new Date().toISOString(),
          error: undefined,
        });
      } else {
        throw new Error(result.error || 'Authentication completion failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication completion failed';
      this.updateState({ isAuthenticating: false, error: message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.ensureInitialized();
    try {
      await invoke('delete_slack_credentials');
      this.updateState({
        isConfigured: false,
        isConnected: false,
        isAuthenticating: false,
        teamName: undefined,
        teamId: undefined,
        clientId: undefined,
        lastConnected: undefined,
        error: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Disconnect failed';
      this.updateState({ error: message });
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    await this.ensureInitialized();
    if (this.state.clientId) {
      await this.authenticate();
    } else {
      throw new Error('No credentials found for reconnection');
    }
  }

  private async verifyConnection(): Promise<void> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      if (Date.now() < this.circuitBreakerResetTime) {
        return;
      } else {
        this.circuitBreakerOpen = false;
      }
    }

    // Rate limiting check
    const now = Date.now();
    if (now - this.lastApiCall < this.MIN_API_INTERVAL) {
      return;
    }

    // Double-check we have credentials before attempting verification
    const credentialStatus = await this.checkKeychainCredentials();
    if (!credentialStatus.hasValidCredentials || !credentialStatus.hasAccessToken) {
      this.updateState({
        isConnected: false,
        error: 'OAuth required - please authenticate with Slack',
      });
      return;
    }

    try {
      // Update API call tracking
      this.lastApiCall = now;
      this.apiCallCount++;
      
      const result = await invoke<{ success: boolean; data?: { connected: boolean; teamInfo?: any }; error?: string }>('slack_check_connection');
      
      if (result.success && result.data) {
        if (!result.data.connected) {
          this.updateState({
            isConnected: false,
            error: 'Connection lost - please reconnect',
          });
        } else {
          // Connection is good - reset circuit breaker
          this.circuitBreakerOpen = false;
          this.updateState({
            isConnected: true,
            error: undefined,
          });
        }
      } else {
        this.handleVerificationFailure(result.error || 'Connection verification failed');
      }
    } catch (error) {
      this.handleVerificationFailure('Unable to verify connection');
    }
  }

  private handleVerificationFailure(errorMessage: string) {
    // Check if we should open circuit breaker
    if (this.apiCallCount > this.MAX_API_CALLS_PER_HOUR) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
    }
    
    this.updateState({
      isConnected: false,
      error: errorMessage,
    });
  }

  // Health monitoring - SINGLE SOURCE OF CONNECTION VERIFICATION
  private startConnectionHealthCheck() {
    setInterval(async () => {
      // Reset API call counter every hour
      const now = Date.now();
      if (now - this.lastApiCall > 60 * 60 * 1000) {
        this.apiCallCount = 0;
      }

      // Only verify if we think we're connected and not currently authenticating
      if (this.state.isConnected && !this.state.isAuthenticating) {
        // Check circuit breaker first
        if (this.circuitBreakerOpen && now < this.circuitBreakerResetTime) {
          return;
        }

        // Verify we still have valid credentials before making API call
        const credentialStatus = await this.checkKeychainCredentials();
        if (credentialStatus.hasValidCredentials && credentialStatus.hasAccessToken) {
          // This is the ONLY place connection verification should happen automatically
          await this.verifyConnection();
        } else {
          // Credentials are missing/invalid - update state immediately
          this.updateState({ 
            isConnected: false,
            error: 'OAuth required - please authenticate with Slack'
          });
        }
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
  }

  // Status helpers - keeping for backward compatibility
  // Use getInitializedStatus() for fully initialized status

  // Synchronous getters for initial state
  getState(): ConnectionState {
    // Return current state synchronously for React hooks
    return { ...this.state };
  }

  getStatus(): ConnectionStatus {
    // Return status based on current state
    if (this.state.error) {
      return {
        status: 'error',
        message: this.state.error,
        canRetry: true,
        nextStep: this.state.isConfigured ? 'authenticate' : 'configure',
      };
    }

    if (this.state.isAuthenticating) {
      return {
        status: 'authenticated',
        message: 'Completing authentication...',
        canRetry: false,
      };
    }

    if (this.state.isConnected) {
      return {
        status: 'connected',
        message: `Connected to ${this.state.teamName || 'Slack'}`,
        canRetry: false,
        nextStep: 'connect_channels',
      };
    }

    if (this.state.isConfigured) {
      return {
        status: 'configured',
        message: 'Ready to authenticate with Slack',
        canRetry: false,
        nextStep: 'authenticate',
      };
    }

    return {
      status: 'disconnected',
      message: 'Not connected to Slack',
      canRetry: false,
      nextStep: 'configure',
    };
  }

  isReady(): boolean {
    return this.state.isConnected && !this.state.error;
  }

  // Async getters for full initialization
  async getInitializedState(): Promise<ConnectionState> {
    await this.ensureInitialized();
    return { ...this.state };
  }

  async getInitializedStatus(): Promise<ConnectionStatus> {
    await this.ensureInitialized();
    return this.getStatus();
  }

  async isReadyInitialized(): Promise<boolean> {
    await this.ensureInitialized();
    return this.state.isConnected && !this.state.error;
  }

  // Debug method to check credential synchronization
  async debugCredentialSync(): Promise<{
    keychainStatus: any;
    connectionState: ConnectionState;
    isInSync: boolean;
  }> {
    await this.ensureInitialized();
    const keychainStatus = await this.checkKeychainCredentials();
    const connectionState = this.getState();
    
    const isInSync = (
      keychainStatus.hasValidCredentials === connectionState.isConfigured &&
      keychainStatus.hasAccessToken === connectionState.isConnected
    );

    return {
      keychainStatus,
      connectionState,
      isInSync
    };
  }

  // Force reload credentials from keychain (for testing and recovery)
  async forceCredentialReload(): Promise<void> {
    await this.loadPersistedState();
  }

  // Channel management
  async loadChannels(): Promise<void> {
    if (!this.state.isConnected) {
      throw new Error('Cannot load channels: not connected to Slack');
    }

    try {
      this.updateState({ 
        loading: { ...this.state.loading, channels: true } 
      });

      const slackService = new SlackService();
      const channels = await slackService.getChannels();

      this.updateState({ 
        channels,
        loading: { ...this.state.loading, channels: false } 
      });
    } catch (error) {
      console.error('Failed to load channels:', error);
      this.updateState({ 
        loading: { ...this.state.loading, channels: false },
        error: `Failed to load channels: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  async connectChannel(channelId: string): Promise<void> {
    if (!this.state.isConnected) {
      throw new Error('Cannot connect channel: not connected to Slack');
    }

    try {
      const slackService = new SlackService();
      await slackService.joinChannel(channelId);
    } catch (error) {
      console.error('Failed to connect channel:', error);
      this.updateState({ 
        error: `Failed to connect channel: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }
}

// Singleton instance
export const slackConnectionManager = new SlackConnectionManager();