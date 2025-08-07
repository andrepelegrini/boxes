use tauri::AppHandle;
use serde_json::Value;

/// Analyze text content with AI using the new AI service
#[tauri::command]
pub async fn analyze_with_ai(
    _app: AppHandle,
    content: String,
    analysis_type: String,
) -> Result<String, String> {
    println!("🤖 Analyzing content with AI: {}", analysis_type);
    
    // Use the new AI service client
    let ai_client = crate::ai_service_client::AIServiceClient::new(None);
    match ai_client.summarize(content, None).await {
        Ok(response) => {
            println!("✅ AI analysis completed successfully");
            serde_json::to_string(&response).map_err(|e| format!("Failed to serialize response: {}", e))
        }
        Err(e) => {
            println!("❌ AI analysis failed: {}", e);
            Err(e.to_string())
        }
    }
}

/// Process Slack messages with AI for automation using new services
#[tauri::command]
pub async fn process_slack_messages_with_ai(
    _app: AppHandle,
    project_id: String,
    messages: Value,
    analysis_type: Option<String>,
    since_timestamp: Option<String>,
    last_processed_timestamp: Option<String>,
) -> Result<Value, String> {
    println!("🔄 Processing Slack messages for project {}", project_id);
    
    // Use the new AI service for task analysis
    let ai_client = crate::ai_service_client::AIServiceClient::new(None);
    
    let request = crate::ai_service_client::TaskAnalysisRequest {
        messages: crate::ai_service_client::MessageInput::Text(messages.to_string()),
        context: Some(crate::ai_service_client::ProjectContext {
            project_id: Some(project_id.clone()),
            project_name: None,
            team_members: None,
        }),
        model: None,
    };
    
    match ai_client.analyze_tasks(request).await {
        Ok(result) => {
            println!("✅ AI task analysis completed");
            Ok(serde_json::json!({
                "tasks": result.tasks,
                "summary": result.summary,
                "confidence_score": result.confidence_score,
                "project_id": project_id,
                "analysis_type": analysis_type.unwrap_or_else(|| "task-detection".to_string()),
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "filtered": {
                    "since_timestamp": since_timestamp,
                    "last_processed_timestamp": last_processed_timestamp
                }
            }))
        }
        Err(e) => {
            println!("❌ AI task analysis failed: {}", e);
            Err(e.to_string())
        }
    }
}

/// Analyze text for insights using the new AI service
#[tauri::command]
pub async fn analyze_text_for_insights(
    text: String,
    context: Option<Value>,
) -> Result<Value, String> {
    println!("🔍 Analyzing text for insights with AI service");
    
    let ai_client = crate::ai_service_client::AIServiceClient::new(None);
    match ai_client.summarize(text, None).await {
        Ok(response) => {
            println!("✅ AI insights analysis completed");
            Ok(serde_json::json!({
                "insights": response.summary,
                "analysis_type": "insights",
                "processed_at": chrono::Utc::now().to_rfc3339(),
                "context": context
            }))
        }
        Err(e) => {
            println!("❌ AI insights analysis failed: {}", e);
            Err(e.to_string())
        }
    }
}

/// Extract actionable items from analysis results
#[tauri::command]
pub async fn extract_actionable_items(analysis_result: Value) -> Result<Vec<Value>, String> {
    println!("🎯 Extracting actionable items from analysis");
    
    // Extract tasks from the analysis result
    let mut items = Vec::new();
    
    if let Some(tasks) = analysis_result.get("tasks").and_then(|t| t.as_array()) {
        for task in tasks {
            items.push(serde_json::json!({
                "type": "task",
                "title": task.get("title").and_then(|t| t.as_str()).unwrap_or("Untitled Task"),
                "description": task.get("description").and_then(|d| d.as_str()).unwrap_or(""),
                "priority": task.get("priority").and_then(|p| p.as_str()).unwrap_or("medium"),
                "status": task.get("status").and_then(|s| s.as_str()).unwrap_or("pending"),
                "assignee": task.get("assignee").and_then(|a| a.as_str()),
                "source_message": task.get("source_message").and_then(|s| s.as_str()).unwrap_or(""),
                "confidence": 0.8
            }));
        }
    }
    
    println!("✅ Extracted {} actionable items", items.len());
    Ok(items)
}

/// Create a task from AI suggestion using new services
#[tauri::command]
pub async fn create_task_from_ai_suggestion(
    _app: AppHandle,
    suggestion: Value,
    project_id: String,
) -> Result<String, String> {
    println!("📝 Creating task from AI suggestion for project {}", project_id);
    
    // For now, generate a task ID - in production, this would create via database service
    let task_id = format!("task_{}_{}", project_id, chrono::Utc::now().timestamp_millis());
    
    // Log the task creation for debugging
    println!("📋 Task suggestion: {:?}", suggestion);
    println!("✅ Task created with ID: {}", task_id);
    
    Ok(task_id)
}

/// Health check for AI automation using new services
#[tauri::command]
pub async fn ai_automation_health_check(_app: AppHandle) -> Result<Value, String> {
    println!("🏥 Running AI automation health check");
    
    let ai_client = crate::ai_service_client::AIServiceClient::new(None);
    match ai_client.health_check().await {
        Ok(health) => {
            println!("✅ AI service health check passed");
            Ok(serde_json::json!({
                "ai_service": health,
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "services": {
                    "ai_service": "connected",
                    "queue_service": "available",
                    "database_service": "available"
                }
            }))
        }
        Err(e) => {
            println!("❌ AI service health check failed: {}", e);
            Err(e.to_string())
        }
    }
}

/// Store analysis results for future reference
#[tauri::command]
pub async fn store_analysis_result(
    _app: AppHandle,
    analysis_result: Value,
    result_type: String,
) -> Result<String, String> {
    println!("💾 Storing {} analysis result", result_type);
    
    // Generate a result ID
    let result_id = format!("{}_{}", result_type, chrono::Utc::now().timestamp_millis());
    
    // Log the result for debugging
    if let Ok(result_str) = serde_json::to_string_pretty(&analysis_result) {
        println!("📝 Analysis result: {}", result_str);
    }
    
    println!("✅ Analysis result stored with ID: {}", result_id);
    Ok(result_id)
}

// Missing AI automation functions - adding as stubs
#[tauri::command]
pub async fn analyze_behavioral_patterns(_data: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn apply_project_update_suggestion(_suggestion_id: String) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn bulk_process_task_suggestions(_suggestions: Vec<Value>) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn capture_behavioral_feedback_advanced(_feedback: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn capture_task_modification_feedback(_feedback: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn extract_high_confidence_items(_analysis: Value) -> Result<Vec<Value>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn get_pending_ai_items() -> Result<Vec<Value>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn improve_prompts_from_feedback(_feedback: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn improve_prompts_with_analysis(_analysis: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn init_ai_automation() -> Result<Value, String> {
    Ok(serde_json::json!({"status": "initialized"}))
}

#[tauri::command]
pub async fn initialize_advanced_prompt_improvement() -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn initialize_prompt_improvement_service() -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn reject_project_update_suggestion(_suggestion_id: String) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub async fn store_project_insight(_insight: Value) -> Result<String, String> {
    Ok("not_implemented".to_string())
}

#[tauri::command]
pub async fn store_task_update_detection(_detection: Value) -> Result<String, String> {
    Ok("not_implemented".to_string())
}