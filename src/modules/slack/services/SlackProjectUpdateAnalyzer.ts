import { 
  ProjectUpdate, 
  ProjectUpdateAnalysisResult,
  ProjectUpdateAnalysisConfig,
  DescriptionUpdate,
  TaskStatusUpdate,
  TimelineUpdate,
  MetricsUpdate,
  RiskUpdate,
  ProjectEvent,
  ProjectRisk
} from '../../../types/projectUpdates';
import { SlackMessage } from '../types/integration';
import { generateId } from '../../../utils/helpers';

/**
 * Analisador de IA para identificar atualizações de projeto em mensagens do Slack
 */
export class SlackProjectUpdateAnalyzer {
  
  private static readonly DEFAULT_CONFIG: ProjectUpdateAnalysisConfig = {
    enableDescriptionUpdates: true,
    enableTaskStatusUpdates: true,
    enableTimelineUpdates: true,
    enableMetricsUpdates: true,
    enableRiskIdentification: true,
    
    autoApplyHighConfidence: false,
    
    excludeUsers: ['slackbot'],
    keywordFilters: [],
    
    analysisIntervalHours: 1,
    maxSuggestionsPerDay: 20
  };

  /**
   * Analisa mensagens para identificar atualizações de projeto
   */
  static async analyzeMessages(
    messages: SlackMessage[],
    projectId: string,
    channelId: string,
    channelName: string,
    config: Partial<ProjectUpdateAnalysisConfig> = {}
  ): Promise<ProjectUpdateAnalysisResult> {
    const analysisConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = new Date().toISOString();
    
    console.log(`🔍 [ProjectUpdateAnalyzer] Analisando ${messages.length} mensagens para atualizações`);
    
    const updates: ProjectUpdate[] = [];
    const errors: string[] = [];
    let messagesAnalyzed = 0;

    for (const message of messages) {
      try {
        // Filtrar usuários excluídos
        if (analysisConfig.excludeUsers.includes(message.user)) {
          continue;
        }

        // Filtrar mensagens muito curtas ou irrelevantes
        if (!message.text || message.text.length < 10) {
          continue;
        }

        messagesAnalyzed++;

        // Analisar cada tipo de atualização
        if (analysisConfig.enableTaskStatusUpdates) {
          const taskUpdates = await this.analyzeTaskStatusUpdates(message, projectId, channelId, channelName);
          updates.push(...taskUpdates);
        }

        if (analysisConfig.enableTimelineUpdates) {
          const timelineUpdates = await this.analyzeTimelineUpdates(message, projectId, channelId, channelName);
          updates.push(...timelineUpdates);
        }

        if (analysisConfig.enableDescriptionUpdates) {
          const descriptionUpdates = await this.analyzeDescriptionUpdates(message, projectId, channelId, channelName);
          updates.push(...descriptionUpdates);
        }

        if (analysisConfig.enableMetricsUpdates) {
          const metricsUpdates = await this.analyzeMetricsUpdates(message, projectId, channelId, channelName);
          updates.push(...metricsUpdates);
        }

        if (analysisConfig.enableRiskIdentification) {
          const riskUpdates = await this.analyzeRiskUpdates(message, projectId, channelId, channelName);
          updates.push(...riskUpdates);
        }

      } catch (error) {
        console.error(`Erro ao analisar mensagem ${message.ts}:`, error);
        errors.push(`Mensagem ${message.ts}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Accept all updates (no confidence filtering)
    const filteredUpdates = updates;

    // Calcular estatísticas
    const confidenceScores = filteredUpdates.map(u => u.confidence);
    const confidence = {
      average: confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b) / confidenceScores.length : 0,
      min: confidenceScores.length > 0 ? Math.min(...confidenceScores) : 0,
      max: confidenceScores.length > 0 ? Math.max(...confidenceScores) : 0
    };

    console.log(`✅ [ProjectUpdateAnalyzer] Análise concluída: ${filteredUpdates.length} atualizações identificadas`);

    return {
      projectId,
      channelId,
      analysisStartTime: startTime,
      analysisEndTime: new Date().toISOString(),
      messagesAnalyzed,
      updatesIdentified: filteredUpdates.length,
      updates: filteredUpdates,
      errors,
      confidence
    };
  }

  /**
   * Analisa atualizações de status de tarefas
   */
  private static async analyzeTaskStatusUpdates(
    message: SlackMessage,
    projectId: string,
    channelId: string,
    channelName: string
  ): Promise<TaskStatusUpdate[]> {
    const updates: TaskStatusUpdate[] = [];
    const text = message.text.toLowerCase();

    // Padrões para identificar atualizações de tarefas
    const patterns = [
      // Conclusão de tarefas
      {
        regex: /(terminei|finalizei|completei|concluí|acabei)\s+(a|o|de)?\s*(.+)/gi,
        action: 'move' as const,
        toStatus: 'done',
        confidence: 0.7
      },
      // Início de tarefas
      {
        regex: /(começei|iniciei|estou\s+fazendo|trabalhando\s+em|vou\s+fazer)\s+(a|o|de)?\s*(.+)/gi,
        action: 'move' as const,
        toStatus: 'in-progress',
        confidence: 0.7
      },
      // Bloqueios/problemas
      {
        regex: /(travado|bloqueado|problema|dificuldade|não\s+consigo)\s+(.+)/gi,
        action: 'update' as const,
        toStatus: 'blocked',
        confidence: 0.7
      },
      // Progresso
      {
        regex: /(\d+%|quase|praticamente|50%|70%|80%|90%)\s+(pronto|completo|finalizado)/gi,
        action: 'update' as const,
        field: 'progress',
        confidence: 0.7
      }
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const taskDescription = match[3] || match[2] || match[1];
        
        if (taskDescription && taskDescription.length > 3) {
          const update: TaskStatusUpdate = {
            id: generateId(),
            type: 'task_status',
            confidence: pattern.confidence,
            priority: pattern.toStatus === 'blocked' ? 'high' : 'medium',
            
            sourceMessage: {
              text: message.text,
              user: message.user,
              timestamp: message.ts,
              channelId,
              channelName,
              messageId: message.ts
            },
            
            suggestedChange: {
              field: 'status',
              action: pattern.action,
              reason: `Detectado indicação de ${pattern.toStatus} na mensagem: "${match[0]}"`,
              summary: `${pattern.toStatus === 'done' ? 'Concluir' : pattern.toStatus === 'in-progress' ? 'Iniciar' : 'Bloquear'} tarefa: ${taskDescription}`,
              taskId: '', // Será preenchido quando encontrarmos a tarefa correspondente
              taskName: taskDescription.trim(),
              toStatus: pattern.toStatus,
              newValue: pattern.toStatus,
              currentValue: 'unknown'
            },
            
            projectId,
            createdAt: new Date().toISOString(),
            status: 'pending'
          };
          
          updates.push(update);
        }
      }
    }

    return updates;
  }

  /**
   * Analisa atualizações de timeline/eventos
   */
  private static async analyzeTimelineUpdates(
    message: SlackMessage,
    projectId: string,
    channelId: string,
    channelName: string
  ): Promise<TimelineUpdate[]> {
    const updates: TimelineUpdate[] = [];
    const text = message.text.toLowerCase();

    // Padrões para eventos de timeline
    const eventPatterns = [
      // Lançamentos/deploys
      {
        regex: /(lançamos|deployed|publicamos|release|no ar|em produção)/gi,
        eventType: 'launch' as const,
        confidence: 0.75
      },
      // Decisões
      {
        regex: /(decidimos|escolhemos|optamos|definimos)\s+(.+)/gi,
        eventType: 'decision' as const,
        confidence: 0.7
      },
      // Marcos/milestones
      {
        regex: /(atingimos|alcançamos|marco|milestone|meta)\s+(.+)/gi,
        eventType: 'milestone' as const,
        confidence: 0.7
      },
      // Reuniões importantes
      {
        regex: /(reunião|meeting|call|apresentação)\s+(importante|decisiva|de review|de retrospectiva)/gi,
        eventType: 'meeting' as const,
        confidence: 0.7
      },
      // Problemas/issues
      {
        regex: /(bug|erro|problema|falha|issue)\s+(crítico|grave|urgente|sério)/gi,
        eventType: 'issue' as const,
        confidence: 0.7
      },
      // Deadlines
      {
        regex: /(prazo|deadline|entregar|até)\s+(amanhã|hoje|sexta|próxima semana|dia \d+)/gi,
        eventType: 'deadline' as const,
        confidence: 0.7
      }
    ];

    for (const pattern of eventPatterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const description = match[2] || match[1] || match[0];
        
        const event: ProjectEvent = {
          id: generateId(),
          type: pattern.eventType,
          title: `${pattern.eventType.charAt(0).toUpperCase() + pattern.eventType.slice(1)}: ${description.slice(0, 50)}`,
          description: message.text,
          date: new Date(parseFloat(message.ts) * 1000).toISOString(),
          participants: [message.user],
          importance: pattern.eventType === 'issue' ? 'high' : 'medium',
          tags: [pattern.eventType, 'slack-detected']
        };

        const update: TimelineUpdate = {
          id: generateId(),
          type: 'timeline',
          confidence: pattern.confidence,
          priority: pattern.eventType === 'issue' ? 'high' : 'medium',
          
          sourceMessage: {
            text: message.text,
            user: message.user,
            timestamp: message.ts,
            channelId,
            channelName,
            messageId: message.ts
          },
          
          suggestedChange: {
            field: 'events',
            action: 'create',
            reason: `Detectado evento do tipo ${pattern.eventType} na mensagem`,
            summary: event.title,
            newValue: event,
            eventType: pattern.eventType
          },
          
          projectId,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };
        
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Analisa atualizações de descrição do projeto
   */
  private static async analyzeDescriptionUpdates(
    message: SlackMessage,
    projectId: string,
    channelId: string,
    channelName: string
  ): Promise<DescriptionUpdate[]> {
    const updates: DescriptionUpdate[] = [];
    const text = message.text.toLowerCase();

    // Padrões para mudanças de escopo/descrição
    const patterns = [
      {
        regex: /(o projeto agora|mudamos o escopo|novo objetivo|nova funcionalidade|vamos adicionar)\s+(.+)/gi,
        field: 'description' as const,
        action: 'append' as const,
        confidence: 0.7
      },
      {
        regex: /(o foco é|objetivo principal|propósito|a ideia é)\s+(.+)/gi,
        field: 'objectives' as const,
        action: 'update' as const,
        confidence: 0.7
      }
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const newContent = match[2];
        
        if (newContent && newContent.length > 10) {
          const update: DescriptionUpdate = {
            id: generateId(),
            type: 'description',
            confidence: pattern.confidence,
            priority: 'medium',
            
            sourceMessage: {
              text: message.text,
              user: message.user,
              timestamp: message.ts,
              channelId,
              channelName,
              messageId: message.ts
            },
            
            suggestedChange: {
              field: pattern.field,
              action: pattern.action,
              reason: `Detectada mudança na ${pattern.field} do projeto`,
              summary: `Atualizar ${pattern.field}: ${newContent.slice(0, 50)}...`,
              newValue: newContent.trim(),
              currentValue: '',
              keywords: this.extractKeywords(newContent)
            },
            
            projectId,
            createdAt: new Date().toISOString(),
            status: 'pending'
          };
          
          updates.push(update);
        }
      }
    }

    return updates;
  }

  /**
   * Analisa atualizações de métricas
   */
  private static async analyzeMetricsUpdates(
    message: SlackMessage,
    projectId: string,
    channelId: string,
    channelName: string
  ): Promise<MetricsUpdate[]> {
    const updates: MetricsUpdate[] = [];
    const text = message.text.toLowerCase();

    // Padrões para métricas
    const patterns = [
      {
        regex: /(\d+)%\s+(completo|pronto|finalizado|done)/gi,
        metricType: 'progress',
        confidence: 0.7
      },
      {
        regex: /(gastamos|custou|orçamento)\s+.*?(\d+)/gi,
        metricType: 'budget',
        confidence: 0.7
      },
      {
        regex: /(\d+)\s+(tarefas|tasks|features)\s+(completas|prontas|finalizadas)/gi,
        metricType: 'completed_tasks',
        confidence: 0.7
      }
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const value = match[1] || match[2];
        
        if (value) {
          const update: MetricsUpdate = {
            id: generateId(),
            type: 'metrics',
            confidence: pattern.confidence,
            priority: 'low',
            
            sourceMessage: {
              text: message.text,
              user: message.user,
              timestamp: message.ts,
              channelId,
              channelName,
              messageId: message.ts
            },
            
            suggestedChange: {
              field: pattern.metricType === 'completed_tasks' ? 'progress' : pattern.metricType as "progress" | "kpis" | "budget" | "team_velocity",
              action: 'update',
              reason: `Detectada atualização de métrica: ${pattern.metricType}`,
              summary: `${pattern.metricType}: ${value}`,
              newValue: pattern.metricType === 'progress' ? parseFloat(value) : value,
              metricType: pattern.metricType,
              unit: pattern.metricType === 'progress' ? '%' : undefined
            },
            
            projectId,
            createdAt: new Date().toISOString(),
            status: 'pending'
          };
          
          updates.push(update);
        }
      }
    }

    return updates;
  }

  /**
   * Analisa identificação de riscos
   */
  private static async analyzeRiskUpdates(
    message: SlackMessage,
    projectId: string,
    channelId: string,
    channelName: string
  ): Promise<RiskUpdate[]> {
    const updates: RiskUpdate[] = [];
    const text = message.text.toLowerCase();

    // Padrões para riscos
    const riskPatterns = [
      {
        regex: /(problema|risco|perigo|ameaça)\s+(grave|sério|crítico|urgente)/gi,
        severity: 'critical' as const,
        confidence: 0.75
      },
      {
        regex: /(pode dar problema|possível risco|cuidado com|atenção)/gi,
        severity: 'medium' as const,
        confidence: 0.7
      },
      {
        regex: /(bug|erro|falha|não funciona|quebrado)/gi,
        severity: 'high' as const,
        confidence: 0.7
      }
    ];

    for (const pattern of riskPatterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const risk: ProjectRisk = {
          id: generateId(),
          title: `Risco identificado: ${match[0]}`,
          description: message.text,
          severity: pattern.severity,
          probability: 0.7,
          impact: 'Pode afetar o cronograma ou qualidade do projeto',
          status: 'identified',
          identifiedAt: new Date().toISOString()
        };

        const update: RiskUpdate = {
          id: generateId(),
          type: 'risk',
          confidence: pattern.confidence,
          priority: pattern.severity === 'critical' ? 'critical' : 'high',
          
          sourceMessage: {
            text: message.text,
            user: message.user,
            timestamp: message.ts,
            channelId,
            channelName,
            messageId: message.ts
          },
          
          suggestedChange: {
            field: 'risks',
            action: 'create',
            reason: `Detectado risco ${pattern.severity} na mensagem`,
            summary: risk.title,
            newValue: risk,
            severity: pattern.severity,
            impact: risk.impact
          },
          
          projectId,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };
        
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Extrai palavras-chave de um texto
   */
  private static extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['o', 'a', 'de', 'para', 'com', 'em', 'um', 'uma', 'que', 'do', 'da', 'e', 'é'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);
  }
}