
// HTTP client for Slack OAuth when Tauri commands fail
export interface SlackOAuthHttpResponse {
  ok: boolean;
  access_token?: string;
  team?: {
    id: string;
    name: string;
  };
  error?: string;
}

export async function exchangeCodeHttpFallback(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<SlackOAuthHttpResponse> {
  console.log('🌐 Usando HTTP fallback para OAuth com:', {
    codePreview: code?.substring(0, 20) + '...',
    clientIdPreview: clientId?.substring(0, 20) + '...',
    clientSecretPreview: clientSecret ? 'xoxp-****' : 'ausente',
    redirectUri,
    codeLength: code?.length,
    timestamp: new Date().toISOString()
  });
  
  try {
    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    };
    
    console.log('🌐 Enviando request para Slack OAuth:', {
      url: 'https://slack.com/api/oauth.v2.access',
      method: 'POST',
      bodyKeys: Object.keys(requestBody),
      redirectUri,
      codeValid: !!code && code.length > 0
    });
    
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody),
    });

    console.log('🌐 Resposta HTTP recebida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries([...response.headers.entries()])
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      console.error('OAuth HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        responseData: errorText
      });
      
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('🌐 Dados da resposta OAuth:', {
      ok: data.ok,
      hasAccessToken: !!data.access_token,
      accessTokenPreview: data.access_token?.substring(0, 15) + '...',
      hasTeam: !!data.team,
      teamName: data.team?.name,
      teamId: data.team?.id,
      error: data.error,
      fullDataKeys: Object.keys(data)
    });
    
    const result = {
      ok: data.ok || false,
      access_token: data.access_token,
      team: data.team,
      error: data.error || (!data.ok ? 'Unknown OAuth error' : undefined),
    };
    
    console.log('🌐 Resultado final do HTTP fallback:', {
      resultOk: result.ok,
      hasAccessToken: !!result.access_token,
      hasTeam: !!result.team,
      error: result.error
    });
    
    return result;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error during Slack OAuth:', {
        isOnline: navigator.onLine,
        error: error.message
      });
    } else {
      console.error('Slack OAuth integration error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : error
      });
    }
    
    throw error;
  }
}