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
  Activity,
  Wifi,
  WifiOff,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Zap,
  MessageSquare,
  Hash,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Timer,
  Signal
} from 'lucide-react';
import { useSlackWebSocket } from '../hooks/useSlackWebSocket';
import { SlackEventType, WebSocketConfig } from '../services/SlackWebSocketService';

interface SlackWebSocketDashboardProps {
  className?: string;
  showSettings?: boolean;
}

export function SlackWebSocketDashboard({ 
  className, 
  showSettings = true 
}: SlackWebSocketDashboardProps) {
  const {
    state,
    config,
    recentEvents,
    isLoading,
    connect,
    disconnect,
    updateConfig,
    addEventListener,
    connectionUptime,
    eventsPerMinute,
  } = useSlackWebSocket();

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempConfig, setTempConfig] = useState<WebSocketConfig | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<Set<SlackEventType>>(new Set());

  // Initialize temp config when dialog opens
  useEffect(() => {
    if (showSettingsDialog && config) {
      setTempConfig({ ...config });
      setSelectedEventTypes(new Set(config.enabledEventTypes));
    }
  }, [showSettingsDialog, config]);

  // Set up real-time event listener
  useEffect(() => {
    const cleanup = addEventListener('all', (event: any) => {
      console.log('📡 Real-time event received:', event.type, event);
    });

    return cleanup;
  }, [addEventListener]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (tempConfig) {
      try {
        await updateConfig({
          ...tempConfig,
          enabledEventTypes: Array.from(selectedEventTypes),
        });
        setShowSettingsDialog(false);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  };

  const handleEventTypeToggle = (eventType: SlackEventType, enabled: boolean) => {
    const newSelected = new Set(selectedEventTypes);
    if (enabled) {
      newSelected.add(eventType);
    } else {
      newSelected.delete(eventType);
    }
    setSelectedEventTypes(newSelected);
  };

  const getEventIcon = (type: SlackEventType) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'channel_created':
      case 'channel_joined':
      case 'channel_left':
        return <Hash className="w-4 h-4 text-green-500" />;
      case 'team_join':
      case 'user_change':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'app_mention':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return `${diffSecs}s atrás`;
    if (diffMins < 60) return `${diffMins}m atrás`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    if (state.isConnected) return 'text-green-500';
    if (state.isConnecting) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (state.isConnected) return <Wifi className={`w-5 h-5 ${getStatusColor()}`} />;
    if (state.isConnecting) return <RefreshCw className={`w-5 h-5 ${getStatusColor()} animate-spin`} />;
    return <WifiOff className={`w-5 h-5 ${getStatusColor()}`} />;
  };

  const getStatusText = () => {
    if (state.isConnected) return 'Conectado';
    if (state.isConnecting) return 'Conectando...';
    return 'Desconectado';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>WebSocket Real-time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
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
            <Activity className="w-5 h-5" />
            WebSocket Real-time
            <Badge variant={state.isConnected ? 'default' : 'secondary'}>
              {getStatusText()}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            
            {showSettings && (
              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Configurações WebSocket</DialogTitle>
                    <DialogDescription>
                      Configure a conexão em tempo real com o Slack.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {tempConfig && (
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-reconnect">Reconexão Automática</Label>
                        <Switch
                          id="auto-reconnect"
                          checked={tempConfig.autoReconnect}
                          onCheckedChange={(checked: boolean) =>
                            setTempConfig((prev: any) => prev ? { ...prev, autoReconnect: checked } : null)
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reconnect-attempts">Tentativas de Reconexão</Label>
                        <Input
                          id="reconnect-attempts"
                          type="number"
                          min="1"
                          max="10"
                          value={tempConfig.reconnectAttempts}
                          onChange={(e: any) =>
                            setTempConfig((prev: any) => prev ? { 
                              ...prev, 
                              reconnectAttempts: parseInt(e.target.value) || 5 
                            } : null)
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reconnect-interval">Intervalo de Reconexão (ms)</Label>
                        <Input
                          id="reconnect-interval"
                          type="number"
                          min="1000"
                          max="30000"
                          step="1000"
                          value={tempConfig.reconnectInterval}
                          onChange={(e: any) =>
                            setTempConfig((prev: any) => prev ? { 
                              ...prev, 
                              reconnectInterval: parseInt(e.target.value) || 5000 
                            } : null)
                          }
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <Label>Tipos de Eventos</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {(['message', 'channel_created', 'channel_joined', 'channel_left', 'team_join', 'user_change', 'app_mention'] as SlackEventType[]).map(eventType => (
                            <div key={eventType} className="flex items-center justify-between">
                              <Label htmlFor={eventType} className="flex items-center gap-2 text-sm">
                                {getEventIcon(eventType)}
                                {eventType.replace('_', ' ')}
                              </Label>
                              <Switch
                                id={eventType}
                                checked={selectedEventTypes.has(eventType)}
                                onCheckedChange={(checked) => handleEventTypeToggle(eventType, checked)}
                              />
                            </div>
                          ))}
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
        {/* Connection Controls */}
        <div className="flex gap-2">
          {state.isConnected ? (
            <Button 
              onClick={handleDisconnect}
              variant="outline"
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={state.isConnecting}
              className="flex-1"
            >
              {state.isConnecting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {state.isConnecting ? 'Conectando...' : 'Conectar'}
            </Button>
          )}
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span>Uptime: {formatUptime(connectionUptime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>Eventos/min: {eventsPerMinute}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4 text-muted-foreground" />
              <span>Total: {state.receivedEvents}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span>Processados: {state.processedEvents}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {state.lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Info */}
        {state.isConnected && state.lastConnectedAt && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Conectado desde {new Date(state.lastConnectedAt).toLocaleTimeString('pt-BR')}
              {state.reconnectAttempts > 0 && ` (${state.reconnectAttempts} reconexões)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Eventos Recentes</h4>
            <Badge variant="secondary">{recentEvents.length}</Badge>
          </div>
          
          {recentEvents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum evento recebido</p>
            </div>
          ) : (
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {recentEvents.slice(0, 10).map((event: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded text-xs bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getEventIcon(event.type)}
                      <span className="font-medium">{event.type}</span>
                      {event.channel && (
                        <span className="text-muted-foreground truncate">#{event.channel}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Help */}
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>WebSocket Real-time:</strong> Recebe eventos do Slack instantaneamente para análise 
            de tarefas em tempo real e sincronização automática.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}