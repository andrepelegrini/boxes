import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';

export interface AITaskConsentSettings {
  hasConsented: boolean;
  allowAutomaticAnalysis: boolean;
  allowBackgroundDiscovery: boolean;
  consentTimestamp?: string;
  consentVersion: string;
}

const DEFAULT_CONSENT_SETTINGS: AITaskConsentSettings = {
  hasConsented: false,
  allowAutomaticAnalysis: false,
  allowBackgroundDiscovery: false,
  consentVersion: '1.0'
};

const CONSENT_STORAGE_KEY = 'ai_task_consent_settings';
const CURRENT_CONSENT_VERSION = '1.0';

export interface UseAITaskConsentReturn {
  consentSettings: AITaskConsentSettings;
  hasValidConsent: boolean;
  needsConsentUpdate: boolean;
  
  // Actions
  grantConsent: (settings: Partial<AITaskConsentSettings>) => void;
  revokeConsent: () => void;
  updateConsentSettings: (settings: Partial<AITaskConsentSettings>) => void;
  
  // Checks
  canUseAutomaticAnalysis: () => boolean;
  canUseBackgroundDiscovery: () => boolean;
}

export function useAITaskConsentState(): UseAITaskConsentReturn {
  const [consentSettings, setConsentSettings] = useState<AITaskConsentSettings>(() => {
    const stored = loadFromLocalStorage(CONSENT_STORAGE_KEY, DEFAULT_CONSENT_SETTINGS);
    return { ...DEFAULT_CONSENT_SETTINGS, ...stored };
  });

  // Check if consent is valid and up-to-date
  const hasValidConsent = consentSettings.hasConsented && 
                         consentSettings.consentVersion === CURRENT_CONSENT_VERSION;
  
  const needsConsentUpdate = consentSettings.hasConsented && 
                            consentSettings.consentVersion !== CURRENT_CONSENT_VERSION;

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveToLocalStorage(CONSENT_STORAGE_KEY, consentSettings);
  }, [consentSettings]);

  const grantConsent = useCallback((settings: Partial<AITaskConsentSettings>) => {
    const newSettings: AITaskConsentSettings = {
      ...consentSettings,
      ...settings,
      hasConsented: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: CURRENT_CONSENT_VERSION,
    };
    setConsentSettings(newSettings);
  }, [consentSettings]);

  const revokeConsent = useCallback(() => {
    setConsentSettings({
      ...DEFAULT_CONSENT_SETTINGS,
      hasConsented: false,
      consentVersion: CURRENT_CONSENT_VERSION,
    });
  }, []);

  const updateConsentSettings = useCallback((settings: Partial<AITaskConsentSettings>) => {
    if (!hasValidConsent) {
      console.warn('Cannot update consent settings without valid consent');
      return;
    }
    
    setConsentSettings(prev => ({
      ...prev,
      ...settings,
    }));
  }, [hasValidConsent]);

  const canUseAutomaticAnalysis = useCallback(() => {
    return hasValidConsent && consentSettings.allowAutomaticAnalysis;
  }, [hasValidConsent, consentSettings.allowAutomaticAnalysis]);

  const canUseBackgroundDiscovery = useCallback(() => {
    return hasValidConsent && consentSettings.allowBackgroundDiscovery;
  }, [hasValidConsent, consentSettings.allowBackgroundDiscovery]);

  return {
    consentSettings,
    hasValidConsent,
    needsConsentUpdate,
    grantConsent,
    revokeConsent,
    updateConsentSettings,
    canUseAutomaticAnalysis,
    canUseBackgroundDiscovery,
  };
}