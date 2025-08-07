import React, { useState } from 'react';
import { FiEdit3 } from 'react-icons/fi';
import { ConsolidatedHeader } from '../../dashboard/header/ConsolidatedHeader';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../utils/localStorage';

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

interface HomeHeaderProps {
  stats: ProjectStats;
  userMaxActiveProjects: number;
  onCreateProject: () => void;
  onAIInsights: () => void;
  onViewAnalytics: () => void;
  onFilterChange?: (filter: 'all' | 'active' | 'next-up' | 'archived') => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  stats,
  userMaxActiveProjects,
  onCreateProject,
  onViewAnalytics,
  onFilterChange: _onFilterChange,
}) => {
  const [portfolioTitle, setPortfolioTitle] = useState(() => 
    loadFromLocalStorage('portfolio_title', 'Your Project Portfolio')
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleTitleChange = (newTitle: string) => {
    setPortfolioTitle(newTitle);
    saveToLocalStorage('portfolio_title', newTitle);
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    } else if (e.key === 'Escape') {
      setPortfolioTitle(loadFromLocalStorage('portfolio_title', 'Your Project Portfolio'));
      setIsEditingTitle(false);
    }
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title and Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              {isEditingTitle ? (
                <form onSubmit={handleTitleSubmit} className="flex-1">
                  <input
                    type="text"
                    value={portfolioTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={() => setIsEditingTitle(false)}
                    className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent border-none outline-none focus:ring-2 focus:ring-purple-300 rounded px-1 w-full"
                    autoFocus
                  />
                </form>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {portfolioTitle}
                  </h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors duration-200 opacity-60 hover:opacity-100"
                    title="Edit portfolio title"
                  >
                    <FiEdit3 size={20} />
                  </button>
                </>
              )}
            </div>
            <p className="text-gray-600 text-base sm:text-lg font-medium">
              {stats.totalProjects > 0 ? 
                `Managing ${stats.totalProjects} project${stats.totalProjects > 1 ? 's' : ''} with ${stats.activeTasks} active tasks` :
                'Ready to start your first project'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Consolidated Header - Replaces Portfolio Stats */}
      <ConsolidatedHeader 
        stats={stats}
        onCreateProject={onCreateProject}
        onToggleAnalytics={onViewAnalytics}
        userMaxActiveProjects={userMaxActiveProjects}
      />
    </div>
  );
};