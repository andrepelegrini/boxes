/**
 * Centralized Connection State Manager
 * Manages persistent connection states for Gemini, Slack, and WhatsApp
 * Checks connection status on app startup and provides unified state
 */

import { slackConnectionManager } from '../modules/slack/services/SlackConnectionManager';
import { invoke } from '../utils/tauri';

export interface ServiceConnectionState {
  isConnected: boolean;
  isConfigured: boolean;
  displayName?: string;
  lastConnected?: string;
  error?: string;
  canDisconnect: boolean;
  canEdit: boolean;
}

export interface AllConnectionStates {
  gemini: ServiceConnectionState;
  slack: ServiceConnectionState;
}

class ConnectionStateManager {
  private static instance: ConnectionStateManager;
  private initialized = false;
  private connectionStates: AllConnectionStates = {
    gemini: {
      isConnected: false,
      isConfigured: false,
      canDisconnect: false,
      canEdit: false,
    },
    slack: {
      isConnected: false,
      isConfigured: false,
      canDisconnect: false,
      canEdit: false,
    },
  };

  private listeners: Set<(states: AllConnectionStates) => void> = new Set();

  private constructor() {}

  static getInstance(): ConnectionStateManager {
    if (!ConnectionStateManager.instance) {
      ConnectionStateManager.instance = new ConnectionStateManager();
    }
    return ConnectionStateManager.instance;
  }

  // Subscribe to connection state changes
  subscribe(listener: (states: AllConnectionStates) => void): () => void {
    this.listeners.add(listener);
    
    // Immediate callback with current state
    listener(this.connectionStates);
    
    // Ensure initialization happens in background
    this.ensureInitialized().then(() => {
      listener(this.connectionStates);
    });
    
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.connectionStates));
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    
    await this.checkAllConnectionStates();
    this.initialized = true;
  }

  // Check all connection states on startup
  async checkAllConnectionStates(): Promise<AllConnectionStates> {
    
    // Check connections in parallel for better performance
    const [geminiState, slackState] = await Promise.all([
      this.checkGeminiState(),
      this.checkSlackState(),
    ]);

    this.connectionStates = {
      gemini: geminiState,
      slack: slackState,
    };

    this.notifyListeners();
    
    return this.connectionStates;
  }

  // Check Gemini connection state
  private async checkGeminiState(): Promise<ServiceConnectionState> {
    try {
      // Check if API key exists
      const storedKey = await invoke<string | null>('get_setting', { key: 'gemini_api_key' });
      const fallbackKey = localStorage.getItem('gemini_api_key');
      const apiKey = storedKey || fallbackKey || '';
      
      console.log('🔍 [DEBUG] ConnectionStateManager - Checking Gemini state');
      console.log('🔍 [DEBUG] Tauri stored key:', storedKey ? 'KEY_PRESENT' : 'NO_KEY');
      console.log('🔍 [DEBUG] LocalStorage fallback key:', fallbackKey ? 'KEY_PRESENT' : 'NO_KEY');
      console.log('🔍 [DEBUG] Final API key for validation:', apiKey ? 'KEY_PRESENT' : 'NO_KEY');

      // More strict validation - reject placeholder values
      const isValidKey = !!apiKey && 
                        apiKey.startsWith('AIzaSy') && 
                        apiKey.length >= 30 &&
                        !apiKey.includes('your_google_api_key_here') &&
                        !apiKey.includes('placeholder');
      
      console.log('🔍 [DEBUG] Key validation result:', isValidKey);
      
      if (!isValidKey) {
        return {
          isConnected: false,
          isConfigured: false,
          canDisconnect: false,
          canEdit: false,
        };
      }

      // If configured with valid key, show as connected but validate on actual use
      return {
        isConnected: true,
        isConfigured: true,
        displayName: 'Gemini AI',
        canDisconnect: true,
        canEdit: true,
      };
    } catch (error) {
      return {
        isConnected: false,
        isConfigured: false,
        error: 'Failed to check Gemini connection',
        canDisconnect: false,
        canEdit: false,
      };
    }
  }

  // Check Slack connection state
  private async checkSlackState(): Promise<ServiceConnectionState> {
    try {
      // Use the existing SlackConnectionManager to get initialized state
      const slackState = await slackConnectionManager.getInitializedState();
      
      return {
        isConnected: slackState.isConnected,
        isConfigured: slackState.isConfigured,
        displayName: slackState.teamName || 'Slack',
        lastConnected: slackState.lastConnected,
        error: slackState.error,
        canDisconnect: slackState.isConnected || slackState.isConfigured,
        canEdit: slackState.isConfigured,
      };
    } catch (error) {
      return {
        isConnected: false,
        isConfigured: false,
        error: 'Failed to check Slack connection',
        canDisconnect: false,
        canEdit: false,
      };
    }
  }


  // Get current states synchronously
  getStates(): AllConnectionStates {
    return { ...this.connectionStates };
  }

  // Force refresh all connection states
  async refreshAllStates(): Promise<AllConnectionStates> {
    return await this.checkAllConnectionStates();
  }

  // Individual service refresh methods
  async refreshGeminiState(): Promise<ServiceConnectionState> {
    const geminiState = await this.checkGeminiState();
    this.connectionStates.gemini = geminiState;
    this.notifyListeners();
    return geminiState;
  }

  async refreshSlackState(): Promise<ServiceConnectionState> {
    const slackState = await this.checkSlackState();
    this.connectionStates.slack = slackState;
    this.notifyListeners();
    return slackState;
  }


  // Disconnect methods
  async disconnectGemini(): Promise<void> {
    try {
      await invoke('store_setting', { key: 'gemini_api_key', value: '' });
      localStorage.removeItem('gemini_api_key');
      await this.refreshGeminiState();
    } catch (error) {
      throw error;
    }
  }

  async disconnectSlack(): Promise<void> {
    try {
      await slackConnectionManager.disconnect();
      await this.refreshSlackState();
    } catch (error) {
      throw error;
    }
  }

}

// Export singleton instance
export const connectionStateManager = ConnectionStateManager.getInstance();