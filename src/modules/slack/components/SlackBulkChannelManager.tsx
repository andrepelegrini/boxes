import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Shield,
  ExternalLink 
} from 'lucide-react';
import { slackService } from '../services/SlackService';
import { SlackPrivateChannelInvitation } from './SlackPrivateChannelInvitation';

interface ChannelStatus {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  hasAccess: boolean;
  accessError?: string;
  joinAttempted?: boolean;
  joinSuccess?: boolean;
  joinError?: string;
}

interface SlackBulkChannelManagerProps {
  onChannelAccessChange?: (accessibleChannels: any[]) => void;
  className?: string;
}

export function SlackBulkChannelManager({ 
  onChannelAccessChange,
  className = '' 
}: SlackBulkChannelManagerProps) {
  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkJoining, setBulkJoining] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const loadChannelStatus = async () => {
    setLoading(true);
    try {
      const result = await slackService.getChannels();
      
      if (result.success && result.data) {
        const allChannels = result.data.map((ch: any) => ({
          ...ch,
          hasAccess: ch.is_member,
          accessError: ch.is_member ? undefined : 'Not a member'
        }));
        
        setChannels(allChannels);
        
        if (onChannelAccessChange) {
          onChannelAccessChange(allChannels.filter((ch: any) => ch.hasAccess));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status dos canais:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannelStatus();
  }, []);

  const handleChannelSelect = (channelId: string, selected: boolean) => {
    const newSelected = new Set(selectedChannels);
    if (selected) {
      newSelected.add(channelId);
    } else {
      newSelected.delete(channelId);
    }
    setSelectedChannels(newSelected);
  };

  const handleSelectAll = (type: 'accessible' | 'inaccessible' | 'public') => {
    const newSelected = new Set(selectedChannels);
    
    channels.forEach(channel => {
      const shouldSelect = 
        (type === 'accessible' && channel.hasAccess) ||
        (type === 'inaccessible' && !channel.hasAccess) ||
        (type === 'public' && !channel.is_private && !channel.hasAccess);
      
      if (shouldSelect) {
        newSelected.add(channel.id);
      }
    });
    
    setSelectedChannels(newSelected);
  };

  const handleBulkJoin = async () => {
    setBulkJoining(true);
    const selectedList = Array.from(selectedChannels);
    
    for (const channelId of selectedList) {
      try {
        setChannels(prev => prev.map(ch => 
          ch.id === channelId 
            ? { ...ch, joinAttempted: true, joinSuccess: false, joinError: '' }
            : ch
        ));
        
        const result = await slackService.joinChannel(channelId);
        
        setChannels(prev => prev.map(ch => 
          ch.id === channelId 
            ? { 
                ...ch, 
                joinSuccess: result.success,
                joinError: result.success ? '' : result.error,
                hasAccess: result.success ? true : ch.hasAccess
              }
            : ch
        ));
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        setChannels(prev => prev.map(ch => 
          ch.id === channelId 
            ? { 
                ...ch, 
                joinSuccess: false,
                joinError: error instanceof Error ? error.message : String(error)
              }
            : ch
        ));
      }
    }
    
    setBulkJoining(false);
    setSelectedChannels(new Set());
    
    // Reload accessible channels after bulk join
    setTimeout(() => {
      loadChannelStatus();
    }, 1000);
  };

  const accessibleChannels = channels.filter(ch => ch.hasAccess);
  const inaccessibleChannels = channels.filter(ch => !ch.hasAccess);
  const publicInaccessibleChannels = inaccessibleChannels.filter(ch => !ch.is_private);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gerenciador de Canais Slack</span>
          <Button
            onClick={loadChannelStatus}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{accessibleChannels.length}</div>
            <div className="text-sm text-gray-600">Acessíveis</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">{publicInaccessibleChannels.length}</div>
            <div className="text-sm text-gray-600">Públicos sem acesso</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">{inaccessibleChannels.filter(ch => ch.is_private).length}</div>
            <div className="text-sm text-gray-600">Privados</div>
          </div>
        </div>

        {/* Enhanced Bulk Actions */}
        {publicInaccessibleChannels.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Ações em Lote</h4>
              <Badge variant="secondary">
                {selectedChannels.size} selecionado{selectedChannels.size !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleSelectAll('public')}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Selecionar Todos Públicos
              </Button>
              <Button
                onClick={() => {
                  const activePublicChannels = publicInaccessibleChannels.filter(ch => !ch.is_archived);
                  const newSelected = new Set(selectedChannels);
                  activePublicChannels.forEach(ch => newSelected.add(ch.id));
                  setSelectedChannels(newSelected);
                }}
                variant="outline"
                size="sm"
              >
                <Users className="w-4 h-4 mr-1" />
                Só Ativos
              </Button>
              <Button
                onClick={() => setSelectedChannels(new Set())}
                variant="outline"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Limpar Seleção
              </Button>
            </div>
            
            {selectedChannels.size > 0 && (
              <div className="space-y-2">
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{selectedChannels.size} canal{selectedChannels.size !== 1 ? 'is' : ''} selecionado{selectedChannels.size !== 1 ? 's' : ''}:</strong> 
                    {' '}O bot tentará entrar automaticamente. Canais arquivados podem falhar.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={handleBulkJoin}
                  disabled={bulkJoining}
                  className="w-full"
                  size="lg"
                >
                  {bulkJoining ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Entrando em {selectedChannels.size} canais... ({channels.filter(ch => ch.joinAttempted && ch.joinSuccess === undefined).length} pendentes)
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Entrar em {selectedChannels.size} canais selecionados
                    </>
                  )}
                </Button>
                
                {bulkJoining && (
                  <div className="text-sm text-muted-foreground text-center">
                    <p>Progresso: {channels.filter(ch => ch.joinAttempted).length} / {selectedChannels.size}</p>
                    <p className="text-xs mt-1">
                      ✅ {channels.filter(ch => ch.joinSuccess === true).length} sucessos • 
                      ❌ {channels.filter(ch => ch.joinSuccess === false).length} falhas • 
                      ⏳ {channels.filter(ch => ch.joinAttempted && ch.joinSuccess === undefined).length} processando
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Channel Lists */}
        {inaccessibleChannels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Canais sem acesso</h4>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Público
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Privado
                </span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {inaccessibleChannels.map(channel => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    channel.is_private 
                      ? 'bg-red-50 border-red-200' 
                      : selectedChannels.has(channel.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                  } ${
                    channel.joinAttempted && channel.joinSuccess === true 
                      ? 'bg-green-50 border-green-200' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {!channel.is_private && (
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(channel.id)}
                        onChange={(e) => handleChannelSelect(channel.id, e.target.checked)}
                        disabled={bulkJoining || channel.is_archived}
                        className="rounded border-gray-300"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">#{channel.name}</span>
                        {channel.is_private && <Shield className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        {channel.is_archived && <Badge variant="secondary" className="text-xs">Arquivado</Badge>}
                      </div>
                      
                      {channel.accessError && (
                        <p className="text-xs text-red-600 truncate">
                          {channel.accessError}
                        </p>
                      )}
                      
                      {channel.joinError && (
                        <p className="text-xs text-red-600 truncate">
                          Erro: {channel.joinError}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {channel.joinAttempted && (
                      <div className="flex items-center gap-1">
                        {channel.joinSuccess === true && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600">Sucesso</span>
                          </>
                        )}
                        {channel.joinSuccess === false && (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600">Falhou</span>
                          </>
                        )}
                        {channel.joinSuccess === undefined && (
                          <>
                            <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                            <span className="text-xs text-blue-600">Processando</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {!channel.joinAttempted && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          channel.is_private 
                            ? 'border-red-300 text-red-700' 
                            : 'border-orange-300 text-orange-700'
                        }`}
                      >
                        {channel.is_private ? 'Convite manual' : 'Auto-join disponível'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accessibleChannels.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-700">Canais com acesso ✅</h4>
            <div className="text-sm text-gray-600">
              {accessibleChannels.length} canais acessíveis e prontos para análise de IA
            </div>
          </div>
        )}

        {/* Private Channel Invitation Section */}
        {inaccessibleChannels.some(ch => ch.is_private) && (
          <div className="mt-6">
            <SlackPrivateChannelInvitation 
              onInvitationRequested={(channelId, method) => {
                console.log(`Invitation requested for ${channelId} via ${method}`);
                // Optionally refresh channel status after some delay
                setTimeout(() => {
                  loadChannelStatus();
                }, 2000);
              }}
            />
          </div>
        )}

        {/* Help Text */}
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            <strong>Dica:</strong> Canais públicos podem ser acessados automaticamente. 
            Para canais privados, use o sistema de solicitação de acesso acima.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default SlackBulkChannelManager;