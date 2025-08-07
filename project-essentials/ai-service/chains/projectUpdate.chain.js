import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { logger } from '../utils/logger.js';

// Define schemas for project updates
const ProjectUpdateSchema = z.object({
  project_name: z.string().describe('Name of the project'),
  update_type: z.enum(['progress', 'blocker', 'milestone', 'risk', 'general']).describe('Type of update'),
  summary: z.string().describe('Brief summary of the update'),
  details: z.string().describe('Detailed description'),
  impact: z.enum(['low', 'medium', 'high']).describe('Impact level of the update'),
  action_required: z.boolean().describe('Whether action is required'),
  mentioned_by: z.string().describe('Who mentioned this update'),
  timestamp: z.string().describe('When this was mentioned')
});

const ProjectAnalysisOutputSchema = z.object({
  updates: z.array(ProjectUpdateSchema).describe('List of project updates'),
  overall_health: z.enum(['healthy', 'at-risk', 'critical']).describe('Overall project health assessment'),
  key_risks: z.array(z.string()).describe('Key risks identified'),
  recommendations: z.array(z.string()).describe('Recommendations for the project'),
  summary: z.string().describe('Executive summary of project status')
});

const outputParser = StructuredOutputParser.fromZodSchema(ProjectAnalysisOutputSchema);

// Create the prompt template
const projectUpdatePrompt = ChatPromptTemplate.fromTemplate(`
You are a project management AI assistant analyzing team communications for project updates and status.

Analyze the following messages for project-related updates, progress, blockers, and risks:

Messages:
{messages}

Project Context:
{context}

Focus on identifying:
1. Progress updates and milestones achieved
2. Blockers and challenges
3. Risks and concerns raised
4. Decisions made
5. Changes in timeline or scope

{format_instructions}
`);

export async function createProjectUpdateChain(modelType = 'gemini') {
  logger.info('Creating project update analysis chain', { modelType });
  
  let model;
  switch (modelType) {
    case 'anthropic':
      model = new ChatAnthropic({
        modelName: 'claude-3-sonnet-20240229',
        temperature: 0.2,
        maxTokens: 4096
      });
      break;
    case 'gemini':
      model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-1.5-pro-latest',
        temperature: 0.2,
        maxTokens: 4096
      });
      break;
    case 'openai':
    default:
      model = new ChatOpenAI({
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.2,
        maxTokens: 4096
      });
  }

  const chain = RunnableSequence.from([
    {
      messages: (input) => input.messages,
      context: (input) => input.context,
      format_instructions: () => outputParser.getFormatInstructions()
    },
    projectUpdatePrompt,
    model,
    outputParser
  ]);

  return chain;
}

export async function analyzeProjectUpdates(messages, projectContext = {}, modelType = 'gemini') {
  try {
    logger.info('Analyzing messages for project updates', { 
      messageCount: Array.isArray(messages) ? messages.length : 1 
    });

    const chain = await createProjectUpdateChain(modelType);
    
    const formattedMessages = Array.isArray(messages)
      ? messages.map(m => `[${m.timestamp}] ${m.user}: ${m.text}`).join('\n')
      : messages;

    const result = await chain.invoke({
      messages: formattedMessages,
      context: JSON.stringify(projectContext)
    });

    logger.info('Project update analysis completed', {
      updatesFound: result.updates.length,
      overallHealth: result.overall_health
    });

    return result;
  } catch (error) {
    logger.error('Project update analysis failed', error);
    throw error;
  }
}