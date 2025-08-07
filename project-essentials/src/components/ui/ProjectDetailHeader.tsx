import React, { useState } from 'react';
import { 
  FiArrowLeft, FiEdit2, FiSave, FiX, 
  FiStar, FiArchive, FiChevronsUp, FiChevronsDown, FiEye,
  FiAward, FiZap, FiTrendingUp,
  FiMoreVertical, FiCalendar
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Project } from '../../types/app';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '@/constants/appConstants';

interface ProjectDetailHeaderProps {
  project: Project;
  canPromoteToActive: boolean;
  onSave: (updates: { name: string; description: string; strategicGoal: string; slackChannelUrl: string }) => void;
  onMarkAsReviewed: () => void;
  onDemoteToShelf: () => void;
  onToggleNextUp: () => void;
  onPromoteToActive: () => void;
  onArchive: () => void;
  className?: string;
}

const ProjectDetailHeader: React.FC<ProjectDetailHeaderProps> = ({
  project,
  canPromoteToActive,
  onSave,
  onMarkAsReviewed,
  onDemoteToShelf,
  onToggleNextUp,
  onPromoteToActive,
  onArchive,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || '',
    strategicGoal: project.strategicGoal || '',
    slackChannelUrl: project.slackChannelUrl || ''
  });

  const getProjectStatusConfig = () => {
    if (project.status === PROJECT_STATUS_ARCHIVED) {
      return {
        icon: FiAward,
        iconBg: 'bg-nubank-gray-100',
        iconColor: 'text-nubank-gray-600',
        status: '🏆 Conquistado',
        statusBg: 'bg-nubank-gray-100',
        statusText: 'text-nubank-gray-600',
        gradient: 'from-nubank-gray-50 to-nubank-gray-100'
      };
    }
    
    if (project.status === PROJECT_STATUS_ACTIVE) {
      return {
        icon: FiZap,
        iconBg: 'bg-gradient-to-br from-nubank-purple-500 to-nubank-pink-500',
        iconColor: 'text-white',
        status: '🔥 Ativo',
        statusBg: 'bg-gradient-to-r from-nubank-purple-100 to-nubank-pink-100',
        statusText: 'text-nubank-purple-700',
        gradient: 'from-nubank-purple-50 via-white to-nubank-pink-50'
      };
    }
    
    if (project.status === PROJECT_STATUS_SHELF && project.isNextUp) {
      return {
        icon: FiStar,
        iconBg: 'bg-gradient-to-br from-nubank-blue-500 to-nubank-blue-600',
        iconColor: 'text-white',
        status: '⭐ Próximo',
        statusBg: 'bg-gradient-to-r from-nubank-blue-100 to-nubank-blue-200',
        statusText: 'text-nubank-blue-700',
        gradient: 'from-nubank-blue-50 via-white to-nubank-blue-50'
      };
    }
    
    return {
      icon: FiTrendingUp,
      iconBg: 'bg-nubank-gray-100',
      iconColor: 'text-nubank-gray-600',
      status: '💡 Explorando',
      statusBg: 'bg-nubank-gray-100',
      statusText: 'text-nubank-gray-600',
      gradient: 'from-nubank-gray-50 to-white'
    };
  };

  const statusConfig = getProjectStatusConfig();
  const StatusIcon = statusConfig.icon;

  const handleSave = () => {
    onSave(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: project.name,
      description: project.description || '',
      strategicGoal: project.strategicGoal || '',
      slackChannelUrl: project.slackChannelUrl || ''
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getProjectActions = () => {
    const actions = [];
    
    if (project.status === PROJECT_STATUS_ACTIVE) {
      actions.push(
        {
          label: 'Marcar como Revisado',
          icon: FiEye,
          onClick: onMarkAsReviewed,
          color: 'text-nubank-purple-600 hover:bg-nubank-purple-50'
        },
        {
          label: 'Mover para Ideias',
          icon: FiChevronsDown,
          onClick: onDemoteToShelf,
          color: 'text-nubank-blue-600 hover:bg-nubank-blue-50'
        }
      );
    }
    
    if (project.status === PROJECT_STATUS_SHELF) {
      actions.push(
        {
          label: project.isNextUp ? 'Remover Prioridade' : 'Marcar como Próximo',
          icon: FiStar,
          onClick: onToggleNextUp,
          color: project.isNextUp ? 'text-nubank-blue-600 hover:bg-nubank-blue-50' : 'text-nubank-gray-600 hover:bg-nubank-gray-50'
        }
      );
      
      if (canPromoteToActive) {
        actions.push({
          label: 'Ativar Projeto',
          icon: FiChevronsUp,
          onClick: onPromoteToActive,
          color: 'text-nubank-purple-600 hover:bg-nubank-purple-50'
        });
      }
    }
    
    if (project.status !== PROJECT_STATUS_ARCHIVED) {
      actions.push({
        label: 'Finalizar Projeto',
        icon: FiArchive,
        onClick: onArchive,
        color: 'text-nubank-orange-600 hover:bg-nubank-orange-50'
      });
    }
    
    return actions;
  };

  return (
    <div className={`bg-gradient-to-br ${statusConfig.gradient} border border-nubank-gray-200/50 rounded-lg shadow-sm ${className}`}>
      <div className="p-3">
        {/* Ultra Compact Navigation & Actions */}
        <div className="flex items-center justify-between mb-3">
          <Link
            to="/"
            className="flex items-center space-x-1 text-nubank-gray-600 hover:text-nubank-purple-600 font-medium transition-colors group text-sm"
          >
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar aos Projetos</span>
          </Link>
          
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 px-2 py-1 text-nubank-gray-600 hover:text-nubank-purple-600 hover:bg-white/70 rounded transition-all duration-200 text-sm"
                  title="Editar projeto"
                >
                  <FiEdit2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="flex items-center space-x-1 px-2 py-1 text-nubank-gray-600 hover:text-nubank-purple-600 hover:bg-white/70 rounded transition-all duration-200 text-sm"
                    title="Mais ações"
                  >
                    <FiMoreVertical className="w-4 h-4" />
                    <span className="hidden sm:inline">Ações</span>
                  </button>
                  
                  {showActions && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-nubank-lg shadow-nubank-elevated border border-nubank-gray-200 py-2 z-50 animate-nubank-slide-up">
                      {getProjectActions().map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.onClick();
                            setShowActions(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${action.color}`}
                        >
                          <action.icon className="w-4 h-4" />
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {isEditing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 text-nubank-gray-600 hover:text-nubank-gray-800 hover:bg-white/70 rounded-nubank-lg transition-all duration-200"
                >
                  <FiX className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white hover:from-nubank-purple-600 hover:to-nubank-pink-600 rounded-nubank-lg transition-all duration-200 shadow-nubank"
                >
                  <FiSave className="w-4 h-4" />
                  <span className="hidden sm:inline">Salvar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ultra Compact Project Header */}
        <div className="flex items-center space-x-3">
          <div className={`${statusConfig.iconBg} p-2 rounded shadow-sm flex-shrink-0`}>
            <StatusIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full text-lg font-bold text-nubank-gray-800 bg-transparent border-b border-nubank-purple-300 focus:border-nubank-purple-500 outline-none pb-1"
                  placeholder="Nome do projeto"
                />
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full text-sm text-nubank-gray-600 bg-white/50 border border-nubank-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-nubank-purple-500 focus:border-transparent resize-none"
                  placeholder="Descrição do projeto..."
                  rows={2}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-lg font-bold text-nubank-gray-800 leading-tight">
                    {project.name}
                  </h1>
                  <span className={`${statusConfig.statusBg} ${statusConfig.statusText} text-xs font-medium px-2 py-0.5 rounded`}>
                    {statusConfig.status}
                  </span>
                  {project.isNextUp && project.status === PROJECT_STATUS_SHELF && (
                    <span className="bg-nubank-blue-100 text-nubank-blue-700 text-xs font-medium px-1.5 py-0.5 rounded">
                      Prioritário
                    </span>
                  )}
                </div>
                
                {project.description && (
                  <p className="text-nubank-gray-600 text-sm leading-relaxed mb-2">
                    {project.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ultra Compact Project Metadata */}
        <div className="mt-2 flex items-center space-x-4 text-xs text-nubank-gray-500">
          <div className="flex items-center space-x-1">
            <FiCalendar className="w-3 h-3" />
            <span>Criado: {formatDate(project.createdAt)}</span>
          </div>
          
          {project.lastReviewedAt && (
            <div className="flex items-center space-x-1">
              <FiEye className="w-3 h-3" />
              <span>Revisado: {formatDate(project.lastReviewedAt)}</span>
            </div>
          )}
          
          {project.status === PROJECT_STATUS_ARCHIVED && project.archivedAt && (
            <div className="flex items-center space-x-1">
              <FiAward className="w-3 h-3" />
              <span>Finalizado: {formatDate(project.archivedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailHeader;