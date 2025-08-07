import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { 
  MessageSquare, 
  Clock, 
  Check, 
  X, 
  Settings,
  RefreshCw,
  User,
  Target,
  Hash,
  Users,
  MessageCircle
} from 'lucide-react';
import { useSlackTaskDiscovery } from '../../modules/slack/hooks/useSlackTaskDiscovery';
import { TaskSuggestion } from '../../modules/slack/services/SlackTaskDiscoveryService';

interface SlackTaskSuggestionsProps {
  projects: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  onTaskCreated?: (taskId: string, projectId: string) => void;
}

export function SlackTaskSuggestions({ projects, onTaskCreated }: SlackTaskSuggestionsProps) {
  const {
    pendingSuggestions,
    suggestionCounts,
    acceptSuggestion,
    rejectSuggestion,
    refresh: refreshSuggestions,
    isAnalyzing,
  } = useSlackTaskDiscovery();

  const [selectedSuggestion, setSelectedSuggestion] = useState<TaskSuggestion | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  // Accept dialog state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  
  // Reject dialog state
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Notification state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Auto-refresh suggestions every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSuggestions();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshSuggestions]);

  const handleAcceptClick = (suggestion: TaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTaskName(suggestion.title);
    setTaskDescription(suggestion.description);
    setTaskPriority(suggestion.priority || 'medium');
    setTaskAssignee(suggestion.assignee || '');
    setSelectedProjectId('');
    setIsAcceptDialogOpen(true);
  };

  const handleRejectClick = (suggestion: TaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleAcceptConfirm = async () => {
    if (!selectedSuggestion || !selectedProjectId) return;

    try {
      await acceptSuggestion(selectedSuggestion.id);

      onTaskCreated?.(selectedSuggestion.id, selectedProjectId);
      setIsAcceptDialogOpen(false);
      setSelectedSuggestion(null);
      setSuccessMessage('Task suggestion accepted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      setErrorMessage('Failed to accept suggestion. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedSuggestion) return;

    try {
      await rejectSuggestion(selectedSuggestion.id);
      setIsRejectDialogOpen(false);
      setSelectedSuggestion(null);
      setSuccessMessage('Task suggestion rejected.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      setErrorMessage('Failed to reject suggestion. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
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

  const getConversationIcon = (type: TaskSuggestion['sourceConversationType']) => {
    switch (type) {
      case 'public_channel': return <Hash className="w-4 h-4" />;
      case 'dm': return <MessageCircle className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sugestões de Tarefas do Slack</h2>
          <p className="text-sm text-muted-foreground">
            {suggestionCounts.pending} sugestões pendentes
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigDialogOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshSuggestions()}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Verificando...' : 'Verificar Agora'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center gap-2">
          <X className="w-4 h-4" />
          <span>{errorMessage}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setErrorMessage('')}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMessage}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSuccessMessage('')}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{suggestionCounts.pending + suggestionCounts.accepted + suggestionCounts.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Canais</p>
                <p className="text-lg font-semibold">{(suggestionCounts.groups || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">DMs</p>
                <p className="text-lg font-semibold">{suggestionCounts.dms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Grupos</p>
                <p className="text-lg font-semibold">{suggestionCounts.groups}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {pendingSuggestions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma sugestão pendente</h3>
              <p className="text-muted-foreground">
                {isAnalyzing 
                  ? 'Verificando mensagens do Slack...'
                  : 'Execute uma verificação para encontrar novas tarefas potenciais.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingSuggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      {getConversationIcon(suggestion.sourceConversationType)}
                      <span className="font-medium">{suggestion.sourceConversationName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.sourceConversationType}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Task Details */}
                    <div>
                      <h4 className="font-medium text-lg mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Por: {suggestion.messageUser}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(suggestion.createdAt)}</span>
                      </div>
                      {suggestion.assignee && (
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>Para: {suggestion.assignee}</span>
                        </div>
                      )}
                      {suggestion.priority && (
                        <Badge 
                          variant={
                            suggestion.priority === 'high' ? 'destructive' :
                            suggestion.priority === 'medium' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {suggestion.priority}
                        </Badge>
                      )}
                    </div>

                    {/* Original Message */}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver mensagem original
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="italic">"{suggestion.messageText}"</p>
                      </div>
                    </details>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptClick(suggestion)}
                      className="min-w-[80px]"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectClick(suggestion)}
                      className="min-w-[80px]"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Accept Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Tarefa</DialogTitle>
            <DialogDescription>
              Revise e ajuste os detalhes da tarefa antes de criar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Projeto</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Nome da Tarefa</label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nome da tarefa"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Descrição da tarefa"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={taskPriority} onValueChange={(value: any) => setTaskPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Input
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  placeholder="@usuário ou nome"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAcceptDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAcceptConfirm}
              disabled={!selectedProjectId || !taskName}
            >
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Sugestão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar esta sugestão? Você pode adicionar um motivo opcional.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Não é uma tarefa relevante, já foi feito, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}