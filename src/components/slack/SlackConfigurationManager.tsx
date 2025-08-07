import { useState, useEffect } from 'react';
import { FiExternalLink, FiLoader, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { useSlack as useSlackGlobal } from '../../contexts';

interface SlackConfigurationManagerProps {
  context?: string;
  project?: { id: string; name: string };
  onConfigurationComplete?: () => void;
  onClose?: () => void;
}

type ConfigStep = 'input' | 'oauth' | 'complete';

export function SlackConfigurationManager({ 
  context = 'default',
  project,
  onConfigurationComplete,
  onClose 
}: SlackConfigurationManagerProps) {
  const [step, setStep] = useState<ConfigStep>('input');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connection, isConnected, isConfigured } = useSlackGlobal();

  // Check if already configured
  useEffect(() => {
    if (isConfigured) {
      if (isConnected) {
        setStep('complete');
      } else if (connection.state.credentials) {
        setClientId(connection.state.credentials.client_id);
        // Do not set clientSecret for security reasons, but it's available in the context
      }
    }
  }, [isConfigured, isConnected, connection.state.credentials]);

  const handleConfigure = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // If already configured, we just need to re-authenticate
      if (isConfigured) {
        await connection.actions.authenticate();
        setStep('oauth');
        return;
      }

      // For initial configuration, validate inputs
      if (!clientId.trim() || !clientSecret.trim()) {
        setError('Please fill in both Client ID and Client Secret');
        return;
      }

      // Configure the app credentials
      await connection.actions.configure(clientId.trim(), clientSecret.trim());
      
      // Start OAuth flow
      await connection.actions.authenticate();
      setStep('oauth');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    if (onConfigurationComplete) {
      onConfigurationComplete();
    } else if (onClose) {
      onClose();
    }
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Slack Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect your {project ? 'project' : 'workspace'} to Slack for AI insights and team collaboration.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">api.slack.com/apps <FiExternalLink className="ml-1 w-3 h-3" /></a></li>
          <li>Create a new Slack app or select an existing one</li>
          <li>Copy the Client ID and Client Secret from the "Basic Information" section</li>
          <li>Paste them below to continue</li>
        </ol>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
            Client ID
          </label>
          <input
            type="text"
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="1234567890.1234567890123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
            Client Secret
          </label>
          <input
            type="password"
            id="clientSecret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={isConfigured && clientId ? 'Stored securely' : 'abcdef1234567890abcdef1234567890'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            disabled={isConfigured && !!clientId}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <FiAlertTriangle className="text-red-600 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-xs text-gray-500">Context: {context}</span>
        <div className="space-x-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleConfigure}
            disabled={isProcessing || (!isConfigured && (!clientId.trim() || !clientSecret.trim()))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing && <FiLoader className="animate-spin mr-2" />}
            {isProcessing ? 'Configuring...' : (isConfigured ? 'Authorize' : 'Continue to Slack')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderOAuthStep = () => (
    <div className="text-center space-y-6">
      <div>
        <FiLoader className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connecting to Slack</h3>
        <p className="text-gray-600">
          A new browser window should have opened for Slack authorization.
          <br />Complete the authorization process and return here.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <FiAlertTriangle className="text-yellow-600 mr-2" />
          <span className="text-sm text-yellow-800">
            If the browser window didn't open, check your popup blocker settings.
          </span>
        </div>
      </div>

      <div className="space-x-3">
        <button 
          onClick={() => setStep('input')}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheck className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Slack Connected Successfully!</h3>
        <p className="text-gray-600">
          Your {project ? 'project' : 'workspace'} is now connected to Slack.
          {project && ' You can now add channels to sync messages and get AI insights.'}
        </p>
      </div>

      {connection.state.teamName && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            Connected to: <strong>{connection.state.teamName}</strong>
          </p>
        </div>
      )}

      <button 
        onClick={handleComplete}
        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Continue
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-md mx-auto">
      {step === 'input' && renderInputStep()}
      {step === 'oauth' && renderOAuthStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
}

export default SlackConfigurationManager;