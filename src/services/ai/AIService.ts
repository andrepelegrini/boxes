

import { GoogleGenerativeAI } from '@google/generative-ai';
import { slackConnectionManager } from '../../modules/slack/services/SlackConnectionManager';
import { Project, Task, EventItem, DocumentItem, ActivityLog } from '../../types';
import { AIAnalysisResults, SmartNextAction, ProjectHealthInsight, TaskPriorityInsight, MeetingSuggestion, RiskAlert, MilestoneRecommendation, CommunicationInsight } from '../../contexts/AIContext';
import { ProjectSetupInputs, GeneratedProjectPlan, ProjectProperty } from '../ProjectSetupAIService';
import { makeRateLimitedRequest, getRateLimitStatus } from '../../utils/rateLimiter';
import { readFileContent, blobToBase64 } from '../../utils/fileUtils';
import { SlackMessage } from '../../modules/slack/types';
import { ErrorHandler } from '../error/ErrorHandler';

export class AIService {
  private static instance: AIService;
  private ai: GoogleGenerativeAI | null;

  private constructor(apiKey?: string) {
    this.ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  public static getInstance(apiKey?: string): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(apiKey);
    }
    return AIService.instance;
  }

  public updateApiKey(apiKey: string) {
    this.ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  public isAvailable(): boolean {
    return !!this.ai;
  }

  public async getAISuggestions(prompt: string): Promise<string> {
    if (!this.ai) {
      throw new Error('AI service not available. Please configure API key.');
    }

    try {
      const model = this.ai.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'getAISuggestions');
      throw error;
    }
  }

  public async generateProjectPlan(inputs: ProjectSetupInputs): Promise<GeneratedProjectPlan> {
    if (!this.ai) {
      throw new Error('AI service not available. Please configure API key.');
    }

    const rateLimitStatus = getRateLimitStatus();
    if (!rateLimitStatus.canMakeRequest) {
      throw new Error(rateLimitStatus.message);
    }

    try {
      const parts: any[] = [];
      let fileSummary = "";
      let slackSummary = "";

      if (inputs.files) {
        for (const file of inputs.files) {
          const fileData = await readFileContent(file);
          if (fileData.type === 'base64') {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.content } });
            fileSummary += `Arquivo: ${fileData.name} (tipo: ${fileData.mimeType}, conteúdo enviado como base64).\n`;
          } else if (fileData.type === 'text') {
            const MAX_TEXT_LENGTH = 50000;
            const truncatedContent = fileData.content.length > MAX_TEXT_LENGTH
              ? fileData.content.substring(0, MAX_TEXT_LENGTH) + "\n[CONTEÚDO TRUNCADO]"
              : fileData.content;
            parts.push({ text: `Arquivo: ${fileData.name} (tipo: ${fileData.mimeType})\nConteúdo:\n${truncatedContent}` });
            fileSummary += `Arquivo: ${fileData.name} (tipo: ${fileData.mimeType}, conteúdo textual incluído).\n`;
          }
        }
      }

      if (inputs.audioBlob) {
        const audioBase64 = await blobToBase64(inputs.audioBlob);
        parts.push({ inlineData: { mimeType: inputs.audioBlob.type || 'audio/webm', data: audioBase64 } });
        fileSummary += `Memo de áudio fornecido (tipo: ${inputs.audioBlob.type || 'audio/webm'}).\n`;
      }

      if (inputs.slackMessages && inputs.slackMessages.length > 0) {
        const recentMessages = inputs.slackMessages
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);

        slackSummary = `Mensagens do canal Slack "${inputs.slackChannelName}" (${recentMessages.length} mensagens mais recentes):\n\n`;

        recentMessages.forEach((msg, index) => {
          const msgDate = new Date(msg.timestamp).toLocaleDateString('pt-BR');
          slackSummary += `[${msgDate}] ${msg.user}: ${msg.text}\n`;
          if (index < recentMessages.length - 1) slackSummary += '\n';
        });

        parts.push({ text: `Análise do Canal Slack:\n${slackSummary}` });
      }

      const prompt = this.buildSetupPrompt(inputs, fileSummary, slackSummary);

      const contentPartsForAPI: any[] = [{ text: prompt }];
      parts.forEach(p => {
        if (p.inlineData) contentPartsForAPI.push(p);
        else if (p.text) contentPartsForAPI.push(p);
      });

      const model = this.ai.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const response = await makeRateLimitedRequest(
        () => model.generateContent({
          contents: [{
            role: "user",
            parts: contentPartsForAPI
          }]
        }),
        'Project Setup AI Analysis'
      );

      let parsedResponse: GeneratedProjectPlan;
      try {
        let jsonStr = response.response.text().trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }
        parsedResponse = JSON.parse(jsonStr);
      } catch (e) {
        ErrorHandler.handleError(e as Error, 'generateProjectPlan.parse');
        throw new Error("AI returned invalid JSON response. " + (e as Error).message);
      }

      parsedResponse.generatedAt = new Date().toISOString();

      this.ensurePropertyIds(parsedResponse);

      return parsedResponse;

    } catch (error) {
      ErrorHandler.handleError(error as Error, 'generateProjectPlan');

      let errorMessage = (error as Error).message || "Unknown error during project setup analysis.";

      if ((error as any).isRateLimited) {
        errorMessage = (error as Error).message;
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        errorMessage = "Limite de requisições atingido. Aguarde alguns minutos antes de tentar novamente.";
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = "Muitas requisições recentes. Tente novamente em alguns instantes.";
      }

      throw new Error(errorMessage);
    }
  }

  private buildSetupPrompt(inputs: ProjectSetupInputs, fileSummary: string, slackSummary: string): string {
    const promptSections = [
      "Você é um consultor especialista em gerenciamento de projetos e análise de negócios. Com base nas informações fornecidas, crie um plano de projeto abrangente e estruturado.",
      "",
      "Responda INTEIRAMENTE em Português do Brasil.",
      "",
      "Sua resposta DEVE SER um único objeto JSON válido com a seguinte estrutura:",
      "",
      JSON.stringify({
        enhancedDescription: "DESCRIÇÃO_DETALHADA_DO_PROJETO_EM_MARKDOWN",
        objectives: ["OBJETIVO_1", "OBJETIVO_2"],
        scope: {
          included: ["ITEM_INCLUÍDO_1", "ITEM_INCLUÍDO_2"],
          excluded: ["ITEM_EXCLUÍDO_1", "ITEM_EXCLUÍDO_2"]
        },
        stakeholders: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "stakeholder",
            title: "NOME_DO_STAKEHOLDER",
            description: "PAPEL_E_RESPONSABILIDADES",
            priority: "high|medium|low",
            confidence: 85,
            source: "slack_analysis|user_input|ai_inference",
            metadata: { role: "sponsor|team_member|customer", department: "DEPARTAMENTO" }
          }
        ],
        tasks: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "task",
            title: "NOME_DA_TAREFA",
            description: "DESCRIÇÃO_DETALHADA",
            priority: "high|medium|low|critical",
            confidence: 90,
            source: "slack_analysis|user_input|ai_inference",
            metadata: { estimatedHours: 40, skillsRequired: ["SKILL_1"], phase: "NOME_DA_FASE" }
          }
        ],
        milestones: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "milestone",
            title: "NOME_DO_MARCO",
            description: "DESCRIÇÃO_DO_MARCO",
            priority: "high|medium|low|critical",
            confidence: 80,
            source: "ai_inference",
            metadata: { targetDate: "2024-XX-XX", deliverables: ["ENTREGÁVEL_1"] }
          }
        ],
        dependencies: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "dependency",
            title: "NOME_DA_DEPENDÊNCIA",
            description: "DESCRIÇÃO_DA_DEPENDÊNCIA",
            priority: "high|medium|low|critical",
            confidence: 75,
            source: "ai_inference",
            metadata: { dependencyType: "internal|external", blocker: true, owner: "RESPONSÁVEL" }
          }
        ],
        metrics: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "metric",
            title: "NOME_DA_MÉTRICA",
            description: "DESCRIÇÃO_SMART_DA_MÉTRICA",
            priority: "high|medium|low",
            confidence: 85,
            source: "user_input|ai_inference",
            metadata: { target: "VALOR_ALVO", unit: "UNIDADE", frequency: "weekly|monthly" }
          }
        ],
        risks: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "risk",
            title: "NOME_DO_RISCO",
            description: "DESCRIÇÃO_DO_RISCO_E_MITIGAÇÃO",
            priority: "high|medium|low|critical",
            confidence: 70,
            source: "ai_inference",
            metadata: { probability: "high|medium|low", impact: "high|medium|low", mitigation: "ESTRATÉGIA_DE_MITIGAÇÃO" }
          }
        ],
        resources: [
          {
            id: "GERADO_AUTOMATICAMENTE",
            type: "resource",
            title: "NOME_DO_RECURSO",
            description: "DESCRIÇÃO_DO_RECURSO",
            priority: "high|medium|low|critical",
            confidence: 80,
            source: "ai_inference",
            metadata: { resourceType: "human|tool|budget", availability: "full|partial|limited", cost: "CUSTO_ESTIMADO" }
          }
        ],
        timeline: {
          phases: [
            {
              name: "NOME_DA_FASE",
              duration: "X semanas",
              description: "DESCRIÇÃO_DA_FASE",
              deliverables: ["ENTREGÁVEL_1", "ENTREGÁVEL_2"]
            }
          ],
          estimatedDuration: "X meses",
          keyMilestones: [
            {
              name: "NOME_DO_MARCO",
              date: "2024-XX-XX",
              description: "DESCRIÇÃO_DO_MARCO"
            }
          ]
        },
        slackInsights: {
          keyTopics: ["TÓPICO_1", "TÓPICO_2"],
          mentionedPeople: ["PESSOA_1", "PESSOA_2"],
          urgencyLevel: "low|medium|high",
          projectHealth: "good|concerning|critical",
          recommendations: ["RECOMENDAÇÃO_1", "RECOMENDAÇÃO_2"]
        },
        recommendations: {
          setupPriorities: ["PRIORIDADE_1", "PRIORIDADE_2"],
          potentialChallenges: ["DESAFIO_1", "DESAFIO_2"],
          successFactors: ["FATOR_1", "FATOR_2"],
          nextSteps: ["PRÓXIMO_PASSO_1", "PRÓXIMO_PASSO_2"]
        },
        analysisConfidence: 85
      }, null, 2),
      "",
      "INFORMAÇÕES DO PROJETO:",
      `- Nome: ${inputs.name}`,
      `- Descrição: ${inputs.description || 'Não fornecida'}`,
      `- Meta Estratégica: ${inputs.strategicGoal || 'Não fornecida'}`,
      "",
    ];

    if (inputs.customText) {
      promptSections.push("CONTEXTO ADICIONAL DO USUÁRIO:");
      promptSections.push(inputs.customText);
      promptSections.push("");
    }

    if (inputs.links && inputs.links.length > 0) {
      promptSections.push("LINKS RELEVANTES:");
      inputs.links.forEach(link => promptSections.push(`- ${link}`));
      promptSections.push("");
    }

    if (fileSummary) {
      promptSections.push("ARQUIVOS E ÁUDIO FORNECIDOS:");
      promptSections.push(fileSummary);
      promptSections.push("");
    }

    if (slackSummary) {
      promptSections.push("ANÁLISE DO SLACK:");
      promptSections.push(`Canal conectado: ${inputs.slackChannelName} (${inputs.slackChannelId})`);
      promptSections.push("Use as mensagens do Slack para identificar stakeholders, tarefas mencionadas, urgência do projeto, e insights sobre o progresso atual.");
      promptSections.push("");
    }

    promptSections.push("INSTRUÇÕES ESPECÍFICAS:");
    promptSections.push("1. Seja específico e acionável em todas as sugestões");
    promptSections.push("2. Use níveis de confiança realistas (60-95%)");
    promptSections.push("3. Priorize itens baseado na importância estratégica");
    promptSections.push("4. Se conectado ao Slack, use as conversas para extrair informações sobre pessoas, tarefas e urgência");
    promptSections.push("5. Identifique dependências críticas que podem bloquear o projeto");
    promptSections.push("6. Crie métricas SMART (Específicas, Mensuráveis, Atingíveis, Relevantes, Temporais)");
    promptSections.push("7. Inclua riscos técnicos, de negócio e de recursos");
    promptSections.push("8. Estime durações realistas baseado no escopo");
    promptSections.push("9. TODA a resposta deve ser um único objeto JSON válido, sem texto adicional ou código markdown");

    return promptSections.join('\n');
  }

  private ensurePropertyIds(plan: GeneratedProjectPlan): void {
    const generateId = (type: string, index: number) => `${type}_${Date.now()}_${index}`;

    plan.stakeholders?.forEach((item, index) => {
      if (!item.id) item.id = generateId('stakeholder', index);
    });

    plan.tasks?.forEach((item, index) => {
      if (!item.id) item.id = generateId('task', index);
    });

    plan.milestones?.forEach((item, index) => {
      if (!item.id) item.id = generateId('milestone', index);
    });

    plan.dependencies?.forEach((item, index) => {
      if (!item.id) item.id = generateId('dependency', index);
    });

    plan.metrics?.forEach((item, index) => {
      if (!item.id) item.id = generateId('metric', index);
    });

    plan.risks?.forEach((item, index) => {
      if (!item.id) item.id = generateId('risk', index);
    });

    plan.resources?.forEach((item, index) => {
      if (!item.id) item.id = generateId('resource', index);
    });
  }

  public async generateComprehensiveInsights(
    project: Project,
    tasks: Task[],
    events?: EventItem[],
    documents?: DocumentItem[],
    activityLogs?: ActivityLog[],
    slackInsights?: any,
    triggerAIAnalysis?: (projectId: string, input?: any) => Promise<AIAnalysisResults>
  ): Promise<{
    nextActions: SmartNextAction[];
    projectHealth: ProjectHealthInsight;
    taskPriority: TaskPriorityInsight;
    meetingSuggestions: MeetingSuggestion[];
    riskAlerts: RiskAlert[];
    milestoneRecommendations: MilestoneRecommendation;
    communicationInsights: CommunicationInsight;
  }> {
    const projectContext = this.buildProjectContext(
      project, tasks, events || [], documents || [], activityLogs || [], slackInsights
    );

    let aiAnalysis: AIAnalysisResults | null = null;
    if (triggerAIAnalysis) {
      try {
        aiAnalysis = await triggerAIAnalysis(project.id, {
          context: projectContext,
          analysisType: 'comprehensive_overview',
          includeActionableInsights: true,
          includeRiskAssessment: true,
          includeCommunicationAnalysis: true
        });
      } catch (error) {
        ErrorHandler.handleError(error as Error, 'generateComprehensiveInsights.triggerAIAnalysis');
      }
    }

    const [
      nextActions,
      projectHealth,
      taskPriority,
      meetingSuggestions,
      riskAlerts,
      milestoneRecommendations,
      communicationInsights
    ] = await Promise.all([
      this.generateSmartNextActions(projectContext, aiAnalysis),
      this.analyzeProjectHealth(projectContext, aiAnalysis),
      this.analyzeTasks(projectContext),
      this.generateMeetingSuggestions(projectContext),
      this.detectRisks(projectContext),
      this.generateMilestoneRecommendations(projectContext),
      this.analyzeCommunication(projectContext, slackInsights)
    ]);

    return {
      nextActions,
      projectHealth,
      taskPriority,
      meetingSuggestions,
      riskAlerts,
      milestoneRecommendations,
      communicationInsights
    };
  }

  private buildProjectContext(
    project: Project,
    tasks: Task[],
    events: EventItem[],
    documents: DocumentItem[],
    activityLogs: ActivityLog[],
    slackInsights?: any
  ) {
    const completedTasks = tasks.filter(task => task.completed);
    const activeTasks = tasks.filter(task => !task.completed);
    const overdueTasks = tasks.filter(task =>
      !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
    );
    const blockedTasks = tasks.filter(task => task.isBlocked);

    const progress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    const projectAgeInDays = Math.max(1, (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const velocity = completedTasks.length / projectAgeInDays;

    const recentActivity = activityLogs.filter(log => {
      const daysSince = (Date.now() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    return {
      project,
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        blockedTasks: blockedTasks.length,
        progress,
        velocity,
        projectAgeInDays,
        recentActivityCount: recentActivity.length
      },
      tasks,
      events,
      documents,
      activityLogs,
      slackInsights,
      timeline: {
        created: project.createdAt,
        lastUpdated: project.updatedAt,
        recentActivity
      }
    };
  }

  private async generateSmartNextActions(
    context: any,
    aiAnalysis?: AIAnalysisResults | null
  ): Promise<SmartNextAction[]> {
    const actions: SmartNextAction[] = [];
    const { stats, tasks } = context;

    if (stats.overdueTasks > 0) {
      const overdueTask = tasks.find((t: Task) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
      actions.push({
        id: 'overdue-tasks',
        action: `Address ${stats.overdueTasks} overdue task${stats.overdueTasks > 1 ? 's' : ''}`,
        urgency: 'immediate',
        impact: 'high',
        reasoning: `${stats.overdueTasks} tasks are past their due date, blocking project progress`,
        estimatedTime: `${stats.overdueTasks * 30} minutes`,
        actionType: 'task',
        blockers: overdueTask ? [`Task "${overdueTask.title}" is overdue`] : []
      });
    }

    if (stats.blockedTasks > 0) {
      actions.push({
        id: 'blocked-tasks',
        action: `Unblock ${stats.blockedTasks} task${stats.blockedTasks > 1 ? 's' : ''}`,
        urgency: 'today',
        impact: 'high',
        reasoning: `Blocked tasks are preventing team progress and creating bottlenecks`,
        estimatedTime: '45 minutes',
        actionType: 'communication',
        dependencies: ['Identify blocking dependencies', 'Contact responsible parties']
      });
    }

    if (stats.progress > 0 && stats.progress < 20) {
      actions.push({
        id: 'early-momentum',
        action: 'Schedule project kickoff review',
        urgency: 'this_week',
        impact: 'medium',
        reasoning: 'Early stage projects benefit from alignment check and momentum building',
        estimatedTime: '60 minutes',
        actionType: 'meeting'
      });
    } else if (stats.progress >= 75) {
      actions.push({
        id: 'completion-planning',
        action: 'Plan project completion and handoff',
        urgency: 'this_week',
        impact: 'high',
        reasoning: 'Project is nearing completion - time to plan final delivery and handoff',
        estimatedTime: '90 minutes',
        actionType: 'review'
      });
    }

    if (stats.velocity < 0.1 && stats.totalTasks > 0) {
      actions.push({
        id: 'velocity-review',
        action: 'Investigate low task completion velocity',
        urgency: 'today',
        impact: 'high',
        reasoning: `Current velocity of ${stats.velocity.toFixed(2)} tasks/day is below healthy thresholds`,
        estimatedTime: '45 minutes',
        actionType: 'review'
      });
    }

    if (stats.recentActivityCount === 0 && stats.totalTasks > 0) {
      actions.push({
        id: 'inactive-project',
        action: 'Add project update or activity',
        urgency: 'today',
        impact: 'medium',
        reasoning: 'No activity recorded in the past week - project may be stalled',
        estimatedTime: '15 minutes',
        actionType: 'communication'
      });
    }

    if (aiAnalysis?.recommendations) {
      aiAnalysis.recommendations.forEach((rec, index) => {
        actions.push({
          id: `ai-recommendation-${index}`,
          action: rec,
          urgency: 'this_week',
          impact: 'medium',
          reasoning: 'AI-generated recommendation based on project analysis',
          estimatedTime: '30 minutes',
          actionType: 'task'
        });
      });
    }

    return actions
      .sort((a, b) => {
        const urgencyOrder = { immediate: 0, today: 1, this_week: 2, upcoming: 3 };
        const impactOrder = { high: 0, medium: 1, low: 2 };

        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;

        return impactOrder[a.impact] - impactOrder[b.impact];
      })
      .slice(0, 5);
  }

  private async analyzeProjectHealth(
    context: any,
    aiAnalysis?: AIAnalysisResults | null
  ): Promise<ProjectHealthInsight> {
    const { stats } = context;

    const velocityScore = Math.min(100, stats.velocity * 100);
    const progressScore = stats.progress;
    const activityScore = Math.min(100, stats.recentActivityCount * 20);
    const qualityScore = Math.max(0, 100 - (stats.overdueTasks * 20) - (stats.blockedTasks * 15));

    const overallScore = (velocityScore + progressScore + activityScore + qualityScore) / 4;

    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    if (overallScore >= 80) overallHealth = 'excellent';
    else if (overallScore >= 60) overallHealth = 'good';
    else if (overallScore >= 40) overallHealth = 'warning';
    else overallHealth = 'critical';

    let velocityStatus: 'excellent' | 'good' | 'warning' | 'critical';
    let velocityTrend: 'improving' | 'stable' | 'declining';

    if (stats.velocity > 0.5) velocityStatus = 'excellent';
    else if (stats.velocity > 0.2) velocityStatus = 'good';
    else if (stats.velocity > 0.1) velocityStatus = 'warning';
    else velocityStatus = 'critical';

    if (stats.recentActivityCount > 3) velocityTrend = 'improving';
    else if (stats.recentActivityCount > 1) velocityTrend = 'stable';
    else velocityTrend = 'declining';

    const risks: string[] = [];
    const mitigations: string[] = [];

    if (stats.overdueTasks > 0) {
      risks.push(`${stats.overdueTasks} overdue tasks affecting timeline`);
      mitigations.push('Prioritize overdue tasks and update deadlines');
    }

    if (stats.blockedTasks > 0) {
      risks.push(`${stats.blockedTasks} blocked tasks creating bottlenecks`);
      mitigations.push('Identify and resolve blocking dependencies');
    }

    if (stats.velocity < 0.1) {
      risks.push('Low task completion velocity');
      mitigations.push('Review team capacity and task complexity');
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (risks.length === 0) riskLevel = 'low';
    else if (risks.length <= 2) riskLevel = 'medium';
    else if (risks.length <= 4) riskLevel = 'high';
    else riskLevel = 'critical';

    let momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled';
    const momentumFactors: string[] = [];
    const momentumRecommendations: string[] = [];

    if (stats.recentActivityCount === 0) {
      momentum = 'stalled';
      momentumFactors.push('No recent activity recorded');
      momentumRecommendations.push('Add regular check-ins and updates');
    } else if (stats.velocity > 0.3 && stats.recentActivityCount > 2) {
      momentum = 'accelerating';
      momentumFactors.push('High velocity and active engagement');
    } else if (stats.velocity > 0.1) {
      momentum = 'steady';
      momentumFactors.push('Consistent progress being made');
    } else {
      momentum = 'slowing';
      momentumFactors.push('Below-average task completion rate');
      momentumRecommendations.push('Review potential blockers and priorities');
    }

    return {
      overallHealth,
      healthScore: Math.round(overallScore),
      indicators: {
        velocity: {
          status: velocityStatus,
          trend: velocityTrend,
          recommendation: velocityStatus === 'critical'
            ? 'Focus on removing blockers and simplifying tasks'
            : velocityStatus === 'warning'
            ? 'Review task complexity and team capacity'
            : 'Maintain current pace and celebrate progress',
          score: Math.round(velocityScore)
        },
        teamAlignment: {
          score: Math.max(0, 100 - (stats.blockedTasks * 10)),
          issues: stats.blockedTasks > 0 ? ['Tasks blocked - may indicate alignment issues'] : [],
          suggestions: stats.blockedTasks > 0 ? ['Schedule alignment meeting'] : ['Continue regular check-ins']
        },
        riskFactors: {
          level: riskLevel,
          risks,
          mitigations
        },
        momentum: {
          status: momentum,
          factors: momentumFactors,
          recommendations: momentumRecommendations
        }
      },
      priorityActions: [],
      confidence: aiAnalysis?.confidence || 0.75
    };
  }

  private async analyzeTasks(
    context: any
  ): Promise<TaskPriorityInsight> {
    const { tasks } = context;
    const activeTasks = tasks.filter((t: Task) => !t.completed);
    const blockedTasks = tasks.filter((t: Task) => t.isBlocked);

    const recommendedNext = activeTasks
      .filter((t: Task) => !t.isBlocked)
      .sort((a: Task, b: Task) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;

        if (aPriority !== bPriority) return aPriority - bPriority;

        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }

        return 0;
      })
      .slice(0, 3)
      .map((task: Task) => ({
        task,
        reasoning: this.generateTaskReasoning(task),
        urgency: this.calculateTaskUrgency(task),
        stakeholders: [],
        quickWin: this.isQuickWin(task),
        impact: task.priority as 'high' | 'medium' | 'low' || 'medium'
      }));

    const blockerResolution = blockedTasks.map((task: Task) => ({
      blockedTask: task,
      suggestedActions: [
        'Identify specific blocking dependency',
        'Contact responsible party',
        'Schedule resolution meeting',
        'Consider alternative approach'
      ],
      peopleToContact: [],
      urgency: task.priority === 'high' ? 'immediate' as const : 'urgent' as const
    }));

    const opportunityTasks = activeTasks
      .filter((t: Task) => !t.isBlocked && this.isQuickWin(t))
      .slice(0, 3)
      .map((task: Task) => ({
        task,
        impact: 'Quick win - builds momentum and confidence',
        quickWin: true,
        reasoning: 'Low complexity task that can be completed quickly to maintain momentum'
      }));

    return {
      recommendedNext,
      blockerResolution,
      opportunityTasks
    };
  }

  private generateTaskReasoning(task: Task): string {
    const reasons: string[] = [];

    if (task.priority === 'high') {
      reasons.push('High priority task');
    }

    if (task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 3) {
        reasons.push('Due soon');
      }
    }

    if (this.isQuickWin(task)) {
      reasons.push('Quick win opportunity');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Next logical task to maintain progress';
  }

  private calculateTaskUrgency(task: Task): string {
    if (task.priority === 'high' && task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) return 'immediate';
      if (daysUntilDue <= 3) return 'today';
    }

    return task.priority === 'high' ? 'today' : 'this_week';
  }

  private isQuickWin(task: Task): boolean {
    const title = task.title.toLowerCase();
    const quickWinKeywords = ['update', 'review', 'check', 'email', 'call', 'simple', 'quick'];
    return quickWinKeywords.some(keyword => title.includes(keyword)) ||
           (task.description && task.description.length < 100);
  }

  private async generateMeetingSuggestions(
    context: any
  ): Promise<MeetingSuggestion[]> {
    const { stats } = context;
    const suggestions: MeetingSuggestion[] = [];

    if (stats.blockedTasks > 0) {
      suggestions.push({
        id: 'blocker-resolution',
        purpose: 'Resolve blocked tasks and dependencies',
        urgency: 'this_week',
        suggestedAttendees: ['Project lead', 'Task owners', 'Stakeholders'],
        agenda: [
          'Review blocked tasks',
          'Identify root causes',
          'Assign resolution owners',
          'Set resolution timeline'
        ],
        reasoning: `${stats.blockedTasks} tasks are blocked and need immediate attention`,
        outcomes: ['Clear path forward for blocked tasks', 'Assigned action items'],
        estimatedDuration: '45 minutes',
        meetingType: 'planning'
      });
    }

    if (stats.progress >= 25 && stats.progress <= 75) {
      const progressPhase = stats.progress < 50 ? 'mid-point' : 'near completion';
      suggestions.push({
        id: 'progress-review',
        purpose: `${progressPhase} progress review and planning`,
        urgency: 'next_week',
        suggestedAttendees: ['Team members', 'Stakeholders', 'Project sponsor'],
        agenda: [
          'Review completed work',
          'Assess remaining scope',
          'Identify risks and opportunities',
          'Plan next phase'
        ],
        reasoning: `Project is ${Math.round(stats.progress)}% complete - good time for stakeholder review`,
        outcomes: ['Updated project timeline', 'Risk mitigation plans'],
        estimatedDuration: '60 minutes',
        meetingType: 'review'
      });
    }

    if (stats.recentActivityCount === 0 && stats.totalTasks > 0) {
      suggestions.push({
        id: 'reactivation',
        purpose: 'Project reactivation and momentum building',
        urgency: 'this_week',
        suggestedAttendees: ['Project team', 'Key stakeholders'],
        agenda: [
          'Review project status',
          'Identify barriers to progress',
          'Recommit to timeline',
          'Plan immediate next steps'
        ],
        reasoning: 'No recent activity - may need team realignment and motivation',
        outcomes: ['Renewed team commitment', 'Clear action plan'],
        estimatedDuration: '60 minutes',
        meetingType: 'alignment'
      });
    }

    if (stats.velocity > 0.5 && stats.progress > 50) {
      suggestions.push({
        id: 'celebration',
        purpose: 'Celebrate progress and maintain momentum',
        urgency: 'next_week',
        suggestedAttendees: ['Entire team', 'Stakeholders'],
        agenda: [
          'Celebrate achievements',
          'Share success stories',
          'Plan final sprint',
          'Prepare for delivery'
        ],
        reasoning: 'High velocity and good progress - time to celebrate and energize for final push',
        outcomes: ['Boosted team morale', 'Final delivery plan'],
        estimatedDuration: '30 minutes',
        meetingType: 'review'
      });
    }

    return suggestions.slice(0, 3);
  }

  private async detectRisks(
    context: any
  ): Promise<RiskAlert[]> {
    const { stats } = context;
    const risks: RiskAlert[] = [];

    if (stats.overdueTasks > 0) {
      risks.push({
        id: 'overdue-timeline',
        risk: 'Project timeline at risk due to overdue tasks',
        probability: 'high',
        impact: stats.overdueTasks > 3 ? 'critical' : 'high',
        earlyWarningSignals: [
          `${stats.overdueTasks} tasks past due date`,
          'Cascading delay effects possible'
        ],
        preventiveActions: [
          'Immediately prioritize overdue tasks',
          'Review and adjust remaining timeline',
          'Consider scope reduction if needed'
        ],
        timeToAddress: 'Immediate',
        category: 'timeline',
        confidence: 0.9
      });
    }

    if (stats.blockedTasks > 2) {
      risks.push({
        id: 'quality-blockers',
        risk: 'Quality and deliverables at risk from multiple blockers',
        probability: 'medium',
        impact: 'high',
        earlyWarningSignals: [
          `${stats.blockedTasks} tasks currently blocked`,
          'Team productivity being affected'
        ],
        preventiveActions: [
          'Conduct blocker analysis session',
          'Establish escalation process',
          'Consider alternative approaches'
        ],
        timeToAddress: 'This week',
        category: 'quality',
        confidence: 0.8
      });
    }

    if (stats.velocity < 0.1 && stats.totalTasks > 0) {
      risks.push({
        id: 'team-momentum',
        risk: 'Team momentum and engagement declining',
        probability: 'medium',
        impact: 'medium',
        earlyWarningSignals: [
          'Very low task completion velocity',
          'Lack of recent activity updates'
        ],
        preventiveActions: [
          'Schedule team check-in meeting',
          'Review workload and capacity',
          'Address potential burnout or blockers'
        ],
        timeToAddress: 'This week',
        category: 'team',
        confidence: 0.7
      });
    }

    if (stats.totalTasks > 20 && stats.progress < 30) {
      risks.push({
        id: 'scope-creep',
        risk: 'Potential scope creep affecting project completion',
        probability: 'medium',
        impact: 'medium',
        earlyWarningSignals: [
          `Large number of tasks (${stats.totalTasks}) relative to progress`,
          'May indicate scope expansion'
        ],
        preventiveActions: [
          'Review original project scope',
          'Prioritize must-have vs nice-to-have features',
          'Consider timeline adjustment'
        ],
        timeToAddress: 'Next week',
        category: 'scope',
        confidence: 0.6
      });
    }

    if (stats.recentActivityCount === 0 && stats.totalTasks > 0) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 7) {
        risks.push({
          id: 'project-abandonment',
          risk: 'Project may be becoming stale or abandoned',
          probability: 'medium',
          impact: 'high',
          earlyWarningSignals: [
            `No activity for ${daysSinceUpdate} days`,
            'No recent task updates or completions'
          ],
          preventiveActions: [
            'Schedule immediate team check-in',
            'Reassess project priority and resources',
            'Consider project pause or reactivation plan'
          ],
          timeToAddress: 'Immediate',
          category: 'external',
          confidence: 0.8
        });
      }
    }

    return risks
      .sort((a, b) => {
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const probabilityOrder = { high: 0, medium: 1, low: 2 };

        const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
        if (impactDiff !== 0) return impactDiff;

        return probabilityOrder[a.probability] - probabilityOrder[b.probability];
      })
      .slice(0, 4);
  }

  private async generateMilestoneRecommendations(
    context: any
  ): Promise<MilestoneRecommendation> {
    const { stats } = context;

    let currentMilestone: MilestoneRecommendation['currentMilestone'];

    if (stats.progress >= 0 && stats.progress < 25) {
      currentMilestone = {
        name: 'Project Foundation (0-25%)',
        targetDate: this.estimateTargetDate(25, stats),
        feasibilityAssessment: stats.velocity > 0.2 ? 'on_track' : 'at_risk'
      };
    } else if (stats.progress >= 25 && stats.progress < 50) {
      currentMilestone = {
        name: 'First Quarter Complete (25-50%)',
        targetDate: this.estimateTargetDate(50, stats),
        feasibilityAssessment: stats.velocity > 0.15 ? 'on_track' : 'at_risk'
      };
    } else if (stats.progress >= 50 && stats.progress < 75) {
      currentMilestone = {
        name: 'Halfway Point (50-75%)',
        targetDate: this.estimateTargetDate(75, stats),
        feasibilityAssessment: stats.velocity > 0.1 ? 'on_track' : 'needs_adjustment'
      };
    } else if (stats.progress >= 75 && stats.progress < 100) {
      currentMilestone = {
        name: 'Final Sprint (75-100%)',
        targetDate: this.estimateTargetDate(100, stats),
        feasibilityAssessment: stats.blockedTasks === 0 ? 'on_track' : 'at_risk'
      };
    }

    if (currentMilestone?.feasibilityAssessment !== 'on_track') {
      currentMilestone!.suggestedAdjustments = {
        scopeChanges: stats.velocity < 0.1 ? ['Consider reducing scope by 10-20%'] : [],
        resourceNeeds: stats.blockedTasks > 2 ? ['Additional support for blocked tasks'] : []
      };
    }

    const nextMilestone = this.generateNextMilestone(stats);

    const futureMilestones = this.generateFutureMilestones(stats);

    return {
      currentMilestone,
      nextMilestone,
      futureMilestones
    };
  }

  private estimateTargetDate(targetProgress: number, stats: any): string {
    if (stats.velocity <= 0) {
      return 'Unable to estimate with current velocity';
    }

    const remainingProgress = targetProgress - stats.progress;
    const remainingTasks = (remainingProgress / 100) * stats.totalTasks;
    const daysNeeded = Math.ceil(remainingTasks / stats.velocity);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);

    return targetDate.toLocaleDateString();
  }

  private generateNextMilestone(stats: any): MilestoneRecommendation['nextMilestone'] {
    if (stats.progress < 25) {
      return {
        suggestedGoal: 'Complete project foundation and key setup tasks',
        timeframe: this.estimateTargetDate(25, stats),
        requiredActions: [
          'Complete remaining setup tasks',
          'Establish regular team check-ins',
          'Clarify any unclear requirements'
        ],
        dependencies: ['Team availability', 'Stakeholder feedback'],
        successCriteria: ['25% of tasks completed', 'Key infrastructure in place']
      };
    } else if (stats.progress < 50) {
      return {
        suggestedGoal: 'Reach halfway point with core features',
        timeframe: this.estimateTargetDate(50, stats),
        requiredActions: [
          'Focus on core functionality',
          'Address any emerging blockers',
          'Conduct mid-project review'
        ],
        dependencies: ['Resolution of current blockers'],
        successCriteria: ['50% task completion', 'Core features functional']
      };
    } else if (stats.progress < 75) {
      return {
        suggestedGoal: 'Complete major features and begin final preparations',
        timeframe: this.estimateTargetDate(75, stats),
        requiredActions: [
          'Finalize major features',
          'Begin testing and quality assurance',
          'Prepare for final phase'
        ],
        dependencies: ['Quality standards met'],
        successCriteria: ['75% completion', 'Major features complete']
      };
    } else {
      return {
        suggestedGoal: 'Complete project and prepare for delivery',
        timeframe: this.estimateTargetDate(100, stats),
        requiredActions: [
          'Complete remaining tasks',
          'Conduct final review',
          'Prepare delivery documentation'
        ],
        dependencies: ['Final stakeholder approval'],
        successCriteria: ['100% completion', 'Ready for delivery']
      };
    }
  }

  private generateFutureMilestones(stats: any): MilestoneRecommendation['futureMilestones'] {
    const milestones = [];

    if (stats.progress < 50) {
      milestones.push({
        goal: 'Mid-project review and adjustments',
        estimatedTimeframe: this.estimateTargetDate(50, stats),
        prerequisites: ['First quarter completion']
      });
    }

    if (stats.progress < 75) {
      milestones.push({
        goal: 'Final phase preparation',
        estimatedTimeframe: this.estimateTargetDate(75, stats),
        prerequisites: ['Core features complete']
      });
    }

    milestones.push({
      goal: 'Project completion and handoff',
      estimatedTimeframe: this.estimateTargetDate(100, stats),
      prerequisites: ['All tasks complete', 'Quality review passed']
    });

    return milestones;
  }

  private async analyzeCommunication(
    context: any,
    slackInsights?: any
  ): Promise<CommunicationInsight> {
    const { stats } = context;

    let projectMomentum: CommunicationInsight['projectMomentum'];
    if (stats.velocity > 0.3 && stats.recentActivityCount > 2) {
      projectMomentum = 'accelerating';
    } else if (stats.velocity > 0.1 && stats.recentActivityCount > 0) {
      projectMomentum = 'steady';
    } else if (stats.velocity > 0 || stats.recentActivityCount > 0) {
      projectMomentum = 'slowing';
    } else {
      projectMomentum = 'stalled';
    }

    const alignmentScore = Math.max(0, 100 - (stats.blockedTasks * 15) - (stats.overdueTasks * 10));

    const keyDiscussions: CommunicationInsight['keyDiscussions'] = [];
    if (slackInsights?.keyTopics) {
      slackInsights.keyTopics.forEach((topic: any, index: number) => {
        keyDiscussions.push({
          topic: topic.topic || `Discussion topic ${index + 1}`,
          importance: topic.urgencyLevel || 'medium',
          actionRequired: topic.actionRequired || false,
          suggestedResponse: topic.suggestedResponse || 'Follow up on this discussion',
          participants: topic.participants || [],
          urgency: topic.urgencyLevel === 'high' ? 'immediate' : 'routine'
        });
      });
    }

    const missingVoices: string[] = [];
    if (stats.recentActivityCount === 0) {
      missingVoices.push('Project team', 'Stakeholders');
    }

    const suggestedCommunications: CommunicationInsight['suggestedCommunications'] = [];

    if (stats.progress >= 25 && stats.progress < 30) {
      suggestedCommunications.push({
        type: 'celebration',
        message: 'Celebrate reaching 25% project completion milestone',
        recipients: ['Team', 'Stakeholders'],
        urgency: 'this_week'
      });
    }

    if (stats.overdueTasks > 0) {
      suggestedCommunications.push({
        type: 'update',
        message: `Update on ${stats.overdueTasks} overdue tasks and recovery plan`,
        recipients: ['Project stakeholders'],
        urgency: 'immediate'
      });
    }

    if (stats.blockedTasks > 0) {
      suggestedCommunications.push({
        type: 'decision',
        message: 'Request decisions on blocked tasks to unblock progress',
        recipients: ['Decision makers', 'Task owners'],
        urgency: 'today'
      });
    }

    if (projectMomentum === 'stalled') {
      suggestedCommunications.push({
        type: 'question',
        message: 'Check in on project status and identify support needed',
        recipients: ['Team members'],
        urgency: 'immediate'
      });
    }

    let communicationHealth: CommunicationInsight['communicationHealth'];
    if (alignmentScore >= 80 && projectMomentum === 'accelerating') {
      communicationHealth = 'excellent';
    } else if (alignmentScore >= 60 && projectMomentum !== 'stalled') {
      communicationHealth = 'good';
    } else if (alignmentScore >= 40 || projectMomentum === 'slowing') {
      communicationHealth = 'needs_attention';
    } else {
      communicationHealth = 'poor';
    }

    return {
      projectMomentum,
      alignmentScore: Math.round(alignmentScore),
      keyDiscussions: keyDiscussions.slice(0, 3),
      missingVoices,
      suggestedCommunications: suggestedCommunications.slice(0, 3),
      communicationHealth
    };
  }
}
