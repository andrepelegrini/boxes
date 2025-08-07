import React, { useState, useEffect, useCallback } from 'react';
import { useAppUser } from '../contexts/SimplifiedRootProvider';

export const useProgressiveOnboarding = () => {
  const [showProgressiveOnboarding, setShowProgressiveOnboarding] = useState(false);
  const [hasSeenProgressiveOnboarding, setHasSeenProgressiveOnboarding] = useState(false);
  const { currentUser } = useAppUser();

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenProgressiveOnboarding');
    const hasCompletedSmartOnboarding = localStorage.getItem('smart_onboarding_state');
    let smartOnboardingCompleted = false;
    
    if (hasCompletedSmartOnboarding) {
      try {
        const parsedState = JSON.parse(hasCompletedSmartOnboarding);
        smartOnboardingCompleted = parsedState.hasCompletedInitialSetup === true;
      } catch (error) {
        // Parsing error - continue with default state
      }
    }
    
    const isFirstTime = !hasSeenOnboarding && !smartOnboardingCompleted && currentUser;
    
    setHasSeenProgressiveOnboarding(!!hasSeenOnboarding);
    
    if (isFirstTime) {
      const timer = setTimeout(() => {
        setShowProgressiveOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentUser]);

  const handleCompleteProgressiveOnboarding = useCallback(() => {
    setShowProgressiveOnboarding(false);
    setHasSeenProgressiveOnboarding(true);
    localStorage.setItem('hasSeenProgressiveOnboarding', 'true');
    
    const smartOnboardingState = localStorage.getItem('smart_onboarding_state');
    if (smartOnboardingState) {
      try {
        const parsedState = JSON.parse(smartOnboardingState);
        parsedState.hasCompletedInitialSetup = true;
        localStorage.setItem('smart_onboarding_state', JSON.stringify(parsedState));
      } catch (error) {
        // Error updating smart onboarding state - continue
      }
    } else {
      const newState = {
        hasCompletedInitialSetup: true,
        completedFlows: ['welcome'],
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
      };
      localStorage.setItem('smart_onboarding_state', JSON.stringify(newState));
    }
  }, []);

  return {
    showProgressiveOnboarding,
    hasSeenProgressiveOnboarding,
    handleCompleteProgressiveOnboarding,
  };
};
