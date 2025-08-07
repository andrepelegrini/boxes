import React, { useMemo, useState, useEffect } from 'react';
import { FiBox, FiList, FiPlus, FiBarChart2, FiSmartphone } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { HomeHeader } from '../components/home/header/HomeHeader';
import { ProjectOverviewColumn } from '../components/home/columns/ProjectOverviewColumn';
import { ProjectKanbanBoard } from '../components/kanban/ProjectKanbanBoard';
import { GlobalTaskTriageModal, GlobalTaskSuggestion } from '../components/modal/GlobalTaskTriageModal';

import { useAppContext } from '../contexts/SimplifiedRootProvider';
import { AnalyticsModal } from '../components/modals/AnalyticsModal';
import { PROJECT_STATUS_ACTIVE, PROJECT_STATUS_ARCHIVED, PROJECT_STATUS_SHELF } from '../constants/appConstants';
import GlobalTaskDiscoveryService from '../services/GlobalTaskDiscoveryService';
import GlobalTaskIntegrationService from '../services/GlobalTaskIntegrationService';


export const Homepage: React.FC = () => {
  const { projects: projectsContext, tasks: tasksContext, userMaxActiveProjects = 5, showCreateProjectModal: _showCreateProjectModal, setShowCreateProjectModal, activityLogs = [], updateProject } = useAppContext();
  const projects = projectsContext?.projects || [];
  const tasks = tasksContext?.tasks || [];
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'next' | 'shelf'>('all');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [viewMode, _setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [activeTab, setActiveTab] = useState<'projects' | 'global-tasks'>('projects');
  const [showGlobalTriageModal, setShowGlobalTriageModal] = useState(false);
  const [globalTaskSuggestions, setGlobalTaskSuggestions] = useState<GlobalTaskSuggestion[]>([]);
  const [isLoadingGlobalTasks, setIsLoadingGlobalTasks] = useState(false);

  // Initialize global task services (singleton pattern)
  const globalTaskIntegration = useMemo(() => GlobalTaskIntegrationService.getInstance(), []);
  const globalTaskDiscovery = useMemo(() => GlobalTaskDiscoveryService.getInstance(), []);
  const [isGlobalTasksInitialized, setIsGlobalTasksInitialized] = useState(false);

  // Initialize global task integration once
  useEffect(() => {
    if (!isGlobalTasksInitialized) {
      const initializeGlobalTasks = async () => {
        try {
          await globalTaskIntegration.initialize();
          setIsGlobalTasksInitialized(true);
          console.log('Global task integration initialized');
        } catch (error) {
          console.error('Failed to initialize global task integration:', error);
        }
      };

      initializeGlobalTasks();
    }
  }, [globalTaskIntegration, isGlobalTasksInitialized]);

  

  // Update available projects for intelligent project assignment
  useEffect(() => {
    globalTaskDiscovery.updateAvailableProjects(projects);
  }, [projects, globalTaskDiscovery]);

  // Load global task suggestions only once when tab becomes active
  useEffect(() => {
    const loadGlobalTasks = async () => {
      if (activeTab === 'global-tasks' && !isLoadingGlobalTasks && globalTaskSuggestions.length === 0) {
        console.log('🔄 Loading global task suggestions for the first time...');
        setIsLoadingGlobalTasks(true);
        try {
          const suggestions = await globalTaskIntegration.performManualDiscovery();
          setGlobalTaskSuggestions(suggestions);
          console.log(`✅ Loaded ${suggestions.length} global task suggestions`);
        } catch (error) {
          console.error('Failed to load global task suggestions:', error);
          // Fallback to empty array on error
          setGlobalTaskSuggestions([]);
        } finally {
          setIsLoadingGlobalTasks(false);
        }
      }
    };

    loadGlobalTasks();
  }, [activeTab, globalTaskIntegration]);

  // Calculate stats for the header
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === PROJECT_STATUS_ACTIVE).length;
    const nextUpProjects = projects.filter(p => p.isNextUp === true).length;
    const shelfProjects = projects.filter(p => p.status === PROJECT_STATUS_SHELF).length;
    const archivedProjects = projects.filter(p => p.status === PROJECT_STATUS_ARCHIVED).length;
    const totalProjects = projects.length;

    const activeTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const totalTasks = tasks.length;

    // Global tasks stats (tasks without projectId or independent tasks)
    const globalTasks = tasks.filter(t => !t.projectId);
    const globalActiveTasks = globalTasks.filter(t => !t.completed).length;
    const globalCompletedTasks = globalTasks.filter(t => t.completed).length;
    const pendingTriageTasks = globalTaskSuggestions.filter(s => s.status === 'pending').length;

    const capacityUsed = activeProjects;
    const capacityTotal = userMaxActiveProjects;
    const capacityPercentage = capacityTotal > 0 ? (capacityUsed / capacityTotal) * 100 : 0;
    const isOverCapacity = capacityUsed > capacityTotal;

    return {
      activeProjects,
      nextUpProjects,
      shelfProjects,
      archivedProjects,
      totalProjects,
      completedTasks,
      activeTasks,
      overdueTasks,
      totalTasks,
      capacityUsed,
      capacityTotal,
      capacityPercentage,
      isOverCapacity,
      globalActiveTasks,
      globalCompletedTasks,
      pendingTriageTasks,
    };
  }, [projects, tasks, userMaxActiveProjects, globalTaskSuggestions]);

  const handleCreateProject = () => {
    console.log('📦 [HOMEPAGE] User clicked create project button');
    setShowCreateProjectModal(true);
  };

  const handleShowAnalytics = () => {
    console.log('📊 [HOMEPAGE] User clicked analytics button');
    setShowAnalyticsModal(true);
  };

  const handleRefreshGlobalTasks = async () => {
    setIsLoadingGlobalTasks(true);
    try {
      const suggestions = await globalTaskIntegration.performManualDiscovery();
      setGlobalTaskSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to refresh global task suggestions:', error);
    } finally {
      setIsLoadingGlobalTasks(false);
    }
  };

  const handleApproveGlobalTask = async (suggestionId: string, projectId?: string) => {
    try {
      const suggestion = globalTaskSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        await tasksContext.addTask({
          name: suggestion.name,
          description: suggestion.description,
          projectId: projectId,
          status: 'todo',
        });
        setGlobalTaskSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? { ...s, status: 'approved' as const } : s)
        );
      }
    } catch (error) {
      console.error('Failed to approve global task:', error);
    }
  };

  const handleRejectGlobalTask = async (suggestionId: string, reason?: string) => {
    try {
      console.log('Reject global task:', suggestionId, reason);
      
      // Remove from suggestions after rejection
      setGlobalTaskSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' as const } : s)
      );
    } catch (error) {
      console.error('Failed to reject global task:', error);
    }
  };

  const handleCreateProjectForTask = async (suggestionId: string, projectName: string, projectDescription?: string) => {
    try {
      const newProject = await projectsContext.addProject({
        name: projectName,
        description: projectDescription || '',
        status: 'active',
      });
      const suggestion = globalTaskSuggestions.find(s => s.id === suggestionId);
      if (suggestion && newProject) {
        await tasksContext.addTask({
          name: suggestion.name,
          description: suggestion.description,
          projectId: newProject.id,
          status: 'todo',
        });
        setGlobalTaskSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? { ...s, status: 'converted' as const } : s)
        );
      }
    } catch (error) {
      console.error('Failed to create project for global task:', error);
    }
  };


  

  return (
    <div className="space-y-8">
      <HomeHeader 
        stats={stats}
        userMaxActiveProjects={userMaxActiveProjects}
        onCreateProject={handleCreateProject}
        onAIInsights={() => setShowAnalyticsModal(true)}
        onViewAnalytics={handleShowAnalytics}
      />
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              console.log('🏠 [HOMEPAGE] User clicked Projects tab');
              setActiveTab('projects');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiBox className="w-4 h-4" />
              <span>Projetos</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {stats.activeProjects}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => {
              console.log('🏠 HOMEPAGE: User clicked "Tarefas Globais" tab');
              setActiveTab('global-tasks');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'global-tasks'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiList className="w-4 h-4" />
              <span>Tarefas Globais</span>
              <div className="flex gap-1">
                {stats.globalActiveTasks > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {stats.globalActiveTasks} ativas
                  </span>
                )}
                {stats.pendingTriageTasks > 0 && (
                  <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">
                    {stats.pendingTriageTasks} pendentes
                  </span>
                )}
              </div>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'projects' ? (
          <div className="grid grid-cols-1 gap-8">
            {viewMode === 'kanban' ? (
              <ProjectKanbanBoard
                projects={projects}
                onUpdateProject={updateProject}
                searchTerm=""
                filterBy="all"
                sortBy="created"
              />
            ) : (
              <ProjectOverviewColumn
                projects={projects}
                selectedFilter={selectedFilter}
                onFilterChange={setSelectedFilter}
                onCreateProject={handleCreateProject}
                stats={stats}
              />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Tasks Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Tarefas Globais</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gerencie tarefas independentes e sugestões descobertas automaticamente
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('📋 [HOMEPAGE] User clicked task triage modal button');
                    setShowGlobalTriageModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <FiBarChart2 className="w-4 h-4" />
                  Triagem de Sugestões
                  {stats.pendingTriageTasks > 0 && (
                    <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
                      {stats.pendingTriageTasks}
                    </span>
                  )}
                </button>
                
                
                <button
                  onClick={() => tasksContext.setShowCreateTaskModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Nova Tarefa
                </button>
              </div>
            </div>

            {/* Global Tasks Kanban */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {stats.globalActiveTasks === 0 && stats.pendingTriageTasks === 0 ? (
                <div className="text-center py-12">
                  <FiList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa global</h3>
                  <p className="text-gray-500 mb-4">
                    Crie tarefas independentes ou configure a sincronização do Slack para descobrir tarefas automaticamente.
                  </p>
                  <button
                    onClick={() => {
                      console.log('📋 [HOMEPAGE] User clicked configure discovery button');
                      setShowGlobalTriageModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiBarChart2 className="w-4 h-4" />
                    Configurar Descoberta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {/* Global Tasks Kanban Columns - Similar ao kanban de tarefas dos projetos */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">A Fazer</h3>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                      <p className="text-gray-500 text-sm">Tarefas independentes aprovadas</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Em Andamento</h3>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                      <p className="text-gray-500 text-sm">Tarefas em execução</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Concluídas</h3>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                      <p className="text-gray-500 text-sm">Tarefas finalizadas</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAnalyticsModal && (
        <AnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          projects={projects}
          tasks={tasks}
          activityLogs={activityLogs}
        />
      )}

      {showGlobalTriageModal && (
        <GlobalTaskTriageModal
          isOpen={showGlobalTriageModal}
          onClose={() => setShowGlobalTriageModal(false)}
          suggestions={globalTaskSuggestions}
          availableProjects={projects}
          onApproveTask={handleApproveGlobalTask}
          onRejectTask={handleRejectGlobalTask}
          onCreateProject={handleCreateProjectForTask}
          onRefresh={handleRefreshGlobalTasks}
          isLoading={isLoadingGlobalTasks}
        />
      )}


    </div>
  );
};

export default Homepage;