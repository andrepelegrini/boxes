import { useState, useMemo } from 'react';
import { slackService } from '../services/SlackService';
import { SlackChannelConnection } from '../services/SlackChannelConnection';

export interface SlackIntegrationState {
  connectionStatus: {
    isConnected: boolean;
    hasCredentials: boolean;
    hasAccessToken: boolean;
    teamName?: string;
    teamId?: string;
    lastChecked?: Date;
  };
  channels: Array<{
    id: string;
    name: string;
    isPrivate?: boolean;
    isMember?: boolean;
  }>;
  loading: {
    credentials: boolean;
    oauth: boolean;
    channels: boolean;
    connection: boolean;
  };
  oauth: {
    isInProgress: boolean;
  };
  error: string | null;
  projectSyncData?: Record<string, any>;
  credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    teamId?: string;
    teamName?: string;
  };
}

export interface SlackIntegrationActions {
  // Configuration
  configureApp: (clientId: string, clientSecret: string) => Promise<void>;
  
  // OAuth flow
  initiateOAuth: () => Promise<void>;
  processOAuthCode: (code: string) => Promise<void>;
  startOAuth: (clientId: string) => Promise<void>;
  
  // Connection management
  testConnection: () => Promise<string>;
  disconnect: () => Promise<void>;
  checkConnectionStatus: () => Promise<void>;
  
  // Credentials management
  loadCredentials: () => Promise<void>;
  storeCredentials: (credentials: any) => Promise<void>;
  deleteCredentials: () => Promise<void>;
  
  // Channel management
  loadChannels: () => Promise<void>;
  
  // Project sync management
  connectProjectToChannel: (projectId: string, channelId: string, options?: { syncIntervalMinutes?: number }) => Promise<void>;
  disconnectProjectFromChannel: (projectId: string, channelId: string) => Promise<void>;
  refreshSyncStatus: (projectId: string) => Promise<void>;
  
  // Utility
  refreshStatus: () => Promise<void>;
}

/**
 * Simplified Slack integration hook focused on UI needs
 * 
 * Note: This hook does NOT set up OAuth listeners to prevent duplication.
 * OAuth listeners are handled in the main useSlackIntegration hook.
 * Use this hook for UI components that need connection status and basic operations.
 */
export function useSlackIntegrationSimple() {
  const [state, setState] = useState<SlackIntegrationState>({
    connectionStatus: {
      isConnected: false,
      hasCredentials: false,
      hasAccessToken: false,
    },
    channels: [],
    loading: {
      credentials: false,
      oauth: false,
      channels: false,
      connection: false,
    },
    oauth: {
      isInProgress: false,
    },
    error: null,
    projectSyncData: {},
    credentials: {},
  });

  // Helper to update loading state
  const setLoading = useMemo(() => (key: keyof SlackIntegrationState['loading'], value: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: value },
      oauth: { ...prev.oauth, isInProgress: key === 'oauth' ? value : prev.oauth.isInProgress },
      error: value ? null : prev.error, // Clear error when starting new operation
    }));
  }, []);

  // Helper to set error
  const setError = useMemo(() => (error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      loading: {
        credentials: false,
        oauth: false,
        channels: false,
        connection: false,
      },
      oauth: {
        isInProgress: false,
      },
    }));
  }, []);

  // Check connection status
  const refreshStatus = useMemo(() => async () => {
    console.log('🔄 [useSlackIntegrationSimple] Starting refresh status check...');
    setLoading('connection', true);
    try {
      // First check if we have any credentials at all
      const credentialsResult = await slackService.getCredentials();
      
      if (!credentialsResult.success || !credentialsResult.data) {
        // No credentials found at all
        setState(prev => ({
          ...prev,
          connectionStatus: {
            isConnected: false,
            hasCredentials: false,
            hasAccessToken: false,
          },
          error: null, // Don't show error for missing credentials - this is normal state
        }));
        return;
      }
      
      // We have credentials, now check if we have a valid token
      const hasValidToken = !!credentialsResult.data.access_token;
      const hasCredentials = !!(credentialsResult.data.client_id && credentialsResult.data.client_secret);
      
      // Only check connection status if we have a token
      let connectionStatus = {
        isConnected: false,
        hasCredentials,
        hasAccessToken: hasValidToken,
        teamName: credentialsResult.data.team_name,
        teamId: credentialsResult.data.team_id,
      };
      
      if (hasValidToken && hasCredentials) {
        try {
          const statusResult = await slackService.checkConnectionStatus();
          if (statusResult.success && statusResult.data) {
            connectionStatus.isConnected = statusResult.data.isConnected;
            connectionStatus.teamName = statusResult.data.teamName || connectionStatus.teamName;
            console.log('✅ [useSlackIntegrationSimple] Connection status check successful:', { isConnected: statusResult.data.isConnected });
          }
        } catch (statusError) {
          console.warn('❌ [useSlackIntegrationSimple] Connection status check failed:', statusError);
          // Don't throw - we still have credentials even if connection test fails
        }
      } else if (hasCredentials && !hasValidToken) {
        console.log('⚠️ [useSlackIntegrationSimple] Valid credentials but no access token - OAuth required');
      } else {
        console.log('⚠️ [useSlackIntegrationSimple] No valid credentials found');
      }
      
      setState(prev => ({
        ...prev,
        connectionStatus,
        error: null,
      }));
      
    } catch (error) {
      console.error('Error in refreshStatus:', error);
      setError(error instanceof Error ? error.message : 'Erro ao verificar status');
    } finally {
      setLoading('connection', false);
    }
  }, [setLoading, setError]);

  // Configure app with credentials
  const configureApp = useMemo(() => async (clientId: string, clientSecret: string) => {
    setLoading('credentials', true);
    try {
      console.log('Configuring app with:', { clientId: clientId.substring(0, 10) + '...', clientSecret: 'hidden' }); // Debug log
      
      const result = await slackService.storeCredentials(clientId, clientSecret);
      if (result.success) {
        // Verify credentials were stored correctly
        const verifyResult = await slackService.getCredentials();
        console.log('Credentials stored, verification:', verifyResult.success ? 'success' : 'failed');
        
        if (verifyResult.success && verifyResult.data) {
          console.log('Stored clientId:', verifyResult.data.client_id?.substring(0, 10) + '...');
        }
        
        setState(prev => ({
          ...prev,
          connectionStatus: { ...prev.connectionStatus, hasCredentials: true },
          error: null,
        }));
      } else {
        throw new Error(result.error || 'Erro ao configurar credenciais');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao configurar app');
      throw error;
    } finally {
      setLoading('credentials', false);
    }
  }, [setLoading, setError]);

  // Start OAuth flow
  const initiateOAuth = useMemo(() => async () => {
    setLoading('oauth', true);
    try {
      const credentialsResult = await slackService.getCredentials();
      if (!credentialsResult.success || !credentialsResult.data) {
        throw new Error('Credenciais não encontradas. Configure o app primeiro.');
      }

      const credentials = credentialsResult.data;
      
      // Validate that client_id exists and is not empty
      if (!credentials.client_id || credentials.client_id.trim() === '') {
        throw new Error('Client ID não encontrado nas credenciais. Reconfigure o app.');
      }
      
      console.log('Starting OAuth with clientId:', credentials.client_id); // Debug log
      const oauthResult = await slackService.startOAuth(credentials.client_id);
      
      if (!oauthResult.success) {
        throw new Error(oauthResult.error || 'Erro ao iniciar OAuth');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro no OAuth');
      throw error;
    } finally {
      setLoading('oauth', false);
    }
  }, [setLoading, setError]);

  // Process OAuth code
  const processOAuthCode = useMemo(() => async (code: string) => {
    setLoading('oauth', true);
    try {
      const credentialsResult = await slackService.getCredentials();
      if (!credentialsResult.success || !credentialsResult.data) {
        throw new Error('Credenciais não encontradas');
      }

      const credentials = credentialsResult.data;
      
      // Extract code if it's a full URL
      let authCode = code;
      if (code.includes('code=')) {
        const urlParams = new URLSearchParams(code.split('?')[1] || code);
        authCode = urlParams.get('code') || code;
      }

      const result = await slackService.completeOAuth(authCode, credentials.client_id, credentials.client_secret);
      
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          connectionStatus: {
            isConnected: true,
            hasCredentials: true,
            hasAccessToken: true,
            teamName: result.data!.team?.name,
            teamId: result.data!.team?.id,
          },
          error: null,
        }));
      } else {
        throw new Error(result.error || 'Erro na autorização');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar código');
      throw error;
    } finally {
      setLoading('oauth', false);
    }
  }, [setLoading, setError]);

  // Test connection
  const testConnection = useMemo(() => async (): Promise<string> => {
    setLoading('connection', true);
    try {
      const result = await slackService.testConnection();
      if (result.success && result.data) {
        setError(null);
        return result.data;
      } else {
        throw new Error(result.error || 'Teste de conexão falhou');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no teste';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading('connection', false);
    }
  }, [setLoading, setError]);

  // Load channels with improved error handling
  const loadChannels = useMemo(() => async () => {
    console.log('🔄 useSlackIntegrationSimple: Starting channel load...');
    setLoading('channels', true);
    try {
      const credentialsResult = await slackService.getCredentials();
      console.log('📋 Credentials result:', { success: credentialsResult.success, hasToken: !!credentialsResult.data?.access_token });
      
      // Handle missing or invalid token more gracefully
      if (!credentialsResult.success || !credentialsResult.data?.access_token) {
        console.log('🔄 Token ausente - atualizando estado de conexão');
        
        // Update connection state to reflect missing token
        setState(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            isConnected: false,
            hasAccessToken: false,
          },
          channels: [],
          error: 'Reautenticação necessária. Clique em "Conectar" para autorizar novamente o acesso ao Slack.',
        }));
        return;
      }

      console.log('🔍 Fetching channels...');
      const channelsResult = await slackService.getChannels();
      console.log('📋 Channels result:', { success: channelsResult.success, channelCount: channelsResult.data?.length || 0, error: channelsResult.error });
      
      if (channelsResult.success && channelsResult.data) {
        setState(prev => ({
          ...prev,
          channels: channelsResult.data || [],
          error: null,
        }));
        console.log('✅ Channels loaded successfully:', channelsResult.data.length);
      } else {
        // Handle rate limiting gracefully
        if (channelsResult.error?.includes('Rate limited') || channelsResult.error?.includes('rate limited')) {
          console.log('⏱️ Channel loading rate limited, keeping existing state');
          return; // Don't update error state for rate limiting
        }
        
        // Check if it's a token-related error
        const errorMessage = channelsResult.error || 'Erro ao carregar canais';
        if (errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid_auth')) {
          setState(prev => ({
            ...prev,
            connectionStatus: {
              ...prev.connectionStatus,
              isConnected: false,
              hasAccessToken: false,
            },
            channels: [],
            error: 'Token expirado ou inválido. Reautorize o acesso ao Slack.',
          }));
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Channel loading failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar canais';
      
      // Don't set error for rate limiting
      if (errorMessage.includes('Rate limited') || errorMessage.includes('rate limited')) {
        console.log('⏱️ Rate limited error handled gracefully');
        return;
      }
      
      // Check if it's a token-related error
      if (errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid_auth')) {
        setState(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            isConnected: false,
            hasAccessToken: false,
          },
          channels: [],
          error: 'Token expirado ou inválido. Reautorize o acesso ao Slack.',
        }));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading('channels', false);
    }
  }, [setLoading, setError]);

  // Disconnect
  const disconnect = useMemo(() => async () => {
    setLoading('connection', true);
    try {
      const result = await slackService.deleteCredentials();
      if (result.success) {
        setState({
          connectionStatus: {
            isConnected: false,
            hasCredentials: false,
            hasAccessToken: false,
          },
          channels: [],
          loading: {
            credentials: false,
            oauth: false,
            channels: false,
            connection: false,
          },
          oauth: {
            isInProgress: false,
          },
          error: null,
        });
        
        // Clear cache
        slackService.clearCache();
      } else {
        throw new Error(result.error || 'Erro ao desconectar');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao desconectar');
      throw error;
    } finally {
      setLoading('connection', false);
    }
  }, [setLoading, setError]);

  // Check connection status
  const checkConnectionStatus = useMemo(() => async () => {
    await refreshStatus();
  }, [refreshStatus]);

  // Disconnect project from channel
  const disconnectProjectFromChannel = useMemo(() => async (projectId: string, channelId: string) => {
    try {
      setLoading('connection', true);
      const result = await slackService.disconnectProjectFromChannel(projectId, channelId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect channel');
      }
      // Refresh the status to update UI
      await refreshStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao desconectar canal');
      throw error;
    } finally {
      setLoading('connection', false);
    }
  }, [slackService, refreshStatus, setLoading, setError]);

  // Refresh sync status for a project
  const refreshSyncStatus = useMemo(() => async (projectId: string) => {
    try {
      setLoading('connection', true);
      const result = await slackService.getSyncDataForProject(projectId);
      if (result.success && result.data) {
        // Update the project sync data in state
        setState(prev => ({
          ...prev,
          projectSyncData: {
            ...prev.projectSyncData,
            [projectId]: result.data
          }
        }));
      }
    } catch (error) {
      console.error('❌ [useSlackIntegrationSimple] Error refreshing sync status:', error);
      // Don't throw - this is not critical
    }
    finally {
      setLoading('connection', false);
    }
  }, [setLoading]);

  // Load credentials
  const loadCredentials = useMemo(() => async () => {
    setLoading('credentials', true);
    try {
      const result = await slackService.getCredentials();
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          credentials: {
            clientId: result.data.client_id,
            clientSecret: result.data.client_secret,
            accessToken: result.data.access_token,
            teamId: result.data.team_id,
            teamName: result.data.team_name,
          },
          connectionStatus: {
            ...prev.connectionStatus,
            hasCredentials: !!(result.data.client_id && result.data.client_secret),
            hasAccessToken: !!result.data.access_token,
            teamId: result.data.team_id,
            teamName: result.data.team_name,
          }
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading credentials');
    } finally {
      setLoading('credentials', false);
    }
  }, [setLoading, setError]);

  // Store credentials
  const storeCredentials = useMemo(() => async (credentials: any) => {
    setLoading('credentials', true);
    try {
      const result = await slackService.storeCredentials(credentials);
      if (result.success) {
        await loadCredentials(); // Reload to update state
      } else {
        throw new Error(result.error || 'Failed to store credentials');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error storing credentials');
      throw error;
    }
    finally {
      setLoading('credentials', false);
    }
  }, [setLoading, setError, loadCredentials]);

  // Delete credentials
  const deleteCredentials = useMemo(() => async () => {
    return disconnect();
  }, [disconnect]);

  // Start OAuth
  const startOAuth = useMemo(() => async (clientId: string) => {
    setLoading('oauth', true);
    try {
      const result = await slackService.startOAuth(clientId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start OAuth');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'OAuth start failed');
      throw error;
    }
    finally {
      setLoading('oauth', false);
    }
  }, [setLoading, setError]);

  // Connect project to channel
  const connectProjectToChannel = useMemo(() => async (projectId: string, channelId: string, options?: { syncIntervalMinutes?: number }, channelName?: string) => {
    console.log('🔄 [useSlackIntegrationSimple] Starting connectProjectToChannel (NEW SIMPLE)', {
      projectId,
      channelId,
      channelName,
      timestamp: new Date().toISOString()
    });
    
    setLoading('connection', true);
    try {
      // Use provided channel name, or try to find it, or fallback to channelId
      const finalChannelName = channelName || state.channels.find(ch => ch.id === channelId)?.name || channelId;
      
      console.log('📞 [useSlackIntegrationSimple] Calling SlackChannelConnection.connectToChannel...');
      const result = await SlackChannelConnection.connectToChannel(projectId, channelId, finalChannelName, {
        verifyAccess: true, // Just verify we can access the channel
        syncIntervalMinutes: options?.syncIntervalMinutes || 15
      });
      
      console.log('📋 [useSlackIntegrationSimple] Connection result:', {
        success: result.success,
        connectionId: result.connectionId,
        error: result.error,
        timestamp: new Date().toISOString()
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect project to channel');
      }
      
      console.log('✅ [useSlackIntegrationSimple] Connection successful! Analysis will run in background...');
      
      // Add a longer delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔄 [useSlackIntegrationSimple] Refreshing sync status and connection state...');
      
      // First refresh sync status for the project
      await refreshSyncStatus(projectId);
      console.log('✅ [useSlackIntegrationSimple] Sync status refreshed');
      
      // Then refresh overall connection status to update UI
      await refreshStatus();
      console.log('✅ [useSlackIntegrationSimple] Connection status refreshed');
      
      console.log('✅ [useSlackIntegrationSimple] All status refreshed successfully');
    } catch (error) {
      console.error('❌ [useSlackIntegrationSimple] Connection failed:', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
        timestamp: new Date().toISOString()
      });
      
      setError(error instanceof Error ? error.message : 'Connection failed');
      throw error;
    }
    finally {
      console.log('🏁 [useSlackIntegrationSimple] Connection attempt finished');
      setLoading('connection', false);
    }
  }, [setLoading, setError, refreshSyncStatus, refreshStatus, state.channels]);

  // Actions object
  const actions: SlackIntegrationActions = useMemo(() => ({
    configureApp,
    initiateOAuth,
    processOAuthCode,
    startOAuth,
    testConnection,
    disconnect,
    checkConnectionStatus,
    loadCredentials,
    storeCredentials,
    deleteCredentials,
    loadChannels,
    connectProjectToChannel,
    disconnectProjectFromChannel,
    refreshSyncStatus,
    refreshStatus,
  }), [
    configureApp,
    initiateOAuth,
    processOAuthCode,
    startOAuth,
    testConnection,
    disconnect,
    checkConnectionStatus,
    loadCredentials,
    storeCredentials,
    deleteCredentials,
    loadChannels,
    connectProjectToChannel,
    disconnectProjectFromChannel,
    refreshSyncStatus,
    refreshStatus,
  ]);

  // Auto-load status and project sync data on mount - REMOVED TO PREVENT DUPLICATES
  // Status checking is now handled centrally by SlackConnectionManager
  // Components should subscribe to the manager's state updates instead

  // Computed values
  const isConfigured = state.connectionStatus.hasCredentials;
  const isConnected = state.connectionStatus.isConnected;
  const hasError = !!state.error;
  const isLoading = Object.values(state.loading).some(loading => loading);

  return {
    state,
    actions,
    isConfigured,
    isConnected,
    hasError,
    isLoading,
  };
}