use serde::{Deserialize, Serialize};
use reqwest;
use log::{info, warn, error, debug};
use thiserror::Error;
use std::time::Duration;

#[derive(Error, Debug)]
pub enum QueueServiceError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Queue error: {0}")]
    QueueError(String),
    #[error("Job not found: {0}")]
    JobNotFound(String),
}

// Request/Response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobRequest {
    pub queue: String,
    #[serde(rename = "type")]
    pub job_type: String,
    pub data: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<JobOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delay: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attempts: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remove_on_complete: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobResponse {
    pub id: String,
    pub queue: String,
    #[serde(rename = "type")]
    pub job_type: String,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStatus {
    pub id: String,
    pub queue: String,
    #[serde(rename = "type")]
    pub job_type: String,
    pub status: String,
    pub progress: serde_json::Value,
    pub data: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failed_reason: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "processedAt")]
    pub processed_at: Option<String>,
    #[serde(rename = "finishedAt")]
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueJobs {
    pub waiting: Vec<JobInfo>,
    pub active: Vec<JobInfo>,
    pub completed: Vec<JobInfo>,
    pub failed: Vec<JobInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub job_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failed_reason: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "finishedAt")]
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    pub waiting: u32,
    pub active: u32,
    pub completed: u32,
    pub failed: u32,
    pub delayed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackSyncRequest {
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "channelId")]
    pub channel_id: String,
    #[serde(rename = "channelName")]
    pub channel_name: String,
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "lastTimestamp")]
    pub last_timestamp: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageAnalysisRequest {
    pub messages: serde_json::Value,
    #[serde(rename = "analysisType")]
    pub analysis_type: String,
    #[serde(rename = "projectContext")]
    pub project_context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jobs: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stats: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct QueueServiceClient {
    base_url: String,
    client: reqwest::Client,
}

impl QueueServiceClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://localhost:3004".to_string());
        
        info!("🚀 Initializing Queue Service Client at {}", base_url);
        
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        Self { base_url, client }
    }
    
    pub async fn health_check(&self) -> Result<bool, QueueServiceError> {
        debug!("💓 Performing queue service health check");
        
        let url = format!("{}/health", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ Queue service health check passed");
                    Ok(true)
                } else {
                    warn!("⚠️ Queue service health check failed: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                error!("❌ Queue service health check request failed: {}", e);
                Err(QueueServiceError::Http(e))
            }
        }
    }
    
    pub async fn add_job(&self, request: JobRequest) -> Result<JobResponse, QueueServiceError> {
        info!("📋 Adding job to queue: {} (type: {})", request.queue, request.job_type);
        
        let url = format!("{}/api/queue/jobs", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    pub async fn get_job_status(&self, queue: &str, job_id: &str) -> Result<JobStatus, QueueServiceError> {
        debug!("🔍 Getting job status: {} in queue {}", job_id, queue);
        
        let url = format!("{}/api/queue/jobs/{}/{}", self.base_url, queue, job_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<JobStatus>(response).await
    }
    
    pub async fn get_queue_jobs(&self, queue: &str) -> Result<QueueJobs, QueueServiceError> {
        debug!("📊 Getting jobs for queue: {}", queue);
        
        let url = format!("{}/api/queue/jobs/{}", self.base_url, queue);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<QueueJobs>(response).await
    }
    
    pub async fn cancel_job(&self, queue: &str, job_id: &str) -> Result<(), QueueServiceError> {
        info!("🗑️ Cancelling job: {} in queue {}", job_id, queue);
        
        let url = format!("{}/api/queue/jobs/{}/{}", self.base_url, queue, job_id);
        
        let response = self.client
            .delete(&url)
            .send()
            .await?;
        
        if response.status().is_success() {
            info!("✅ Job cancelled successfully");
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to cancel job: {}", error_text);
            Err(QueueServiceError::QueueError(error_text))
        }
    }
    
    pub async fn get_queue_stats(&self) -> Result<std::collections::HashMap<String, QueueStats>, QueueServiceError> {
        debug!("📈 Getting queue statistics");
        
        let url = format!("{}/api/queue/stats", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<std::collections::HashMap<String, QueueStats>>(response).await
    }
    
    // Slack-specific methods
    pub async fn queue_slack_sync(&self, request: SlackSyncRequest) -> Result<JobResponse, QueueServiceError> {
        info!("🔄 Queueing Slack channel sync for {}", request.channel_name);
        
        let url = format!("{}/api/queue/slack/sync-channel", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    pub async fn queue_slack_analysis(&self, request: MessageAnalysisRequest) -> Result<JobResponse, QueueServiceError> {
        info!("🤖 Queueing Slack message analysis: {}", request.analysis_type);
        
        let url = format!("{}/api/queue/slack/analyze-messages", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    // AI analysis methods
    pub async fn queue_task_detection(&self, messages: serde_json::Value, project_context: Option<serde_json::Value>) -> Result<JobResponse, QueueServiceError> {
        info!("🎯 Queueing AI task detection");
        
        let url = format!("{}/api/queue/ai/detect-tasks", self.base_url);
        
        let request = serde_json::json!({
            "messages": messages,
            "projectContext": project_context,
            "options": {
                "autoStore": false
            }
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    pub async fn queue_project_analysis(&self, messages: serde_json::Value, project_context: serde_json::Value) -> Result<JobResponse, QueueServiceError> {
        info!("📊 Queueing project update analysis");
        
        let url = format!("{}/api/queue/ai/analyze-project-updates", self.base_url);
        
        let request = serde_json::json!({
            "messages": messages,
            "projectContext": project_context,
            "updateType": "general"
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    // WhatsApp methods
    pub async fn queue_whatsapp_sync(&self, chat_id: &str, last_timestamp: Option<u64>) -> Result<JobResponse, QueueServiceError> {
        info!("📱 Queueing WhatsApp message sync for chat: {}", chat_id);
        
        let url = format!("{}/api/queue/whatsapp/sync-messages", self.base_url);
        
        let request = serde_json::json!({
            "chatId": chat_id,
            "lastTimestamp": last_timestamp.unwrap_or(0),
            "syncType": "incremental"
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    pub async fn queue_whatsapp_analysis(&self, messages: serde_json::Value, analysis_type: &str) -> Result<JobResponse, QueueServiceError> {
        info!("🔍 Queueing WhatsApp analysis: {}", analysis_type);
        
        let url = format!("{}/api/queue/whatsapp/analyze", self.base_url);
        
        let request = serde_json::json!({
            "messages": messages,
            "analysisType": analysis_type,
            "context": {}
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<JobResponse>(response).await
    }
    
    async fn handle_response<T>(&self, response: reqwest::Response) -> Result<T, QueueServiceError>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let status = response.status();
        let response_text = response.text().await?;
        
        if status.is_success() {
            match serde_json::from_str::<ServiceResponse<T>>(&response_text) {
                Ok(service_response) => {
                    if service_response.success {
                        if let Some(job) = service_response.job {
                            info!("✅ Queue service request successful");
                            Ok(job)
                        } else if let Some(jobs) = service_response.jobs {
                            Ok(jobs)
                        } else if let Some(stats) = service_response.stats {
                            Ok(stats)
                        } else if let Some(result) = service_response.result {
                            Ok(result)
                        } else {
                            error!("❌ Queue service returned success but no data");
                            Err(QueueServiceError::InvalidResponse("No data in response".to_string()))
                        }
                    } else {
                        let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                        error!("❌ Queue service returned error: {}", error_msg);
                        Err(QueueServiceError::QueueError(error_msg))
                    }
                }
                Err(e) => {
                    error!("❌ Failed to parse queue service response: {}", e);
                    error!("Response text: {}", response_text);
                    Err(QueueServiceError::InvalidResponse(e.to_string()))
                }
            }
        } else {
            error!("❌ Queue service request failed with status: {}", status);
            error!("Response: {}", response_text);
            Err(QueueServiceError::ServiceUnavailable(format!("HTTP {}: {}", status, response_text)))
        }
    }
}