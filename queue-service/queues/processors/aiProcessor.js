const logger = require('../../utils/logger');
const axios = require('axios');

// Task detection processor
async function processTaskDetection(job) {
  const { messages, projectContext, options } = job.data;
  
  try {
    logger.info('Processing AI task detection');
    
    job.progress(20);
    
    // Call AI service for task analysis
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.post(`${aiServiceUrl}/api/ai/analyze-tasks`, {
      messages,
      context: projectContext,
      model: options?.model || 'claude-3-sonnet'
    });
    
    job.progress(70);
    
    const taskAnalysis = response.data;
    
    // Post-process tasks
    const processedTasks = await postProcessTasks(taskAnalysis.tasks);
    job.progress(90);
    
    // Store results if needed
    if (options?.autoStore) {
      await storeTasks(projectContext?.project_id, processedTasks);
    }
    
    job.progress(100);
    
    logger.info(`Task detection completed. Found ${processedTasks.length} tasks`);
    
    return {
      success: true,
      tasks: processedTasks,
      summary: taskAnalysis.summary,
      confidence: taskAnalysis.confidence_score,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Task detection failed:', error);
    throw error;
  }
}

// Project update processor
async function processProjectUpdate(job) {
  const { messages, projectContext, updateType } = job.data;
  
  try {
    logger.info(`Processing project update analysis: ${updateType}`);
    
    job.progress(20);
    
    // Call AI service for project update analysis
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.post(`${aiServiceUrl}/api/ai/analyze-project-updates`, {
      messages,
      project_context: projectContext,
      model: 'claude-3-sonnet'
    });
    
    job.progress(70);
    
    const updateAnalysis = response.data;
    
    // Process and validate updates
    const processedUpdates = await processProjectUpdates(updateAnalysis.updates);
    job.progress(90);
    
    // Store updates if configured
    await storeProjectUpdates(projectContext?.project_id, processedUpdates);
    
    job.progress(100);
    
    logger.info(`Project update analysis completed. Found ${processedUpdates.length} updates`);
    
    return {
      success: true,
      updates: processedUpdates,
      overallHealth: updateAnalysis.overall_health,
      keyRisks: updateAnalysis.key_risks,
      recommendations: updateAnalysis.recommendations,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Project update analysis failed:', error);
    throw error;
  }
}

// Helper functions
async function postProcessTasks(tasks) {
  logger.info(`Post-processing ${tasks.length} detected tasks`);
  
  return tasks.map(task => ({
    ...task,
    id: generateTaskId(),
    status: task.status || 'pending',
    priority: normalizePriority(task.priority),
    estimatedHours: task.estimated_hours || null,
    tags: task.tags || [],
    createdAt: new Date().toISOString(),
    source: 'ai-detection'
  }));
}

async function processProjectUpdates(updates) {
  logger.info(`Processing ${updates.length} project updates`);
  
  return updates.map(update => ({
    ...update,
    id: generateUpdateId(),
    confidence: Math.min(Math.max(update.confidence || 0.7, 0), 1),
    requiresApproval: update.action_required || false,
    createdAt: new Date().toISOString(),
    source: 'ai-analysis'
  }));
}

async function storeTasks(projectId, tasks) {
  try {
    // Would integrate with database service
    const databaseServiceUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3004';
    
    for (const task of tasks) {
      await axios.post(`${databaseServiceUrl}/api/tasks`, {
        ...task,
        project_id: projectId
      });
    }
    
    logger.info(`Stored ${tasks.length} tasks for project ${projectId}`);
  } catch (error) {
    logger.error('Failed to store tasks:', error);
    // Don't throw here as the main processing succeeded
  }
}

async function storeProjectUpdates(projectId, updates) {
  try {
    // Would integrate with database service
    const databaseServiceUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3004';
    
    for (const update of updates) {
      await axios.post(`${databaseServiceUrl}/api/project-updates`, {
        ...update,
        project_id: projectId
      });
    }
    
    logger.info(`Stored ${updates.length} project updates for project ${projectId}`);
  } catch (error) {
    logger.error('Failed to store project updates:', error);
    // Don't throw here as the main processing succeeded
  }
}

function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateUpdateId() {
  return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizePriority(priority) {
  if (!priority) return 'medium';
  
  const normalizedPriority = priority.toLowerCase();
  if (['urgent', 'high', 'critical'].includes(normalizedPriority)) return 'high';
  if (['low', 'minor'].includes(normalizedPriority)) return 'low';
  return 'medium';
}

module.exports = {
  processTaskDetection,
  processProjectUpdate
};