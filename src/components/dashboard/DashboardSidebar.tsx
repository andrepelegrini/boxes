// src/components/dashboard/DashboardSidebar.tsx
import React from 'react';
import {
  FiSidebar, FiSettings,
  FiEye, FiEyeOff, FiMove, FiSave, FiRefreshCw, FiMoreVertical,
  FiLayout, FiMonitor, FiSmartphone, FiHelpCircle, FiInfo, FiPlus
} from 'react-icons/fi';
import { Project } from '../../types/app';
import {
  WidgetConfig,
  DashboardLayout,
  WIDGET_COMPONENTS,
} from '../widgets';
import PulseButton from '../ui/PulseButton';
import FloatingFeedback from '../ui/FloatingFeedback';
import TypewriterText from '../ui/TypewriterText';
import SmartSuggestions from '../onboarding/SmartSuggestions';
import { SmartSuggestion } from '../../services/SmartOnboardingService';

interface DashboardSidebarProps {
  project: Project;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  suggestions: SmartSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  dismissSuggestion: (id: string) => void;
  handleSuggestionClick: (suggestion: SmartSuggestion) => void;
  currentLayout: DashboardLayout;
  widgetStates: Record<string, { isExpanded: boolean; isVisible: boolean; lastUpdated: string; }>;
  toggleWidgetVisibility: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  addWidget: (type: WidgetConfig['type']) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  project,
  sidebarCollapsed,
  setSidebarCollapsed,
  editMode,
  setEditMode,
  viewMode,
  setViewMode,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  dismissSuggestion,
  handleSuggestionClick,
  currentLayout,
  widgetStates,
  toggleWidgetVisibility,
  removeWidget,
  addWidget,
}) => {
  return (
    <div
      className={`glass-sidebar border-r border-nubank-gray-200 transition-all duration-300 slide-in-left ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}
      data-tour="sidebar"
    >
      <div className="p-4 border-b border-nubank-gray-200 glass-card">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 slide-in-right">
              <TypewriterText
                text={project.name}
                speed={100}
                className="text-lg font-bold text-nubank-gray-800 truncate block"
              />
              <p className="text-sm text-nubank-gray-600 truncate">
                Dashboard do Projeto
              </p>
            </div>
          )}
          <FloatingFeedback
            trigger={
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors ripple"
              >
                <FiSidebar size={16} />
              </button>
            }
            message={sidebarCollapsed ? 'Sidebar expandida!' : 'Sidebar colapsada!'}
            type="info"
          />
        </div>
      </div>

      {!sidebarCollapsed && (
        <div className="p-4 space-y-4">
          {/* View Mode Toggle */}
          <div className="stagger-item">
            <h3 className="text-sm font-medium text-nubank-gray-700 mb-2">Visualização</h3>
            <div className="flex space-x-1 glass-card rounded-lg p-1">
              {[
                { id: 'desktop', icon: FiMonitor, label: 'Desktop' },
                { id: 'tablet', icon: FiLayout, label: 'Tablet' },
                { id: 'mobile', icon: FiSmartphone, label: 'Mobile' }
              ].map(({ id, icon: Icon, label }) => (
                <PulseButton
                  key={id}
                  onClick={() => setViewMode(id as any)}
                  variant={viewMode === id ? 'primary' : 'secondary'}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Icon size={12} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </PulseButton>
              ))}
            </div>
          </div>

          {/* Edit Mode Toggle */}
          <div className="stagger-item">
            <h3 className="text-sm font-medium text-nubank-gray-700 mb-2">Controles</h3>
            <div className="space-y-2">
              <PulseButton
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? 'primary' : 'secondary'}
                size="md"
                className="w-full flex items-center justify-center space-x-2"
                data-tour="edit-mode"
              >
                <FiSettings size={16} />
                <span>{editMode ? 'Sair da Edição' : 'Editar Layout'}</span>
              </PulseButton>

              {editMode && (
                <PulseButton
                  onClick={() => {
                    // Save layout logic here
                    setEditMode(false);
                  }}
                  variant="success"
                  size="md"
                  className="w-full flex items-center justify-center space-x-2 slide-in-up"
                >
                  <FiSave size={16} />
                  <span>Salvar Layout</span>
                </PulseButton>
              )}
            </div>
          </div>

          {/* Smart Suggestions */}
          {!sidebarCollapsed && suggestions.length > 0 && (
            <div className="stagger-item">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-nubank-gray-700">Sugestões</h3>
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors"
                >
                  {showSuggestions ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                </button>
              </div>

              {showSuggestions && (
                <div className="slide-in-up">
                  <SmartSuggestions
                    suggestions={suggestions.slice(0, 2)} // Show only top 2 in sidebar
                    onDismiss={dismissSuggestion}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              )}
            </div>
          )}

          {/* Help & Onboarding */}
          {!sidebarCollapsed && (
            <div className="stagger-item">
              <h3 className="text-sm font-medium text-nubank-gray-700 mb-2">Ajuda</h3>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm glass-card rounded-lg notion-hover transition-colors"
                  data-tour="help-tour"
                >
                  <FiHelpCircle size={14} />
                  <span>Tour do Dashboard</span>
                </button>

                <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm glass-card rounded-lg notion-hover transition-colors">
                  <FiHelpCircle size={14} />
                  <span>Dicas e Truques</span>
                </button>
              </div>
            </div>
          )}

          {/* Widget List */}
          <div className="stagger-item">
            <h3 className="text-sm font-medium text-nubank-gray-700 mb-2">Widgets</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {currentLayout.widgets.map((widget, index) => {
                const state = widgetStates[widget.id];
                return (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-2 glass-card rounded-lg notion-hover transition-colors stagger-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${
                        state?.isVisible ? 'bg-nubank-green-500' : 'bg-nubank-gray-300'
                      }`} />
                      <span className="text-sm text-nubank-gray-700 truncate">
                        {widget.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FloatingFeedback
                        trigger={
                          <button
                            onClick={() => toggleWidgetVisibility(widget.id)}
                            className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors ripple"
                            title={state?.isVisible ? 'Ocultar' : 'Mostrar'}
                          >
                            {state?.isVisible ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                          </button>
                        }
                        message={state?.isVisible ? 'Widget ocultado!' : 'Widget mostrado!'}
                        type="info"
                      />
                      {editMode && (
                        <FloatingFeedback
                          trigger={
                            <button
                              onClick={() => removeWidget(widget.id)}
                              className="p-1 text-nubank-gray-400 hover:text-nubank-pink-600 transition-colors ripple"
                              title="Remover widget"
                            >
                              <FiMoreVertical size={12} />
                            </button>
                          }
                          message="Widget removido!"
                          type="warning"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Widget */}
          {editMode && (
            <div className="slide-in-up stagger-item">
              <h3 className="text-sm font-medium text-nubank-gray-700 mb-2">Adicionar Widget</h3>
              <div className="space-y-1">
                {Object.keys(WIDGET_COMPONENTS).map((type, index) => (
                  <FloatingFeedback
                    key={type}
                    trigger={
                      <button
                        onClick={() => addWidget(type as any)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm glass-card rounded-lg notion-hover transition-colors stagger-item"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <FiPlus size={14} />
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                      </button>
                    }
                    message="Widget adicionado!"
                    type="success"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSidebar;
