// src/components/onboarding/OnboardingTour.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiX, FiArrowRight, FiSkipForward, FiCheck,
  FiEye, FiEyeOff, FiZap, FiStar, FiTarget
} from 'react-icons/fi';
import { OnboardingStep, OnboardingFlow } from '../../services/SmartOnboardingService';
import PulseButton from '../ui/PulseButton';
import TypewriterText from '../ui/TypewriterText';
import GlowingCard from '../ui/GlowingCard';

interface OnboardingTourProps {
  flow: OnboardingFlow;
  currentStep: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  isActive: boolean;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onClose: () => void;
  preferences: {
    showTooltips: boolean;
    autoAdvance: boolean;
    skipAnimation: boolean;
  };
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  flow,
  currentStep,
  stepIndex,
  totalSteps,
  isActive,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  onClose,
  preferences
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find target element and calculate position
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const findTargetElement = () => {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        calculateTooltipPosition(element);
        setIsVisible(true);
        
        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });

        // Add highlight class
        element.classList.add('onboarding-highlight');
        
        return true;
      }
      return false;
    };

    // Try to find element immediately
    if (!findTargetElement()) {
      // If not found, wait a bit and try again (for dynamic content)
      const timeout = setTimeout(() => {
        findTargetElement();
      }, 500);
      
      return () => clearTimeout(timeout);
    }

    return () => {
      // Cleanup highlight class
      if (targetElement) {
        targetElement.classList.remove('onboarding-highlight');
      }
    };
  }, [currentStep, isActive, targetElement]);

  const calculateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    setTooltipPosition({
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height
    });
  };

  // Auto-advance if enabled
  useEffect(() => {
    if (preferences.autoAdvance && currentStep.duration) {
      const timeout = setTimeout(() => {
        onNext();
      }, currentStep.duration);

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [currentStep, preferences.autoAdvance, onNext]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (targetElement) {
        calculateTooltipPosition(targetElement);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement]);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!tooltipPosition) return {};

    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width || 320;
    const tooltipHeight = tooltipRect?.height || 200;
    
    let top = tooltipPosition.top;
    let left = tooltipPosition.left;

    switch (currentStep.position) {
      case 'top':
        top = tooltipPosition.top - tooltipHeight - 16;
        left = tooltipPosition.left + (tooltipPosition.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = tooltipPosition.top + tooltipPosition.height + 16;
        left = tooltipPosition.left + (tooltipPosition.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = tooltipPosition.top + (tooltipPosition.height / 2) - (tooltipHeight / 2);
        left = tooltipPosition.left - tooltipWidth - 16;
        break;
      case 'right':
        top = tooltipPosition.top + (tooltipPosition.height / 2) - (tooltipHeight / 2);
        left = tooltipPosition.left + tooltipPosition.width + 16;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (left < 16) left = 16;
    if (left + tooltipWidth > viewport.width - 16) {
      left = viewport.width - tooltipWidth - 16;
    }
    if (top < 16) top = 16;
    if (top + tooltipHeight > viewport.height - 16) {
      top = viewport.height - tooltipHeight - 16;
    }

    return {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 1002
    };
  };

  const getHighlightStyle = (): React.CSSProperties => {
    if (!tooltipPosition) return {};

    return {
      position: 'absolute',
      top: `${tooltipPosition.top - 4}px`,
      left: `${tooltipPosition.left - 4}px`,
      width: `${tooltipPosition.width + 8}px`,
      height: `${tooltipPosition.height + 8}px`,
      borderRadius: '8px',
      border: '2px solid #8B5CF6',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
      zIndex: 1001
    };
  };

  const getCategoryIcon = () => {
    switch (currentStep.category) {
      case 'dashboard': return <FiTarget className="text-nubank-purple-600" size={20} />;
      case 'project-creation': return <FiStar className="text-nubank-blue-600" size={20} />;
      case 'widgets': return <FiEye className="text-nubank-green-600" size={20} />;
      case 'ai-features': return <FiZap className="text-nubank-orange-600" size={20} />;
      case 'slack-integration': return <FiZap className="text-nubank-pink-600" size={20} />;
      default: return <FiTarget className="text-nubank-gray-600" size={20} />;
    }
  };

  const isLastStep = stepIndex === totalSteps - 1;

  if (!isActive || !isVisible || !tooltipPosition) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Highlight */}
      <div 
        className="transition-all duration-300 bounce-in"
        style={getHighlightStyle()}
      />
      
      {/* Tooltip */}
      <GlowingCard
        ref={tooltipRef}
        glowColor="purple"
        intensity="medium"
        className="glass-card rounded-lg shadow-xl max-w-sm slide-in-up"
        style={getTooltipStyle()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getCategoryIcon()}
              <div>
                <TypewriterText
                  text={currentStep.title}
                  speed={preferences.skipAnimation ? 0 : 80}
                  className="text-lg font-bold text-nubank-gray-800 block"
                />
                <div className="text-xs text-nubank-purple-600 font-medium">
                  {flow.name} • {stepIndex + 1} de {totalSteps}
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors ripple"
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-nubank-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 h-2 rounded-full transition-all duration-500 progress-bar"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-nubank-gray-600 text-sm leading-relaxed">
              {currentStep.description}
            </p>
            
            {currentStep.isOptional && (
              <div className="mt-3 p-2 bg-nubank-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FiEyeOff className="text-nubank-blue-600" size={14} />
                  <span className="text-xs text-nubank-blue-700 font-medium">
                    Passo opcional
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!currentStep.isOptional && (
                <button
                  onClick={onSkip}
                  className="text-xs text-nubank-gray-500 hover:text-nubank-gray-700 transition-colors"
                >
                  Pular
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {stepIndex > 0 && onPrevious && (
                <PulseButton
                  onClick={onPrevious}
                  variant="secondary"
                  size="sm"
                >
                  Anterior
                </PulseButton>
              )}
              
              {isLastStep ? (
                <PulseButton
                  onClick={onComplete}
                  variant="success"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <FiCheck size={14} />
                  <span>Concluir</span>
                </PulseButton>
              ) : (
                <PulseButton
                  onClick={onNext}
                  variant="primary"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <span>Próximo</span>
                  <FiArrowRight size={14} />
                </PulseButton>
              )}
            </div>
          </div>

          {/* Auto-advance indicator */}
          {preferences.autoAdvance && currentStep.duration && (
            <div className="mt-4 text-center">
              <div className="text-xs text-nubank-gray-500">
                Avançando automaticamente em {Math.ceil(currentStep.duration / 1000)}s
              </div>
            </div>
          )}
        </div>
      </GlowingCard>
      
      {/* Flow Skip Button */}
      <div className="absolute top-4 right-4">
        <PulseButton
          onClick={onClose}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-2 glass-card"
        >
          <FiSkipForward size={14} />
          <span>Pular Tour</span>
        </PulseButton>
      </div>
    </div>,
    document.body
  );
};

export default OnboardingTour;