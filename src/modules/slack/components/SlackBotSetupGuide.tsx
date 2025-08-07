import { FiAlertTriangle, FiCheckCircle, FiCopy, FiExternalLink, FiUser, FiHash, FiSettings } from 'react-icons/fi';

interface SlackBotSetupGuideProps {
  onClose?: () => void;
  compact?: boolean;
}

export const SlackBotSetupGuide: React.FC<SlackBotSetupGuideProps> = ({ 
  onClose, 
  compact = false 
}) => {
  const [copiedStep, setCopiedStep] = React.useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      icon: <FiUser className="w-5 h-5" />,
      title: "1. Convite o Bot para o Canal",
      description: "Digite no canal do Slack:",
      command: "/invite @Project Boxes",
      note: "Se não funcionar, tente buscar por 'Project Boxes' ou o nome da sua app no Slack"
    },
    {
      icon: <FiHash className="w-5 h-5" />,
      title: "2. Verifique se o Bot Apareceu",
      description: "Confirme que o bot aparece na lista de membros do canal",
      note: "Clique no nome do canal → aba 'Membros' → procure pelo bot na lista"
    },
    {
      icon: <FiSettings className="w-5 h-5" />,
      title: "3. Para Canais Privados",
      description: "Se for um canal privado, o bot precisa ser explicitamente adicionado:",
      command: "/add @Project Boxes",
      note: "Use /add em vez de /invite para canais privados"
    },
    {
      icon: <FiCheckCircle className="w-5 h-5" />,
      title: "4. Confirme o Acesso",
      description: "O bot agora consegue ler as mensagens do canal para análise de IA",
      note: "Recarregue a página se as mensagens não aparecerem imediatamente"
    }
  ];

  if (compact) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiAlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              Bot precisa ser adicionado ao canal
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              Para acessar as mensagens, adicione o bot ao canal do Slack:
            </p>
            <div className="bg-yellow-100 rounded border p-2 mb-2">
              <code className="text-sm text-yellow-800">/invite @Project Boxes</code>
              <button
                onClick={() => copyToClipboard("/invite @Project Boxes", 1)}
                className="ml-2 text-yellow-600 hover:text-yellow-800"
              >
                <FiCopy className="w-4 h-4 inline" />
              </button>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm text-yellow-600 hover:text-yellow-800 underline"
              >
                Entendi, fechar aviso
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FiSettings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configurar Bot do Slack
            </h3>
            <p className="text-sm text-gray-600">
              Siga os passos para dar acesso ao bot aos seus canais
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              {step.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                {step.title}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {step.description}
              </p>
              
              {step.command && (
                <div className="bg-gray-50 border rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-800">
                      {step.command}
                    </code>
                    <button
                      onClick={() => copyToClipboard(step.command, index + 1)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      {copiedStep === index + 1 ? (
                        <>
                          <FiCheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {step.note && (
                <p className="text-xs text-gray-500 italic">
                  💡 {step.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-amber-900 mb-1">
              ⚠️ Importante sobre Bot Tokens
            </h5>
            <p className="text-sm text-amber-800 mb-2">
              Esta integração usa bot tokens do Slack, que dão acesso automático apenas a canais públicos. 
              Para canais privados, o bot deve ser explicitamente convidado por um membro do canal.
            </p>
            <p className="text-sm text-amber-700">
              Isso é uma medida de segurança do Slack para proteger conversas privadas.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <FiExternalLink className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-blue-900 mb-1">
              Precisa de mais ajuda?
            </h5>
            <p className="text-sm text-blue-800 mb-2">
              Consulte a documentação oficial do Slack sobre como adicionar bots aos canais.
            </p>
            <a
              href="https://slack.com/help/articles/206819278-Add-apps-to-your-Slack-workspace"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Documentação do Slack →
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-green-900 mb-1">
              Depois de adicionar o bot
            </h5>
            <p className="text-sm text-green-800">
              O sistema automaticamente detectará o acesso e começará a analisar as mensagens do canal. 
              Isso pode levar alguns segundos para ser atualizado.
            </p>
          </div>
        </div>
      </div>

      {onClose && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Entendi, continuar
          </button>
        </div>
      )}
    </div>
  );
};