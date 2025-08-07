import React, { Suspense, useEffect } from 'react';
import MainLayout from './src/components/layout/MainLayout';
import { useProgressiveOnboarding } from './src/hooks/useProgressiveOnboarding';
import AppRoutes from './src/routes';
import ErrorBoundary from './src/components/common/ErrorBoundary';

const ProgressiveOnboarding = React.lazy(() => import('./src/components/ui/ProgressiveOnboarding.tsx'));
const ContextualHints = React.lazy(() => import('./src/components/ui/ContextualHints.tsx'));
const MicroInteractions = React.lazy(() => import('./src/components/ui/MicroInteractions.tsx'));

const App: React.FC = () => {
  const {
    showProgressiveOnboarding,
    hasSeenProgressiveOnboarding,
    handleCompleteProgressiveOnboarding,
  } = useProgressiveOnboarding();


  return (
    <ErrorBoundary>
      <MainLayout>
        <AppRoutes />
        <Suspense fallback={<div />}>
          <ProgressiveOnboarding
            isActive={showProgressiveOnboarding}
            onComplete={handleCompleteProgressiveOnboarding}
          />
        </Suspense>
        <Suspense fallback={<div />}>
          <ContextualHints isEnabled={hasSeenProgressiveOnboarding} />
        </Suspense>
        <Suspense fallback={<div />}>
          <MicroInteractions isEnabled={hasSeenProgressiveOnboarding} />
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
};

export default App;