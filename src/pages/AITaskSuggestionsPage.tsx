import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiFilter, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { SlackTaskSuggestions } from '../components/slack/SlackTaskSuggestions';
import { useSlackTaskDiscovery } from '../modules/slack/hooks';
import { useAppContext } from '../contexts/SimplifiedRootProvider';

export const AITaskSuggestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects: projectsContext } = useAppContext();
  const projects = projectsContext || [];
  const { 
    pendingSuggestions, 
    suggestionCounts, 
    refreshSuggestions
  } = useSlackTaskDiscovery();
  
  const [filterProject, setFilterProject] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (filterProject === 'all') {
      return pendingSuggestions || [];
    }
    return (pendingSuggestions || []).filter(suggestion => 
      suggestion.projectId === filterProject
    );
  }, [pendingSuggestions, filterProject]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSuggestions();
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalSuggestions = Object.values(suggestionCounts || {}).reduce((sum, count) => sum + count, 0);

  const handleTaskCreated = (_taskId: string, projectId: string) => {
    // Navigate to the project where the task was created
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-purple-600 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <FiZap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Task Suggestions</h1>
                  <p className="text-sm text-gray-600">
                    {totalSuggestions} suggestion{totalSuggestions !== 1 ? 's' : ''} from your team communications
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <FiFilter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by project:</span>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Projects ({totalSuggestions})</option>
              {projects.map(project => {
                const count = suggestionCounts?.[project.id] || 0;
                return (
                  <option key={project.id} value={project.id}>
                    {project.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {filteredSuggestions.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <FiZap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {filteredSuggestions.length} Task Suggestion{filteredSuggestions.length !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Review and accept suggestions from your team communications
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span>Click to review and create tasks</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <SlackTaskSuggestions
                projects={projects}
                onTaskCreated={handleTaskCreated}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiZap className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No AI Task Suggestions
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {filterProject === 'all' 
                  ? "We haven't found any task suggestions from your team communications yet. Make sure your Slack integration is configured and active."
                  : `No suggestions found for the selected project. Try switching to "All Projects" or check other projects.`}
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Scan for Tasks
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AITaskSuggestionsPage;