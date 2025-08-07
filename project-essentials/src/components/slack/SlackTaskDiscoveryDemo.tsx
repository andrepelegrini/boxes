import { useEffect } from 'react';
import { 
  useSlackTaskDiscovery, 
  useSlackTaskDiscoveryScheduler 
} from '../../modules/slack/hooks';
import { SlackTaskSuggestions } from './SlackTaskSuggestions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { 
  FiPlay, 
  FiPause, 
  FiRefreshCw, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle,
  FiSettings 
} from 'react-icons/fi';

interface SlackTaskDiscoveryDemoProps {
  projects: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  onTaskCreated?: (taskId: string, projectId: string) => void;
}

export function SlackTaskDiscoveryDemo({ projects, onTaskCreated }: SlackTaskDiscoveryDemoProps) {
  const {
    pendingSuggestions: _pendingSuggestions,
    suggestionCounts: _suggestionCounts,
    error: discoveryError,
    scanForTasks: _scanForTasks,
    refreshSuggestions,
  } = useSlackTaskDiscovery();

  const {
    isRunning: schedulerIsRunning,
    status: schedulerStatus,
    config: schedulerConfig,
    lastScanResult,
    start: startScheduler,
    stop: stopScheduler,
    runManualScan,
    updateConfig: _updateSchedulerConfig,
    onNewSuggestions,
    onError: onSchedulerError,
  } = useSlackTaskDiscoveryScheduler();

  // Set up scheduler event handlers
  useEffect(() => {
    onNewSuggestions((count) => {
      console.log(`🎯 Found ${count} new task suggestions from Slack!`);
      // You could show a notification here
      refreshSuggestions();
    });

    onSchedulerError((error) => {
      console.error('❌ Scheduler error:', error);
      // You could show an error notification here
    });
  }, [onNewSuggestions, onSchedulerError, refreshSuggestions]);

  const handleSchedulerToggle = () => {
    if (schedulerIsRunning) {
      stopScheduler();
    } else {
      startScheduler();
    }
  };

  const handleManualScan = async () => {
    await runManualScan();
    await refreshSuggestions();
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Descoberta de Tarefas do Slack</h1>
          <p className="text-muted-foreground">
            Sistema automático de identificação de tarefas em conversas do Slack
          </p>
        </div>
      </div>

      {/* Scheduler Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSettings className="w-5 h-5" />
            Painel de Controle do Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scheduler Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {schedulerIsRunning ? (
                  <FiPlay className="w-4 h-4 text-green-500" />
                ) : (
                  <FiPause className="w-4 h-4 text-gray-500" />
                )}
                <span className="font-medium">
                  Scanner Automático: {schedulerIsRunning ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <Badge variant={schedulerIsRunning ? 'default' : 'secondary'}>
                {schedulerConfig.scheduler.intervalMinutes}min
              </Badge>
            </div>

            <Switch
              checked={schedulerIsRunning}
              onCheckedChange={handleSchedulerToggle}
            />
          </div>

          {/* Scanner Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Próximo Scan</p>
                <p className="text-sm font-medium">
                  {schedulerStatus.nextRunAt ? formatTime(schedulerStatus.nextRunAt) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastScanResult?.success ? (
                <FiCheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <FiAlertCircle className="w-4 h-4 text-red-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Último Resultado</p>
                <p className="text-sm font-medium">
                  {lastScanResult?.success 
                    ? `${lastScanResult.newSuggestions} sugestões` 
                    : lastScanResult?.error || 'Nenhum scan ainda'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Última Execução</p>
                <p className="text-sm font-medium">
                  {lastScanResult?.timestamp ? formatTime(lastScanResult.timestamp) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={handleManualScan}
              variant="outline"
              size="sm"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              Scan Manual
            </Button>
            
            <Button 
              onClick={refreshSuggestions}
              variant="outline"
              size="sm"
            >
              Atualizar Lista
            </Button>
          </div>

          {/* Error Display */}
          {discoveryError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{discoveryError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Suggestions */}
      <SlackTaskSuggestions 
        projects={projects}
        onTaskCreated={onTaskCreated || (() => {})}
      />

    </div>
  );
}