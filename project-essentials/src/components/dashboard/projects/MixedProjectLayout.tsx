import React, { useMemo } from 'react';
import { FiTarget, FiTrendingUp, FiArchive, FiClock, FiZap, FiStar, FiAward, FiInbox } from 'react-icons/fi';
import ProjectCardUnified from '../../project/ProjectCardUnified';
import { Project } from '../../../types/app';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '../../constants/appConstants';

interface ProjectSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  projects: Project[];
  cardSize: 'large' | 'medium' | 'compact';
  gridCols: string;
  priority: number;
  description?: string;
  emptyMessage?: string;
}

interface MixedProjectLayoutProps {
  projects: Project[];
  viewFilter?: 'all' | 'active' | 'next-up' | 'archived';
  onProjectAction?: (projectId: string, action: string) => void;
  className?: string;
}

export const MixedProjectLayout: React.FC<MixedProjectLayoutProps> = ({
  projects,
  viewFilter = 'all',
  onProjectAction,
  className = ''
}) => {
  // Filter and organize projects into sections
  const projectSections = useMemo((): ProjectSection[] => {
    const filteredProjects = projects;

    // Organize projects by status and priority
    const activeProjects = filteredProjects.filter(p => p.status === PROJECT_STATUS_ACTIVE);
    const nextUpProjects = filteredProjects.filter(p => 
      p.status === PROJECT_STATUS_SHELF && p.isNextUp
    );
    const shelfProjects = filteredProjects.filter(p => 
      p.status === PROJECT_STATUS_SHELF && !p.isNextUp
    );
    const archivedProjects = filteredProjects.filter(p => p.status === PROJECT_STATUS_ARCHIVED);

    const sections: ProjectSection[] = [];

    // Active Projects - Highest Priority (Large Cards)
    if ((viewFilter === 'all' || viewFilter === 'active') && activeProjects.length > 0) {
      sections.push({
        id: 'active',
        title: 'Active Projects',
        icon: <FiZap className="w-5 h-5" />,
        projects: activeProjects.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        ),
        cardSize: 'large',
        gridCols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2',
        priority: 1,
        description: 'Currently in progress with full focus and resources',
        emptyMessage: 'No active projects at the moment'
      });
    }

    // Next Up Projects - Medium Priority (Medium Cards)
    if ((viewFilter === 'all' || viewFilter === 'next-up') && nextUpProjects.length > 0) {
      sections.push({
        id: 'next-up',
        title: 'Next Up',
        icon: <FiStar className="w-5 h-5" />,
        projects: nextUpProjects.sort((a, b) => a.name.localeCompare(b.name)),
        cardSize: 'medium',
        gridCols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
        priority: 2,
        description: 'Ready to start when capacity becomes available',
        emptyMessage: 'No projects prioritized for next up'
      });
    }

    // Shelf Projects - Lower Priority (Compact Cards)
    if ((viewFilter === 'all' || viewFilter === 'next-up') && shelfProjects.length > 0) {
      sections.push({
        id: 'shelf',
        title: 'On Shelf',
        icon: <FiInbox className="w-5 h-5" />,
        projects: shelfProjects.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        cardSize: 'compact',
        gridCols: 'grid-cols-1 md:grid-cols-3 xl:grid-cols-4',
        priority: 3,
        description: 'Ideas and planning phase projects',
        emptyMessage: 'No projects on shelf'
      });
    }

    // Archived Projects - Minimal Display (Compact List)
    if ((viewFilter === 'all' || viewFilter === 'archived') && archivedProjects.length > 0) {
      sections.push({
        id: 'archived',
        title: 'Archived',
        icon: <FiAward className="w-5 h-5" />,
        projects: archivedProjects.sort((a, b) => 
          new Date(b.archivedAt || b.updatedAt || b.createdAt).getTime() - 
          new Date(a.archivedAt || a.updatedAt || a.createdAt).getTime()
        ),
        cardSize: 'compact',
        gridCols: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
        priority: 4,
        description: 'Completed and archived projects',
        emptyMessage: 'No archived projects'
      });
    }

    return sections.sort((a, b) => a.priority - b.priority);
  }, [projects, viewFilter]);


  // Get card container styles based on size
  const getCardStyles = (cardSize: ProjectSection['cardSize']) => {
    switch (cardSize) {
      case 'large':
        return 'min-h-[280px] hover:scale-[1.02]';
      case 'medium':
        return 'min-h-[220px] hover:scale-[1.01]';
      case 'compact':
        return 'min-h-[180px] hover:scale-[1.005]';
      default:
        return 'min-h-[220px] hover:scale-[1.01]';
    }
  };

  // Get section header styles based on priority
  const getSectionHeaderStyles = (priority: number) => {
    switch (priority) {
      case 1: // Active
        return {
          container: 'bg-gradient-to-r from-nubank-purple-50 to-nubank-pink-50 border-l-nubank-purple-500',
          icon: 'text-nubank-purple-600 bg-nubank-purple-100',
          title: 'text-nubank-purple-900',
          description: 'text-nubank-purple-700',
          count: 'bg-nubank-purple-600 text-white'
        };
      case 2: // Next Up
        return {
          container: 'bg-gradient-to-r from-nubank-blue-50 to-nubank-blue-50 border-l-nubank-blue-500',
          icon: 'text-nubank-blue-600 bg-nubank-blue-100',
          title: 'text-nubank-blue-900',
          description: 'text-nubank-blue-700',
          count: 'bg-nubank-blue-600 text-white'
        };
      case 3: // Shelf
        return {
          container: 'bg-gradient-to-r from-nubank-gray-50 to-nubank-gray-50 border-l-nubank-gray-400',
          icon: 'text-nubank-gray-600 bg-nubank-gray-100',
          title: 'text-nubank-gray-900',
          description: 'text-nubank-gray-700',
          count: 'bg-nubank-gray-600 text-white'
        };
      case 4: // Archived
        return {
          container: 'bg-gradient-to-r from-nubank-orange-50 to-nubank-orange-50 border-l-nubank-orange-500',
          icon: 'text-nubank-orange-600 bg-nubank-orange-100',
          title: 'text-nubank-orange-900',
          description: 'text-nubank-orange-700',
          count: 'bg-nubank-orange-600 text-white'
        };
      default:
        return {
          container: 'bg-nubank-gray-50 border-l-nubank-gray-400',
          icon: 'text-nubank-gray-600 bg-nubank-gray-100',
          title: 'text-nubank-gray-900',
          description: 'text-nubank-gray-700',
          count: 'bg-nubank-gray-600 text-white'
        };
    }
  };

  if (projectSections.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-nubank-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInbox className="w-8 h-8 text-nubank-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-nubank-gray-800 mb-2">
            No projects yet
          </h3>
          <p className="text-nubank-gray-600 mb-6">
            Start by creating your first project to organize your work and ideas.
          </p>
          <button
            onClick={() => onProjectAction?.('new', 'create')}
            className="bg-nubank-purple-600 hover:bg-nubank-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <FiTarget className="w-4 h-4" />
            <span>Create Your First Project</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {projectSections.map((section) => {
        const headerStyles = getSectionHeaderStyles(section.priority);
        
        return (
          <section key={section.id} className="space-y-4">
            {/* Section Header */}
            <div className={`border border-l-4 rounded-lg p-4 ${headerStyles.container}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${headerStyles.icon}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${headerStyles.title} flex items-center space-x-2`}>
                      <span>{section.title}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${headerStyles.count}`}>
                        {section.projects.length}
                      </span>
                    </h2>
                    {section.description && (
                      <p className={`text-sm ${headerStyles.description}`}>
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden sm:flex items-center space-x-4 text-sm">
                  {section.id === 'active' && (
                    <div className="flex items-center space-x-1 text-nubank-purple-600">
                      <FiTrendingUp className="w-4 h-4" />
                      <span>In Progress</span>
                    </div>
                  )}
                  {section.id === 'next-up' && (
                    <div className="flex items-center space-x-1 text-nubank-blue-600">
                      <FiClock className="w-4 h-4" />
                      <span>Ready to Start</span>
                    </div>
                  )}
                  {section.id === 'archived' && (
                    <div className="flex items-center space-x-1 text-nubank-orange-600">
                      <FiArchive className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div className={`grid gap-4 lg:gap-6 ${section.gridCols}`}>
              {section.projects.map((project) => (
                <div
                  key={project.id}
                  className={`transition-transform duration-200 ${getCardStyles(section.cardSize)}`}
                >
                  <ProjectCardUnified
                    project={project}
                    variant={section.cardSize === 'compact' ? 'compact' : 'default'}
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};