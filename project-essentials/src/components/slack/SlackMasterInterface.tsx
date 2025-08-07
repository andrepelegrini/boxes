import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { FiLoader } from 'react-icons/fi';
import { useSlack as useSlackGlobal } from '../../contexts';
import { SlackDashboard } from './SlackDashboard';

interface SlackMasterInterfaceProps {
  projects: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  onTaskCreated?: (taskId: string, projectId: string) => void;
}

type ViewState = 'loading' | 'wizard' | 'dashboard' | 'settings';

export function SlackMasterInterface({ projects, onTaskCreated }: SlackMasterInterfaceProps) {
  const {
    isConnected,
    isConfigured,
    isLoading,
  } = useSlackGlobal();

  const [currentView, setCurrentView] = useState<ViewState>('loading');

  // Determine which view to show based on connection state
  useEffect(() => {
    if (isLoading) {
      setCurrentView('loading');
      return;
    }

    if (!isConfigured || !isConnected) {
      setCurrentView('wizard');
      return;
    }

    if (currentView === 'loading' || currentView === 'wizard') {
      setCurrentView('dashboard');
    }
  }, [isLoading, isConfigured, isConnected, currentView]);

  const handleOpenSettings = () => {
    setCurrentView('settings');
  };

  // Loading state
  if (currentView === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <FiLoader className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <h3 className="text-lg font-semibold">Carregando Slack</h3>
            <p className="text-muted-foreground">
              Verificando status da conexão...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wizard state (setup/configuration)
  if (currentView === 'wizard') {
    return (
      <div>Wizard</div>
    );
  }

  // Settings state
  if (currentView === 'settings') {
    return (
      <div className="container mx-auto p-6">
        <div>Settings</div>
      </div>
    );
  }

  // Dashboard state (main interface)
  return (
    <div className="container mx-auto p-6">
      <SlackDashboard 
        projects={projects}
        onTaskCreated={onTaskCreated || (() => {})}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );
}