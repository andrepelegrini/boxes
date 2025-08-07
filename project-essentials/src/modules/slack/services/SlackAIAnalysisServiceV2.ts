/**
 * Event-Driven Slack AI Analysis Service
 * Handles AI analysis of Slack messages with event-driven architecture
 */

import { ServiceResult } from '../../common/services/ServiceWrapper';

import { eventBus, SlackEvents, createJobId } from '../../../utils/eventBus';
import { invoke } from '../../../utils/tauri';

export class SlackAIAnalysisServiceV2 {
  private static activeAnalysisJobs = new Map<string, {
    projectId: string;
    channelId?: string;
    analysisType: 'task_discovery' | 'project_update' | 'team_insights';
    messageCount: number;
    startTime: number;
    stage: 'preparation' | 'processing' | 'extraction';
  }>();

  private static isInitialized = false;

  /**
   * Initialize AI analysis service with event handlers
   */
  static initialize(): void {
    if (SlackAIAnalysisServiceV2.isInitialized) {
      return;
    }

    // Set up event handlers for AI analysis flow
    eventBus.on('ai.analysis.started', SlackAIAnalysisServiceV2.handleAnalysisStarted);

    SlackAIAnalysisServiceV2.isInitialized = true;
    console.log('SlackAIAnalysisServiceV2 event handlers initialized');
  }

  /**
   * Start AI analysis (event-driven)
   * Returns immediately with job ID, actual work happens in background
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
    try {
      const jobId = createJobId();
      const analysisType = options?.analysisType || 'task_discovery';
      
      console.log(`Starting event-driven AI analysis: ${analysisType} for project ${projectId} (${messages.length} messages)`);
      console.log(`🔍 [AI_ANALYSIS_DEBUG] Creating AI job ${jobId}:`, {
        projectId,
        channelId: options?.channelId,
        analysisType,
        messageCount: messages.length,
        firstMessage: messages[0]?.text?.substring(0, 100),
        options
      });

      // Store job details
      SlackAIAnalysisServiceV2.activeAnalysisJobs.set(jobId, {
        projectId,
        channelId: options?.channelId,
        analysisType,
        messageCount: messages.length,
        startTime: Date.now(),
        stage: 'preparation'
      });

      // Emit AI analysis started event (async processing will begin)
      console.log(`📤 [AI_ANALYSIS_DEBUG] Emitting 'ai.analysis.started' event for job ${jobId}`);
      await eventBus.emit('ai.analysis.started', {
        jobId,
        projectId,
        channelId: options?.channelId || '',
        messageCount: messages.length,
        analysisType
      });
      
      // Store messages for processing BEFORE emitting events
      SlackAIAnalysisServiceV2.storeMessagesForJob(jobId, messages, options);
      console.log(`💾 [AI_ANALYSIS_DEBUG] Stored ${messages.length} messages for job ${jobId}`);
      
      // Emit job queued event
      await SlackEvents.emitJobQueued(jobId, 'ai_analysis', options?.priority || 'medium', projectId, options?.channelId);

      return {
        success: true,
        data: { jobId }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to start AI analysis: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Store messages for processing (in-memory for now, could be cached/persisted)
   */
  private static messagesStore = new Map<string, {
    messages: any[];
    options?: any;
  }>();

  private static storeMessagesForJob(jobId: string, messages: any[], options?: any): void {
    SlackAIAnalysisServiceV2.messagesStore.set(jobId, { messages, options });
    
    // Clean up after 1 hour to prevent memory leaks
    setTimeout(() => {
      SlackAIAnalysisServiceV2.messagesStore.delete(jobId);
    }, 60 * 60 * 1000);
  }

  /**
   * Event handler for AI analysis started
   */
  private static async handleAnalysisStarted(event: any): Promise<void> {
    const { jobId, projectId, channelId, messageCount, analysisType } = event;
    
    try {
      console.log(`Handling AI analysis started event: ${analysisType} for project ${projectId} (${messageCount} messages)`);
      console.log(`📥 [AI_ANALYSIS_DEBUG] Received 'ai.analysis.started' event:`, event);

      const job = SlackAIAnalysisServiceV2.activeAnalysisJobs.get(jobId);
      if (!job) {
        console.warn(`Analysis started but no active job found: ${jobId}`);
        console.error(`❌ [AI_ANALYSIS_DEBUG] No active job found for ${jobId}`);
        return;
      }

      console.log(`🚀 [AI_ANALYSIS_DEBUG] Starting background analysis process for job ${jobId}`);
      // Wait for messages to be stored before processing
      SlackAIAnalysisServiceV2.waitForMessagesAndProcess(jobId, projectId, channelId, analysisType);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to handle AI analysis started event: ${errorMessage}`);
      
      await eventBus.emit('ai.analysis.failed', {
        jobId,
        projectId,
        error: errorMessage,
        stage: 'preparation',
        canRetry: true
      });
    }
  }

  /**
   * Wait for messages to be stored and then process the job
   */
  private static async waitForMessagesAndProcess(
    jobId: string,
    projectId: string,
    channelId?: string,
    analysisType: 'task_discovery' | 'project_update' | 'team_insights' = 'task_discovery'
  ): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 100; // 100ms
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const storedData = SlackAIAnalysisServiceV2.messagesStore.get(jobId);
      if (storedData) {
        console.log(`✅ [AI_ANALYSIS_DEBUG] Messages found for job ${jobId} on attempt ${attempt}`);
        SlackAIAnalysisServiceV2.processAnalysisJob(jobId, projectId, channelId, analysisType);
        return;
      }
      
      console.log(`⏳ [AI_ANALYSIS_DEBUG] Messages not yet stored for job ${jobId}, attempt ${attempt}/${maxRetries}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    console.error(`❌ [AI_ANALYSIS_DEBUG] Failed to find messages for job ${jobId} after ${maxRetries} attempts`);
  }

  /**
   * Process AI analysis job in background
   */
  private static async processAnalysisJob(
    jobId: string,
    projectId: string,
    channelId?: string,
    analysisType: 'task_discovery' | 'project_update' | 'team_insights' = 'task_discovery'
  ): Promise<void> {
    const workerId = 'ai-analyzer';
    let job: any = null;

    try {
      await SlackEvents.emitJobStarted(jobId, 'ai_analysis', workerId);

      job = SlackAIAnalysisServiceV2.activeAnalysisJobs.get(jobId);
      if (!job) {
        console.error(`❌ [AI_ANALYSIS_DEBUG] No active job found for ${jobId}`);
        return;
      }

      const storedData = SlackAIAnalysisServiceV2.messagesStore.get(jobId);
      if (!storedData) {
        console.error(`❌ [AI_ANALYSIS_DEBUG] No stored messages found for job ${jobId}`);
        throw new Error('Messages not found for analysis job');
      }

      const { messages } = storedData;
      console.log(`📦 [AI_ANALYSIS_DEBUG] Retrieved ${messages.length} stored messages for job ${jobId}`);

      // Stage 1: Preparation
      console.log(`Preparing AI analysis for job ${jobId} (${messages.length} messages)`);
      job.stage = 'preparation';

      // Stage 2: Analysis setup
      console.log(`Using project context for AI analysis: ${projectId}`);

      // Emit progress update
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        processed: 0,
        total: messages.length,
        currentStage: 'Preparing analysis...'
      });

      // Stage 2: Processing
      console.log(`Processing AI analysis: ${analysisType} (job ${jobId})`);
      if (job) {
        job.stage = 'processing';
      }

      let analysisResult: any;

      switch (analysisType) {
        case 'task_discovery':
          analysisResult = await SlackAIAnalysisServiceV2.performTaskDiscovery(
            jobId, 
            projectId, 
            messages
          );
          break;
          
        case 'project_update':
          analysisResult = await SlackAIAnalysisServiceV2.performProjectUpdateAnalysis(
            jobId, 
            projectId, 
            messages, 
          );
          break;
          
        case 'team_insights':
          analysisResult = await SlackAIAnalysisServiceV2.performTeamInsights(
            jobId, 
            projectId, 
            messages, 
          );
          break;
          
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      // Stage 3: Extraction and Storage
      console.log(`Extracting and storing results for job ${jobId}`);
      if (job) {
        job.stage = 'extraction';
      }

      const duration = Date.now() - job.startTime;

      // Emit AI analysis completed event
      console.log(`📤 [AI_ANALYSIS_DEBUG] Emitting 'ai.analysis.completed' event:`, {
        jobId,
        projectId,
        channelId,
        resultType: analysisType,
        resultsFound: analysisResult.tasks?.length || 0,
        duration
      });
      await eventBus.emit('ai.analysis.completed', {
        jobId,
        projectId,
        channelId: channelId || '',
        results: analysisResult,
        duration
      });

      // Emit job completed event
      await SlackEvents.emitJobCompleted(jobId, 'ai_analysis', workerId, duration, analysisResult);

      // Clean up
      SlackAIAnalysisServiceV2.activeAnalysisJobs.delete(jobId);
      SlackAIAnalysisServiceV2.messagesStore.delete(jobId);

      console.log(`AI analysis completed successfully: job ${jobId} (${duration}ms, ${analysisResult.tasks?.length || 0} results)`);
      console.log(`✅ [AI_ANALYSIS_DEBUG] Job ${jobId} completed and cleaned up`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`AI analysis job failed: ${jobId} - ${errorMessage}`);

      // Determine retry capability based on error
      const canRetry = !errorMessage.includes('rate limit') && 
                      !errorMessage.includes('quota exceeded') &&
                      !errorMessage.includes('invalid api key');

      // Emit AI analysis failed event
      await eventBus.emit('ai.analysis.failed', {
        jobId,
        projectId,
        error: errorMessage,
        stage: job?.stage || 'processing',
        canRetry
      });

      // Emit job failed event
      await SlackEvents.emitJobFailed(
        jobId, 
        'ai_analysis', 
        workerId, 
        errorMessage, 
        0, 
        canRetry ? 2 : 0,
        canRetry ? Date.now() + 120000 : undefined // Retry in 2 minutes if possible
      );

      // Clean up
      SlackAIAnalysisServiceV2.activeAnalysisJobs.delete(jobId);
      SlackAIAnalysisServiceV2.messagesStore.delete(jobId);

      // Show error notification
      await SlackEvents.emitNotification(
        'error',
        'AI Analysis Failed',
        `Analysis failed: ${errorMessage}`,
        8000
      );
    }
  }

  /**
   * Perform task discovery analysis
   */
  private static async performTaskDiscovery(
    jobId: string,
    projectId: string,
    messages: any[]
  ): Promise<{ tasks: any[] }> {
    try {
      console.log(`Performing task discovery analysis for job ${jobId} (${messages.length} messages)`);

      const totalMessages = messages.length;
      const tasks: any[] = [];

      console.log(`🔄 [AI_ANALYSIS_DEBUG] Processing all ${messages.length} messages together for better context`);

      // Emit initial progress
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        processed: 0,
        total: totalMessages,
        currentStage: 'Analyzing all messages with AI...'
      });
        
      // Send ALL messages together to the LLM for better context understanding
      try {
        console.log(`🦀 [AI_ANALYSIS_DEBUG] Calling backend process_slack_messages_with_ai with incremental processing support`);
        const analysisResult = await invoke('process_slack_messages_with_ai', {
          projectId: projectId,
          messages: messages,
          analysisType: 'task_discovery',
          sinceTimestamp: options?.sinceTimestamp || null,
          lastProcessedTimestamp: options?.lastProcessedTimestamp || null
        });

        console.log(`📦 [AI_ANALYSIS_DEBUG] Backend AI result:`, analysisResult);

        // Extract tasks from the AI analysis result
        if (analysisResult && typeof analysisResult === 'object') {
          const analysisData = analysisResult as any;
          
          // Handle different response formats
          let extractedTasks: any[] = [];
          
          if (analysisData.detected_tasks) {
            extractedTasks = analysisData.detected_tasks;
          } else if (analysisData.taskSuggestions) {
            extractedTasks = analysisData.taskSuggestions;
          } else if (analysisData.tasks) {
            extractedTasks = analysisData.tasks;
          } else if (analysisData.actionable_items) {
            // Convert actionable items to task format
            extractedTasks = analysisData.actionable_items.map((item: any) => ({
              title: item.title || item.task || 'Task from Slack',
              description: item.description || item.context || '',
              priority: item.priority || 'medium',
              source: `Slack: ${item.channel || 'unknown'}`
            }));
          }
          
          if (extractedTasks.length > 0) {
            tasks.push(...extractedTasks);
            console.log(`Extracted ${extractedTasks.length} tasks from full conversation`);
            console.log(`✅ [AI_ANALYSIS_DEBUG] Extracted tasks:`, extractedTasks);
          } else {
            console.log(`⚠️ [AI_ANALYSIS_DEBUG] No tasks extracted from conversation`);
          }
        } else {
          console.log(`⚠️ [AI_ANALYSIS_DEBUG] Invalid or empty analysis result:`, analysisResult);
        }
      } catch (error) {
        console.error(`AI analysis failed: ${error}`);
        console.error(`❌ [AI_ANALYSIS_DEBUG] Analysis error:`, error);
        throw error; // Re-throw to trigger proper error handling
      }

      // Emit completion progress
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        processed: totalMessages,
        total: totalMessages,
        currentStage: 'Analysis complete'
      });

      console.log(`Task discovery completed: job ${jobId} found ${tasks.length} tasks`);

      return { tasks };

    } catch (error) {
      console.error(`Task discovery failed: job ${jobId} - ${error}`);
      throw error;
    }
  }

  /**
   * Perform project update analysis
   */
  private static async performProjectUpdateAnalysis(
    jobId: string,
    projectId: string,
    messages: any[]
  ): Promise<{ updates: string[]; insights: string[] }> {
    try {
      console.log(`Performing project update analysis for job ${jobId} (${messages.length} messages)`);

      // This would use a different AI analysis approach focused on project updates
      // For now, delegate to existing functionality but structure for event-driven flow
      
      const updates: string[] = [];
      const insights: string[] = [];

      // Emit progress update
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        processed: messages.length,
        total: messages.length,
        currentStage: 'Analyzing project updates...'
      });

      console.log(`Project update analysis completed: job ${jobId} found ${updates.length} updates`);

      return { updates, insights };

    } catch (error) {
      console.error(`Project update analysis failed: job ${jobId} - ${error}`);
      throw error;
    }
  }

  /**
   * Perform team insights analysis
   */
  private static async performTeamInsights(
    jobId: string,
    projectId: string,
    messages: any[]
  ): Promise<{ insights: string[]; metrics: any }> {
    try {
      console.log(`Performing team insights analysis for job ${jobId} (${messages.length} messages)`);

      // This would analyze team communication patterns, collaboration metrics, etc.
      const insights: string[] = [];
      const metrics = {};

      // Emit progress update
      await eventBus.emit('ai.analysis.progress', {
        jobId,
        projectId,
        processed: messages.length,
        total: messages.length,
        currentStage: 'Analyzing team patterns...'
      });

      console.log(`Team insights analysis completed: job ${jobId} found ${insights.length} insights`);

      return { insights, metrics };

    } catch (error) {
      console.error(`Team insights analysis failed: job ${jobId} - ${error}`);
      throw error;
    }
  }

  /**
   * Get active analysis jobs (for debugging)s
   */
  static getActiveJobs(): Array<{
    jobId: string;
    projectId: string;
    channelId?: string;
    analysisType: string;
    messageCount: number;
    stage: string;
    duration: number;
  }> {
    const now = Date.now();
    const jobs: Array<{
      jobId: string;
      projectId: string;
      channelId?: string;
      analysisType: string;
      messageCount: number;
      stage: string;
      duration: number;
    }> = [];
    
    for (const [jobId, job] of SlackAIAnalysisServiceV2.activeAnalysisJobs.entries()) {
      jobs.push({
        jobId,
        projectId: job.projectId,
        channelId: job.channelId,
        analysisType: job.analysisType,
        messageCount: job.messageCount,
        stage: job.stage,
        duration: now - job.startTime
      });
    }
    
    return jobs;
  }

  /**
   * Cancel analysis job
   */
  static async cancelAnalysis(jobId: string, reason: string = 'User cancelled'): Promise<void> {
    const job = SlackAIAnalysisServiceV2.activeAnalysisJobs.get(jobId);
    if (job) {
      SlackAIAnalysisServiceV2.activeAnalysisJobs.delete(jobId);
      SlackAIAnalysisServiceV2.messagesStore.delete(jobId);
      
      await SlackEvents.emitJobCancelled(jobId, 'ai_analysis', reason);
      
      console.log(`AI analysis job cancelled: ${jobId} - ${reason}`);
    }
  }

  /**
   * Retry failed analysis
   */
  static async retryAnalysis(jobId: string): Promise<ServiceResult<{ newJobId: string }>> {
    const storedData = SlackAIAnalysisServiceV2.messagesStore.get(jobId);
    const job = SlackAIAnalysisServiceV2.activeAnalysisJobs.get(jobId);
    
    if (!storedData || !job) {
      return {
        success: false,
        error: 'Job data not found for retry'
      };
    }

    console.log(`Retrying AI analysis for job ${jobId}`);

    // Start new analysis with same parameters
    const result = await SlackAIAnalysisServiceV2.analyzeSlackMessages(
      job.projectId,
      storedData.messages,
      {
        analysisType: job.analysisType,
        channelId: job.channelId,
        ...storedData.options
      }
    );

    return {
      success: result.success,
      data: { newJobId: result.data.jobId },
      error: result.error
    };
  }
}

// Note: Service initialization is now handled in RootProvider
