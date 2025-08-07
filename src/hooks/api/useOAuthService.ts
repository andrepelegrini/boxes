import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oauthApi } from '../../lib/axios';

// Types
interface OAuthUrlRequest {
  provider: string;
  redirect_uri: string;
}

interface OAuthUrlResponse {
  auth_url: string;
  state: string;
}

interface TokenExchangeRequest {
  provider: string;
  code: string;
  redirect_uri: string;
}

interface TokenVerifyRequest {
  token: string;
}

interface TokenVerifyResponse {
  valid: boolean;
  data?: any;
  error?: string;
}

interface OAuthTokenData {
  provider: string;
  access_token: string;
  refresh_token?: string;
  team_id?: string;
  team_name?: string;
  user_id?: string;
  scope?: string;
}

// Health check for OAuth service
export function useOAuthServiceHealth() {
  return useQuery({
    queryKey: ['oauth-service', 'health'],
    queryFn: async () => {
      const response = await oauthApi.get('/health');
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });
}

// Generate OAuth URL
export function useGenerateOAuthUrl() {
  return useMutation({
    mutationFn: async (request: OAuthUrlRequest) => {
      const response = await oauthApi.post('/api/oauth/generate-url', request);
      return response.data as OAuthUrlResponse;
    },
  });
}

// Exchange OAuth code for tokens
export function useExchangeOAuthCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: TokenExchangeRequest) => {
      const response = await oauthApi.post('/api/oauth/exchange-code', request);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Cache the token data
      if (data.access_token) {
        queryClient.setQueryData(
          ['oauth-service', 'tokens', variables.provider],
          data
        );
      }
    },
  });
}

// Verify token
export function useVerifyToken() {
  return useMutation({
    mutationFn: async (request: TokenVerifyRequest) => {
      const response = await oauthApi.post('/api/auth/verify', request);
      return response.data as TokenVerifyResponse;
    },
  });
}

// Refresh token
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await oauthApi.post('/api/auth/refresh', { token });
      return response.data.token as string;
    },
    onSuccess: (newToken, oldToken) => {
      // Update cached token
      queryClient.setQueriesData(
        { queryKey: ['oauth-service', 'tokens'] },
        (oldData: any) => {
          if (oldData?.access_token === oldToken) {
            return { ...oldData, access_token: newToken };
          }
          return oldData;
        }
      );
    },
  });
}

// Get stored tokens
export function useStoredTokens(provider: string, identifier: string, authToken: string, enabled = true) {
  return useQuery({
    queryKey: ['oauth-service', 'tokens', provider, identifier],
    queryFn: async () => {
      const response = await oauthApi.get(`/api/auth/tokens/${provider}/${identifier}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      return response.data.tokens as OAuthTokenData;
    },
    enabled: enabled && !!provider && !!identifier && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Revoke tokens
export function useRevokeTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      provider, 
      identifier, 
      authToken 
    }: { 
      provider: string; 
      identifier: string; 
      authToken: string; 
    }) => {
      const response = await oauthApi.delete(`/api/auth/tokens/${provider}/${identifier}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      return response.data;
    },
    onSuccess: (_, { provider, identifier }) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: ['oauth-service', 'tokens', provider, identifier] 
      });
    },
  });
}

// Combined OAuth flow hook
export function useOAuthFlow(provider: string, redirectUri: string) {
  const generateUrl = useGenerateOAuthUrl();
  const exchangeCode = useExchangeOAuthCode();
  const verifyToken = useVerifyToken();
  const refreshToken = useRefreshToken();

  const startFlow = async () => {
    const urlResponse = await generateUrl.mutateAsync({
      provider,
      redirect_uri: redirectUri
    });
    
    // Store state for CSRF protection
    sessionStorage.setItem(`oauth_state_${provider}`, urlResponse.state);
    
    // Redirect to OAuth URL
    window.location.href = urlResponse.auth_url;
  };

  const completeFlow = async (code: string, state: string) => {
    // Verify state to prevent CSRF attacks
    const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Clean up stored state
    sessionStorage.removeItem(`oauth_state_${provider}`);

    // Exchange code for tokens
    const tokens = await exchangeCode.mutateAsync({
      provider,
      code,
      redirect_uri: redirectUri
    });

    return tokens;
  };

  const checkTokenValidity = async (token: string) => {
    return verifyToken.mutateAsync({ token });
  };

  const refreshIfNeeded = async (token: string) => {
    const validity = await checkTokenValidity(token);
    
    if (!validity.valid) {
      return refreshToken.mutateAsync(token);
    }
    
    return token;
  };

  return {
    startFlow,
    completeFlow,
    checkTokenValidity,
    refreshIfNeeded,
    isLoading: generateUrl.isPending || exchangeCode.isPending || verifyToken.isPending || refreshToken.isPending,
    error: generateUrl.error || exchangeCode.error || verifyToken.error || refreshToken.error,
    reset: () => {
      generateUrl.reset();
      exchangeCode.reset();
      verifyToken.reset();
      refreshToken.reset();
    }
  };
}

// Hook for managing multiple OAuth providers
export function useMultiProviderOAuth() {
  const queryClient = useQueryClient();

  const getProviderTokens = (provider: string, identifier: string, authToken: string) => {
    return queryClient.getQueryData(['oauth-service', 'tokens', provider, identifier]) as OAuthTokenData | undefined;
  };

  const setProviderTokens = (provider: string, identifier: string, tokens: OAuthTokenData) => {
    queryClient.setQueryData(['oauth-service', 'tokens', provider, identifier], tokens);
  };

  const removeProviderTokens = (provider: string, identifier: string) => {
    queryClient.removeQueries({ queryKey: ['oauth-service', 'tokens', provider, identifier] });
  };

  const getAllCachedTokens = () => {
    const cache = queryClient.getQueryCache();
    const tokenQueries = cache.findAll({ queryKey: ['oauth-service', 'tokens'] });
    
    return tokenQueries.reduce((acc, query) => {
      const [, , provider, identifier] = query.queryKey;
      if (provider && identifier && query.state.data) {
        acc[`${provider}:${identifier}`] = query.state.data;
      }
      return acc;
    }, {} as Record<string, OAuthTokenData>);
  };

  return {
    getProviderTokens,
    setProviderTokens,
    removeProviderTokens,
    getAllCachedTokens,
  };
}

// Auto-refresh token hook
export function useAutoRefreshToken(token: string, provider: string, refreshInterval = 55 * 60 * 1000) {
  const refreshToken = useRefreshToken();
  const verifyToken = useVerifyToken();

  return useQuery({
    queryKey: ['oauth-service', 'auto-refresh', provider, token],
    queryFn: async () => {
      // Check if token is still valid
      const validity = await verifyToken.mutateAsync({ token });
      
      if (!validity.valid) {
        // Token is invalid, try to refresh
        return refreshToken.mutateAsync(token);
      }
      
      return token; // Token is still valid
    },
    enabled: !!token,
    refetchInterval: refreshInterval, // Refresh 5 minutes before expiry
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// Batch token operations
export function useBatchTokenOperations() {
  const verifyToken = useVerifyToken();
  const refreshToken = useRefreshToken();

  const verifyMultipleTokens = async (tokens: Array<{ token: string; provider: string }>) => {
    const results = await Promise.allSettled(
      tokens.map(({ token }) => verifyToken.mutateAsync({ token }))
    );

    return tokens.map((tokenData, index) => ({
      ...tokenData,
      valid: results[index].status === 'fulfilled' && (results[index] as any).value.valid,
      error: results[index].status === 'rejected' ? (results[index] as any).reason : null
    }));
  };

  const refreshMultipleTokens = async (tokens: string[]) => {
    const results = await Promise.allSettled(
      tokens.map(token => refreshToken.mutateAsync(token))
    );

    return tokens.map((token, index) => ({
      originalToken: token,
      newToken: results[index].status === 'fulfilled' ? (results[index] as any).value : null,
      error: results[index].status === 'rejected' ? (results[index] as any).reason : null
    }));
  };

  return {
    verifyMultipleTokens,
    refreshMultipleTokens,
    isLoading: verifyToken.isPending || refreshToken.isPending,
  };
}