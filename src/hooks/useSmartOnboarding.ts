// src/hooks/useSmartOnboarding.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import SmartOnboardingService, {
  OnboardingFlow,
  OnboardingStep,
  SmartSuggestion,
  UserOnboardingState
} from '../services/SmartOnboardingService';

interface UseSmartOnboardingReturn {
  // State
  isOnboardingActive: boolean;
  currentFlow: OnboardingFlow | null;
  currentStep: OnboardingStep | null;
  suggestions: SmartSuggestion[];
  state: UserOnboardingState;
  
  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  skipFlow: () => void;
  completeFlow: () => void;
  dismissSuggestion: (id: string) => void;
  updateBehavior: (data: Partial<UserOnboardingState['behaviorData']>) => void;
  updatePreferences: (preferences: Partial<UserOnboardingState['userPreferences']>) => void;
  
  // Utilities
  shouldShowOnboarding: boolean;
  isFirstTime: boolean;
  resetOnboarding: () => void;
}

export const useSmartOnboarding = (): UseSmartOnboardingReturn => {
  const serviceRef = useRef<SmartOnboardingService | null>(null);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<OnboardingFlow | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [state, setState] = useState<UserOnboardingState | null>(null);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new SmartOnboardingService();
      setState(serviceRef.current.getState());
      setSuggestions(serviceRef.current.getSmartSuggestions());
    }
  }, []);

  // Auto-start onboarding for new users
  useEffect(() => {
    if (serviceRef.current && state && !state.hasCompletedInitialSetup) {
      const nextFlow = serviceRef.current.getNextAvailableFlow();
      if (nextFlow) {
        startOnboarding();
      }
    }
  }, [state]);

  const refreshState = useCallback(() => {
    if (serviceRef.current) {
      setState(serviceRef.current.getState());
      setSuggestions(serviceRef.current.getSmartSuggestions());
    }
  }, []);

  const startOnboarding = useCallback(() => {
    if (!serviceRef.current) return;

    const nextFlow = serviceRef.current.getNextAvailableFlow();
    if (nextFlow) {
      const flow = serviceRef.current.startFlow(nextFlow.id);
      if (flow && flow.steps.length > 0) {
        setCurrentFlow(flow);
        setCurrentStep(flow.steps[0]);
        setIsOnboardingActive(true);
        refreshState();
      }
    }
  }, [refreshState]);

  const nextStep = useCallback(() => {
    if (!serviceRef.current || !currentFlow) return;

    const startTime = Date.now();
    const nextStepData = serviceRef.current.nextStep();
    
    if (nextStepData) {
      setCurrentStep(nextStepData);
      // Track time spent on previous step
      if (currentStep) {
        serviceRef.current.trackStepCompletion(currentStep.id, Date.now() - startTime);
      }
    } else {
      // Flow completed
      setIsOnboardingActive(false);
      setCurrentFlow(null);
      setCurrentStep(null);
    }
    
    refreshState();
  }, [currentFlow, currentStep, refreshState]);

  const previousStep = useCallback(() => {
    if (!serviceRef.current || !currentFlow) return;

    const previousStepData = serviceRef.current.previousStep();
    
    if (previousStepData) {
      setCurrentStep(previousStepData);
    }
    
    refreshState();
  }, [currentFlow, refreshState]);

  const skipStep = useCallback(() => {
    if (!serviceRef.current || !currentStep) return;
    
    serviceRef.current.skipStep(currentStep.id);
    nextStep();
  }, [currentStep, nextStep]);

  const skipFlow = useCallback(() => {
    if (!serviceRef.current || !currentFlow) return;
    
    serviceRef.current.completeFlow(currentFlow.id);
    setIsOnboardingActive(false);
    setCurrentFlow(null);
    setCurrentStep(null);
    refreshState();
  }, [currentFlow, refreshState]);

  const completeFlow = useCallback(() => {
    if (!serviceRef.current || !currentFlow) return;
    
    serviceRef.current.completeFlow(currentFlow.id);
    setIsOnboardingActive(false);
    setCurrentFlow(null);
    setCurrentStep(null);
    refreshState();
  }, [currentFlow, refreshState]);

  const dismissSuggestion = useCallback((id: string) => {
    if (!serviceRef.current) return;
    
    serviceRef.current.dismissSuggestion(id);
    serviceRef.current.trackSuggestionInteraction(id, 'dismissed');
    refreshState();
  }, [refreshState]);

  const updateBehavior = useCallback((data: Partial<UserOnboardingState['behaviorData']>) => {
    if (!serviceRef.current) return;
    
    serviceRef.current.updateBehaviorData(data);
    refreshState();
  }, [refreshState]);

  const updatePreferences = useCallback((preferences: Partial<UserOnboardingState['userPreferences']>) => {
    if (!serviceRef.current) return;
    
    serviceRef.current.updatePreferences(preferences);
    refreshState();
  }, [refreshState]);

  const resetOnboarding = useCallback(() => {
    if (!serviceRef.current) return;
    
    serviceRef.current.resetOnboarding();
    setIsOnboardingActive(false);
    setCurrentFlow(null);
    setCurrentStep(null);
    refreshState();
  }, [refreshState]);

  // Auto-refresh suggestions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (serviceRef.current) {
        setSuggestions(serviceRef.current.getSmartSuggestions());
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Track session time
  useEffect(() => {
    const startTime = Date.now();
    
    const updateSessionTime = () => {
      if (serviceRef.current) {
        const sessionTime = Date.now() - startTime;
        const currentState = serviceRef.current.getState();
        serviceRef.current.updateBehaviorData({
          totalSessionTime: currentState.behaviorData.totalSessionTime + sessionTime
        });
      }
    };

    // Update session time on page unload
    window.addEventListener('beforeunload', updateSessionTime);
    
    // Update session time every minute
    const interval = setInterval(updateSessionTime, 60000);

    return () => {
      updateSessionTime();
      window.removeEventListener('beforeunload', updateSessionTime);
      clearInterval(interval);
    };
  }, []);

  const shouldShowOnboarding = serviceRef.current?.shouldShowOnboarding() ?? false;
  const isFirstTime = state ? !state.hasCompletedInitialSetup : false;

  return {
    // State
    isOnboardingActive,
    currentFlow,
    currentStep,
    suggestions,
    state: state ?? {
      hasCompletedInitialSetup: false,
      completedFlows: [],
      skippedSteps: [],
      userPreferences: {
        showTooltips: true,
        autoAdvance: false,
        skipAnimation: false
      },
      behaviorData: {
        projectsCreated: 0,
        widgetsUsed: [],
        featuresUsed: [],
        lastActiveDate: new Date().toISOString(),
        totalSessionTime: 0
      }
    },
    
    // Actions
    startOnboarding,
    nextStep,
    previousStep,
    skipStep,
    skipFlow,
    completeFlow,
    dismissSuggestion,
    updateBehavior,
    updatePreferences,
    
    // Utilities
    shouldShowOnboarding,
    isFirstTime,
    resetOnboarding
  };
};

export default useSmartOnboarding;