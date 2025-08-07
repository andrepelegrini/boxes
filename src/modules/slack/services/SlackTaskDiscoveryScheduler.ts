import { slackTaskDiscoveryService, TaskDiscoveryConfig } from './SlackTaskDiscoveryService';

export interface SchedulerConfig {
  intervalMinutes: number;
  enableScheduler: boolean;
  onNewSuggestions?: (count: number) => void;
  onError?: (error: string) => void;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  intervalMinutes: 60, // 1 hour
  enableScheduler: false, // Disabled by default - requires user consent
};

export class SlackTaskDiscoveryScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: SchedulerConfig;
  private discoveryConfig: TaskDiscoveryConfig;
  private isScanning: boolean = false; // Prevent concurrent scans

  constructor(
    schedulerConfig: Partial<SchedulerConfig> = {},
    discoveryConfig: Partial<TaskDiscoveryConfig> = {}
  ) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...schedulerConfig };
    this.discoveryConfig = {
      includeChannels: true,
      includeDMs: true,
      includeGroups: true,
      lookbackHours: 24,
      minConfidenceScore: 0.6,
      excludeConversations: [],
      excludeUsers: ['slackbot'],
      ...discoveryConfig,
    };
  }

  /**
   * Start the background scheduler
   */
  start(): void {
    if (this.isRunning || !this.config.enableScheduler) {
      console.log('🛑 [SlackTaskDiscoveryScheduler] Scheduler already running or disabled');
      return;
    }

    // Minimum interval check to prevent aggressive polling
    if (this.config.intervalMinutes < 5) {
      console.log('⚠️ [SlackTaskDiscoveryScheduler] Interval too short, setting minimum to 5 minutes');
      this.config.intervalMinutes = 5;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Starting Slack task discovery scheduler (every ${this.config.intervalMinutes} minutes)`);
    }
    
    this.isRunning = true;
    
    // Startup delay to prevent initialization loops (30 seconds)
    const startupDelay = 30000;
    console.log(`⏰ [SlackTaskDiscoveryScheduler] Starting with ${startupDelay/1000}s delay to prevent loops`);
    
    setTimeout(() => {
      console.log('✅ [SlackTaskDiscoveryScheduler] Startup delay complete, beginning scan cycle');
      this.runScan();
    }, startupDelay);
    
    // Clear any existing interval first
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Schedule periodic runs with startup delay
    this.intervalId = setInterval(() => {
      this.runScan();
    }, this.config.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the background scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Stopping Slack task discovery scheduler');
    }
    
    this.isRunning = false;
    
    // Ensure interval is properly cleared
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Reset scanning state
    this.isScanning = false;
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update scheduler configuration with safer restart logic
   */
  updateConfig(schedulerConfig: Partial<SchedulerConfig>, discoveryConfig?: Partial<TaskDiscoveryConfig>): void {
    const wasRunning = this.isRunning;
    
    // Always stop first to ensure clean state
    if (wasRunning) {
      this.stop();
    }
    
    // Update configurations
    this.config = { ...this.config, ...schedulerConfig };
    
    if (discoveryConfig) {
      this.discoveryConfig = { ...this.discoveryConfig, ...discoveryConfig };
    }
    
    // Restart if it was running and scheduler is enabled
    if (wasRunning && this.config.enableScheduler) {
      // Add small delay to ensure proper cleanup
      setTimeout(() => {
        this.start();
      }, 100);
    }
  }

  /**
   * Run a manual scan
   */
  async runManualScan(): Promise<{ success: boolean; newSuggestions: number; error?: string }> {
    try {
      const result = await slackTaskDiscoveryService.scanForTasks(this.discoveryConfig);
      
      if (result.success) {
        const newSuggestions = result.data?.length || 0;
        
        if (newSuggestions > 0) {
          this.config.onNewSuggestions?.(newSuggestions);
        }
        
        return { success: true, newSuggestions };
      } else {
        const errorMessage = result.error || 'Erro ao escanear mensagens';
        
        // Provide specific error feedback for manual scans with actionable advice
        let userFriendlyError = this.categorizeErrorForUser(errorMessage);
        
        this.config.onError?.(userFriendlyError);
        return { success: false, newSuggestions: 0, error: userFriendlyError };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Handle exceptions with user-friendly messages and recovery advice
      let userFriendlyError = this.categorizeErrorForUser(errorMessage);
      
      this.config.onError?.(userFriendlyError);
      return { success: false, newSuggestions: 0, error: userFriendlyError };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): { scheduler: SchedulerConfig; discovery: TaskDiscoveryConfig } {
    return {
      scheduler: { ...this.config },
      discovery: { ...this.discoveryConfig },
    };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    nextRunAt?: string;
    intervalMinutes: number;
    lastRunAt?: string;
  } {
    const status = {
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
    };

    if (this.isRunning && this.intervalId) {
      // Estimate next run time (approximation)
      const nextRunAt = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000);
      return {
        ...status,
        nextRunAt: nextRunAt.toISOString(),
      };
    }

    return status;
  }

  /**
   * Internal scan execution with concurrency control
   */
  private async runScan(): Promise<void> {
    if (!this.isRunning || this.isScanning) {
      return;
    }

    this.isScanning = true;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Running scheduled Slack task discovery scan...');
      }
      
      const result = await slackTaskDiscoveryService.scanForTasks(this.discoveryConfig);
      
      if (result.success) {
        const newSuggestions = result.data?.length || 0;
        if (process.env.NODE_ENV === 'development') {
          console.log(`Slack scan completed: ${newSuggestions} new task suggestions found`);
        }
        
        if (newSuggestions > 0) {
          this.config.onNewSuggestions?.(newSuggestions);
        }
      } else {
        const errorMessage = result.error || 'Erro ao escanear mensagens';
        if (process.env.NODE_ENV === 'development') {
          console.error('Slack scan failed:', errorMessage);
        }
        
        // Provide specific error handling for common issues
        const categorizedError = this.categorizeErrorForUser(errorMessage);
        this.config.onError?.(`Erro na análise automática Slack: ${categorizedError}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception in scheduled Slack scan:', errorMessage);
      }
      
      // Provide user-friendly error messages
      const categorizedError = this.categorizeErrorForUser(errorMessage);
      this.config.onError?.(`Erro na análise automática Slack: ${categorizedError}`);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Categorize errors for user-friendly display with actionable advice
   */
  private categorizeErrorForUser(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    
    // Bot access issues - most common and actionable
    if (lowerError.includes('bot não tem acesso') || 
        lowerError.includes('access_denied') ||
        lowerError.includes('not_in_channel') ||
        lowerError.includes('channel_not_found')) {
      return 'Bot precisa ser adicionado aos canais conectados. Abra cada canal no Slack e digite "/invite @ProjectBoxes"';
    }
    
    // Timeout issues - temporary and self-resolving
    if (lowerError.includes('timeout') || 
        lowerError.includes('expirou') ||
        lowerError.includes('operation timed out')) {
      return 'Timeout em canal muito ativo - será tentado novamente automaticamente em alguns minutos';
    }
    
    // Rate limiting - temporary
    if (lowerError.includes('rate limit') ||
        lowerError.includes('429') ||
        lowerError.includes('muitas requisições')) {
      return 'Limite de requisições atingido - aguardando intervalo apropriado antes de tentar novamente';
    }
    
    // Authentication issues - requires user action
    if (lowerError.includes('invalid_auth') ||
        lowerError.includes('token_revoked') ||
        lowerError.includes('token inválido')) {
      return 'Token de acesso expirado - reconecte o Slack nas configurações';
    }
    
    // Permission issues - requires user action
    if (lowerError.includes('missing_scope') ||
        lowerError.includes('insufficient_scope')) {
      return 'Permissões insuficientes - reconecte o Slack com as permissões atualizadas';
    }
    
    // Network issues - temporary
    if (lowerError.includes('network') ||
        lowerError.includes('connection') ||
        lowerError.includes('conectividade')) {
      return 'Problema de conectividade - verifique sua conexão com a internet';
    }
    
    // Generic data processing issues
    if (lowerError.includes('undefined is not a function') ||
        lowerError.includes('invalid message format') ||
        lowerError.includes('error processing messages')) {
      return 'Erro no processamento de dados - pode ser devido a formato inesperado de mensagens';
    }
    
    // Fallback for unknown errors
    if (errorMessage.length > 10) {
      return `${errorMessage.slice(0, 80)}${errorMessage.length > 80 ? '...' : ''}`;
    }
    
    return 'Erro inesperado durante a operação - verifique os logs para mais detalhes';
  }

  /**
   * Discover tasks from a list of messages
   */
  async discoverTasksFromMessages(
    conversationId: string,
    messages: any[],
    minConfidenceScore: number = 0.6
  ): Promise<any[]> {
    try {
      if (!messages || messages.length === 0) {
        return [];
      }

      console.log(`🔍 Analyzing ${messages.length} messages from conversation ${conversationId}`);

      // Use the existing AI analysis infrastructure
      const { invoke } = await import('../../../utils/tauri');
      
      // Call the backend AI analysis command
      const analysisResult = await invoke('process_slack_messages_with_ai', {
        projectId: 'global-discovery', // Use a special project ID for global discovery
        messages: messages,
        analysisType: 'task_discovery',
        sinceTimestamp: null,
        lastProcessedTimestamp: null
      });

      console.log(`📦 [GLOBAL_DISCOVERY] AI analysis result:`, analysisResult);

      // Extract task suggestions from the analysis result
      if (analysisResult && Array.isArray(analysisResult.suggestions)) {
        const filteredSuggestions = analysisResult.suggestions.filter((suggestion: any) => {
          return suggestion.confidence >= minConfidenceScore;
        });

        console.log(`✅ [GLOBAL_DISCOVERY] Found ${filteredSuggestions.length} task suggestions above confidence threshold`);
        
        // Transform suggestions to match the expected format for global discovery
        return filteredSuggestions.map((suggestion: any) => ({
          id: suggestion.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: suggestion.title || suggestion.description?.substring(0, 50) || 'Untitled Task',
          description: suggestion.description || '',
          confidence: suggestion.confidence || 0.5,
          conversationId: conversationId,
          sourceMessage: suggestion.sourceMessage || null,
          suggestedProject: suggestion.suggestedProject || null,
          priority: suggestion.priority || 'medium',
          category: suggestion.category || 'general',
          createdAt: new Date().toISOString()
        }));
      }

      console.log('📭 [GLOBAL_DISCOVERY] No task suggestions found in AI analysis result');
      return [];
    } catch (error) {
      console.error('❌ [GLOBAL_DISCOVERY] Error discovering tasks from messages:', error);
      return [];
    }
  }
}

// Export singleton instance
export const slackTaskDiscoveryScheduler = new SlackTaskDiscoveryScheduler();