// Slack Task Discovery Service with Database Operations

export interface TaskSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  projectId: string;
  channelId: string;
  messageId: string;
  sourceContext?: any;
  createdAt: string;
  updatedAt: string;
  // Additional properties that may be present from AI analysis or DB
  sourceConversationType?: 'dm' | 'group' | 'private_channel' | 'public_channel';
  sourceConversationName?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  messageText?: string;
  messageUser?: string;
}

export class SlackTaskDiscoveryService {
  static async analyzeChannelForTasks(projectId: string, channelId: string): Promise<TaskSuggestion[]> {
    console.log(`🤖 Analyzing tasks for project ${projectId}, channel ${channelId}`);
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      // Get existing task suggestions for this project and channel
      const suggestions = await db.select<Array<{
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
        'SELECT * FROM slack_derived_tasks WHERE projectId = ? AND channelId = ? ORDER BY createdAt DESC',
        [projectId, channelId]
      );
      
      return suggestions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        confidence: s.confidence,
        status: s.status as 'pending' | 'accepted' | 'rejected',
        projectId: s.projectId,
        channelId: s.channelId,
        messageId: s.messageId,
        sourceContext: s.sourceContext ? JSON.parse(s.sourceContext) : undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));
    } catch (error) {
      console.error('❌ Failed to analyze channel for tasks:', error);
      return [];
    }
  }

  static async getTaskSuggestions(projectId: string): Promise<TaskSuggestion[]> {
    console.log(`📋 Getting task suggestions for project ${projectId}`);
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const suggestions = await db.select<Array<{
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
        'SELECT * FROM slack_derived_tasks WHERE projectId = ? AND status = ? ORDER BY confidence DESC, createdAt DESC',
        [projectId, 'suggested']
      );
      
      return suggestions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        confidence: s.confidence,
        status: s.status as 'pending' | 'accepted' | 'rejected',
        projectId: s.projectId,
        channelId: s.channelId,
        messageId: s.messageId,
        sourceContext: s.sourceContext ? JSON.parse(s.sourceContext) : undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));
    } catch (error) {
      console.error('❌ Failed to get task suggestions:', error);
      return [];
    }
  }

  static async acceptTaskSuggestion(suggestionId: string): Promise<void> {
    console.log(`✅ Accepting task suggestion ${suggestionId}`);
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.execute(
        'UPDATE slack_derived_tasks SET status = ?, updatedAt = ? WHERE id = ?',
        ['accepted', new Date().toISOString(), suggestionId]
      );
      
      if (result.rowsAffected === 0) {
        console.warn('⚠️ No task suggestion found to accept:', suggestionId);
      } else {
        console.log('✅ Task suggestion accepted successfully:', suggestionId);
      }
    } catch (error) {
      console.error('❌ Failed to accept task suggestion:', error);
      throw error;
    }
  }

  static async rejectTaskSuggestion(suggestionId: string): Promise<void> {
    console.log(`❌ Rejecting task suggestion ${suggestionId}`);
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      
      const result = await db.execute(
        'UPDATE slack_derived_tasks SET status = ?, updatedAt = ? WHERE id = ?',
        ['rejected', new Date().toISOString(), suggestionId]
      );
      
      if (result.rowsAffected === 0) {
        console.warn('⚠️ No task suggestion found to reject:', suggestionId);
      } else {
        console.log('✅ Task suggestion rejected successfully:', suggestionId);
      }
    } catch (error) {
      console.error('❌ Failed to reject task suggestion:', error);
      throw error;
    }
  }

  static async createTaskSuggestion(
    projectId: string,
    channelId: string,
    messageId: string,
    title: string,
    description: string,
    confidence: number,
    sourceContext?: any
  ): Promise<TaskSuggestion | null> {
    console.log(`🎯 Creating task suggestion for project ${projectId}`);
    
    try {
      const { initDatabase } = await import('../../../utils/database');
      const db = await initDatabase();
      const now = new Date().toISOString();
      
      await db.execute(
        `INSERT INTO slack_derived_tasks (
          projectId, channelId, messageId, title, description, 
          priority, status, confidence, sourceContext, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          channelId,
          messageId,
          title,
          description,
          'medium', // default priority
          'suggested', // default status
          confidence,
          sourceContext ? JSON.stringify(sourceContext) : null,
          now,
          now
        ]
      );
      
      const result = await db.select<Array<{ id: number }>>('SELECT last_insert_rowid() as id');
      const id = result[0].id;
      
      const suggestion: TaskSuggestion = {
        id: id.toString(),
        title,
        description,
        confidence,
        status: 'pending',
        projectId,
        channelId,
        messageId,
        sourceContext,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('✅ Task suggestion created successfully:', id);
      return suggestion;
    } catch (error) {
      console.error('❌ Failed to create task suggestion:', error);
      return null;
    }
  }
}

// Export instance for compatibility
export const slackTaskDiscoveryService = new SlackTaskDiscoveryService();