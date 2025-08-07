/**
 * Simplified Slack Service - Direct operations without complex architecture
 * Uses new SlackChannelConnection for simple, reliable channel connections
 */

import { ServiceResult } from '../../common/services/ServiceWrapper';
import { SlackDerivedTask } from '../../../../types';

import { invoke } from '../../../utils/tauri';

// Import new simple connection service
import { SlackChannelConnection } from './SlackChannelConnection';

// Import remaining services we still need
import { SlackChannelService, autoJoinEvents } from './SlackChannelService';
import { SlackCredentialsService } from './SlackCredentialsService';
import { SlackSyncService } from './SlackSyncService';

// Re-export the autoJoinEvents for backward compatibility
export { autoJoinEvents };

/**
 * Simplified Slack Service
 * Clean, direct operations without the complex job/event system
 */
export class SlackService {
  /**
   * CREDENTIALS MANAGEMENT
   */
  async storeCredentials(credentialsOrClientId: any, clientSecret?: string): Promise<ServiceResult<void>> {
    // Handle both parameter formats for backward compatibility
    let credentials;
    if (typeof credentialsOrClientId === 'string' && clientSecret) {
      // Called with (clientId, clientSecret)
      credentials = {
        client_id: credentialsOrClientId,
        client_secret: clientSecret
      };
    } else {
      // Called with credentials object
      credentials = credentialsOrClientId;
    }
    return SlackCredentialsService.storeCredentials(credentials);
  }

  async getCredentials(): Promise<ServiceResult<any>> {
    return SlackCredentialsService.getCredentials();
  }

  async deleteCredentials(): Promise<ServiceResult<void>> {
    return SlackCredentialsService.deleteCredentials();
  }

  forceReconnection(): void {
    // Simple implementation - just clear any cached credentials
    SlackCredentialsService.clearCache();
  }

  async updateAccessToken(newToken: string): Promise<ServiceResult<void>> {
    return SlackCredentialsService.updateAccessToken(newToken);
  }

  async getConnectionStatus(): Promise<ServiceResult<any>> {
    return SlackCredentialsService.getConnectionStatus();
  }

  async checkConnectionStatus(): Promise<ServiceResult<any>> {
    const result = await SlackCredentialsService.checkConnectionStatus();
    if (result.success && result.data) {
      // Transform the data to match what the hook expects
      return {
        success: true,
        data: {
          isConnected: result.data.connected,
          teamName: result.data.teamInfo?.name
        }
      };
    }
    return result;
  }

  /**
   * CHANNEL MANAGEMENT
   */
  async getChannels(): Promise<ServiceResult<any[]>> {
    return SlackChannelService.getChannels();
  }

  async joinChannel(channelId: string): Promise<ServiceResult<void>> {
    const result = await SlackChannelService.joinChannel(channelId);
    return { success: result };
  }

  async leaveChannel(channelId: string): Promise<ServiceResult<void>> {
    return SlackChannelService.leaveChannel(channelId);
  }

  async getChannelInfo(channelId: string): Promise<ServiceResult<any>> {
    return SlackChannelService.getChannelInfo(channelId);
  }

  /**
   * MESSAGE MANAGEMENT
   */
  async fetchChannelMessages(channelId: string, options?: any): Promise<ServiceResult<any>> {
    return SlackSyncService.fetchChannelMessages(channelId, options);
  }

  async fetchAllChannelMessages(channelId: string): Promise<ServiceResult<any[]>> {
    return SlackChannelService.fetchAllChannelMessages(channelId);
  }

  /**
   * PROJECT-CHANNEL CONNECTION (NEW SIMPLE APPROACH)
   */
  async connectProjectToChannel(
    projectId: string,
    channelId: string,
    channelName: string,
    options?: {
      enableSync?: boolean;
      autoJoin?: boolean;
      analysisSettings?: any;
    }
  ): Promise<ServiceResult<void>> {
    
    try {
      // If autoJoin is requested and channel is not a member, try to join first
      if (options?.autoJoin) {
        const channels = await this.getChannels();
        if (channels.success && channels.data) {
          const channel = channels.data.find(ch => ch.id === channelId);
          if (channel && !channel.is_member && !channel.is_private) {
            await SlackChannelService.joinChannel(channelId);
          }
        }
      }
      
      // Use new simple connection service
      const result = await SlackChannelConnection.connectToChannel(projectId, channelId, channelName, {
        verifyAccess: true
      });
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async disconnectProjectFromChannel(projectId: string, channelId: string, reason?: string): Promise<ServiceResult<void>> {
    
    try {
      // Cleanup real-time monitoring first
      await SlackChannelConnection.disconnectRealtimeMonitoring(projectId, channelId);
      
      // Direct database update to new simple table
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.execute(
        'UPDATE project_slack_connections SET is_active = 0 WHERE project_id = ? AND channel_id = ?',
        [projectId, channelId]
      );
      
      if (result.rowsAffected === 0) {
        return { success: true }; // Already disconnected or never connected
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * SYNC DATA MANAGEMENT (Updated for simple connections)
   */
  async getSyncDataForProject(projectId: string): Promise<ServiceResult<any[]>> {
    
    try {
      // Get connections from the new simple table
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const connections = await db.select<Array<{
        id: string;
        project_id: string;
        channel_id: string;
        channel_name: string;
        connected_at: string;
        is_active: number;
        sync_interval_minutes: number;
      }>>(
        'SELECT * FROM project_slack_connections WHERE project_id = ? AND is_active = 1',
        [projectId]
      );
      
      // Convert to the format expected by the UI
      const syncData = connections.map(conn => ({
        id: conn.id,
        projectId: conn.project_id,
        channelId: conn.channel_id,
        channelName: conn.channel_name,
        isEnabled: conn.is_active === 1,
        syncFrequency: `${conn.sync_interval_minutes} minutes`,
        syncIntervalMinutes: conn.sync_interval_minutes,
        connectionHealthy: true,
        lastHealthCheck: new Date().toISOString(),
        createdAt: conn.connected_at,
        updatedAt: conn.connected_at
      }));
      
      
      return { success: true, data: syncData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to get sync data: ${errorMessage}` };
    }
  }

  /**
   * Start manual sync for a specific project-channel connection
   */
  async startManualSync(projectId: string, channelId: string): Promise<ServiceResult<void>> {
    
    try {
      // Start background sync using the simple sync service
      await SlackSyncService.syncChannelMessages(projectId, channelId);
      
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to start manual sync: ${errorMessage}` };
    }
  }

  /**
   * Update sync frequency for a connection
   */
  async updateSyncFrequency(projectId: string, channelId: string, syncIntervalMinutes: number): Promise<ServiceResult<void>> {
    
    try {
      const result = await SlackChannelConnection.updateSyncFrequency(projectId, channelId, syncIntervalMinutes);
      
      if (result.success) {
        return { success: true, data: undefined };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to update sync frequency: ${errorMessage}` };
    }
  }

  async createSyncMetadata(syncData: any): Promise<ServiceResult<any>> {
    return SlackSyncService.createSyncMetadata(syncData.projectId, syncData.channelId, syncData.channelName);
  }

  async updateSyncMetadata(syncData: any): Promise<ServiceResult<any>> {
    await SlackSyncService.updateSyncMetadata(syncData.projectId, syncData.channelId, syncData.updates || syncData);
    return { success: true };
  }

  async deleteSyncMetadata(syncData: any): Promise<ServiceResult<void>> {
    await SlackSyncService.deleteSyncMetadata(syncData.projectId, syncData.channelId);
    return { success: true };
  }

  /**
   * DERIVED TASK MANAGEMENT
   */
  async getDerivedTasks(projectId: string): Promise<ServiceResult<SlackDerivedTask[]>> {
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const tasks = await db.select<Array<{
        id: string;
        projectId: string;
        channelId: string;
        messageId: string;
        title: string;
        description: string;
        priority: string;
        assignedTo: string;
        dueDate: string;
        status: string;
        confidence: number;
        sourceContext: string;
        createdAt: string;
        updatedAt: string;
      }>>(
        'SELECT * FROM slack_derived_tasks WHERE projectId = ? ORDER BY createdAt DESC',
        [projectId]
      );
      
      // Convert to SlackDerivedTask format
      const derivedTasks: SlackDerivedTask[] = tasks.map(task => ({
        id: task.id,
        projectId: task.projectId,
        slackChannelId: task.channelId,
        sourceMessageTs: task.messageId,
        sourceMessageText: task.sourceContext ? JSON.parse(task.sourceContext).messageText || '' : '',
        suggestedTaskName: task.title,
        suggestedDescription: task.description || '',
        suggestedAssignee: task.assignedTo,
        confidenceScore: task.confidence,
        status: task.status as 'suggested' | 'accepted' | 'rejected' | 'created',
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
      
      
      return { success: true, data: derivedTasks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to get derived tasks: ${errorMessage}` };
    }
  }

  async acceptDerivedTask(taskId: string): Promise<ServiceResult<string>> {
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.execute(
        'UPDATE slack_derived_tasks SET status = ?, updatedAt = ? WHERE id = ?',
        ['accepted', new Date().toISOString(), taskId]
      );
      
      if (result.rowsAffected === 0) {
        return { success: false, error: 'Task not found' };
      }
      
      return { success: true, data: taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to accept task: ${errorMessage}` };
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ServiceResult<void>> {
    
    try {
      // Validate status
      const validStatuses = ['suggested', 'accepted', 'rejected', 'completed'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: `Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}` };
      }
      
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.execute(
        'UPDATE slack_derived_tasks SET status = ?, updatedAt = ? WHERE id = ?',
        [status, new Date().toISOString(), taskId]
      );
      
      if (result.rowsAffected === 0) {
        return { success: false, error: 'Task not found' };
      }
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to update task status: ${errorMessage}` };
    }
  }

  /**
   * LEGACY ANALYSIS METHODS (SIMPLIFIED)
   */
  async analyzeMessagesForTasks(projectId: string, channelId: string): Promise<ServiceResult<any[]>> {
    
    try {
      // Fetch messages
      const messagesResult = await this.fetchAllChannelMessages(channelId);
      if (!messagesResult.success || !messagesResult.data) {
        return { success: false, error: 'Failed to fetch messages for analysis' };
      }

      // For now, return empty tasks - analysis can be added later if needed
      
      return { success: true, data: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Analysis failed: ${errorMessage}` };
    }
  }

  /**
   * UTILITY METHODS
   */
  clearCache(): void {
    SlackCredentialsService.clearCache();
    SlackChannelService.clearCache();
    SlackSyncService.clearCache();
  }

  // Legacy compatibility - simplified OAuth implementations
  async startOAuth(clientId: string): Promise<ServiceResult<string>> {
    try {
      // Simple OAuth URL generation
      const redirectUri = encodeURIComponent('http://localhost:8443/auth/slack/callback');
      const scopes = encodeURIComponent('channels:read,channels:history,chat:write,users:read');
      const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
      
      // Use Tauri shell API to open OAuth URL in browser (more reliable than window.open)
      try {
        // Import shell API dynamically to avoid issues in non-Tauri environments
        const { shell } = await import('@tauri-apps/api');
        await shell.open(oauthUrl);
      } catch (tauriError) {
        // Fallback to window.open if Tauri API fails
        if (typeof window !== 'undefined') {
          window.open(oauthUrl, '_blank');
        }
      }
      
      return { success: true, data: oauthUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async completeOAuth(code: string, clientId?: string, clientSecret?: string): Promise<ServiceResult<any>> {
    try {
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and secret are required for OAuth completion');
      }
      
      // Exchange code for token using Tauri backend
      const result = await invoke('exchange_oauth_code', {
        code,
        clientId,
        clientSecret,
        redirectUri: 'http://localhost:8443/auth/slack/callback'
      });
      
      if (result) {
        // Store the credentials
        await this.storeCredentials({
          client_id: clientId,
          client_secret: clientSecret,
          access_token: result.access_token,
          team_id: result.team?.id,
          team_name: result.team?.name
        });
        
        return { success: true, data: result };
      } else {
        throw new Error('Failed to exchange OAuth code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async testConnection(): Promise<ServiceResult<string>> {
    const result = await SlackCredentialsService.testConnection();
    if (result.success) {
      return {
        success: true,
        data: result.data ? 'Connection successful' : 'Connection failed'
      };
    }
    return result as ServiceResult<string>;
  }

  /**
   * Force re-analysis of messages for a channel (ignores timestamp filtering)
   */
  async forceReanalysis(projectId: string, channelId: string): Promise<ServiceResult<void>> {
    
    try {
      // Reset the last_analysis_at timestamp to force re-analysis of all messages
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      await db.execute(
        'UPDATE project_slack_connections SET last_analysis_at = NULL WHERE project_id = ? AND channel_id = ?',
        [projectId, channelId]
      );
      
      
      // Trigger a sync which will now reprocess all messages
      const syncResult = await this.startManualSync(projectId, channelId);
      
      if (syncResult.success) {
        return { success: true };
      } else {
        return { success: false, error: `Force re-analysis failed: ${syncResult.error}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Force re-analysis failed: ${errorMessage}` };
    }
  }
}

// Export singleton instance for backward compatibility
export const slackService = new SlackService();