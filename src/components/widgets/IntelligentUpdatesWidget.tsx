// src/components/widgets/IntelligentUpdatesWidget.tsx
import React, { useState, useEffect } from 'react';
import { 
  FiCpu, FiAlertTriangle, FiCheckCircle, FiTrendingUp, 
  FiX, FiEye, FiCheck, FiRefreshCw, FiZap,
  FiTarget, FiUsers, FiCalendar
} from 'react-icons/fi';
import WidgetCard from './WidgetCard';
import { Project } from '../../types/app';
import { useProjectIntelligence } from '../../hooks/useProjectIntelligence';
import { ProjectUpdate } from '../../services/ProjectIntelligenceService';

interface IntelligentUpdatesWidgetProps {
  project: Project;
  className?: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
}

const IntelligentUpdatesWidget: React.FC<IntelligentUpdatesWidgetProps> = ({
  project,
  className,
  isExpandable = true,
  isExpanded = false,
  onToggleExpand,
  onRemove
}) => {
  const apiKey = localStorage.getItem('gemini_api_key') || undefined;
  const { state, actions } = useProjectIntelligence(apiKey);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'applied'>('pending');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh analysis periodically
  useEffect(() => {
    if (autoRefresh && apiKey) {
      const interval = setInterval(() => {
        actions.analyzeProject(project, [], [], []);
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, apiKey, project, actions]);

  // Initial analysis
  useEffect(() => {
    if (apiKey && !state.currentAnalysis) {
      actions.analyzeProject(project, [], [], []);
    }
  }, [apiKey, project, actions, state.currentAnalysis]);

  const getFilteredUpdates = (): ProjectUpdate[] => {
    switch (filter) {
      case 'pending': return state.pendingUpdates;
      case 'reviewed': return state.reviewedUpdates;
      case 'applied': return state.appliedUpdates;
      default: return [...state.pendingUpdates, ...state.reviewedUpdates, ...state.appliedUpdates];
    }
  };

  const getUpdateIcon = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'task_suggestion': return <FiCheckCircle className="text-nubank-blue-600" />;
      case 'milestone_update': return <FiTarget className="text-nubank-purple-600" />;
      case 'risk_alert': return <FiAlertTriangle className="text-nubank-pink-600" />;
      case 'progress_insight': return <FiTrendingUp className="text-nubank-green-600" />;
      case 'stakeholder_change': return <FiUsers className="text-nubank-orange-600" />;
      case 'timeline_adjustment': return <FiCalendar className="text-nubank-blue-600" />;
      default: return <FiCpu className="text-nubank-gray-600" />;
    }
  };

  const getUpdateTypeLabel = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'task_suggestion': return 'Sugestão de Tarefa';
      case 'milestone_update': return 'Atualização de Marco';
      case 'risk_alert': return 'Alerta de Risco';
      case 'progress_insight': return 'Insight de Progresso';
      case 'stakeholder_change': return 'Mudança de Stakeholder';
      case 'timeline_adjustment': return 'Ajuste de Cronograma';
      default: return 'Atualização';
    }
  };

  const getPriorityColor = (priority: ProjectUpdate['priority']) => {
    switch (priority) {
      case 'critical': return 'border-l-nubank-pink-500 bg-nubank-pink-50';
      case 'high': return 'border-l-nubank-orange-500 bg-nubank-orange-50';
      case 'medium': return 'border-l-nubank-blue-500 bg-nubank-blue-50';
      default: return 'border-l-nubank-gray-500 bg-nubank-gray-50';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-nubank-green-600 bg-nubank-green-100';
      case 'concerning': return 'text-nubank-orange-600 bg-nubank-orange-100';
      case 'critical': return 'text-nubank-pink-600 bg-nubank-pink-100';
      default: return 'text-nubank-gray-600 bg-nubank-gray-100';
    }
  };

  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return time.toLocaleDateString('pt-BR');
  };

  const handleManualRefresh = () => {
    actions.analyzeProject(project, [], [], []);
  };

  const filteredUpdates = getFilteredUpdates();

  return (
    <WidgetCard
      title="Atualizações Inteligentes"
      icon={<FiCpu size={20} />}
      className={className}
      isExpandable={isExpandable}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onRemove={onRemove}
      size={isExpanded ? 'xl' : 'lg'}
      priority={state.pendingUpdates.some(u => u.priority === 'critical') ? 'critical' : 
               state.pendingUpdates.some(u => u.priority === 'high') ? 'high' : 'medium'}
      isLoading={state.isAnalyzing}
      error={state.error || undefined}
      actions={
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1 transition-colors ${
              autoRefresh 
                ? 'text-nubank-green-600 hover:text-nubank-green-800' 
                : 'text-nubank-gray-400 hover:text-nubank-gray-600'
            }`}
            title={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
          >
            <FiZap size={14} />
          </button>
          <button
            onClick={handleManualRefresh}
            className="p-1 text-nubank-purple-600 hover:text-nubank-purple-800 transition-colors"
            title="Atualizar análise"
            disabled={state.isAnalyzing}
          >
            <FiRefreshCw className={state.isAnalyzing ? 'animate-spin' : ''} size={14} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Health Overview */}
        {state.currentAnalysis && (
          <div className="p-3 glass-card rounded-lg border border-nubank-gray-200 stagger-item">
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-sm font-medium text-nubank-gray-700"
              >Saúde do Projeto</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(state.currentAnalysis.projectHealth)} pulse-slow`}>
                {state.currentAnalysis.projectHealth === 'good' ? 'Boa' :
                 state.currentAnalysis.projectHealth === 'concerning' ? 'Preocupante' : 'Crítica'}
              </span>
            </div>
            
            <div
              className="text-sm font-medium text-nubank-gray-700"
            >Score de Saúde</div>
            
            <div className="flex justify-between items-center text-xs text-nubank-gray-600 mt-2">
              <span className="font-medium">Score: {state.currentAnalysis.projectHealth?.score || 0}/100</span>
              <span>
                Última análise: {formatRelativeTime(state.lastAnalysisAt || new Date().toISOString())}
              </span>
            </div>
          </div>
        )}

        {/* Update Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 glass-card rounded-lg border-l-4 border-nubank-orange-500 notion-hover stagger-item">
            <div className="text-2xl font-bold text-nubank-orange-600 animate-nubank-pulse">
              {state.pendingUpdates.length}
            </div>
            <div className="text-xs text-nubank-orange-700 font-medium">Pendentes</div>
          </div>
          
          <div className="text-center p-3 glass-card rounded-lg border-l-4 border-nubank-blue-500 notion-hover stagger-item">
            <div className="text-2xl font-bold text-nubank-blue-600">
              {state.reviewedUpdates.length}
            </div>
            <div className="text-xs text-nubank-blue-700 font-medium">Revisadas</div>
          </div>
          
          <div className="text-center p-3 glass-card rounded-lg border-l-4 border-nubank-green-500 notion-hover stagger-item">
            <div className="text-2xl font-bold text-nubank-green-600">
              {state.appliedUpdates.length}
            </div>
            <div className="text-xs text-nubank-green-700 font-medium">Aplicadas</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 glass-card rounded-lg p-1">
          {[
            { id: 'pending', label: 'Pendentes', count: state.pendingUpdates.length },
            { id: 'reviewed', label: 'Revisadas', count: state.reviewedUpdates.length },
            { id: 'applied', label: 'Aplicadas', count: state.appliedUpdates.length },
            { id: 'all', label: 'Todas', count: filteredUpdates.length }
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === id ? 'bg-nubank-purple-100 text-nubank-purple-700 shadow-sm' : 'text-nubank-gray-600 hover:bg-nubank-gray-100'}`}
            >
              <span>{label}</span>
              <span className="text-xs opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {/* Updates List */}
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredUpdates.length > 0 ? (
            filteredUpdates.map((update, index) => (
              <div 
                key={update.id} 
                className={`p-3 rounded-lg border-l-4 ${getPriorityColor(update.priority)} glass-card notion-hover scale-on-hover stagger-item`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-2 flex-1">
                    <div className="mt-0.5">{getUpdateIcon(update.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium text-sm text-nubank-gray-800">
                          {update.title}
                        </h5>
                        <span className="text-xs text-nubank-gray-500 bg-nubank-gray-100 px-2 py-0.5 rounded">
                          {getUpdateTypeLabel(update.type)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-nubank-gray-600 mb-2 line-clamp-2">
                        {update.description}
                      </p>
                      
                      <div className="flex items-center space-x-3 text-xs text-nubank-gray-500">
                        <span>Confiança: {update.confidence}%</span>
                        <span>•</span>
                        <span>{formatRelativeTime(update.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{update.priority}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {!update.isReviewed && !update.isApplied && (
                      <>
                        <button
                          onClick={() => actions.reviewUpdate(update.id)}
                          className="p-1 text-nubank-blue-600 hover:text-nubank-blue-800 transition-colors ripple"
                          title="Revisar"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => actions.applyUpdate(update.id, project.id)}
                          className="p-1 text-nubank-green-600 hover:text-nubank-green-800 transition-colors ripple"
                          title="Aplicar"
                        >
                          <FiCheck size={12} />
                        </button>
                      </>
                    )}
                    
                    {update.isReviewed && !update.isApplied && (
                      <button
                        onClick={() => actions.applyUpdate(update.id, project.id)}
                        className="p-1 text-nubank-green-600 hover:text-nubank-green-800 transition-colors ripple"
                        title="Aplicar"
                      >
                        <FiCheck size={12} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => actions.dismissUpdate(update.id)}
                      className="p-1 text-nubank-gray-400 hover:text-nubank-pink-600 transition-colors ripple"
                      title="Descartar"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                </div>

                {/* Suggested Actions */}
                {isExpanded && update.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <h6 className="text-xs font-medium text-nubank-gray-700 mb-2">
                      Ações Sugeridas:
                    </h6>
                    <div className="space-y-1">
                      {update.suggestedActions.map((action: any) => (
                        <div key={action.id} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-current rounded-full opacity-60"></div>
                          <span className="text-xs text-nubank-gray-600">
                            {action.action}: {action.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 slide-in-up">
              <div className="w-12 h-12 mx-auto mb-3 glass-card rounded-full flex items-center justify-center float-animation">
                <FiCpu className="text-nubank-gray-400" size={20} />
              </div>
              <div
                className="text-sm font-medium text-nubank-gray-600 mb-1 block"
              >{filter === 'all' ? 'Nenhuma atualização' : `Nenhuma atualização ${filter}`}</div>
              <p className="text-xs text-nubank-gray-500">
                {filter === 'pending' 
                  ? 'O projeto está funcionando bem no momento'
                  : 'Nenhuma atualização encontrada nesta categoria'
                }
              </p>
            </div>
          )}
        </div>

        {/* Next Analysis Info */}
        {state.nextScheduledAnalysis && (
          <div className="text-xs text-nubank-gray-500 text-center p-2 glass-card rounded pulse-slow">
            <div>{`Próxima análise: ${formatRelativeTime(state.nextScheduledAnalysis)}`}</div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default IntelligentUpdatesWidget;