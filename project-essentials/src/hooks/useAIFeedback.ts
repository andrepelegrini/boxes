import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Represents different types of AI outputs that can be rated
 */
export type AIOutputType = 'task_suggestion' | 'project_analysis' | 'insight' | 'metric' | 'timeline' | 'feedback' | 'button_click' | 'inline_edit';

/**
 * User's behavioral response to AI output
 */
export type UserBehavior = 'approve' | 'reject' | 'modify';

/**
 * Modification made by the user to AI output
 */
export interface UserModification {
  field: string;
  oldValue: string;
  newValue: string;
  modificationType: 'addition' | 'deletion' | 'modification';
}

/**
 * Context data structure for AI feedback
 */
interface FeedbackContextData {
  project_context: {
    domain: string;
    team_size: string;
    communication_style: string;
    project_type: string;
    language: string;
    industry_vertical?: string;
  };
  input_complexity: number;
  slack_message_count: number;
  domain_indicators: string[];
  communication_style: string;
}

/**
 * Response from behavioral feedback capture
 */
interface FeedbackResponse {
  feedbackId: string;
  success: boolean;
  error?: string;
}

/**
 * Hook for managing AI output feedback collection
 * 
 * This hook provides a simple interface for collecting and submitting
 * user feedback on AI-generated content, which feeds into the behavioral
 * analysis and meta-prompting systems for continuous improvement.
 */
export const useAIFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Map<string, FeedbackResponse>>(new Map());

  /**
   * Submit feedback for an AI output
   */
  const submitFeedback = useCallback(async (
    outputId: string,
    outputType: AIOutputType,
    userBehavior: UserBehavior,
    outputContent: string,
    projectId: string,
    promptUsed: string = 'unknown',
    promptVersion: string = '1.0',
    contextData: Partial<FeedbackContextData> = {},
    modifications?: UserModification[]
  ): Promise<FeedbackResponse> => {
    if (isSubmitting) {
      return { feedbackId: '', success: false, error: 'Already submitting feedback' };
    }

    setIsSubmitting(true);

    try {
      // Build complete context data with defaults
      const completeContextData: FeedbackContextData = {
        project_context: {
          domain: contextData.project_context?.domain || 'general',
          team_size: contextData.project_context?.team_size || 'medium',
          communication_style: contextData.project_context?.communication_style || 'professional',
          project_type: contextData.project_context?.project_type || 'development',
          language: contextData.project_context?.language || 'pt-BR',
          industry_vertical: contextData.project_context?.industry_vertical || ''
        },
        input_complexity: contextData.input_complexity || calculateComplexity(outputContent),
        slack_message_count: contextData.slack_message_count || 0,
        domain_indicators: contextData.domain_indicators || extractDomainIndicators(outputContent),
        communication_style: contextData.communication_style || 'professional'
      };

      const feedbackId = await invoke('capture_behavioral_feedback_advanced', {
        outputId,
        outputType,
        userBehavior,
        modifications: modifications || null,
        promptUsed,
        promptVersion,
        projectId,
        contextData: completeContextData
      }) as string;

      const response: FeedbackResponse = {
        feedbackId,
        success: true
      };

      // Store the submission result
      setSubmissions(prev => new Map(prev.set(outputId, response)));

      console.log(`✅ AI feedback submitted successfully: ${feedbackId}`);
      return response;

    } catch (error) {
      console.error('Failed to submit AI feedback:', error);
      
      const response: FeedbackResponse = {
        feedbackId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setSubmissions(prev => new Map(prev.set(outputId, response)));
      return response;

    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  /**
   * Check if feedback has been submitted for a specific output
   */
  const getFeedbackStatus = useCallback((outputId: string): FeedbackResponse | null => {
    return submissions.get(outputId) || null;
  }, [submissions]);

  /**
   * Submit positive feedback (approve)
   */
  const submitApproval = useCallback(async (
    outputId: string,
    outputType: AIOutputType,
    outputContent: string,
    projectId: string,
    promptUsed?: string,
    contextData?: Partial<FeedbackContextData>
  ) => {
    return submitFeedback(
      outputId,
      outputType,
      'approve',
      outputContent,
      projectId,
      promptUsed,
      undefined,
      contextData
    );
  }, [submitFeedback]);

  /**
   * Submit negative feedback (reject)
   */
  const submitRejection = useCallback(async (
    outputId: string,
    outputType: AIOutputType,
    outputContent: string,
    projectId: string,
    promptUsed?: string,
    contextData?: Partial<FeedbackContextData>
  ) => {
    return submitFeedback(
      outputId,
      outputType,
      'reject',
      outputContent,
      projectId,
      promptUsed,
      undefined,
      contextData
    );
  }, [submitFeedback]);

  /**
   * Submit modification feedback
   */
  const submitModification = useCallback(async (
    outputId: string,
    outputType: AIOutputType,
    outputContent: string,
    projectId: string,
    modifications: UserModification[],
    promptUsed?: string,
    contextData?: Partial<FeedbackContextData>
  ) => {
    return submitFeedback(
      outputId,
      outputType,
      'modify',
      outputContent,
      projectId,
      promptUsed,
      undefined,
      contextData,
      modifications
    );
  }, [submitFeedback]);

  /**
   * Clear all feedback submissions (useful for testing)
   */
  const clearSubmissions = useCallback(() => {
    setSubmissions(new Map());
  }, []);

  return {
    // State
    isSubmitting,
    submissions: submissions,

    // Actions
    submitFeedback,
    submitApproval,
    submitRejection,
    submitModification,
    getFeedbackStatus,
    clearSubmissions
  };
};

// Helper functions

/**
 * Calculate content complexity based on various factors
 */
function calculateComplexity(content: string): number {
  const factors = [
    content.length / 1000, // Length factor
    (content.match(/\n/g) || []).length / 10, // Structure factor
    (content.match(/[A-Z][a-z]+/g) || []).length / 50, // Capitalized words factor
    (content.match(/\d+/g) || []).length / 20 // Numbers factor
  ];
  
  return Math.min(1.0, factors.reduce((sum, factor) => sum + factor, 0) / factors.length);
}

/**
 * Extract domain indicators from content
 */
function extractDomainIndicators(content: string): string[] {
  const indicators = [];
  const techKeywords = ['API', 'database', 'frontend', 'backend', 'deploy', 'código', 'software'];
  const marketingKeywords = ['campanha', 'marca', 'audiência', 'conversão', 'marketing'];
  const designKeywords = ['interface', 'wireframe', 'protótipo', 'experiência do usuário', 'design'];
  const projectKeywords = ['tarefa', 'projeto', 'deadline', 'entrega', 'milestone'];
  
  const lowercaseContent = content.toLowerCase();
  
  if (techKeywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))) {
    indicators.push('technology');
  }
  if (marketingKeywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))) {
    indicators.push('marketing');
  }
  if (designKeywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))) {
    indicators.push('design');
  }
  if (projectKeywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))) {
    indicators.push('project_management');
  }
  
  return indicators.length > 0 ? indicators : ['general'];
}

export default useAIFeedback;