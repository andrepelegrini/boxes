// src/services/SmartOnboardingService.ts
import { Project, Task, EventItem } from '../types';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the target element
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'scroll' | 'wait';
  duration?: number;
  isOptional?: boolean;
  prerequisite?: string[];
  category: 'dashboard' | 'project-creation' | 'widgets' | 'ai-features' | 'slack-integration';
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  triggerConditions: {
    isFirstTime?: boolean;
    projectCount?: number;
    hasCompletedFlow?: string[];
    userBehavior?: 'new-user' | 'returning-user' | 'advanced-user';
  };
  priority: 'high' | 'medium' | 'low';
}

export interface UserOnboardingState {
  hasCompletedInitialSetup: boolean;
  completedFlows: string[];
  currentFlow?: string;
  currentStep?: number;
  skippedSteps: string[];
  userPreferences: {
    showTooltips: boolean;
    autoAdvance: boolean;
    skipAnimation: boolean;
  };
  behaviorData: {
    projectsCreated: number;
    widgetsUsed: string[];
    featuresUsed: string[];
    lastActiveDate: string;
    totalSessionTime: number;
  };
}

export interface SmartSuggestion {
  id: string;
  type: 'feature' | 'template' | 'workflow' | 'widget' | 'integration';
  title: string;
  description: string;
  confidence: number;
  context: string;
  action: {
    type: 'navigate' | 'modal' | 'tutorial' | 'create';
    target: string;
    payload?: any;
  };
  priority: 'high' | 'medium' | 'low';
  dismissible: boolean;
  expiresAt?: string;
}

class SmartOnboardingService {
  private readonly STORAGE_KEY = 'smart_onboarding_state';
  private state: UserOnboardingState;
  private flows: OnboardingFlow[];
  private suggestions: SmartSuggestion[] = [];

  constructor() {
    this.state = this.loadState();
    this.flows = this.initializeFlows();
    this.generateSmartSuggestions();
  }

  private loadState(): UserOnboardingState {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    }

    return {
      hasCompletedInitialSetup: false,
      completedFlows: [],
      skippedSteps: [],
      userPreferences: {
        showTooltips: true,
        autoAdvance: false,
        skipAnimation: false
      },
      behaviorData: {
        projectsCreated: 0,
        widgetsUsed: [],
        featuresUsed: [],
        lastActiveDate: new Date().toISOString(),
        totalSessionTime: 0
      }
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }

  private initializeFlows(): OnboardingFlow[] {
    return [
      // Initial Welcome Flow
      {
        id: 'welcome',
        name: 'Bem-vindo ao Project Boxes',
        description: 'Tour inicial para novos usuários',
        triggerConditions: {
          isFirstTime: true,
          userBehavior: 'new-user'
        },
        priority: 'high',
        steps: [
          {
            id: 'welcome-intro',
            title: 'Bem-vindo!',
            description: 'Vamos fazer um tour rápido pelo Project Boxes para você começar.',
            target: 'body',
            position: 'bottom',
            category: 'dashboard'
          },
          {
            id: 'sidebar-intro',
            title: 'Sidebar de Navegação',
            description: 'Aqui você encontra todos os controles do dashboard.',
            target: '[data-tour="sidebar"]',
            position: 'right',
            category: 'dashboard'
          },
          {
            id: 'create-project',
            title: 'Criar Primeiro Projeto',
            description: 'Clique aqui para criar seu primeiro projeto com IA.',
            target: '[data-tour="create-project"]',
            position: 'bottom',
            action: 'click',
            category: 'project-creation'
          }
        ]
      },

      // Dashboard Features Flow
      {
        id: 'dashboard-features',
        name: 'Recursos do Dashboard',
        description: 'Aprenda sobre widgets e personalização',
        triggerConditions: {
          projectCount: 1,
          hasCompletedFlow: ['welcome']
        },
        priority: 'medium',
        steps: [
          {
            id: 'widgets-intro',
            title: 'Widgets Inteligentes',
            description: 'Cada widget mostra informações importantes do seu projeto.',
            target: '[data-tour="widget-grid"]',
            position: 'top',
            category: 'widgets'
          },
          {
            id: 'widget-expand',
            title: 'Expandir Widget',
            description: 'Clique no ícone de expandir para ver mais detalhes.',
            target: '[data-tour="widget-expand"]',
            position: 'left',
            action: 'click',
            category: 'widgets'
          },
          {
            id: 'edit-mode',
            title: 'Personalizar Layout',
            description: 'Use o modo de edição para reorganizar seus widgets.',
            target: '[data-tour="edit-mode"]',
            position: 'bottom',
            category: 'dashboard'
          }
        ]
      },

      // AI Features Flow
      {
        id: 'ai-features',
        name: 'Recursos de IA',
        description: 'Descubra como a IA pode ajudar seus projetos',
        triggerConditions: {
          projectCount: 1,
          hasCompletedFlow: ['dashboard-features']
        },
        priority: 'high',
        steps: [
          {
            id: 'ai-insights',
            title: 'Insights da IA',
            description: 'A IA analisa seu projeto e oferece sugestões inteligentes.',
            target: '[data-tour="ai-insights"]',
            position: 'left',
            category: 'ai-features'
          },
          {
            id: 'intelligent-updates',
            title: 'Atualizações Inteligentes',
            description: 'Receba sugestões automáticas baseadas no progresso do projeto.',
            target: '[data-tour="intelligent-updates"]',
            position: 'top',
            category: 'ai-features'
          },
          {
            id: 'gemini-setup',
            title: 'Configurar API do Gemini',
            description: 'Configure sua chave API para recursos avançados de IA.',
            target: '[data-tour="api-settings"]',
            position: 'bottom',
            isOptional: true,
            category: 'ai-features'
          }
        ]
      },

      // Slack Integration Flow
      {
        id: 'slack-integration',
        name: 'Integração com Slack',
        description: 'Conecte seus canais do Slack para análise automática',
        triggerConditions: {
          hasCompletedFlow: ['ai-features']
        },
        priority: 'medium',
        steps: [
          {
            id: 'slack-connect',
            title: 'Conectar Slack',
            description: 'Conecte canais do Slack para análise automática de conversas.',
            target: '[data-tour="slack-connect"]',
            position: 'bottom',
            category: 'slack-integration'
          },
          {
            id: 'slack-activity',
            title: 'Atividade do Slack',
            description: 'Veja as últimas mensagens e insights do seu canal.',
            target: '[data-tour="slack-activity"]',
            position: 'left',
            category: 'slack-integration'
          }
        ]
      }
    ];
  }

  // Public API Methods
  public shouldShowOnboarding(): boolean {
    if (!this.state.hasCompletedInitialSetup) return true;
    
    const availableFlow = this.getNextAvailableFlow();
    return availableFlow !== null;
  }

  public getNextAvailableFlow(): OnboardingFlow | null {
    const userBehavior = this.determineUserBehavior();
    
    for (const flow of this.flows.sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))) {
      if (this.shouldTriggerFlow(flow, userBehavior)) {
        return flow;
      }
    }
    
    return null;
  }

  public startFlow(flowId: string): OnboardingFlow | null {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return null;

    this.state.currentFlow = flowId;
    this.state.currentStep = 0;
    this.saveState();
    
    return flow;
  }

  public nextStep(): OnboardingStep | null {
    if (!this.state.currentFlow) return null;
    
    const flow = this.flows.find(f => f.id === this.state.currentFlow);
    if (!flow || this.state.currentStep === undefined) return null;

    this.state.currentStep++;
    
    if (this.state.currentStep >= flow.steps.length) {
      this.completeFlow(this.state.currentFlow);
      return null;
    }

    this.saveState();
    return flow.steps[this.state.currentStep];
  }

  public previousStep(): OnboardingStep | null {
    if (!this.state.currentFlow) return null;
    
    const flow = this.flows.find(f => f.id === this.state.currentFlow);
    if (!flow || this.state.currentStep === undefined) return null;

    // Can't go back from the first step
    if (this.state.currentStep <= 0) return null;

    this.state.currentStep--;
    
    this.saveState();
    return flow.steps[this.state.currentStep];
  }

  public skipStep(stepId: string): void {
    this.state.skippedSteps.push(stepId);
    this.nextStep();
  }

  public completeFlow(flowId: string): void {
    if (!this.state.completedFlows.includes(flowId)) {
      this.state.completedFlows.push(flowId);
    }
    
    this.state.currentFlow = undefined;
    this.state.currentStep = undefined;
    
    if (flowId === 'welcome') {
      this.state.hasCompletedInitialSetup = true;
    }
    
    this.saveState();
    this.generateSmartSuggestions();
  }

  public updateBehaviorData(data: Partial<UserOnboardingState['behaviorData']>): void {
    this.state.behaviorData = {
      ...this.state.behaviorData,
      ...data,
      lastActiveDate: new Date().toISOString()
    };
    this.saveState();
    this.generateSmartSuggestions();
  }

  public getSmartSuggestions(): SmartSuggestion[] {
    return this.suggestions.filter(s => {
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        return false;
      }
      return true;
    }).sort((a, b) => b.confidence - a.confidence);
  }

  public dismissSuggestion(suggestionId: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
  }

  // Private Helper Methods
  private shouldTriggerFlow(flow: OnboardingFlow, userBehavior: string): boolean {
    const conditions = flow.triggerConditions;
    
    // Check if already completed
    if (this.state.completedFlows.includes(flow.id)) {
      return false;
    }

    // Check first time condition
    if (conditions.isFirstTime && this.state.hasCompletedInitialSetup) {
      return false;
    }

    // Check project count
    if (conditions.projectCount !== undefined && 
        this.state.behaviorData.projectsCreated < conditions.projectCount) {
      return false;
    }

    // Check prerequisite flows
    if (conditions.hasCompletedFlow) {
      for (const requiredFlow of conditions.hasCompletedFlow) {
        if (!this.state.completedFlows.includes(requiredFlow)) {
          return false;
        }
      }
    }

    // Check user behavior
    if (conditions.userBehavior && conditions.userBehavior !== userBehavior) {
      return false;
    }

    return true;
  }

  private determineUserBehavior(): 'new-user' | 'returning-user' | 'advanced-user' {
    const { projectsCreated, featuresUsed, totalSessionTime } = this.state.behaviorData;
    
    if (projectsCreated === 0 && totalSessionTime < 300) { // 5 minutes
      return 'new-user';
    }
    
    if (projectsCreated >= 5 || featuresUsed.length >= 10) {
      return 'advanced-user';
    }
    
    return 'returning-user';
  }

  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
    }
  }

  private generateSmartSuggestions(): void {
    this.suggestions = [];
    const behavior = this.state.behaviorData;
    const userType = this.determineUserBehavior();

    // Suggest Gemini API setup if not configured
    if (!localStorage.getItem('gemini_api_key')) {
      this.suggestions.push({
        id: 'setup-gemini-api',
        type: 'integration',
        title: 'Configure a API do Gemini',
        description: 'Desbloqueie recursos avançados de IA configurando sua chave API do Google Gemini.',
        confidence: 85,
        context: 'Recursos de IA limitados sem configuração',
        action: {
          type: 'modal',
          target: 'api-settings'
        },
        priority: 'high',
        dismissible: true
      });
    }

    // Suggest Slack integration for users with multiple projects
    if (behavior.projectsCreated >= 2 && !behavior.featuresUsed.includes('slack-integration')) {
      this.suggestions.push({
        id: 'setup-slack',
        type: 'integration',
        title: 'Conectar Slack',
        description: 'Automatize análises conectando seus canais do Slack aos projetos.',
        confidence: 75,
        context: 'Múltiplos projetos detectados',
        action: {
          type: 'tutorial',
          target: 'slack-integration'
        },
        priority: 'medium',
        dismissible: true
      });
    }

    // Suggest templates for new users
    if (userType === 'new-user' && behavior.projectsCreated === 0) {
      this.suggestions.push({
        id: 'use-template',
        type: 'template',
        title: 'Comece com um Template',
        description: 'Acelere seu primeiro projeto usando nossos templates pré-configurados.',
        confidence: 90,
        context: 'Primeiro projeto',
        action: {
          type: 'modal',
          target: 'template-library'
        },
        priority: 'high',
        dismissible: true
      });
    }

    // Suggest advanced features for experienced users
    if (userType === 'advanced-user' && !behavior.featuresUsed.includes('intelligent-updates')) {
      this.suggestions.push({
        id: 'try-intelligent-updates',
        type: 'feature',
        title: 'Experimente Atualizações Inteligentes',
        description: 'Configure monitoramento automático para seus projetos ativos.',
        confidence: 70,
        context: 'Usuário experiente',
        action: {
          type: 'navigate',
          target: 'intelligent-updates-widget'
        },
        priority: 'medium',
        dismissible: true
      });
    }
  }

  // State Management
  public getState(): UserOnboardingState {
    return { ...this.state };
  }

  public updatePreferences(preferences: Partial<UserOnboardingState['userPreferences']>): void {
    this.state.userPreferences = {
      ...this.state.userPreferences,
      ...preferences
    };
    this.saveState();
  }

  public resetOnboarding(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.state = this.loadState();
    this.generateSmartSuggestions();
  }

  // Analytics
  public trackStepCompletion(stepId: string, timeSpent: number): void {
    // Track analytics here if needed
    console.log(`Step completed: ${stepId}, time spent: ${timeSpent}ms`);
  }

  public trackSuggestionInteraction(suggestionId: string, action: 'clicked' | 'dismissed'): void {
    // Track analytics here if needed
    console.log(`Suggestion ${action}: ${suggestionId}`);
  }
}

export default SmartOnboardingService;