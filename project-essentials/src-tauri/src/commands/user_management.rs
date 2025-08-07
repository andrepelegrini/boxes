use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use crate::commands::settings::{get_setting, store_setting};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub preferences: HashMap<String, Value>,
    pub last_active: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Create a new local user
#[tauri::command]
pub async fn create_local_user(
    app: AppHandle,
    name: String,
    email: String,
    preferences: Option<HashMap<String, Value>>,
) -> Result<LocalUser, String> {
    println!("👤 Creating local user: {} ({})", name, email);
    
    let now = chrono::Utc::now().to_rfc3339();
    let user_id = uuid::Uuid::new_v4().to_string();
    
    let user = LocalUser {
        id: user_id,
        name,
        email,
        preferences: preferences.unwrap_or_default(),
        last_active: Some(now.clone()),
        created_at: now.clone(),
        updated_at: now,
    };
    
    // Store user in settings
    let user_value = serde_json::to_value(&user)
        .map_err(|e| format!("Failed to serialize user: {}", e))?;
    
    store_setting(app, "current_user".to_string(), user_value).await?;
    
    println!("✅ Local user created successfully");
    Ok(user)
}

/// Update an existing local user
#[tauri::command]
pub async fn update_local_user(
    app: AppHandle,
    name: Option<String>,
    email: Option<String>,
    preferences: Option<HashMap<String, Value>>,
) -> Result<LocalUser, String> {
    println!("📝 Updating local user");
    
    // Get current user
    let current_user_value = get_setting(app.clone(), "current_user".to_string()).await?
        .ok_or("No current user found")?;
    
    let mut user: LocalUser = serde_json::from_value(current_user_value)
        .map_err(|e| format!("Failed to deserialize current user: {}", e))?;
    
    // Update fields if provided
    if let Some(name) = name {
        user.name = name;
    }
    if let Some(email) = email {
        user.email = email;
    }
    if let Some(preferences) = preferences {
        user.preferences = preferences;
    }
    
    user.updated_at = chrono::Utc::now().to_rfc3339();
    
    // Store updated user
    let user_value = serde_json::to_value(&user)
        .map_err(|e| format!("Failed to serialize updated user: {}", e))?;
    
    store_setting(app, "current_user".to_string(), user_value).await?;
    
    println!("✅ Local user updated successfully");
    Ok(user)
}

/// Update user's last active timestamp
#[tauri::command]
pub async fn update_local_user_activity(app: AppHandle) -> Result<(), String> {
    println!("⏰ Updating user activity timestamp");
    
    // Get current user
    let current_user_value = get_setting(app.clone(), "current_user".to_string()).await?;
    
    if let Some(user_value) = current_user_value {
        let mut user: LocalUser = serde_json::from_value(user_value)
            .map_err(|e| format!("Failed to deserialize current user: {}", e))?;
        
        user.last_active = Some(chrono::Utc::now().to_rfc3339());
        user.updated_at = chrono::Utc::now().to_rfc3339();
        
        let updated_user_value = serde_json::to_value(&user)
            .map_err(|e| format!("Failed to serialize user: {}", e))?;
        
        store_setting(app, "current_user".to_string(), updated_user_value).await?;
        
        println!("✅ User activity updated");
    } else {
        println!("⚠️ No current user found to update activity");
    }
    
    Ok(())
}

/// Get the current local user
#[tauri::command]
pub async fn get_local_user(app: AppHandle) -> Result<Option<LocalUser>, String> {
    println!("👤 Getting current local user");
    
    let current_user_value = get_setting(app, "current_user".to_string()).await?;
    
    if let Some(user_value) = current_user_value {
        let user: LocalUser = serde_json::from_value(user_value)
            .map_err(|e| format!("Failed to deserialize current user: {}", e))?;
        
        println!("✅ Found current user: {}", user.name);
        Ok(Some(user))
    } else {
        println!("ℹ️ No current user found");
        Ok(None)
    }
}