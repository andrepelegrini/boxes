// src/services/ProjectTemplateService.ts
import { Project, Task, EventItem } from '../types';
import { WidgetConfig } from '../components/widgets';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'desenvolvimento' | 'marketing' | 'pesquisa' | 'design' | 'negocio' | 'pessoal' | 'educacao';
  tags: string[];
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  estimatedDuration: string; // e.g., "2-4 semanas"
  
  // Template content
  projectTemplate: Partial<Project>;
  tasksTemplate: Partial<Task>[];
  eventsTemplate: Partial<EventItem>[];
  widgetConfiguration: WidgetConfig[];
  
  // Metadata
  isBuiltIn: boolean;
  author?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating: number;
  
  // Customization options
  customizableFields: {
    projectName: boolean;
    description: boolean;
    dates: boolean;
    tasks: boolean;
    events: boolean;
    stakeholders: boolean;
  };
  
  // AI Enhancement settings
  aiEnhancement: {
    enabled: boolean;
    autoGenerateTasks: boolean;
    autoGenerateEvents: boolean;
    suggestStakeholders: boolean;
    recommendIntegrations: boolean;
  };
}

export interface TemplateUsageAnalytics {
  templateId: string;
  completionRate: number;
  averageProjectDuration: number;
  commonModifications: {
    field: string;
    frequency: number;
  }[];
  userRatings: number[];
  feedback: {
    userId: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }[];
}

class ProjectTemplateService {
  private readonly STORAGE_KEY = 'project_templates';
  private readonly ANALYTICS_KEY = 'template_analytics';
  private templates: ProjectTemplate[] = [];
  private analytics: Record<string, TemplateUsageAnalytics> = {};

  constructor() {
    this.loadTemplates();
    this.loadAnalytics();
    this.initializeBuiltInTemplates();
  }

  private loadTemplates(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.templates = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading templates:', error);
        this.templates = [];
      }
    }
  }

  private loadAnalytics(): void {
    const stored = localStorage.getItem(this.ANALYTICS_KEY);
    if (stored) {
      try {
        this.analytics = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading analytics:', error);
        this.analytics = {};
      }
    }
  }

  private saveTemplates(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  private saveAnalytics(): void {
    try {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(this.analytics));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  private initializeBuiltInTemplates(): void {
    // Check if built-in templates already exist
    const hasBuiltInTemplates = this.templates.some(t => t.isBuiltIn);
    if (hasBuiltInTemplates) return;

    const builtInTemplates: ProjectTemplate[] = [
      // Desenvolvimento de Software
      {
        id: 'web-app-development',
        name: 'Desenvolvimento de App Web',
        description: 'Template completo para desenvolvimento de aplicação web com metodologia ágil',
        category: 'desenvolvimento',
        tags: ['web', 'react', 'javascript', 'agil', 'fullstack'],
        difficulty: 'intermediario',
        estimatedDuration: '3-6 semanas',
        projectTemplate: {
          name: 'Novo App Web',
          description: 'Desenvolvimento de aplicação web moderna com interface responsiva e backend escalável',
          status: 'active',
          strategicGoal: 'Criar uma solução web robusta que atenda às necessidades dos usuários'
        },
        tasksTemplate: [
          {
            title: 'Definir requisitos e especificações',
            description: 'Levantar e documentar todos os requisitos funcionais e não-funcionais',
            status: 'pending',
            priority: 'high',
            estimatedHours: 8
          },
          {
            title: 'Criar wireframes e protótipos',
            description: 'Desenvolver wireframes e protótipos navegáveis da interface',
            status: 'pending',
            priority: 'high',
            estimatedHours: 16
          },
          {
            title: 'Configurar ambiente de desenvolvimento',
            description: 'Setup do ambiente local, ferramentas e configurações iniciais',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 4
          },
          {
            title: 'Desenvolver componentes base',
            description: 'Criar componentes reutilizáveis e estrutura base da aplicação',
            status: 'pending',
            priority: 'high',
            estimatedHours: 24
          },
          {
            title: 'Implementar autenticação',
            description: 'Sistema de login, registro e gestão de sessões',
            status: 'pending',
            priority: 'high',
            estimatedHours: 12
          },
          {
            title: 'Desenvolver funcionalidades principais',
            description: 'Implementar as principais funcionalidades definidas nos requisitos',
            status: 'pending',
            priority: 'high',
            estimatedHours: 40
          },
          {
            title: 'Testes unitários e integração',
            description: 'Desenvolver e executar testes para garantir qualidade do código',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 16
          },
          {
            title: 'Deploy e configuração de produção',
            description: 'Preparar e executar deploy em ambiente de produção',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 8
          }
        ],
        eventsTemplate: [
          {
            title: 'Kickoff do Projeto',
            description: 'Reunião inicial para alinhamento da equipe e definição de objetivos',
            type: 'meeting',
            allDay: false
          },
          {
            title: 'Review de Wireframes',
            description: 'Apresentação e validação dos wireframes com stakeholders',
            type: 'review',
            allDay: false
          },
          {
            title: 'Demo da Sprint 1',
            description: 'Demonstração dos primeiros componentes desenvolvidos',
            type: 'demo',
            allDay: false
          },
          {
            title: 'Demo da Sprint 2',
            description: 'Demonstração das funcionalidades principais',
            type: 'demo',
            allDay: false
          },
          {
            title: 'Testes de Aceitação',
            description: 'Validação final com usuários e stakeholders',
            type: 'testing',
            allDay: true
          },
          {
            title: 'Go Live',
            description: 'Lançamento oficial da aplicação em produção',
            type: 'milestone',
            allDay: false
          }
        ],
        widgetConfiguration: [
          {
            id: 'overview',
            type: 'overview',
            title: 'Visão Geral do Projeto',
            size: 'lg',
            position: { x: 0, y: 0, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'task-progress',
            type: 'task-progress',
            title: 'Progresso das Tarefas',
            size: 'lg',
            position: { x: 2, y: 0, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'timeline',
            type: 'timeline',
            title: 'Cronograma & Marcos',
            size: 'lg',
            position: { x: 0, y: 2, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'medium'
          },
          {
            id: 'ai-insights',
            type: 'ai-insights',
            title: 'Insights da IA',
            size: 'lg',
            position: { x: 2, y: 2, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'medium'
          }
        ],
        isBuiltIn: true,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0,
        customizableFields: {
          projectName: true,
          description: true,
          dates: true,
          tasks: true,
          events: true,
          stakeholders: true
        },
        aiEnhancement: {
          enabled: true,
          autoGenerateTasks: true,
          autoGenerateEvents: true,
          suggestStakeholders: true,
          recommendIntegrations: true
        }
      },

      // Marketing Campaign
      {
        id: 'marketing-campaign',
        name: 'Campanha de Marketing Digital',
        description: 'Template para planejamento e execução de campanhas de marketing digital',
        category: 'marketing',
        tags: ['marketing', 'digital', 'campanha', 'redes-sociais', 'conteudo'],
        difficulty: 'iniciante',
        estimatedDuration: '2-4 semanas',
        projectTemplate: {
          name: 'Nova Campanha de Marketing',
          description: 'Campanha de marketing digital para aumentar awareness e conversões',
          status: 'active',
          strategicGoal: 'Aumentar reconhecimento da marca e gerar leads qualificados'
        },
        tasksTemplate: [
          {
            title: 'Definir personas e público-alvo',
            description: 'Identificar e documentar personas e segmentação do público',
            status: 'pending',
            priority: 'high',
            estimatedHours: 4
          },
          {
            title: 'Pesquisa de concorrentes',
            description: 'Analisar estratégias e campanhas dos principais concorrentes',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 6
          },
          {
            title: 'Criar estratégia de conteúdo',
            description: 'Definir tipos de conteúdo, temas e calendário editorial',
            status: 'pending',
            priority: 'high',
            estimatedHours: 8
          },
          {
            title: 'Desenvolver peças criativas',
            description: 'Criar artes, videos e materiais gráficos da campanha',
            status: 'pending',
            priority: 'high',
            estimatedHours: 20
          },
          {
            title: 'Configurar campanhas pagas',
            description: 'Setup de campanhas no Google Ads, Facebook Ads e outras plataformas',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 6
          },
          {
            title: 'Produzir conteúdo para redes sociais',
            description: 'Criar posts, stories e conteúdo para diferentes plataformas',
            status: 'pending',
            priority: 'high',
            estimatedHours: 16
          },
          {
            title: 'Monitorar e otimizar resultados',
            description: 'Acompanhar métricas e ajustar campanhas conforme performance',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 8
          }
        ],
        eventsTemplate: [
          {
            title: 'Briefing da Campanha',
            description: 'Reunião para definir objetivos, KPIs e estratégia geral',
            type: 'meeting',
            allDay: false
          },
          {
            title: 'Aprovação de Peças Criativas',
            description: 'Review e aprovação final dos materiais desenvolvidos',
            type: 'review',
            allDay: false
          },
          {
            title: 'Lançamento da Campanha',
            description: 'Go-live das campanhas pagas e publicação de conteúdo',
            type: 'milestone',
            allDay: false
          },
          {
            title: 'Review Semanal de Performance',
            description: 'Análise de resultados e ajustes necessários',
            type: 'review',
            allDay: false
          }
        ],
        widgetConfiguration: [
          {
            id: 'overview',
            type: 'overview',
            title: 'Visão Geral da Campanha',
            size: 'lg',
            position: { x: 0, y: 0, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'task-progress',
            type: 'task-progress',
            title: 'Progresso das Atividades',
            size: 'md',
            position: { x: 2, y: 0, w: 1, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'timeline',
            type: 'timeline',
            title: 'Cronograma da Campanha',
            size: 'lg',
            position: { x: 0, y: 2, w: 3, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'medium'
          }
        ],
        isBuiltIn: true,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0,
        customizableFields: {
          projectName: true,
          description: true,
          dates: true,
          tasks: true,
          events: true,
          stakeholders: true
        },
        aiEnhancement: {
          enabled: true,
          autoGenerateTasks: false,
          autoGenerateEvents: true,
          suggestStakeholders: true,
          recommendIntegrations: true
        }
      },

      // Research Project
      {
        id: 'research-project',
        name: 'Projeto de Pesquisa',
        description: 'Template estruturado para projetos de pesquisa acadêmica ou corporativa',
        category: 'pesquisa',
        tags: ['pesquisa', 'academico', 'cientifico', 'analise', 'dados'],
        difficulty: 'avancado',
        estimatedDuration: '6-12 semanas',
        projectTemplate: {
          name: 'Novo Projeto de Pesquisa',
          description: 'Projeto estruturado de pesquisa com metodologia científica aplicada',
          status: 'active',
          strategicGoal: 'Investigar hipóteses e gerar insights baseados em evidências'
        },
        tasksTemplate: [
          {
            title: 'Definir problema e objetivos de pesquisa',
            description: 'Formular questão de pesquisa, hipóteses e objetivos específicos',
            status: 'pending',
            priority: 'high',
            estimatedHours: 8
          },
          {
            title: 'Revisão de literatura',
            description: 'Pesquisar e analisar trabalhos relacionados ao tema',
            status: 'pending',
            priority: 'high',
            estimatedHours: 20
          },
          {
            title: 'Definir metodologia de pesquisa',
            description: 'Escolher métodos, técnicas e ferramentas de coleta e análise',
            status: 'pending',
            priority: 'high',
            estimatedHours: 12
          },
          {
            title: 'Preparar instrumentos de coleta',
            description: 'Desenvolver questionários, roteiros ou outros instrumentos',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 16
          },
          {
            title: 'Coleta de dados',
            description: 'Executar processo de coleta conforme metodologia definida',
            status: 'pending',
            priority: 'high',
            estimatedHours: 32
          },
          {
            title: 'Análise e interpretação dos dados',
            description: 'Processar, analisar e interpretar os dados coletados',
            status: 'pending',
            priority: 'high',
            estimatedHours: 24
          },
          {
            title: 'Redação do relatório final',
            description: 'Documentar metodologia, resultados e conclusões',
            status: 'pending',
            priority: 'medium',
            estimatedHours: 20
          }
        ],
        eventsTemplate: [
          {
            title: 'Apresentação da Proposta',
            description: 'Apresentação inicial do projeto e validação com orientadores',
            type: 'presentation',
            allDay: false
          },
          {
            title: 'Comitê de Ética (se aplicável)',
            description: 'Submissão e aprovação do projeto em comitê de ética',
            type: 'approval',
            allDay: true
          },
          {
            title: 'Início da Coleta de Dados',
            description: 'Marco do início oficial da fase de coleta',
            type: 'milestone',
            allDay: false
          },
          {
            title: 'Seminário de Resultados Preliminares',
            description: 'Apresentação dos primeiros achados da pesquisa',
            type: 'presentation',
            allDay: false
          },
          {
            title: 'Defesa/Apresentação Final',
            description: 'Apresentação final dos resultados e conclusões',
            type: 'presentation',
            allDay: false
          }
        ],
        widgetConfiguration: [
          {
            id: 'overview',
            type: 'overview',
            title: 'Visão Geral da Pesquisa',
            size: 'lg',
            position: { x: 0, y: 0, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'task-progress',
            type: 'task-progress',
            title: 'Progresso das Etapas',
            size: 'lg',
            position: { x: 2, y: 0, w: 2, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'timeline',
            type: 'timeline',
            title: 'Cronograma de Pesquisa',
            size: 'lg',
            position: { x: 0, y: 2, w: 3, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'high'
          },
          {
            id: 'documents',
            type: 'documents',
            title: 'Documentos e Referencias',
            size: 'md',
            position: { x: 3, y: 2, w: 1, h: 2 },
            isVisible: true,
            isExpandable: true,
            priority: 'medium'
          }
        ],
        isBuiltIn: true,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0,
        customizableFields: {
          projectName: true,
          description: true,
          dates: true,
          tasks: true,
          events: true,
          stakeholders: true
        },
        aiEnhancement: {
          enabled: true,
          autoGenerateTasks: false,
          autoGenerateEvents: true,
          suggestStakeholders: false,
          recommendIntegrations: false
        }
      }
    ];

    // Add built-in templates
    this.templates.push(...builtInTemplates);
    this.saveTemplates();

    // Initialize analytics for built-in templates
    builtInTemplates.forEach(template => {
      this.analytics[template.id] = {
        templateId: template.id,
        completionRate: 0,
        averageProjectDuration: 0,
        commonModifications: [],
        userRatings: [],
        feedback: []
      };
    });
    this.saveAnalytics();
  }

  // Public API Methods
  public getAllTemplates(): ProjectTemplate[] {
    return [...this.templates];
  }

  public getTemplatesByCategory(category: ProjectTemplate['category']): ProjectTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  public getTemplateById(id: string): ProjectTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  public searchTemplates(query: string): ProjectTemplate[] {
    const normalizedQuery = query.toLowerCase();
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(normalizedQuery) ||
      template.description.toLowerCase().includes(normalizedQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
    );
  }

  public getPopularTemplates(limit: number = 5): ProjectTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  public getRecommendedTemplates(userPreferences?: {
    categories?: ProjectTemplate['category'][];
    difficulty?: ProjectTemplate['difficulty'];
    recentProjects?: string[];
  }): ProjectTemplate[] {
    let recommended = [...this.templates];

    if (userPreferences?.categories) {
      recommended = recommended.filter(t => 
        userPreferences.categories!.includes(t.category)
      );
    }

    if (userPreferences?.difficulty) {
      recommended = recommended.filter(t => 
        t.difficulty === userPreferences.difficulty
      );
    }

    // Sort by rating and usage
    return recommended
      .sort((a, b) => (b.rating * 0.7 + b.usageCount * 0.3) - (a.rating * 0.7 + a.usageCount * 0.3))
      .slice(0, 6);
  }

  public createCustomTemplate(
    baseTemplate: ProjectTemplate,
    customizations: {
      name: string;
      description: string;
      projectData?: Partial<Project>;
      tasks?: Partial<Task>[];
      events?: Partial<EventItem>[];
      widgets?: WidgetConfig[];
    }
  ): ProjectTemplate {
    const newTemplate: ProjectTemplate = {
      ...baseTemplate,
      id: `custom_${Date.now()}`,
      name: customizations.name,
      description: customizations.description,
      isBuiltIn: false,
      author: 'user', // Could be enhanced with actual user info
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0
    };

    if (customizations.projectData) {
      newTemplate.projectTemplate = {
        ...newTemplate.projectTemplate,
        ...customizations.projectData
      };
    }

    if (customizations.tasks) {
      newTemplate.tasksTemplate = customizations.tasks;
    }

    if (customizations.events) {
      newTemplate.eventsTemplate = customizations.events;
    }

    if (customizations.widgets) {
      newTemplate.widgetConfiguration = customizations.widgets;
    }

    this.templates.push(newTemplate);
    this.saveTemplates();

    return newTemplate;
  }

  public generateProjectFromTemplate(
    templateId: string,
    customizations: {
      projectName?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      customFields?: Record<string, any>;
    }
  ): { project: Partial<Project>; tasks: Partial<Task>[]; events: Partial<EventItem>[] } | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    // Increment usage count
    template.usageCount++;
    this.saveTemplates();

    // Generate project
    const project: Partial<Project> = {
      ...template.projectTemplate,
      name: customizations.projectName || template.projectTemplate.name || template.name,
      description: customizations.description || template.projectTemplate.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...customizations.customFields
    };

    // Generate tasks with IDs and project reference
    const tasks: Partial<Task>[] = template.tasksTemplate.map((taskTemplate, index) => ({
      ...taskTemplate,
      id: `task_${Date.now()}_${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Generate events with IDs and project reference
    const events: Partial<EventItem>[] = template.eventsTemplate.map((eventTemplate, index) => {
      const baseDate = customizations.startDate ? new Date(customizations.startDate) : new Date();
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + (index * 7)); // Space events weekly

      return {
        ...eventTemplate,
        id: `event_${Date.now()}_${index}`,
        date: eventDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    return { project, tasks, events };
  }

  public rateTemplate(templateId: string, rating: number, feedback?: string): void {
    const template = this.getTemplateById(templateId);
    if (!template) return;

    // Update template rating
    const currentRatings = this.analytics[templateId]?.userRatings || [];
    currentRatings.push(rating);
    
    template.rating = currentRatings.reduce((sum, r) => sum + r, 0) / currentRatings.length;
    
    // Update analytics
    if (!this.analytics[templateId]) {
      this.analytics[templateId] = {
        templateId,
        completionRate: 0,
        averageProjectDuration: 0,
        commonModifications: [],
        userRatings: [],
        feedback: []
      };
    }

    this.analytics[templateId].userRatings = currentRatings;
    
    if (feedback) {
      this.analytics[templateId].feedback.push({
        userId: 'anonymous', // Could be enhanced with actual user ID
        rating,
        comment: feedback,
        createdAt: new Date().toISOString()
      });
    }

    this.saveTemplates();
    this.saveAnalytics();
  }

  public getTemplateAnalytics(templateId: string): TemplateUsageAnalytics | undefined {
    return this.analytics[templateId];
  }

  public deleteTemplate(templateId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template || template.isBuiltIn) {
      return false; // Cannot delete built-in templates
    }

    this.templates = this.templates.filter(t => t.id !== templateId);
    delete this.analytics[templateId];
    
    this.saveTemplates();
    this.saveAnalytics();
    
    return true;
  }

  public exportTemplate(templateId: string): string | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    return JSON.stringify(template, null, 2);
  }

  public importTemplate(templateJson: string): ProjectTemplate | null {
    try {
      const template: ProjectTemplate = JSON.parse(templateJson);
      
      // Validate template structure
      if (!this.validateTemplateStructure(template)) {
        throw new Error('Invalid template structure');
      }

      // Generate new ID to avoid conflicts
      template.id = `imported_${Date.now()}`;
      template.isBuiltIn = false;
      template.createdAt = new Date().toISOString();
      template.updatedAt = new Date().toISOString();
      template.usageCount = 0;

      this.templates.push(template);
      this.saveTemplates();

      return template;
    } catch (error) {
      console.error('Error importing template:', error);
      return null;
    }
  }

  private validateTemplateStructure(template: any): boolean {
    const requiredFields = [
      'name', 'description', 'category', 'difficulty', 
      'projectTemplate', 'tasksTemplate', 'eventsTemplate', 'widgetConfiguration'
    ];
    
    return requiredFields.every(field => field in template);
  }
}

export default ProjectTemplateService;