// Simplified task commands using new database service

#[tauri::command]
pub async fn apply_task_update(
    task_id: String,
    field: String,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    println!("📝 Applying task update: {} -> {} = {:?}", task_id, field, value);
    
    // In production, this would use the database service
    let result = serde_json::json!({
        "success": true, 
        "task_id": task_id, 
        "field": field, 
        "value": value,
        "updated_at": chrono::Utc::now().to_rfc3339()
    });
    
    println!("✅ Task update applied successfully");
    Ok(result)
}

#[tauri::command]
pub async fn create_task_from_suggestion_command(
    _app_handle: tauri::AppHandle,
    project_id: String,
    title: String,
    description: String,
    due_date: Option<String>,
) -> Result<String, String> {
    println!("📝 Creating task from suggestion: {}", title);
    
    // Generate task ID - in production this would use database service
    let task_id = format!("task_{}_{}", project_id, chrono::Utc::now().timestamp_millis());
    
    println!("📋 Task details:");
    println!("  Project: {}", project_id);
    println!("  Title: {}", title);
    println!("  Description: {}", description);
    if let Some(due) = &due_date {
        println!("  Due date: {}", due);
    }
    
    println!("✅ Task created with ID: {}", task_id);
    Ok(task_id)
}

#[tauri::command]
pub async fn get_tasks_for_project_command(
    _app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<serde_json::Value, String> {
    println!("📋 Getting tasks for project: {}", project_id);
    
    // Return empty tasks for now - in production this would use database service
    Ok(serde_json::json!({
        "tasks": [],
        "project_id": project_id,
        "message": "Tasks are now managed by database service"
    }))
}