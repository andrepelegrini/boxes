import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { Form, CodeField, validators } from '../../modules/common/components';

interface SlackOAuthFallbackProps {
  onCodeSubmit: (code: string) => Promise<void>;
  onClose: () => void;
}

export const SlackOAuthFallback: React.FC<SlackOAuthFallbackProps> = ({ 
  onCodeSubmit, 
  onClose 
}) => {
  // Form data interface
  interface CodeFormData {
    code: string;
  }

  const handleSubmit = async (data: CodeFormData) => {
    if (!data.code.trim()) return;
    
    // Extract code from URL if full URL was provided
    let finalCode = data.code.trim();
    try {
      const urlObj = new URL(finalCode);
      const codeParam = urlObj.searchParams.get('code');
      if (codeParam) {
        finalCode = codeParam;
      }
    } catch {
      // Not a valid URL, use as-is
    }
    
    await onCodeSubmit(finalCode);
  };

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center mb-4">
        <FiAlertCircle className="w-6 h-6 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold">Autorização Manual</h3>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800 mb-2">
          Se a autorização automática não funcionou, você pode inserir o código manualmente:
        </p>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Copie a URL completa da página de erro (começando com https://localhost:8080)</li>
          <li>Cole no campo abaixo</li>
          <li>Ou extraia apenas o código após "code=" na URL</li>
        </ol>
      </div>

      <Form<CodeFormData>
        initialData={{ code: '' }}
        onSubmit={handleSubmit}
        validationRules={[
          validators.required('code', 'Código de autorização é obrigatório'),
          validators.minLength('code', 10, 'Código deve ter pelo menos 10 caracteres'),
        ]}
        submitButtonText="Autorizar com Código"
        submitButtonLoadingText="Processando..."
        cancelButtonText="Cancelar"
        onCancel={onClose}
      >
        {({ data, updateField, errors }) => (
          <CodeField
            value={data.code}
            onChange={(value) => updateField('code', value)}
            required
            error={errors.code || ''}
            help="Exemplo de código: 397274332695.9031833046215.7e9127b9a524e2b612c259873a5d035daa77c1aafc79379c747b660ff4d82d9b"
          />
        )}
      </Form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Dica:</h4>
        <p className="text-sm text-blue-800">
          O código que você precisa está na URL após "code=". 
          Copie toda a URL que apareceu no erro e cole acima - o sistema extrairá o código automaticamente.
        </p>
      </div>
    </div>
  );
};