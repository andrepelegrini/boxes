// src/components/widgets/index.ts
export { default as WidgetCard } from './WidgetCard';
export type { WidgetCardProps } from './WidgetCard';

import ProjectOverviewWidget from './ProjectOverviewWidget';
import SlackActivityWidget from './SlackActivityWidget';
import IntelligentUpdatesWidget from './IntelligentUpdatesWidget';

export { ProjectOverviewWidget, SlackActivityWidget, IntelligentUpdatesWidget };

// Widget types for the dashboard layout system
export interface WidgetConfig {
  id: string;
  type: 'overview' | 'ai-insights' | 'task-progress' | 'slack-activity' | 'timeline' | 'intelligent-updates' | 'documents' | 'stakeholders' | 'dependencies';
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
  isExpandable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Default widget configurations
export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
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
    id: 'ai-insights',
    type: 'ai-insights',
    title: 'Insights da IA',
    size: 'lg',
    position: { x: 0, y: 2, w: 2, h: 2 },
    isVisible: true,
    isExpandable: true,
    priority: 'medium'
  },
  {
    id: 'timeline',
    type: 'timeline',
    title: 'Cronograma & Marcos',
    size: 'lg',
    position: { x: 2, y: 2, w: 2, h: 2 },
    isVisible: true,
    isExpandable: true,
    priority: 'medium'
  },
  {
    id: 'slack-activity',
    type: 'slack-activity',
    title: 'Atividade do Slack',
    size: 'md',
    position: { x: 4, y: 0, w: 1, h: 2 },
    isVisible: true,
    isExpandable: true,
    priority: 'low'
  },
  {
    id: 'intelligent-updates',
    type: 'intelligent-updates',
    title: 'Atualizações Inteligentes',
    size: 'md',
    position: { x: 0, y: 4, w: 2, h: 2 },
    isVisible: true,
    isExpandable: true,
    priority: 'medium'
  },
  
];

// Widget component mapping
export const WIDGET_COMPONENTS = {
  'overview': ProjectOverviewWidget,
  'slack-activity': SlackActivityWidget,
  'intelligent-updates': IntelligentUpdatesWidget,
  // Future widgets can be added here
  'documents': ProjectOverviewWidget, // Placeholder
  'stakeholders': ProjectOverviewWidget, // Placeholder
  'dependencies': ProjectOverviewWidget // Placeholder
} as const;

export type WidgetType = keyof typeof WIDGET_COMPONENTS;