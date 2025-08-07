import React, { useState } from 'react';
import { FiCheck, FiX, FiMessageSquare, FiCalendar, FiEdit3 } from 'react-icons/fi';
import { ProjectDescriptionSuggestion } from '../../types/app';
import { useProjectContext } from '../../contexts';

interface ProjectDescriptionSuggestionsProps {
  className?: string;
}

export const ProjectDescriptionSuggestions: React.FC<ProjectDescriptionSuggestionsProps> = ({
  className = ''
}) => {
  const { pendingDescriptionSuggestions, addSuggestion, approveSuggestion, rejectSuggestion } = useProjectDescriptionSuggestion();

  if (pendingDescriptionSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-nubank-gray-900">
        <FiMessageSquare className="w-4 h-4 text-nubank-purple-600" />
        <span>AI Description Suggestions ({pendingDescriptionSuggestions.length})</span>
      </div>

      {pendingDescriptionSuggestions.map((suggestion: ProjectDescriptionSuggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApprove={approveSuggestion}
          onReject={rejectSuggestion}
        />
      ))}
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: ProjectDescriptionSuggestion;
  onApprove: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onApprove,
  onReject
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(suggestion.suggestedDescription);
  const { updateProject } = useProjectContext();
  const getSuggestionTypeIcon = () => {
    if (suggestion.isFirstTime) {
      return '✨';
    } else if (suggestion.isSignificantChange) {
      return '🔄';
    } else {
      return '📝';
    }
  };

  const getSuggestionTypeText = () => {
    if (suggestion.isFirstTime) {
      return 'Initial Description';
    } else if (suggestion.isSignificantChange) {
      return 'Significant Update';
    } else {
      return 'Description Improvement';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleApplyModified = async () => {
    try {
      // Update project with modified description
      await updateProject(suggestion.projectId, editedDescription);
      // Then approve the suggestion
      onApprove(suggestion.id);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to apply modified description:', error);
    }
  };

  return (
    <div className="bg-white border border-nubank-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{getSuggestionTypeIcon()}</span>
          <div>
            <h3 className="font-semibold text-nubank-gray-900">{suggestion.projectName}</h3>
            <div className="flex items-center gap-4 text-xs text-nubank-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <FiMessageSquare className="w-3 h-3" />
                #{suggestion.channelName}
              </span>
              <span className="flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                {formatDate(suggestion.createdAt)}
              </span>
              <span className="bg-nubank-purple-100 text-nubank-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                {getSuggestionTypeText()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => onApprove(suggestion.id)}
                className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                title="Apply this suggestion"
              >
                <FiCheck className="w-4 h-4" />
                Apply
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-2 bg-nubank-purple-50 text-nubank-purple-700 border border-nubank-purple-200 rounded-lg hover:bg-nubank-purple-100 transition-colors text-sm font-medium"
                title="Modify this suggestion"
              >
                <FiEdit3 className="w-4 h-4" />
                Modify
              </button>
              <button
                onClick={() => onReject(suggestion.id)}
                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                title="Reject this suggestion"
              >
                <FiX className="w-4 h-4" />
                Reject
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApplyModified}
                className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                title="Apply modified description"
              >
                <FiCheck className="w-4 h-4" />
                Apply Modified
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedDescription(suggestion.suggestedDescription);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-nubank-gray-100 text-nubank-gray-600 border border-nubank-gray-200 rounded-lg hover:bg-nubank-gray-200 transition-colors text-sm font-medium"
                title="Cancel editing"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content comparison */}
      <div className="space-y-4">
        {/* Current description */}
        {suggestion.currentDescription && (
          <div>
            <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
              Current Description
            </label>
            <div className="p-3 bg-nubank-gray-50 border border-nubank-gray-200 rounded-lg text-sm text-nubank-gray-700">
              {suggestion.currentDescription || <em className="text-nubank-gray-500">No description</em>}
            </div>
          </div>
        )}

        {/* Suggested description */}
        <div>
          <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
            {isEditing ? 'Edit Suggested Description' : 'AI Suggested Description'}
          </label>
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full p-3 border border-nubank-purple-300 rounded-lg text-sm text-nubank-gray-700 focus:outline-none focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Edit the suggested description..."
            />
          ) : (
            <div className="p-3 bg-nubank-purple-50 border border-nubank-purple-200 rounded-lg text-sm text-nubank-gray-700">
              {suggestion.suggestedDescription}
            </div>
          )}
        </div>

        {/* Suggested next steps */}
        {suggestion.suggestedNextSteps.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
              Suggested Next Steps
            </label>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <ul className="space-y-2">
                {suggestion.suggestedNextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-nubank-gray-700">
                    <span className="text-green-600 mt-0.5 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Change reason */}
        {suggestion.changeReason && (
          <div>
            <label className="block text-sm font-medium text-nubank-gray-700 mb-2">
              Why this suggestion?
            </label>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-nubank-gray-600 italic">
              {suggestion.changeReason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};