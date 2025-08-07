use serde::{Deserialize, Serialize};
use reqwest;
use log::{error};
use thiserror::Error;

// Enhanced logging utility for WhatsApp Service Client
macro_rules! log_info {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

macro_rules! log_warn {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

macro_rules! log_error {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

macro_rules! log_debug {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

// Remove unused error variants
#[derive(Error, Debug)]
pub enum WhatsAppServiceError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Service error: {0}")]
    ServiceError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub last_heartbeat: i64,
    pub consecutive_failures: i32,
    pub last_recovery_attempt: Option<i64>,
    pub gap_count: i32,
    pub monitoring_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppConnectionState {
    pub status: String, // disconnected, connecting, qr_ready, connected, error
    pub qr_code: Option<String>,
    pub connected_since: Option<String>,
    pub last_message_timestamp: Option<i64>,
    pub message_count: i32,
    #[serde(default)]
    pub active_chats: Vec<String>,
    pub health_status: HealthStatus,
    pub last_error: Option<String>,
}

// Struct that matches the actual Node.js service API response
#[derive(Debug, Deserialize)]
struct ServiceStatusResponse {
    pub status: String,
    #[serde(rename = "isReady")]
    pub is_ready: bool,
    pub qr_code: Option<String>,
    pub connected_since: Option<String>,
    pub message_count: i32,
    pub last_error: Option<String>,
    pub health_status: HealthStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppMessage {
    pub id: String,
    pub from: String,
    pub to: Option<String>,
    pub body: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: i64,
    #[serde(rename = "isGroupMsg")]
    pub is_group_msg: bool,
    pub author: Option<String>,
    #[serde(rename = "chatId")]
    pub chat_id: String,
    #[serde(rename = "hasMedia")]
    pub has_media: bool,
    #[serde(rename = "receivedAt")]
    pub received_at: String,
    // Fields for compatibility with existing Tauri code
    pub processed_by_llm: bool,
    pub work_related: Option<bool>,
    pub task_priority: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ServiceResponse<T> {
    pub status: Option<String>,
    pub message: Option<String>,
    pub error: Option<String>,
    #[serde(flatten)]
    pub data: Option<T>,
}

#[derive(Clone)]
pub struct WhatsAppServiceClient {
    base_url: String,
    client: reqwest::Client,
}

impl WhatsAppServiceClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://localhost:3001".to_string());
        
        log_info!("🚀 Initializing WhatsApp Service Client", base_url.clone());
        
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        log_info!("✅ WhatsApp Service Client initialized successfully");
        
        Self { base_url, client }
    }
    
    pub async fn health_check(&self) -> Result<bool, WhatsAppServiceError> {
        log_debug!("💓 Performing health check");
        
        let url = format!("{}/health", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    log_info!("✅ Health check passed");
                    Ok(true)
                } else {
                    log_warn!("⚠️ Health check failed", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                log_error!("❌ Health check request failed", e.to_string());
                Err(WhatsAppServiceError::Http(e))
            }
        }
    }
    
    pub async fn get_status(&self) -> Result<WhatsAppConnectionState, WhatsAppServiceError> {
        log_debug!("📊 Getting WhatsApp connection status");
        
        let url = format!("{}/status", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                log_debug!("📡 Received status response", response.status());
                
                if response.status().is_success() {
                    match response.json::<ServiceStatusResponse>().await {
                        Ok(service_response) => {
                            // Convert ServiceStatusResponse to WhatsAppConnectionState
                            let mut status = WhatsAppConnectionState {
                                status: service_response.status.clone(),
                                qr_code: service_response.qr_code,
                                connected_since: service_response.connected_since.clone(),
                                last_message_timestamp: None,
                                message_count: service_response.message_count,
                                active_chats: vec![], // Default empty
                                health_status: service_response.health_status,
                                last_error: service_response.last_error,
                            };
                            
                            // Convert timestamp strings to unix timestamps for compatibility
                            if let Some(connected_since_str) = &service_response.connected_since {
                                // Try to parse ISO string to timestamp
                                if let Ok(datetime) = chrono::DateTime::parse_from_rfc3339(connected_since_str) {
                                    status.last_message_timestamp = Some(datetime.timestamp());
                                }
                            }
                            
                            log_info!("✅ Status retrieved successfully", status.status.clone());
                            Ok(status)
                        }
                        Err(_e) => {
                            log_error!("❌ Failed to parse status response", _e.to_string());
                            Err(WhatsAppServiceError::InvalidResponse(format!("error decoding response body")))
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Status request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(e) => {
                log_error!("❌ Status request failed", e.to_string());
                Err(WhatsAppServiceError::Http(e))
            }
        }
    }
    
    pub async fn connect(&self) -> Result<WhatsAppConnectionState, WhatsAppServiceError> {
        self.connect_with_lookback(None).await
    }

    pub async fn connect_with_lookback(&self, lookback_days: Option<i32>) -> Result<WhatsAppConnectionState, WhatsAppServiceError> {
        log_info!("🔗 Initiating WhatsApp connection", format!("lookback_days: {:?}", lookback_days));
        
        let mut url = format!("{}/connect", self.base_url);
        if let Some(days) = lookback_days {
            url = format!("{}?lookback_days={}", url, days);
        }
        
        match self.client.post(&url).send().await {
            Ok(response) => {
                log_debug!("📡 Received connect response", response.status());
                
                if response.status().is_success() {
                    match response.json::<ServiceResponse<()>>().await {
                        Ok(_service_response) => {
                            log_info!("✅ Connect request successful", _service_response.message.clone().unwrap_or("No message".to_string()));
                            
                            // Get the current status after connecting
                            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                            self.get_status().await
                        }
                        Err(_e) => {
                            log_error!("❌ Failed to parse connect response", _e.to_string());
                            Err(WhatsAppServiceError::InvalidResponse(_e.to_string()))
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Connect request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(_e) => {
                log_error!("❌ Connect request failed", _e.to_string());
                Err(WhatsAppServiceError::Http(_e))
            }
        }
    }
    
    pub async fn disconnect(&self) -> Result<(), WhatsAppServiceError> {
        log_info!("🔌 Initiating WhatsApp disconnection");
        
        let url = format!("{}/disconnect", self.base_url);
        
        match self.client.post(&url).send().await {
            Ok(response) => {
                log_debug!("📡 Received disconnect response", response.status());
                
                if response.status().is_success() {
                    log_info!("✅ Disconnect successful");
                    Ok(())
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Disconnect request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(_e) => {
                log_error!("❌ Disconnect request failed", _e.to_string());
                Err(WhatsAppServiceError::Http(_e))
            }
        }
    }
    
    pub async fn get_unprocessed_messages(&self, limit: Option<i32>) -> Result<Vec<WhatsAppMessage>, WhatsAppServiceError> {
        log_debug!("📥 Getting unprocessed messages", limit.unwrap_or(-1));
        
        let mut url = format!("{}/messages/unprocessed", self.base_url);
        if let Some(limit) = limit {
            url = format!("{}?limit={}", url, limit);
        }
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                log_debug!("📡 Received messages response", response.status());
                
                if response.status().is_success() {
                    let response_text = response.text().await.map_err(|e| {
                        log_error!("❌ Failed to read response body", e.to_string());
                        WhatsAppServiceError::InvalidResponse(format!("Failed to read response: {}", e))
                    })?;
                    
                    log_debug!("📋 Raw response text", &response_text);
                    
                    match serde_json::from_str::<Vec<WhatsAppMessage>>(&response_text) {
                        Ok(messages) => {
                            log_info!("✅ Retrieved messages successfully", messages.len());
                            Ok(messages)
                        }
                        Err(e) => {
                            log_error!("❌ Failed to parse messages response", e.to_string());
                            log_error!("📋 Response that failed to parse", &response_text);
                            Err(WhatsAppServiceError::InvalidResponse(format!("error decoding response body")))
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Messages request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(e) => {
                log_error!("❌ Messages request failed", e.to_string());
                Err(WhatsAppServiceError::Http(e))
            }
        }
    }
    
    pub async fn mark_message_processed(&self, message_id: &str, work_related: bool, task_priority: Option<String>) -> Result<(), WhatsAppServiceError> {
        log_info!("✅ Marking message as processed", format!("ID: {}, Work: {}", message_id, work_related));
        
        let url = format!("{}/messages/{}/mark-processed", self.base_url, message_id);
        let body = serde_json::json!({
            "work_related": work_related,
            "task_priority": task_priority
        });
        
        match self.client.post(&url).json(&body).send().await {
            Ok(response) => {
                log_debug!("📡 Received mark processed response", response.status());
                
                if response.status().is_success() {
                    log_info!("✅ Message marked as processed successfully");
                    Ok(())
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Mark processed request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(e) => {
                log_error!("❌ Mark processed request failed", e.to_string());
                Err(WhatsAppServiceError::Http(e))
            }
        }
    }

    pub async fn refetch_messages_with_lookback(&self, lookback_days: Option<i32>) -> Result<Vec<WhatsAppMessage>, WhatsAppServiceError> {
        log_info!("🔄 Refetching messages with lookback", format!("lookback_days: {:?}", lookback_days));
        
        let mut url = format!("{}/messages/refetch", self.base_url);
        if let Some(days) = lookback_days {
            url = format!("{}?lookback_days={}", url, days);
        }
        
        match self.client.post(&url).send().await {
            Ok(response) => {
                log_debug!("📡 Received refetch response", response.status());
                
                if response.status().is_success() {
                    let response_text = response.text().await.map_err(|e| {
                        log_error!("❌ Failed to read response body", e.to_string());
                        WhatsAppServiceError::InvalidResponse(format!("Failed to read response: {}", e))
                    })?;
                    
                    log_debug!("📋 Raw refetch response text", &response_text);
                    
                    match serde_json::from_str::<Vec<WhatsAppMessage>>(&response_text) {
                        Ok(messages) => {
                            log_info!("✅ Messages refetched successfully", messages.len());
                            Ok(messages)
                        }
                        Err(e) => {
                            log_error!("❌ Failed to parse refetch response", e.to_string());
                            log_error!("📋 Response that failed to parse", &response_text);
                            Err(WhatsAppServiceError::InvalidResponse(format!("error decoding response body")))
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    log_error!("❌ Refetch request failed", error_text.clone());
                    Err(WhatsAppServiceError::ServiceError(error_text))
                }
            }
            Err(e) => {
                log_error!("❌ Refetch request failed", e.to_string());
                Err(WhatsAppServiceError::Http(e))
            }
        }
    }
}