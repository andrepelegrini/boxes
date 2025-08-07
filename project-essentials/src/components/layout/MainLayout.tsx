import React, { ReactNode, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { FiBox, FiGrid, FiPlus, FiSettings, FiLogOut, FiUser, FiZap } from 'react-icons/fi';
import { useUIStore } from '../../store';
import { useAppUser, useAppTasks } from '../../contexts/SimplifiedRootProvider';
import { useSlackTaskDiscovery } from '../../modules/slack/hooks';

const CreateProjectWizard = React.lazy(() => import('../project/CreateProjectWizardUnified'));
const TaskModal = React.lazy(() => import('../modal/TaskModal'));
const SettingsModal = React.lazy(() => import('../modal/SettingsModal'));

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { 
    showCreateProjectModal, setShowCreateProjectModal,
    showCreateTaskModal, setShowCreateTaskModal,
    currentEditingProjectForTask, setCurrentEditingProjectForTask,
    showSettingsModal, setShowSettingsModal 
  } = useUIStore();
  const { currentUser, isAuthenticated, logoutUser } = useAppUser();
  const { addTask } = useAppTasks();

  let suggestionCounts: Record<string, number> = {};
  try {
    const slackDiscovery = useSlackTaskDiscovery();
    if (slackDiscovery) {
      const projectSuggestions = slackDiscovery.taskSuggestions.reduce((acc, suggestion) => {
        if (suggestion.status === 'pending' && suggestion.projectId) {
          acc[suggestion.projectId] = (acc[suggestion.projectId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      suggestionCounts = projectSuggestions;
    }
  } catch (error) {
    suggestionCounts = {};
  }

  const totalAISuggestions = Object.values(suggestionCounts || {}).reduce((sum, count) => sum + (count as number), 0);

  const handleCreateProject = () => {
    setShowCreateProjectModal(true);
  };

  const handleShowSettings = () => {
    setShowSettingsModal(true);
  };

  const handleLogout = () => {
    logoutUser();
  };

  const handleCloseTaskModal = () => {
    setShowCreateTaskModal(false);
    setCurrentEditingProjectForTask(null);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      await addTask(taskData);
      handleCloseTaskModal();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <nav className="bg-surface shadow-sm sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center text-xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            <FiBox className="mr-2" /> Gestor de Caixas
          </Link>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser && (
               <div 
                className="flex items-center" 
                title={`${currentUser.name} (${currentUser.email})${currentUser.isAdmin ? ' - Administrador' : ''}`}
              >
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} className="w-6 h-6 rounded-full mr-1.5 hidden sm:block"/>
                ) : (
                  <FiUser className={`mr-1.5 hidden sm:block ${currentUser.isAdmin ? 'text-primary' : 'text-textAccent'}`}/>
                )}
                <span className="text-sm text-textAccent hidden md:flex items-center">
                   {currentUser.name.split(' ')[0]}
                </span>
              </div>
            )}
            <Link 
              to="/" 
              className="flex items-center text-sm text-textAccent hover:text-primary transition-colors" 
              title="Painel de Caixas"
            >
              <FiGrid className="mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Painel</span>
            </Link>
            {totalAISuggestions > 0 && (
              <Link 
                to="/ai-suggestions" 
                className="relative flex items-center text-sm text-purple-600 hover:text-purple-700 transition-colors bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1.5 rounded-full border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md" 
                title={`${totalAISuggestions} AI Task Suggestions`}
              >
                <FiZap className="mr-1.5 w-4 h-4" />
                <span className="hidden sm:inline font-medium">AI Tasks</span>
                <span className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg shadow-purple-500/25">
                  {totalAISuggestions > 9 ? '9+' : totalAISuggestions}
                </span>
              </Link>
            )}
            <button
              onClick={handleCreateProject}
              className="flex items-center border border-primary/70 text-primary font-medium hover:bg-primary/10 py-1.5 px-3 sm:px-3.5 rounded-md shadow-sm hover:shadow-md transition-all duration-150 ease-in-out text-sm"
              title="Criar Nova Caixa"
            >
              <FiPlus className="mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Nova Caixa</span>
            </button>
            <button
              onClick={handleShowSettings}
              title="Configurações"
              data-testid="settings-button"
              className="text-textAccent hover:text-primary p-1.5 rounded-full hover:bg-primary/10 transition-colors"
            >
              <FiSettings size={20} />
            </button>
            {isAuthenticated && currentUser && (
              <button
                onClick={handleLogout}
                title="Sair"
                className="text-textAccent hover:text-danger-DEFAULT p-1.5 rounded-full hover:bg-danger-DEFAULT/10 transition-colors"
              >
                <FiLogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-6 py-8">
        {children}
      </main>

      {showCreateProjectModal && (
        <Suspense fallback={<div />}>
          <CreateProjectWizard />
        </Suspense>
      )}
      {showCreateTaskModal && currentEditingProjectForTask && (
        <Suspense fallback={<div />}>
          <TaskModal
            isOpen={showCreateTaskModal}
            onClose={handleCloseTaskModal}
            onSave={handleSaveTask}
            projectId={currentEditingProjectForTask}
          />
        </Suspense>
      )}
      {showSettingsModal && (
        <Suspense fallback={<div />}>
          <SettingsModal />
        </Suspense>
      )}
    </div>
  );
};

export default MainLayout;
