import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function SlackCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autorização Slack...');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Check if we're in Tauri environment
        const isTauri = window.__TAURI__ !== undefined;
        
        // Always let HTTPS server handle OAuth processing to avoid double processing
        const code = searchParams.get('code');
        console.log('OAuth callback received (will be handled by HTTPS server):', { 
          code: code?.substring(0, 20) + '...', 
          state: searchParams.get('state') || '',
          isTauri 
        });
        setStatus('success');
        setMessage('OAuth callback recebido! O processamento será feito automaticamente pelo servidor HTTPS.');
        
        // Close window after showing success
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            window.location.href = 'about:blank';
          }
        }, 3000);
        return;
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        
        // Check if this is a Tauri connectivity issue
        if (String(error).includes('Command') || String(error).includes('invoke')) {
          setMessage('Erro: App deve ser executado com "npm run tauri:dev" para funcionalidade completa');
        } else {
          setMessage(`Erro ao processar autorização: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    processOAuthCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-xl font-semibold text-gray-900">Processando...</h2>
              <p className="text-gray-600">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-900">✅ OAuth Success!</h2>
              <p className="text-green-700">{message}</p>
              <button 
                onClick={() => {
                  try {
                    window.close();
                  } catch (e) {
                    // If close fails, redirect to about:blank
                    window.location.href = 'about:blank';
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Fechar Aba
              </button>
              <p className="text-xs text-green-600 mt-2">
                Esta aba fechará automaticamente em alguns segundos
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900">Erro</h2>
              <p className="text-red-700">{message}</p>
              <button 
                onClick={() => {
                  try {
                    window.close();
                  } catch (e) {
                    // If close fails, redirect to about:blank or go back
                    window.location.href = 'about:blank';
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Fechar Janela
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}