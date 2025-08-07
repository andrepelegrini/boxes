const logger = require('../../utils/logger');
const axios = require('axios');

// WhatsApp message sync processor
async function processMessageSync(job) {
  const { chatId, lastTimestamp, syncType } = job.data;
  
  try {
    logger.info(`Processing WhatsApp message sync for chat ${chatId}`);
    
    job.progress(10);
    
    // Fetch new messages from WhatsApp
    const messages = await fetchWhatsAppMessages(chatId, lastTimestamp);
    job.progress(40);
    
    // Filter work-related messages
    const workRelatedMessages = await filterWorkRelatedMessages(messages);
    job.progress(70);
    
    // Store messages
    const storedCount = await storeWhatsAppMessages(chatId, workRelatedMessages);
    job.progress(100);
    
    logger.info(`WhatsApp sync completed for chat ${chatId}. Stored ${storedCount} work-related messages`);
    
    return {
      success: true,
      totalMessages: messages.length,
      workRelatedMessages: workRelatedMessages.length,
      storedMessages: storedCount,
      lastTimestamp: Math.max(...messages.map(m => m.timestamp))
    };
    
  } catch (error) {
    logger.error(`WhatsApp message sync failed for chat ${chatId}:`, error);
    throw error;
  }
}

// WhatsApp AI analysis processor
async function processAIAnalysis(job) {
  const { messages, analysisType, context } = job.data;
  
  try {
    logger.debug(`Processing WhatsApp AI analysis: ${analysisType}`);
    
    job.progress(20);
    
    // Prepare messages for AI analysis
    const formattedMessages = formatMessagesForAI(messages);
    job.progress(30);
    
    // Validate we have messages with text content
    if (!formattedMessages || formattedMessages.length === 0) {
      logger.info('No valid messages with text content found for AI analysis - skipping analysis');
      return {
        success: true,
        analysisType,
        result: {
          tasks: [],
          summary: 'No text messages found to analyze',
          confidence: 0
        },
        messagesAnalyzed: 0,
        timestamp: new Date().toISOString(),
        skipped: true,
        reason: 'No valid text content found'
      };
    }
    
    // Call AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3002';
    let analysisResult;
    
    if (analysisType === 'task-detection') {
      const response = await axios.post(`${aiServiceUrl}/analyze-tasks`, {
        messages: formattedMessages,
        context: context,
        model: 'gemini'
      });
      analysisResult = response.data;
    } else if (analysisType === 'sentiment-analysis') {
      const response = await axios.post(`${aiServiceUrl}/api/ai/summarize`, {
        text: formattedMessages.map(m => m.text).join('\n'),
        type: 'sentiment',
        options: { includeSentiment: true }
      });
      analysisResult = response.data;
    }
    
    job.progress(80);
    
    // Process and store results
    const processedResult = await processAnalysisResult(analysisResult, analysisType);
    job.progress(100);
    
    logger.debug(`WhatsApp AI analysis completed: ${analysisType}`);
    
    return {
      success: true,
      analysisType,
      result: processedResult,
      messagesAnalyzed: messages.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`WhatsApp AI analysis failed for ${analysisType}:`, error);
    throw error;
  }
}

// Helper functions
async function fetchWhatsAppMessages(chatId, lastTimestamp) {
  logger.info(`Fetching WhatsApp messages for chat ${chatId} since ${lastTimestamp}`);
  
  // Simulate fetching from WhatsApp service
  // In real implementation, this would interface with WhatsApp Web API or local database
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock messages
  return [
    {
      id: `msg_${Date.now()}_1`,
      chatId,
      sender: '+1234567890',
      text: 'Can you review the project proposal by tomorrow?',
      timestamp: Date.now(),
      type: 'text'
    },
    {
      id: `msg_${Date.now()}_2`,
      chatId,
      sender: '+0987654321',
      text: 'Sure, I\'ll have it ready by EOD',
      timestamp: Date.now() + 300000,
      type: 'text'
    },
    {
      id: `msg_${Date.now()}_3`,
      chatId,
      sender: '+1234567890',
      text: 'Great! Also, remember we have the client call at 3 PM',
      timestamp: Date.now() + 600000,
      type: 'text'
    }
  ];
}

async function filterWorkRelatedMessages(messages) {
  logger.info(`Filtering ${messages.length} messages for work-related content`);
  
  // Simple keyword-based filtering (in real implementation, would use AI)
  const workKeywords = [
    'project', 'client', 'meeting', 'deadline', 'review', 'proposal',
    'call', 'presentation', 'budget', 'schedule', 'task', 'work'
  ];
  
  return messages.filter(message => {
    const text = message.text.toLowerCase();
    return workKeywords.some(keyword => text.includes(keyword));
  });
}

async function storeWhatsAppMessages(chatId, messages) {
  logger.info(`Storing ${messages.length} WhatsApp messages for chat ${chatId}`);
  
  try {
    // Would integrate with database service
    const databaseServiceUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3004';
    
    let storedCount = 0;
    for (const message of messages) {
      try {
        await axios.post(`${databaseServiceUrl}/api/whatsapp/messages`, {
          ...message,
          workRelated: true,
          processedAt: new Date().toISOString()
        });
        storedCount++;
      } catch (error) {
        logger.error(`Failed to store message ${message.id}:`, error);
      }
    }
    
    return storedCount;
  } catch (error) {
    logger.error('Failed to store WhatsApp messages:', error);
    return 0;
  }
}

function formatMessagesForAI(messages) {
  return messages.filter(message => {
    const text = message.body || message.text;
    return text && text.trim();
  }).map(message => ({
    text: message.body || message.text,
    user: message.from || message.sender,
    timestamp: message.timestamp
  }));
}

async function processAnalysisResult(result, analysisType) {
  logger.info(`Processing analysis result for type: ${analysisType}`);
  
  if (analysisType === 'task-detection') {
    return {
      tasks: result.tasks || [],
      summary: result.summary || '',
      confidence: result.confidence_score || 0.7
    };
  } else if (analysisType === 'sentiment-analysis') {
    return {
      sentiment: result.sentiment || 'neutral',
      summary: result.summary || '',
      keyTopics: result.keyTopics || []
    };
  }
  
  return result;
}

module.exports = {
  processMessageSync,
  processAIAnalysis
};