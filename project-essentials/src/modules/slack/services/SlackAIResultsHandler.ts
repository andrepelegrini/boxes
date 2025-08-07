/**
 * Slack AI Results Handler
 * Processes AI analysis results and creates tasks, events, and project updates
 */

import { eventBus } from '../../../utils/eventBus';
import { invoke } from '../../../utils/tauri';

export class SlackAIResultsHandler {
  private static isInitialized = false;
  private static processedJobs = new Set<string>();

  /**
   * Initialize the AI results handler
   */
  static initialize(): void {
    if (this.isInitialized) {
      console.log('[SlackAIResultsHandler] Already initialized, skipping');
      return;
    }

    console.log('[SlackAIResultsHandler] Initializing AI results event handler');
    
    // Subscribe to AI analysis completed events
    eventBus.on('ai.analysis.completed', this.handleAIAnalysisCompleted.bind(this));
    
    this.isInitialized = true;
    console.log('[SlackAIResultsHandler] Event handler registered successfully');
  }

  /**
   * Handle AI analysis completion
   */
  private static async handleAIAnalysisCompleted(event: any): Promise<void> {
    const { jobId, projectId, channelId, results, duration } = event;
    
    // Prevent double processing
    if (this.processedJobs.has(jobId)) {
      console.log(`[SlackAIResultsHandler] Job ${jobId} already processed, skipping`);
      return;
    }
    
    this.processedJobs.add(jobId);
    
    // Clean up old job IDs after 1 hour
    setTimeout(() => {
      this.processedJobs.delete(jobId);
    }, 60 * 60 * 1000);
    
    console.log(`[SlackAIResultsHandler] Processing AI analysis results for job ${jobId}`, {
      projectId,
      channelId,
      duration,
      hasResults: !!results,
      taskCount: results?.tasks?.length || 0
    });

    try {
      // Process tasks
      if (results?.tasks && results.tasks.length > 0) {
        console.log(`[SlackAIResultsHandler] Creating ${results.tasks.length} task suggestions`);
        
        let createdCount = 0;
        let failedCount = 0;
        
        for (const task of results.tasks) {
          try {
            // Create task suggestion in database
            const suggestion = await invoke('create_task_suggestion', {
              projectId,
              channelId: channelId || '',
              messageId: `ai-${jobId}-${createdCount}`, // Unique message ID for AI-generated tasks
              title: task.title,
              description: task.description || '',
              confidence: task.confidence || 0.8, // Default confidence for AI tasks
              source: 'ai_analysis',
              priority: task.priority || 'medium',
              jobId: jobId,
              analysisType: 'task_discovery'
            });
            
            if (suggestion) {
              createdCount++;
              console.log(`✅ Created task suggestion: ${task.title}`);
            } else {
              failedCount++;
              console.log(`❌ Failed to create task suggestion: ${task.title}`);
            }
          } catch (error) {
            failedCount++;
            console.error(`Error creating task suggestion:`, error);
          }
        }
        
        console.log(`[SlackAIResultsHandler] Task creation complete:`, {
          total: results.tasks.length,
          created: createdCount,
          failed: failedCount
        });
        
        // Show success notification
        if (createdCount > 0) {
          await eventBus.emit('ui.notification.show', {
            type: 'success',
            title: 'Tasks Discovered',
            message: `Found ${createdCount} new task${createdCount > 1 ? 's' : ''} from Slack messages`,
            duration: 5000
          });
        }
      }
      
      // Process events (if any)
      if (results?.events && results.events.length > 0) {
        console.log(`[SlackAIResultsHandler] Processing ${results.events.length} events`);
        
        for (const event of results.events) {
          try {
            // Create event in database
            await invoke('create_event', {
              projectId: projectId,
              title: event.title,
              description: event.description || '',
              startDate: event.date || new Date().toISOString(),
              endDate: event.endDate || event.date || new Date().toISOString(),
              source: 'slack_ai_analysis'
            });
            
            console.log(`✅ Created event: ${event.title}`);
          } catch (error) {
            console.error(`Error creating event:`, error);
          }
        }
      }
      
      // Process project updates (if any)
      if (results?.updates && results.updates.length > 0) {
        console.log(`[SlackAIResultsHandler] Processing ${results.updates.length} project updates`);
        
        let updatesProcessed = 0;
        
        for (const update of results.updates) {
          try {
            // Store project update suggestion for user review
            const suggestionId = await invoke('store_project_update_suggestion', {
              project_id: projectId,
              suggestion_type: 'ai_insight',
              title: `AI-Detected Project Update`,
              description: `AI analysis of Slack messages has detected a project update: ${update}`,
              suggested_changes: {
                field: 'description', // Could be status, progress, etc. based on update content
                value: update,
                action: 'append_note',
                source: 'slack_ai_analysis'
              },
              confidence: 0.75, // Moderate confidence for AI-detected updates
              source: `slack_channel_${channelId}`,
              source_messages: [], // Could include message IDs that triggered this update
              metadata: {
                jobId: jobId,
                channelId: channelId,
                analysisTimestamp: new Date().toISOString(),
                updateType: 'ai_extracted_status'
              }
            });
            
            console.log(`✅ Created project update suggestion: ${suggestionId} for "${update}"`);
            updatesProcessed++;
            
          } catch (error) {
            console.error(`Error processing project update "${update}":`, error);
          }
        }
        
        if (updatesProcessed > 0) {
          // Emit event to notify UI of new project update suggestions
          await eventBus.emit('project.updates.available', {
            projectId: projectId,
            count: updatesProcessed,
          });
          
          console.log(`[SlackAIResultsHandler] Created ${updatesProcessed} project update suggestions for review`);
        }
      }
      
      console.log(`[SlackAIResultsHandler] Completed processing AI results for job ${jobId}`);
      
    } catch (error) {
      console.error(`[SlackAIResultsHandler] Failed to process AI results:`, error);
      
      // Show error notification
      await eventBus.emit('ui.notification.show', {
        type: 'error',
        title: 'Failed to Process AI Results',
        message: 'Some tasks could not be created from the AI analysis',
        duration: 5000
      });
    }
  }

  /**
   * Clean up handler
   */
  static cleanup(): void {
    if (this.isInitialized) {
      eventBus.off('ai.analysis.completed');
      this.isInitialized = false;
      this.processedJobs.clear();
      console.log('[SlackAIResultsHandler] Cleaned up event handlers');
    }
  }
}