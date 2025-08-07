/**
 * Simplified provider for testing that skips complex initialization
 */
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

interface TestProviderProps {
  children: ReactNode;
  initialEntries?: string[];
  initialIndex?: number | undefined;
}

export const TestProvider: React.FC<TestProviderProps> = ({ 
  children, 
  initialEntries = ['/'], 
  initialIndex 
}) => {
  return (
    <MemoryRouter 
      initialEntries={initialEntries} 
      initialIndex={initialIndex}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <div className="min-h-screen bg-background text-textOnSurface">
        {children}
      </div>
    </MemoryRouter>
  );
};