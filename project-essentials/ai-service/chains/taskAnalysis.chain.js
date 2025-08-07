import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { 
  ChatPromptTemplate, 
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate 
} from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { logger } from '../utils/logger.js';

// Define output schemas
const DetectedTaskSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().describe('Detailed task description'),
  assignee: z.string().optional().describe('Person assigned to the task'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Task priority'),
  status: z.enum(['new', 'in_progress', 'completed', 'blocked']).describe('Task status'),
  source_message: z.string().describe('Original message that mentioned this task'),
  source_user: z.string().describe('User who mentioned this task'),
  source_timestamp: z.string().optional().describe('When the task was mentioned'),
  estimated_hours: z.number().optional().describe('Estimated hours to complete'),
  due_date: z.string().optional().describe('Task due date'),
  tags: z.array(z.string()).describe('Task tags/labels')
});

const TaskAnalysisOutputSchema = z.object({
  tasks: z.array(DetectedTaskSchema).describe('List of detected tasks'),
  summary: z.string().describe('Summary of the analysis'),
  confidence_score: z.number().min(0).max(1).describe('Confidence in the analysis')
});

// Create the output parser
const outputParser = StructuredOutputParser.fromZodSchema(TaskAnalysisOutputSchema);

// System prompt for task analysis
const systemTemplate = `You are an AI assistant specialized in analyzing conversations and extracting actionable tasks.
Your job is to identify tasks, action items, and work that needs to be done from the given messages.

Focus on:
1. Explicit task mentions ("we need to...", "please do...", "action item:", etc.)
2. Implicit tasks (commitments, promises, deadlines mentioned)
3. Follow-ups needed
4. Decisions that require action

For each task, extract as much relevant information as possible.

{format_instructions}`;

// Create prompt template
const taskAnalysisPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(systemTemplate),
  HumanMessagePromptTemplate.fromTemplate(`
Analyze these messages for tasks and action items:

{messages}

Context about the project:
{context}
`)
]);

// Create the chain
export async function createTaskAnalysisChain(modelType = 'gemini') {
  logger.info('Creating task analysis chain', { modelType });
  
  // Select model based on type
  let model;
  switch (modelType) {
    case 'anthropic':
      model = new ChatAnthropic({
        modelName: 'claude-3-opus-20240229',
        temperature: 0.1,
        maxTokens: 4096
      });
      break;
    case 'openai':
      model = new ChatOpenAI({
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.1,
        maxTokens: 4096
      });
      break;
    case 'gemini':
    default:
      const apiKey = process.env.GOOGLE_API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Google API key is missing or empty. Please set GOOGLE_API_KEY in your environment file.');
      }
      
      model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-1.5-pro-latest',
        temperature: 0.1,
        maxOutputTokens: 4096,
        apiKey: apiKey
      });
  }

  // Create the chain using LCEL (LangChain Expression Language)
  const chain = RunnableSequence.from([
    {
      messages: (input) => input.messages,
      context: (input) => input.context,
      format_instructions: () => outputParser.getFormatInstructions()
    },
    taskAnalysisPrompt,
    model,
    outputParser
  ]);

  return chain;
}

// Analyze messages for tasks
export async function analyzeTasksFromMessages(messages, context = {}, modelType = 'gemini') {
  try {
    logger.info('Analyzing messages for tasks', { 
      messageCount: Array.isArray(messages) ? messages.length : 1,
      modelType 
    });

    const chain = await createTaskAnalysisChain(modelType);
    
    // Format messages for analysis
    const formattedMessages = Array.isArray(messages) 
      ? messages.map(m => `[${m.timestamp}] ${m.user}: ${m.text}`).join('\n')
      : messages;

    const result = await chain.invoke({
      messages: formattedMessages,
      context: JSON.stringify(context)
    });

    logger.info('Task analysis completed', {
      tasksFound: result.tasks.length,
      confidence: result.confidence_score
    });

    return result;
  } catch (error) {
    logger.error('Task analysis failed', error);
    throw error;
  }
}