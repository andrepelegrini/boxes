import React, { useMemo, useState, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  TouchSensor,
  DragOverlay,
  pointerWithin,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Project } from '../../types/app';
import { ProjectKanbanColumn } from './ProjectKanbanColumn';
import { ProjectKanbanCard } from './ProjectKanbanCard';
import { FiTarget, FiStar, FiArchive, FiActivity } from 'react-icons/fi';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '../../constants/appConstants';

interface ProjectKanbanBoardProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  searchTerm?: string;
  filterBy?: string;
  sortBy?: string;
}

type ProjectColumnId = 'active' | 'next-up' | 'shelf' | 'archived';

interface ProjectColumnDefinition {
  id: ProjectColumnId;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const COLUMN_DEFINITIONS: ProjectColumnDefinition[] = [
  { 
    id: 'shelf',
    title: 'On Shelf', 
    description: 'Parked for later',
    icon: FiArchive,
    color: 'from-gray-500 to-slate-500',
    bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50',
    borderColor: 'border-gray-200'
  },
  { 
    id: 'next-up',
    title: 'Next Up', 
    description: 'Ready to start',
    icon: FiStar,
    color: 'from-orange-500 to-yellow-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-yellow-50',
    borderColor: 'border-orange-200'
  },
  { 
    id: 'active',
    title: 'Active Projects', 
    description: 'Currently in progress',
    icon: FiTarget,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200'
  },
  { 
    id: 'archived',
    title: 'Archived', 
    description: 'Completed or cancelled',
    icon: FiArchive,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    borderColor: 'border-green-200'
  },
];

const getProjectColumn = (project: Project): ProjectColumnId => {
  if (project.status === PROJECT_STATUS_ACTIVE) {
    return 'active';
  }
  if (project.status === PROJECT_STATUS_SHELF) {
    return project.isNextUp ? 'next-up' : 'shelf';
  }
  if (project.status === PROJECT_STATUS_ARCHIVED) {
    return 'archived';
  }
  return 'shelf'; // fallback
};

const isValidColumnTransition = (from: ProjectColumnId, to: ProjectColumnId): boolean => {
  // Define valid transitions for projects
  const validTransitions: Record<ProjectColumnId, ProjectColumnId[]> = {
    'active': ['shelf', 'archived'],
    'next-up': ['active', 'shelf'],
    'shelf': ['next-up', 'active', 'archived'],
    'archived': ['shelf'] // Can restore from archive
  };
  
  return validTransitions[from]?.includes(to) || false;
};

const hasDraggableData = (active: any): boolean => {
  return active?.data?.current?.type === 'Project';
};

const isProjectDragData = (data: any): data is { type: 'Project'; project: Project } => {
  return data?.type === 'Project' && data?.project;
};

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({
  projects,
  onUpdateProject,
  onDeleteProject,
  searchTerm = '',
  filterBy = 'all',
  sortBy = 'created',
}) => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const pickedUpProjectColumn = useRef<ProjectColumnId | null>(null);

  // Enhanced sensors configuration for better accessibility and responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Enhanced drop animation configuration
  const dropAnimation: DropAnimation = {
    duration: 300,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  

  // Filter and organize projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Apply search filter
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !project.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [projects, searchTerm, filterBy, sortBy]);

  // Organize projects by column
  const projectsByColumn = useMemo(() => {
    const columns: Record<ProjectColumnId, Project[]> = {
      active: [],
      'next-up': [],
      shelf: [],
      archived: [],
    };

    filteredProjects.forEach(project => {
      const columnId = getProjectColumn(project);
      columns[columnId].push(project);
    });

    return columns;
  }, [filteredProjects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (!hasDraggableData(active)) {
      return;
    }

    const data = active.data.current;
    if (isProjectDragData(data)) {
      setActiveProject(data.project);
      pickedUpProjectColumn.current = getProjectColumn(data.project);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAProject = active.data.current?.type === 'Project';
    const isOverAProject = over.data.current?.type === 'Project';

    if (!isActiveAProject) return;

    const activeProject = active.data.current?.project;
    if (!activeProject) return;

    // Handle dropping a Project over another Project
    if (isActiveAProject && isOverAProject) {
      const overProject = over.data.current?.project;
      if (!overProject) return;
      
      const activeColumn = getProjectColumn(activeProject);
      const overColumn = getProjectColumn(overProject);
      
      if (activeColumn !== overColumn) {
        // Moving to a different column
        if (!isValidColumnTransition(activeColumn, overColumn)) {
          console.warn(`Invalid transition from ${activeColumn} to ${overColumn}`);
          return;
        }

        updateProjectStatus(activeProject, overColumn);
      }
    }

    const isOverAColumn = over.data.current?.type === 'Column';

    // Handle dropping a Project directly over a column
    if (isActiveAProject && isOverAColumn) {
      const targetColumnId = overId as ProjectColumnId;
      const currentColumn = getProjectColumn(activeProject);
      
      if (currentColumn !== targetColumnId) {
        // Validate transition
        if (!isValidColumnTransition(currentColumn, targetColumnId)) {
          console.warn(`Invalid transition from ${currentColumn} to ${targetColumnId}`);
          return;
        }

        updateProjectStatus(activeProject, targetColumnId);
      }
    }
  };

  const updateProjectStatus = (project: Project, targetColumn: ProjectColumnId) => {
    let updatedProject: Project;

    switch (targetColumn) {
      case 'active':
        updatedProject = {
          ...project,
          status: PROJECT_STATUS_ACTIVE,
          isNextUp: false,
          updatedAt: new Date().toISOString(),
        };
        break;
      case 'next-up':
        updatedProject = {
          ...project,
          status: PROJECT_STATUS_SHELF,
          isNextUp: true,
          updatedAt: new Date().toISOString(),
        };
        break;
      case 'shelf':
        updatedProject = {
          ...project,
          status: PROJECT_STATUS_SHELF,
          isNextUp: false,
          updatedAt: new Date().toISOString(),
        };
        break;
      case 'archived':
        updatedProject = {
          ...project,
          status: PROJECT_STATUS_ARCHIVED,
          isNextUp: false,
          updatedAt: new Date().toISOString(),
        };
        break;
      default:
        return;
    }

    onUpdateProject(updatedProject);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveProject(null);
    pickedUpProjectColumn.current = null;
    
    if (!over || !hasDraggableData(active)) {
      return;
    }

    // All drag operations are handled in handleDragOver
  };

  // Project insights
  const projectInsights = useMemo(() => {
    const insights = [];
    const activeCount = projectsByColumn.active?.length || 0;
    const nextUpCount = projectsByColumn['next-up']?.length || 0;
    const shelfCount = projectsByColumn.shelf?.length || 0;
    
    if (activeCount === 0 && nextUpCount > 0) {
      insights.push({
        type: 'suggestion',
        message: 'You have projects ready to start',
        suggestion: 'Consider activating a next-up project'
      });
    }
    
    if (nextUpCount === 0 && shelfCount > 0) {
      insights.push({
        type: 'planning',
        message: 'No projects queued for next',
        suggestion: 'Review shelf projects for planning'
      });
    }
    
    return insights.slice(0, 2);
  }, [projectsByColumn]);

  return (
    <div className="flex-1 h-full relative">
      {/* Project Insights Banner */}
      {projectInsights.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg border border-purple-200/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {projectInsights.map((insight, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.type === 'suggestion' ? 'bg-blue-400' :
                      'bg-purple-400'
                    }`}></div>
                    <span className="text-sm text-purple-800 font-medium">{insight.message}</span>
                    <span className="text-xs text-purple-600">→ {insight.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 h-full">
          {COLUMN_DEFINITIONS.map(column => {
            const columnProjects = projectsByColumn[column.id] || [];
            
            return (
              <ProjectKanbanColumn
                key={column.id}
                column={column}
                projects={columnProjects}
                onUpdateProject={onUpdateProject}
                {...(onDeleteProject && { onDeleteProject })}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeProject ? (
            <div className="transform rotate-2 shadow-2xl opacity-95 scale-105 transition-all cursor-grabbing">
              <ProjectKanbanCard
                project={activeProject}
                onUpdate={onUpdateProject}
                {...(onDeleteProject && { onDelete: onDeleteProject })}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};