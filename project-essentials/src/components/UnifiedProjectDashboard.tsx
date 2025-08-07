// src/components/UnifiedProjectDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSettings
} from 'react-icons/fi';
import { Project } from '../types/app';
import {
  WidgetConfig,
  DashboardLayout,
  DEFAULT_WIDGET_CONFIGS,
  WIDGET_COMPONENTS,
} from './widgets';
import TypewriterText from './ui/TypewriterText';
import OnboardingTour from './onboarding/OnboardingTour';
import { useSmartOnboarding } from '../hooks/useSmartOnboarding';
import { SmartSuggestion } from '../services/SmartOnboardingService';

// Import decomposed components
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardWidgetGrid from './dashboard/DashboardWidgetGrid';

interface UnifiedProjectDashboardProps {
  project: Project;
  onClose?: () => void;
}

interface ExpandedWidget {
  id: string;
  component: React.ComponentType<any>;
  props: any;
}

const UnifiedProjectDashboard: React.FC<UnifiedProjectDashboardProps> = ({
  project,
  onClose
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>({
    id: 'default',
    name: 'Layout Padrão',
    widgets: DEFAULT_WIDGET_CONFIGS,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [expandedWidget, setExpandedWidget] = useState<ExpandedWidget | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Smart Onboarding
  const {
    isOnboardingActive,
    currentFlow,
    currentStep,
    suggestions,
    state: onboardingState,
    nextStep,
    previousStep,
    skipStep,
    skipFlow,
    completeFlow,
    dismissSuggestion,
    updateBehavior
  } = useSmartOnboarding();

  const [widgetStates, setWidgetStates] = useState<Record<string, {
    isExpanded: boolean;
    isVisible: boolean;
    lastUpdated: string;
  }>>({});

  // Update behavior tracking
  useEffect(() => {
    updateBehavior({
      projectsCreated: 1, // This would come from actual user data
      widgetsUsed: currentLayout.widgets.filter(w => widgetStates[w.id]?.isVisible).map(w => w.type),
      featuresUsed: [
        editMode ? 'edit-mode' : '',
        expandedWidget ? 'widget-expansion' : '',
        'dashboard-view'
      ].filter(Boolean)
    });
  }, [editMode, expandedWidget, currentLayout.widgets, widgetStates, updateBehavior]);

  // Initialize widget states
  useEffect(() => {
    const initialStates: typeof widgetStates = {};
    currentLayout.widgets.forEach(widget => {
      initialStates[widget.id] = {
        isExpanded: false,
        isVisible: widget.isVisible,
        lastUpdated: new Date().toISOString()
      };
    });
    setWidgetStates(initialStates);
  }, [currentLayout]);

  const updateWidgetState = useCallback((widgetId: string, updates: Partial<typeof widgetStates[string]>) => {
    setWidgetStates(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    }));
  }, []);

  const toggleWidgetExpansion = useCallback((widgetId: string) => {
    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const isCurrentlyExpanded = widgetStates[widgetId]?.isExpanded;
    
    if (isCurrentlyExpanded) {
      setExpandedWidget(null);
      updateWidgetState(widgetId, { isExpanded: false });
    } else {
      const WidgetComponent = WIDGET_COMPONENTS[widget.type];
      if (WidgetComponent) {
        setExpandedWidget({
          id: widgetId,
          component: WidgetComponent,
          props: {
            project,
            isExpanded: true,
            onToggleExpand: () => toggleWidgetExpansion(widgetId),
            onRemove: () => removeWidget(widgetId)
          }
        });
        updateWidgetState(widgetId, { isExpanded: true });
      }
    }
  }, [currentLayout.widgets, project, updateWidgetState, widgetStates]);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const currentVisibility = widgetStates[widgetId]?.isVisible ?? true;
    updateWidgetState(widgetId, { isVisible: !currentVisibility });
    
    // Update layout
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, isVisible: !currentVisibility } : w
      ),
      updatedAt: new Date().toISOString()
    }));
  }, [updateWidgetState, widgetStates]);

  const removeWidget = useCallback((widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date().toISOString()
    }));
    
    // Close expanded widget if it's the one being removed
    if (expandedWidget?.id === widgetId) {
      setExpandedWidget(null);
    }
  }, [expandedWidget]);

  const addWidget = useCallback((type: WidgetConfig['type']) => {
    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      title: `Nova ${type}`,
      size: 'md',
      position: { x: 0, y: 0, w: 2, h: 2 },
      isVisible: true,
      isExpandable: true,
      priority: 'medium'
    };

    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const handleSuggestionClick = useCallback((suggestion: SmartSuggestion) => {
    switch (suggestion.action.type) {
      case 'navigate':
        // Handle navigation to specific widget or section
        break;
      case 'modal':
        // Handle opening modals (template library, settings, etc.)
        if (suggestion.action.target === 'template-library') {
          // Would open template library modal
        }
        break;
      case 'tutorial':
        // Handle starting tutorials
        break;
      case 'create':
        // Handle creation actions
        break;
    }
  }, []);

  return (
    <div className="flex h-screen nubank-gradient-2">
      <DashboardSidebar
        project={project}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        editMode={editMode}
        setEditMode={setEditMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        dismissSuggestion={dismissSuggestion}
        handleSuggestionClick={handleSuggestionClick}
        currentLayout={currentLayout}
        widgetStates={widgetStates}
        toggleWidgetVisibility={toggleWidgetVisibility}
        removeWidget={removeWidget}
        addWidget={addWidget}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader project={project} onClose={onClose} />

        <DashboardWidgetGrid
          project={project}
          currentLayout={currentLayout}
          widgetStates={widgetStates}
          editMode={editMode}
          viewMode={viewMode}
          toggleWidgetExpansion={toggleWidgetExpansion}
          removeWidget={removeWidget}
          suggestions={suggestions}
          dismissSuggestion={dismissSuggestion}
          handleSuggestionClick={handleSuggestionClick}
          setExpandedWidget={setExpandedWidget}
          updateWidgetState={updateWidgetState}
        />
      </div>

      {/* Expanded Widget Overlay */}
      {expandedWidget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 slide-in-up">
          <div className="glass-card rounded-lg shadow-xl max-w-6xl w-full flex flex-col bounce-in">
            <expandedWidget.component {...expandedWidget.props} />
          </div>
        </div>
      )}

      {/* Onboarding Tour */}
      {isOnboardingActive && currentFlow && currentStep && (
        <OnboardingTour
          flow={currentFlow}
          currentStep={currentStep}
          stepIndex={currentFlow.steps.findIndex(s => s.id === currentStep.id)}
          totalSteps={currentFlow.steps.length}
          isActive={isOnboardingActive}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipStep}
          onComplete={completeFlow}
          onClose={skipFlow}
          preferences={onboardingState.userPreferences}
        />
      )}

      {/* Edit Mode Indicator */}
      {editMode && (
        <div className="fixed bottom-4 right-4 glass-card px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 slide-in-up pulse-slow">
          <FiSettings size={16} className="text-nubank-purple-600" />
          <TypewriterText
            text="Modo de Edição Ativo"
            speed={50}
            className="text-sm font-medium text-nubank-purple-700"
          />
        </div>
      )}
    </div>
  );
};

export default UnifiedProjectDashboard;
