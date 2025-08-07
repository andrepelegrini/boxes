import React, { useMemo } from 'react';
import { FiFilter, FiPlus, FiGrid, FiTarget, FiStar, FiLayers } from 'react-icons/fi';
import { Project } from '../../../types/app';
import ProjectCardUnified from '../../project/ProjectCardUnified';

interface ProjectStats {
  activeProjects: number;
  nextUpProjects: number;
  shelfProjects: number;
  archivedProjects: number;
  totalProjects: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  totalTasks: number;
  capacityUsed: number;
  capacityTotal: number;
  capacityPercentage: number;
  isOverCapacity: boolean;
}

interface ProjectOverviewColumnProps {
  projects: Project[];
  selectedFilter: 'all' | 'active' | 'next' | 'shelf';
  onFilterChange: (filter: 'all' | 'active' | 'next' | 'shelf') => void;
  onCreateProject: () => void;
  stats: ProjectStats;
}

export const ProjectOverviewColumn: React.FC<ProjectOverviewColumnProps> = ({
  projects,
  selectedFilter,
  onFilterChange,
  onCreateProject,
  stats,
}) => {
  const filterOptions = [
    { 
      id: 'all' as const, 
      label: 'All Projects', 
      count: stats.activeProjects + stats.nextUpProjects + stats.shelfProjects,
      icon: <FiGrid className="w-4 h-4" />,
      color: 'text-textAccent'
    },
    { 
      id: 'active' as const, 
      label: 'Active', 
      count: stats.activeProjects,
      icon: <FiLayers className="w-4 h-4" />,
      color: 'text-primary'
    },
    { 
      id: 'next' as const, 
      label: 'Next Up', 
      count: stats.nextUpProjects,
      icon: <FiStar className="w-4 h-4" />,
      color: 'text-accent'
    },
    { 
      id: 'shelf' as const, 
      label: 'On Shelf', 
      count: stats.shelfProjects,
      icon: <FiTarget className="w-4 h-4" />,
      color: 'text-textAccent'
    }
  ];

  const sortedProjects = useMemo(() => {
    // First filter based on selected filter
    let filtered = [...projects];
    
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(p => p.status === 'active');
        break;
      case 'next':
        filtered = filtered.filter(p => p.status === 'shelf' && p.isNextUp);
        break;
      case 'shelf':
        filtered = filtered.filter(p => p.status === 'shelf' && !p.isNextUp);
        break;
      // 'all' shows everything, so no filtering needed
    }
    
    // Then sort the filtered results
    return filtered.sort((a, b) => {
      // Prioritize active projects, then by last updated
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      
      // Then prioritize next up
      if (a.isNextUp && !b.isNextUp) return -1;
      if (b.isNextUp && !a.isNextUp) return 1;
      
      // Finally sort by last updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, selectedFilter]);

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="bg-surface rounded-nubank-lg border border-border shadow-nubank">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-textOnSurface flex items-center">
              <FiFilter className="w-5 h-5 mr-3 text-primary" />
              Your Projects
            </h2>
            <span className="text-sm text-textAccent">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onFilterChange(option.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-nubank font-medium transition-all duration-300 ${
                  selectedFilter === option.id
                    ? 'bg-primary text-textOnPrimary shadow-nubank-purple'
                    : 'bg-background hover:bg-nubank-gray-50 text-textAccent hover:text-primary border border-border'
                }`}
              >
                <span className={selectedFilter === option.id ? 'text-white' : option.color}>
                  {option.icon}
                </span>
                <span className="text-sm">
                  {option.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedFilter === option.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-nubank-gray-100 text-textAccent'
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        {sortedProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {sortedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="animate-nubank-fade-in"
                  style={{ animationDelay: `${0.1 + (index * 0.05)}s` }}
                >
                  <ProjectCardUnified
                    project={project}
                  />
                </div>
              ))}
            </div>
            
            {/* Add Project Card */}
            <div className="md:col-span-2">
              <button
                onClick={onCreateProject}
                className="w-full p-8 border-2 border-dashed border-primary/30 rounded-nubank-lg text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
              >
                <div className="text-center">
                  <FiPlus className="w-12 h-12 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="text-lg font-semibold mb-2">Start a New Project</h3>
                  <p className="text-sm text-textAccent">
                    Transform your ideas into organized, actionable projects
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiTarget className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-textOnSurface mb-2">
              {selectedFilter === 'all' ? 'No projects yet' : `No ${filterOptions.find(f => f.id === selectedFilter)?.label.toLowerCase()} projects`}
            </h3>
            <p className="text-textAccent mb-8 max-w-md mx-auto">
              {selectedFilter === 'all' 
                ? 'Start your journey by creating your first project. Every great achievement begins with a single step.'
                : `Switch to "All Projects" to see your other projects, or create a new one.`
              }
            </p>
            <button
              onClick={onCreateProject}
              className="bg-primary text-textOnPrimary px-8 py-3 rounded-nubank font-semibold hover:bg-primary/90 transition-colors shadow-nubank-purple hover:shadow-nubank-purple-hover"
            >
              Create Your First Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};