use serde::{Deserialize, Serialize};
use log::{info, warn, error};

#[derive(Debug, Clone)]
pub struct SocketServiceClient {
    client: reqwest::Client,
    base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastRequest {
    pub room: String,
    pub event: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastResponse {
    pub success: bool,
    pub recipients: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientInfo {
    pub id: String,
    pub user_id: Option<String>,
    pub connected_at: String,
    pub rooms: Vec<String>,
    pub authenticated: bool,
    pub presence: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClientsResponse {
    pub clients: Vec<ClientInfo>,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RoomMember {
    pub socket_id: String,
    pub user_id: Option<String>,
    pub connected_at: Option<String>,
    pub presence: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RoomInfo {
    pub room_name: String,
    pub member_count: u32,
    pub members: Vec<RoomMember>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub timestamp: String,
    pub uptime: f64,
    pub connected_clients: u32,
    pub rooms: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum SocketServiceError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("JSON parsing failed: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("Service error: {status} - {message}")]
    ServiceError { status: u16, message: String },
}

impl SocketServiceClient {
    pub fn new(base_url: &str) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.to_string(),
        }
    }

    async fn handle_response<T: for<'de> Deserialize<'de>>(&self, response: reqwest::Response) -> Result<T, SocketServiceError> {
        let status = response.status();
        
        if status.is_success() {
            let data = response.json::<T>().await?;
            Ok(data)
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(SocketServiceError::ServiceError {
                status: status.as_u16(),
                message: error_text,
            })
        }
    }

    // Health check
    pub async fn health_check(&self) -> Result<HealthResponse, SocketServiceError> {
        info!("🏥 Checking Socket.io service health");
        
        let url = format!("{}/health", self.base_url);
        let response = self.client.get(&url).send().await?;
        
        self.handle_response::<HealthResponse>(response).await
    }

    // Broadcast message to room
    pub async fn broadcast(&self, request: BroadcastRequest) -> Result<BroadcastResponse, SocketServiceError> {
        info!("📢 Broadcasting to room: {} (event: {})", request.room, request.event);
        
        let url = format!("{}/api/broadcast", self.base_url);
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
            
        self.handle_response::<BroadcastResponse>(response).await
    }

    // Get connected clients
    pub async fn get_clients(&self) -> Result<ClientsResponse, SocketServiceError> {
        info!("👥 Fetching connected clients");
        
        let url = format!("{}/api/clients", self.base_url);
        let response = self.client.get(&url).send().await?;
        
        self.handle_response::<ClientsResponse>(response).await
    }

    // Get room information
    pub async fn get_room_info(&self, room_name: &str) -> Result<RoomInfo, SocketServiceError> {
        info!("🏠 Fetching room info: {}", room_name);
        
        let url = format!("{}/api/rooms/{}", self.base_url, room_name);
        let response = self.client.get(&url).send().await?;
        
        self.handle_response::<RoomInfo>(response).await
    }

    // Convenience methods for common broadcasts
    pub async fn broadcast_task_update(
        &self, 
        project_id: &str, 
        task_data: serde_json::Value
    ) -> Result<BroadcastResponse, SocketServiceError> {
        let request = BroadcastRequest {
            room: format!("tasks:{}", project_id),
            event: "task-updated".to_string(),
            data: serde_json::json!({
                "projectId": project_id,
                "task": task_data,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        };
        
        self.broadcast(request).await
    }

    pub async fn broadcast_new_message(
        &self, 
        channel_id: &str, 
        message_data: serde_json::Value
    ) -> Result<BroadcastResponse, SocketServiceError> {
        let request = BroadcastRequest {
            room: format!("messages:{}", channel_id),
            event: "new-message".to_string(),
            data: serde_json::json!({
                "channelId": channel_id,
                "message": message_data,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        };
        
        self.broadcast(request).await
    }

    pub async fn broadcast_job_update(
        &self, 
        job_data: serde_json::Value
    ) -> Result<(), SocketServiceError> {
        let queue = job_data.get("queue")
            .and_then(|q| q.as_str())
            .unwrap_or("unknown");

        // Broadcast to queue-specific room
        let queue_request = BroadcastRequest {
            room: format!("queue:{}", queue),
            event: "job-updated".to_string(),
            data: job_data.clone(),
        };
        
        self.broadcast(queue_request).await?;

        // If it's an AI job, also broadcast to AI subscribers
        if queue == "ai-analysis" {
            let ai_request = BroadcastRequest {
                room: "ai-jobs".to_string(),
                event: "ai-job-updated".to_string(),
                data: job_data,
            };
            
            self.broadcast(ai_request).await?;
        }

        Ok(())
    }

    pub async fn broadcast_project_update(
        &self, 
        project_id: &str, 
        update_data: serde_json::Value
    ) -> Result<BroadcastResponse, SocketServiceError> {
        let request = BroadcastRequest {
            room: format!("project:{}", project_id),
            event: "project-updated".to_string(),
            data: serde_json::json!({
                "projectId": project_id,
                "update": update_data,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        };
        
        self.broadcast(request).await
    }

    pub async fn notify_ai_analysis_complete(
        &self,
        job_id: &str,
        result: serde_json::Value
    ) -> Result<BroadcastResponse, SocketServiceError> {
        let request = BroadcastRequest {
            room: "ai-jobs".to_string(),
            event: "ai-analysis-complete".to_string(),
            data: serde_json::json!({
                "jobId": job_id,
                "result": result,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        };
        
        self.broadcast(request).await
    }

    pub async fn notify_slack_sync_complete(
        &self,
        channel_id: &str,
        message_count: u32
    ) -> Result<BroadcastResponse, SocketServiceError> {
        let request = BroadcastRequest {
            room: format!("messages:{}", channel_id),
            event: "sync-complete".to_string(),
            data: serde_json::json!({
                "channelId": channel_id,
                "messageCount": message_count,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }),
        };
        
        self.broadcast(request).await
    }

    // Real-time presence management
    pub async fn broadcast_user_presence(
        &self,
        user_id: &str,
        status: &str,
        rooms: &[String]
    ) -> Result<(), SocketServiceError> {
        let presence_data = serde_json::json!({
            "userId": user_id,
            "status": status,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        for room in rooms {
            let request = BroadcastRequest {
                room: room.clone(),
                event: "presence-update".to_string(),
                data: presence_data.clone(),
            };
            
            self.broadcast(request).await?;
        }

        Ok(())
    }

    // Batch operations
    pub async fn broadcast_to_multiple_rooms(
        &self,
        rooms: &[String],
        event: &str,
        data: serde_json::Value
    ) -> Result<Vec<BroadcastResponse>, SocketServiceError> {
        let mut results = Vec::new();
        
        for room in rooms {
            let request = BroadcastRequest {
                room: room.clone(),
                event: event.to_string(),
                data: data.clone(),
            };
            
            match self.broadcast(request).await {
                Ok(response) => results.push(response),
                Err(e) => {
                    warn!("Failed to broadcast to room {}: {}", room, e);
                    // Continue with other rooms
                }
            }
        }
        
        Ok(results)
    }
}