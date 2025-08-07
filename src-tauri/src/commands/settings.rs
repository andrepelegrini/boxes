use tauri::{AppHandle, Manager};
use serde_json::Value;
use std::fs;

/// Get a setting value by key from the app data directory
#[tauri::command]
pub async fn get_setting(app: AppHandle, key: String) -> Result<Option<Value>, String> {
    // Setting retrieval (debug logging can be enabled via RUST_LOG=debug)
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let settings_file = app_data_dir.join("settings.json");
    
    if !settings_file.exists() {
        println!("⚠️ Settings file doesn't exist yet");
        return Ok(None);
    }
    
    let content = fs::read_to_string(&settings_file)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;
    
    let settings: serde_json::Map<String, Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;
    
    Ok(settings.get(&key).cloned())
}

/// Store a setting value by key in the app data directory
#[tauri::command]
pub async fn store_setting(app: AppHandle, key: String, value: Value) -> Result<(), String> {
    println!("💾 Storing setting: {} = {:?}", key, value);
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create app data directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let settings_file = app_data_dir.join("settings.json");
    
    // Read existing settings or create empty map
    let mut settings: serde_json::Map<String, Value> = if settings_file.exists() {
        let content = fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read existing settings: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse existing settings: {}", e))?
    } else {
        serde_json::Map::new()
    };
    
    // Update the setting
    settings.insert(key, value);
    
    // Write back to file
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_file, content)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;
    
    println!("✅ Setting stored successfully");
    Ok(())
}

