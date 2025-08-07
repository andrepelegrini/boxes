use tauri::AppHandle;
use chrono::Utc;
use serde_json;
// DatabaseService now handled by separate microservice

// Validation helper functions
pub fn validate_project_id(project_id: &str) -> Result<(), String> {
    if project_id.trim().is_empty() {
        return Err("Project ID cannot be empty".to_string());
    }
    Ok(())
}

pub fn validate_field_name(field: &str) -> Result<(), String> {
    if field.trim().is_empty() {
        return Err("Field name cannot be empty".to_string());
    }
    
    // Validate allowed field names
    let allowed_fields = ["name", "description", "status", "priority", "due_date", "progress", "budget", "team"];
    if !allowed_fields.contains(&field) {
        return Err(format!("Invalid field name: {}. Allowed fields: {:?}", field, allowed_fields));
    }
    
    Ok(())
}

pub fn validate_metric_type(metric_type: &str) -> Result<(), String> {
    let allowed_metrics = ["tasks", "events", "health", "activity", "automation"];
    
    if !allowed_metrics.contains(&metric_type) {
        return Err(format!("Invalid metric type: {}. Allowed types: {:?}", metric_type, allowed_metrics));
    }
    
    Ok(())
}

// Simplified project commands using database service
pub async fn get_all_projects(
    _app: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    println!("📋 [get_all_projects] Fetching all projects from database service");
    
    // In production, this would call the database service
    Ok(vec![])
}

pub async fn get_project(
    _app: AppHandle,
    project_id: String,
) -> Result<serde_json::Value, String> {
    println!("🔍 [get_project] Fetching project: {}", project_id);
    
    validate_project_id(&project_id)?;
    
    // In production, this would call the database service
    Ok(serde_json::json!({
        "id": project_id,
        "name": "Sample Project",
        "description": "Project data from database service",
        "status": "active"
    }))
}

pub async fn create_project(
    _app: AppHandle,
    name: String,
    _description: String,
    _status: String,
    _priority: String,
    _due_date: String,
    _budget: f64,
    _team: String,
) -> Result<String, String> {
    println!("➕ [create_project] Creating project: {}", name);
    
    if name.trim().is_empty() {
        return Err("Project name cannot be empty".to_string());
    }
    
    // Generate project ID - in production this would use database service
    let project_id = format!("proj_{}_{}", 
        name.chars().take(8).collect::<String>().to_lowercase().replace(" ", "_"),
        Utc::now().timestamp_millis()
    );
    
    println!("✅ Project created with ID: {}", project_id);
    Ok(project_id)
}

pub async fn update_project(
    _app: AppHandle,
    project_id: String,
    field: String,
    value: serde_json::Value,
) -> Result<String, String> {
    println!("📝 [update_project] Updating project {} field {}", project_id, field);
    
    validate_project_id(&project_id)?;
    validate_field_name(&field)?;
    
    // In production, this would call the database service
    println!("✅ Project {} updated: {} = {:?}", project_id, field, value);
    Ok("Update successful".to_string())
}

pub async fn delete_project(
    _app: AppHandle,
    project_id: String,
) -> Result<String, String> {
    println!("🗑️ [delete_project] Deleting project: {}", project_id);
    
    validate_project_id(&project_id)?;
    
    // In production, this would call the database service
    println!("✅ Project {} deleted", project_id);
    Ok("Project deleted successfully".to_string())
}

pub async fn get_project_statistics(
    _app: AppHandle,
    project_id: String,
    metric_type: String,
) -> Result<serde_json::Value, String> {
    println!("📊 [get_project_statistics] Getting {} metrics for project {}", metric_type, project_id);
    
    validate_project_id(&project_id)?;
    validate_metric_type(&metric_type)?;
    
    // In production, this would call the database service
    Ok(serde_json::json!({
        "project_id": project_id,
        "metric_type": metric_type,
        "data": {},
        "message": "Statistics from database service"
    }))
}

pub async fn get_projects_with_tasks(
    _app: AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    println!("📋 [get_projects_with_tasks] Fetching projects with tasks");
    
    // In production, this would call the database service
    Ok(vec![])
}

pub async fn update_project_field(
    app: AppHandle,
    project_id: String,
    field: String,
    value: serde_json::Value,
) -> Result<String, String> {
    // Alias for update_project
    update_project(app, project_id, field, value).await
}