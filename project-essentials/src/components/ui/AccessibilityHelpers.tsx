import React from 'react';

// Screen reader only text component
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// Skip to main content link
export const SkipToMainContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-nubank-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg transition-all duration-200"
    onClick={(e) => {
      e.preventDefault();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView();
      }
    }}
  >
    Pular para conteúdo principal
  </a>
);

// Live region for dynamic content announcements
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}> = ({ 
  children, 
  politeness = 'polite', 
  atomic = true,
  className = ''
}) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic={atomic}
    className={`sr-only ${className}`}
  >
    {children}
  </div>
);

// Focus trap component for modals
export class FocusTrap extends React.Component<{
  children: React.ReactNode;
  active: boolean;
  className?: string;
}> {
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private containerRef = React.createRef<HTMLDivElement>();

  override componentDidMount() {
    if (this.props.active) {
      this.setFocusableElements();
      this.firstFocusableElement?.focus();
    }
  }

  override componentDidUpdate(prevProps: { active: boolean }) {
    if (this.props.active && !prevProps.active) {
      this.setFocusableElements();
      this.firstFocusableElement?.focus();
    }
  }

  setFocusableElements = () => {
    if (!this.containerRef.current) return;

    const focusableElementsString = 'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = this.containerRef.current.querySelectorAll(focusableElementsString) as NodeListOf<HTMLElement>;
    
    this.firstFocusableElement = focusableElements[0];
    this.lastFocusableElement = focusableElements[focusableElements.length - 1];
  };

  handleKeyDown = (e: React.KeyboardEvent) => {
    if (!this.props.active) return;

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          e.preventDefault();
          this.lastFocusableElement?.focus();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          e.preventDefault();
          this.firstFocusableElement?.focus();
        }
      }
    }

    if (e.key === 'Escape') {
      // Allow parent to handle escape
      return;
    }
  };

  override render() {
    return (
      <div
        ref={this.containerRef}
        onKeyDown={this.handleKeyDown}
        className={this.props.className}
      >
        {this.props.children}
      </div>
    );
  }
}

// High contrast mode detector
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// ARIA label provider for complex interactions
export const AriaLiveRegion: React.FC<{
  message: string;
  clearAfter?: number;
}> = ({ message, clearAfter = 5000 }) => {
  const [currentMessage, setCurrentMessage] = React.useState(message);

  React.useEffect(() => {
    setCurrentMessage(message);
    
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, clearAfter]);

  if (!currentMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
};

// Color contrast validator (for development)
export const validateColorContrast = (): {
  ratio: number;
  aaCompliant: boolean;
  aaaCompliant: boolean;
} => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  const ratio = 4.5; // Placeholder - implement actual calculation
  
  return {
    ratio,
    aaCompliant: ratio >= 4.5,
    aaaCompliant: ratio >= 7
  };
};

// Focus management hook
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = React.useState<HTMLElement | null>(null);

  const captureFocus = React.useCallback(() => {
    setFocusedElement(document.activeElement as HTMLElement);
  }, []);

  const restoreFocus = React.useCallback(() => {
    if (focusedElement) {
      focusedElement.focus();
      setFocusedElement(null);
    }
  }, [focusedElement]);

  const focusElement = React.useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  }, []);

  return {
    captureFocus,
    restoreFocus,
    focusElement
  };
};

export default {
  ScreenReaderOnly,
  SkipToMainContent,
  LiveRegion,
  FocusTrap,
  AriaLiveRegion,
  useHighContrastMode,
  useReducedMotion,
  validateColorContrast,
  useFocusManagement
};