import { logger } from '../utils/logger.js';

class CredentialManager {
  constructor() {
    this.credentials = {
      slack: {
        clientId: process.env.SLACK_CLIENT_ID || null,
        clientSecret: process.env.SLACK_CLIENT_SECRET || null
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || null
      }
    };
  }

  // Get credentials for a specific provider
  getCredentials(provider) {
    const creds = this.credentials[provider];
    if (!creds) {
      return null;
    }
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret
    };
  }

  // Check if credentials are available for a provider
  hasCredentials(provider) {
    const creds = this.getCredentials(provider);
    return creds && creds.clientId && creds.clientSecret;
  }

  // Update credentials for a provider
  updateCredentials(provider, clientId, clientSecret) {
    if (!this.credentials[provider]) {
      this.credentials[provider] = {};
    }
    
    this.credentials[provider].clientId = clientId;
    this.credentials[provider].clientSecret = clientSecret;
    
    // Also update process.env for backward compatibility
    if (provider === 'slack') {
      process.env.SLACK_CLIENT_ID = clientId;
      process.env.SLACK_CLIENT_SECRET = clientSecret;
    } else if (provider === 'google') {
      process.env.GOOGLE_CLIENT_ID = clientId;
      process.env.GOOGLE_CLIENT_SECRET = clientSecret;
    }
    
    logger.info(`[CredentialManager] Credenciais atualizadas para ${provider}`, {
      clientId: clientId?.substring(0, 8) + '...',
      hasSecret: !!clientSecret
    });
  }

  // Get all available credentials
  getAllCredentials() {
    return this.credentials;
  }

  // Clear credentials for a provider
  clearCredentials(provider) {
    if (this.credentials[provider]) {
      this.credentials[provider] = { clientId: null, clientSecret: null };
    }
    
    // Also clear process.env
    if (provider === 'slack') {
      process.env.SLACK_CLIENT_ID = null;
      process.env.SLACK_CLIENT_SECRET = null;
    } else if (provider === 'google') {
      process.env.GOOGLE_CLIENT_ID = null;
      process.env.GOOGLE_CLIENT_SECRET = null;
    }
    
    logger.info(`[CredentialManager] Credenciais limpas para ${provider}`);
  }
}

// Export singleton instance
export const credentialManager = new CredentialManager(); 