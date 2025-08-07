import { useWhatsApp } from '../contexts/WhatsAppContext';
import { UnifiedAIAnalysisService } from './UnifiedAIAnalysisService';
import { GlobalTaskDiscoveryService } from './GlobalTaskDiscoveryService';
import { WhatsAppMessage } from '../contexts/WhatsAppContext';

interface TaskExtractionResult {
  isWorkRelated: boolean;
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  extractedTasks: Array<{
    title: string;
    description: string;
    priority: string;
    assignee?: string;
    dueDate?: string;
    tags?: string[];
  }>;
  confidence: number;
}

export class WhatsAppTaskService {
  private static instance: WhatsAppTaskService;
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  private constructor() {}

  public static getInstance(): WhatsAppTaskService {
    if (!WhatsAppTaskService.instance) {
      WhatsAppTaskService.instance = new WhatsAppTaskService();
    }
    return WhatsAppTaskService.instance;
  }

  /**
   * Start automatic processing of WhatsApp messages for task discovery
   */
  public startAutoProcessing(): void {
    if (this.isProcessing) {
      console.log('WhatsApp task processing already running');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting WhatsApp task discovery processing...');

    // Process messages every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processUnprocessedMessages();
    }, 30000);

    // Process immediately
    this.processUnprocessedMessages();
  }

  /**
   * Stop automatic processing
   */
  public stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    console.log('⏹️ Stopped WhatsApp task discovery processing');
  }

  /**
   * Process unprocessed WhatsApp messages
   */
  private async processUnprocessedMessages(): Promise<void> {
    try {
      // This would be called from a context or hook, but for service we'll use invoke directly
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Get unprocessed messages (limit to 10 at a time)
      const messages = await invoke<WhatsAppMessage[]>('whatsapp_get_unprocessed_messages', { limit: 10 });
      
      if (messages.length === 0) {
        return;
      }

      console.log(`📱 Processing ${messages.length} WhatsApp messages for task discovery...`);

      for (const message of messages) {
        try {
          await this.processMessage(message);
        } catch (error) {
          console.error(`Failed to process message ${message.id}:`, error);
          
          // Mark as processed even if failed to avoid infinite retry
          await invoke('whatsapp_mark_processed', {
            messageId: message.id,
            workRelated: false,
            taskPriority: null,
          });
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp messages:', error);
    }
  }

  /**
   * Process a single WhatsApp message for task extraction
   */
  private async processMessage(message: WhatsAppMessage): Promise<void> {
    try {
      // Use existing AI analysis service
      const aiService = UnifiedAIAnalysisService.getInstance();
      
      // Prepare message for analysis
      const messageContext = {
        id: message.id,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        chat_id: message.chat_id,
        source: 'whatsapp' as const,
      };

      // Analyze message for work-related content and tasks
      const analysisResult = await this.analyzeMessageForTasks(messageContext);

      // Mark message as processed
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('whatsapp_mark_processed', {
        messageId: message.id,
        workRelated: analysisResult.isWorkRelated,
        taskPriority: analysisResult.taskPriority || null,
      });

      // If work-related and has tasks, add to global task discovery
      if (analysisResult.isWorkRelated && analysisResult.extractedTasks.length > 0) {
        await this.createTasksFromMessage(message, analysisResult);
      }

      console.log(`✅ Processed WhatsApp message ${message.id}: ${analysisResult.isWorkRelated ? 'work-related' : 'personal'}`);
    } catch (error) {
      console.error(`Error processing WhatsApp message ${message.id}:`, error);
      throw error;
    }
  }

  /**
   * Analyze message content for work-related tasks
   */
  private async analyzeMessageForTasks(messageContext: any): Promise<TaskExtractionResult> {
    try {
      const aiService = UnifiedAIAnalysisService.getInstance();
      
      // Create analysis prompt for WhatsApp messages
      const prompt = `
Analyze this WhatsApp message for work-related content and potential tasks:

Message: "${messageContext.content}"
Sender: ${messageContext.sender}
Timestamp: ${new Date(messageContext.timestamp * 1000).toLocaleString()}

Please determine:
1. Is this message work-related? (true/false)
2. What is the priority level? (low/medium/high/urgent)
3. Extract any actionable tasks from the message
4. Provide confidence level (0-1)

Respond in JSON format:
{
  "isWorkRelated": boolean,
  "taskPriority": "low|medium|high|urgent",
  "extractedTasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "low|medium|high|urgent",
      "assignee": "person if mentioned",
      "dueDate": "YYYY-MM-DD if mentioned",
      "tags": ["tag1", "tag2"]
    }
  ],
  "confidence": 0.8
}`;

      // Use the existing AI service to analyze
      const result = await aiService.analyzeMessages([messageContext], 'whatsapp');
      
      // Parse the AI response
      if (result && result.length > 0) {
        const analysis = result[0];
        return this.parseAIAnalysisResult(analysis);
      }

      // Fallback if AI analysis fails
      return {
        isWorkRelated: false,
        extractedTasks: [],
        confidence: 0.1,
      };
    } catch (error) {
      console.error('Error analyzing message for tasks:', error);
      
      // Simple keyword-based fallback
      return this.fallbackTaskAnalysis(messageContext.content);
    }
  }

  /**
   * Parse AI analysis result into structured format
   */
  private parseAIAnalysisResult(analysis: any): TaskExtractionResult {
    try {
      // The analysis should contain the AI response
      const aiResponse = analysis.analysis || analysis.result || '';
      
      // Try to parse JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isWorkRelated: parsed.isWorkRelated || false,
          taskPriority: parsed.taskPriority,
          extractedTasks: parsed.extractedTasks || [],
          confidence: parsed.confidence || 0.5,
        };
      }

      // Fallback to extracting from text
      const isWorkRelated = aiResponse.toLowerCase().includes('work-related: true') ||
                           aiResponse.toLowerCase().includes('work related') ||
                           aiResponse.toLowerCase().includes('task:');
      
      return {
        isWorkRelated,
        extractedTasks: [],
        confidence: isWorkRelated ? 0.6 : 0.3,
      };
    } catch (error) {
      console.error('Error parsing AI analysis result:', error);
      return {
        isWorkRelated: false,
        extractedTasks: [],
        confidence: 0.1,
      };
    }
  }

  /**
   * Fallback task analysis using simple keyword matching
   */
  private fallbackTaskAnalysis(content: string): TaskExtractionResult {
    const workKeywords = [
      'meeting', 'deadline', 'project', 'task', 'urgent', 'asap',
      'client', 'document', 'review', 'approval', 'submit',
      'complete', 'finish', 'deliver', 'presentation', 'report'
    ];

    const urgentKeywords = ['urgent', 'asap', 'immediately', 'priority', 'critical'];
    
    const contentLower = content.toLowerCase();
    const hasWorkKeywords = workKeywords.some(keyword => contentLower.includes(keyword));
    const hasUrgentKeywords = urgentKeywords.some(keyword => contentLower.includes(keyword));

    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
    if (hasUrgentKeywords) priority = 'urgent';
    else if (hasWorkKeywords && content.includes('!')) priority = 'high';
    else if (hasWorkKeywords) priority = 'medium';

    return {
      isWorkRelated: hasWorkKeywords,
      taskPriority: hasWorkKeywords ? priority : undefined,
      extractedTasks: [],
      confidence: hasWorkKeywords ? 0.4 : 0.2,
    };
  }

  /**
   * Create tasks from analyzed message
   */
  private async createTasksFromMessage(
    message: WhatsAppMessage,
    analysis: TaskExtractionResult
  ): Promise<void> {
    try {
      const globalTaskService = GlobalTaskDiscoveryService.getInstance();

      // If no specific tasks extracted, create a general task from the message
      if (analysis.extractedTasks.length === 0) {
        const generalTask = {
          title: `WhatsApp message from ${message.sender}`,
          description: message.content,
          priority: analysis.taskPriority || 'medium',
          source: 'whatsapp',
          sourceMetadata: {
            messageId: message.id,
            chatId: message.chat_id,
            sender: message.sender,
            timestamp: message.timestamp,
          },
          confidence: analysis.confidence,
        };

        await globalTaskService.addDiscoveredTask(generalTask);
      } else {
        // Create specific tasks
        for (const task of analysis.extractedTasks) {
          const discoveredTask = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            assignee: task.assignee,
            dueDate: task.dueDate,
            tags: task.tags,
            source: 'whatsapp',
            sourceMetadata: {
              messageId: message.id,
              chatId: message.chat_id,
              sender: message.sender,
              timestamp: message.timestamp,
            },
            confidence: analysis.confidence,
          };

          await globalTaskService.addDiscoveredTask(discoveredTask);
        }
      }
    } catch (error) {
      console.error('Error creating tasks from message:', error);
    }
  }

  /**
   * Get processing status
   */
  public getStatus(): { isProcessing: boolean; lastProcessed?: Date } {
    return {
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Manual trigger to process all unprocessed messages
   */
  public async processAllMessages(): Promise<void> {
    console.log('🔄 Manually triggering WhatsApp message processing...');
    await this.processUnprocessedMessages();
  }
}

// Export singleton instance
export const whatsAppTaskService = WhatsAppTaskService.getInstance();