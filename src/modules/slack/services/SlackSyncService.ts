// Simple Slack Sync Service - Direct implementation without complex wrappers

import { SlackSyncMetadata } from '../../../../types';
import { getSlackCredentialsSecure } from '../../../utils/slackCredentialsSecure';
import { invoke } from '../../../utils/tauri';

export class SlackSyncService {
  // Circuit breaker for rate limiting
  private static rateLimitedChannels = new Set<string>();
  private static rateLimitResetTimes = new Map<string, number>();
  /**
   * Create sync metadata for project-channel connection
   */
  static async createSyncMetadata(
    projectId: string,
    channelId: string, 
    channelName: string
  ): Promise<any> {
    try {
      const metadata = {
        id: `${projectId}-${channelId}`,
        projectId,
        channelId,
        channelName,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastSyncAt: null
      };

      await invoke('create_slack_sync', metadata);
      return metadata;
    } catch (error) {
      console.error('Failed to create sync metadata:', error);
      throw error;
    }
  }

  /**
   * Update sync metadata
   */
  static async updateSyncMetadata(
    projectId: string,
    channelId: string,
    updates: Partial<SlackSyncMetadata>
  ): Promise<void> {
    try {
      // First get existing sync record to update
      const syncs = await this.getSyncMetadata(projectId);
      const existingSync = syncs.find(s => s.channel_id === channelId);
      
      if (!existingSync) {
        throw new Error(`No sync record found for project ${projectId} and channel ${channelId}`);
      }

      // Create updated sync object with all required fields (camelCase for backend)
      const sync = {
        id: existingSync.id,
        projectId: projectId,
        channelId: channelId,
        channelName: existingSync.channel_name || '',
        lastSyncTimestamp: existingSync.last_sync_timestamp || null,
        lastMessageTimestamp: existingSync.last_message_timestamp || null,
        isActive: existingSync.is_active || true,
        syncIntervalMinutes: existingSync.sync_interval_minutes || null,
        syncStatus: existingSync.sync_status || null,
        lastSyncAt: updates.lastSyncAt || existingSync.last_sync_at || null,
        teamId: existingSync.team_id || null,
        createdAt: existingSync.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await invoke('update_slack_sync', { sync });
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
      throw error;
    }
  }

  /**
   * Delete sync metadata
   */
  static async deleteSyncMetadata(projectId: string, channelId: string): Promise<void> {
    try {
      await invoke('delete_slack_sync', { projectId, channelId });
    } catch (error) {
      console.error('Failed to delete sync metadata:', error);
      throw error;
    }
  }

  /**
   * Get sync metadata for project
   */
  static async getSyncMetadata(projectId: string): Promise<any[]> {
    try {
      // Since backend returns empty results, query the database directly
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const syncs = await db.select(
        `SELECT * FROM project_slack_connections WHERE project_id = ? AND is_active = 1`,
        [projectId]
      );
      
      // Convert to the expected format
      return syncs.map((sync: any) => ({
        id: sync.id,
        project_id: sync.project_id,
        channel_id: sync.channel_id,
        channel_name: sync.channel_name,
        is_active: !!sync.is_active,
        created_at: sync.connected_at,
        last_sync_at: null
      }));
    } catch (error) {
      console.error('Failed to get sync metadata:', error);
      return [];
    }
  }

  /**
   * Estimate sync time (simplified)
   */
  static async estimateSyncTime(): Promise<{ estimatedMinutes: number }> {
    return { estimatedMinutes: 2 }; // Simple estimate
  }

  /**
   * Fetch channel messages (simple) with circuit breaker
   */
  static async fetchChannelMessages(
    channelId: string, 
    limit: number = 100
  ): Promise<any[]> {
    // Check circuit breaker
    const now = Date.now();
    const resetTime = this.rateLimitResetTimes.get(channelId);
    
    if (this.rateLimitedChannels.has(channelId) && resetTime && now < resetTime) {
      const waitTime = Math.ceil((resetTime - now) / 1000);
      console.warn(`⚡ [CIRCUIT_BREAKER] Channel ${channelId} is rate limited, skipping for ${waitTime}s`);
      return [];
    }

    // Reset circuit breaker if time has passed
    if (resetTime && now >= resetTime) {
      this.rateLimitedChannels.delete(channelId);
      this.rateLimitResetTimes.delete(channelId);
      console.log(`✅ [CIRCUIT_BREAKER] Channel ${channelId} rate limit reset`);
    }

    try {
      console.log(`📡 [FETCH_DEBUG] fetchChannelMessages called:`, {
        channelId,
        limit
      });
      
      const credentials = await getSlackCredentialsSecure();
      if (!credentials?.access_token) {
        throw new Error('No Slack access token found');
      }

      console.log(`🚀 [FETCH_DEBUG] Calling slack_fetch_messages Tauri command...`);
      const result = await invoke('slack_fetch_messages', { 
        accessToken: credentials.access_token,
        channelId: channelId, 
        limit 
      });
      
      console.log(`📦 [FETCH_DEBUG] Tauri command result:`, {
        hasResult: !!result,
        isArray: Array.isArray(result),
        messageCount: Array.isArray(result) ? result.length : 0,
        resultType: typeof result
      });
      
      // The slack_fetch_messages command returns the messages array directly
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to fetch channel messages:', error);
      console.error(`🔴 [FETCH_DEBUG] Fetch error:`, error);
      
      // Handle rate limiting with circuit breaker
      if (error instanceof Error && error.message.includes('Rate limited')) {
        const backoffTime = 5 * 60 * 1000; // 5 minutes backoff
        this.rateLimitedChannels.add(channelId);
        this.rateLimitResetTimes.set(channelId, now + backoffTime);
        console.warn(`🚫 [CIRCUIT_BREAKER] Channel ${channelId} rate limited, backing off for 5 minutes`);
      }
      
      return [];
    }
  }

  /**
   * Fetch all messages with pagination (simple)
   */
  static async fetchAllChannelMessages(channelId: string): Promise<any[]> {
    try {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials?.access_token) {
        throw new Error('No Slack access token found');
      }

      const result = await invoke('slack_fetch_messages_paginated', { 
        accessToken: credentials.access_token,
        channelId: channelId 
      });
      return result.messages || [];
    } catch (error) {
      console.error('Failed to fetch all channel messages:', error);
      return [];
    }
  }

  /**
   * Get last processed timestamp for a channel
   */
  static async getLastProcessedTimestamp(projectId: string, channelId: string): Promise<string | null> {
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.select(
        `SELECT last_analysis_at FROM project_slack_connections 
         WHERE project_id = ? AND channel_id = ? AND is_active = 1`,
        [projectId, channelId]
      );
      
      return result.length > 0 ? result[0].last_analysis_at : null;
    } catch (error) {
      console.error('Failed to get last processed timestamp:', error);
      return null;
    }
  }

  /**
   * Update last processed timestamp for a channel
   */
  static async updateLastProcessedTimestamp(
    projectId: string, 
    channelId: string, 
    timestamp: string
  ): Promise<void> {
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      await db.execute(
        `UPDATE project_slack_connections 
         SET last_analysis_at = ?
         WHERE project_id = ? AND channel_id = ?`,
        [timestamp, projectId, channelId]
      );
      
      console.log(`Updated last processed timestamp for ${projectId}/${channelId}: ${timestamp}`);
    } catch (error) {
      console.error('Failed to update last processed timestamp:', error);
    }
  }

  /**
   * Sync channel messages to database (simplified)
   */
  static async syncChannelMessages(
    projectId: string,
    channelId: string
  ): Promise<{ messagesSynced: number }> {
    try {
      console.log(`🔄 Starting sync for project ${projectId}, channel ${channelId}`);
      console.log(`📊 [SYNC_DEBUG] syncChannelMessages called with:`, {
        projectId,
        channelId
      });
      
      // Get last processed timestamp for incremental processing
      const lastProcessedTimestamp = await this.getLastProcessedTimestamp(projectId, channelId);
      console.log(`⏰ [SYNC_DEBUG] Last processed timestamp: ${lastProcessedTimestamp}`);
      
      // Fetch messages
      console.log(`📡 [SYNC_DEBUG] Fetching messages from channel...`);
      const messages = await this.fetchChannelMessages(channelId, 100);
      console.log(`📦 [SYNC_DEBUG] Fetched ${messages.length} messages`);
      
      // Store messages to database
      if (messages.length > 0) {
        console.log(`💾 [SYNC_DEBUG] Storing ${messages.length} messages to database...`);
        const { initDatabase } = await import('../../../utils/database');
        const db = await initDatabase();
        
        for (const msg of messages) {
          try {
            await db.execute(
              `INSERT OR REPLACE INTO slack_messages (
                id, messageId, channelId, text, user, username, timestamp,
                threadTs, reactions, files, edited, deleted, messageType, subtype
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                `${channelId}-${msg.ts}`,
                msg.ts,
                channelId,
                msg.text || '',
                msg.user || '',
                msg.username || msg.user_profile?.display_name || '',
                msg.ts,
                msg.thread_ts || null,
                msg.reactions ? JSON.stringify(msg.reactions) : null,
                msg.files ? JSON.stringify(msg.files) : null,
                msg.edited?.ts || null,
                msg.deleted || null,
                msg.type || 'message',
                msg.subtype || null
              ]
            );
          } catch (error) {
            console.error(`Failed to store message ${msg.ts}:`, error);
          }
        }
        console.log(`✅ Stored ${messages.length} messages to database`);
        
        // Trigger AI analysis after successful message sync
        console.log(`🤖 [SYNC_DEBUG] Triggering AI analysis...`);
        let analysisSucceeded = false;
        try {
          await this.triggerAIAnalysis(projectId, channelId, messages, lastProcessedTimestamp);
          analysisSucceeded = true;
          console.log(`✅ [SYNC_DEBUG] AI analysis completed successfully`);
        } catch (error) {
          console.error('❌ [SYNC_DEBUG] AI analysis failed:', error);
          analysisSucceeded = false;
        }
        
        // Only update last processed timestamp if AI analysis succeeded
        if (analysisSucceeded && messages.length > 0) {
          const latestMessage = messages.reduce((latest, msg) => 
            parseFloat(msg.ts) > parseFloat(latest.ts) ? msg : latest
          );
          await this.updateLastProcessedTimestamp(projectId, channelId, latestMessage.ts);
          console.log(`📝 [SYNC_DEBUG] Updated last processed timestamp to: ${latestMessage.ts}`);
        } else if (!analysisSucceeded) {
          console.log(`⚠️ [SYNC_DEBUG] Keeping previous timestamp due to analysis failure - messages will be retried next sync`);
        }
      } else {
        console.log(`⚠️ [SYNC_DEBUG] No messages to sync or analyze`);
      }
      
      // Update sync metadata
      await this.updateSyncMetadata(projectId, channelId, {
        lastSyncAt: new Date().toISOString()
      });

      console.log(`🏁 [SYNC_DEBUG] Sync completed: ${messages.length} messages`);
      return { messagesSynced: messages.length };
    } catch (error) {
      console.error('Failed to sync channel messages:', error);
      console.error(`🔴 [SYNC_DEBUG] Sync error:`, error);
      throw error;
    }
  }

  /**
   * Trigger initial sync (simplified)
   */
  static async triggerInitialSync(projectId: string, channelId: string): Promise<void> {
    try {
      const result = await this.syncChannelMessages(projectId, channelId);
      console.log(`✅ Initial sync completed: ${result.messagesSynced} messages`);
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  /**
   * Trigger AI analysis for synced messages
   */
  static async triggerAIAnalysis(
    projectId: string,
    channelId: string,
    messages: any[],
    lastProcessedTimestamp?: string | null
  ): Promise<void> {
    try {
      console.log(`🤖 Starting AI analysis for ${messages.length} messages in ${projectId}/${channelId}`);
      console.log(`📊 [SYNC_AI_DEBUG] triggerAIAnalysis called:`, {
        projectId,
        channelId,
        totalMessages: messages.length,
        lastProcessedTimestamp,
        firstMessage: messages[0]?.text?.substring(0, 100)
      });
      
      // Import AI analysis service
      const { SlackAIAnalysisServiceV2 } = await import('./SlackAIAnalysisServiceV2');
      
      // Filter out messages without meaningful text content AND filter by timestamp for incremental processing
      let messagesToAnalyze = messages.filter(msg => 
        msg.text && 
        msg.text.trim().length > 0 && 
        !msg.text.startsWith('has joined the channel') &&
        !msg.text.startsWith('has left the channel') &&
        msg.subtype !== 'bot_message'
      );
      
      // For incremental processing, only analyze messages newer than the last processed timestamp
      if (lastProcessedTimestamp) {
        const lastProcessedTs = parseFloat(lastProcessedTimestamp);
        messagesToAnalyze = messagesToAnalyze.filter(msg => 
          parseFloat(msg.ts) > lastProcessedTs
        );
        console.log(`🔍 [SYNC_AI_DEBUG] Filtered for incremental processing:`, {
          beforeTimestampFilter: messages.filter(msg => 
            msg.text && 
            msg.text.trim().length > 0 && 
            !msg.text.startsWith('has joined the channel') &&
            !msg.text.startsWith('has left the channel') &&
            msg.subtype !== 'bot_message'
          ).length,
          afterTimestampFilter: messagesToAnalyze.length,
          lastProcessedTimestamp
        });
      }
      
      console.log(`🔍 [SYNC_AI_DEBUG] Final filtered messages:`, {
        originalCount: messages.length,
        meaningfulCount: messagesToAnalyze.length,
        filtered: messages.length - messagesToAnalyze.length,
        incrementalProcessing: !!lastProcessedTimestamp
      });
      
      if (messagesToAnalyze.length === 0) {
        console.log('🤖 No new messages to analyze');
        console.log(`⚠️ [SYNC_AI_DEBUG] All messages were filtered out (incremental processing)`);
        return;
      }
      
      console.log(`🚀 [SYNC_AI_DEBUG] Calling SlackAIAnalysisServiceV2.analyzeSlackMessages`);
      // Start AI analysis for task discovery
      const result = await SlackAIAnalysisServiceV2.analyzeSlackMessages(
        projectId,
        messagesToAnalyze,
        {
          analysisType: 'task_discovery',
          channelId: channelId,
          includeContext: true,
          priority: 'medium',
          lastProcessedTimestamp: lastProcessedTimestamp
        }
      );
      
      console.log(`📨 [SYNC_AI_DEBUG] AI analysis result:`, result);
      
      if (result.success && result.data?.jobId) {
        console.log(`✅ AI analysis started with job ID: ${result.data.jobId}`);
        console.log(`✅ [SYNC_AI_DEBUG] AI job successfully queued`);
      } else {
        console.error('❌ Failed to start AI analysis:', result.error);
        console.error(`❌ [SYNC_AI_DEBUG] AI analysis failed to start`);
      }
      
    } catch (error) {
      console.error('Failed to trigger AI analysis:', error);
      console.error(`🔴 [SYNC_AI_DEBUG] Exception in triggerAIAnalysis:`, error);
    }
  }

  /**
   * Clear sync cache
   */
  static clearCache(): void {
    // This method clears any cached sync data
    console.log('SlackSyncService cache cleared');
  }

  /**
   * Disable all channels for a project
   */
  static async disableChannelsForProject(projectId: string): Promise<number> {
    try {
      const syncData = await this.getSyncMetadata(projectId);
      let disabledCount = 0;
      
      for (const sync of syncData) {
        await this.updateSyncMetadata(projectId, sync.channelId, { isActive: false });
        disabledCount++;
      }
      
      console.log(`Disabled ${disabledCount} channels for project ${projectId}`);
      return disabledCount;
    } catch (error) {
      console.error('Failed to disable channels for project:', error);
      return 0;
    }
  }
}