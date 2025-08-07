// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiMail, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import PulseButton from './PulseButton';
import GlowingCard from './GlowingCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Log critical error
    console.error('[ErrorBoundary] Component error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundaryContext: this.props.context,
      errorId: this.state.errorId,
      component: this.props.context || 'ErrorBoundary'
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service in production
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, this would send to Sentry, LogRocket, etc.
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        context: this.props.context,
        errorId: this.state.errorId
      };

      // Store locally for now (in production, send to monitoring service)
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      storedErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (storedErrors.length > 10) {
        storedErrors.splice(0, storedErrors.length - 10);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(storedErrors));
      
      console.warn('Error logged with ID:', this.state.errorId);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleErrorDetails = () => {
    this.setState(prevState => ({
      showErrorDetails: !prevState.showErrorDetails
    }));
  };

  private reportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const subject = `Bug Report - ${errorId}`;
    const body = `
Erro encontrado no Project Boxes:

ID do Erro: ${errorId}
Contexto: ${this.props.context || 'Não especificado'}
Timestamp: ${new Date().toISOString()}

Mensagem do Erro:
${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

Passos para Reproduzir:
[Descreva os passos que levaram ao erro]

Informações Adicionais:
[Adicione qualquer informação relevante]
    `.trim();

    const mailtoLink = `mailto:support@projectboxes.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  private getErrorType = (error: Error): string => {
    if (error.name === 'ChunkLoadError') return 'Erro de Carregamento';
    if (error.message.includes('Network')) return 'Erro de Rede';
    if (error.message.includes('TypeError')) return 'Erro de Tipo';
    if (error.message.includes('ReferenceError')) return 'Erro de Referência';
    return 'Erro Desconhecido';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' => {
    if (error.name === 'ChunkLoadError') return 'medium';
    if (error.message.includes('Network')) return 'low';
    if (error.message.includes('Cannot read property')) return 'high';
    return 'medium';
  };

  private getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
    switch (severity) {
      case 'low': return 'text-nubank-blue-600 bg-nubank-blue-100';
      case 'medium': return 'text-nubank-orange-600 bg-nubank-orange-100';
      case 'high': return 'text-nubank-pink-600 bg-nubank-pink-100';
    }
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showErrorDetails, errorId } = this.state;
      const errorType = error ? this.getErrorType(error) : 'Erro Desconhecido';
      const severity = error ? this.getErrorSeverity(error) : 'medium';

      return (
        <div className="min-h-screen bg-gradient-to-br from-nubank-purple-50 to-nubank-pink-50 flex items-center justify-center p-4">
          <GlowingCard
            glowColor="purple"
            intensity="medium"
            className="max-w-2xl w-full glass-card rounded-lg p-8 space-y-6"
          >
            {/* Error Icon and Title */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-nubank-pink-100 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="text-nubank-pink-600" size={32} />
              </div>
              
              <h1 className="text-2xl font-bold text-nubank-gray-800 mb-2">
                Oops! Algo deu errado
              </h1>
              
              <p className="text-nubank-gray-600">
                Encontramos um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
              </p>
            </div>

            {/* Error Summary */}
            <div className="p-4 bg-nubank-gray-50 rounded-lg border-l-4 border-nubank-pink-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-nubank-gray-800">{errorType}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${this.getSeverityColor(severity)}`}>
                    {severity === 'low' ? 'Baixa' : severity === 'medium' ? 'Média' : 'Alta'}
                  </span>
                </div>
                <span className="text-xs text-nubank-gray-500 font-mono">
                  ID: {errorId}
                </span>
              </div>
              
              <p className="text-sm text-nubank-gray-700">
                {error?.message || 'Erro desconhecido ocorreu'}
              </p>
              
              {this.props.context && (
                <p className="text-xs text-nubank-gray-500 mt-1">
                  Contexto: {this.props.context}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <PulseButton
                onClick={this.handleRetry}
                variant="primary"
                size="md"
                className="flex items-center justify-center space-x-2"
              >
                <FiRefreshCw size={16} />
                <span>Tentar Novamente</span>
              </PulseButton>
              
              <PulseButton
                onClick={this.handleReload}
                variant="secondary"
                size="md"
                className="flex items-center justify-center space-x-2"
              >
                <FiRefreshCw size={16} />
                <span>Recarregar Página</span>
              </PulseButton>
              
              <PulseButton
                onClick={this.handleGoHome}
                variant="secondary"
                size="md"
                className="flex items-center justify-center space-x-2"
              >
                <FiHome size={16} />
                <span>Voltar ao Início</span>
              </PulseButton>
            </div>

            {/* Error Details Toggle */}
            {(this.props.showDetails || process.env.NODE_ENV === 'development') && (
              <div>
                <button
                  onClick={this.toggleErrorDetails}
                  className="flex items-center space-x-2 text-sm text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors"
                >
                  {showErrorDetails ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  <span>{showErrorDetails ? 'Ocultar' : 'Mostrar'} detalhes técnicos</span>
                </button>
                
                {showErrorDetails && (
                  <div className="mt-4 p-4 bg-nubank-gray-800 rounded-lg text-white text-sm font-mono overflow-auto max-h-64 slide-in-up">
                    <div className="mb-4">
                      <h4 className="font-bold mb-2">Stack Trace:</h4>
                      <pre className="whitespace-pre-wrap text-xs">{error?.stack}</pre>
                    </div>
                    
                    {errorInfo && (
                      <div>
                        <h4 className="font-bold mb-2">Component Stack:</h4>
                        <pre className="whitespace-pre-wrap text-xs">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Report Error */}
            <div className="text-center pt-4 border-t border-nubank-gray-200">
              <p className="text-sm text-nubank-gray-600 mb-3">
                Problemas persistindo? Nos ajude a melhorar reportando este erro.
              </p>
              
              <PulseButton
                onClick={this.reportError}
                variant="secondary"
                size="sm"
                className="flex items-center justify-center space-x-2"
              >
                <FiMail size={14} />
                <span>Reportar Erro</span>
              </PulseButton>
            </div>
          </GlowingCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const resetError = () => setError(null);
  
  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);
  
  // Re-throw error to be caught by ErrorBoundary
  if (error) {
    throw error;
  }
  
  return { handleError, resetError };
}

export default ErrorBoundary;