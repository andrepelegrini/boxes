// src/components/widgets/ProjectOverviewWidget.tsx
import React from 'react';
import { FiBox, FiCalendar, FiTarget, FiTrendingUp, FiClock } from 'react-icons/fi';
import WidgetCard from './WidgetCard';
import { Project } from '../../types/app';
import TypewriterText from '../ui/TypewriterText';
import GlowingCard from '../ui/GlowingCard';

interface ProjectOverviewWidgetProps {
  project: Project;
  className?: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
}

const ProjectOverviewWidget: React.FC<ProjectOverviewWidgetProps> = ({
  project,
  className,
  isExpandable = true,
  isExpanded = false,
  onToggleExpand,
  onRemove
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-nubank-purple-600 bg-nubank-purple-100';
      case 'shelf': return 'text-nubank-gray-600 bg-nubank-gray-100';
      case 'archived': return 'text-nubank-gray-500 bg-nubank-gray-100';
      default: return 'text-nubank-blue-600 bg-nubank-blue-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'shelf': return project.isNextUp ? 'Próximo' : 'Prateleira';
      case 'archived': return 'Arquivado';
      default: return 'Desconhecido';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não definido';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const daysSinceCreation = () => {
    const created = new Date(project.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <WidgetCard
      title="Visão Geral do Projeto"
      icon={<FiBox size={20} />}
      className={className || ''}
      isExpandable={isExpandable}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onRemove={onRemove}
      size="lg"
      priority={project.status === 'active' ? 'high' : 'medium'}
    >
      <div className="space-y-6">
        {/* Project Header */}
        <div className="border-b border-nubank-gray-200 pb-4 stagger-item">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 slide-in-left">
              <TypewriterText
                text={project.name}
                speed={80}
                className="text-xl font-bold text-nubank-gray-800 mb-2 block"
              />
              <p className="text-nubank-gray-600 text-sm leading-relaxed">
                {project.description || 'Sem descrição fornecida.'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)} pulse-slow`}>
              {getStatusLabel(project.status)}
            </div>
          </div>

          {project.strategicGoal && (
            <GlowingCard
              glowColor="blue"
              intensity="low"
              className="p-3 glass-card rounded-lg border border-nubank-blue-200 slide-in-up"
            >
              <div className="flex items-center space-x-2 mb-1">
                <FiTarget className="text-nubank-blue-600" size={16} />
                <span className="text-sm font-medium text-nubank-blue-800">Objetivo Estratégico</span>
              </div>
              <p className="text-sm text-nubank-blue-700">{project.strategicGoal}</p>
            </GlowingCard>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <GlowingCard
            glowColor="purple"
            intensity="low"
            className="text-center p-4 glass-card rounded-lg notion-hover stagger-item"
          >
            <div className="flex items-center justify-center mb-2">
              <FiCalendar className="text-nubank-purple-600 float-animation" size={20} />
            </div>
            <div className="text-sm font-medium text-nubank-gray-800">Criado há</div>
            <div className="text-lg font-bold text-nubank-purple-600">
              {daysSinceCreation()} dias
            </div>
          </GlowingCard>

          <GlowingCard
            glowColor="blue"
            intensity="low"
            className="text-center p-4 glass-card rounded-lg notion-hover stagger-item"
          >
            <div className="flex items-center justify-center mb-2">
              <FiClock className="text-nubank-blue-600 float-animation" size={20} />
            </div>
            <div className="text-sm font-medium text-nubank-gray-800">Última atualização</div>
            <div className="text-sm font-semibold text-nubank-blue-600">
              {formatDate(project.updatedAt)}
            </div>
          </GlowingCard>

          <GlowingCard
            glowColor="green"
            intensity="low"
            className="text-center p-4 glass-card rounded-lg notion-hover stagger-item"
          >
            <div className="flex items-center justify-center mb-2">
              <FiTrendingUp className="text-nubank-green-600 float-animation" size={20} />
            </div>
            <div className="text-sm font-medium text-nubank-gray-800">Status</div>
            <div className="text-sm font-semibold text-nubank-green-600">
              {project.status === 'active' ? 'Em progresso' : 'Aguardando'}
            </div>
          </GlowingCard>
        </div>

        {/* Additional Info */}
        {isExpanded && (
          <div className="space-y-4 slide-in-up">
            <div className="border-t border-nubank-gray-200 pt-4">
              <TypewriterText
                text="Informações Adicionais"
                speed={100}
                className="font-medium text-nubank-gray-800 mb-3 block"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stagger-item">
                  <div className="text-xs font-medium text-nubank-gray-600 mb-1">Data de Criação</div>
                  <div className="text-sm text-nubank-gray-800">{formatDate(project.createdAt)}</div>
                </div>

                <div className="stagger-item">
                  <div className="text-xs font-medium text-nubank-gray-600 mb-1">Última Revisão</div>
                  <div className="text-sm text-nubank-gray-800">
                    {formatDate(project.lastReviewedAt)}
                  </div>
                </div>

                {project.archivedAt && (
                  <div className="stagger-item">
                    <div className="text-xs font-medium text-nubank-gray-600 mb-1">Arquivado em</div>
                    <div className="text-sm text-nubank-gray-800">{formatDate(project.archivedAt)}</div>
                  </div>
                )}

                {project.archiveReason && (
                  <div className="stagger-item">
                    <div className="text-xs font-medium text-nubank-gray-600 mb-1">Motivo do Arquivamento</div>
                    <div className="text-sm text-nubank-gray-800">{project.archiveReason}</div>
                  </div>
                )}
              </div>
            </div>

            {project.slackChannelUrl && (
              <GlowingCard
                glowColor="purple"
                intensity="medium"
                className="p-3 glass-card rounded-lg border border-purple-200 bounce-in"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-4 h-4 bg-purple-600 rounded pulse-slow"></div>
                  <span className="text-sm font-medium text-purple-800">Slack Integrado</span>
                </div>
                <p className="text-sm text-purple-700">
                  Canal conectado para sincronização automática
                </p>
              </GlowingCard>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default ProjectOverviewWidget;