/**
 * Sistema de Atualizações de Projeto via Slack
 * Analisa conversas para sugerir mudanças no projeto
 */

export type ProjectUpdateType = 
  | 'description'      // Mudanças na descrição/escopo do projeto
  | 'task_status'      // Atualizações de status de tarefas
  | 'timeline'         // Eventos, marcos, deadlines
  | 'metrics'          // Progresso, KPIs, estatísticas
  | 'risk'             // Identificação de riscos ou problemas
  | 'team'             // Mudanças na equipe ou responsabilidades
  | 'decision'         // Decisões importantes tomadas
  | 'milestone'        // Marcos atingidos ou planejados

export interface ProjectUpdate {
  id: string
  type: ProjectUpdateType
  confidence: number // 0-1, quão confiante a IA está na sugestão
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // Dados da mensagem origem
  sourceMessage: {
    text: string
    user: string
    timestamp: string
    channelId: string
    channelName: string
    messageId: string
  }
  
  // Mudança sugerida
  suggestedChange: {
    field: string           // Qual campo atualizar
    currentValue?: any      // Valor atual (se aplicável)
    newValue: any          // Novo valor sugerido
    action: ProjectUpdateAction
    reason: string         // Explicação da IA
    summary: string        // Resumo curto da mudança
  }
  
  // Metadados
  projectId: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  reviewedBy?: string
  reviewedAt?: string
  appliedAt?: string
}

export type ProjectUpdateAction = 
  | 'update'           // Atualizar valor existente
  | 'append'           // Adicionar ao valor existente
  | 'create'           // Criar novo item
  | 'move'             // Mover item (ex: tarefa entre colunas)
  | 'delete'           // Remover item
  | 'archive'          // Arquivar item

// Atualizações específicas por tipo
export interface DescriptionUpdate extends ProjectUpdate {
  type: 'description'
  suggestedChange: {
    field: 'description' | 'objectives' | 'scope'
    currentValue: string
    newValue: string
    action: 'update' | 'append'
    reason: string
    summary: string
    keywords: string[]     // Palavras-chave identificadas
  }
}

export interface TaskStatusUpdate extends ProjectUpdate {
  type: 'task_status'
  suggestedChange: {
    field: 'status' | 'assignee' | 'progress' | 'notes'
    currentValue: any
    newValue: any
    action: 'move' | 'update'
    reason: string
    summary: string
    taskId: string         // ID da tarefa afetada
    taskName: string       // Nome da tarefa
    fromStatus?: string    // Status anterior
    toStatus?: string      // Novo status
  }
}

export interface TimelineUpdate extends ProjectUpdate {
  type: 'timeline'
  suggestedChange: {
    field: 'events' | 'milestones' | 'deadlines'
    currentValue?: any
    newValue: ProjectEvent
    action: 'create' | 'update'
    reason: string
    summary: string
    eventType: 'milestone' | 'decision' | 'launch' | 'meeting' | 'deadline' | 'issue' | 'achievement'
  }
}

export interface MetricsUpdate extends ProjectUpdate {
  type: 'metrics'
  suggestedChange: {
    field: 'progress' | 'kpis' | 'budget' | 'team_velocity'
    currentValue?: number | string
    newValue: number | string
    action: 'update'
    reason: string
    summary: string
    metricType: string
    unit?: string
  }
}

export interface RiskUpdate extends ProjectUpdate {
  type: 'risk'
  suggestedChange: {
    field: 'risks'
    currentValue?: any
    newValue: ProjectRisk
    action: 'create' | 'update'
    reason: string
    summary: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    impact: string
    mitigation?: string
  }
}

// Tipos auxiliares
export interface ProjectEvent {
  id: string
  type: 'milestone' | 'decision' | 'launch' | 'meeting' | 'deadline' | 'issue' | 'achievement'
  title: string
  description: string
  date: string
  participants?: string[]
  relatedTasks?: string[]
  importance: 'low' | 'medium' | 'high'
  tags: string[]
}

export interface ProjectRisk {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  probability: number // 0-1
  impact: string
  mitigation?: string
  owner?: string
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted'
  identifiedAt: string
}

// Configurações de análise
export interface ProjectUpdateAnalysisConfig {
  enableDescriptionUpdates: boolean
  enableTaskStatusUpdates: boolean
  enableTimelineUpdates: boolean
  enableMetricsUpdates: boolean
  enableRiskIdentification: boolean
  
  // Limites de confiança
  minConfidenceForSuggestion: number
  autoApplyHighConfidence: boolean
  highConfidenceThreshold: number
  
  // Filtros
  excludeUsers: string[]
  includeOnlyChannels?: string[]
  keywordFilters: string[]
  
  // Frequência
  analysisIntervalHours: number
  maxSuggestionsPerDay: number
}

// Resultados da análise
export interface ProjectUpdateAnalysisResult {
  projectId: string
  channelId: string
  analysisStartTime: string
  analysisEndTime: string
  messagesAnalyzed: number
  updatesIdentified: number
  updates: ProjectUpdate[]
  errors: string[]
  confidence: {
    average: number
    min: number
    max: number
  }
}

// Estatísticas
export interface ProjectUpdateStats {
  totalSuggestions: number
  byType: Record<ProjectUpdateType, number>
  byStatus: Record<'pending' | 'approved' | 'rejected' | 'applied', number>
  averageConfidence: number
  autoAppliedCount: number
  userReviewedCount: number
  lastAnalysis: string
}