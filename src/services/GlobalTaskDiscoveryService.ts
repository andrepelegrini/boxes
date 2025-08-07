import { GlobalTaskSuggestion } from '../components/modal/GlobalTaskTriageModal';
import { SlackChannelService } from '../modules/slack/services/SlackChannelService';

export interface GlobalTaskDiscoveryConfig {
  enabled: boolean;
  scanIntervalMinutes: number;
  lookbackPeriod: '1day' | '1week' | '1month';
  minConfidenceScore: number;
  
  
  // Legacy Slack fields (kept for backward compatibility)
  monitorProjectChannels: boolean;
  monitorAllDMs: boolean;
  monitorAllGroups: boolean;
  blockedConversations: string[];
  blockedUsers: string[];
  includeChannels: boolean;
  includeDMs: boolean;
  includeGroups: boolean;
  excludeUsers: string[];
  excludeChannels: string[];
}

export interface ConversationMetadata {
  id: string;
  name: string;
  type: 'public_channel' | 'private_channel' | 'im' | 'mpim';
  memberCount?: number;
  lastMessage?: string;
  userId?: string; // For DMs, the user ID of the other person
  userDisplayName?: string; // For DMs, the display name of the other person
}

// Add Project interface if not already imported
interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  // Add other project fields as needed
}

export class GlobalTaskDiscoveryService {
  private static instance: GlobalTaskDiscoveryService;
  private config: GlobalTaskDiscoveryConfig;
  private isRunning: boolean = false;

  private constructor() {
    
    // Default configuration
    this.config = {
      enabled: false, // Disabled by default - user must explicitly enable
      scanIntervalMinutes: 60, // Scan every hour
      lookbackPeriod: '1day', // Look back 1 day by default
      minConfidenceScore: 0.75, // Higher confidence threshold
      
      
      // Legacy Slack fields (backward compatibility)
      monitorProjectChannels: false,
      monitorAllDMs: false,
      monitorAllGroups: false,
      blockedConversations: [],
      blockedUsers: [],
      includeChannels: false,
      includeDMs: false, 
      includeGroups: false,
      excludeUsers: [],
      excludeChannels: []
    };
  }

  public static getInstance(): GlobalTaskDiscoveryService {
    if (!GlobalTaskDiscoveryService.instance) {
      GlobalTaskDiscoveryService.instance = new GlobalTaskDiscoveryService();
    }
    return GlobalTaskDiscoveryService.instance;
  }

  /**
   * Update the available projects for intelligent assignment
   */
  public updateAvailableProjects(projects: Project[]): void {
    // No longer needed without WhatsApp integration
  }

  /**
   * Get user-configured conversations for global monitoring
   */
  public async getMonitorableConversations(): Promise<ConversationMetadata[]> {
    try {
      const connectionStatus = await this.connectionManager.getInitializedStatus();
      if (connectionStatus.status !== 'connected') {
        throw new Error('Slack not connected');
      }

      const conversations: ConversationMetadata[] = [];

      // 1. Get project-connected channels if enabled
      if (this.config.monitorProjectChannels) {
        const projectChannels = await this.getProjectConnectedChannels();
        conversations.push(...projectChannels);
      }

      // 2. Get all accessible conversations and filter based on config + blocklists
      const allConversations = await this.getAllAccessibleConversations();
      
      // Filter based on configuration
      const filteredConversations = allConversations.filter(conv => {
        // Skip if conversation is blocklisted
        if (this.config.blockedConversations.includes(conv.id)) {
          return false;
        }
        
        // Skip if it's a DM with a blocklisted user
        if (conv.type === 'im' && conv.userId && this.config.blockedUsers.includes(conv.userId)) {
          return false;
        }
        
        // Include based on type configuration
        if (conv.type === 'im' && this.config.monitorAllDMs) return true;
        if ((conv.type === 'private_channel' || conv.type === 'mpim') && this.config.monitorAllGroups) return true;
        
        return false;
      });
      
      conversations.push(...filteredConversations);

      return conversations;
    } catch (error) {
      console.error('Failed to get monitorable conversations:', error);
      throw error;
    }
  }

  /**
   * Get channels that are connected to projects
   */
  private async getProjectConnectedChannels(): Promise<ConversationMetadata[]> {
    try {
      const { initDatabase } = await import('../utils/database');
      const db = await initDatabase();
      
      const connections = await db.select(
        `SELECT DISTINCT channel_id, channel_name FROM project_slack_connections WHERE is_active = 1`
      );
      
      return connections.map(conn => ({
        id: conn.channel_id,
        name: conn.channel_name,
        type: 'public_channel' as const, // Assume public for now
        memberCount: undefined
      }));
    } catch (error) {
      console.error('Failed to get project connected channels:', error);
      return [];
    }
  }

  /**
   * Get all accessible conversations (DMs, groups, etc.)
   */
  private async getAllAccessibleConversations(): Promise<ConversationMetadata[]> {
    try {
      const channels = await SlackChannelService.getAccessibleChannels();
      
      return channels
        .filter(channel => {
          // Only include DMs and private groups for global discovery
          // (Project channels are handled separately)
          return channel.type === 'im' || 
                 channel.type === 'mpim' || 
                 channel.type === 'private_channel';
        })
        .map(channel => ({
          id: channel.id,
          name: channel.name || this.generateDisplayName(channel),
          type: channel.type as 'private_channel' | 'im' | 'mpim',
          memberCount: channel.memberCount || undefined,
          userId: channel.type === 'im' ? (channel.user as string) : undefined,
          userDisplayName: channel.type === 'im' ? (channel.name as string) : undefined
        })) as ConversationMetadata[];
    } catch (error) {
      console.error('Failed to get all accessible conversations:', error);
      return [];
    }
  }

  /**
   * Generate a display name for conversations without names
   */
  private generateDisplayName(channel: any): string {
    if (channel.name) return channel.name;
    
    if (channel.type === 'im') {
      return channel.user ? `DM with ${channel.user}` : 'Direct Message';
    }
    
    if (channel.type === 'mpim') {
      return 'Group Message';
    }
    
    return `Private Channel ${channel.id.substring(0, 8)}`;
  }

  /**
   * Perform global task discovery across all monitored conversations
   */
  public async performGlobalDiscovery(): Promise<GlobalTaskSuggestion[]> {
    if (this.isRunning) {
      return [];
    }

    this.isRunning = true;

    try {
      // Global discovery is now disabled without WhatsApp integration
      return [];

    } finally {
      this.isRunning = false;
    }
  }






  /**
   * Start automatic global discovery
   */
  public async startAutoDiscovery(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Global discovery is now disabled without WhatsApp integration
    console.log('Global discovery disabled - no active integrations');
  }

  /**
   * Stop automatic global discovery
   */
  public async stopAutoDiscovery(): Promise<void> {
    // No longer needed without WhatsApp integration
  }

  /**
   * Schedule the next discovery run
   */
  private scheduleNextDiscovery(): void {
    if (!this.config.enabled) {
      return;
    }

    
    setTimeout(async () => {
      if (this.config.enabled) {
        try {
          await this.performGlobalDiscovery();
        } catch (error) {
          console.error('❌ [GlobalTaskDiscoveryService] Scheduled discovery failed:', error);
          
          // Check for rate limiting and adjust accordingly
          if (error instanceof Error && error.message.includes('Rate limited')) {
            console.warn('⚡ [GlobalTaskDiscoveryService] Rate limit detected, activating backoff');
            this.lastRateLimitTime = new Date();
          }
        }
        
        // Schedule next run
        this.scheduleNextDiscovery();
      }
    }, this.config.scanIntervalMinutes * 60 * 1000);
  }



  /**
   * Update discovery configuration
   */
  public async updateConfig(newConfig: Partial<GlobalTaskDiscoveryConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): GlobalTaskDiscoveryConfig {
    return { ...this.config };
  }

  /**
   * Get discovery status
   */
  public getStatus() {
    return {
      isRunning: false,
      lastRun: null,
      config: this.config,
      isConnected: false
    };
  }

  /**
   * Manual refresh - performs immediate discovery
   */
  public async refresh(): Promise<GlobalTaskSuggestion[]> {
    return await this.performGlobalDiscovery();
  }

  /**
   * Analyze messages for tasks using AI (legacy method - now disabled)
   */
  public static async analyzeMessagesForTasks(
    messages: Array<{ user: string; text: string; timestamp: string; channel: string; messageId: string }>
  ): Promise<GlobalTaskSuggestion[]> {
    // This method is no longer supported without WhatsApp integration
    console.warn('Message analysis is disabled - WhatsApp integration removed');
    return [];
  }

  /**
   * Store task suggestions for user triage
   */
  public static async storeSuggestions(
    suggestions: GlobalTaskSuggestion[]
  ): Promise<void> {
    try {
      const { initDatabase } = await import('../utils/database');
      const db = await initDatabase();
      
      for (const suggestion of suggestions) {
        // Store in global task suggestions table
        await db.execute(`
          INSERT OR REPLACE INTO global_task_suggestions (
            id, projectId, title, description, source, sourceConversation,
            confidenceScore, priority, status, createdAt, messageUser,
            messageText, messageTimestamp, aiReasoning, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          suggestion.id,
          suggestion.projectId,
          suggestion.title,
          suggestion.description,
          suggestion.source,
          suggestion.sourceConversation,
          suggestion.confidenceScore,
          suggestion.priority,
          suggestion.status,
          suggestion.createdAt,
          suggestion.messageUser,
          suggestion.messageText,
          suggestion.messageTimestamp,
          suggestion.aiReasoning,
          JSON.stringify(suggestion.metadata || {})
        ]);
      }
      
      
    } catch (error) {
      console.error('Failed to store task suggestions:', error);
      throw error;
    }
  }
}

export default GlobalTaskDiscoveryService;