import React, { useState, useEffect } from 'react';
import { 
  FiSlack, 
  FiLink, 
  FiXCircle, 
  FiRefreshCw, 
  FiX, 
  FiAlertCircle,
  FiExternalLink
} from 'react-icons/fi';
import { useSlackConnection } from '../../hooks/useSlackConnection';

/**
 * Props for the SlackConnectionWidget component.
 */
interface SlackConnectionWidgetProps {
  /** ID of the project to connect with Slack channels */
  projectId: string;
  /** Optional callback triggered when manual sync is initiated */
  onSyncTriggered?: () => void;
}

/**
 * SlackConnectionWidget - Main interface for managing Slack workspace connections.
 * 
 * This component provides a comprehensive interface for:
 * - Connecting to Slack workspaces via OAuth 2.0
 * - Managing project-to-channel connections
 * - Configuring sync frequencies and settings
 * - Triggering manual synchronization
 * - Displaying connection status and error states
 * 
 * The widget adapts its interface based on connection state:
 * - Shows connection button when not connected
 * - Displays channel management when connected
 * - Provides sync controls for active connections
 * 
 * @param props - Component props
 * @param props.projectId - ID of the project to manage Slack connections for
 * @param props.onSyncTriggered - Optional callback when sync is manually triggered
 * 
 * @example
 * ```tsx
 * <SlackConnectionWidget 
 *   projectId={currentProject.id}
 *   onSyncTriggered={() => {
 *     console.log('Sync triggered for project');
 *     // Optionally refresh task list or show notification
 *   }}
 * />
 * ```
 */
const SlackConnectionWidget: React.FC<SlackConnectionWidgetProps> = ({ 
  projectId, 
  onSyncTriggered 
}) => {
  const { state: connectionState, actions: connectionActions, status: _status } = useSlackConnection();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [showManualCodeEntry, setShowManualCodeEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [syncSettings, setSyncSettings] = useState({
    syncEnabled: true,
    syncFrequency: 'hourly' as const,
  });

  const [isProjectConnected, setIsProjectConnected] = useState(false);

  useEffect(() => {
    const checkProjectConnection = async () => {
      if (connectionState.isConnected) {
        const connections = await connectionActions.getConnectionsForProject(projectId);
        setIsProjectConnected(connections.length > 0);
      }
    };
    checkProjectConnection();
  }, [projectId, connectionState.isConnected, connectionActions]);

  // Load project sync data and channels on mount
  useEffect(() => {
    if (connectionState.isConnected) {
      if (connectionState.channels.length === 0) {
        connectionActions.loadChannels();
      }
      // Removed auto-open of channel selector to prevent user being trapped
      // Users can manually click "Conectar Canal" button when they want to connect
    }
  }, [projectId, connectionState.isConnected, connectionActions]);

  // Add escape key handler for modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showChannelSelector) {
          setShowChannelSelector(false);
        }
        if (showManualCodeEntry) {
          setShowManualCodeEntry(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showChannelSelector, showManualCodeEntry]);

  const handleConnectSlack = async () => {
    try {
      setIsConnecting(true);
      if (!connectionState.isConnected) {
        await connectionActions.authenticate();
        // Show manual code entry after OAuth URL is opened
        setShowManualCodeEntry(true);
      } else {
        await connectionActions.loadChannels();
        setShowChannelSelector(true);
      }
    } catch (error) {
      console.error('Erro ao conectar Slack:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim()) return;
    
    try {
      setIsConnecting(true);
      await connectionActions.completeOAuth(manualCode.trim());
      setShowManualCodeEntry(false);
      setManualCode('');
    } catch (error) {
      console.error('Erro ao processar código:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleChannelConnect = async () => {
    if (!selectedChannel) return;
    
    try {
      setIsConnecting(true);
      const channel = connectionState.channels.find((c: any) => c.id === selectedChannel);
      if (channel) {
        await connectionActions.connectChannel(channel.id);
        setShowChannelSelector(false);
        setSelectedChannel('');
      }
    } catch (error) {
      console.error('Erro ao conectar canal:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      // TODO: Implement trigger sync functionality
      console.log('Triggering sync for project:', projectId);
      onSyncTriggered?.();
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  };

  if (connectionState.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <FiAlertCircle />
          <span className="font-medium">Erro no Slack</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{connectionState.error}</p>
        <button
          onClick={() => connectionActions.getStatus()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }


  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiSlack className="text-purple-500" size={20} />
          <h3 className="font-medium text-textOnSurface">Integração Slack</h3>
        </div>
        
        {isProjectConnected && (
          <button
            onClick={handleTriggerSync}
            disabled={connectionState.isLoading}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={connectionState.isLoading ? 'animate-spin' : ''} size={14} />
            Sincronizar
          </button>
        )}
      </div>

      {!connectionState.isConnected ? (
        <div className="text-center py-4">
          <p className="text-textAccent text-sm mb-3">
            Conecte-se ao Slack para sincronizar mensagens e gerar tarefas automaticamente
          </p>
          <button
            onClick={handleConnectSlack}
            disabled={isConnecting}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
          >
            <FiSlack />
            {isConnecting ? 'Abrindo navegador...' : 'Conectar ao Slack'}
          </button>
          {connectionState.error && typeof connectionState.error === 'string' && (connectionState.error as string).indexOf('Navegador aberto') !== -1 && (
            <p className="text-sm text-blue-600 mt-2">
              {connectionState.error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-textAccent">
              Conectado como: {connectionState.teamName}
            </span>
            <button
              onClick={connectionActions.disconnect}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <FiXCircle size={14} />
            </button>
          </div>

          {!isProjectConnected ? (
            <div className="text-center py-4 border-2 border-dashed border-border rounded-lg">
              <p className="text-textAccent text-sm mb-3">
                Este projeto ainda não está conectado a nenhum canal
              </p>
              <button
                onClick={() => setShowChannelSelector(true)}
                className="flex items-center gap-2 mx-auto px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md transition-colors"
              >
                <FiLink />
                Conectar Canal
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-textAccent">
                Funcionalidade de sincronização em desenvolvimento.
              </p>
              
              <button
                onClick={() => setShowChannelSelector(true)}
                className="w-full p-2 border-2 border-dashed border-border hover:border-purple-300 rounded-md text-textAccent hover:text-purple-600 transition-colors text-sm"
              >
                + Conectar canal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Channel Selector Modal */}
      {showChannelSelector && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowChannelSelector(false);
            }
          }}
        >
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-medium text-textOnSurface">Selecionar Canal</h3>
              <button
                onClick={() => setShowChannelSelector(false)}
                className="text-textAccent hover:text-textOnSurface transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-textOnSurface mb-2">
                  Canal do Slack
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-textOnSurface focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione um canal...</option>
                  {connectionState.channels.length === 0 && (
                    <option value="" disabled>Nenhum canal encontrado - verifique a conexão</option>
                  )}
                  {connectionState.channels
                    .filter(channel => channel.is_member)
                    .map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name} {channel.isPrivate ? '(privado)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-textOnSurface">
                  Frequência de Sincronização
                </label>
                
                <div className="space-y-2">
                  {[
                    { value: 'realtime', label: 'Tempo real (instantâneo)', desc: 'Sincronização imediata quando há novas mensagens' },
                    { value: 'hourly', label: 'A cada hora', desc: 'Recomendado para a maioria dos projetos' },
                    { value: 'daily', label: 'Diariamente', desc: 'Para projetos com menor atividade' },
                    { value: 'manual', label: 'Manual', desc: 'Sincronização apenas quando solicitada' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="syncFrequency"
                        value={option.value}
                        checked={syncSettings.syncFrequency === option.value}
                        onChange={(e) => setSyncSettings(prev => ({ ...prev, syncFrequency: e.target.value as any }))}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-textOnSurface">{option.label}</div>
                        <div className="text-xs text-textAccent">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowChannelSelector(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-textAccent hover:bg-secondary-light transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChannelConnect}
                  disabled={!selectedChannel || isConnecting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Code Entry Modal */}
      {showManualCodeEntry && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowManualCodeEntry(false);
            }
          }}
        >
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="font-medium text-textOnSurface">Código de Autorização Slack</h3>
              <button
                onClick={() => setShowManualCodeEntry(false)}
                className="text-textAccent hover:text-textOnSurface transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-sm text-textAccent space-y-2">
                <p>O navegador foi aberto com a página de autorização do Slack.</p>
                <p>Após autorizar o app:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>A página tentará redirecionar para <code className="bg-secondary-light px-1 py-0.5 rounded text-xs">https://localhost:8080/slack/callback</code></li>
                  <li>Isso pode falhar (página não carrega), mas o <strong>código estará na URL</strong></li>
                  <li>Copie o valor do parâmetro <code className="bg-secondary-light px-1 py-0.5 rounded text-xs">code=</code> da URL</li>
                  <li>Cole o código abaixo</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-textOnSurface mb-2">
                  Código de Autorização
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Cole o código aqui..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-textOnSurface focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-textAccent mt-1">
                  O código deve começar com algo como: <code>4/0-...</code>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowManualCodeEntry(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-textAccent hover:bg-secondary-light transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleManualCodeSubmit}
                  disabled={!manualCode.trim() || isConnecting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {connectionState.isConnected && (
        <div className="text-xs text-textAccent border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <FiExternalLink size={12} />
            <span>
              Gerencie permissões e configurações no{' '}
              <a 
                href="https://slack.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 underline"
              >
                painel do Slack
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlackConnectionWidget;