import React, { useState } from 'react';
import { 
  FiArrowRight, 
  FiEdit3, 
  FiCalendar, 
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiClock,
  FiUser,
  FiMessageSquare
} from 'react-icons/fi';

export interface ProjectUpdate {
  id: string;
  type: 'task_status' | 'timeline' | 'description' | 'metrics' | 'risk';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sourceMessage: {
    text: string;
    user: string;
    timestamp: string;
    channelName: string;
    channelId: string;
  };
  suggestedChange: {
    field: string;
    action: string;
    summary: string;
    reason: string;
    newValue?: any;
    currentValue?: any;
  };
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
}

interface ProjectUpdatesPanelProps {
  updates: ProjectUpdate[];
  isLoading: boolean;
  onApplyUpdate: (updateId: string) => Promise<void>;
  onRejectUpdate: (updateId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const ProjectUpdatesPanel: React.FC<ProjectUpdatesPanelProps> = ({
  updates,
  isLoading,
  onApplyUpdate,
  onRejectUpdate,
  onRefresh,
}) => {
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [expandedUpdates, setExpandedUpdates] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'priority' | 'timestamp'>('confidence');

  const pendingUpdates = updates.filter(update => update.status === 'pending');

  const filteredUpdates = pendingUpdates.filter(update => {
    if (filterType === 'all') return true;
    return update.type === filterType;
  });

  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'timestamp':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const toggleSelection = (updateId: string) => {
    const newSelection = new Set(selectedUpdates);
    if (newSelection.has(updateId)) {
      newSelection.delete(updateId);
    } else {
      newSelection.add(updateId);
    }
    setSelectedUpdates(newSelection);
  };

  const toggleExpanded = (updateId: string) => {
    const newExpanded = new Set(expandedUpdates);
    if (newExpanded.has(updateId)) {
      newExpanded.delete(updateId);
    } else {
      newExpanded.add(updateId);
    }
    setExpandedUpdates(newExpanded);
  };

  const handleBulkApply = async () => {
    for (const updateId of selectedUpdates) {
      await onApplyUpdate(updateId);
    }
    setSelectedUpdates(new Set());
  };

  const handleBulkReject = async () => {
    for (const updateId of selectedUpdates) {
      await onRejectUpdate(updateId);
    }
    setSelectedUpdates(new Set());
  };

  if (pendingUpdates.length === 0) {
    return (
      <div className="text-center py-12">
        <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-textOnSurface mb-2">
          Nenhuma atualização pendente
        </h3>
        <p className="text-textAccent mb-4">
          Todas as atualizações de projeto foram processadas.
        </p>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Verificando...' : 'Verificar Atualizações'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-border rounded-md text-sm bg-surface"
          >
            <option value="all">Todos os tipos</option>
            <option value="task_status">Status de Tarefas</option>
            <option value="timeline">Timeline</option>
            <option value="description">Descrição</option>
            <option value="metrics">Métricas</option>
            <option value="risk">Riscos</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-border rounded-md text-sm bg-surface"
          >
            <option value="confidence">Confiança</option>
            <option value="priority">Prioridade</option>
            <option value="timestamp">Mais Recente</option>
          </select>
        </div>

        <div className="text-sm text-textAccent">
          {sortedUpdates.length} atualização{sortedUpdates.length !== 1 ? 'ões' : ''}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUpdates.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedUpdates.size} atualização{selectedUpdates.size !== 1 ? 'ões' : ''} selecionada{selectedUpdates.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkApply}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Aplicar Selecionadas
            </button>
            <button
              onClick={handleBulkReject}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Rejeitar Selecionadas
            </button>
            <button
              onClick={() => setSelectedUpdates(new Set())}
              className="px-3 py-1 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-100 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Updates List */}
      <div className="space-y-3">
        {sortedUpdates.map((update) => (
          <ProjectUpdateCard
            key={update.id}
            update={update}
            isSelected={selectedUpdates.has(update.id)}
            isExpanded={expandedUpdates.has(update.id)}
            onToggleSelect={() => toggleSelection(update.id)}
            onToggleExpanded={() => toggleExpanded(update.id)}
            onApply={() => onApplyUpdate(update.id)}
            onReject={() => onRejectUpdate(update.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Project Update Card Component
const ProjectUpdateCard: React.FC<{
  update: ProjectUpdate;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpanded: () => void;
  onApply: () => void;
  onReject: () => void;
}> = ({ 
  update, 
  isSelected, 
  isExpanded, 
  onToggleSelect, 
  onToggleExpanded, 
  onApply, 
  onReject 
}) => {
  const getUpdateTypeIcon = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'task_status':
        return <FiEdit3 className="w-4 h-4 text-blue-500" />;
      case 'timeline':
        return <FiCalendar className="w-4 h-4 text-purple-500" />;
      case 'description':
        return <FiMessageSquare className="w-4 h-4 text-green-500" />;
      case 'metrics':
        return <FiTrendingUp className="w-4 h-4 text-orange-500" />;
      case 'risk':
        return <FiAlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FiArrowRight className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: ProjectUpdate['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isSelected ? 'border-blue-300 bg-blue-50' : 'border-border bg-surface hover:bg-secondary-light'
    }`}>
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getUpdateTypeIcon(update.type)}
              <h4 className="font-medium text-textOnSurface">
                {update.title}
              </h4>
              <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityColor(update.priority)}`}>
                {update.priority}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getConfidenceColor(update.confidence)}`} />
              <span className="text-xs text-textAccent">
                {Math.round(update.confidence * 100)}%
              </span>
              <button
                onClick={onToggleExpanded}
                className="p-1 text-textAccent hover:text-textOnSurface transition-colors"
              >
                <FiEye className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <p className="text-sm text-textAccent mb-2">
            {update.suggestedChange.summary}
          </p>
          
          <div className="flex items-center text-xs text-textAccent mb-3 space-x-4">
            <div className="flex items-center space-x-1">
              <FiUser className="w-3 h-3" />
              <span>{update.sourceMessage.user}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiMessageSquare className="w-3 h-3" />
              <span>#{update.sourceMessage.channelName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiClock className="w-3 h-3" />
              <span>{new Date(update.createdAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>
          
          {isExpanded && (
            <div className="space-y-3 mb-3">
              <div className="bg-secondary-light rounded p-3">
                <h5 className="text-sm font-medium text-textOnSurface mb-1">Mensagem Original:</h5>
                <p className="text-sm text-textAccent italic">
                  "{update.sourceMessage.text}"
                </p>
              </div>
              
              <div className="bg-secondary-light rounded p-3">
                <h5 className="text-sm font-medium text-textOnSurface mb-1">Mudança Proposta:</h5>
                <p className="text-sm text-textAccent">
                  <span className="font-medium">Campo:</span> {update.suggestedChange.field}
                </p>
                <p className="text-sm text-textAccent">
                  <span className="font-medium">Ação:</span> {update.suggestedChange.action}
                </p>
                <p className="text-sm text-textAccent">
                  <span className="font-medium">Razão:</span> {update.suggestedChange.reason}
                </p>
                {update.suggestedChange.newValue && (
                  <p className="text-sm text-textAccent">
                    <span className="font-medium">Novo valor:</span> {String(update.suggestedChange.newValue)}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onApply}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Aplicar
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1 border border-border text-textAccent text-sm rounded hover:bg-secondary-light transition-colors"
            >
              Rejeitar
            </button>
            {!isExpanded && (
              <button
                onClick={onToggleExpanded}
                className="px-3 py-1 text-textAccent text-sm hover:text-textOnSurface transition-colors"
              >
                Ver detalhes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectUpdatesPanel;