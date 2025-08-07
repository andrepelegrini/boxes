
use crate::document_commands::create_document as create_document_internal;

// src-tauri/src/commands/document_commands.rs

#[tauri::command]
pub async fn create_document(
    app_handle: tauri::AppHandle,
    project_id: String,
    title: String,
    content: String,
) -> Result<serde_json::Value, String> {
    let document_data = serde_json::json!({
        "title": title,
        "content": content,
    });
    create_document_internal(app_handle, project_id, document_data).await
}
