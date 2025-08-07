// src/components/onboarding/SmartSuggestions.tsx
import React, { useState } from 'react';
import { 
  FiX, FiArrowRight, FiZap, FiGrid,
  FiSlack, FiStar, FiTrendingUp, FiSettings,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { SmartSuggestion } from '../../services/SmartOnboardingService';
import PulseButton from '../ui/PulseButton';
import GlowingCard from '../ui/GlowingCard';
import TypewriterText from '../ui/TypewriterText';

interface SmartSuggestionsProps {
  suggestions: SmartSuggestion[];
  onDismiss: (id: string) => void;
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
  className?: string;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  suggestions,
  onDismiss,
  onSuggestionClick,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));
  const highPrioritySuggestions = visibleSuggestions.filter(s => s.priority === 'high');
  const otherSuggestions = visibleSuggestions.filter(s => s.priority !== 'high');

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const getSuggestionIcon = (type: SmartSuggestion['type']) => {
    switch (type) {
      case 'feature': return <FiZap className="text-nubank-purple-600" size={18} />;
      case 'template': return <FiZap className="text-nubank-blue-600" size={18} />;
      case 'workflow': return <FiTrendingUp className="text-nubank-green-600" size={18} />;
      case 'widget': return <FiGrid className="text-nubank-orange-600" size={18} />;
      case 'integration': return <FiSlack className="text-nubank-pink-600" size={18} />;
      default: return <FiZap className="text-nubank-gray-600" size={18} />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-nubank-green-600 bg-nubank-green-100';
    if (confidence >= 60) return 'text-nubank-orange-600 bg-nubank-orange-100';
    return 'text-nubank-blue-600 bg-nubank-blue-100';
  };

  const getPriorityStyle = (priority: SmartSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-nubank-pink-500 bg-nubank-pink-50';
      case 'medium': return 'border-l-nubank-blue-500 bg-nubank-blue-50';
      case 'low': return 'border-l-nubank-gray-500 bg-nubank-gray-50';
    }
  };

  const handleDismiss = (suggestion: SmartSuggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
    onDismiss(suggestion.id);
  };

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    onSuggestionClick(suggestion);
    // Optionally auto-dismiss after click
    if (suggestion.action.type !== 'tutorial') {
      handleDismiss(suggestion);
    }
  };

  const SuggestionCard: React.FC<{ suggestion: SmartSuggestion; isHighPriority?: boolean }> = ({ 
    suggestion, 
    isHighPriority = false 
  }) => (
    <GlowingCard
      glowColor={suggestion.priority === 'high' ? 'purple' : 'blue'}
      intensity={isHighPriority ? 'medium' : 'low'}
      className={`p-4 rounded-lg border-l-4 ${getPriorityStyle(suggestion.priority)} notion-hover cursor-pointer transition-all duration-200 ${
        isHighPriority ? 'stagger-item' : ''
      }`}
      onClick={() => handleSuggestionClick(suggestion)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-0.5">
            {getSuggestionIcon(suggestion.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {isHighPriority ? (
                <TypewriterText
                  text={suggestion.title}
                  speed={60}
                  className="font-semibold text-nubank-gray-800 text-sm block"
                />
              ) : (
                <h4 className="font-semibold text-nubank-gray-800 text-sm">
                  {suggestion.title}
                </h4>
              )}
              
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                {suggestion.confidence}%
              </span>
            </div>
            
            <p className="text-nubank-gray-600 text-xs mb-2 line-clamp-2">
              {suggestion.description}
            </p>
            
            {suggestion.context && (
              <div className="text-xs text-nubank-gray-500 mb-3">
                <span className="opacity-70">Contexto:</span> {suggestion.context}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-nubank-gray-500 capitalize">
                  {suggestion.type}
                </span>
                <span className="text-xs text-nubank-gray-400">•</span>
                <span className={`text-xs capitalize ${
                  suggestion.priority === 'high' ? 'text-nubank-pink-600' :
                  suggestion.priority === 'medium' ? 'text-nubank-blue-600' :
                  'text-nubank-gray-600'
                }`}>
                  {suggestion.priority}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <PulseButton
                  variant="primary"
                  size="sm"
                  className="flex items-center space-x-1"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleSuggestionClick(suggestion);
                  }}
                >
                  <span className="text-xs">
                    {suggestion.action.type === 'navigate' ? 'Ir' :
                     suggestion.action.type === 'modal' ? 'Abrir' :
                     suggestion.action.type === 'tutorial' ? 'Aprender' :
                     'Criar'}
                  </span>
                  <FiArrowRight size={10} />
                </PulseButton>
                
                {suggestion.dismissible && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(suggestion);
                    }}
                    className="p-1 text-nubank-gray-400 hover:text-nubank-pink-600 transition-colors ripple"
                    title="Dispensar sugestão"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlowingCard>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* High Priority Suggestions */}
      {highPrioritySuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <FiStar className="text-nubank-pink-600" size={16} />
            <h3 className="text-sm font-semibold text-nubank-gray-800">
              Sugestões Importantes
            </h3>
            <div className="flex-1 h-px bg-nubank-gray-200"></div>
          </div>
          
          {highPrioritySuggestions.map(suggestion => (
            <SuggestionCard 
              key={suggestion.id} 
              suggestion={suggestion} 
              isHighPriority 
            />
          ))}
        </div>
      )}

      {/* Other Suggestions */}
      {otherSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FiZap className="text-nubank-blue-600" size={16} />
              <h3 className="text-sm font-semibold text-nubank-gray-800">
                Outras Sugestões ({otherSuggestions.length})
              </h3>
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 text-xs text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors"
            >
              <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
              {isExpanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
            </button>
          </div>

          {isExpanded && (
            <div className="space-y-2">
              {otherSuggestions.map(suggestion => (
                <SuggestionCard 
                  key={suggestion.id} 
                  suggestion={suggestion} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {visibleSuggestions.length === 0 && suggestions.length > 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-nubank-gray-100 rounded-full flex items-center justify-center">
            <FiSettings className="text-nubank-gray-400" size={20} />
          </div>
          <h4 className="text-sm font-medium text-nubank-gray-600 mb-1">
            Todas as sugestões foram dispensadas
          </h4>
          <p className="text-xs text-nubank-gray-500">
            Novas sugestões aparecerão baseadas no seu uso do sistema
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;