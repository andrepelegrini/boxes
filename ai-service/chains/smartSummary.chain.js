import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { logger } from '../utils/logger.js';

// Create summarization chain with map-reduce pattern for long documents
const summaryPrompt = ChatPromptTemplate.fromTemplate(`
Summarize the following text concisely while preserving key information:

{text}

Focus on:
- Main points and decisions
- Action items
- Important dates and deadlines
- Key participants and their roles

Summary:
`);

const combineSummariesPrompt = ChatPromptTemplate.fromTemplate(`
Combine these summaries into a single, coherent summary:

{summaries}

Create a comprehensive summary that:
- Maintains chronological order where relevant
- Highlights the most important information
- Removes redundancy
- Is concise but complete

Final Summary:
`);

export async function createSmartSummaryChain(modelType = 'gemini') {
  logger.info('Creating smart summary chain', { modelType });
  
  let model;
  switch (modelType) {
    case 'anthropic':
      model = new ChatAnthropic({
        modelName: 'claude-3-haiku-20240307', // Faster model for summaries
        temperature: 0.3,
        maxTokens: 1024
      });
      break;
    case 'gemini':
      model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-1.5-pro-latest',
        temperature: 0.3,
        maxTokens: 1024
      });
      break;
    case 'openai':
    default:
      model = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo', // Cost-effective for summaries
        temperature: 0.3,
        maxTokens: 1024
      });
  }

  // Chain for individual chunk summaries
  const summaryChain = RunnableSequence.from([
    summaryPrompt,
    model,
    new StringOutputParser()
  ]);

  // Chain for combining summaries
  const combineChain = RunnableSequence.from([
    combineSummariesPrompt,
    model,
    new StringOutputParser()
  ]);

  return { summaryChain, combineChain };
}

export async function summarizeText(text, options = {}) {
  const {
    modelType = 'gemini',
    chunkSize = 4000,
    chunkOverlap = 200,
    maxSummaryLength = 1000
  } = options;

  try {
    logger.info('Starting text summarization', { 
      textLength: text.length,
      modelType 
    });

    // If text is short enough, summarize directly
    if (text.length < chunkSize) {
      const { summaryChain } = await createSmartSummaryChain(modelType);
      const summary = await summaryChain.invoke({ text });
      return summary;
    }

    // For longer texts, use map-reduce pattern
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap
    });

    const chunks = await splitter.splitText(text);
    logger.info(`Split text into ${chunks.length} chunks`);

    const { summaryChain, combineChain } = await createSmartSummaryChain(modelType);

    // Summarize each chunk
    const chunkSummaries = await Promise.all(
      chunks.map(chunk => summaryChain.invoke({ text: chunk }))
    );

    // Combine all summaries
    const finalSummary = await combineChain.invoke({
      summaries: chunkSummaries.join('\n\n')
    });

    logger.info('Summarization completed', { 
      finalLength: finalSummary.length 
    });

    return finalSummary;
  } catch (error) {
    logger.error('Summarization failed', error);
    throw error;
  }
}

// Specialized summary for Slack conversations
export async function summarizeSlackConversation(messages, options = {}) {
  const conversationText = messages
    .map(m => `[${m.timestamp}] ${m.user}: ${m.text}`)
    .join('\n');

  const context = `This is a Slack conversation with ${messages.length} messages.`;
  
  return summarizeText(`${context}\n\n${conversationText}`, {
    ...options,
    modelType: options.modelType || 'gemini'
  });
}