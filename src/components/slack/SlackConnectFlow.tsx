/**
 * New Slack Connection Flow
 * Step-by-step guided setup with persistent state
 */

import React, { useState } from 'react';
import { FiSlack, FiCheck, FiArrowRight, FiExternalLink, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useSlackConnection } from '../../hooks/useSlackConnection';
import SlackOAuthSetupGuide from './SlackOAuthSetupGuide';

type SetupStep = 'configure' | 'authenticate' | 'channels';

interface SlackConnectFlowProps {
  onComplete?: () => void;
  onChannelsConnected?: () => void;
}

export const SlackConnectFlow: React.FC<SlackConnectFlowProps> = ({ 
  onComplete, 
  onChannelsConnected 
}) => {
  const { state, actions, status } = useSlackConnection();
  const [currentStep, setCurrentStep] = useState<SetupStep>('configure');
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '' });
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Auto-advance to next step based on connection state
  React.useEffect(() => {
    if (state.isConnected && currentStep !== 'channels') {
      setCurrentStep('channels');
    } else if (state.isConfigured && !state.isConnected && currentStep === 'configure') {
      setCurrentStep('authenticate');
    }
  }, [state.isConfigured, state.isConnected, currentStep]);

  const getProgressPercentage = (): number => {
    if (state.isConnected) return 100;
    if (state.isConfigured) return 60;
    return 30;
  };

  const handleConfigure = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await actions.configure(credentials.clientId.trim(), credentials.clientSecret.trim());
      setCurrentStep('authenticate');
    } catch (error) {
      console.error('Configuration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setIsLoading(true);
    try {
      await actions.authenticate();
      // OAuth window will open, completion happens via callback
    } catch (error) {
      console.error('Authentication failed:', error);
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      if (status.nextStep === 'authenticate') {
        await actions.reconnect();
      } else if (status.nextStep === 'configure') {
        setCurrentStep('configure');
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderErrorState = () => (
    <div className="bg-white rounded-lg border border-red-200 shadow-sm">
      <div className="p-6 border-b border-red-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Connection Issue</h3>
            <p className="text-sm text-red-600">We need to fix this before continuing</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <p className="text-red-800">{state.error}</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FiRefreshCw className="w-4 h-4" />
            )}
            {status.nextStep === 'authenticate' ? 'Reconnect to Slack' : 'Try Again'}
          </button>
          <button
            onClick={() => window.open('https://api.slack.com/apps', '_blank')}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-2"
          >
            <FiExternalLink className="w-4 h-4" />
            Need Help?
          </button>
        </div>
      </div>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Connect to Slack</h3>
          <span className="text-sm text-gray-500">Step 1 of 3</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        <h4 className="font-medium text-gray-800 mb-2">Configure App Credentials</h4>
        <p className="text-sm text-gray-600">Enter your Slack app credentials to get started.</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client ID
            </label>
            <input
              type="text"
              value={credentials.clientId}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="1234567890.1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Secret
            </label>
            <input
              type="password"
              value={credentials.clientSecret}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="abcdef1234567890abcdef1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleConfigure}
            disabled={isLoading || !credentials.clientId.trim() || !credentials.clientSecret.trim()}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FiArrowRight className="w-4 h-4" />
            )}
            Continue
          </button>
          <button
            onClick={() => setShowSetupGuide(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FiExternalLink className="w-4 h-4" />
            Setup Guide
          </button>
        </div>
      </div>
    </div>
  );

  const renderAuthenticateStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Connect to Slack</h3>
          <span className="text-sm text-gray-500">Step 2 of 3</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        <h4 className="font-medium text-gray-800 mb-2">Authorize Access</h4>
        <p className="text-sm text-gray-600">Allow Project Boxes to access your Slack workspace.</p>
      </div>
      
      <div className="p-6">
        <div className="bg-green-50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <FiCheck className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">App configured successfully</span>
        </div>
        
        <p className="text-gray-700 mb-6">
          Click below to authorize Project Boxes to access your Slack workspace. 
          A new window will open for you to complete the authorization.
        </p>
        
        <button
          onClick={handleAuthenticate}
          disabled={isLoading || state.isAuthenticating}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading || state.isAuthenticating ? (
            <FiRefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <FiSlack className="w-5 h-5" />
          )}
          {state.isAuthenticating ? 'Completing authorization...' : 'Authorize with Slack'}
        </button>
      </div>
    </div>
  );

  const renderChannelsStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Connect to Slack</h3>
          <span className="text-sm text-gray-500">Step 3 of 3</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-green-600 h-2 rounded-full w-full" />
        </div>
        
        <h4 className="font-medium text-gray-800 mb-2">Connection Complete!</h4>
        <p className="text-sm text-gray-600">Successfully connected to {state.teamName || 'Slack'}.</p>
      </div>
      
      <div className="p-6">
        <div className="bg-green-50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <FiCheck className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">Connected to "{state.teamName}"</span>
        </div>
        
        <p className="text-gray-700 mb-6">
          Your Slack integration is ready! You can now connect channels to this project 
          to start receiving AI insights and team communication sync.
        </p>
        
        <button
          onClick={() => {
            onChannelsConnected?.();
            onComplete?.();
          }}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <FiArrowRight className="w-5 h-5" />
          Add Channels to Project
        </button>
      </div>
    </div>
  );

  // Show setup guide modal if requested
  if (showSetupGuide) {
    return <SlackOAuthSetupGuide onClose={() => setShowSetupGuide(false)} />;
  }

  // Show error state if there's an error
  if (state.error) {
    return renderErrorState();
  }

  // Show appropriate step
  if (state.isConnected) {
    return renderChannelsStep();
  }
  
  if (state.isConfigured) {
    return renderAuthenticateStep();
  }
  
  return renderConfigureStep();
};