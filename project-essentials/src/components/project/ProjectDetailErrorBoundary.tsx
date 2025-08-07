import { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  projectId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ProjectDetailErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for debugging
    console.error('ProjectDetailPage error:', error, errorInfo);
    
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Log to your error tracking service (e.g., Sentry, LogRocket)
      // logErrorToService(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-lg p-6 max-w-md w-full border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <FiAlertCircle className="w-8 h-8 text-danger-DEFAULT flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-textOnSurface">
                  Erro ao carregar projeto
                </h2>
                <p className="text-sm text-textAccent">
                  Não foi possível carregar os detalhes do projeto
                </p>
              </div>
            </div>

            <div className="bg-danger-DEFAULT/10 rounded-lg p-3 mb-4 border border-danger-DEFAULT/20">
              <p className="text-sm text-danger-DEFAULT">
                {this.state.error?.message || 'Erro desconhecido ao processar dados do projeto'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-primary text-textOnPrimary px-4 py-2 rounded-lg hover:bg-primary-dark 
                         transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>

              <Link
                to="/"
                className="w-full bg-secondary-DEFAULT text-textOnSurface px-4 py-2 rounded-lg 
                         hover:bg-secondary-dark transition-colors flex items-center justify-center 
                         space-x-2 border border-border"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel</span>
              </Link>

              <button
                onClick={this.handleReload}
                className="w-full border border-border text-textAccent px-4 py-2 rounded-lg 
                         hover:bg-secondary-light transition-colors flex items-center justify-center space-x-2"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
              <p className="text-xs text-info">
                <strong>Possíveis causas:</strong>
              </p>
              <ul className="text-xs text-info/80 mt-1 list-disc list-inside space-y-1">
                <li>O projeto pode ter sido excluído</li>
                <li>Problemas de conexão com o banco de dados</li>
                <li>Dados corrompidos ou incompletos</li>
                <li>Erro temporário no sistema</li>
              </ul>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-textAccent cursor-pointer hover:text-primary">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto max-h-32 border border-border">
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ProjectDetailErrorBoundary;