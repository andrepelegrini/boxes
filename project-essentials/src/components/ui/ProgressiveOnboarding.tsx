import React, { useState, useEffect } from 'react';
import { FiArrowRight, FiX } from 'react-icons/fi';
import { useProjectContext, useUIContext } from '../../contexts';
import { useToast } from '../ui/Toast';

type OnboardingStep = 
  | 'welcome'
  | 'create-first-project' 
  | 'understand-workflow'
  | 'explore-features'
  | 'completed';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTooltipProps {
  step: OnboardingStep;
  isVisible: boolean;
  position: TooltipPosition;
  title: string;
  content: string;
  actionText?: string;
  onAction?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  isVisible,
  position,
  title,
  content,
  actionText,
  onAction,
  onSkip,
  onClose,
  showProgress = false,
  currentStep = 1,
  totalSteps = 4
}) => {
  if (!isVisible) return null;

  const getPlacementClasses = () => {
    switch (position.placement) {
      case 'top':
        return 'bottom-full mb-2 transform -translate-x-1/2 left-1/2';
      case 'bottom':
        return 'top-full mt-2 transform -translate-x-1/2 left-1/2';
      case 'left':
        return 'right-full mr-2 transform -translate-y-1/2 top-1/2';
      case 'right':
        return 'left-full ml-2 transform -translate-y-1/2 top-1/2';
      default:
        return 'top-full mt-2 transform -translate-x-1/2 left-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (position.placement) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-white border-l-transparent border-r-transparent border-b-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-white border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-white border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-white border-t-transparent border-b-transparent border-l-transparent';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-white border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div
      className="fixed z-60 animate-nubank-fade-in pointer-events-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className={`absolute ${getPlacementClasses()}`}>
        <div className="bg-white rounded-nubank-lg shadow-nubank-elevated border border-nubank-purple-200 p-6 max-w-sm w-80 relative">
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-8 ${getArrowClasses()}`}></div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors"
          >
            <FiX size={16} />
          </button>

          {/* Progress indicator */}
          {showProgress && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-nubank-purple-600">
                  Passo {currentStep} de {totalSteps}
                </span>
                <span className="text-xs text-nubank-gray-500">
                  {Math.round((currentStep / totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-nubank-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-nubank-gray-800">{title}</h3>
            <p className="text-sm text-nubank-gray-600 leading-relaxed">{content}</p>
            
            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="text-sm text-nubank-gray-500 hover:text-nubank-gray-700 transition-colors"
                >
                  Pular tour
                </button>
              )}
              
              {onAction && actionText && (
                <button
                  onClick={onAction}
                  className="flex items-center space-x-2 bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white px-4 py-2 rounded-nubank font-semibold hover:from-nubank-purple-600 hover:to-nubank-pink-600 transition-all duration-200 text-sm"
                >
                  <span>{actionText}</span>
                  <FiArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProgressiveOnboardingProps {
  isActive: boolean;
  onComplete: () => void;
}

const ProgressiveOnboarding: React.FC<ProgressiveOnboardingProps> = ({
  isActive,
  onComplete
}) => {
  const { projects } = useProjectContext();
  const { setShowCreateProjectModal } = useUIContext() || {};
  const { showSuccess } = useToast();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 100,
    left: 100,
    placement: 'bottom'
  });
  const [hasCreatedProject, setHasCreatedProject] = useState(false);

  // Track user progress
  useEffect(() => {
    if (projects.length > 0 && !hasCreatedProject) {
      setHasCreatedProject(true);
      if (currentStep === 'create-first-project') {
        setTimeout(() => {
          setCurrentStep('understand-workflow');
          showSuccess('🎉 Primeira Caixa Criada!', 'Parabéns! Agora vamos entender como organizar seus projetos.');
        }, 1000);
      }
    }
  }, [projects.length, hasCreatedProject, currentStep, showSuccess]);

  // Calculate tooltip position based on target element
  const calculatePosition = (targetSelector: string, placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom'): TooltipPosition => {
    // Try multiple selectors to find the element
    const selectors = targetSelector.split(', ');
    let element: Element | null = null;
    
    for (const selector of selectors) {
      element = document.querySelector(selector.trim());
      if (element) break;
    }
    
    if (!element) {
      return { top: 100, left: 100, placement };
    }

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.top + scrollTop;
    let left = rect.left + scrollLeft;

    switch (placement) {
      case 'bottom':
        top += rect.height;
        left += rect.width / 2;
        break;
      case 'top':
        top -= 10;
        left += rect.width / 2;
        break;
      case 'right':
        top += rect.height / 2;
        left += rect.width;
        break;
      case 'left':
        top += rect.height / 2;
        left -= 10;
        break;
    }

    return { top, left, placement };
  };

  // Update tooltip position when step changes
  useEffect(() => {
    if (!isActive) return;

    let targetSelector = '';
    let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    switch (currentStep) {
      case 'welcome':
        targetSelector = 'h1'; // Main title
        placement = 'bottom';
        break;
      case 'create-first-project':
        targetSelector = '[data-testid="create-project-button"], button[title*="Criar"], button:contains("Nova ideia")';
        placement = 'left';
        break;
      case 'understand-workflow':
        targetSelector = '[data-drop-zone="shelf"], .grid > section:first-child';
        placement = 'top';
        break;
      case 'explore-features':
        targetSelector = '[data-testid="settings-button"], button[title*="Configurações"]';
        placement = 'left';
        break;
    }

    if (targetSelector) {
      setTimeout(() => {
        const position = calculatePosition(targetSelector, placement);
        setTooltipPosition(position);
      }, 100);
    }
  }, [currentStep, isActive]);

  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('create-first-project');
        break;
      case 'create-first-project':
        setShowCreateProjectModal(true);
        break;
      case 'understand-workflow':
        setCurrentStep('explore-features');
        break;
      case 'explore-features':
        setCurrentStep('completed');
        setTimeout(() => {
          onComplete();
          showSuccess('🎓 Tour Concluído!', 'Você está pronto para organizar seus projetos como um expert!');
        }, 500);
        break;
    }
  };

  const handleSkip = () => {
    setCurrentStep('completed');
    onComplete();
  };

  const getStepConfig = () => {
    const stepNumber = ['welcome', 'create-first-project', 'understand-workflow', 'explore-features'].indexOf(currentStep) + 1;
    
    switch (currentStep) {
      case 'welcome':
        return {
          title: '👋 Bem-vindo ao Gestor de Caixas!',
          content: 'Vamos fazer um tour rápido para você começar organizando seus projetos como caixas físicas. É mais simples do que parece!',
          actionText: 'Começar tour',
          showProgress: true,
          currentStep: stepNumber,
          totalSteps: 4
        };
      
      case 'create-first-project':
        return {
          title: '📦 Crie sua primeira caixa',
          content: hasCreatedProject 
            ? 'Perfeito! Você criou sua primeira caixa. Agora vamos entender como organizar seus projetos.'
            : 'Clique no botão ao lado para criar sua primeira caixa de projeto. É como abrir uma caixa física na sua mesa!',
          actionText: hasCreatedProject ? 'Continuar' : 'Criar minha caixa',
          showProgress: true,
          currentStep: stepNumber,
          totalSteps: 4
        };
      
      case 'understand-workflow':
        return {
          title: '🌊 O fluxo natural dos projetos',
          content: 'Suas caixas se movem da esquerda para direita: Ideias → Prontas → Em Ação → Conquistas. É assim que projetos evoluem naturalmente!',
          actionText: 'Entendi!',
          showProgress: true,
          currentStep: stepNumber,
          totalSteps: 4
        };
      
      case 'explore-features':
        return {
          title: '⚙️ Explore as configurações',
          content: 'Aqui você pode configurar IA, ajustar sua capacidade de trabalho e personalizar a experiência. Explore quando quiser!',
          actionText: 'Finalizar tour',
          showProgress: true,
          currentStep: stepNumber,
          totalSteps: 4
        };
      
      default:
        return null;
    }
  };

  if (!isActive || currentStep === 'completed') {
    return null;
  }

  const stepConfig = getStepConfig();
  if (!stepConfig) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40 animate-nubank-fade-in pointer-events-none" />
      
      {/* Tooltip */}
      <OnboardingTooltip
        step={currentStep}
        isVisible={true}
        position={tooltipPosition}
        title={stepConfig.title}
        content={stepConfig.content}
        actionText={stepConfig.actionText}
        onAction={handleNext}
        onSkip={handleSkip}
        onClose={handleSkip}
        showProgress={stepConfig.showProgress}
        currentStep={stepConfig.currentStep}
        totalSteps={stepConfig.totalSteps}
      />
    </>
  );
};

export default ProgressiveOnboarding;