import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { 
  Slack,
  Activity,
  MessageSquare,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Target,
  TrendingUp,
  Users,
  Hash,
  MessageCircle,
  AlertCircle,
  Zap,
  Check,
  X,
  Eye
} from 'lucide-react';
import { 
  useSlackTaskDiscovery,
  useSlackTaskDiscoveryScheduler,
  useSlackNotifications
} from '../../modules/slack/hooks';
import { useSlack as useSlackGlobal } from '../../contexts';
import { TaskSuggestion } from '../../modules/slack/services/SlackTaskDiscoveryService';
import { SlackNotificationPanel } from '../../modules/slack/components/SlackNotificationPanel';
import { SlackWebSocketDashboard } from '../../modules/slack/components/SlackWebSocketDashboard';
import { SlackAutoSyncDashboard } from '../../modules/slack/components/SlackAutoSyncDashboard';

interface SlackDashboardProps {
  projects: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  onTaskCreated?: (taskId: string, projectId: string) => void;
  onOpenSettings?: () => void;
}

export function SlackDashboard({ projects: _projects, onTaskCreated: _onTaskCreated, onOpenSettings }: SlackDashboardProps) {
  const {
    isConnected,
    connection,
    teamInfo,
  } = useSlackGlobal();

  const {
    pendingSuggestions,
    suggestionCounts,
    acceptSuggestion: _acceptSuggestion,
    rejectSuggestion,
    refresh: refreshSuggestions,
  } = useSlackTaskDiscovery();

  const {
    isRunning: schedulerIsRunning,
    status: schedulerStatus,
    lastScanResult,
    start: startScheduler,
    stop: stopScheduler,
    runManualScan,
    onNewSuggestions,
    onError: onSchedulerError,
  } = useSlackTaskDiscoveryScheduler();

  const {
    addNotification,
  } = useSlackNotifications();

  const [selectedSuggestion, setSelectedSuggestion] = useState<TaskSuggestion | null>(null);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Set up event handlers with notifications
  useEffect(() => {
    onNewSuggestions((count) => {
      console.log(`🎯 ${count} novas sugestões encontradas!`);
      refreshSuggestions();
      
      // Send notification for new suggestions
      if (count > 0) {
        addNotification({
          type: 'update',
          content: `${count} novas sugestões de tarefas encontradas`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });

    onSchedulerError((error) => {
      console.error('❌ Erro no scanner:', error);
      
      // Send error notification
      addNotification({
        type: 'update',
        content: `Erro no scanner: ${error}`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    });
  }, [onNewSuggestions, onSchedulerError, refreshSuggestions, addNotification, pendingSuggestions]);

  const handleSchedulerToggle = () => {
    if (schedulerIsRunning) {
      stopScheduler();
      addNotification({
        type: 'update',
        content: 'Scanner de tarefas pausado',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    } else {
      startScheduler();
      addNotification({
        type: 'update',
        content: 'Scanner de tarefas iniciado',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }
  };


  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
    } catch (error) {
      console.error('Erro ao rejeitar sugestão:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    if (diffMins > 0) return `${diffMins}m atrás`;
    return 'agora';
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'public_channel': return <Hash className="w-4 h-4" />;
      case 'dm': return <MessageCircle className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
            <h3 className="text-lg font-semibold">Slack Não Conectado</h3>
            <p className="text-muted-foreground">
              Configure a conexão com Slack para começar a descobrir tarefas automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Slack className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Descoberta de Tarefas</h1>
            <p className="text-muted-foreground">
              {teamInfo.name || 'Workspace conectado'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onOpenSettings}>
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scanner</p>
                <p className="text-lg font-semibold">
                  {schedulerIsRunning ? 'Ativo' : 'Pausado'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {schedulerIsRunning ? (
                  <Play className="w-4 h-4 text-green-500" />
                ) : (
                  <Pause className="w-4 h-4 text-gray-500" />
                )}
                <Switch 
                  checked={schedulerIsRunning}
                  onCheckedChange={handleSchedulerToggle}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sugestões Pendentes</p>
                <p className="text-lg font-semibold">{suggestionCounts.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Último Scan</p>
                <p className="text-lg font-semibold">
                  {lastScanResult?.timestamp ? formatTimeAgo(lastScanResult.timestamp) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Encontradas Hoje</p>
                <p className="text-lg font-semibold">
                  {lastScanResult?.newSuggestions ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Controle do Scanner
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={runManualScan}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Scan Manual
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshSuggestions}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Próximo Scan</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {schedulerStatus?.nextRunAt 
                  ? new Date(schedulerStatus.nextRunAt).toLocaleTimeString('pt-BR')
                  : 'Pausado'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {lastScanResult?.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">Status</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {lastScanResult?.success 
                  ? `${lastScanResult.newSuggestions || 0} novas sugestões`
                  : lastScanResult?.error || 'Nenhum scan executado'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Intervalo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A cada {schedulerStatus?.intervalMinutes || 5} minutos
              </p>
            </div>
          </div>

          {connection.state.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{connection.state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Task Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Sugestões de Tarefas
            {(suggestionCounts.pending || 0) > 0 && (
              <Badge variant="default">{suggestionCounts.pending || 0}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">Nenhuma sugestão pendente</h3>
              <p className="text-muted-foreground">
                {schedulerIsRunning 
                  ? 'O scanner está ativo e verificará novas tarefas automaticamente.'
                  : 'Ative o scanner ou execute um scan manual para encontrar tarefas.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(showAllSuggestions ? pendingSuggestions : pendingSuggestions.slice(0, 5)).map((suggestion) => (
                <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getConversationIcon(suggestion.sourceConversationType)}
                          <span className="font-medium text-sm">
                            {suggestion.sourceConversationName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.sourceConversationType}
                          </Badge>
                          <div className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}%
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold">{suggestion.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {suggestion.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Por: {suggestion.messageUser}</span>
                          <span>{formatTimeAgo(suggestion.createdAt)}</span>
                          {suggestion.assignee && (
                            <span>Para: {suggestion.assignee}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setShowSuggestionDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingSuggestions.length > 5 && !showAllSuggestions && (
                <div className="text-center">
                  <Button 
                    variant="outline"
                    onClick={() => setShowAllSuggestions(true)}
                  >
                    Ver todas ({pendingSuggestions.length - 5} restantes)
                  </Button>
                </div>
              )}
              
              {showAllSuggestions && pendingSuggestions.length > 5 && (
                <div className="text-center">
                  <Button 
                    variant="outline"
                    onClick={() => setShowAllSuggestions(false)}
                  >
                    Mostrar menos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="autosync">Auto-Sync</TabsTrigger>
          <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Hash className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Canais</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">{suggestionCounts.dms || 0}</p>
                <p className="text-sm text-muted-foreground">Mensagens Diretas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">{suggestionCounts.groups || 0}</p>
                <p className="text-sm text-muted-foreground">Grupos</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Auto-Sync Tab */}
        <TabsContent value="autosync" className="space-y-6">
          <SlackAutoSyncDashboard />
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <SlackWebSocketDashboard />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <SlackNotificationPanel />
        </TabsContent>
      </Tabs>

      {/* Suggestion Details Dialog */}
      <Dialog open={showSuggestionDetails} onOpenChange={setShowSuggestionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Sugestão</DialogTitle>
            <DialogDescription>
              Revise os detalhes antes de criar a tarefa
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getConversationIcon(selectedSuggestion.sourceConversationType)}
                <span className="font-medium">
                  {selectedSuggestion.sourceConversationName}
                </span>
                <Badge variant="secondary">
                  {selectedSuggestion.sourceConversationType}
                </Badge>
                <div className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(selectedSuggestion.confidence)}`}>
                  {Math.round(selectedSuggestion.confidence * 100)}% de confiança
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg">{selectedSuggestion.title}</h4>
                <p className="text-muted-foreground">{selectedSuggestion.description}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Mensagem Original:</p>
                <p className="text-sm italic">"{selectedSuggestion.messageText}"</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Por {selectedSuggestion.messageUser} • {formatTimeAgo(selectedSuggestion.createdAt)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedSuggestion.assignee && (
                  <div>
                    <p className="text-sm font-medium">Responsável Sugerido</p>
                    <p className="text-sm text-muted-foreground">{selectedSuggestion.assignee}</p>
                  </div>
                )}
                {selectedSuggestion.priority && (
                  <div>
                    <p className="text-sm font-medium">Prioridade</p>
                    <Badge variant={
                      selectedSuggestion.priority === 'high' ? 'destructive' :
                      selectedSuggestion.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {selectedSuggestion.priority}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowSuggestionDetails(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedSuggestion) {
                  handleRejectSuggestion(selectedSuggestion.id);
                  setShowSuggestionDetails(false);
                }
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={() => {
                // Aqui você abriria um dialog para selecionar o projeto
                setShowSuggestionDetails(false);
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}