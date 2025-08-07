use serde::{Deserialize, Serialize};
use reqwest;
use log::{info, warn, error, debug};
use thiserror::Error;
use std::time::Duration;

#[derive(Error, Debug)]
pub enum SlackServiceError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Slack API error: {0}")]
    SlackApiError(String),
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
}

// Request/Response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackChannel {
    pub id: String,
    pub name: String,
    pub is_member: bool,
    pub is_private: bool,
    pub topic: String,
    pub purpose: String,
    pub num_members: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackMessage {
    pub ts: String,
    pub user: String,
    pub text: String,
    pub channel: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thread_ts: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bot_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtype: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelHistory {
    pub messages: Vec<SlackMessage>,
    pub has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_metadata: Option<ResponseMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackTeam {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub icon: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackUser {
    pub id: String,
    pub name: String,
    pub real_name: String,
    pub display_name: String,
    pub email: String,
    pub is_bot: bool,
    pub is_admin: bool,
    pub is_owner: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRequest {
    pub text: Option<String>,
    pub blocks: Option<serde_json::Value>,
    pub thread_ts: Option<String>,
    pub reply_broadcast: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    #[serde(rename = "channelName")]
    pub channel_name: Option<String>,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzeRequest {
    pub messages: Vec<SlackMessage>,
    #[serde(rename = "analysisType")]
    pub analysis_type: Option<String>,
    #[serde(rename = "projectContext")]
    pub project_context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_metadata: Option<ResponseMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ts: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
    #[serde(rename = "jobId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_id_alt: Option<String>,
    #[serde(rename = "messagesCount")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "team_name")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_name: Option<String>,
    #[serde(rename = "connected_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connected_at: Option<String>,
}

#[derive(Clone)]
pub struct SlackServiceClient {
    base_url: String,
    client: reqwest::Client,
}

impl SlackServiceClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://localhost:3005".to_string());
        
        info!("🚀 Initializing Slack Service Client at {}", base_url);
        
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        Self { base_url, client }
    }
    
    pub async fn health_check(&self) -> Result<bool, SlackServiceError> {
        debug!("💓 Performing Slack service health check");
        
        let url = format!("{}/health", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ Slack service health check passed");
                    Ok(true)
                } else {
                    warn!("⚠️ Slack service health check failed: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                error!("❌ Slack service health check request failed: {}", e);
                Err(SlackServiceError::Http(e))
            }
        }
    }
    
    pub async fn test_connection(&self) -> Result<SlackTeam, SlackServiceError> {
        info!("🔗 Testing Slack connection");
        
        let url = format!("{}/api/slack/test", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        if response.status().is_success() {
            let service_response: ServiceResponse<serde_json::Value> = response.json().await
                .map_err(|e| SlackServiceError::InvalidResponse(e.to_string()))?;
            
            if service_response.success {
                info!("✅ Slack connection test successful");
                Ok(SlackTeam {
                    id: "unknown".to_string(),
                    name: service_response.team_name.unwrap_or_else(|| "Unknown Team".to_string()),
                    domain: "unknown".to_string(),
                    icon: None,
                })
            } else {
                let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                error!("❌ Slack connection test failed: {}", error_msg);
                Err(SlackServiceError::SlackApiError(error_msg))
            }
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Slack connection test failed: {}", error_text);
            Err(SlackServiceError::ServiceUnavailable(error_text))
        }
    }
    
    pub async fn get_channels(&self) -> Result<Vec<SlackChannel>, SlackServiceError> {
        info!("📋 Fetching Slack channels");
        
        let url = format!("{}/api/slack/channels", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<Vec<SlackChannel>>(response, "channels").await
    }
    
    pub async fn get_channel_history(&self, channel_id: &str, options: Option<ChannelHistoryOptions>) -> Result<ChannelHistory, SlackServiceError> {
        info!("📜 Fetching channel history for: {}", channel_id);
        
        let mut url = format!("{}/api/slack/channels/{}/history", self.base_url, channel_id);
        
        if let Some(opts) = options {
            let mut params = Vec::new();
            if let Some(limit) = opts.limit {
                params.push(format!("limit={}", limit));
            }
            if let Some(cursor) = opts.cursor {
                params.push(format!("cursor={}", cursor));
            }
            if let Some(oldest) = opts.oldest {
                params.push(format!("oldest={}", oldest));
            }
            if let Some(latest) = opts.latest {
                params.push(format!("latest={}", latest));
            }
            
            if !params.is_empty() {
                url.push('?');
                url.push_str(&params.join("&"));
            }
        }
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_channel_history_response(response).await
    }
    
    pub async fn join_channel(&self, channel_id: &str) -> Result<SlackChannel, SlackServiceError> {
        info!("🚪 Joining channel: {}", channel_id);
        
        let url = format!("{}/api/slack/channels/{}/join", self.base_url, channel_id);
        
        let response = self.client
            .post(&url)
            .send()
            .await?;
        
        self.handle_response::<SlackChannel>(response, "channel").await
    }
    
    pub async fn send_message(&self, channel_id: &str, request: MessageRequest) -> Result<String, SlackServiceError> {
        info!("💬 Sending message to channel: {}", channel_id);
        
        let url = format!("{}/api/slack/channels/{}/message", self.base_url, channel_id);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let service_response: ServiceResponse<serde_json::Value> = response.json().await
                .map_err(|e| SlackServiceError::InvalidResponse(e.to_string()))?;
            
            if service_response.success {
                info!("✅ Message sent successfully");
                Ok(service_response.ts.unwrap_or_else(|| "unknown".to_string()))
            } else {
                let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                error!("❌ Failed to send message: {}", error_msg);
                Err(SlackServiceError::SlackApiError(error_msg))
            }
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to send message: {}", error_text);
            Err(SlackServiceError::ServiceUnavailable(error_text))
        }
    }
    
    pub async fn get_team_info(&self) -> Result<SlackTeam, SlackServiceError> {
        info!("🏢 Fetching team information");
        
        let url = format!("{}/api/slack/team", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<SlackTeam>(response, "team").await
    }
    
    pub async fn get_user_info(&self, user_id: &str) -> Result<SlackUser, SlackServiceError> {
        info!("👤 Fetching user information for: {}", user_id);
        
        let url = format!("{}/api/slack/users/{}", self.base_url, user_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<SlackUser>(response, "user").await
    }
    
    pub async fn sync_channel(&self, channel_id: &str, request: SyncRequest) -> Result<String, SlackServiceError> {
        info!("🔄 Syncing channel: {}", channel_id);
        
        let url = format!("{}/api/slack/sync/{}", self.base_url, channel_id);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let service_response: ServiceResponse<serde_json::Value> = response.json().await
                .map_err(|e| SlackServiceError::InvalidResponse(e.to_string()))?;
            
            if service_response.success {
                info!("✅ Channel sync queued successfully");
                let job_id = service_response.job_id
                    .or(service_response.job_id_alt)
                    .unwrap_or_else(|| "unknown".to_string());
                Ok(job_id)
            } else {
                let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                error!("❌ Failed to queue channel sync: {}", error_msg);
                Err(SlackServiceError::SlackApiError(error_msg))
            }
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to queue channel sync: {}", error_text);
            Err(SlackServiceError::ServiceUnavailable(error_text))
        }
    }
    
    pub async fn analyze_messages(&self, request: AnalyzeRequest) -> Result<String, SlackServiceError> {
        info!("🤖 Analyzing {} messages", request.messages.len());
        
        let url = format!("{}/api/slack/analyze", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            let service_response: ServiceResponse<serde_json::Value> = response.json().await
                .map_err(|e| SlackServiceError::InvalidResponse(e.to_string()))?;
            
            if service_response.success {
                info!("✅ Message analysis queued successfully");
                let job_id = service_response.job_id
                    .or(service_response.job_id_alt)
                    .unwrap_or_else(|| "unknown".to_string());
                Ok(job_id)
            } else {
                let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                error!("❌ Failed to queue message analysis: {}", error_msg);
                Err(SlackServiceError::SlackApiError(error_msg))
            }
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to queue message analysis: {}", error_text);
            Err(SlackServiceError::ServiceUnavailable(error_text))
        }
    }
    
    async fn handle_response<T>(&self, response: reqwest::Response, field: &str) -> Result<T, SlackServiceError>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let status = response.status();
        let response_text = response.text().await?;
        
        if status.is_success() {
            match serde_json::from_str::<ServiceResponse<T>>(&response_text) {
                Ok(service_response) => {
                    if service_response.success {
                        // Use dynamic field access based on the field parameter
                        let data = match field {
                            "channels" => service_response.channels,
                            "channel" => service_response.channel,
                            "team" => service_response.team,
                            "user" => service_response.user,
                            _ => None,
                        };
                        
                        if let Some(data) = data {
                            info!("✅ Slack service request successful");
                            Ok(data)
                        } else {
                            error!("❌ Slack service returned success but no {} data", field);
                            Err(SlackServiceError::InvalidResponse(format!("No {} data in response", field)))
                        }
                    } else {
                        let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                        error!("❌ Slack service returned error: {}", error_msg);
                        Err(SlackServiceError::SlackApiError(error_msg))
                    }
                }
                Err(e) => {
                    error!("❌ Failed to parse Slack service response: {}", e);
                    error!("Response text: {}", response_text);
                    Err(SlackServiceError::InvalidResponse(e.to_string()))
                }
            }
        } else {
            error!("❌ Slack service request failed with status: {}", status);
            error!("Response: {}", response_text);
            Err(SlackServiceError::ServiceUnavailable(format!("HTTP {}: {}", status, response_text)))
        }
    }
    
    async fn handle_channel_history_response(&self, response: reqwest::Response) -> Result<ChannelHistory, SlackServiceError> {
        let status = response.status();
        let response_text = response.text().await?;
        
        if status.is_success() {
            match serde_json::from_str::<ServiceResponse<Vec<SlackMessage>>>(&response_text) {
                Ok(service_response) => {
                    if service_response.success {
                        let messages = service_response.messages.unwrap_or_default();
                        let has_more = service_response.has_more.unwrap_or(false);
                        let response_metadata = service_response.response_metadata;
                        
                        info!("✅ Channel history fetched successfully: {} messages", messages.len());
                        Ok(ChannelHistory {
                            messages,
                            has_more,
                            response_metadata,
                        })
                    } else {
                        let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                        error!("❌ Slack service returned error: {}", error_msg);
                        Err(SlackServiceError::SlackApiError(error_msg))
                    }
                }
                Err(e) => {
                    error!("❌ Failed to parse channel history response: {}", e);
                    error!("Response text: {}", response_text);
                    Err(SlackServiceError::InvalidResponse(e.to_string()))
                }
            }
        } else {
            error!("❌ Channel history request failed with status: {}", status);
            error!("Response: {}", response_text);
            Err(SlackServiceError::ServiceUnavailable(format!("HTTP {}: {}", status, response_text)))
        }
    }
}

#[derive(Debug, Clone)]
pub struct ChannelHistoryOptions {
    pub limit: Option<u32>,
    pub cursor: Option<String>,
    pub oldest: Option<String>,
    pub latest: Option<String>,
}