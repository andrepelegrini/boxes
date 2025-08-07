import React, { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from '../../types/app';
import { MoreHorizontal, Edit3, Archive } from 'lucide-react';
import { FiTarget, FiStar, FiArchive, FiActivity, FiCalendar, FiUsers } from 'react-icons/fi';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '../../constants/appConstants';

interface ProjectKanbanCardProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  isDragOverlay?: boolean;
}

// Minimal project card variants (Notion-style)
const projectCardVariants = cva(
  "bg-white rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer select-none group",
  {
    variants: {
      dragState: {
        default: "",
        dragging: "opacity-40 scale-[0.98] border-blue-300",
        overlay: "shadow-lg border-blue-400 rotate-1 scale-105",
      },
      status: {
        active: "border-l-2 border-l-blue-500",
        'next-up': "border-l-2 border-l-orange-500",
        shelf: "border-l-2 border-l-gray-500",
        archived: "border-l-2 border-l-green-500",
      },
    },
    defaultVariants: {
      dragState: "default",
      status: "shelf",
    },
  }
);

const getProjectColumnStatus = (project: Project): 'active' | 'next-up' | 'shelf' | 'archived' => {
  if (project.status === PROJECT_STATUS_ACTIVE) {
    return 'active';
  }
  if (project.status === PROJECT_STATUS_SHELF) {
    return project.isNextUp ? 'next-up' : 'shelf';
  }
  if (project.status === PROJECT_STATUS_ARCHIVED) {
    return 'archived';
  }
  return 'shelf';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return FiTarget;
    case 'next-up':
      return FiStar;
    case 'shelf':
      return FiArchive;
    case 'archived':
      return FiArchive;
    default:
      return FiActivity;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-blue-600';
    case 'next-up':
      return 'text-orange-600';
    case 'shelf':
      return 'text-gray-600';
    case 'archived':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};

export const ProjectKanbanCard: React.FC<ProjectKanbanCardProps> = ({
  project,
  onDelete,
  isDragOverlay = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: {
      type: 'Project',
      project,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const projectStatus = getProjectColumnStatus(project);
  const StatusIcon = getStatusIcon(projectStatus);
  const statusColor = getStatusColor(projectStatus);

  // Project stats
  const projectStats = useMemo(() => {
    // In a real app, these would come from actual data
    const completedTasks = 0; // project.tasks?.filter(t => t.completed).length || 0;
    const totalTasks = 0; // project.tasks?.length || 0;
    const teamMembers = 0; // project.team?.length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      completedTasks,
      totalTasks,
      teamMembers,
      progress,
    };
  }, [project]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isDragOverlay) {
    return (
      <div className={cn(
        projectCardVariants({ 
          dragState: 'overlay',
          status: projectStatus
        })
      )}>
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <StatusIcon className={cn("w-4 h-4 flex-shrink-0", statusColor)} />
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {project.name}
              </h3>
            </div>
          </div>
          
          {project.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {project.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    isEditing ? (
        <div className="p-3">
          <p>Editing...</p>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            projectCardVariants({ 
              dragState: isDragging ? 'dragging' : 'default',
              status: projectStatus
            })
          )}
          {...attributes}
          {...listeners}
        >
          <div className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <StatusIcon className={cn("w-4 h-4 flex-shrink-0", statusColor)} />
                <Link 
                  to={`/project/${project.id}`}
                  className="font-medium text-gray-900 text-sm truncate hover:text-blue-600 transition-colors"
                >
                  {project.name}
                </Link>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            {/* Description */}
            {project.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                {project.description}
              </p>
            )}
            
            {/* Progress Bar */}
            {projectStats.totalTasks > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(projectStats.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${projectStats.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {projectStats.totalTasks > 0 && (
                  <div className="flex items-center gap-1">
                    <FiTarget className="w-3 h-3" />
                    <span>{projectStats.completedTasks}/{projectStats.totalTasks}</span>
                  </div>
                )}
                
                {projectStats.teamMembers > 0 && (
                  <div className="flex items-center gap-1">
                    <FiUsers className="w-3 h-3" />
                    <span>{projectStats.teamMembers}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                <span>{formatDate(project.updatedAt || project.createdAt)}</span>
              </div>
            </div>
            
            {/* Priority indicator for Next Up projects */}
            {project.isNextUp && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
            )}
          </div>
          
          {/* Context Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
              
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-xs hover:bg-gray-50 text-red-600 flex items-center gap-2"
                >
                  <Archive className="w-3 h-3" />
                  Archive
                </button>
              )}
            </div>
          )}
          
          {/* Click overlay to close menu */}
          {showMenu && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
          )}
        </div>
      )
  );
};