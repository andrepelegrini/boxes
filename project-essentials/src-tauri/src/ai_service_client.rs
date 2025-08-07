use serde::{Deserialize, Serialize};
use reqwest;
use log::{info, warn, error, debug};
use thiserror::Error;
use std::time::Duration;

#[derive(Error, Debug)]
pub enum AIServiceError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Rate limit exceeded: retry after {0} seconds")]
    RateLimitExceeded(u64),
    #[error("Service error: {0}")]
    ServiceError(String),
}

// Request/Response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskAnalysisRequest {
    pub messages: MessageInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<ProjectContext>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageInput {
    Text(String),
    Messages(Vec<Message>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub text: String,
    pub user: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_members: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedTask {
    pub title: String,
    pub description: String,
    pub assignee: Option<String>,
    pub priority: String,
    pub status: String,
    pub source_message: String,
    pub source_user: String,
    pub source_timestamp: Option<String>,
    pub estimated_hours: Option<f64>,
    pub due_date: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskAnalysisResult {
    pub tasks: Vec<DetectedTask>,
    pub summary: String,
    pub confidence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectUpdateResult {
    pub updates: Vec<ProjectUpdate>,
    pub overall_health: String,
    pub key_risks: Vec<String>,
    pub recommendations: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectUpdate {
    pub project_name: String,
    pub update_type: String,
    pub summary: String,
    pub details: String,
    pub impact: String,
    pub action_required: bool,
    pub mentioned_by: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryResult {
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueuedJobResponse {
    pub job_id: String,
    pub status: String,
}

#[derive(Clone)]
pub struct AIServiceClient {
    base_url: String,
    client: reqwest::Client,
}

impl AIServiceClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://localhost:3002".to_string());
        
        info!("🚀 Initializing AI Service Client at {}", base_url);
        
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120)) // 2 minute timeout for AI operations
            .build()
            .expect("Failed to create HTTP client");
        
        Self { base_url, client }
    }
    
    pub async fn health_check(&self) -> Result<bool, AIServiceError> {
        debug!("💓 Performing AI service health check");
        
        let url = format!("{}/health", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ AI service health check passed");
                    Ok(true)
                } else {
                    warn!("⚠️ AI service health check failed: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                error!("❌ AI service health check request failed: {}", e);
                Err(AIServiceError::Http(e))
            }
        }
    }
    
    pub async fn analyze_tasks(&self, request: TaskAnalysisRequest) -> Result<TaskAnalysisResult, AIServiceError> {
        info!("🔍 Analyzing tasks from messages");
        
        let url = format!("{}/api/ai/analyze-tasks", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<TaskAnalysisResult>(response).await
    }
    
    pub async fn analyze_project_updates(
        &self, 
        messages: MessageInput,
        project_context: ProjectContext,
        model: Option<String>
    ) -> Result<ProjectUpdateResult, AIServiceError> {
        info!("📊 Analyzing project updates");
        
        let url = format!("{}/api/ai/analyze-project-updates", self.base_url);
        
        let request = serde_json::json!({
            "messages": messages,
            "project_context": project_context,
            "model": model
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<ProjectUpdateResult>(response).await
    }
    
    pub async fn summarize(&self, text: String, options: Option<serde_json::Value>) -> Result<SummaryResult, AIServiceError> {
        info!("📝 Generating summary");
        
        let url = format!("{}/api/ai/summarize", self.base_url);
        
        let request = serde_json::json!({
            "text": text,
            "type": "text",
            "options": options
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<SummaryResult>(response).await
    }
    
    pub async fn queue_analysis(
        &self,
        analysis_type: &str,
        data: serde_json::Value,
        options: Option<serde_json::Value>
    ) -> Result<QueuedJobResponse, AIServiceError> {
        info!("📋 Queueing analysis job: {}", analysis_type);
        
        let url = format!("{}/api/ai/queue-analysis", self.base_url);
        
        let request = serde_json::json!({
            "type": analysis_type,
            "data": data,
            "options": options
        });
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        self.handle_response::<QueuedJobResponse>(response).await
    }
    
    pub async fn get_job_status(&self, job_id: &str) -> Result<serde_json::Value, AIServiceError> {
        debug!("🔍 Getting job status for: {}", job_id);
        
        let url = format!("{}/api/ai/job/{}", self.base_url, job_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;
        
        self.handle_response::<serde_json::Value>(response).await
    }
    
    async fn handle_response<T>(&self, response: reqwest::Response) -> Result<T, AIServiceError> 
    where
        T: for<'de> Deserialize<'de>,
    {
        let status = response.status();
        
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            let retry_after = response
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(60);
            
            error!("❌ Rate limit exceeded, retry after {} seconds", retry_after);
            return Err(AIServiceError::RateLimitExceeded(retry_after));
        }
        
        let response_text = response.text().await?;
        
        if status.is_success() {
            match serde_json::from_str::<ServiceResponse<T>>(&response_text) {
                Ok(service_response) => {
                    if service_response.success {
                        if let Some(data) = service_response.data {
                            info!("✅ AI service request successful");
                            Ok(data)
                        } else {
                            error!("❌ AI service returned success but no data");
                            Err(AIServiceError::InvalidResponse("No data in response".to_string()))
                        }
                    } else {
                        let error_msg = service_response.error.unwrap_or_else(|| "Unknown error".to_string());
                        error!("❌ AI service returned error: {}", error_msg);
                        Err(AIServiceError::ServiceError(error_msg))
                    }
                }
                Err(e) => {
                    error!("❌ Failed to parse AI service response: {}", e);
                    error!("Response text: {}", response_text);
                    Err(AIServiceError::InvalidResponse(e.to_string()))
                }
            }
        } else {
            error!("❌ AI service request failed with status: {}", status);
            error!("Response: {}", response_text);
            Err(AIServiceError::ServiceError(format!("HTTP {}: {}", status, response_text)))
        }
    }
}