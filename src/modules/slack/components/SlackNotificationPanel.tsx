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
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  Bell,
  BellOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Target,
  RefreshCw,
  Clock,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSlackNotifications } from '../hooks/useSlackNotifications';
import { SlackNotification, NotificationConfig } from '../services/SlackNotificationService';

interface SlackNotificationPanelProps {
  className?: string;
  showSettings?: boolean;
}

export function SlackNotificationPanel({ className, showSettings = true }: SlackNotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    config,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearOldNotifications,
    refreshNotifications,
    updateConfig,
  } = useSlackNotifications();

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempConfig, setTempConfig] = useState<NotificationConfig | null>(null);

  // Initialize temp config when dialog opens
  useEffect(() => {
    if (showSettingsDialog && config) {
      setTempConfig({ ...config });
    }
  }, [showSettingsDialog, config]);

  const handleNotificationClick = async (notification: SlackNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleSaveSettings = async () => {
    if (tempConfig) {
      await updateConfig(tempConfig);
      setShowSettingsDialog(false);
    }
  };

  const getNotificationIcon = (type: SlackNotification['type']) => {
    switch (type) {
      case 'task_suggestion':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'sync_complete':
        return <RefreshCw className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'scheduler_update':
        return <Clock className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: SlackNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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
            <Bell className="w-5 h-5" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshNotifications}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 w-8 p-0"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
            
            {showSettings && (
              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Configurações de Notificações</DialogTitle>
                    <DialogDescription>
                      Configure como e quando receber notificações do Slack.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {tempConfig && (
                    <div className="grid gap-4 py-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="desktop-notifications" className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Notificações Desktop
                        </Label>
                        <Switch
                          id="desktop-notifications"
                          checked={tempConfig.enableDesktopNotifications}
                          onCheckedChange={(checked: boolean) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableDesktopNotifications: checked } : null)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="in-app-notifications" className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Notificações no App
                        </Label>
                        <Switch
                          id="in-app-notifications"
                          checked={tempConfig.enableInAppNotifications}
                          onCheckedChange={(checked: boolean) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableInAppNotifications: checked } : null)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scheduler-notifications" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Notificações do Scanner
                        </Label>
                        <Switch
                          id="scheduler-notifications"
                          checked={tempConfig.enableSchedulerNotifications}
                          onCheckedChange={(checked: boolean) =>
                            setTempConfig((prev: any) => prev ? { ...prev, enableSchedulerNotifications: checked } : null)
                          }
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-confidence">
                          Confiança Mínima para Notificação: {Math.round(tempConfig.minConfidenceForNotification * 100)}%
                        </Label>
                        <input
                          type="range"
                          id="min-confidence"
                          min="0"
                          max="1"
                          step="0.1"
                          value={tempConfig.minConfidenceForNotification}
                          onChange={(e: any) =>
                            setTempConfig((prev: any) => prev ? { ...prev, minConfidenceForNotification: parseFloat(e.target.value) } : null)
                          }
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max-notifications">
                          Máximo por Hora: {tempConfig.maxNotificationsPerHour}
                        </Label>
                        <Input
                          id="max-notifications"
                          type="number"
                          min="1"
                          max="50"
                          value={tempConfig.maxNotificationsPerHour}
                          onChange={(e: any) =>
                            setTempConfig((prev: any) => prev ? { ...prev, maxNotificationsPerHour: parseInt(e.target.value) || 10 } : null)
                          }
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="quiet-hours" className="flex items-center gap-2">
                          <VolumeX className="w-4 h-4" />
                          Horário Silencioso
                        </Label>
                        <Switch
                          id="quiet-hours"
                          checked={tempConfig.quietHours.enabled}
                          onCheckedChange={(checked: boolean) =>
                            setTempConfig((prev: any) => prev ? { 
                              ...prev, 
                              quietHours: { ...prev.quietHours, enabled: checked }
                            } : null)
                          }
                        />
                      </div>
                      
                      {tempConfig.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="start-time">Início</Label>
                            <Input
                              id="start-time"
                              type="time"
                              value={tempConfig.quietHours.startTime}
                              onChange={(e: any) =>
                                setTempConfig((prev: any) => prev ? { 
                                  ...prev, 
                                  quietHours: { ...prev.quietHours, startTime: e.target.value }
                                } : null)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="end-time">Fim</Label>
                            <Input
                              id="end-time"
                              type="time"
                              value={tempConfig.quietHours.endTime}
                              onChange={(e: any) =>
                                setTempConfig((prev: any) => prev ? { 
                                  ...prev, 
                                  quietHours: { ...prev.quietHours, endTime: e.target.value }
                                } : null)
                              }
                            />
                          </div>
                        </div>
                      )}
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
      
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="p-4 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    notification.isRead ? 'opacity-70' : 'bg-muted/20'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {notification.source}
                          </Badge>
                          <span>{formatTime(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  
                  {notification.type === 'task_suggestion' && notification.data && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      {notification.data.suggestions?.length > 0 && (
                        <div>
                          <strong>Sugestões de alta confiança:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {notification.data.suggestions.slice(0, 2).map((suggestion: any, index: number) => (
                              <li key={index} className="truncate">
                                {suggestion.title || 'Tarefa identificada'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {notifications.length > 10 && (
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearOldNotifications}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar notificações antigas
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}