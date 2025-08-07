
use tauri::Manager;

// src-tauri/src/commands/system_commands.rs

#[tauri::command]
pub async fn get_platform_info() -> Result<serde_json::Value, String> {
    let platform = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    
    Ok(serde_json::json!({
        "platform": platform,
        "arch": arch,
        "version": env!("CARGO_PKG_VERSION")
    }))
}

#[tauri::command]
pub async fn get_system_user_info() -> Result<serde_json::Value, String> {
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    
    Ok(serde_json::json!({
        "username": username
    }))
}

#[tauri::command]
pub async fn send_notification(title: String, body: String) -> Result<(), String> {
    println!("🔔 Sending notification: {} - {}", title, body);
    // Placeholder implementation
    Ok(())
}

#[tauri::command]
pub async fn reset_database(app: tauri::AppHandle) -> Result<String, String> {
    println!("🗑️ Resetting database...");
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let db_path = app_data_dir.join("project_boxes.db");
    
    if db_path.exists() {
        std::fs::remove_file(&db_path)
            .map_err(|e| format!("Failed to delete database file: {}", e))?;
        println!("✅ Database file deleted");
    } else {
        println!("ℹ️ Database file doesn't exist");
    }
    
    println!("✅ Database reset completed");
    Ok("Database reset successfully".to_string())
}
