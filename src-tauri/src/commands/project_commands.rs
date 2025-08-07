
// src-tauri/src/commands/project_commands.rs

use crate::project_commands::{get_all_projects as get_all_projects_internal, get_project as get_project_internal};
// src-tauri/src/commands/project_commands.rs

#[tauri::command]
pub async fn get_all_projects(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    get_all_projects_internal(app_handle).await
}

#[tauri::command]
pub async fn get_project(app_handle: tauri::AppHandle, project_id: String) -> Result<serde_json::Value, String> {
    get_project_internal(app_handle, project_id).await
}

#[tauri::command]
pub async fn create_project(app_handle: tauri::AppHandle, name: String, description: String) -> Result<String, String> {
    crate::project_commands::create_project(app_handle, name, description, "active".to_string(), "medium".to_string(), "".to_string(), 0.0, "".to_string()).await
}

#[tauri::command]
pub async fn update_project_field(
    app_handle: tauri::AppHandle,
    project_id: String,
    field: String,
    value: serde_json::Value,
    _updated_by: String,
) -> Result<serde_json::Value, String> {
    crate::project_commands::update_project_field(app_handle, project_id, field, value).await.map(|s| serde_json::Value::String(s))
}
