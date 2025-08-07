import express from 'express';
import { analyzeTasksFromMessages } from '../chains/taskAnalysis.chain.js';
import { analyzeProjectUpdates } from '../chains/projectUpdate.chain.js';
import { summarizeText, summarizeSlackConversation } from '../chains/smartSummary.chain.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { analysisQueue } from '../queues/analysis.queue.js';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const router = express.Router();

// Request schemas
const TaskAnalysisRequest = z.object({
  messages: z.array(z.object({
    text: z.string(),
    user: z.string(),
    timestamp: z.string()
  })).or(z.string()),
  context: z.object({
    project_id: z.string().optional(),
    project_name: z.string().optional(),
    team_members: z.array(z.string()).optional()
  }).optional(),
  model: z.enum(['openai', 'anthropic', 'gemini']).optional().default('gemini')
});

const ProjectUpdateRequest = z.object({
  messages: z.array(z.object({
    text: z.string(),
    user: z.string(),
    timestamp: z.string()
  })).or(z.string()),
  project_context: z.object({
    project_id: z.string(),
    project_name: z.string(),
    current_status: z.string().optional(),
    team_members: z.array(z.string()).optional()
  }),
  model: z.enum(['openai', 'anthropic', 'gemini']).optional().default('gemini')
});

const SummaryRequest = z.object({
  text: z.string().or(z.array(z.object({
    text: z.string(),
    user: z.string(),
    timestamp: z.string()
  }))),
  type: z.enum(['text', 'slack_conversation']).optional().default('text'),
  options: z.object({
    model: z.enum(['openai', 'anthropic', 'gemini']).optional().default('gemini'),
    max_length: z.number().optional()
  }).optional()
});

// Routes

// Analyze tasks from messages
router.post('/analyze-tasks', 
  rateLimiter({ windowMs: 60000, max: 30 }), // 30 requests per minute
  validateRequest(TaskAnalysisRequest),
  async (req, res, next) => {
    try {
      const { messages, context, model } = req.body;
      
      logger.info('Task analysis request received', { model });
      
      const result = await analyzeTasksFromMessages(messages, context, model);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Analyze project updates
router.post('/analyze-project-updates',
  rateLimiter({ windowMs: 60000, max: 30 }),
  validateRequest(ProjectUpdateRequest),
  async (req, res, next) => {
    try {
      const { messages, project_context, model } = req.body;
      
      logger.info('Project update analysis request received', { 
        project_id: project_context.project_id,
        model 
      });
      
      const result = await analyzeProjectUpdates(messages, project_context, model);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Summarize text or conversations
router.post('/summarize',
  rateLimiter({ windowMs: 60000, max: 50 }),
  validateRequest(SummaryRequest),
  async (req, res, next) => {
    try {
      const { text, type, options = {} } = req.body;
      
      logger.info('Summary request received', { type, model: options.model });
      
      let summary;
      if (type === 'slack_conversation' && Array.isArray(text)) {
        summary = await summarizeSlackConversation(text, options);
      } else {
        const textContent = Array.isArray(text) 
          ? text.map(m => `${m.user}: ${m.text}`).join('\n')
          : text;
        summary = await summarizeText(textContent, options);
      }
      
      res.json({
        success: true,
        data: { summary },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Queue analysis job for background processing
router.post('/queue-analysis',
  rateLimiter({ windowMs: 60000, max: 100 }),
  async (req, res, next) => {
    try {
      const { type, data, options = {} } = req.body;
      
      logger.info('Queueing analysis job', { type });
      
      const job = await analysisQueue.add(type, {
        ...data,
        options
      }, {
        priority: options.priority || 0,
        delay: options.delay || 0
      });
      
      res.json({
        success: true,
        data: {
          job_id: job.id,
          status: 'queued'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get job status
router.get('/job/:jobId',
  async (req, res, next) => {
    try {
      const job = await analysisQueue.getJob(req.params.jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
      
      const state = await job.getState();
      const progress = job.progress();
      
      res.json({
        success: true,
        data: {
          id: job.id,
          state,
          progress,
          result: state === 'completed' ? job.returnvalue : null,
          error: state === 'failed' ? job.failedReason : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// API Key validation endpoint
router.post('/validate-api-key',
  rateLimiter,
  async (req, res, next) => {
    try {
      const { apiKey, provider = 'gemini' } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'API key is required'
        });
      }

      let isValid = false;
      let errorMessage = '';

      try {
        if (provider === 'gemini') {
          // Test the API key by creating a simple model instance and making a minimal call
          const testModel = new ChatGoogleGenerativeAI({
            modelName: 'gemini-1.5-pro-latest',
            temperature: 0.1,
            maxOutputTokens: 10,
            apiKey: apiKey
          });

          // Make a simple test call
          await testModel.invoke([{ role: 'user', content: 'test' }]);
          isValid = true;
        }
      } catch (error) {
        console.log('[API-KEY-VALIDATION] Error:', error.message);
        isValid = false;
        
        if (error.message.includes('API key')) {
          errorMessage = 'Invalid API key';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage = 'API quota exceeded';
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          errorMessage = 'Authentication failed';
        } else {
          errorMessage = 'API connection failed';
        }
      }

      res.json({
        success: true,
        data: {
          isValid,
          provider,
          errorMessage: isValid ? null : errorMessage,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

// API Key status endpoint
router.get('/api-key-status',
  async (req, res, next) => {
    try {
      const status = {
        gemini: {
          configured: !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 0,
          keyLength: process.env.GOOGLE_API_KEY?.length || 0
        },
        openai: {
          configured: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0,
          keyLength: process.env.OPENAI_API_KEY?.length || 0
        },
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0,
          keyLength: process.env.ANTHROPIC_API_KEY?.length || 0
        }
      };

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

export { router as aiRouter };