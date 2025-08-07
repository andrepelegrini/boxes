import GlobalTaskDiscoveryService from './GlobalTaskDiscoveryService';
import { slackConnectionManager } from '../modules/slack/services/SlackConnectionManager';
import { GlobalTaskSuggestion } from '../components/modal/GlobalTaskTriageModal';

/**
 * Integration service that coordinates global task discovery with the application lifecycle
 * This service is responsible for:
 * - Starting auto-discovery when Slack is connected
 * - Managing the discovery lifecycle
 * - Providing a unified interface for global task operations
 */
export class GlobalTaskIntegrationService {
  private static instance: GlobalTaskIntegrationService;
  private discoveryService: GlobalTaskDiscoveryService;
  private slackConnectionManager = slackConnectionManager;
  private isInitialized: boolean = false;
  private autoDiscoveryStarted: boolean = false;

  private constructor() {
    this.discoveryService = GlobalTaskDiscoveryService.getInstance();
  }

  public static getInstance(): GlobalTaskIntegrationService {
    if (!GlobalTaskIntegrationService.instance) {
      GlobalTaskIntegrationService.instance = new GlobalTaskIntegrationService();
    }
    return GlobalTaskIntegrationService.instance;
  }

  /**
   * Initialize the global task integration
   * Should be called during app startup
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[GlobalTaskIntegration] Initializing...');

    try {
      // Check if Slack is connected and start auto-discovery if enabled
      const connectionStatus = await this.slackConnectionManager.getInitializedStatus();
      
      if (connectionStatus.status === 'connected') {
        console.log('[GlobalTaskIntegration] Slack is connected, checking discovery settings...');
        
        const config = this.discoveryService.getConfig();
        if (config.enabled) {
          console.log('[GlobalTaskIntegration] Auto-discovery is enabled, starting...');
          await this.startAutoDiscovery();
        } else {
          console.log('[GlobalTaskIntegration] Auto-discovery is disabled');
        }
      } else {
        console.log('[GlobalTaskIntegration] Slack is not connected, auto-discovery will start when connected');
      }

      this.isInitialized = true;
      console.log('[GlobalTaskIntegration] Initialization complete');

    } catch (error) {
      console.error('[GlobalTaskIntegration] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Start automatic global task discovery
   */
  public async startAutoDiscovery(): Promise<void> {
    if (this.autoDiscoveryStarted) {
      console.log('[GlobalTaskIntegration] Auto-discovery already started');
      return;
    }

    try {
      await this.discoveryService.startAutoDiscovery();
      this.autoDiscoveryStarted = true;
      console.log('[GlobalTaskIntegration] Auto-discovery started successfully');
    } catch (error) {
      console.error('[GlobalTaskIntegration] Failed to start auto-discovery:', error);
      throw error;
    }
  }

  /**
   * Stop automatic global task discovery
   */
  public async stopAutoDiscovery(): Promise<void> {
    await this.discoveryService.stopAutoDiscovery();
    this.autoDiscoveryStarted = false;
    console.log('[GlobalTaskIntegration] Auto-discovery stopped.');
  }

  /**
   * Perform a manual global task discovery
   */
  public async performManualDiscovery(): Promise<GlobalTaskSuggestion[]> {
    try {
      console.log('[GlobalTaskIntegration] Performing manual discovery...');
      const suggestions = await this.discoveryService.performGlobalDiscovery();
      console.log(`[GlobalTaskIntegration] Manual discovery complete: ${suggestions.length} suggestions found`);
      return suggestions;
    } catch (error) {
      console.error('[GlobalTaskIntegration] Manual discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get discovery status and statistics
   */
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      autoDiscoveryStarted: this.autoDiscoveryStarted,
      discoveryStatus: this.discoveryService.getStatus(),
      config: this.discoveryService.getConfig()
    };
  }

  /**
   * Update discovery configuration
   */
  public async updateConfig(config: any): Promise<void> {
    try {
      this.discoveryService.updateConfig(config);
      
      // Restart auto-discovery if needed
      if (config.enabled && !this.autoDiscoveryStarted) {
        const connectionStatus = await this.slackConnectionManager.getInitializedStatus();
        if (connectionStatus.status === 'connected') {
          await this.startAutoDiscovery();
        }
      }
      
      console.log('[GlobalTaskIntegration] Configuration updated');
    } catch (error) {
      console.error('[GlobalTaskIntegration] Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Handle Slack connection changes
   * Should be called when Slack connection status changes
   */
  public async onSlackConnectionChange(isConnected: boolean): Promise<void> {
    console.log(`[GlobalTaskIntegration] Slack connection changed: ${isConnected}`);
    
    if (isConnected) {
      const config = this.discoveryService.getConfig();
      if (config.enabled && !this.autoDiscoveryStarted) {
        await this.startAutoDiscovery();
      }
    } else {
      // Connection lost, auto-discovery will stop naturally
      this.autoDiscoveryStarted = false;
      console.log('[GlobalTaskIntegration] Slack disconnected, auto-discovery will stop');
    }
  }

  /**
   * Get conversation monitoring information
   */
  public async getMonitoringInfo() {
    try {
      const conversations = await this.discoveryService.getMonitorableConversations();
      const config = this.discoveryService.getConfig();
      
      return {
        totalConversations: conversations.length,
        conversationsByType: conversations.reduce((acc, conv) => {
          acc[conv.type] = (acc[conv.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        config: {
          includeChannels: config.includeChannels,
          includeDMs: config.includeDMs,
          includeGroups: config.includeGroups,
          excludeChannels: config.excludeChannels,
          excludeUsers: config.excludeUsers
        }
      };
    } catch (error) {
      console.error('[GlobalTaskIntegration] Failed to get monitoring info:', error);
      return null;
    }
  }
}

export default GlobalTaskIntegrationService;