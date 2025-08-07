import React, { useState } from 'react';
import { FiThumbsUp, FiThumbsDown, FiMessageSquare } from 'react-icons/fi';
import { useAIFeedback } from '../../hooks/useAIFeedback';

/**
 * Represents different types of AI outputs that can be rated
 */
export type AIOutputType = 'task_suggestion' | 'project_analysis' | 'insight' | 'metric' | 'timeline' | 'feedback';

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
 * Props for the AIOutputRating component
 */
interface AIOutputRatingProps {
  /** Unique identifier for the AI output being rated */
  outputId: string;
  /** Type of AI output (task, analysis, etc.) */
  outputType: AIOutputType;
  /** The actual AI-generated content */
  outputContent: string;
  /** Project context for the rating */
  projectId: string;
  /** Prompt used to generate this output */
  promptUsed?: string;
  /** Version of the prompt used */
  promptVersion?: string;
  /** Additional context data */
  contextData?: Record<string, any>;
  /** Callback when user provides rating */
  onRatingSubmitted?: (behavior: UserBehavior, modifications?: UserModification[]) => void;
  /** Whether to show compact view */
  compact?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * AIOutputRating - Component for collecting user feedback on AI-generated content
 * 
 * This component captures behavioral feedback that feeds into the meta-prompting
 * and behavioral analysis systems to improve AI output quality over time.
 * 
 * Features:
 * - Thumbs up/down rating
 * - Modification tracking when users edit content
 * - Contextual feedback collection
 * - Integration with behavioral pattern analyzer
 * - Support for different AI output types
 */
const AIOutputRating: React.FC<AIOutputRatingProps> = ({
  outputId,
  outputType,
  outputContent,
  projectId,
  promptUsed = '',
  promptVersion = '1.0',
  contextData = {},
  onRatingSubmitted,
  compact = false,
  className = ''
}) => {
  const [userBehavior, setUserBehavior] = useState<UserBehavior | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  
  const { submitFeedback, isSubmitting, getFeedbackStatus } = useAIFeedback();
  
  // Check if feedback has already been submitted
  const existingFeedback = getFeedbackStatus(outputId);

  const handleRating = async (behavior: UserBehavior) => {
    if (isSubmitting || existingFeedback?.success) return;

    setUserBehavior(behavior);

    try {
      const result = await submitFeedback(
        outputId,
        outputType,
        behavior,
        outputContent,
        projectId,
        promptUsed,
        promptVersion,
        contextData
      );

      if (result.success) {
        console.log('✅ Behavioral feedback captured:', result.feedbackId);
        
        // If user wants to provide additional feedback
        if (behavior === 'reject') {
          setShowFeedbackForm(true);
        } else {
          onRatingSubmitted?.(behavior);
        }
      } else {
        console.error('Failed to capture feedback:', result.error);
      }
    } catch (error) {
      console.error('Error capturing behavioral feedback:', error);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (isSubmitting) return;

    try {
      // Submit additional feedback if provided
      if (feedbackText.trim()) {
        const modifications: UserModification[] = [
          {
            field: 'user_feedback',
            oldValue: '',
            newValue: feedbackText,
            modificationType: 'addition'
          }
        ];

        const result = await submitFeedback(
          `${outputId}_feedback`,
          outputType,
          'modify',
          outputContent,
          projectId,
          promptUsed,
          promptVersion,
          contextData,
          modifications
        );

        if (result.success) {
          console.log('✅ Additional feedback submitted:', result.feedbackId);
        }
      }

      setShowFeedbackForm(false);
      onRatingSubmitted?.(userBehavior!, feedbackText ? [
        {
          field: 'user_feedback',
          oldValue: '',
          newValue: feedbackText,
          modificationType: 'addition'
        }
      ] : undefined);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Check if user has already provided feedback
  const hasProvidedFeedback = existingFeedback?.success || userBehavior !== null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => handleRating('approve')}
          disabled={isSubmitting || hasProvidedFeedback}
          className={`p-1 rounded transition-colors ${
            (userBehavior === 'approve' || existingFeedback?.success)
              ? 'text-green-600 bg-green-100'
              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
          } disabled:opacity-50`}
          title="Útil"
        >
          <FiThumbsUp size={14} />
        </button>
        
        <button
          onClick={() => handleRating('reject')}
          disabled={isSubmitting || hasProvidedFeedback}
          className={`p-1 rounded transition-colors ${
            (userBehavior === 'reject' || existingFeedback?.success)
              ? 'text-red-600 bg-red-100'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          } disabled:opacity-50`}
          title="Não útil"
        >
          <FiThumbsDown size={14} />
        </button>
        
        {hasProvidedFeedback && (
          <span className="text-xs text-gray-500">
            {(userBehavior === 'approve' || existingFeedback?.success) ? 'Obrigado!' : 'Feedback registrado'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">
          Esta sugestão foi útil?
        </h4>
        <div className="text-xs text-gray-500">
          {outputType.replace('_', ' ')}
        </div>
      </div>

      {!hasProvidedFeedback ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRating('approve')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
          >
            <FiThumbsUp size={16} />
            Sim, útil
          </button>
          
          <button
            onClick={() => handleRating('reject')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
          >
            <FiThumbsDown size={16} />
            Não útil
          </button>
          
          <button
            onClick={() => setShowFeedbackForm(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50"
          >
            <FiMessageSquare size={16} />
            Comentar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <div className={`flex items-center gap-1 ${
            (userBehavior === 'approve' || existingFeedback?.success) ? 'text-green-600' : 'text-red-600'
          }`}>
            {(userBehavior === 'approve' || existingFeedback?.success) ? (
              <FiThumbsUp size={16} />
            ) : (
              <FiThumbsDown size={16} />
            )}
            <span>
              {(userBehavior === 'approve' || existingFeedback?.success) ? 'Obrigado pelo feedback!' : 'Feedback registrado'}
            </span>
          </div>
        </div>
      )}

      {showFeedbackForm && (
        <div className="mt-4 space-y-3">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Como podemos melhorar esta sugestão? (opcional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleFeedbackSubmit}
              disabled={isSubmitting}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              onClick={() => {
                setShowFeedbackForm(false);
                if (!userBehavior) {
                  onRatingSubmitted?.('modify');
                }
              }}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIOutputRating;