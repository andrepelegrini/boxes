import React, { Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAppProjects } from './contexts/SimplifiedRootProvider';

// Lazy-loaded route components for code splitting
const Homepage = React.lazy(() => import('./pages/Homepage'));
const UnifiedProjectDashboard = React.lazy(() => import('./components/UnifiedProjectDashboard'));
const SlackCallback = React.lazy(() => import('./pages/SlackCallback').then(module => ({ default: module.SlackCallback })));
const TaskPage = React.lazy(() => import('./pages/TaskPage').then(module => ({ default: module.TaskPage })));
const OverdueTasksPage = React.lazy(() => Promise.resolve({ default: () => <div className="p-8"><h1 className="text-2xl">Overdue Tasks</h1><p>No overdue tasks</p></div> }));
const AITaskSuggestionsPage = React.lazy(() => import('./pages/AITaskSuggestionsPage'));

// Wrapper component for ProjectDashboard that works with React Router
const ProjectDashboardWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectById } = useAppProjects();
  
  const project = projectId ? getProjectById(projectId) : null;
  
  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-textAccent">Projeto não encontrado</p>
        </div>
      </div>
    );
  }
  
  return <UnifiedProjectDashboard project={project} />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-textAccent">Carregando...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/project/:projectId" element={<ProjectDashboardWrapper />} />
        <Route path="/task/:taskId" element={<TaskPage />} />
        <Route path="/project/:projectId/task/:taskId" element={<TaskPage />} />
        <Route path="/overdue-tasks" element={<OverdueTasksPage />} />
        <Route path="/ai-suggestions" element={<AITaskSuggestionsPage />} />
        <Route path="/slack/callback" element={<SlackCallback />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
