import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
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
  RefreshCw,
  User,
  Target,
  Hash,
  Users,
  MessageCircle,
  Plus,
  CheckCheck,
  Brain,
} from 'lucide-react';
import { useAIFeedback } from '../../hooks/useAIFeedback';

// Definindo tipos para as sugestões globais de tarefas
export interface GlobalTaskSuggestion {
  id: string;
  title: string;
  description: string;
  suggestedProjectId?: string;
  suggestedProjectName?: string;
  confidence: number;
  source: 'slack';
  sourceConversationId?: string;
  sourceConversationName?: string;
  sourceConversationType?: 'dm' | 'group' | 'private_channel' | 'public_channel';
  sourceMessageIds?: string[];
  sourceDetails?: {
    platform: 'slack';
    chatName?: string;
    messageCount?: number;
    participants?: string[];
    timeframe?: string;
  };
  aiReasoning?: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  messageUser?: string;
  messageText?: string;
  messageTimestamp?: string;
  suggestedProject?: { id: string; name: string; confidence: number } | null;
  dueDate?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface GlobalTaskTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: GlobalTaskSuggestion[];
  availableProjects: Project[];
  onApproveTask: (suggestionId: string, projectId?: string) => Promise<void>;
  onRejectTask: (suggestionId: string, reason?: string) => Promise<void>;
  onCreateProject: (suggestionId: string, projectName: string, projectDescription?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

type FilterType = 'all' | 'high_confidence' | 'has_project' | 'no_project';
type ConversationFilter = 'all' | 'dm' | 'group' | 'private_channel' | 'public_channel';

export function GlobalTaskTriageModal({
  isOpen,
  onClose,
  suggestions,
  availableProjects,
  onApproveTask,
  onRejectTask,
  onCreateProject,
  onRefresh,
  isLoading = false
}: GlobalTaskTriageModalProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<GlobalTaskSuggestion | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  
  // Approve dialog state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  
  // Reject dialog state
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Create project dialog state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  // Filters
  const [filter, setFilter] = useState<FilterType>('all');
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bulk selection
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // Notifications
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // AI Feedback hook
  const { submitApproval, submitRejection, submitModification } = useAIFeedback();

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(suggestion => {
    // Text search
    if (searchTerm && !suggestion.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !suggestion.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by type
    if (filter === 'high_confidence' && suggestion.confidence < 0.8) return false;
    if (filter === 'has_project' && !suggestion.suggestedProjectId) return false;
    if (filter === 'no_project' && suggestion.suggestedProjectId) return false;
    
    // Filter by conversation type
    if (conversationFilter !== 'all' && suggestion.sourceConversationType !== conversationFilter) {
      return false;
    }
    
    return true;
  });

  const handleApproveClick = (suggestion: GlobalTaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTaskTitle(suggestion.title);
    setTaskDescription(suggestion.description);
    setTaskPriority(suggestion.priority);
    setSelectedProjectId(suggestion.suggestedProjectId || '');
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (suggestion: GlobalTaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleCreateProjectClick = (suggestion: GlobalTaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setNewProjectName(suggestion.suggestedProjectName || '');
    setNewProjectDescription('');
    setIsCreateProjectDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedSuggestion) return;

    try {
      // Detect user modifications to capture learning feedback
      const modifications = [];
      let userBehavior: 'approve' | 'modify' = 'approve';

      // Check for title modifications
      if (taskTitle.trim() !== selectedSuggestion.title.trim()) {
        modifications.push({
          field: 'title',
          oldValue: selectedSuggestion.title,
          newValue: taskTitle.trim(),
          modificationType: 'modification' as const
        });
        userBehavior = 'modify';
      }

      // Check for description modifications
      if (taskDescription.trim() !== selectedSuggestion.description.trim()) {
        modifications.push({
          field: 'description',
          oldValue: selectedSuggestion.description,
          newValue: taskDescription.trim(),
          modificationType: 'modification' as const
        });
        userBehavior = 'modify';
      }

      // Check for priority modifications
      if (taskPriority !== selectedSuggestion.priority) {
        modifications.push({
          field: 'priority',
          oldValue: selectedSuggestion.priority,
          newValue: taskPriority,
          modificationType: 'modification' as const
        });
        userBehavior = 'modify';
      }

      // Check for project assignment modifications
      const originalProjectId = selectedSuggestion.suggestedProjectId || '';
      if (selectedProjectId !== originalProjectId) {
        modifications.push({
          field: 'project_assignment',
          oldValue: originalProjectId,
          newValue: selectedProjectId,
          modificationType: 'modification' as const
        });
        userBehavior = 'modify';
      }

      // Prepare context and output content
      const outputContent = JSON.stringify({
        title: selectedSuggestion.title,
        description: selectedSuggestion.description,
        confidence: selectedSuggestion.confidence,
        source: selectedSuggestion.source,
        originalPriority: selectedSuggestion.priority,
        originalProject: selectedSuggestion.suggestedProjectId
      });

      const contextData = {
        project_context: {
          domain: 'team_communication',
          team_size: 'medium',
          communication_style: 'professional',
          project_type: 'task_management',
          language: 'pt-BR'
        },
        input_complexity: selectedSuggestion.confidence,
        slack_message_count: 1,
        domain_indicators: ['slack_analysis']
      };

      // Submit appropriate feedback based on user behavior
      if (userBehavior === 'modify') {
        // User made modifications - this is valuable learning feedback
        await submitModification(
          selectedSuggestion.id,
          'task_suggestion',
          outputContent,
          selectedProjectId || 'independent',
          modifications,
          'slack_task_discovery',
          contextData
        );
        console.log(`✨ [AI_LEARNING] Captured ${modifications.length} user modifications for prompt improvement`);
      } else {
        // User approved without changes
        await submitApproval(
          selectedSuggestion.id,
          'task_suggestion',
          outputContent,
          selectedProjectId || 'independent',
          'slack_task_discovery',
          contextData
        );
      }

      await onApproveTask(selectedSuggestion.id, selectedProjectId || undefined);
      setIsApproveDialogOpen(false);
      setSelectedSuggestion(null);
      setSuccessMessage('Tarefa aprovada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error approving task:', error);
      setErrorMessage('Erro ao aprovar tarefa. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedSuggestion) return;

    try {
      // Capture behavioral feedback for AI improvement
      const outputContent = JSON.stringify({
        title: selectedSuggestion.title,
        description: selectedSuggestion.description,
        confidence: selectedSuggestion.confidence,
        source: selectedSuggestion.source
      });

      const contextData = {
        project_context: {
          domain: 'team_communication',
          team_size: 'medium',
          communication_style: 'professional',
          project_type: 'task_management',
          language: 'pt-BR'
        },
        input_complexity: selectedSuggestion.confidence,
        slack_message_count: 1,
        domain_indicators: ['slack_analysis']
      };

      await submitRejection(
          selectedSuggestion.id,
          'task_suggestion',
          outputContent,
          selectedSuggestion.suggestedProjectId || 'rejected',
          'slack_task_discovery',
          contextData
        );

      await onRejectTask(selectedSuggestion.id, rejectionReason);
      setIsRejectDialogOpen(false);
      setSelectedSuggestion(null);
      setSuccessMessage('Tarefa rejeitada.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting task:', error);
      setErrorMessage('Erro ao rejeitar tarefa. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleCreateProjectConfirm = async () => {
    if (!selectedSuggestion || !newProjectName.trim()) return;

    try {
      await onCreateProject(selectedSuggestion.id, newProjectName.trim(), newProjectDescription.trim());
      setIsCreateProjectDialogOpen(false);
      setSelectedSuggestion(null);
      setSuccessMessage('Projeto criado e tarefa associada!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error creating project:', error);
      setErrorMessage('Erro ao criar projeto. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedSuggestions.size === 0) return;

    try {
      // Process all selected suggestions in parallel for better performance
      const approvalPromises = Array.from(selectedSuggestions).map(async (suggestionId: string) => {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;
        
        // Use suggested project if available, otherwise leave unassigned
        const projectId = suggestion.suggestedProjectId;
        await onApproveTask(suggestionId, projectId);
      });

      await Promise.all(approvalPromises);
      
      // Clear selection and show success message
      setSelectedSuggestions(new Set());
      setSuccessMessage(`${selectedSuggestions.size} tarefas aprovadas com sucesso!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error in bulk approve:', error);
      setErrorMessage('Erro ao aprovar tarefas em massa. Algumas podem ter falhado.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleBulkReject = async () => {
    if (selectedSuggestions.size === 0) return;

    try {
      // Process all selected suggestions in parallel
      const rejectionPromises = Array.from(selectedSuggestions).map(async (suggestionId: string) => {
        await onRejectTask(suggestionId, 'Rejeitado em operação em massa');
      });

      await Promise.all(rejectionPromises);
      
      // Clear selection and show success message
      setSelectedSuggestions(new Set());
      setSuccessMessage(`${selectedSuggestions.size} tarefas rejeitadas.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error in bulk reject:', error);
      setErrorMessage('Erro ao rejeitar tarefas em massa. Algumas podem ter falhado.');
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

  const getSourceIcon = (suggestion: GlobalTaskSuggestion) => {
    // Slack source types only
    switch (suggestion.sourceConversationType) {
      case 'public_channel': return <Hash className="w-4 h-4" />;
      case 'private_channel': return <Hash className="w-4 h-4 text-orange-500" />;
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

  const getSourceTypeLabel = (suggestion: GlobalTaskSuggestion) => {
    // Slack source types only
    switch (suggestion.sourceConversationType) {
      case 'public_channel': return 'Canal Público';
      case 'private_channel': return 'Canal Privado';
      case 'dm': return 'Mensagem Direta';
      case 'group': return 'Grupo';
      default: return 'Slack';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Triagem de Tarefas Globais
          </DialogTitle>
          <DialogDescription>
            Tarefas descobertas automaticamente em canais do Slack. 
            Aprove, rejeite ou crie projetos para organizá-las.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center gap-2">
              <X className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Header Controls */}
          <div className="flex flex-col gap-4 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {filteredSuggestions.length} de {suggestions.length} sugestões
                </span>
                {isBulkMode && (
                  <span className="text-sm text-blue-600">
                    {selectedSuggestions.size} selecionadas
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkMode(!isBulkMode)}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {isBulkMode ? 'Sair do Modo Lote' : 'Modo Lote'}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              
              <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high_confidence">Alta Confiança</SelectItem>
                  <SelectItem value="has_project">Com Projeto</SelectItem>
                  <SelectItem value="no_project">Sem Projeto</SelectItem>
                </SelectContent>
              </Select>

              <Select value={conversationFilter} onValueChange={(value: ConversationFilter) => setConversationFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="dm">DMs</SelectItem>
                  <SelectItem value="group">Grupos</SelectItem>
                  <SelectItem value="private_channel">Canal Privado</SelectItem>
                  <SelectItem value="public_channel">Canal Público</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {isBulkMode && selectedSuggestions.size > 0 && (
              <div className="flex gap-2 p-3 bg-blue-50 rounded-md">
                <Button size="sm" onClick={handleBulkApprove}>
                  <Check className="w-4 h-4 mr-1" />
                  Aprovar {selectedSuggestions.size}
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkReject}>
                  <X className="w-4 h-4 mr-1" />
                  Rejeitar {selectedSuggestions.size}
                </Button>
              </div>
            )}
          </div>

          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {filteredSuggestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma sugestão encontrada</h3>
                  <p className="text-muted-foreground">
                    {suggestions.length === 0 
                      ? 'Execute uma sincronização para descobrir tarefas em suas conversas.'
                      : 'Ajuste os filtros para ver mais sugestões.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="hover:bg-gray-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Bulk selection checkbox */}
                      {isBulkMode && (
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(suggestion.id)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newSelection = new Set(selectedSuggestions);
                              if (e.target.checked) {
                                newSelection.add(suggestion.id);
                              } else {
                                newSelection.delete(suggestion.id);
                              }
                              setSelectedSuggestions(newSelection);
                            }}
                            className="rounded border-gray-300"
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSourceIcon(suggestion)}
                          <span className="font-medium">
                            {suggestion.sourceConversationName || suggestion.sourceDetails?.chatName || 'Unknown Source'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {getSourceTypeLabel(suggestion)}
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

                        {/* AI Reasoning */}
                        {suggestion.aiReasoning && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Análise da IA</span>
                            </div>
                            <p className="text-sm text-blue-700">{suggestion.aiReasoning}</p>
                          </div>
                        )}

                        {/* Project Suggestion */}
                        {suggestion.suggestedProjectId || suggestion.suggestedProjectName ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                            <Target className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-800">
                              Projeto sugerido: {
                                availableProjects.find(p => p.id === suggestion.suggestedProjectId)?.name ||
                                suggestion.suggestedProjectName ||
                                'Novo projeto'
                              }
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md">
                            <MessageSquare className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800">Tarefa independente (TODO)</span>
                          </div>
                        )}

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
                          <Badge 
                            variant={
                              suggestion.priority === 'urgent' ? 'destructive' :
                              suggestion.priority === 'high' ? 'destructive' :
                              suggestion.priority === 'medium' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>

                        {/* Original Message */}
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver mensagem original
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <p className="italic">"{suggestion.messageText}"</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimeAgo(suggestion.messageTimestamp || '')}
                            </p>
                          </div>
                        </details>
                      </div>

                      {/* Actions */}
                      {!isBulkMode && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveClick(suggestion)}
                            className="min-w-[100px]"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          
                          {suggestion.suggestedProjectName && !suggestion.suggestedProjectId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateProjectClick(suggestion)}
                              className="min-w-[100px]"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Criar Projeto
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectClick(suggestion)}
                            className="min-w-[100px]"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aprovar Tarefa</DialogTitle>
              <DialogDescription>
                Revise e ajuste os detalhes da tarefa antes de criar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Projeto</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto ou deixe vazio para TODO independente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">TODO Independente</SelectItem>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Título da Tarefa</label>
                <Input
                  value={taskTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskTitle(e.target.value)}
                  placeholder="Título da tarefa"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={taskDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskDescription(e.target.value)}
                  placeholder="Descrição da tarefa"
                  rows={3}
                />
              </div>

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
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleApproveConfirm}
                disabled={!taskTitle.trim()}
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
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
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

        {/* Create Project Dialog */}
        <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto</DialogTitle>
              <DialogDescription>
                Crie um novo projeto e associe a tarefa automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Projeto</label>
                <Input
                  value={newProjectName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                  placeholder="Nome do projeto"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  value={newProjectDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProjectDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste projeto"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateProjectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateProjectConfirm}
                disabled={!newProjectName.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Projeto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}