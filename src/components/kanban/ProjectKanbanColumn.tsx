import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Project } from '../../types/app';
import { ProjectKanbanCard } from './ProjectKanbanCard';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

type ProjectColumnId = 'active' | 'next-up' | 'shelf' | 'archived';

interface ProjectColumnDefinition {
  id: ProjectColumnId;
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  color?: string;
  bgColor?: string;
  borderColor?: string;
}

interface ProjectKanbanColumnProps {
  column: ProjectColumnDefinition;
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

// Minimal column variants (Notion-style)
const columnVariants = cva(
  "h-full flex flex-col rounded-lg border border-gray-200 bg-gray-50/30 transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      dragState: {
        default: "",
        over: "border-blue-300 bg-blue-50/50",
        overlay: "opacity-50",
      },
    },
    defaultVariants: {
      dragState: "default",
    },
  }
);

const getColumnEmptyMessage = (columnId: ProjectColumnId): string => {
  switch (columnId) {
    case 'active':
      return 'No active projects. Drag projects here to start working on them.';
    case 'next-up':
      return 'No projects queued up. Mark projects as "Next Up" to plan ahead.';
    case 'shelf':
      return 'No projects on shelf. Park projects here when not actively working on them.';
    case 'archived':
      return 'No archived projects. Completed or cancelled projects appear here.';
    default:
      return 'No projects in this column.';
  }
};

export const ProjectKanbanColumn: React.FC<ProjectKanbanColumnProps> = ({
  column,
  projects,
  onUpdateProject,
  onDeleteProject,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });
  
  // Memoize project IDs for SortableContext
  const projectIds = useMemo(() => projects.map(project => project.id), [projects]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        columnVariants({ 
          dragState: isOver ? 'over' : 'default' 
        }),
        column.bgColor || 'bg-gray-50',
        column.borderColor || 'border-gray-200'
      )}
    >
      {/* Minimal column header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {column.icon && (
              <column.icon className="w-4 h-4 text-gray-600" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        {column.description && (
          <p className="text-xs text-gray-500 mt-1">{column.description}</p>
        )}
      </div>

      {/* Minimal projects container */}
      <div className="flex-1 min-h-[200px] overflow-y-auto p-2">
        <SortableContext 
          items={projectIds} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProjectKanbanCard
                project={project}
                onUpdate={onUpdateProject}
                {...(onDeleteProject && { onDelete: onDeleteProject })}
              />
            </div>
          ))}
          
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-400 py-8">
              <p className="text-xs text-gray-500 text-center">
                {getColumnEmptyMessage(column.id)}
              </p>
            </div>
          )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};