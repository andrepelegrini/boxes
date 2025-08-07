/**
 * Slack Connection Provider
 * Provides persistent connection state across the entire app
 */

import React from 'react';
import { slackConnectionManager } from '../../modules/slack/services/SlackConnectionManager';
import { listen } from '../../utils/tauri';

interface SlackConnectionProviderProps {
  children: React.ReactNode;
}

export const SlackConnectionProvider: React.FC<SlackConnectionProviderProps> = ({ children }) => {
  // The SlackConnectionManager handles all persistence automatically
  // This provider ensures the manager is initialized when the app starts
  
  React.useEffect(() => {
    // Connection manager auto-loads state on construction
    // This effect ensures it's initialized early
    console.log('🔗 Slack Connection Provider initialized');
    
    let unlistenOAuth: (() => void) | undefined;
    
    // Setup Tauri OAuth callback listener
    const setupOAuthListener = async () => {
      try {
        unlistenOAuth = await listen('slack-oauth-callback', (event: any) => {
          console.log('🔐 Received Tauri OAuth callback:', event);
          const { code } = event.payload;
          
          if (code) {
            console.log('🔐 Processing OAuth callback with code:', code);
            slackConnectionManager.completeAuthentication(code)
              .then(() => {
                console.log('✅ OAuth completed successfully');
              })
              .catch((error) => {
                console.error('❌ OAuth completion failed:', error);
              });
          } else {
            console.error('❌ OAuth callback missing code');
          }
        });
        console.log('🔗 Tauri OAuth callback listener setup complete');
      } catch (error) {
        console.error('❌ Failed to setup OAuth callback listener:', error);
      }
    };
    
    // Auto-handle URL-based OAuth callbacks (fallback)
    const handleOAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state === 'slack_oauth') {
        console.log('🔐 Processing URL OAuth callback...');
        slackConnectionManager.completeAuthentication(code)
          .then(() => {
            console.log('✅ OAuth completed successfully');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((error) => {
            console.error('❌ OAuth completion failed:', error);
          });
      }
    };

    // Setup both listeners
    setupOAuthListener();
    handleOAuthCallback();
    
    // Also listen for URL changes (in case of SPA navigation)
    window.addEventListener('popstate', handleOAuthCallback);
    
    return () => {
      window.removeEventListener('popstate', handleOAuthCallback);
      unlistenOAuth?.();
    };
  }, []);

  return <>{children}</>;
};