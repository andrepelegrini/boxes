use serde::{Deserialize, Serialize};
use reqwest;
use log::{info, warn, error, debug};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OAuthServiceError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    #[error("Service error: {0}")]
    ServiceError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthUrlRequest {
    pub provider: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthUrlResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenExchangeRequest {
    pub provider: String,
    pub code: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenVerifyRequest {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenVerifyResponse {
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokenData {
    pub provider: String,
    pub access_token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

#[derive(Clone)]
pub struct OAuthServiceClient {
    base_url: String,
    client: reqwest::Client,
}

impl OAuthServiceClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| {
            // Use HTTPS for local development
            "https://localhost:3003".to_string()
        });
        
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(true) // Allow self-signed certificates for local development
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            base_url,
            client,
        }
    }
    
    pub async fn health_check(&self) -> Result<bool, OAuthServiceError> {
        debug!("💓 Performing OAuth service health check");
        
        let url = format!("{}/health", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ OAuth service health check passed");
                    Ok(true)
                } else {
                    warn!("⚠️ OAuth service health check failed: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                error!("❌ OAuth service health check request failed: {}", e);
                Err(OAuthServiceError::Http(e))
            }
        }
    }
    
    pub async fn generate_oauth_url(&self, provider: &str, redirect_uri: &str) -> Result<OAuthUrlResponse, OAuthServiceError> {
        info!("🔗 Generating OAuth URL for provider: {}", provider);
        
        let url = format!("{}/api/oauth/generate-url", self.base_url);
        
        let request = OAuthUrlRequest {
            provider: provider.to_string(),
            redirect_uri: redirect_uri.to_string(),
        };
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let oauth_response: OAuthUrlResponse = response.json().await
                .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
            
            info!("✅ OAuth URL generated successfully");
            Ok(oauth_response)
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to generate OAuth URL: {}", error_text);
            Err(OAuthServiceError::ServiceError(error_text))
        }
    }
    
    pub async fn exchange_code(&self, provider: &str, code: &str, redirect_uri: &str) -> Result<serde_json::Value, OAuthServiceError> {
        info!("🔄 Exchanging OAuth code for tokens");
        
        let url = format!("{}/api/oauth/exchange-code", self.base_url);
        
        let request = TokenExchangeRequest {
            provider: provider.to_string(),
            code: code.to_string(),
            redirect_uri: redirect_uri.to_string(),
        };
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let result: serde_json::Value = response.json().await
                .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
            
            info!("✅ OAuth code exchange successful");
            Ok(result)
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ OAuth code exchange failed: {}", error_text);
            Err(OAuthServiceError::AuthenticationFailed(error_text))
        }
    }
    
    pub async fn verify_token(&self, token: &str) -> Result<TokenVerifyResponse, OAuthServiceError> {
        debug!("🔍 Verifying OAuth token");
        
        let url = format!("{}/api/auth/verify", self.base_url);
        
        let request = TokenVerifyRequest {
            token: token.to_string(),
        };
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() || response.status() == 401 {
            let verify_response: TokenVerifyResponse = response.json().await
                .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
            
            if verify_response.valid {
                info!("✅ Token verification successful");
            } else {
                warn!("⚠️ Token verification failed: {:?}", verify_response.error);
            }
            
            Ok(verify_response)
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Token verification request failed: {}", error_text);
            Err(OAuthServiceError::ServiceError(error_text))
        }
    }
    
    pub async fn refresh_token(&self, token: &str) -> Result<String, OAuthServiceError> {
        info!("🔄 Refreshing OAuth token");
        
        let url = format!("{}/api/auth/refresh", self.base_url);
        
        let request = TokenVerifyRequest {
            token: token.to_string(),
        };
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let result: serde_json::Value = response.json().await
                .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
            
            if let Some(new_token) = result["token"].as_str() {
                info!("✅ Token refresh successful");
                Ok(new_token.to_string())
            } else {
                error!("❌ No token in refresh response");
                Err(OAuthServiceError::InvalidResponse("No token in response".to_string()))
            }
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Token refresh failed: {}", error_text);
            Err(OAuthServiceError::AuthenticationFailed(error_text))
        }
    }
    
    pub async fn get_stored_tokens(&self, provider: &str, identifier: &str, auth_token: &str) -> Result<OAuthTokenData, OAuthServiceError> {
        info!("📦 Retrieving stored tokens for {}/{}", provider, identifier);
        
        let url = format!("{}/api/auth/tokens/{}/{}", self.base_url, provider, identifier);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send()
            .await?;
        
        if response.status().is_success() {
            let result: serde_json::Value = response.json().await
                .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
            
            if let Some(tokens) = result["tokens"].as_object() {
                let token_data: OAuthTokenData = serde_json::from_value(serde_json::Value::Object(tokens.clone()))
                    .map_err(|e| OAuthServiceError::InvalidResponse(e.to_string()))?;
                
                info!("✅ Retrieved stored tokens successfully");
                Ok(token_data)
            } else {
                error!("❌ No tokens in response");
                Err(OAuthServiceError::InvalidResponse("No tokens in response".to_string()))
            }
        } else if response.status() == 404 {
            warn!("⚠️ No stored tokens found");
            Err(OAuthServiceError::ServiceError("Tokens not found".to_string()))
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to retrieve tokens: {}", error_text);
            Err(OAuthServiceError::ServiceError(error_text))
        }
    }
    
    pub async fn revoke_tokens(&self, provider: &str, identifier: &str, auth_token: &str) -> Result<(), OAuthServiceError> {
        info!("🗑️ Revoking tokens for {}/{}", provider, identifier);
        
        let url = format!("{}/api/auth/tokens/{}/{}", self.base_url, provider, identifier);
        
        let response = self.client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send()
            .await?;
        
        if response.status().is_success() {
            info!("✅ Tokens revoked successfully");
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to revoke tokens: {}", error_text);
            Err(OAuthServiceError::ServiceError(error_text))
        }
    }
    
    pub async fn configure_credentials(&self, provider: &str, client_id: &str, client_secret: &str) -> Result<(), OAuthServiceError> {
        info!("⚙️ Configuring {} credentials", provider);
        
        let url = format!("{}/api/auth/configure", self.base_url);
        
        let request = serde_json::json!({
            "provider": provider,
            "client_id": client_id,
            "client_secret": client_secret
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            info!("✅ {} credentials configured successfully", provider);
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to configure {} credentials: {}", provider, error_text);
            Err(OAuthServiceError::ServiceError(error_text))
        }
    }
}