/**
 * Unified AI Analysis Service
 * Provides AI analysis for Slack messages
 */

import { ServiceResult } from '../modules/common/services/ServiceWrapper';
import { eventBus, createJobId } from '../utils/eventBus';
import { invoke } from '../utils/tauri';

export interface UnifiedAnalysisJob {
  projectId: string;
  channelId?: string;
  analysisType: 'task_discovery' | 'project_update' | 'team_insights';
  messageCount: number;
  startTime: number;
  stage: 'preparation' | 'processing' | 'extraction';
  source: 'slack';
}

export class UnifiedAIAnalysisService {
  private static activeAnalysisJobs = new Map<string, UnifiedAnalysisJob>();
  private static isInitialized = false;

  /**
   * Initialize unified AI analysis service
   */
  static initialize(): void {
    if (UnifiedAIAnalysisService.isInitialized) {
      return;
    }

    // Set up event handlers for AI analysis flow
    eventBus.on('ai.analysis.started', UnifiedAIAnalysisService.handleAnalysisStarted);

    UnifiedAIAnalysisService.isInitialized = true;
    console.log('UnifiedAIAnalysisService event handlers initialized');
  }


  /**
   * Analyze Slack messages
   */
  static async analyzeSlackMessages(
    projectId: string,
    messages: any[],
    options?: {
      analysisType?: 'task_discovery' | 'project_update' | 'team_insights';
      channelId?: string;
      includeContext?: boolean;
      priority?: 'low' | 'medium' | 'high';
      lastProcessedTimestamp?: string | null;
      sinceTimestamp?: string | null;
    }
  ): Promise<ServiceResult<{ jobId: string }>> {
    return UnifiedAIAnalysisService.analyzeMessages(
      projectId,
      messages,
      'slack',
      options
    );
  }

  /**
   * Analyze Slack messages
   */
  private static async analyzeMessages(
    projectId: string,
    messages: any[],
    source: 'slack',
    options?: {
      analysisType?: 'task_discovery' | 'project_update' | 'team_insights';
      channelId?: string;
      includeContext?: boolean;
      priority?: 'low' | 'medium' | 'high';
      lastProcessedTimestamp?: string | null;
      sinceTimestamp?: string | null;
    }
  ): Promise<ServiceResult<{ jobId: string }>> {
    try {
      const jobId = createJobId();
      const analysisType = options?.analysisType || 'task_discovery';
      
      console.log(`Starting AI analysis: ${analysisType} for ${source} in project ${projectId} (${messages.length} messages)`);
      
      // Store job details
      UnifiedAIAnalysisService.activeAnalysisJobs.set(jobId, {
        projectId,
        channelId: options?.channelId,
        analysisType,
        messageCount: messages.length,
        startTime: Date.now(),
        stage: 'preparation',
        source
      });

      // Emit AI analysis started event
      await eventBus.emit('ai.analysis.started', {
        jobId,
        projectId,
        channelId: options?.channelId,
        messageCount: messages.length,
        analysisType,
        source
      });
      
      // Store messages for processing
      UnifiedAIAnalysisService.storeMessagesForJob(jobId, messages, options, source);
      console.log(`Stored ${messages.length} ${source} messages for job ${jobId}`);
      
      return {
        success: true,
        data: { jobId }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to start ${source} AI analysis:`, errorMessage);
      
      return {
        success: false,
        error: `Failed to start AI analysis: ${errorMessage}`
      };
    }
  }

  /**
   * Handle analysis started event (triggers actual backend processing)
   */
  private static async handleAnalysisStarted(event: any): Promise<void> {
    const { jobId, projectId, channelId, analysisType, source } = event;
    
    try {
      console.log(`Processing ${source} AI analysis job ${jobId}...`);
      
      // Update job stage
      const job = UnifiedAIAnalysisService.activeAnalysisJobs.get(jobId);
      if (job) {
        job.stage = 'processing';
      }

      // Emit progress event
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        channelId,
        stage: 'processing',
        progress: 0
      });

      // Get stored messages
      const storedData = UnifiedAIAnalysisService.getStoredMessagesForJob(jobId);
      if (!storedData) {
        throw new Error(`No stored data found for job ${jobId}`);
      }

      const { messages, options } = storedData;

      // Call Slack backend method
      const analysisResult = await invoke('process_slack_messages_with_ai', {
        projectId,
        messages,
        analysisType,
        lastProcessedTimestamp: options?.lastProcessedTimestamp
      });

      // Update job stage
      if (job) {
        job.stage = 'extraction';
      }

      // Process results with unified handler
      await UnifiedAIAnalysisService.processAnalysisResults(
        jobId,
        projectId,
        channelId || '',
        source,
        analysisResult
      );

      // Emit completion event
      await eventBus.emit('ai.analysis.completed', {
        jobId,
        projectId,
        channelId,
        results: analysisResult,
        source,
        messageCount: messages.length,
        duration: Date.now() - (job?.startTime || Date.now())
      });

      // Clean up job
      UnifiedAIAnalysisService.activeAnalysisJobs.delete(jobId);
      UnifiedAIAnalysisService.cleanupStoredMessagesForJob(jobId);

    } catch (error) {
      console.error(`AI analysis job ${jobId} failed:`, error);
      
      await eventBus.emit('ai.analysis.failed', {
        jobId,
        projectId,
        channelId,
        error: error instanceof Error ? error.message : String(error),
        source
      });

      // Clean up job
      UnifiedAIAnalysisService.activeAnalysisJobs.delete(jobId);
      UnifiedAIAnalysisService.cleanupStoredMessagesForJob(jobId);
    }
  }

  // Message storage for job processing
  private static storedJobMessages = new Map<string, {
    messages: any[];
    options?: any;
    source: 'slack';
  }>();

  private static storeMessagesForJob(
    jobId: string, 
    messages: any[], 
    options?: any, 
    source: 'slack' = 'slack'
  ): void {
    UnifiedAIAnalysisService.storedJobMessages.set(jobId, {
      messages,
      options,
      source
    });
  }

  private static getStoredMessagesForJob(jobId: string): {
    messages: any[];
    options?: any;
    source: 'slack';
  } | null {
    return UnifiedAIAnalysisService.storedJobMessages.get(jobId) || null;
  }

  private static cleanupStoredMessagesForJob(jobId: string): void {
    UnifiedAIAnalysisService.storedJobMessages.delete(jobId);
  }

  /**
   * Get current analysis jobs
   */
  static getActiveJobs(): Map<string, UnifiedAnalysisJob> {
    return new Map(UnifiedAIAnalysisService.activeAnalysisJobs);
  }

  /**
   * Process AI analysis results for Slack
   */
  private static async processAnalysisResults(
    jobId: string,
    projectId: string,
    channelId: string,
    source: 'slack',
    results: any
  ): Promise<void> {
    console.log(`[UnifiedAIResultsHandler] Processing AI analysis results for Slack channel ${channelId} in project ${projectId}`);
    console.log(`[UnifiedAIResultsHandler] Results contain:`, {
      tasks: results.tasks?.length || 0,
      events: results.events?.length || 0,
      project_updates: results.project_updates?.length || 0
    });

    try {
      // Create task suggestions from AI analysis
      if (results.tasks && results.tasks.length > 0) {
        await UnifiedAIAnalysisService.createTaskSuggestions(source, projectId, channelId, results.tasks, jobId);
      }

      // Handle events if any
      if (results.events && results.events.length > 0) {
        await UnifiedAIAnalysisService.handleEventSuggestions(source, results.events);
      }

      // Handle project updates if any
      if (results.project_updates && results.project_updates.length > 0) {
        await UnifiedAIAnalysisService.handleProjectUpdates(source, results.project_updates);
      }

      // Show success notification
      await eventBus.emit('ui.notification.show', {
        type: 'success',
        title: 'Slack Tasks Discovered',
        message: `Found ${results.tasks?.length || 0} new tasks from Slack messages`,
        duration: 5000
      });

    } catch (error) {
      console.error(`[UnifiedAIResultsHandler] Failed to process Slack AI analysis results:`, error);
      
      await eventBus.emit('ui.notification.show', {
        type: 'error',
        title: 'Slack Analysis Error',
        message: 'Failed to process Slack message analysis results',
        duration: 5000
      });
    }
  }

  /**
   * Create task suggestions for Slack
   */
  private static async createTaskSuggestions(
    source: 'slack',
    projectId: string, 
    channelId: string, 
    tasks: any[], 
    jobId: string
  ): Promise<void> {
    console.log(`[UnifiedAIResultsHandler] Creating ${tasks.length} task suggestions for Slack`);

    // Dynamic import to avoid circular dependencies
    const { SlackTaskDiscoveryService } = await import('../modules/slack/services/SlackTaskDiscoveryService');

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      try {
        await SlackTaskDiscoveryService.createTaskSuggestion(
          projectId,
          channelId,
          `ai-${jobId}-${i}`,
          task.title || task.summary || 'Untitled Task',
          task.description || task.details || '',
          task.confidence || 0.8,
          {
            source: 'ai_analysis',
            priority: task.priority || 'medium',
            category: task.category || 'general',
            ai_metadata: {
              job_id: jobId,
              source,
              channel_id: channelId,
              original_task: task
            }
          }
        );
        
        console.log(`[UnifiedAIResultsHandler] Created Slack task suggestion: ${task.title || 'Untitled'}`);
      } catch (error) {
        console.error(`[UnifiedAIResultsHandler] Failed to create Slack task suggestion ${i}:`, error);
      }
    }
  }

  /**
   * Handle event suggestions for Slack
   */
  private static async handleEventSuggestions(
    source: 'slack',
    events: any[]
  ): Promise<void> {
    console.log(`[UnifiedAIResultsHandler] Processing ${events.length} Slack event suggestions`);
    
    // For now, just log the events. In the future, we could create calendar events
    for (const event of events) {
      console.log(`[UnifiedAIResultsHandler] Slack event detected:`, {
        title: event.title || event.summary,
        date: event.date || event.when,
        description: event.description || event.details
      });
    }
  }

  /**
   * Handle project updates for Slack
   */
  private static async handleProjectUpdates(
    source: 'slack',
    updates: any[]
  ): Promise<void> {
    console.log(`[UnifiedAIResultsHandler] Processing ${updates.length} Slack project update suggestions`);
    
    // For now, just log the updates. In the future, we could automatically
    // apply project description updates or other project modifications
    for (const update of updates) {
      console.log(`[UnifiedAIResultsHandler] Slack project update detected:`, {
        type: update.type || 'general',
        description: update.description || update.details,
        confidence: update.confidence || 0.8
      });
    }
  }

  /**
   * Cancel an active job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    const job = UnifiedAIAnalysisService.activeAnalysisJobs.get(jobId);
    if (!job) {
      return false;
    }

    await eventBus.emit('ai.analysis.cancelled', {
      jobId,
      projectId: job.projectId,
      channelId: job.channelId,
      source: job.source
    });

    UnifiedAIAnalysisService.activeAnalysisJobs.delete(jobId);
    UnifiedAIAnalysisService.cleanupStoredMessagesForJob(jobId);
    
    return true;
  }
}