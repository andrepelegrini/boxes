import React, { useState, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiBox, FiArchive, 
  FiChevronsUp, FiChevronsDown, FiStar, FiMoreHorizontal,
  FiAward, FiZap,
  FiUsers
} from 'react-icons/fi';
import { ProjectWeightCategory } from '../../types/app.d';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '../../constants/appConstants';
import { useHumanizedText } from '../../constants/humanizedText';
import { useToast } from '../ui/Toast';

// Component-specific type definitions
interface ProjectCardUnifiedProps {
  project: any; // Will be typed with Project interface
  currentZone?: string;
  variant?: 'default' | 'compact' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
  showStats?: boolean;
  showProgress?: boolean;
  showTeam?: boolean;
  enableDrag?: boolean;
  enableHover?: boolean;
  className?: string;
  features?: ('drag' | 'stats' | 'actions')[];
}

const ProjectCardUnified: React.FC<ProjectCardUnifiedProps> = memo(({ 
  project, 
  variant = 'default',
  size = 'md',
  showActions = true,
  enableDrag = true,
  enableHover = true,
  className = '',
  features = ['drag', 'stats', 'actions']
}) => {
  const { 
    archiveProject, 
    getProjectWeight, 
    markProjectAsReviewed,
    promoteProjectToActive,
    demoteProjectToShelf,
    toggleNextUp,
    projects: projectsContext, 
    tasks,
    userMaxActiveProjects,
  } = useAppContext();
  
  const { } = useHumanizedText();
  const { totalWeightScore, category: weightCategory } = getProjectWeight(project.id);
  const { showFriendlyError, ToastContainer } = useToast();
  
  // Component state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Feature flags based on variant and explicit features
  const activeFeatures = useMemo(() => {
    const baseFeatures = new Set(features);
    
    // Add features based on variant
    switch (variant) {
      case 'compact':
        baseFeatures.delete('stats');
        baseFeatures.delete('progress');
        baseFeatures.delete('team');
        break;
      case 'minimal':
        baseFeatures.clear();
        baseFeatures.add('drag');
        break;
    }
    
    return baseFeatures;
  }, [variant, features]);

  // Computed data for sophisticated variant
  const projectStats = useMemo(() => {
    if (!activeFeatures.has('stats')) return null;
    
    // Filter data locally from state for better performance
    const projectTasks = tasks.tasks?.filter((t: any) => t.projectId === project.id) || [];
    const projectEvents = projectsContext.events?.filter((e: any) => e.projectId === project.id) || [];
    const projectDocuments = projectsContext.documents?.filter((d: any) => d.projectId === project.id) || [];
    
    return {
      totalTasks: projectTasks.length,
      completedTasks: projectTasks.filter((t: any) => t.completed).length,
      activeTasks: projectTasks.filter((t: any) => !t.completed).length,
      overdueTasks: projectTasks.filter((t: any) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
      totalEvents: projectEvents.length,
      totalDocuments: projectDocuments.length,
      completionRate: projectTasks.length > 0 ? Math.round((projectTasks.filter((t: any) => t.completed).length / projectTasks.length) * 100) : 0
    };
  }, [project.id, tasks.tasks, projectsContext.events, projectsContext.documents, activeFeatures]);

  const activeProjectsCount = projectsContext.projects?.filter((p: any) => p.status === PROJECT_STATUS_ACTIVE).length || 0;
  const canPromoteToActive = activeProjectsCount < userMaxActiveProjects;

  // Styling configuration based on variant and status
  const getCardStyles = useMemo(() => {
    let baseStyles = {
      accentColorClass: 'before:bg-gradient-to-b before:from-nubank-gray-400 before:to-nubank-gray-500', 
      iconColorClass: 'text-nubank-gray-500',
      titleColorClass: 'text-nubank-gray-800',
      bgColorClass: 'bg-white',
      borderColorClass: 'border-nubank-gray-200',
      dotColorClass: 'bg-nubank-gray-400'
    };

    // Status-based styling
    if (project.status === PROJECT_STATUS_ACTIVE) {
      baseStyles = {
        accentColorClass: 'before:bg-gradient-to-b before:from-nubank-purple-500 before:to-nubank-purple-600',
        iconColorClass: 'text-nubank-purple-600',
        titleColorClass: 'text-nubank-gray-900',
        bgColorClass: 'bg-white',
        borderColorClass: 'border-nubank-purple-200',
        dotColorClass: 'bg-nubank-purple-500'
      };
    } else if (project.status === PROJECT_STATUS_SHELF && project.isNextUp) {
      baseStyles = {
        accentColorClass: 'before:bg-gradient-to-b before:from-nubank-blue-500 before:to-nubank-blue-600',
        iconColorClass: 'text-nubank-blue-600',
        titleColorClass: 'text-nubank-gray-900',
        bgColorClass: 'bg-white',
        borderColorClass: 'border-nubank-blue-200',
        dotColorClass: 'bg-nubank-blue-500'
      };
    } else if (project.status === PROJECT_STATUS_ARCHIVED) {
      baseStyles = {
        accentColorClass: 'before:bg-gradient-to-b before:from-nubank-gray-300 before:to-nubank-gray-400',
        iconColorClass: 'text-nubank-gray-400',
        titleColorClass: 'text-nubank-gray-600',
        bgColorClass: 'bg-nubank-gray-50',
        borderColorClass: 'border-nubank-gray-200',
        dotColorClass: 'bg-nubank-gray-400'
      };
    }

    // Variant-specific styling modifications
    if (variant === 'default' && enableHover && isHovered) {
      baseStyles.bgColorClass = 'bg-gradient-to-br from-white to-nubank-gray-50';
      baseStyles.borderColorClass = baseStyles.borderColorClass.replace('200', '300');
    }

    return baseStyles;
  }, [project.status, project.isNextUp, variant, enableHover, isHovered]);

  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          cardClass: 'p-3',
          titleClass: 'text-sm font-medium',
          iconSize: 'w-4 h-4',
          spacing: 'space-y-2'
        };
      case 'lg':
        return {
          cardClass: 'p-6',
          titleClass: 'text-lg font-semibold',
          iconSize: 'w-6 h-6',
          spacing: 'space-y-4'
        };
      case 'md':
      default:
        return {
          cardClass: 'p-4',
          titleClass: 'text-base font-medium',
          iconSize: 'w-5 h-5',
          spacing: 'space-y-3'
        };
    }
  }, [size]);

  // Icon selection based on status
  const getStatusIcon = () => {
    if (project.status === PROJECT_STATUS_ACTIVE) return FiZap;
    if (project.status === PROJECT_STATUS_SHELF && project.isNextUp) return FiStar;
    if (project.status === PROJECT_STATUS_ARCHIVED) return FiAward;
    return FiBox;
  };

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!enableDrag || project.status === PROJECT_STATUS_ARCHIVED) return;
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', project.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [enableDrag, project.status, project.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Action handlers
  const handleQuickAction = useCallback((action: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (action) {
      case 'promote':
        if (canPromoteToActive) {
          promoteProjectToActive(project.id);
        } else {
          showFriendlyError(`Você já tem ${userMaxActiveProjects} projetos ativos. Mova um projeto para a Prateleira primeiro.`);
        }
        break;
      case 'demote':
        demoteProjectToShelf(project.id);
        break;
      case 'toggleNextUp':
        toggleNextUp(project.id);
        break;
      case 'archive':
        setShowArchiveModal(true);
        break;
      case 'review':
        markProjectAsReviewed(project.id);
        break;
    }
  }, [project.id, canPromoteToActive, promoteProjectToActive, demoteProjectToShelf, toggleNextUp, markProjectAsReviewed, userMaxActiveProjects, showFriendlyError]);

  // Archive handler
  const handleArchive = useCallback(() => {
    archiveProject(project.id, archiveReason);
    setShowArchiveModal(false);
    setArchiveReason('');
  }, [archiveProject, project.id, archiveReason]);

  // Weight indicator for enhanced variants
  const WeightIndicator = () => {
    if (!activeFeatures.has('weight') || !totalWeightScore) return null;

    const getWeightColor = (category: ProjectWeightCategory) => {
      switch (category) {
        case ProjectWeightCategory.Light: return 'text-green-600 bg-green-100';
        case ProjectWeightCategory.Medium: return 'text-yellow-600 bg-yellow-100';
        case ProjectWeightCategory.Heavy: return 'text-orange-600 bg-orange-100';
        case ProjectWeightCategory.Overweight: return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getWeightColor(weightCategory)}`}>
        {totalWeightScore} pts
      </div>
    );
  };

  // Progress bar for enhanced variants
  const ProgressBar = () => {
    if (!activeFeatures.has('progress') || !projectStats) return null;

    return (
      <div className="w-full bg-nubank-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${projectStats.completionRate}%` }}
        />
      </div>
    );
  };

  // Team info for sophisticated variant
  const TeamInfo = () => {
    if (!activeFeatures.has('team')) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-nubank-gray-500">
        <FiUsers className="w-3 h-3" />
        <span>3 members</span>
      </div>
    );
  };

  // Stats grid for sophisticated variant
  const StatsGrid = () => {
    if (!activeFeatures.has('stats') || !projectStats) return null;

    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-3 text-xs text-nubank-gray-500">
          <span>{projectStats.activeTasks} tasks</span>
          <span>{projectStats.completionRate}%</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center p-2 bg-nubank-gray-50 rounded">
          <div className="text-sm font-semibold text-nubank-gray-900">{projectStats.activeTasks}</div>
          <div className="text-xs text-nubank-gray-500">Tasks</div>
        </div>
        <div className="text-center p-2 bg-nubank-gray-50 rounded">
          <div className="text-sm font-semibold text-nubank-gray-900">{projectStats.totalEvents}</div>
          <div className="text-xs text-nubank-gray-500">Events</div>
        </div>
        <div className="text-center p-2 bg-nubank-gray-50 rounded">
          <div className="text-sm font-semibold text-nubank-gray-900">{projectStats.completionRate}%</div>
          <div className="text-xs text-nubank-gray-500">Done</div>
        </div>
      </div>
    );
  };

  // Quick actions for enhanced variants
  const QuickActions = () => {
    if (!activeFeatures.has('actions') || !showActions) return null;

    if (variant === 'compact') {
      return (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 rounded">
            <FiMoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      );
    }

    const actions = [];
    
    if (project.status === PROJECT_STATUS_SHELF) {
      if (canPromoteToActive) {
        actions.push({
          label: 'Ativar',
          action: 'promote',
          icon: FiChevronsUp,
          color: 'text-green-600 hover:text-green-700'
        });
      }
      if (!project.isNextUp) {
        actions.push({
          label: 'Marcar Próximo',
          action: 'toggleNextUp',
          icon: FiStar,
          color: 'text-blue-600 hover:text-blue-700'
        });
      }
    } else if (project.status === PROJECT_STATUS_ACTIVE) {
      actions.push({
        label: 'Para Prateleira',
        action: 'demote',
        icon: FiChevronsDown,
        color: 'text-orange-600 hover:text-orange-700'
      });
    }

    if (project.status !== PROJECT_STATUS_ARCHIVED) {
      actions.push({
        label: 'Arquivar',
        action: 'archive',
        icon: FiArchive,
        color: 'text-red-600 hover:text-red-700'
      });
    }

    return (
      <div className="flex items-center gap-1 mt-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={(e) => handleQuickAction(action.action, e)}
              className={`p-1 ${action.color} rounded transition-colors`}
              title={action.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  };

  // Render minimal variant
  if (variant === 'minimal') {
    const StatusIcon = getStatusIcon();
    return (
      <div
        className={`relative cursor-pointer rounded-lg border ${getCardStyles.borderColorClass} ${getCardStyles.bgColorClass} p-2 transition-all duration-200 hover:shadow-sm ${className}`}
        draggable={enableDrag && project.status !== PROJECT_STATUS_ARCHIVED}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getCardStyles.dotColorClass}`} />
          <span className={`text-sm ${getCardStyles.titleColorClass} truncate flex-1`}>
            {project.name}
          </span>
          <StatusIcon className={`${sizeConfig.iconSize} ${getCardStyles.iconColorClass}`} />
        </div>
      </div>
    );
  }

  // Main card render
  const StatusIcon = getStatusIcon();
  
  return (
    <>
      <div
        className={`group relative cursor-pointer rounded-lg border ${getCardStyles.borderColorClass} ${getCardStyles.bgColorClass} ${sizeConfig.cardClass} transition-all duration-200 hover:shadow-md ${isDragging ? 'opacity-50 scale-95' : ''} ${className}`}
        draggable={enableDrag && project.status !== PROJECT_STATUS_ARCHIVED}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => enableHover && setIsHovered(true)}
        onMouseLeave={() => enableHover && setIsHovered(false)}
        role="article"
        tabIndex={0}
        aria-label={`Projeto ${project.name}, status ${project.status}`}
      >
        {/* Accent bar */}
        <div className={`absolute left-0 top-0 w-1 h-full rounded-l-lg ${getCardStyles.accentColorClass.replace('before:', '')}`} />
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <StatusIcon className={`${sizeConfig.iconSize} ${getCardStyles.iconColorClass} mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <Link
                to={`/project/${project.id}`}
                className={`${sizeConfig.titleClass} ${getCardStyles.titleColorClass} hover:text-nubank-purple-600 transition-colors block truncate`}
              >
                {project.name}
              </Link>
              {project.description && variant !== 'compact' && (
                <p className="text-sm text-nubank-gray-600 mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          
          {activeFeatures.has('weight') && <WeightIndicator />}
        </div>

        {/* Progress bar */}
        {activeFeatures.has('progress') && (
          <div className="mt-3">
            <ProgressBar />
            {projectStats && (
              <div className="flex items-center justify-between mt-1 text-xs text-nubank-gray-500">
                <span>{projectStats.completedTasks}/{projectStats.totalTasks} tasks</span>
                <span>{projectStats.completionRate}%</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <StatsGrid />

        {/* Team info */}
        <TeamInfo />

        {/* Quick actions */}
        <QuickActions />

        {/* Dates for sophisticated variant */}
        {activeFeatures.has('dates') && (
          <div className="flex items-center gap-3 mt-3 text-xs text-nubank-gray-500">
            <div className="flex items-center gap-1">
              <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
            {project.archivedAt && (
              <div className="flex items-center gap-1">
                <FiArchive className="w-3 h-3" />
                <span>Archived {new Date(project.archivedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Drag overlay for visual feedback */}
        {isDragging && (
          <div className="absolute inset-0 bg-nubank-purple-100 rounded-lg border-2 border-dashed border-nubank-purple-400 flex items-center justify-center">
            <div className="text-nubank-purple-600 font-medium">Movendo...</div>
          </div>
        )}
      </div>

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-nubank-gray-900 mb-4">
              Arquivar "{project.name}"
            </h3>
            <p className="text-nubank-gray-600 mb-4">
              Tem certeza que deseja arquivar este projeto?
            </p>
            <textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Motivo do arquivamento (opcional)..."
              className="w-full p-3 border border-nubank-gray-300 rounded focus:ring-2 focus:ring-nubank-purple-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
});

ProjectCardUnified.displayName = 'ProjectCardUnified';

export default ProjectCardUnified;