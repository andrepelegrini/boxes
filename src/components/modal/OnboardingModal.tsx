import React, { useState } from 'react';
import { Modal } from '../../modules/common/components/Modal';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';
import { FiArrowRight, FiArrowLeft, FiCheck, FiX, FiExternalLink, FiCpu, FiBox, FiTrendingUp } from 'react-icons/fi';
import { useToast } from '../ui/Toast';

/**
 * Props for the OnboardingModal component
 */
interface OnboardingModalProps {
  /** Whether the modal is currently open/visible */
  isOpen: boolean;
  /** Callback function called when the modal should be closed */
  onClose: () => void;
  /** Callback function called when onboarding is completed */
  onComplete: () => void;
}

/**
 * OnboardingModal - First-time user onboarding component
 * 
 * Provides a guided 3-step introduction to the Gestor de Caixas application:
 * 1. Welcome & feature overview (Project boxes concept, Hill Chart, AI integration)
 * 2. AI features explanation (project analysis, task suggestions, timeline estimates)  
 * 3. Optional Google Gemini API key setup with real-time validation
 * 
 * Features:
 * - Progressive step navigation with visual progress bar
 * - Optional AI configuration with guided setup instructions
 * - Real-time API key testing and validation
 * - Portuguese localization throughout
 * - Error handling for API key validation
 * - Skip option for users who don't want AI features
 * 
 * @param props - Component props
 * @returns React functional component
 */
const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { 
    geminiApiKey, updateGeminiApiKey, isAIEnabled, testGeminiConnection
  } = useAppContext();
  const { showWarning, ToastContainer: ToastContainerComponent } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState(geminiApiKey || '');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<'success' | 'error' | null>(null);

  const totalSteps = 3;

  /**
   * Advances to the next step in the onboarding flow
   */
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Goes back to the previous step in the onboarding flow
   */
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Completes onboarding without configuring AI features
   */
  const handleSkipAI = () => {
    onComplete();
  };

  /**
   * Tests the validity of the entered Google Gemini API key
   * Provides real-time feedback to the user about key validity
   */
  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyTestResult('error');
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const isValid = await testGeminiConnection();
      setApiKeyTestResult(isValid ? 'success' : 'error');
    } catch (error) {
      setApiKeyTestResult('error');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  /**
   * Completes the onboarding process and optionally saves the API key
   * Shows error message if API key saving fails but still completes onboarding
   */
  const handleFinishOnboarding = async () => {
    if (apiKey.trim()) {
      const success = await updateGeminiApiKey(apiKey.trim());
      if (!success) {
        showWarning('🤖 Problema na Configuração', 'Não conseguimos salvar a chave de IA agora, mas você pode configurá-la depois nas configurações.');
      }
    }
    onComplete();
  };

  /**
   * Renders the content for the current onboarding step
   * @returns JSX element for the current step (1: Welcome, 2: AI Features, 3: AI Setup)
   */
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <FiBox className="w-16 h-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-textOnSurface mb-3">
                Bem-vindo ao Gestor de Caixas!
              </h2>
              <p className="text-textAccent text-lg leading-relaxed">
                O Gestor de Caixas é sua ferramenta para organizar projetos como caixas físicas que se movem através de diferentes estágios: <strong>Prateleira → Próximas → Abertas → Arquivadas</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-background rounded-lg border border-border">
                <FiTrendingUp className="w-8 h-8 text-primary mb-2 mx-auto" />
                <h3 className="font-semibold text-textOnSurface mb-1">Hill Chart</h3>
                <p className="text-textAccent">Visualize o progresso das tarefas de forma intuitiva</p>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border">
                <FiCpu className="w-8 h-8 text-primary mb-2 mx-auto" />
                <h3 className="font-semibold text-textOnSurface mb-1">IA Integrada</h3>
                <p className="text-textAccent">Análises inteligentes de projetos com Google Gemini</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FiCpu className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-textOnSurface mb-3">
                Recursos de Inteligência Artificial
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-background rounded-lg border border-border">
                <FiCheck className="w-5 h-5 text-success-DEFAULT mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-textOnSurface mb-1">Análise Inteligente de Projetos</h3>
                  <p className="text-textAccent text-sm">Carregue documentos, textos ou áudios e receba insights detalhados sobre seus projetos.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-background rounded-lg border border-border">
                <FiCheck className="w-5 h-5 text-success-DEFAULT mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-textOnSurface mb-1">Sugestões de Tarefas</h3>
                  <p className="text-textAccent text-sm">A IA analisa o contexto do projeto e sugere tarefas relevantes automaticamente.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-background rounded-lg border border-border">
                <FiCheck className="w-5 h-5 text-success-DEFAULT mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-textOnSurface mb-1">Estimativas de Cronograma</h3>
                  <p className="text-textAccent text-sm">Receba estimativas inteligentes de tempo e recursos necessários para seus projetos.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Nota:</strong> Para usar os recursos de IA, você precisará configurar uma chave API do Google Gemini. Isso é opcional e pode ser feito agora ou mais tarde nas configurações.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FiCpu className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-textOnSurface mb-3">
                Configurar IA (Opcional)
              </h2>
              <p className="text-textAccent">
                Configure sua chave API do Google Gemini para habilitar recursos de IA
              </p>
            </div>

            {/* Current AI Status */}
            <div className="flex items-center p-3 rounded-lg bg-background border border-border">
              <div className={`flex items-center ${isAIEnabled ? 'text-success-DEFAULT' : 'text-textAccent'}`}>
                {isAIEnabled ? <FiCheck className="mr-2" /> : <FiX className="mr-2" />}
                <span className="font-medium">
                  Status: {isAIEnabled ? 'IA Habilitada' : 'IA Desabilitada'}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-textOnSurface">Como obter sua chave API:</h3>
              <ol className="text-sm text-textAccent space-y-2">
                <li>1. Acesse <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Google AI Studio <FiExternalLink className="ml-1 w-3 h-3" /></a></li>
                <li>2. Faça login com sua conta Google</li>
                <li>3. Clique em "Create API Key" e gere uma nova chave</li>
                <li>4. Copie a chave (começa com "AIzaSy...")</li>
                <li>5. Cole a chave no campo abaixo</li>
              </ol>
            </div>

            {/* API Key Input */}
            <div>
              <label htmlFor="onboardingApiKey" className="block text-sm font-medium text-textAccent mb-2">
                Chave API do Google Gemini (opcional)
              </label>
              <div className="space-y-3">
                <input
                  type="password"
                  id="onboardingApiKey"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyTestResult(null);
                  }}
                  placeholder="AIzaSy... (opcional)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-textOnSurface"
                />
                
                {/* Test Result */}
                {apiKeyTestResult && (
                  <div className={`flex items-center text-sm ${
                    apiKeyTestResult === 'success' ? 'text-success-DEFAULT' : 'text-danger-DEFAULT'
                  }`}>
                    {apiKeyTestResult === 'success' ? <FiCheck className="mr-2" /> : <FiX className="mr-2" />}
                    {apiKeyTestResult === 'success' 
                      ? 'Conexão testada com sucesso!' 
                      : 'Erro na conexão. Verifique a chave API.'
                    }
                  </div>
                )}

                {/* Test Button */}
                {apiKey.trim() && (
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={isTestingApiKey}
                    className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isTestingApiKey ? 'Testando...' : 'Testar Chave'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                <strong>Dica:</strong> Você pode pular esta etapa e configurar a IA mais tarde através do menu Configurações (⚙️).
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configuração Inicial (${currentStep}/${totalSteps})`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === currentStep
                    ? 'bg-primary text-textOnPrimary'
                    : step < currentStep
                    ? 'bg-success-DEFAULT text-white'
                    : 'bg-secondary-light text-textAccent'
                }`}
              >
                {step < currentStep ? <FiCheck /> : step}
              </div>
            ))}
          </div>
          <div className="w-full bg-secondary-light rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm font-medium text-textAccent hover:bg-secondary-light transition-colors"
              >
                <FiArrowLeft className="mr-2" />
                Anterior
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {currentStep === 3 && (
              <button
                onClick={handleSkipAI}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-textAccent hover:bg-secondary-light transition-colors"
              >
                Pular IA
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 bg-primary text-textOnPrimary rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Próximo
                <FiArrowRight className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleFinishOnboarding}
                className="inline-flex items-center px-4 py-2 bg-primary text-textOnPrimary rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <FiCheck className="mr-2" />
                Começar a Usar
              </button>
            )}
          </div>
        </div>
      </div>
      <ToastContainerComponent />
    </Modal>
  );
};

export default OnboardingModal;