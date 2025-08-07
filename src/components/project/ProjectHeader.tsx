import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTarget, FiSave, FiMessageSquare } from 'react-icons/fi';
import { Project } from '../../types/app';

interface ProjectHeaderProps {
  project: Project;
  onSave: (updates: { name: string; description: string; strategicGoal: string; slackChannelUrl: string }) => void;
  projectStatusInfo: { text: string; className: string };
}

const formatDate = (isoString: string | undefined) => 
  isoString ? new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onSave, projectStatusInfo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableName, setEditableName] = useState(project.name);
  const [editableDesc, setEditableDesc] = useState(project.description);
  const [editableStrategicGoal, setEditableStrategicGoal] = useState(project.strategicGoal || '');
  const [editableSlackChannelUrl, setEditableSlackChannelUrl] = useState(project.slackChannelUrl || '');

  useEffect(() => {
    setEditableName(project.name);
    setEditableDesc(project.description);
    setEditableStrategicGoal(project.strategicGoal || '');
    setEditableSlackChannelUrl(project.slackChannelUrl || '');
  }, [project]);

  const handleSave = () => {
    onSave({
      name: editableName,
      description: editableDesc,
      strategicGoal: editableStrategicGoal,
      slackChannelUrl: editableSlackChannelUrl
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableName(project.name);
    setEditableDesc(project.description);
    setEditableStrategicGoal(project.strategicGoal || '');
    setEditableSlackChannelUrl(project.slackChannelUrl || '');
    setIsEditing(false);
  };

  return (
    <header className="mb-6 p-4 sm:p-6 bg-surface rounded-lg shadow-sm border border-border/50 transition-all duration-200 hover:shadow-md">
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-textOnSurface mb-1">
                Nome da Caixa
              </label>
              <input 
                id="project-name"
                type="text" 
                value={editableName} 
                onChange={e => setEditableName(e.target.value)} 
                className="text-xl font-semibold text-textOnSurface bg-background border border-border rounded-lg px-4 py-2.5 w-full placeholder-textAccent/70 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" 
                placeholder="Nome da Caixa"
                autoFocus
              />
            </div>
            
            <div>
              <label htmlFor="project-desc" className="block text-sm font-medium text-textOnSurface mb-1">
                Descrição
              </label>
              <textarea 
                id="project-desc"
                value={editableDesc} 
                onChange={e => setEditableDesc(e.target.value)} 
                rows={3} 
                className="text-textAccent bg-background border border-border rounded-lg px-4 py-2.5 w-full placeholder-textAccent/70 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none" 
                placeholder="Descrição da Caixa"
              />
            </div>
            
            <div>
              <label htmlFor="strategic-goal" className="block text-sm font-medium text-textOnSurface mb-1">
                Meta Estratégica
              </label>
              <input 
                id="strategic-goal"
                type="text" 
                value={editableStrategicGoal} 
                onChange={e => setEditableStrategicGoal(e.target.value)} 
                placeholder="Meta Estratégica (opcional)" 
                className="text-sm text-info bg-background border border-border rounded-lg px-4 py-2.5 w-full placeholder-textAccent/70 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" 
              />
            </div>
            
            <div>
              <label htmlFor="slack-url" className="block text-sm font-medium text-textOnSurface mb-1">
                Canal do Slack
              </label>
              <input 
                id="slack-url"
                type="url" 
                value={editableSlackChannelUrl} 
                onChange={e => setEditableSlackChannelUrl(e.target.value)} 
                placeholder="URL do Canal Slack (opcional)" 
                className="text-sm text-info bg-background border border-border rounded-lg px-4 py-2.5 w-full placeholder-textAccent/70 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200" 
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={handleSave} 
              className="inline-flex items-center bg-primary text-textOnPrimary py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary shadow-sm hover:shadow-md"
            >
              <FiSave className="mr-2" size={16} />
              Salvar
            </button>
            <button 
              onClick={handleCancel} 
              className="inline-flex items-center text-textAccent py-2.5 px-4 rounded-lg text-sm font-medium border border-border hover:bg-secondary-light hover:text-textOnSurface transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-textOnSurface mb-2 leading-tight">
                {project.name}
              </h1>
              
              {project.description ? (
                <p className="text-textAccent leading-relaxed mb-3">
                  {project.description}
                </p>
              ) : (
                <p className="text-textAccent/70 italic mb-3">
                  Sem descrição.
                </p>
              )}
              
              {project.strategicGoal && (
                <div className="inline-flex items-center bg-info/10 text-info rounded-lg px-3 py-1.5 mb-3">
                  <FiTarget className="mr-2 flex-shrink-0" size={14} />
                  <span className="text-sm font-medium">Meta: {project.strategicGoal}</span>
                </div>
              )}
              
              {project.slackChannelUrl && (
                <div className="mb-3">
                  <a 
                    href={project.slackChannelUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-3 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-[1.02]"
                    title="Abrir canal do Slack"
                  >
                    <FiMessageSquare className="mr-2" size={16} />
                    Ir para o Canal Slack
                  </a>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex-shrink-0 p-2.5 text-textAccent hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 group" 
              title="Editar Cabeçalho"
            >
              <FiEdit2 size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="pt-4 border-t border-border/50">
            <div className="flex flex-wrap gap-4 text-sm text-textAccent/90">
              <div className="flex items-center gap-2">
                <span>Situação:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${projectStatusInfo.className}`}>
                  {projectStatusInfo.text}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <span>Criada:</span>
                <span className="font-medium">{formatDate(project.createdAt)}</span>
              </div>
              
              {project.updatedAt !== project.createdAt && (
                <div className="flex items-center gap-1">
                  <span>Atualizada:</span>
                  <span className="font-medium">{formatDate(project.updatedAt)}</span>
                </div>
              )}
              
              {project.lastReviewedAt && (
                <div className="flex items-center gap-1">
                  <span>Revisada:</span>
                  <span className="font-medium">{formatDate(project.lastReviewedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default ProjectHeader;