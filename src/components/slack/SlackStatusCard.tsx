import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSettings, 
  FiSlack, 
  FiZap, 
  FiExternalLink,
  FiRefreshCw,
  FiUsers,
  FiMessageSquare
} from 'react-icons/fi';
import { useSlack } from '../../contexts';
import { SlackSetupWizard } from './SlackSetupWizard';

interface SlackStatusCardProps {
  className?: string;
  projectChannelCount?: number;
  lastSyncTime?: string;
  isSyncing?: boolean;
  onOpenSettings?: () => void;
  onOpenChannels?: () => void;
  onSyncNow?: () => Promise<void>;
  onReconnect?: () => Promise<void>;
  onForceReanalysis?: () => Promise<void>;
}

export const SlackStatusCard: React.FC<SlackStatusCardProps> = ({ 
  className = '',
}) => {
  const slack = useSlack();
  const { actions: slackActions, isConnected: _isConnected, isConfigured } = slack;

  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const result = await slackActions.getStatus();
      // Handle ServiceResult object properly
      if (typeof result === 'object' && result !== null) {
        if ('success' in result) {
          setTestResult(result.success ? 'Conexão bem-sucedida!' : (result.error || 'Erro no teste'));
        } else {
          setTestResult(String(result));
        }
      } else {
        setTestResult(String(result));
      }
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : 'Erro no teste');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Tem certeza que deseja desconectar o Slack? Isso removerá todas as configurações.')) {
      try {
        await slackActions.disconnect();
        setTestResult(null);
      } catch (error) {
        console.error('Erro ao desconectar:', error);
      }
    }
  };

  if (showSetupWizard) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full flex flex-col">
          <SlackSetupWizard
            onComplete={() => setShowSetupWizard(false)}
            onClose={() => setShowSetupWizard(false)}
          />
        </div>
      </div>
    );
  }

  // Not configured state
  if (!isConfigured) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <FiSlack className="w-6 h-6 text-purple-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Integração Slack
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Conecte seus projetos aos canais do Slack para análise AI automática e geração de tarefas 
              baseada nas conversas da equipe.
            </p>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <FiMessageSquare className="w-4 h-4" />
                <span>Análise de mensagens</span>
              </div>
              <div className="flex items-center space-x-1">
                <FiZap className="w-4 h-4" />
                <span>Tarefas automáticas</span>
              </div>
              <div className="flex items-center space-x-1">
                <FiUsers className="w-4 h-4" />
                <span>Colaboração em equipe</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowSetupWizard(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 transition-colors"
            >
              Configurar Slack
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Configured but not authorized state
  if (isConfigured && !slack.state.connectionStatus.hasAccessToken) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <FiAlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Autorização Pendente
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              As credenciais do Slack foram configuradas, mas você ainda precisa autorizar o acesso 
              ao seu workspace.
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSetupWizard(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Autorizar Acesso
              </button>
              <button
                onClick={() => setShowSetupWizard(true)}
                className="text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Reconfigurar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fully configured and authorized state
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <FiCheckCircle className="w-6 h-6 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Slack Conectado
            </h3>
            <p className="text-gray-600 text-sm">
              Workspace: <strong>{slack.state.connectionStatus.teamName}</strong>
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSetupWizard(true)}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Configurações"
        >
          <FiSettings className="w-5 h-5" />
        </button>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Conexão Ativa</span>
          </div>
          
          <button
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 flex items-center space-x-1"
          >
            <FiRefreshCw className={`w-4 h-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>Testar</span>
          </button>
        </div>
        
        {testResult && (
          <div className="mt-2 text-xs text-gray-600 bg-white rounded p-2 border">
            {testResult}
          </div>
        )}
      </div>

      {/* Channels Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>Canais disponíveis: {slack.state.channels.length}</span>
        <button
          onClick={slackActions.loadChannels}
          disabled={slack.state.loading.channels}
          className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          {slack.state.loading.channels ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => window.open('https://api.slack.com/apps', '_blank')}
          className="flex items-center justify-center space-x-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm"
        >
          <FiExternalLink className="w-4 h-4" />
          <span>Gerenciar App</span>
        </button>
        
        <button
          onClick={handleDisconnect}
          className="flex items-center justify-center space-x-2 p-3 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-sm text-red-600 hover:text-red-700"
        >
          <FiAlertCircle className="w-4 h-4" />
          <span>Desconectar</span>
        </button>
      </div>
    </div>
  );
};