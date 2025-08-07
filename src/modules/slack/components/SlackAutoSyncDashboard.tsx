import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Separator } from '../../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiSettings,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiActivity,
  FiZap,
  FiCalendar,
  FiBarChart2,
  FiWifi,
  FiMessageSquare,
  FiTrendingUp
} from 'react-icons/fi';
import { useSlackAutoSync } from '../hooks/useSlackAutoSync';
import { AutoSyncConfig, SyncOperation } from '../services/SlackAutoSyncService';

interface SlackAutoSyncDashboardProps {
  className?: string;
  showSettings?: boolean;
}

export function SlackAutoSyncDashboard({ 
  className, 
  showSettings = true 
}: SlackAutoSyncDashboardProps) {
  const {
    config,
    syncState,
    recentOperations,
    isLoading,
    startManualSync,
    cancelSync,
    updateConfig,
    syncProgress,
    getNextSyncTime,
    canStartSync,
    getCooldownRemaining,
  } = useSlackAutoSync();

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempConfig, setTempConfig] = useState<AutoSyncConfig | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Initialize temp config when dialog opens
  useEffect(() => {
    if (showSettingsDialog && config) {
      setTempConfig({ ...config });
    }
  }, [showSettingsDialog, config]);

  // Update cooldown countdown
  useEffect(() => {
    const updateCooldown = () => {
      setCooldownRemaining(getCooldownRemaining());
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    
    return () => clearInterval(interval);
  }, [getCooldownRemaining]);

  const handleStartSync = async () => {
    try {
      await startManualSync();
    } catch (error) {
      console.error('Failed to start sync:', error);
    }
  };

  const handleCancelSync = async () => {
    try {
      await cancelSync();
    } catch (error) {
      console.error('Failed to cancel sync:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (tempConfig) {
      try {
        await updateConfig(tempConfig);
        setShowSettingsDialog(false);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  };

  const handleToggleAutoSync = async () => {
    if (config) {
      try {
        await updateConfig({ enableAutoSync: !config.enableAutoSync });
      } catch (error) {
        console.error('Failed to toggle auto-sync:', error);
      }
    }
  };

  const getOperationIcon = (operation: SyncOperation) => {
    switch (operation.status) {
      case 'completed':
        return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <FiXCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <FiRefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <FiXCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <FiClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOperationTypeIcon = (type: SyncOperation['type']) => {
    switch (type) {
      case 'manual':
        return <FiPlay className="w-4 h-4" />;
      case 'scheduled':
        return <FiClock className="w-4 h-4" />;
      case 'realtime':
        return <FiWifi className="w-4 h-4" />;
      case 'event_triggered':
        return <FiZap className="w-4 h-4" />;
      default:
        return <FiActivity className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp provided to formatTimeAgo:', timestamp);
      return 'data inválida';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) return `${diffHours}h atrás`;
    if (diffMins > 0) return `${diffMins}m atrás`;
    return `${diffSecs}s atrás`;
  };

  const getStatusColor = () => {
    if (syncProgress.isRunning) return 'text-blue-500';
    if (config?.enableAutoSync) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (syncProgress.isRunning) return 'Sincronizando...';
    if (config?.enableAutoSync) return 'Automático';
    return 'Pausado';
  };

  const nextSyncTime = getNextSyncTime();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sincronização Automática</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <FiRefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FiRefreshCw className="w-5 h-5" />
            Sincronização Automática
            <Badge variant={config?.enableAutoSync ? 'default' : 'secondary'}>
              {getStatusText()}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor().replace('text-', 'bg-')}`} />
            
            {showSettings && (
              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <FiSettings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Configurações de Sincronização</DialogTitle>
                    <DialogDescription>
                      Configure como e quando sincronizar dados do Slack.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {tempConfig && (
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-auto-sync">Sincronização Automática</Label>
                        <Switch
                          id="enable-auto-sync"
                          checked={tempConfig.enableAutoSync}
                          onCheckedChange={(checked) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableAutoSync: checked } : null)
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sync-interval">Intervalo de Sincronização (minutos)</Label>
                        <Input
                          id="sync-interval"
                          type="number"
                          min="5"
                          max="1440"
                          value={tempConfig.syncIntervalMinutes}
                          onChange={(e) =>
                            setTempConfig((prev: any) => prev ? { 
                              ...prev, 
                              syncIntervalMinutes: parseInt(e.target.value) || 60 
                            } : null)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-realtime">Sincronização em Tempo Real</Label>
                        <Switch
                          id="enable-realtime"
                          checked={tempConfig.enableRealTimeSync}
                          onCheckedChange={(checked) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableRealTimeSync: checked } : null)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-websocket">WebSocket</Label>
                        <Switch
                          id="enable-websocket"
                          checked={tempConfig.enableWebSocket}
                          onCheckedChange={(checked) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableWebSocket: checked } : null)
                          }
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label htmlFor="cooldown-period">Período de Cooldown (minutos)</Label>
                        <Input
                          id="cooldown-period"
                          type="number"
                          min="1"
                          max="60"
                          value={tempConfig.cooldownPeriod}
                          onChange={(e) =>
                            setTempConfig((prev: any) => prev ? { 
                              ...prev, 
                              cooldownPeriod: parseInt(e.target.value) || 5 
                            } : null)
                          }
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Sincronizar por Eventos</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sync-channel-joined" className="text-sm">Novo Canal Adicionado</Label>
                            <Switch
                              id="sync-channel-joined"
                              checked={tempConfig.syncOnEvents.newChannelJoined}
                              onCheckedChange={(checked) =>
                                setTempConfig((prev: any) => prev ? { 
                                  ...prev, 
                                  syncOnEvents: { ...prev.syncOnEvents, newChannelJoined: checked }
                                } : null)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sync-bot-mentioned" className="text-sm">Bot Mencionado</Label>
                            <Switch
                              id="sync-bot-mentioned"
                              checked={tempConfig.syncOnEvents.botMentioned}
                              onCheckedChange={(checked) =>
                                setTempConfig((prev: any) => prev ? { 
                                  ...prev, 
                                  syncOnEvents: { ...prev.syncOnEvents, botMentioned: checked }
                                } : null)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sync-high-volume" className="text-sm">Alta Atividade</Label>
                            <Switch
                              id="sync-high-volume"
                              checked={tempConfig.syncOnEvents.highVolumeActivity}
                              onCheckedChange={(checked) =>
                                setTempConfig((prev: any) => prev ? { 
                                  ...prev, 
                                  syncOnEvents: { ...prev.syncOnEvents, highVolumeActivity: checked }
                                } : null)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveSettings}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Control Panel */}
        <div className="flex gap-2">
          <Button
            onClick={handleToggleAutoSync}
            variant={config?.enableAutoSync ? 'outline' : 'default'}
            className="flex-1"
          >
            {config?.enableAutoSync ? (
              <FiPause className="w-4 h-4 mr-2" />
            ) : (
              <FiPlay className="w-4 h-4 mr-2" />
            )}
            {config?.enableAutoSync ? 'Pausar' : 'Ativar'} Auto-Sync
          </Button>
          
          <Button
            onClick={syncProgress.isRunning ? handleCancelSync : handleStartSync}
            disabled={!canStartSync() && !syncProgress.isRunning}
            variant="outline"
          >
            {syncProgress.isRunning ? (
              <>
                <FiXCircle className="w-4 h-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Sync Manual
              </>
            )}
          </Button>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-muted-foreground" />
              <span>
                Próximo sync: {nextSyncTime ? nextSyncTime.toLocaleTimeString('pt-BR') : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-muted-foreground" />
              <span>
                Cooldown: {cooldownRemaining > 0 ? formatDuration(cooldownRemaining) : 'Disponível'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FiBarChart2 className="w-4 h-4 text-muted-foreground" />
              <span>
                Sucesso: {syncState ? Math.round((syncState.successfulOperations / Math.max(1, syncState.totalOperations)) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>
                Tempo médio: {syncState?.averageDuration ? formatDuration(syncState.averageDuration) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Operation */}
        {syncProgress.currentOperation && (
          <Alert>
            <FiActivity className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Sincronização em andamento:</strong> {syncProgress.currentOperation.type}
                  {syncProgress.estimatedTimeRemaining && (
                    <span className="text-muted-foreground ml-2">
                      (~{formatDuration(Math.round(syncProgress.estimatedTimeRemaining))} restantes)
                    </span>
                  )}
                </div>
                <FiRefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cooldown Warning */}
        {cooldownRemaining > 0 && !syncProgress.isRunning && (
          <Alert variant="default">
            <FiClock className="h-4 w-4" />
            <AlertDescription>
              Aguarde {formatDuration(cooldownRemaining)} antes de iniciar nova sincronização.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Operations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Operações Recentes</h4>
            <Badge variant="secondary">{recentOperations.length}</Badge>
          </div>
          
          {recentOperations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <FiRefreshCw className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma operação recente</p>
            </div>
          ) : (
            <ScrollArea className="h-40">
              <div className="space-y-1">
                {recentOperations.slice(0, 8).map((operation: any) => (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between p-2 rounded text-xs bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getOperationIcon(operation)}
                      {getOperationTypeIcon(operation.type)}
                      <span className="font-medium">{operation.type}</span>
                      {operation.tasksGenerated > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {operation.tasksGenerated} tarefas
                        </Badge>
                      )}
                      {operation.error && (
                        <FiAlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                      {operation.duration && (
                        <span>{formatDuration(operation.duration)}</span>
                      )}
                      <span>{formatTimeAgo(operation.startedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Statistics Summary */}
        {syncState && syncState.totalOperations > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {syncState.successfulOperations}
              </div>
              <div className="text-xs text-muted-foreground">Sucessos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {syncState.failedOperations}
              </div>
              <div className="text-xs text-muted-foreground">Falhas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {syncState.totalOperations}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        )}

        {/* Help */}
        <Alert>
          <FiMessageSquare className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Auto-Sync:</strong> Mantém dados do Slack atualizados automaticamente, 
            analisando novas mensagens e gerando sugestões de tarefas em tempo real.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}