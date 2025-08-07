use crate::whatsapp_service_client::{WhatsAppServiceClient, WhatsAppConnectionState, WhatsAppMessage, WhatsAppServiceError};
use serde::{Deserialize, Serialize};
use tauri::command;
use tokio::sync::Mutex;
use std::sync::Arc;
use once_cell::sync::Lazy;

// Enhanced logging utility for WhatsApp commands
macro_rules! log_info {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

#[allow(unused_macros)]
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

// Convert from new types to legacy types for frontend compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    QrCodeReady,
    Connected,
    Monitoring,
    Reconnecting,
    Error(String),
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
pub struct LegacyWhatsAppConnectionState {
    pub status: ConnectionStatus,
    pub qr_code: Option<String>,
    pub connected_since: Option<i64>,
    pub last_message_timestamp: Option<i64>,
    pub message_count: i32,
    pub active_chats: Vec<String>,
    pub health_status: HealthStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyWhatsAppMessage {
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
    pub processed_by_llm: bool,
    pub work_related: Option<bool>,
    pub task_priority: Option<String>,
    pub created_at: i64,
}

// Convert service types to legacy types
impl From<WhatsAppConnectionState> for LegacyWhatsAppConnectionState {
    fn from(state: WhatsAppConnectionState) -> Self {
        let status = match state.status.as_str() {
            "disconnected" => ConnectionStatus::Disconnected,
            "connecting" => ConnectionStatus::Connecting,
            "qr_ready" => ConnectionStatus::QrCodeReady,
            "connected" => ConnectionStatus::Connected,
            "error" => ConnectionStatus::Error(state.last_error.unwrap_or_else(|| "Unknown error".to_string())),
            _ => ConnectionStatus::Disconnected,
        };

        // Convert connected_since string to timestamp if present
        let connected_since = state.connected_since.and_then(|cs| {
            chrono::DateTime::parse_from_rfc3339(&cs)
                .map(|dt| dt.timestamp())
                .ok()
        });

        LegacyWhatsAppConnectionState {
            status,
            qr_code: state.qr_code,
            connected_since,
            last_message_timestamp: state.last_message_timestamp,
            message_count: state.message_count,
            active_chats: state.active_chats,
            health_status: HealthStatus {
                last_heartbeat: state.health_status.last_heartbeat,
                consecutive_failures: state.health_status.consecutive_failures,
                last_recovery_attempt: state.health_status.last_recovery_attempt,
                gap_count: state.health_status.gap_count,
                monitoring_active: state.health_status.monitoring_active,
            },
        }
    }
}

impl From<WhatsAppMessage> for LegacyWhatsAppMessage {
    fn from(msg: WhatsAppMessage) -> Self {
        LegacyWhatsAppMessage {
            id: msg.id,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            message_type: msg.message_type,
            timestamp: msg.timestamp,
            is_group_msg: msg.is_group_msg,
            author: msg.author,
            chat_id: msg.chat_id,
            has_media: msg.has_media,
            received_at: msg.received_at,
            processed_by_llm: msg.processed_by_llm,
            work_related: msg.work_related,
            task_priority: msg.task_priority,
            created_at: msg.created_at,
        }
    }
}

// Global client instance
static WHATSAPP_CLIENT: Lazy<Arc<Mutex<Option<WhatsAppServiceClient>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(None))
});

// Initialize client if not already done
async fn get_client() -> Result<WhatsAppServiceClient, WhatsAppServiceError> {
    let mut client_guard = WHATSAPP_CLIENT.lock().await;
    
    if client_guard.is_none() {
        log_info!("🚀 Initializing WhatsApp Service Client");
        let client = WhatsAppServiceClient::new(None); // Use default URL
        
        // Perform health check
        match client.health_check().await {
            Ok(_) => {
                log_info!("✅ WhatsApp service is healthy");
                *client_guard = Some(client.clone());
                Ok(client)
            }
            Err(e) => {
                log_error!("❌ WhatsApp service health check failed", e.to_string());
                Err(e)
            }
        }
    } else {
        log_info!("♻️ Reusing existing WhatsApp Service Client");
        Ok(client_guard.as_ref().unwrap().clone())
    }
}

#[command]
pub async fn whatsapp_connect_v2(lookback_days: Option<i32>) -> Result<LegacyWhatsAppConnectionState, String> {
    log_info!("🔗 WhatsApp connect command called", format!("lookback_days: {:?}", lookback_days));
    
    match get_client().await {
        Ok(client) => {
            match client.connect_with_lookback(lookback_days).await {
                Ok(state) => {
                    log_info!("✅ WhatsApp connection successful", state.status.clone());
                    Ok(state.into())
                }
                Err(e) => {
                    log_error!("❌ WhatsApp connection failed", e.to_string());
                    Err(format!("Connection failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

#[command]
pub async fn whatsapp_disconnect_v2() -> Result<(), String> {
    log_info!("🔌 WhatsApp disconnect command called");
    
    match get_client().await {
        Ok(client) => {
            match client.disconnect().await {
                Ok(_) => {
                    log_info!("✅ WhatsApp disconnection successful");
                    
                    // Clear the client instance
                    let mut client_guard = WHATSAPP_CLIENT.lock().await;
                    *client_guard = None;
                    
                    Ok(())
                }
                Err(e) => {
                    log_error!("❌ WhatsApp disconnection failed", e.to_string());
                    Err(format!("Disconnect failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

#[command]
pub async fn whatsapp_get_status_v2() -> Result<LegacyWhatsAppConnectionState, String> {
    log_info!("📊 WhatsApp get status command called");
    
    match get_client().await {
        Ok(client) => {
            match client.get_status().await {
                Ok(state) => {
                    log_info!("✅ WhatsApp status retrieved", state.status.clone());
                    Ok(state.into())
                }
                Err(e) => {
                    log_error!("❌ Failed to get WhatsApp status", e.to_string());
                    Err(format!("Status check failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

#[command]
pub async fn whatsapp_check_login_v2() -> Result<LegacyWhatsAppConnectionState, String> {
    log_info!("🔍 WhatsApp check login command called");
    
    // This is essentially the same as get_status for the Node.js service
    whatsapp_get_status_v2().await
}

#[command]
pub async fn whatsapp_get_unprocessed_messages_v2(limit: Option<i32>) -> Result<Vec<LegacyWhatsAppMessage>, String> {
    log_info!("📥 WhatsApp get unprocessed messages command called", limit.unwrap_or(-1));
    
    match get_client().await {
        Ok(client) => {
            match client.get_unprocessed_messages(limit).await {
                Ok(messages) => {
                    log_info!("✅ Retrieved unprocessed messages", messages.len());
                    Ok(messages.into_iter().map(Into::into).collect())
                }
                Err(e) => {
                    log_error!("❌ Failed to get unprocessed messages", e.to_string());
                    Err(format!("Message retrieval failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

#[command]
pub async fn whatsapp_mark_processed_v2(
    message_id: String,
    work_related: bool,
    task_priority: Option<String>
) -> Result<(), String> {
    log_info!("✅ WhatsApp mark processed command called", format!("ID: {}, Work: {}", message_id, work_related));
    
    match get_client().await {
        Ok(client) => {
            match client.mark_message_processed(&message_id, work_related, task_priority).await {
                Ok(_) => {
                    log_info!("✅ Message marked as processed successfully");
                    Ok(())
                }
                Err(e) => {
                    log_error!("❌ Failed to mark message as processed", e.to_string());
                    Err(format!("Mark processed failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

#[command]
pub async fn whatsapp_refetch_messages_v2(lookback_days: Option<i32>) -> Result<Vec<LegacyWhatsAppMessage>, String> {
    log_info!("🔄 WhatsApp refetch messages command called", format!("lookback_days: {:?}", lookback_days));
    
    match get_client().await {
        Ok(client) => {
            match client.refetch_messages_with_lookback(lookback_days).await {
                Ok(messages) => {
                    log_info!("✅ Messages refetched successfully", messages.len());
                    Ok(messages.into_iter().map(Into::into).collect())
                }
                Err(e) => {
                    log_error!("❌ Failed to refetch messages", e.to_string());
                    Err(format!("Refetch failed: {}", e))
                }
            }
        }
        Err(e) => {
            log_error!("❌ Failed to get WhatsApp client", e.to_string());
            Err(format!("Service unavailable: {}", e))
        }
    }
}

// Legacy command - for now, just returns the current status
// In the Node.js service, monitoring is always active when connected
#[command]
pub async fn whatsapp_start_monitoring_v2() -> Result<LegacyWhatsAppConnectionState, String> {
    log_info!("▶️ WhatsApp start monitoring command called (monitoring is automatic in Node.js service)");
    
    // Just return current status since monitoring is automatic
    whatsapp_get_status_v2().await
}