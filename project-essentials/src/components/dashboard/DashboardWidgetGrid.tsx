// src/components/dashboard/DashboardWidgetGrid.tsx
import React from 'react';
import { Project } from '../../types/app';
import {
  WidgetConfig,
  DashboardLayout,
  WIDGET_COMPONENTS,
} from '../widgets';
import SmartSuggestions from '../onboarding/SmartSuggestions';
import { SmartSuggestion } from '../../services/SmartOnboardingService';

interface DashboardWidgetGridProps {
  project: Project;
  currentLayout: DashboardLayout;
  widgetStates: Record<string, { isExpanded: boolean; isVisible: boolean; lastUpdated: string; }>;
  editMode: boolean;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  toggleWidgetExpansion: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  suggestions: SmartSuggestion[];
  dismissSuggestion: (id: string) => void;
  handleSuggestionClick: (suggestion: SmartSuggestion) => void;
  setExpandedWidget: (widget: { id: string; component: React.ComponentType<any>; props: any; } | null) => void;
  updateWidgetState: (widgetId: string, updates: Partial<{ isExpanded: boolean; isVisible: boolean; lastUpdated: string; }>) => void;
}

const DashboardWidgetGrid: React.FC<DashboardWidgetGridProps> = ({
  project,
  currentLayout,
  widgetStates,
  editMode,
  viewMode,
  toggleWidgetExpansion,
  removeWidget,
  suggestions,
  dismissSuggestion,
  handleSuggestionClick,
  setExpandedWidget,
  updateWidgetState,
}) => {

  const getGridClasses = () => {
    switch (viewMode) {
      case 'mobile':
        return 'grid-cols-1 gap-4';
      case 'tablet':
        return 'grid-cols-1 md:grid-cols-2 gap-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr';
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const WidgetComponent = WIDGET_COMPONENTS[widget.type];
    if (!WidgetComponent) return null;

    const state = widgetStates[widget.id];
    if (!state?.isVisible) return null;

    const widgetProps = {
      project,
      className: editMode ? 'ring-2 ring-nubank-purple-300 ring-opacity-50' : '',
      isExpandable: widget.isExpandable,
      isExpanded: state.isExpanded,
      onToggleExpand: () => {
        const isCurrentlyExpanded = widgetStates[widget.id]?.isExpanded;
        if (isCurrentlyExpanded) {
          setExpandedWidget(null);
          updateWidgetState(widget.id, { isExpanded: false });
        } else {
          const WidgetComponent = WIDGET_COMPONENTS[widget.type];
          if (WidgetComponent) {
            setExpandedWidget({
              id: widget.id,
              component: WidgetComponent,
              props: {
                project,
                isExpanded: true,
                onToggleExpand: () => toggleWidgetExpansion(widget.id),
                onRemove: () => removeWidget(widget.id)
              }
            });
            updateWidgetState(widget.id, { isExpanded: true });
          }
        }
      },
      onRemove: editMode ? () => removeWidget(widget.id) : undefined
    };

    return (
      <div 
        key={widget.id} 
        className={`relative group ${editMode ? 'cursor-move' : ''}`}
        data-tour={`widget-${widget.type}`}
      >
        {editMode && (
          <div className="absolute -top-2 -right-2 z-10 flex space-x-1">
            {/* Visibility toggle is now in sidebar, but keeping this for consistency if needed */}
            {/* <button
              onClick={() => toggleWidgetVisibility(widget.id)}
              className="p-1 bg-white rounded-full shadow-md text-nubank-gray-600 hover:text-nubank-blue-600 transition-colors"
              title={state.isVisible ? 'Ocultar widget' : 'Mostrar widget'}
            >
              {state.isVisible ? <FiEyeOff size={12} /> : <FiEye size={12} />}
            </button> */}
            <div className="p-1 bg-white rounded-full shadow-md text-nubank-gray-400">
              <FiMove size={12} />
            </div>
          </div>
        )}
        <WidgetComponent {...widgetProps} />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6 custom-scrollbar">
      <div 
        className={`grid ${getGridClasses()} min-h-full gap-6`}
        data-tour="widget-grid"
      >
        {currentLayout.widgets.map((widget, index) => (
          <div key={widget.id} className="stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {/* Suggestions Panel (Bottom Right) */}
      {suggestions.length > 2 && (
        <div className="fixed bottom-4 left-4 max-w-sm z-40">
          <SmartSuggestions
            suggestions={suggestions.slice(2)} // Show remaining suggestions
            onDismiss={dismissSuggestion}
            onSuggestionClick={handleSuggestionClick}
            className="slide-in-left"
          />
        </div>
      )}
    </div>
  );
};

export default DashboardWidgetGrid;
