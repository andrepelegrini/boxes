import React, { ReactNode, useEffect, useCallback } from 'react';
import { FiX } from 'react-icons/fi';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  preventScroll?: boolean;
}

/**
 * Enhanced Modal component with:
 * - Consistent styling and behavior
 * - Accessibility features (escape key, focus management)
 * - Configurable overlay click and escape key behavior
 * - Multiple size options
 * - Scroll prevention
 * - Smooth animations
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscapeKey = true,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  preventScroll = true,
}) => {
  // Handle escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscapeKey) {
      onClose();
    }
  }, [onClose, closeOnEscapeKey]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  // Manage scroll prevention and event listeners
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll when modal is open
    if (preventScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
    return;
  }, [isOpen, preventScroll]);

  useEffect(() => {
    if (!isOpen) return;

    // Add escape key listener
    if (closeOnEscapeKey) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
    return;
  }, [isOpen, handleEscapeKey, closeOnEscapeKey]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus the modal content when it opens
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    
    if (firstFocusable) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        firstFocusable.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 
                 animate-fade-in ${overlayClassName}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div 
        className={`bg-card rounded-xl shadow-xl w-full ${sizeClasses[size]} 
                   animate-slide-up flex flex-col border border-border
                   ${contentClassName} ${className}`}
        onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking content
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full 
                         hover:bg-muted ml-auto"
                aria-label="Fechar modal"
                type="button"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Simple animation styles - add to your CSS or Tailwind config
 */
export const modalAnimationStyles = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slide-up {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;

/**
 * Specialized modal variants for common use cases
 */

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: 'primary' | 'danger' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonStyle = 'primary',
}) => {
  const confirmButtonClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground border border-border rounded-md 
                     hover:bg-muted transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-md font-medium transition-colors 
                       ${confirmButtonClasses[confirmButtonStyle]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export interface FullscreenModalProps extends Omit<ModalProps, 'size'> {
  showHeader?: boolean;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  showHeader = true,
  className = '',
  ...props
}) => (
  <Modal
    {...props}
    size="5xl"
    className={`${className}`}
    contentClassName=""
  />
);