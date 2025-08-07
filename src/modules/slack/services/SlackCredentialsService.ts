import { ServiceWrapper, ServiceResult } from '../../common/services/ServiceWrapper';
import { cacheService } from '../../common/services/CacheService';

import { validateSlackConfig, SlackCredentials } from '../../../utils/slackCredentials';
import {
  storeSlackCredentialsSecure,
  getSlackCredentialsSecure,
  deleteSlackCredentialsSecure,
  updateSlackAccessTokenSecure
} from '../../../utils/slackCredentialsSecure';
import { invoke } from '../../../utils/tauri';

export class SlackCredentialsService {
  private static readonly CACHE_KEYS = {
    credentials: 'slack-credentials',
    connectionStatus: 'slack-connection-status',
  };

  /**
   * Store Slack credentials with validation and caching
   */
  static async storeCredentials(credentials: SlackCredentials): Promise<ServiceResult<void>> {
    return ServiceWrapper.executeMutation(async () => {
      console.log('Storing Slack credentials:', {
        hasToken: !!credentials.accessToken,
        team: credentials.teamName || 'Unknown'
      });

      // Validate credentials before storing
      const validationResult = validateSlackConfig(credentials);
      if (!validationResult.isValid) {
        throw new Error(`Invalid credentials: ${validationResult.errors.join(', ')}`);
      }

      // Store using the simplified system
      await storeSlackCredentialsSecure(credentials.client_id, credentials.client_secret);

      // Clear connection status cache to force re-check
      cacheService.delete(SlackCredentialsService.CACHE_KEYS.connectionStatus);

      console.log('Slack credentials stored successfully');
    });
  }

  /**
   * Get stored Slack credentials with caching
   */
  static async getCredentials(): Promise<ServiceResult<SlackCredentials | null>> {
    return ServiceWrapper.execute(
      SlackCredentialsService.CACHE_KEYS.credentials,
      async () => {
      // Try cache first
      const cached = cacheService.get<SlackCredentials>(SlackCredentialsService.CACHE_KEYS.credentials);
      if (cached) {
        console.log('Using cached Slack credentials');
        return cached;
      }

      // Get from storage
      const credentials = await getSlackCredentialsSecure();
      
      if (credentials) {
        // Cache for 5 minutes
        cacheService.set(SlackCredentialsService.CACHE_KEYS.credentials, credentials, 5 * 60 * 1000);
        console.log('Retrieved Slack credentials from storage:', { team: credentials.teamName });
      } else {
        console.log('No Slack credentials found');
      }

      return credentials;
    });
  }

  /**
   * Delete stored Slack credentials
   */
  static async deleteCredentials(): Promise<ServiceResult<void>> {
    return ServiceWrapper.executeMutation(async () => {
      console.log('Deleting Slack credentials');

      // Delete from storage
      await deleteSlackCredentialsSecure();

      // Clear all related caches
      cacheService.delete(SlackCredentialsService.CACHE_KEYS.credentials);
      cacheService.delete(SlackCredentialsService.CACHE_KEYS.connectionStatus);

      console.log('Slack credentials deleted successfully');
    });
  }

  /**
   * Force reconnection by clearing credentials cache
   */
  static forceReconnection(): void {
    console.log('Forcing Slack reconnection - clearing credential cache');
    cacheService.delete(SlackCredentialsService.CACHE_KEYS.credentials);
    cacheService.delete(SlackCredentialsService.CACHE_KEYS.connectionStatus);
  }

  /**
   * Update access token for existing credentials
   */
  static async updateAccessToken(newToken: string): Promise<ServiceResult<void>> {
    return ServiceWrapper.executeMutation(async () => {
      console.log('Updating Slack access token');

      // Update using simplified system
      await updateSlackAccessTokenSecure(newToken.access_token, newToken.team_id, newToken.team_name);

      // Clear caches to force refresh
      cacheService.delete(SlackCredentialsService.CACHE_KEYS.credentials);
      cacheService.delete(SlackCredentialsService.CACHE_KEYS.connectionStatus);

      console.log('Slack access token updated successfully');
    });
  }

  /**
   * Get active token for API calls
   */
  static async getActiveToken(): Promise<ServiceResult<string | null>> {
    return ServiceWrapper.execute(
      'slack-active-token',
      async () => {
      const credentials = await getSlackCredentialsSecure();
      const token = credentials?.access_token;
      console.log(token ? 'Retrieved active Slack token' : 'No active Slack token found');
      return token;
    });
  }

  /**
   * Test connection with current credentials
   */
  static async testConnection(): Promise<ServiceResult<boolean>> {
    return ServiceWrapper.execute(
      SlackCredentialsService.CACHE_KEYS.connectionStatus,
      async () => {
      console.log('Testing Slack connection');

      // Check cached connection status first
      const cachedStatus = cacheService.get<boolean>(SlackCredentialsService.CACHE_KEYS.connectionStatus);
      if (cachedStatus !== null) {
        console.log(`Using cached connection status: ${cachedStatus}`);
        return cachedStatus;
      }

      const credentials = await getSlackCredentialsSecure();
      const token = credentials?.access_token;
      if (!token) {
        console.log('No token available for connection test');
        return false;
      }

      try {
        // Add explicit timeout wrapper for the invoke call
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection test timeout')), 8000);
        });
        
        const userInfoPromise = invoke<any>('get_slack_user_info', { token });
        const result = await Promise.race([userInfoPromise, timeoutPromise]);
        const isConnected = !!(result && result.ok);
        
        // Cache result for 2 minutes
        cacheService.set(SlackCredentialsService.CACHE_KEYS.connectionStatus, isConnected, 2 * 60 * 1000);
        
        console.log(`Connection test result: ${isConnected}`);
        return isConnected;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Connection test failed:', errorMessage);
        console.error('Slack connection test error:', errorMessage);
        cacheService.set(SlackCredentialsService.CACHE_KEYS.connectionStatus, false, 30 * 1000); // Cache failure for 30s
        return false;
      }
    });
  }

  /**
   * Check connection status with team info
   */
  static async checkConnectionStatus(): Promise<ServiceResult<{ connected: boolean; teamInfo?: any }>> {
    return ServiceWrapper.execute(
      'slack-connection-status-check',
      async () => {

      const credentials = await getSlackCredentialsSecure();
      const token = credentials?.access_token;
      if (!token) {
        console.log('⚠️ No access token available - OAuth required');
        return { connected: false };
      }

      if (!credentials?.client_id || !credentials?.client_secret) {
        console.log('⚠️ Missing client credentials - configuration required');
        return { connected: false };
      }

      try {
        // Add explicit timeout wrapper for the invoke call
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection check timeout')), 60000);
        });
        
        const teamInfoPromise = invoke<any>('get_slack_team_info', { token });
        const teamInfo = await Promise.race([teamInfoPromise, timeoutPromise]);
        
        if (teamInfo && teamInfo.ok) {
          console.log('Connection active:', { team: teamInfo.team?.name });
          return { 
            connected: true, 
            teamInfo: teamInfo.team 
          };
        } else {
          console.log('Connection inactive:', { error: teamInfo?.error });
          return { connected: false };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Connection check failed:', errorMessage);
        console.error('Slack connection check error:', errorMessage);
        return { connected: false };
      }
    });
  }

  /**
   * Validate current configuration
   */
  static async validateConfig(): Promise<ServiceResult<{ isValid: boolean; errors: string[] }>> {
    return ServiceWrapper.execute(
      'slack-config-validation',
      async () => {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials) {
        return {
          isValid: false,
          errors: ['No credentials found']
        };
      }

      return validateSlackConfig(credentials);
    });
  }

  /**
   * Clear all credential-related caches
   */
  static clearCache(): void {
    console.log('Clearing Slack credentials cache');
    cacheService.delete(SlackCredentialsService.CACHE_KEYS.credentials);
    cacheService.delete(SlackCredentialsService.CACHE_KEYS.connectionStatus);
  }
}