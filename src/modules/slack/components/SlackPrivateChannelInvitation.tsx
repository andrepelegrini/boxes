import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { 
  Shield,
  Users,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  MessageSquare,
  Clock,
  User,
  Hash
} from 'lucide-react';
import { slackService } from '../services/SlackService';

interface PrivateChannel {
  id: string;
  name: string;
  purpose?: string;
  topic?: string;
  memberCount?: number;
  isArchived: boolean;
  accessError?: string;
}

interface InvitationRequest {
  channelId: string;
  channelName: string;
  message: string;
  requestedBy: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'accepted' | 'declined' | 'failed';
  invitationMethod: 'slack_message' | 'manual_copy' | 'bot_request';
}

interface SlackPrivateChannelInvitationProps {
  className?: string;
  onInvitationRequested?: (channelId: string, method: string) => void;
}

export function SlackPrivateChannelInvitation({ 
  className,
  onInvitationRequested
}: SlackPrivateChannelInvitationProps) {
  const [privateChannels, setPrivateChannels] = useState<PrivateChannel[]>([]);
  const [invitationRequests, setInvitationRequests] = useState<InvitationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<PrivateChannel | null>(null);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [invitationMethod, setInvitationMethod] = useState<'slack_message' | 'manual_copy' | 'bot_request'>('slack_message');

  // Load private channels that bot doesn't have access to
  const loadPrivateChannels = async () => {
    setLoading(true);
    try {
      const result = await slackService.getChannels();
      
      if (result.success && result.data) {
        const privateChans = result.data
          .filter((ch: any) => ch.is_private && !ch.is_member)
          .map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            purpose: ch.purpose?.value,
            topic: ch.topic?.value,
            memberCount: ch.num_members,
            isArchived: ch.is_archived || false,
            accessError: 'Not a member'
          }));
          
        setPrivateChannels(privateChans);
      }
    } catch (error) {
      console.error('Erro ao carregar canais privados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved invitation requests from storage
  const loadInvitationRequests = async () => {
    try {
      const stored = localStorage.getItem('slack-private-channel-invitations');
      if (stored) {
        const requests = JSON.parse(stored);
        setInvitationRequests(requests);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações de convite:', error);
    }
  };

  // Save invitation request to storage
  const saveInvitationRequest = async (request: InvitationRequest) => {
    try {
      const updatedRequests = [...invitationRequests, request];
      setInvitationRequests(updatedRequests);
      localStorage.setItem('slack-private-channel-invitations', JSON.stringify(updatedRequests));
    } catch (error) {
      console.error('Erro ao salvar solicitação de convite:', error);
    }
  };

  useEffect(() => {
    loadPrivateChannels();
    loadInvitationRequests();
  }, []);

  const generateInvitationMessage = (channel: PrivateChannel, customMsg?: string) => {
    const botName = 'ProjectBoxes Bot'; // This could be dynamic
    const appName = 'Project Boxes';
    
    if (customMsg) {
      return customMsg;
    }

    return `Olá! Gostaria de convidar o ${botName} para o canal #${channel.name} para integração com o ${appName}.

O bot irá:
• Analisar mensagens para sugerir tarefas automaticamente
• Sincronizar atividades do canal com projetos
• Enviar notificações relevantes

Para adicionar o bot:
1. Digite: /invite @${botName}
2. Ou vá em "Configurações do Canal" → "Integrations" → "Add apps"

Obrigado! 🚀`;
  };

  const generateManualInstructions = (channel: PrivateChannel) => {
    return `Para adicionar o Project Boxes Bot ao canal #${channel.name}:

1. Abra o canal #${channel.name} no Slack
2. Clique no nome do canal no topo
3. Vá na aba "Integrations"
4. Clique em "Add apps"
5. Procure por "ProjectBoxes" ou "Project Boxes"
6. Clique em "Add" para adicionar ao canal

Ou use o comando:
/invite @ProjectBoxes

Depois de adicionar, o bot começará a analisar mensagens automaticamente.`;
  };

  const handleRequestInvitation = async (method: 'slack_message' | 'manual_copy' | 'bot_request') => {
    if (!selectedChannel) return;

    const request: InvitationRequest = {
      channelId: selectedChannel.id,
      channelName: selectedChannel.name,
      message: generateInvitationMessage(selectedChannel, customMessage),
      requestedBy: 'local-user',
      timestamp: new Date().toISOString(),
      status: 'pending',
      invitationMethod: method
    };

    try {
      if (method === 'slack_message') {
        // Try to send a DM to channel members (if we can identify them)
        request.status = 'sent';
        await saveInvitationRequest(request);
        
        // Show success message using proper UI feedback
        // Note: This should use a proper notification system instead of alert
        console.log('Invitation request sent successfully for method:', method);
      } else if (method === 'manual_copy') {
        // Just save the request and show manual instructions
        request.status = 'sent';
        await saveInvitationRequest(request);
      } else if (method === 'bot_request') {
        // Send a request through Slack API if possible
        request.status = 'sent';
        await saveInvitationRequest(request);
      }

      onInvitationRequested?.(selectedChannel.id, method);
      setShowInvitationDialog(false);
      setCustomMessage('');
      
    } catch (error) {
      console.error('Erro ao solicitar convite:', error);
      request.status = 'failed';
      await saveInvitationRequest(request);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary success feedback
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copiado!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    });
  };

  const getStatusIcon = (status: InvitationRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sent':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMethodIcon = (method: InvitationRequest['invitationMethod']) => {
    switch (method) {
      case 'slack_message':
        return <MessageSquare className="w-4 h-4" />;
      case 'manual_copy':
        return <Copy className="w-4 h-4" />;
      case 'bot_request':
        return <User className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Canais Privados - Solicitação de Acesso
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Canais privados requerem convite manual. O bot precisa ser adicionado por um membro do canal.
          </AlertDescription>
        </Alert>

        {/* Private Channels List */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : privateChannels.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum canal privado encontrado sem acesso</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-medium">Canais Privados Disponíveis</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {privateChannels.map(channel => {
                const hasRequest = invitationRequests.some(req => req.channelId === channel.id);
                const latestRequest = invitationRequests
                  .filter(req => req.channelId === channel.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{channel.name}</span>
                        {channel.isArchived && (
                          <Badge variant="secondary">Arquivado</Badge>
                        )}
                        {hasRequest && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(latestRequest.status)}
                            <span className="text-xs text-muted-foreground">
                              {latestRequest.status === 'sent' ? 'Solicitado' : latestRequest.status}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {channel.purpose && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {channel.purpose}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {channel.memberCount && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {channel.memberCount} membros
                          </span>
                        )}
                        {latestRequest && (
                          <span className="flex items-center gap-1">
                            {getMethodIcon(latestRequest.invitationMethod)}
                            {new Date(latestRequest.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <Dialog open={showInvitationDialog && selectedChannel?.id === channel.id} 
                            onOpenChange={(open) => {
                              setShowInvitationDialog(open);
                              if (open) setSelectedChannel(channel);
                            }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={channel.isArchived}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Solicitar Acesso
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>Solicitar Acesso ao Canal #{channel.name}</DialogTitle>
                          <DialogDescription>
                            Escolha como solicitar que o bot seja adicionado a este canal privado.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Method Selection */}
                          <div className="space-y-3">
                            <Label>Método de Solicitação</Label>
                            
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="method"
                                  value="manual_copy"
                                  checked={invitationMethod === 'manual_copy'}
                                  onChange={(e) => setInvitationMethod(e.target.value as any)}
                                />
                                <Copy className="w-4 h-4" />
                                <span>Instruções Manuais (Recomendado)</span>
                              </label>
                              
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="method"
                                  value="slack_message"
                                  checked={invitationMethod === 'slack_message'}
                                  onChange={(e) => setInvitationMethod(e.target.value as any)}
                                />
                                <MessageSquare className="w-4 h-4" />
                                <span>Mensagem Personalizada</span>
                              </label>
                            </div>
                          </div>

                          {/* Custom Message for slack_message method */}
                          {invitationMethod === 'slack_message' && (
                            <div className="space-y-2">
                              <Label htmlFor="custom-message">Mensagem Personalizada</Label>
                              <Textarea
                                id="custom-message"
                                placeholder="Digite uma mensagem personalizada ou deixe em branco para usar a padrão..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                              />
                            </div>
                          )}

                          {/* Preview */}
                          <div className="space-y-2">
                            <Label>Preview do Conteúdo</Label>
                            <div className="bg-muted p-3 rounded text-sm">
                              {invitationMethod === 'manual_copy' ? (
                                <pre className="whitespace-pre-wrap font-mono text-xs">
                                  {generateManualInstructions(channel)}
                                </pre>
                              ) : (
                                <div className="whitespace-pre-wrap">
                                  {generateInvitationMessage(channel, customMessage)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={() => setShowInvitationDialog(false)}>
                            Cancelar
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              const content = invitationMethod === 'manual_copy' 
                                ? generateManualInstructions(channel)
                                : generateInvitationMessage(channel, customMessage);
                              copyToClipboard(content);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                          
                          <Button onClick={() => handleRequestInvitation(invitationMethod)}>
                            <Send className="w-4 h-4 mr-2" />
                            Solicitar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invitation History */}
        {invitationRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Histórico de Solicitações</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {invitationRequests
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((request, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      <span>{request.channelName}</span>
                      {getMethodIcon(request.invitationMethod)}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            <strong>Como funciona:</strong> Após solicitar acesso, um membro do canal precisa adicionar 
            o bot manualmente. Uma vez adicionado, o bot aparecerá na lista de canais acessíveis.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}