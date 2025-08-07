import React, { useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiExternalLink, FiCopy, FiInfo } from 'react-icons/fi';

interface SlackOAuthSetupGuideProps {
  onClose: () => void;
}

const SlackOAuthSetupGuide: React.FC<SlackOAuthSetupGuideProps> = ({ onClose }) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const redirectUrl = "https://localhost:3003/api/oauth/slack/callback";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto min-h-0 max-h-[80vh]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-textOnSurface mb-2">
                🔧 Configuração do Slack OAuth
              </h2>
              <p className="text-textAccent text-sm">
                Configure sua aplicação Slack para integração com o Gestor de Caixas
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-textAccent hover:text-textOnSurface p-1 rounded"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Step 1: Create Slack App */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-textOnSurface mb-3 flex items-center">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">1</span>
                Criar Aplicação Slack
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-textAccent">
                  Acesse o console de desenvolvimento do Slack e crie uma nova aplicação:
                </p>
                <a
                  href="https://api.slack.com/apps/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg transition-colors"
                >
                  <FiExternalLink className="mr-2" />
                  Criar App no Slack
                </a>
                <ul className="list-disc list-inside text-textAccent space-y-1 ml-4">
                  <li>Escolha "From scratch"</li>
                  <li>Nome: "Gestor de Caixas" (ou nome de sua preferência)</li>
                  <li>Selecione seu workspace</li>
                </ul>
              </div>
            </div>

            {/* Step 2: Configure OAuth */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-textOnSurface mb-3 flex items-center">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">2</span>
                Configurar OAuth & Permissions
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-textAccent">
                  Na sua aplicação Slack, vá para "OAuth & Permissions" e adicione a URL de redirecionamento:
                </p>
                <div className="bg-background border border-border rounded-lg p-3 flex items-center justify-between">
                  <code className="text-primary font-mono text-sm flex-1">{redirectUrl}</code>
                  <button
                    onClick={() => copyToClipboard(redirectUrl, 2)}
                    className="ml-3 p-2 text-textAccent hover:text-primary transition-colors"
                    title="Copiar URL"
                  >
                    {copiedStep === 2 ? <FiCheckCircle className="text-green-500" /> : <FiCopy />}
                  </button>
                </div>
                <div className="bg-warning-DEFAULT/10 border border-warning-DEFAULT/30 rounded-lg p-3">
                  <div className="flex items-start">
                    <FiAlertTriangle className="text-warning-DEFAULT mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-warning-text text-sm">Importante:</p>
                      <p className="text-textAccent text-sm">
                        Use exatamente esta URL: <strong>https://localhost:3003/api/oauth/slack/callback</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Get Credentials */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-textOnSurface mb-3 flex items-center">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
                Obter Credenciais
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-textAccent">
                  Na seção "Basic Information" da sua app, copie:
                </p>
                <ul className="list-disc list-inside text-textAccent space-y-1 ml-4">
                  <li><strong>Client ID</strong> - Identificador público da aplicação</li>
                  <li><strong>Client Secret</strong> - Chave secreta (mantenha segura)</li>
                </ul>
              </div>
            </div>

            {/* Step 4: Certificate Warning */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-textOnSurface mb-3 flex items-center">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">4</span>
                Aceitar Certificado (Apenas na Primeira Vez)
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-info-DEFAULT/10 border border-info-DEFAULT/30 rounded-lg p-3">
                  <div className="flex items-start">
                    <FiInfo className="text-info-DEFAULT mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-info-text text-sm mb-1">Aviso de Segurança Esperado</p>
                      <p className="text-textAccent text-sm">
                        Na primeira conexão, seu navegador mostrará um aviso sobre certificado não confiável.
                        Isso é normal para aplicações desktop. Clique em "Avançado" → "Continuar para localhost".
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-textAccent">
                  Este aviso aparece apenas uma vez. Após aceitar, todas as futuras conexões funcionarão automaticamente.
                </p>
              </div>
            </div>

            {/* Step 5: Test Connection */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-textOnSurface mb-3 flex items-center">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">5</span>
                Testar Conexão
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-textAccent">
                  Após configurar tudo:
                </p>
                <ul className="list-disc list-inside text-textAccent space-y-1 ml-4">
                  <li>Cole as credenciais nas Configurações do app</li>
                  <li>Clique em "Conectar ao Slack"</li>
                  <li>Aceite o aviso de certificado (se aparecer)</li>
                  <li>Complete o processo de autorização no Slack</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary-dark text-textOnPrimary px-6 py-2 rounded-lg transition-colors"
            >
              Entendi, vamos começar!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlackOAuthSetupGuide;