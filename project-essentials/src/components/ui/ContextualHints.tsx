import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';

interface HintConfig {
  id: string;
  trigger: 'on_empty_state' | 'on_first_drag' | 'on_many_active' | 'on_first_task' | 'on_ai_available';
  title: string;
  content: string;
  emoji: string;
  priority: 'low' | 'medium' | 'high';
  dismissible: true;
  autoHide?: boolean;
  hideAfterMs?: number;
}

interface ContextualHintProps {
  hint: HintConfig;
  isVisible: boolean;
  onDismiss: (hintId: string) => void;
  position?: 'top' | 'bottom';
}

const ContextualHint: React.FC<ContextualHintProps> = ({
  hint,
  isVisible,
  onDismiss,
  position = 'top'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (hint.autoHide && hint.hideAfterMs && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, hint.hideAfterMs);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, hint.autoHide, hint.hideAfterMs]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onDismiss(hint.id);
    }, 300);
  };

  if (!isVisible) return null;

  const positionClasses = position === 'top' 
    ? 'fixed top-20 right-4 z-40' 
    : 'fixed bottom-4 right-4 z-40';

  const priorityColors = {
    low: {
      bg: 'bg-nubank-blue-50',
      border: 'border-nubank-blue-200',
      text: 'text-nubank-blue-800',
      accent: 'text-nubank-blue-600'
    },
    medium: {
      bg: 'bg-nubank-purple-50',
      border: 'border-nubank-purple-200', 
      text: 'text-nubank-purple-800',
      accent: 'text-nubank-purple-600'
    },
    high: {
      bg: 'bg-nubank-orange-50',
      border: 'border-nubank-orange-200',
      text: 'text-nubank-orange-800', 
      accent: 'text-nubank-orange-600'
    }
  };

  const colors = priorityColors[hint.priority];

  return (
    <div
      className={`${positionClasses} max-w-sm w-80 transition-all duration-300 ${
        isAnimatingOut 
          ? 'opacity-0 transform translate-x-full' 
          : 'opacity-100 transform translate-x-0'
      }`}
    >
      <div className={`${colors.bg} ${colors.border} border rounded-nubank shadow-nubank p-4 backdrop-blur-sm`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{hint.emoji}</span>
            <h4 className={`font-semibold text-sm ${colors.text}`}>{hint.title}</h4>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className={`${colors.accent} hover:opacity-80 transition-opacity p-1`}
                title="Ver mais"
              >
                <FiChevronDown size={14} />
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className={`${colors.accent} hover:opacity-80 transition-opacity p-1`}
              title="Dispensar"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`text-xs ${colors.text} leading-relaxed ${isExpanded ? 'block' : 'line-clamp-2'}`}>
          {hint.content}
        </div>

        {/* Collapse button when expanded */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`${colors.accent} hover:opacity-80 transition-opacity mt-2 flex items-center space-x-1 text-xs`}
          >
            <span>Recolher</span>
            <FiChevronUp size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

interface ContextualHintsProps {
  isEnabled?: boolean;
}

const ContextualHints: React.FC<ContextualHintsProps> = ({ isEnabled = true }) => {
  const { projects: projectsContext, currentUser, isAIAvailable, tasks } = useAppContext();
  const projects = projectsContext?.projects || [];
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
  const dismissedHintsRef = useRef<Set<string>>(new Set());

  // Define all available hints
  const allHints: HintConfig[] = [
    {
      id: 'empty_dashboard',
      trigger: 'on_empty_state',
      title: 'Comece criando sua primeira caixa',
      content: 'Cada caixa representa um projeto. Clique no botão "Dar vida a uma nova ideia" para criar sua primeira caixa e começar a organizar seu trabalho!',
      emoji: '📦',
      priority: 'high',
      dismissible: true
    },
    {
      id: 'first_drag_hint',
      trigger: 'on_first_drag',
      title: 'Arraste para organizar',
      content: 'Você pode arrastar suas caixas entre as colunas! Mova projetos de "Ideias" para "Prontas" quando estiver preparado, e para "Em Ação" quando começar a trabalhar.',
      emoji: '🚀',
      priority: 'medium',
      dismissible: true,
      autoHide: true,
      hideAfterMs: 8000
    },
    {
      id: 'too_many_active',
      trigger: 'on_many_active',
      title: 'Foco é fundamental',
      content: 'Você tem muitos projetos ativos! O segredo da produtividade é focar em poucos projetos por vez. Que tal finalizar alguns antes de ativar novos?',
      emoji: '🎯',
      priority: 'high',
      dismissible: true
    },
    {
      id: 'first_task_hint',
      trigger: 'on_first_task',
      title: 'Quebre em tarefas pequenas',
      content: 'Ótimo! Agora divida seu projeto em tarefas menores. Tarefas específicas são mais fáceis de completar e dão sensação de progresso.',
      emoji: '✅',
      priority: 'medium',
      dismissible: true,
      autoHide: true,
      hideAfterMs: 6000
    },
    {
      id: 'ai_available_hint',
      trigger: 'on_ai_available',
      title: 'IA pode ajudar!',
      content: 'Sua IA está configurada! Ela pode analisar projetos, sugerir tarefas e estimar cronogramas. Experimente na seção "Análise IA" dos seus projetos.',
      emoji: '🤖',
      priority: 'medium',
      dismissible: true,
      autoHide: true,
      hideAfterMs: 10000
    }
  ];

  // Load dismissed hints from localStorage on mount only
  useEffect(() => {
    const stored = localStorage.getItem('dismissedHints');
    if (stored) {
      try {
        const dismissed = JSON.parse(stored);
        const dismissedSet = new Set(dismissed);
        setDismissedHints(dismissedSet);
        dismissedHintsRef.current = dismissedSet;
      } catch (error) {
        console.error('Error loading dismissed hints:', error);
      }
    }
  }, []);

  // Keep ref in sync with state changes
  useEffect(() => {
    dismissedHintsRef.current = dismissedHints;
  }, [dismissedHints]);

  // Check triggers and show appropriate hints - this effect should be stable
  useEffect(() => {
    if (!isEnabled) {
      setActiveHints([]);
      return;
    }

    // Use a timeout to debounce rapid changes
    const timeoutId = setTimeout(() => {
      const newActiveHints: HintConfig[] = [];
      const currentDismissed = dismissedHintsRef.current;

      // Check each trigger condition
      allHints.forEach(hint => {
        if (currentDismissed.has(hint.id)) return; // Skip dismissed hints

        let shouldShow = false;

        switch (hint.trigger) {
          case 'on_empty_state':
            shouldShow = (projects || []).length === 0;
            break;
            
          case 'on_many_active':
            const activeCount = (projects || []).filter(p => p.status === 'active').length;
            shouldShow = activeCount >= 4;
            break;
            
          case 'on_ai_available':
            shouldShow = isAIAvailable && !currentDismissed.has('ai_available_hint');
            break;
            
          case 'on_first_drag':
            shouldShow = (projects || []).length >= 2 && !currentDismissed.has('first_drag_hint');
            break;
            
          case 'on_first_task':
            const hasAnyTasks = tasks.length > 0;
            shouldShow = hasAnyTasks && !currentDismissed.has('first_task_hint');
            break;
        }

        if (shouldShow) {
          newActiveHints.push(hint);
        }
      });

      // Sort by priority and only show the most important one at a time
      newActiveHints.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Show only the highest priority hint to avoid overwhelming the user
      setActiveHints(prev => {
        const newHints = newActiveHints.length > 0 ? [newActiveHints[0]] : [];
        // Only update if different to prevent unnecessary re-renders
        if (JSON.stringify(prev) !== JSON.stringify(newHints)) {
          return newHints;
        }
        return prev;
      });
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [projects, isEnabled, isAIAvailable, tasks]);

  const handleDismissHint = (hintId: string) => {
    const newDismissed = new Set(dismissedHints);
    newDismissed.add(hintId);
    setDismissedHints(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedHints', JSON.stringify(Array.from(newDismissed)));
    
    // Remove from active hints
    setActiveHints(prev => prev.filter(hint => hint.id !== hintId));
  };

  if (!isEnabled || !currentUser) return null;

  return (
    <>
      {activeHints.map((hint, index) => (
        <ContextualHint
          key={hint.id}
          hint={hint}
          isVisible={true}
          onDismiss={handleDismissHint}
          position={index % 2 === 0 ? 'top' : 'bottom'} // Alternate positions if multiple hints
        />
      ))}
    </>
  );
};

export default ContextualHints;