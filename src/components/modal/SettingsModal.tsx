import React, { useState, useEffect } from 'react';
import { Modal } from '../../modules/common/components/Modal';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';
import { FiSave, FiSettings, FiCpu, FiCheck, FiX, FiExternalLink, FiMessageSquare, FiTrash2, FiRefreshCw, FiAlertTriangle, FiWifi } from 'react-icons/fi';
import { MAX_ACTIVE_PROJECTS as DEFAULT_MAX_ACTIVE_PROJECTS, TEAM_COMFORTABLE_WEIGHT_CAPACITY_ITEMS as DEFAULT_TEAM_CAPACITY } from '../../constants/appConstants';
import { useToast } from '../ui/Toast';
import { DataResetService } from '../../utils/dataReset';
import { useConnectionState } from '../../hooks/useConnectionState';
import { useNavigate } from 'react-router-dom';
import { WhatsAppConnection } from '../WhatsAppConnection';
import { SlackConfigurationManager } from '../slack/SlackConfigurationManager';
import { useAIContext } from '../../contexts/AIContext';


const SettingsModal: React.FC = () => {
  const { 
    showSettingsModal, setShowSettingsModal, 
    userMaxActiveProjects, userTeamCapacity, 
    updateUserSettings
  } = useAppContext();
  const { showFriendlyError, showSuccess, ToastContainer } = useToast();
  const { connectionStates, isLoading, disconnectGemini, disconnectSlack, refreshGeminiState } = useConnectionState();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'general' | 'connections' | 'reset'>('general');
  const [maxActive, setMaxActive] = useState(userMaxActiveProjects);
  const [teamCapacity, setTeamCapacity] = useState(userTeamCapacity);
  const [isResetting, setIsResetting] = useState(false);
  const [dataSize, setDataSize] = useState<{ localStorage: number; keys: string[] }>({ localStorage: 0, keys: [] });
  const [confirmationData, setConfirmationData] = useState<{
    show: boolean;
    dataTypes: ('projects' | 'tasks' | 'slack' | 'settings' | 'ai')[];
    message: string;
  }>({ show: false, dataTypes: [], message: '' });
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [showGeminiConfig, setShowGeminiConfig] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const { updateGeminiApiKey, testGeminiConnection, geminiApiKey: currentGeminiKey } = useAIContext() || {};
  
  // Component render tracking for development
  // Removed debug logging for production
  

  useEffect(() => {
    setMaxActive(userMaxActiveProjects);
    setTeamCapacity(userTeamCapacity);
    
    // Calculate data size when modal opens
    if (showSettingsModal) {
      setDataSize(DataResetService.getDataSize());
    }
  }, [userMaxActiveProjects, userTeamCapacity, showSettingsModal]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('💾 [SETTINGS] User clicked save settings button', {
      maxActive,
      teamCapacity
    });
    
    if (activeTab === 'general') {
      const newMaxActive = parseInt(String(maxActive), 10);
      const newTeamCapacity = parseInt(String(teamCapacity), 10);

      if (isNaN(newMaxActive) || newMaxActive < 1 || newMaxActive > 10) {
                                                                                          showFriendlyError('Número Fora do Intervalo', 'O máximo de caixas abertas deve estar entre 1 e 10 para manter a produtividade em alta!');
          return;
      }
      if (isNaN(newTeamCapacity) || newTeamCapacity < 5 || newTeamCapacity > 200) {
          showFriendlyError('Capacidade Inadequada', 'A capacidade da equipe deve estar entre 5 e 200 pontos para funcionar bem.');
          return;
      }

      // Save settings to context and localStorage
      updateUserSettings({ 
        maxActiveProjects: newMaxActive, 
        teamCapacity: newTeamCapacity 
      });
      
      showSuccess('⚙️ Configurações salvas com sucesso!');
      setShowSettingsModal(false);
    }
  };

  const handleResetToDefaults = () => {
    // Clear localStorage keys first to ensure clean reset
    localStorage.removeItem('user_max_active_projects');
    localStorage.removeItem('user_team_capacity');
    // Also clear any legacy keys
    localStorage.removeItem('userMaxActiveProjects');
    localStorage.removeItem('userTeamCapacity');
    
    // Update local state
    setMaxActive(DEFAULT_MAX_ACTIVE_PROJECTS);
    setTeamCapacity(DEFAULT_TEAM_CAPACITY);
    
    // Update context state with default values
    updateUserSettings({ 
      maxActiveProjects: DEFAULT_MAX_ACTIVE_PROJECTS, 
      teamCapacity: DEFAULT_TEAM_CAPACITY 
    });
    
    showSuccess('🔄 Configurações restauradas para os valores padrão!');
  };


  /**
   * Handles complete application data reset
   */
  const handleCompleteReset = () => {
    console.log('🚨 [SETTINGS] User clicked complete reset button');
    setConfirmationData({
      show: true,
      dataTypes: ['projects', 'tasks', 'slack', 'settings', 'ai'],
      message: '🚨 RESET COMPLETO\n\nEsta ação irá apagar TODOS os dados:\n• Projetos e tarefas\n• Configurações Slack\n• Chave da IA\n• Todas as configurações\n\nEsta ação NÃO PODE ser desfeita!'
    });
  };

  const executeCompleteReset = async () => {
    setIsResetting(true);
    setConfirmationData({ show: false, dataTypes: [], message: '' });
    
    try {
      // Starting complete reset process
      const result = await DataResetService.resetAllData();
      
      if (result.success) {
        // Reset successful, showing success message and reloading
        showSuccess('Reset Completo!', 'Todos os dados foram apagados. A página será recarregada.');
        
        // Close modal immediately
        setShowSettingsModal(false);
        
        // Force reload after short delay to ensure the success message is shown
        setTimeout(() => {
          // Forcing page reload
          window.location.reload();
        }, 1500);
      } else {
        showFriendlyError(result.error || 'Erro no Reset: Não foi possível completar o reset.');
        setIsResetting(false);
      }
    } catch (error) {
      showFriendlyError(error instanceof Error ? error.message : 'Erro Inesperado: Erro desconhecido durante o reset.');
      setIsResetting(false);
    }
  };

  /**
   * Handle partial data reset for specific categories
   */
  const handlePartialReset = (dataTypes: ('projects' | 'tasks' | 'slack' | 'settings' | 'ai')[]) => {
    console.log('🧩 [SETTINGS] User clicked partial reset button', { dataTypes });
    // Handle partial reset for specified data types
    
    const typeNames = {
      projects: 'Projetos',
      tasks: 'Tarefas',
      slack: 'Configurações Slack',
      settings: 'Configurações Gerais',
      ai: 'Configurações de IA'
    };

    const resetList = dataTypes.map(type => `• ${typeNames[type]}`).join('\n');
    const message = `Esta ação irá apagar:\n${resetList}\n\nDeseja continuar?`;
    
    setConfirmationData({
      show: true,
      dataTypes,
      message
    });
  };

  const executePartialReset = async (dataTypes: ('projects' | 'tasks' | 'slack' | 'settings' | 'ai')[]) => {

    setIsResetting(true);
    setConfirmationData({ show: false, dataTypes: [], message: '' });
    
    try {
      // Starting partial reset
      const result = await DataResetService.resetPartialData(dataTypes);
      
      if (result.success) {
        // Partial reset successful
        showSuccess('✅ Reset Parcial Concluído!', 'Os dados selecionados foram removidos.');
        
        // Update data size display
        setDataSize(DataResetService.getDataSize());
        
        // If resetting critical data, suggest a page reload
        if (dataTypes.includes('projects') || dataTypes.includes('tasks') || dataTypes.includes('settings')) {
          setTimeout(() => {
            const shouldReload = confirm('Recarregar página para aplicar mudanças?');
            if (shouldReload) {
              window.location.reload();
            }
          }, 1000);
        }
      } else {
        showFriendlyError(result.error || 'Erro no Reset: Não foi possível completar o reset parcial.');
      }
    } catch (error) {
      console.error('❌ Partial reset exception:', error);
      showFriendlyError(error instanceof Error ? error.message : 'Erro Inesperado: Erro desconhecido.');
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <Modal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      title="Configurações do Aplicativo"
      size="2xl"
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Tab Navigation - Fixed at top */}
        <div className="flex border-b border-border px-6 pt-0 pb-0 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            console.log('⚙️ [SETTINGS] User clicked General tab');
            setActiveTab('general');
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-textAccent hover:text-textOnSurface'
          }`}
        >
          <FiSettings className="inline mr-2" />
          Geral
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('🔗 [SETTINGS] User clicked Connections tab');
            setActiveTab('connections');
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'connections'
              ? 'border-primary text-primary'
              : 'border-transparent text-textAccent hover:text-textOnSurface'
          }`}
        >
          <FiWifi className="inline mr-2" />
          Conexões
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('🗑️ [SETTINGS] User clicked Reset tab');
            setActiveTab('reset');
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reset'
              ? 'border-danger-DEFAULT text-danger-DEFAULT'
              : 'border-transparent text-textAccent hover:text-danger-DEFAULT'
          }`}
        >
          <FiTrash2 className="inline mr-2" />
          Reset
        </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div>
              <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-surface rounded-lg p-6 border border-border/50">
            <label htmlFor="maxActiveProjects" className="block text-sm font-medium text-textAccent mb-3">
              Máximo de Caixas Abertas Permitidas
            </label>
            <input
              type="number"
              id="maxActiveProjects"
              value={maxActive}
              onChange={(e) => setMaxActive(Number(e.target.value))}
              min="1"
              max="10" 
              className="w-full px-4 py-3 bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-textOnSurface transition-all"
              required
            />
            <p className="text-xs text-textAccent/80 mt-3">Quantas Caixas podem estar "Abertas" simultaneamente (Padrão: {DEFAULT_MAX_ACTIVE_PROJECTS}).</p>
          </div>
          
          <div className="bg-surface rounded-lg p-6 border border-border/50">
            <label htmlFor="teamCapacity" className="block text-sm font-medium text-textAccent mb-3">
              Capacidade de Carga da Equipe (Total de Pontos de Peso)
            </label>
            <input
              type="number"
              id="teamCapacity"
              value={teamCapacity}
              onChange={(e) => setTeamCapacity(Number(e.target.value))}
              min="5" 
              max="200" 
              className="w-full px-4 py-3 bg-background border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-textOnSurface transition-all"
              required
            />
            <p className="text-xs text-textAccent/80 mt-3">Soma dos "pesos" de todas as Caixas Abertas antes de indicar sobrecarga (Padrão: {DEFAULT_TEAM_CAPACITY}).</p>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                console.log('🔄 [SETTINGS] User clicked reset to defaults button');
                handleResetToDefaults();
              }}
              className="py-3 px-5 border border-border rounded-lg shadow-sm text-sm font-medium text-textAccent hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
            >
              Restaurar Padrões
            </button>
            <div className="flex space-x-4">
              <button
                  type="button"
                  onClick={() => {
                    console.log('❌ [SETTINGS] User clicked cancel button');
                    setShowSettingsModal(false);
                  }}
                  className="py-3 px-6 border border-border rounded-lg shadow-sm text-sm font-medium text-textAccent hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
              >
                  Cancelar
              </button>
              <button
                  type="submit"
                  className="inline-flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-textOnPrimary bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
              >
                  <FiSave className="mr-2" /> Salvar
              </button>
            </div>
          </div>
              </form>
            </div>
          )}

          {/* Connections Tab */}
          {activeTab === 'connections' && (
            <div className="space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <FiRefreshCw className="animate-spin mr-2" />
              <span>Verificando conexões...</span>
            </div>
          ) : (
            <>
              {/* Gemini AI Connection */}
              <ConnectionCard
                title="Google Gemini AI"
                description="Análise inteligente de projetos e sugestões automatizadas"
                icon={<FiCpu className="w-6 h-6" />}
                connectionState={connectionStates.gemini}
                onDisconnect={disconnectGemini}
                onSetup={() => {
                  console.log('🤖 [SETTINGS] User clicked Gemini AI setup button');
                  console.log('🔍 [DEBUG] Current Gemini connection state:', connectionStates.gemini);
                  console.log('🔍 [DEBUG] Current AI context key:', currentGeminiKey);
                  console.log('🔍 [DEBUG] Local storage key:', localStorage.getItem('gemini_api_key'));
                  
                  // Load existing key when opening modal
                  const existingKey = currentGeminiKey || localStorage.getItem('gemini_api_key') || '';
                  console.log('🔍 [DEBUG] Loading existing key into modal:', existingKey ? 'KEY_PRESENT' : 'NO_KEY');
                  setGeminiApiKey(existingKey);
                  setShowGeminiConfig(true);
                }}
                setupInstructions={{
                  title: "Como configurar o Google Gemini AI:",
                  steps: [
                    "Acesse o Google AI Studio",
                    "Faça login com sua conta Google",
                    "Clique em 'Create API Key'",
                    "Copie a chave gerada",
                    "Cole no campo de configuração"
                  ],
                  externalLink: "https://aistudio.google.com/apikey"
                }}
              />

              {/* Slack Connection */}
              <ConnectionCard
                title="Slack"
                description="Sincronização de mensagens e descoberta inteligente de tarefas"
                icon={<FiMessageSquare className="w-6 h-6" />}
                connectionState={connectionStates.slack}
                onDisconnect={disconnectSlack}
                onSetup={() => {
                  console.log('📡 [SETTINGS] User clicked Slack setup button');
                  setShowSlackConfig(true);
                }}
                setupInstructions={{
                  title: "Como conectar ao Slack:",
                  steps: [
                    "Configure as credenciais do app Slack",
                    "Autentique com seu workspace",
                    "Selecione os canais para monitorar",
                    "Configure descoberta de tarefas"
                  ]
                }}
              />

              {/* WhatsApp Connection */}
              <div>
                <h3 className="text-lg font-semibold text-textOnSurface mb-4">WhatsApp Integration</h3>
                <WhatsAppConnection />
              </div>

            </>
          )}
            </div>
          )}

          {/* Data Reset Tab */}
          {activeTab === 'reset' && (
            <div className="space-y-8">
          <div className="bg-danger-light/10 border border-danger-DEFAULT/20 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FiAlertTriangle className="text-danger-DEFAULT mr-2" />
              <h3 className="text-lg font-semibold text-danger-DEFAULT">
                ⚠️ Zona de Perigo
              </h3>
            </div>
            <p className="text-sm text-textAccent">
              Use estas opções com cuidado. As ações de reset não podem ser desfeitas.
            </p>
          </div>

          {/* Data Overview */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h4 className="font-medium text-textOnSurface mb-3">📊 Visão Geral dos Dados</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-textAccent">💾 Tamanho armazenado:</span>
                <span className="font-mono text-textOnSurface ml-2 font-medium">
                  {(dataSize.localStorage / 1024).toFixed(2)} KB
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-textAccent">🔑 Itens de dados:</span>
                <span className="font-mono text-textOnSurface ml-2 font-medium">
                  {dataSize.keys.length}
                </span>
              </div>
            </div>
            {dataSize.keys.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-textAccent hover:text-textOnSurface flex items-center">
                  🔍 Ver chaves armazenadas ({dataSize.keys.length} itens)
                </summary>
                <div className="mt-2 max-h-32 overflow-y-auto bg-background border border-border rounded p-2">
                  <ul className="text-xs space-y-1">
                    {dataSize.keys.map((key, index) => (
                      <li key={index} className="font-mono text-textAccent flex items-center">
                        <span className="text-textAccent mr-2">•</span>
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>

          {/* Partial Reset Options */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h4 className="font-medium text-textOnSurface mb-3">🧹 Reset Parcial</h4>
            <p className="text-sm text-textAccent mb-4">
              Remova apenas categorias específicas de dados. Útil para resolver problemas específicos sem perder tudo:
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  // Handle projects reset
                  handlePartialReset(['projects']);
                }}
                disabled={isResetting}
                className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50"
                title="Remove todos os projetos, eventos e documentos"
              >
                <FiTrash2 className="mb-1 text-orange-500" />
                <span className="text-sm font-medium">Projetos</span>
                <span className="text-xs text-textAccent text-center">Caixas e conteúdo</span>
              </button>
              <button
                onClick={() => {
                  // Handle tasks reset
                  handlePartialReset(['tasks']);
                }}
                disabled={isResetting}
                className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50"
                title="Remove todas as tarefas e logs de atividade"
              >
                <FiTrash2 className="mb-1 text-blue-500" />
                <span className="text-sm font-medium">Tarefas</span>
                <span className="text-xs text-textAccent text-center">E histórico</span>
              </button>
              <button
                onClick={() => handlePartialReset(['slack'])}
                disabled={isResetting}
                className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50"
                title="Remove todas as configurações e dados do Slack"
              >
                <FiTrash2 className="mb-1 text-purple-500" />
                <span className="text-sm font-medium">Slack</span>
                <span className="text-xs text-textAccent text-center">Configurações</span>
              </button>
              <button
                onClick={() => handlePartialReset(['ai'])}
                disabled={isResetting}
                className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50"
                title="Remove a chave API e cache da IA"
              >
                <FiTrash2 className="mb-1 text-green-500" />
                <span className="text-sm font-medium">IA</span>
                <span className="text-xs text-textAccent text-center">Chave e cache</span>
              </button>
              <button
                onClick={() => handlePartialReset(['settings'])}
                disabled={isResetting}
                className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50"
                title="Remove preferências de usuário e configurações gerais"
              >
                <FiTrash2 className="mb-1 text-gray-500" />
                <span className="text-sm font-medium">Configurações</span>
                <span className="text-xs text-textAccent text-center">Preferências</span>
              </button>
            </div>
            
            {/* Quick Combinations */}
            <div className="mt-4 pt-4 border-t border-border">
              <h5 className="text-sm font-medium text-textOnSurface mb-3">⚡ Combinações Rápidas</h5>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <button
                  onClick={() => handlePartialReset(['projects', 'tasks'])}
                  disabled={isResetting}
                  className="flex items-center justify-center p-3 border border-orange-300 bg-orange-50/50 rounded-lg hover:bg-orange-100/50 transition-colors disabled:opacity-50"
                  title="Remove todos os projetos e tarefas, mantendo configurações"
                >
                  <FiTrash2 className="mr-2 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Limpar Trabalho</span>
                </button>
                <button
                  onClick={() => handlePartialReset(['slack', 'ai'])}
                  disabled={isResetting}
                  className="flex items-center justify-center p-3 border border-purple-300 bg-purple-50/50 rounded-lg hover:bg-purple-100/50 transition-colors disabled:opacity-50"
                  title="Remove configurações do Slack e IA, mantendo projetos"
                >
                  <FiTrash2 className="mr-2 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Resetar Integrações</span>
                </button>
              </div>
            </div>
          </div>

          {/* Complete Reset */}
          <div className="bg-danger-light/5 border border-danger-DEFAULT/30 rounded-lg p-4">
            <h4 className="font-medium text-danger-DEFAULT mb-3 flex items-center">
              <FiAlertTriangle className="mr-2" />
              🚨 Reset Completo
            </h4>
            <p className="text-sm text-textAccent mb-4">
              Remove TODOS os dados do aplicativo. Você voltará ao estado inicial, como um novo usuário.
              Esta ação não pode ser desfeita e recarregará a página automaticamente.
            </p>
            <button
              onClick={handleCompleteReset}
              disabled={isResetting}
              className="w-full flex items-center justify-center py-3 px-4 bg-danger-DEFAULT text-white rounded-lg hover:bg-danger-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <>
                  <FiRefreshCw className="mr-2 animate-spin" />
                  Apagando dados e reiniciando...
                </>
              ) : (
                <>
                  <FiTrash2 className="mr-2" />
                  Apagar Todos os Dados
                </>
              )}
            </button>
            
            {isResetting && (
              <div className="mt-3 p-3 bg-info-light/10 border border-info-DEFAULT/20 rounded-lg">
                <div className="flex items-center text-info-DEFAULT">
                  <FiRefreshCw className="mr-2 animate-spin" />
                  <span className="text-sm">
                    Processando reset... A página será recarregada em instantes.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-8 border-t border-border/50">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="py-3 px-6 border border-border rounded-lg shadow-sm text-sm font-medium text-textAccent hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
            >
              Fechar
            </button>
          </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmationData.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🗑️ Confirmar Reset</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-line">{confirmationData.message}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('❌ [SETTINGS] User cancelled reset confirmation');
                  setConfirmationData({ show: false, dataTypes: [], message: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const isCompleteReset = confirmationData.dataTypes.length === 5;
                  console.log('✅ [SETTINGS] User confirmed reset', {
                    isCompleteReset,
                    dataTypes: confirmationData.dataTypes
                  });
                  if (isCompleteReset) {
                    executeCompleteReset();
                  } else {
                    executePartialReset(confirmationData.dataTypes);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer />
      
      {/* Slack Configuration Modal */}
      {showSlackConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SlackConfigurationManager
              context="settings"
              onConfigurationComplete={() => {
                setShowSlackConfig(false);
                showSuccess('Slack configurado com sucesso!');
              }}
              onClose={() => setShowSlackConfig(false)}
            />
          </div>
        </div>
      )}
      
      {/* Gemini Configuration Modal */}
      {showGeminiConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Configurar Google Gemini AI</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Insira sua chave API do Google AI Studio para ativar recursos de IA.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Como obter sua chave API:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">Google AI Studio <FiExternalLink className="ml-1 w-3 h-3" /></a></li>
                  <li>Faça login com sua conta Google</li>
                  <li>Clique em "Create API Key"</li>
                  <li>Copie a chave gerada e cole abaixo</li>
                </ol>
              </div>
              
              <div>
                <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Chave API do Google Gemini
                </label>
                <input
                  type="password"
                  id="geminiApiKey"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGeminiConfig(false);
                    setGeminiApiKey('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!geminiApiKey.trim()) {
                      showFriendlyError('Erro', 'Por favor, insira uma chave API válida.');
                      return;
                    }
                    
                    try {
                      if (updateGeminiApiKey) {
                        const success = await updateGeminiApiKey(geminiApiKey.trim());
                        if (success) {
                          setShowGeminiConfig(false);
                          setGeminiApiKey('');
                          showSuccess('Chave API do Gemini configurada com sucesso!');
                          // Refresh the connection state to show as connected
                          await refreshGeminiState();
                        } else {
                          showFriendlyError('Erro', 'Falha ao configurar a chave API. Verifique se a chave é válida.');
                        }
                      } else {
                        showFriendlyError('Erro', 'Configuração de IA não disponível no momento.');
                      }
                    } catch (error) {
                      showFriendlyError('Erro', 'Erro ao configurar a chave API.');
                    }
                  }}
                  disabled={!geminiApiKey.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </Modal>
  );
};

// ConnectionCard component for the connections tab
interface ConnectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  connectionState: {
    isConnected: boolean;
    isConfigured: boolean;
    displayName?: string;
    lastConnected?: string;
    error?: string;
    canDisconnect: boolean;
    canEdit: boolean;
  };
  onDisconnect: () => Promise<void>;
  onSetup: () => void;
  setupInstructions?: {
    title: string;
    steps: string[];
    externalLink?: string;
  };
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  title,
  description,
  icon,
  connectionState,
  onDisconnect,
  onSetup,
  setupInstructions
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { showFriendlyError, showSuccess } = useToast();

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      showSuccess('Desconectado com sucesso', '');
    } catch (error) {
      showFriendlyError(`Erro ao desconectar ${title}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusColor = () => {
    if (connectionState.error) return 'text-danger-DEFAULT';
    if (connectionState.isConnected) return 'text-success-DEFAULT';
    if (connectionState.isConfigured) return 'text-warning-DEFAULT';
    return 'text-textAccent';
  };

  const getStatusText = () => {
    if (connectionState.error) return 'Erro na conexão';
    if (connectionState.isConnected) return `Conectado${connectionState.displayName ? ` - ${connectionState.displayName}` : ''}`;
    if (connectionState.isConfigured) return 'Requer autorização';
    return 'Não configurado';
  };

  const getStatusIcon = () => {
    if (connectionState.error) return <FiX className="w-4 h-4" />;
    if (connectionState.isConnected) return <FiCheck className="w-4 h-4" />;
    if (connectionState.isConfigured) return <FiAlertTriangle className="w-4 h-4" />;
    return <FiX className="w-4 h-4" />;
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="text-primary mr-3">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-medium text-textOnSurface">{title}</h3>
            <p className="text-sm text-textAccent">{description}</p>
          </div>
        </div>
        <div className={`flex items-center ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-2 text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      {connectionState.error && (
        <div className="mb-4 p-3 bg-danger-light/10 border border-danger-DEFAULT/20 rounded-lg">
          <p className="text-sm text-danger-DEFAULT">{connectionState.error}</p>
        </div>
      )}

      {connectionState.lastConnected && (
        <div className="mb-4 text-xs text-textAccent">
          Última conexão: {new Date(connectionState.lastConnected).toLocaleString()}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          {(!connectionState.isConnected && !connectionState.isConfigured) && (
            <button
              onClick={onSetup}
              className="px-4 py-2 bg-primary text-textOnPrimary rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Configurar Conexão
            </button>
          )}
          
          {connectionState.isConfigured && !connectionState.isConnected && (
            <button
              onClick={onSetup}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
            >
              Autorizar
            </button>
          )}

          {connectionState.isConnected && (
            <button
              onClick={onSetup}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
            >
              Gerenciar
            </button>
          )}

          {connectionState.canDisconnect && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 border border-danger-DEFAULT text-danger-DEFAULT rounded-lg hover:bg-danger-DEFAULT/10 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
        </div>

        {setupInstructions && (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-3 py-1 text-xs text-textAccent hover:text-textOnSurface transition-colors"
          >
            {showInstructions ? 'Ocultar instruções' : 'Ver instruções'}
          </button>
        )}
      </div>

      {showInstructions && setupInstructions && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium text-textOnSurface mb-3">{setupInstructions.title}</h4>
          <ol className="text-sm text-textAccent space-y-2 pl-4">
            {setupInstructions.steps.map((step, index) => (
              <li key={index}>
                {index + 1}. {step}
                {index === 0 && setupInstructions.externalLink && (
                  <a
                    href={setupInstructions.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center ml-2"
                  >
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;