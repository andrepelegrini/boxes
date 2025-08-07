import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiInfo, FiAlertCircle } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const TOAST_ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const TOAST_STYLES = {
  success: {
    container: 'bg-gradient-to-r from-nubank-blue-500 to-nubank-blue-600 text-white',
    icon: 'text-white',
    border: 'border-nubank-blue-400'
  },
  error: {
    container: 'bg-gradient-to-r from-nubank-pink-500 to-nubank-pink-600 text-white',
    icon: 'text-white', 
    border: 'border-nubank-pink-400'
  },
  warning: {
    container: 'bg-gradient-to-r from-nubank-orange-500 to-nubank-orange-600 text-white',
    icon: 'text-white',
    border: 'border-nubank-orange-400'
  },
  info: {
    container: 'bg-gradient-to-r from-nubank-purple-500 to-nubank-purple-600 text-white',
    icon: 'text-white',
    border: 'border-nubank-purple-400'
  }
};

export const Toast: React.FC<ToastProps> = ({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const IconComponent = TOAST_ICONS[type];
  const styles = TOAST_STYLES[type];

  useEffect(() => {
    // Trigger entrada
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto close
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        ${styles.container} ${styles.border}
        rounded-nubank-lg shadow-nubank-elevated border
        p-4 transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        <IconComponent className={`${styles.icon} flex-shrink-0 mt-0.5`} size={20} />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          {message && (
            <p className="text-sm opacity-90 mt-1 leading-relaxed">{message}</p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
};

// Toast Container para gerenciar múltiplos toasts
export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id}
          style={{ 
            transform: `translateY(${index * 8}px)`,
            zIndex: 50 - index 
          }}
        >
          <Toast
            {...toast}
            onClose={onRemoveToast}
          />
        </div>
      ))}
    </div>
  );
};

// Hook para usar toasts facilmente
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'success', title, message: message || '', duration: duration || 5000 });
  };

  const showError = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'error', title, message: message || '', duration: duration || 5000 });
  };

  const showWarning = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'warning', title, message: message || '', duration: duration || 5000 });
  };

  const showInfo = (title: string, message?: string, duration?: number) => {
    return addToast({ type: 'info', title, message: message || '', duration: duration || 5000 });
  };

  // Função para mostrar erro útil em vez de alert()
  const showFriendlyError = (error: string | Error, customMessage?: string) => {
    // If a custom message is provided, use it directly
    if (customMessage) {
      return showError(typeof error === 'string' ? error : error.message, customMessage);
    }
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Mapear erros comuns para mensagens amigáveis
    const friendlyErrors: Record<string, { title: string; message: string }> = {
      'Network request failed': {
        title: '🌐 Conexão instável',
        message: 'Parece que sua internet deu uma cochilada. Que tal tentar novamente?'
      },
      'Failed to fetch': {
        title: '📡 Problema de conexão',
        message: 'Não conseguimos conectar com nossos servidores. Tente novamente em alguns segundos.'
      },
      'name is required': {
        title: '🤔 Nome em branco',
        message: 'Que tal dar um nome bem legal para seu projeto? Fica mais fácil de lembrar!'
      },
      'Validation failed': {
        title: '📝 Alguns campos precisam de atenção',
        message: 'Dê uma olhadinha nos campos destacados - algo precisa ser ajustado.'
      }
    };

    const friendlyError = friendlyErrors[errorMessage] || {
      title: '😅 Ops, algo aconteceu',
      message: 'Encontramos um obstáculo inesperado, mas nossa equipe já foi avisada!'
    };

    return showError(friendlyError.title, friendlyError.message);
  };

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showFriendlyError,
    // Componente para renderizar os toasts
    ToastContainer: () => <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
  };


};