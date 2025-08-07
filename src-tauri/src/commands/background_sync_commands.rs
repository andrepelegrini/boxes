
// src-tauri/src/commands/background_sync_commands.rs
// Bull Queue implementation for background sync

use serde_json;
use chrono;
use crate::queue_service_client::{QueueServiceClient, SlackSyncRequest, JobRequest, JobOptions};

// src-tauri/src/commands/background_sync_commands.rs

#[tauri::command]
pub async fn queue_background_sync(
    _app_handle: tauri::AppHandle,
    project_id: String,
    channel_id: String,
    channel_name: String,
    sync_type: String,
) -> Result<String, String> {
    println!("🔄 Queueing background sync: project={}, channel={}, type={}", 
             project_id, channel_name, sync_type);
    
    let queue_client = QueueServiceClient::new(None);
    
    match sync_type.as_str() {
        "slack" => {
            // For Slack sync, we need access token - this would be retrieved from credentials
            let slack_request = SlackSyncRequest {
                project_id: project_id.clone(),
                channel_id: channel_id.clone(),
                channel_name: channel_name.clone(),
                access_token: "placeholder_token".to_string(), // TODO: Get from credentials
                last_timestamp: None,
            };
            
            match queue_client.queue_slack_sync(slack_request).await {
                Ok(job) => {
                    println!("✅ Slack sync job queued: {}", job.id);
                    Ok(job.id)
                }
                Err(e) => {
                    println!("❌ Failed to queue Slack sync: {}", e);
                    Err(format!("Failed to queue Slack sync: {}", e))
                }
            }
        }
        "whatsapp" => {
            match queue_client.queue_whatsapp_sync(&channel_id, None).await {
                Ok(job) => {
                    println!("✅ WhatsApp sync job queued: {}", job.id);
                    Ok(job.id)
                }
                Err(e) => {
                    println!("❌ Failed to queue WhatsApp sync: {}", e);
                    Err(format!("Failed to queue WhatsApp sync: {}", e))
                }
            }
        }
        _ => {
            // Generic background sync job
            let job_request = JobRequest {
                queue: "background-sync".to_string(),
                job_type: sync_type.clone(),
                data: serde_json::json!({
                    "projectId": project_id,
                    "channelId": channel_id,
                    "channelName": channel_name,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }),
                options: Some(JobOptions {
                    priority: Some(5),
                    delay: Some(0),
                    attempts: Some(3),
                    remove_on_complete: Some(true),
                }),
            };
            
            match queue_client.add_job(job_request).await {
                Ok(job) => {
                    println!("✅ Background sync job queued: {}", job.id);
                    Ok(job.id)
                }
                Err(e) => {
                    println!("❌ Failed to queue background sync: {}", e);
                    Err(format!("Failed to queue background sync: {}", e))
                }
            }
        }
    }
}

#[tauri::command]
pub async fn get_sync_job_status(_app_handle: tauri::AppHandle, job_id: String) -> Result<serde_json::Value, String> {
    println!("🔍 Checking sync job status: {}", job_id);
    
    let queue_client = QueueServiceClient::new(None);
    
    // We need to know which queue the job is in - for now, try common queues
    let queues_to_check = vec!["slack-sync", "whatsapp-sync", "background-sync"];
    
    for queue in queues_to_check {
        match queue_client.get_job_status(queue, &job_id).await {
            Ok(status) => {
                println!("✅ Found job {} in queue {}: {}", job_id, queue, status.status);
                return Ok(serde_json::to_value(status).unwrap_or_default());
            }
            Err(_) => {
                // Job not found in this queue, continue to next
                continue;
            }
        }
    }
    
    println!("❌ Job {} not found in any queue", job_id);
    Ok(serde_json::json!({
        "job_id": job_id,
        "status": "not_found",
        "message": "Job not found in any queue"
    }))
}

#[tauri::command]
pub async fn get_active_sync_jobs(_app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    println!("📊 Getting active sync jobs");
    
    let queue_client = QueueServiceClient::new(None);
    let mut all_jobs = Vec::new();
    
    let queues = vec!["slack-sync", "whatsapp-sync", "background-sync"];
    
    for queue in queues {
        match queue_client.get_queue_jobs(queue).await {
            Ok(jobs) => {
                // Add all non-empty job categories
                for job in jobs.waiting {
                    all_jobs.push(serde_json::json!({
                        "id": job.id,
                        "queue": queue,
                        "type": job.job_type,
                        "status": "waiting",
                        "data": job.data,
                        "createdAt": job.created_at
                    }));
                }
                
                for job in jobs.active {
                    all_jobs.push(serde_json::json!({
                        "id": job.id,
                        "queue": queue,
                        "type": job.job_type,
                        "status": "active",
                        "progress": job.progress,
                        "data": job.data,
                        "createdAt": job.created_at
                    }));
                }
            }
            Err(e) => {
                println!("⚠️ Failed to get jobs for queue {}: {}", queue, e);
            }
        }
    }
    
    println!("✅ Retrieved {} active sync jobs", all_jobs.len());
    Ok(all_jobs)
}

#[tauri::command]
pub async fn cancel_sync_job(_app_handle: tauri::AppHandle, job_id: String) -> Result<(), String> {
    println!("🗑️ Cancelling sync job: {}", job_id);
    
    let queue_client = QueueServiceClient::new(None);
    let queues_to_check = vec!["slack-sync", "whatsapp-sync", "background-sync"];
    
    for queue in queues_to_check {
        match queue_client.cancel_job(queue, &job_id).await {
            Ok(_) => {
                println!("✅ Successfully cancelled job {} in queue {}", job_id, queue);
                return Ok(());
            }
            Err(_) => {
                // Job not found in this queue, continue to next
                continue;
            }
        }
    }
    
    Err(format!("Job {} not found in any queue", job_id))
}

#[tauri::command]
pub async fn start_background_sync_worker(_app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("🚀 Starting background sync worker (checking queue service)");
    
    let queue_client = QueueServiceClient::new(None);
    
    match queue_client.health_check().await {
        Ok(true) => {
            println!("✅ Queue service is healthy and running");
            Ok(())
        }
        Ok(false) => {
            println!("⚠️ Queue service is not healthy");
            Err("Queue service is not healthy".to_string())
        }
        Err(e) => {
            println!("❌ Failed to connect to queue service: {}", e);
            Err(format!("Failed to connect to queue service: {}", e))
        }
    }
}
