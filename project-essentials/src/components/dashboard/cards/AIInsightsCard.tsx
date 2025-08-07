import React from 'react';
import { FiAlertTriangle, FiInfo, FiChevronRight, FiCheckCircle } from 'react-icons/fi';

interface AISuggestion {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface AIInsightsCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
}) => {
  const getPriorityConfig = () => {
    switch (suggestion.priority) {
      case 'high':
        return {
          bgColor: 'bg-danger-DEFAULT/10',
          borderColor: 'border-danger-DEFAULT/20',
          textColor: 'text-danger-DEFAULT',
          icon: <FiAlertTriangle className="w-4 h-4" />,
          label: 'High Priority'
        };
      case 'medium':
        return {
          bgColor: 'bg-warning-DEFAULT/10',
          borderColor: 'border-warning-DEFAULT/20',
          textColor: 'text-warning-DEFAULT',
          icon: <FiInfo className="w-4 h-4" />,
          label: 'Medium Priority'
        };
      case 'low':
        return {
          bgColor: 'bg-accent/10',
          borderColor: 'border-accent/20',
          textColor: 'text-accent',
          icon: <FiInfo className="w-4 h-4" />,
          label: 'Suggestion'
        };
    }
  };

  const config = getPriorityConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-nubank p-4 hover:shadow-sm transition-all duration-300 group`}>
      <div className="flex items-start gap-3">
        <div className={`${config.textColor} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium ${config.textColor} uppercase tracking-wide`}>
                {config.label}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${config.textColor.replace('text-', 'bg-')}`} />
            </div>
            <p className="text-sm text-nubank-gray-700 leading-relaxed">
              {suggestion.text}
            </p>
          </div>
          
          {suggestion.actionable && (
            <div className="flex items-center gap-3">
              <button
                onClick={onApply}
                className={`text-xs font-medium ${config.textColor} hover:opacity-80 transition-colors flex items-center gap-1 group-hover:gap-2 transition-all`}
              >
                <FiCheckCircle className="w-3 h-3" />
                Apply suggestion
                <FiChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
              
              <button 
                onClick={onDismiss}
                className="text-xs text-textAccent hover:text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};