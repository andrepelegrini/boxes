/**
 * Gerenciamento seguro de credenciais do Slack usando APENAS macOS Keychain
 * Todas as credenciais são armazenadas de forma segura no Keychain do sistema
 */

import { invoke } from './tauri';
import { slackCredentialEvents } from './slackCredentialEvents';

export interface SlackCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  teamId?: string;
  teamName?: string;
  userId?: string;
  userName?: string;
}

/**
 * Armazena credenciais básicas do Slack no Keychain
 */
export async function storeSlackCredentialsSecure(clientId: string, clientSecret: string): Promise<void> {
  await invoke('store_slack_credentials', { 
    clientId: clientId, 
    clientSecret: clientSecret 
  });
  
  // Notify listeners of credential change
  slackCredentialEvents.emitCredentialUpdate();
}

/**
 * Recupera credenciais do Slack do Keychain
 */
export async function getSlackCredentialsSecure(): Promise<SlackCredentials | null> {
  const keychainCreds = await invoke('get_slack_credentials') as SlackCredentials | null;
  return keychainCreds;
}

/**
 * Atualiza o access token após OAuth no Keychain
 */
export async function updateSlackAccessTokenSecure(
  accessToken: string, 
  teamId?: string, 
  teamName?: string
): Promise<void> {
  await invoke('update_slack_access_token', {
    accessToken: accessToken,
    teamId: teamId || '',
    teamName: teamName || ''
  });
  
  // Notify listeners of OAuth completion
  slackCredentialEvents.emitCredentialUpdate();
}

/**
 * Remove todas as credenciais do Slack do Keychain
 */
export async function deleteSlackCredentialsSecure(): Promise<void> {
  await invoke('delete_slack_credentials');
  
  // Notify listeners of credential deletion
  slackCredentialEvents.emitCredentialDelete();
}

/**
 * Verifica se o Slack está configurado no Keychain
 */
export async function isSlackConfiguredSecure(): Promise<{
  hasCredentials: boolean;
  hasAccessToken: boolean;
  teamName?: string | undefined;
}> {
  const keychainCreds = await invoke('get_slack_credentials') as SlackCredentials | null;
  if (keychainCreds) {
    return {
      hasCredentials: !!keychainCreds.client_id && !!keychainCreds.client_secret,
      hasAccessToken: !!keychainCreds.access_token,
      teamName: keychainCreds.team_name
    };
  }
  
  return {
    hasCredentials: false,
    hasAccessToken: false,
    teamName: undefined
  };
}

/**
 * Obtém apenas as credenciais básicas (clientId e clientSecret) do Keychain
 */
export async function getSlackBasicCredentials(): Promise<Pick<SlackCredentials, 'clientId' | 'clientSecret'> | null> {
  const credentials = await getSlackCredentialsSecure();
  if (!credentials) return null;
  
  return {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret
  };
}

/**
 * Obtém apenas as credenciais de autenticação (tokens) do Keychain
 */
export async function getSlackAuthCredentials(): Promise<{
  accessToken?: string | undefined;
  refreshToken?: string | undefined;
} | null> {
  const credentials = await getSlackCredentialsSecure();
  if (!credentials) return null;
  
  return {
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken
  };
}

/**
 * Valida se as credenciais estão completas para uso
 */
export function validateSlackCredentials(credentials: SlackCredentials | null): boolean {
  if (!credentials) return false;
  
  return !!(
    credentials.clientId &&
    credentials.clientSecret &&
    (credentials.accessToken || credentials.refreshToken)
  );
}

/**
 * Limpa qualquer resíduo de localStorage (função de migração/limpeza)
 */
export function clearLegacyLocalStorageCredentials(): void {
  try {
    // Remove any old localStorage entries
    const keysToRemove = [
      'slack_credentials_secure',
      'slack_client_id',
      'slack_client_secret', 
      'slack_access_token',
      'slack_team_id',
      'slack_team_name'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 Cleared legacy localStorage credentials');
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}