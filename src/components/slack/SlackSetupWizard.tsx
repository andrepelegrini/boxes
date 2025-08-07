import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import { useSlack } from '../../contexts';
import { SlackOAuthFallback } from './SlackOAuthFallback';
import { Form, ClientIdField, ClientSecretField, validators } from '../../modules/common/components';

interface SlackSetupWizardProps {
  onComplete?: () => void;
  onClose?: () => void;
}

export const SlackSetupWizard: React.FC<SlackSetupWizardProps> = ({ 
  onComplete, 
  onClose 
}) => {
  const { actions, connection } = useSlack();

  const [currentStep, setCurrentStep] = useState(1);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Form data interface for type safety
  interface CredentialsFormData {
    clientId: string;
    clientSecret: string;
  }

  const handleCredentialsSubmit = async (data: CredentialsFormData) => {
    await actions.storeCredentials(data.clientId, data.clientSecret);
    // Move to next step after successful submission
    setTimeout(() => setCurrentStep(2), 1500);
  };

  const handleOAuthStart = async () => {
    try {
      const clientId = connection.state.credentials?.client_id;
      if (!clientId) {
        throw new Error('Client ID não encontrado. Volte ao passo 1.');
      }
      await actions.startOAuth();
    } catch (error) {
      console.error('Erro ao iniciar OAuth:', error);
    }
  };

  const handleManualCode = async (code: string) => {
    try {
      const savedCreds = connection.state.credentials;
      const clientId = savedCreds?.client_id || '';
      const clientSecret = savedCreds?.client_secret || '';
      
      if (!clientId || !clientSecret) {
        throw new Error('Credenciais não encontradas. Por favor, volte ao passo 1.');
      }
      
      await actions.completeOAuth(code, clientId, clientSecret);
      setShowManualAuth(false);
      
      // The useEffect will handle step advancement automatically
    } catch (error) {
      throw error;
    }
  };

  const resetSetup = () => {
    setCurrentStep(1);
    actions.deleteCredentials();
  };

  // Auto-detect existing valid configuration on first load
  useEffect(() => {
    if (initialLoad && connection.state.connectionStatus.hasAccessToken && connection.state.connectionStatus.isConnected) {
      console.log('✅ Slack já está configurado! Pulando para tela de sucesso...');
      setCurrentStep(3);
      setInitialLoad(false);
    } else if (initialLoad && connection.state.connectionStatus.hasCredentials && !connection.state.connectionStatus.hasAccessToken) {
      console.log('⚠️ Credenciais encontradas mas sem token. Redirecionando para autorização...');
      setCurrentStep(2);
      setInitialLoad(false);
    } else if (initialLoad && !connection.state.loading.credentials) {
      console.log('🔧 Nenhuma configuração encontrada. Iniciando setup...');
      setInitialLoad(false);
    }
  }, [initialLoad, connection.state.connectionStatus, connection.state.loading.credentials]);

  // Monitor connection status changes and auto-advance to success step
  useEffect(() => {
    if (currentStep === 2 && connection.state.connectionStatus.hasAccessToken && connection.state.connectionStatus.isConnected) {
      console.log('OAuth successful! Auto-advancing to step 3');
      setTimeout(() => setCurrentStep(3), 1500);
    }
  }, [currentStep, connection.state.connectionStatus.hasAccessToken, connection.state.connectionStatus.isConnected]);

  // Show loading while checking existing credentials
  if (initialLoad && connection.state.loading.credentials) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando configuração existente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configurar Integração Slack
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}>1</div>
          <div className="w-8 h-0.5 bg-gray-200"></div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}>2</div>
          <div className="w-8 h-0.5 bg-gray-200"></div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200'
          }`}>3</div>
        </div>
      </div>

      {/* Step 1: Credentials Setup */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              Passo 1: Criar App Slack
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>
                Acesse{' '}
                <button
                  onClick={() => navigator.clipboard?.writeText('https://api.slack.com/apps')}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                >
                  https://api.slack.com/apps
                  <FiExternalLink className="w-3 h-3 ml-1" />
                </button>
              </li>
              <li>Clique em "Create New App" → "From scratch"</li>
              <li>Digite um nome (ex: "Project Boxes") e selecione seu workspace</li>
              <li>
                No menu lateral, vá em <strong>"OAuth & Permissions"</strong>
              </li>
              <li>
                Em "Redirect URLs", clique em "Add New Redirect URL" e adicione:
                <div className="mt-1 bg-white rounded border p-2 text-xs font-mono">
                  https://localhost:8080/slack/callback
                </div>
                <span className="text-xs text-blue-600">Clique em "Add" e depois "Save URLs"</span>
              </li>
              <li>
                Role para baixo até <strong>"Scopes"</strong> → <strong>"Bot Token Scopes"</strong>:
                <div className="mt-2 space-y-2">
                  <div className="text-xs">
                    <span className="font-medium">a)</span> Clique no botão <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">"Add an OAuth Scope"</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">b)</span> Digite ou selecione cada permissão abaixo (uma por vez):
                  </div>
                  <div className="bg-white rounded border p-2 text-xs font-mono space-y-1">
                    <div>channels:read</div>
                    <div>channels:history</div>
                    <div>groups:read</div>
                    <div>groups:history</div>
                    <div>users:read</div>
                    <div>team:read</div>
                  </div>
                  <div className="text-xs text-blue-600">
                    💡 Dica: Após adicionar cada scope, clique novamente em "Add an OAuth Scope" para adicionar o próximo
                  </div>
                </div>
              </li>
              <li>
                Volte para <strong>"Basic Information"</strong> para copiar suas credenciais
              </li>
            </ol>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-semibold text-yellow-900 text-sm mb-1">
              📌 Dicas Importantes:
            </h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Configure primeiro as Redirect URLs antes dos Scopes</li>
              <li>• Use HTTPS (não HTTP) para localhost: <code className="bg-yellow-100 px-1">https://localhost:8080/slack/callback</code></li>
              <li>• Adicione os scopes em <strong>"Bot Token Scopes"</strong>, não em "User Token Scopes"</li>
              <li>• Clique em "Add an OAuth Scope" para cada permissão - não tente adicionar todas de uma vez</li>
              <li>• Não precisa instalar o app no workspace agora</li>
            </ul>
          </div>

          <Form<CredentialsFormData>
            initialData={{ clientId: '', clientSecret: '' }}
            onSubmit={handleCredentialsSubmit}
            validationRules={[
              validators.required('clientId', 'Client ID é obrigatório'),
              validators.required('clientSecret', 'Client Secret é obrigatório'),
              validators.pattern('clientId', /^\d+\.\d+$/, 'Client ID deve ter formato válido (ex: 123456789.123456789)'),
            ]}
            submitButtonText="Salvar & Continuar"
            submitButtonLoadingText="Validando..."
            cancelButtonText="Cancelar"
            onCancel={onClose}
          >
            {({ data, updateField, errors }) => (
              <>
                <ClientIdField
                  value={data.clientId}
                  onChange={(value) => updateField('clientId', value)}
                  required
                  error={errors.clientId || ''}
                />
                
                <ClientSecretField
                  value={data.clientSecret}
                  onChange={(value) => updateField('clientSecret', value)}
                  required
                  error={errors.clientSecret || ''}
                />
              </>
            )}
          </Form>
        </div>
      )}

      {/* Step 2: OAuth Authorization */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiExternalLink className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Autorizar Acesso ao Slack
            </h3>
            <p className="text-gray-600 mb-4">
              Clique no botão abaixo para autorizar o Project Boxes a acessar seu workspace Slack.
              Uma nova janela do navegador será aberta.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>⚠️ Aviso esperado:</strong> O navegador mostrará um aviso de "conexão não segura" 
                ou "certificado inválido" porque estamos usando HTTPS em localhost. 
                <span className="font-medium">Isso é normal</span> - clique em "Avançar" ou "Aceitar o risco" para continuar.
              </p>
            </div>
          </div>

          {connection.state.oauth.isInProgress && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-yellow-800 font-medium">Aguardando autorização...</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Complete a autorização na janela do navegador que foi aberta
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  🔧 Problemas com a autorização?
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Se você viu "This site can't be reached" após autorizar, o processo funcionou! 
                  O código foi gerado mas o servidor local fechou cedo demais.
                </p>
                <button
                  onClick={() => setShowManualAuth(true)}
                  className="text-sm bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  Inserir código manualmente
                </button>
              </div>
            </div>
          )}

          {connection.state.error.type === 'oauth' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <FiAlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Erro na autorização</p>
                <p className="text-red-700 text-sm">{connection.state.error.message}</p>
              </div>
            </div>
          )}

          {connection.state.connectionStatus.hasAccessToken && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <FiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Autorização concluída!</p>
              <p className="text-green-700 text-sm">
                Conectado ao workspace: <strong>{connection.state.connectionStatus.teamName}</strong>
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            {!connection.state.connectionStatus.hasAccessToken && (
              <button
                onClick={handleOAuthStart}
                disabled={connection.state.oauth.isInProgress}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
              >
                {connection.state.oauth.isInProgress ? 'Aguardando...' : 'Autorizar no Slack'}
              </button>
            )}
            
            {connection.state.connectionStatus.hasAccessToken && (
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Concluir Configuração
              </button>
            )}

            <button
              onClick={resetSetup}
              className="px-4 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Recomeçar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 3 && (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <FiCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Integração Slack Configurada!
            </h3>
            <p className="text-gray-600 mb-2">
              {connection.state.connectionStatus.teamName && (
                <>Conectado ao workspace <strong>{connection.state.connectionStatus.teamName}</strong>. </>
              )}
              Agora você pode conectar seus projetos a canais específicos do Slack e usar a análise AI
              para gerar tarefas automaticamente a partir das conversas.
            </p>
            {initialLoad && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <p className="text-green-800 text-sm font-medium">
                  ✅ Suas credenciais foram carregadas automaticamente!
                </p>
                <p className="text-green-700 text-xs mt-1">
                  Não é mais necessário configurar novamente a cada execução.
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">Próximos passos:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Vá até qualquer projeto e procure a seção "Slack"</li>
              <li>Conecte o projeto a canais específicos do seu workspace</li>
              <li>Configure a frequência de sincronização</li>
              <li>Aguarde as sugestões de tarefas baseadas nas conversas!</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onComplete}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Ir para Projetos
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Authorization Modal */}
      {showManualAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <SlackOAuthFallback
              onCodeSubmit={handleManualCode}
              onClose={() => setShowManualAuth(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};