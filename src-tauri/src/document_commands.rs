use tauri::AppHandle;
use chrono::Utc;
use serde_json;
use uuid::Uuid;

// Validation helper functions
pub fn validate_project_id(project_id: &str) -> Result<(), String> {
    if project_id.trim().is_empty() {
        return Err("Project ID cannot be empty".to_string());
    }
    Ok(())
}

pub fn validate_document_type(doc_type: &str) -> Result<(), String> {
    let allowed_types = ["ai_kickoff", "meeting_notes", "requirements", "design", "technical", "user_guide", "general"];
    if !allowed_types.contains(&doc_type) {
        return Err(format!("Invalid document type: {}. Allowed types: {:?}", doc_type, allowed_types));
    }
    Ok(())
}

pub async fn create_document(
    _app: AppHandle,
    project_id: String,
    document_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    println!("📄 [create_document] Creating document for project: {}", project_id);
    
    validate_project_id(&project_id)?;
    
    let title = document_data.get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing or invalid title")?;
    
    let content = document_data.get("content")
        .and_then(|v| v.as_str())
        .ok_or("Missing or invalid content")?;
    
    let doc_type = document_data.get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("general");
    
    validate_document_type(doc_type)?;
    
    if title.trim().is_empty() {
        return Err("Document title cannot be empty".to_string());
    }
    
    if content.trim().is_empty() {
        return Err("Document content cannot be empty".to_string());
    }

    let document_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    // Extract additional optional fields
    let author = document_data.get("author")
        .and_then(|v| v.as_str())
        .unwrap_or("system");
    
    let tags = document_data.get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();
    
    let version = document_data.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0");
    
    let is_public = document_data.get("isPublic")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let metadata = document_data.get("metadata")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    // This would normally insert into the documents table
    let created_document = serde_json::json!({
        "id": document_id,
        "project_id": project_id,
        "title": title,
        "content": content,
        "type": doc_type,
        "author": author,
        "version": version,
        "tags": tags,
        "is_public": is_public,
        "metadata": metadata,
        "word_count": content.split_whitespace().count(),
        "character_count": content.len(),
        "created_at": now,
        "updated_at": now,
        "last_accessed_at": now
    });
    
    println!("✅ [create_document] Document '{}' created with ID: {}", title, document_id);
    Ok(created_document)
}