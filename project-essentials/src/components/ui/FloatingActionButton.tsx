import React, { useState, useCallback, memo } from 'react';
import { FiPlus, FiX, FiEdit, FiZap } from 'react-icons/fi';

interface FloatingActionButtonProps {
  onCreateTask: () => void;
  onEditProject?: () => void;
  onCreateTestSuggestion?: () => void;
  isVisible?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = memo(({
  onCreateTask,
  onEditProject,
  onCreateTestSuggestion,
  isVisible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  const toggleExpanded = useCallback(() => {
    console.log(`🎯 [FAB] User ${isExpanded ? 'collapsed' : 'expanded'} floating action button`);
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleAction = useCallback((action?: () => void) => {
    if (action) {
      action();
    }
    setIsExpanded(false);
  }, []);

  const handleCreateTask = useCallback(() => {
    console.log('📝 [FAB] User clicked create task action');
    handleAction(onCreateTask);
  }, [handleAction, onCreateTask]);
  const handleEditProject = useCallback(() => {
    console.log('✏️ [FAB] User clicked edit project action');
    handleAction(onEditProject);
  }, [handleAction, onEditProject]);
  const handleCreateTestSuggestion = useCallback(() => {
    console.log('🧪 [FAB] User clicked create AI suggestion action');
    handleAction(onCreateTestSuggestion);
  }, [handleAction, onCreateTestSuggestion]);

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
          <button
            onClick={handleCreateTask}
            className="flex items-center justify-center w-12 h-12 bg-primary text-textOnPrimary rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
            title="Nova Tarefa"
          >
            <FiEdit size={20} />
          </button>
          {onEditProject && (
            <button
              onClick={handleEditProject}
              className="flex items-center justify-center w-12 h-12 bg-info-DEFAULT text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
              title="Editar Projeto"
            >
              <FiEdit size={20} />
            </button>
          )}
          {onCreateTestSuggestion && (
            <button
              onClick={handleCreateTestSuggestion}
              className="flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
              title="🧪 Criar Sugestão AI (Teste)"
            >
              <FiZap size={20} />
            </button>
          )}
        </div>
      )}
      
      <button
        onClick={toggleExpanded}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform ${
          isExpanded 
            ? 'bg-danger-DEFAULT text-white rotate-45 scale-110' 
            : 'bg-primary text-textOnPrimary hover:scale-110'
        }`}
        title={isExpanded ? "Fechar" : "Ações rápidas"}
      >
        {isExpanded ? <FiX size={24} /> : <FiPlus size={24} />}
      </button>
    </div>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;