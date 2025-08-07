/**
 * Simple Slack channel connection service
 * Connection = verify access + save relationship. That's it.
 */

import { SlackChannelService } from './SlackChannelService';
import { SlackSyncService } from './SlackSyncService';
import { invoke } from '../../../utils/tauri';

export interface ChannelConnectionResult {
  success: boolean;
  connectionId?: string;
  error?: string;
  details?: string;
}

export interface ChannelConnectionOptions {
  verifyAccess?: boolean;
  syncIntervalMinutes?: number;
}

export class SlackChannelConnection {
  /**
   * Connect a project to a Slack channel (simplified)
   */
  static async connectToChannel(
    projectId: string, 
    channelId: string, 
    channelName: string,
    options: ChannelConnectionOptions = {}
  ): Promise<ChannelConnectionResult> {
    try {
      console.log(`🔗 Connecting project ${projectId} to channel ${channelName} (${channelId})`);
      
      // Step 1: Verify access if requested
      if (options.verifyAccess !== false) {
        const hasAccess = await SlackChannelService.testChannelAccess(channelId);
        if (!hasAccess) {
          return {
            success: false,
            error: 'No access to this channel'
          };
        }
      }
      
      // Step 2: Save the connection
      const connectionId = await this.saveConnection(projectId, channelId, channelName, options.syncIntervalMinutes);
      
      // Step 3: Start basic sync (simplified)
      this.startBasicSync(projectId, channelId);
      
      return {
        success: true,
        connectionId,
        details: `Connected to ${channelName}`
      };
      
    } catch (error) {
      console.error('Failed to connect to channel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Disconnect from a channel
   */
  static async disconnectFromChannel(
    projectId: string, 
    channelId: string
  ): Promise<ChannelConnectionResult> {
    try {
      await this.removeConnection(projectId, channelId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disconnect failed'
      };
    }
  }

  /**
   * Save connection to database (simplified)
   */
  private static async saveConnection(
    projectId: string, 
    channelId: string, 
    channelName: string,
    syncIntervalMinutes: number = 15
  ): Promise<string> {
    const connectionId = `${projectId}-${channelId}`;
    
    // First validate with backend
    await invoke('create_slack_sync', {
      projectId,
      channelId, 
      channelName,
      metadata: {
        connectedAt: new Date().toISOString(),
        isActive: true
      }
    });
    
    // Backend only validates, so we must save to database ourselves
    const { initDatabase } = await import('../../../utils/database');
    const db = await initDatabase();
    
    await db.execute(
      'INSERT OR REPLACE INTO project_slack_connections (id, project_id, channel_id, channel_name, connected_at, is_active, sync_interval_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        connectionId,
        projectId,
        channelId,
        channelName,
        new Date().toISOString(),
        1,
        syncIntervalMinutes
      ]
    );
    
    console.log('✅ [SlackChannelConnection] Connection saved to database:', { connectionId, projectId, channelId, channelName });
    
    return connectionId;
  }

  /**
   * Remove connection from database
   */
  private static async removeConnection(projectId: string, channelId: string): Promise<void> {
    // Backend command (may not actually delete)
    await invoke('delete_slack_sync', { projectId, channelId });
    
    // Ensure removal from database
    const { initDatabase } = await import('../../../utils/database');
    const db = await initDatabase();
    
    await db.execute(
      'DELETE FROM project_slack_connections WHERE project_id = ? AND channel_id = ?',
      [projectId, channelId]
    );
    
    console.log('✅ [SlackChannelConnection] Connection removed from database:', { projectId, channelId });
  }

  /**
   * Start basic sync without complex orchestration
   */
  private static startBasicSync(projectId: string, channelId: string): void {
    // Start simple background sync
    setTimeout(async () => {
      try {
        console.log(`🔄 Starting basic sync for ${projectId}/${channelId}`);
        await SlackSyncService.syncChannelMessages(projectId, channelId);
      } catch (error) {
        console.error('Basic sync failed:', error);
      }
    }, 1000);
  }

  /**
   * Update sync frequency for a connection
   */
  static async updateSyncFrequency(
    projectId: string, 
    channelId: string, 
    syncIntervalMinutes: number
  ): Promise<ChannelConnectionResult> {
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      await db.execute(
        'UPDATE project_slack_connections SET sync_interval_minutes = ? WHERE project_id = ? AND channel_id = ?',
        [syncIntervalMinutes, projectId, channelId]
      );
      
      console.log('✅ [SlackChannelConnection] Sync frequency updated:', { projectId, channelId, syncIntervalMinutes });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sync frequency'
      };
    }
  }

  /**
   * Get all connections for a project
   */
  static async getProjectConnections(projectId: string): Promise<any[]> {
    try {
      const result = await invoke('get_slack_sync_for_project', { projectId });
      return result || [];
    } catch (error) {
      console.error('Failed to get project connections:', error);
      return [];
    }
  }

  /**
   * Disconnect realtime monitoring for a channel
   */
  static async disconnectRealtimeMonitoring(projectId: string, channelId: string): Promise<void> {
    try {
      console.log(`🔌 [SlackChannelConnection] Disconnecting realtime monitoring for ${projectId}/${channelId}`);
      // For now, this is a no-op since we're using simple sync instead of realtime monitoring
      // This method exists to prevent the "function not found" error
      console.log(`✅ [SlackChannelConnection] Realtime monitoring disconnected for ${projectId}/${channelId}`);
    } catch (error) {
      console.error('Failed to disconnect realtime monitoring:', error);
      throw error;
    }
  }
}