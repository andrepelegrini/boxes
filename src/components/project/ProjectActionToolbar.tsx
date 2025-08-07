import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiEye, FiChevronsDown, FiStar, FiChevronsUp, FiArchive 
} from 'react-icons/fi';
import { Project } from '../../types/app';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_SHELF, PROJECT_STATUS_ARCHIVED } from '../../constants/appConstants';

interface ProjectActionToolbarProps {
  project: Project;
  canPromoteToActive: boolean;
  onMarkAsReviewed: () => void;
  onDemoteToShelf: () => void;
  onToggleNextUp: () => void;
  onPromoteToActive: () => void;
  onArchive: () => void;
}

export const ProjectActionToolbar: React.FC<ProjectActionToolbarProps> = ({
  project,
  canPromoteToActive,
  onMarkAsReviewed,
  onDemoteToShelf,
  onToggleNextUp,
  onPromoteToActive,
  onArchive
}) => {
  const ActionButton: React.FC<{
    onClick: () => void;
    title: string;
    icon: React.ElementType;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'warning' | 'info';
    size?: number;
  }> = ({ onClick, title, icon: Icon, disabled = false, variant = 'default', size = 16 }) => {
    const baseClasses = "p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center border";
    
    const variants = {
      default: "text-textAccent hover:text-textOnSurface hover:bg-secondary-light border-transparent hover:border-border",
      primary: "text-primary hover:text-primary-dark hover:bg-primary/10 border-transparent hover:border-primary/20",
      warning: "text-warning-DEFAULT hover:text-orange-600 hover:bg-warning-DEFAULT/10 border-transparent hover:border-warning-DEFAULT/20",
      info: "text-info-DEFAULT hover:text-indigo-600 hover:bg-info-DEFAULT/10 border-transparent hover:border-info-DEFAULT/20"
    };
    
    const disabledClasses = "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-textAccent hover:border-transparent";
    
    return (
      <button
        onClick={() => {
          console.log(`🔧 [PROJECT_TOOLBAR] User clicked: ${title}`);
          onClick();
        }}
        title={title}
        disabled={disabled}
        className={`${baseClasses} ${disabled ? disabledClasses : variants[variant]} group`}
      >
        <Icon 
          size={size} 
          className={`transition-transform duration-200 ${!disabled ? 'group-hover:scale-110' : ''}`} 
        />
      </button>
    );
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <Link 
        to="/" 
        className="inline-flex items-center text-sm text-primary hover:text-primary-dark transition-all duration-200 font-medium group bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 hover:border-primary/40"
        onClick={() => console.log('⬅️ [PROJECT_TOOLBAR] User clicked back to dashboard link')}
      >
        <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform duration-200" size={16} /> 
        Voltar ao Painel
      </Link>
      
      <div className="flex items-center gap-2">
        {project.status === PROJECT_STATUS_ACTIVE && (
          <>
            <ActionButton
              onClick={onMarkAsReviewed}
              title="Marcar como Revisada"
              icon={FiEye}
              variant="info"
            />
            <ActionButton
              onClick={onDemoteToShelf}
              title="Mover para 'Sendo Preenchidas'"
              icon={FiChevronsDown}
              variant="info"
            />
          </>
        )}
        
        {project.status === PROJECT_STATUS_SHELF && (
          <>
            <ActionButton
              onClick={onToggleNextUp}
              title={project.isNextUp ? "Remover de 'Pronta'" : "Marcar como 'Pronta'"}
              icon={FiStar}
              variant={project.isNextUp ? "warning" : "info"}
            />
            <ActionButton
              onClick={onPromoteToActive}
              title="Mover para 'Abertas'"
              icon={FiChevronsUp}
              variant="primary"
              disabled={!canPromoteToActive}
            />
          </>
        )}
        
        {project.status !== PROJECT_STATUS_ARCHIVED && (
          <ActionButton
            onClick={onArchive}
            title="Fechar/Arquivar Caixa"
            icon={FiArchive}
            variant="warning"
          />
        )}
      </div>
    </div>
  );
};

export default ProjectActionToolbar;