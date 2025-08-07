use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::oauth_service_client::OAuthServiceClient;

// State types for OAuth service client management
pub type OAuthServiceClientState = Arc<Mutex<Option<OAuthServiceClient>>>;




/// Initialize the OAuth service client
#[tauri::command]
pub async fn start_https_oauth_server(_app: tauri::AppHandle, state: State<'_, OAuthServiceClientState>) -> Result<String, String> {
    println!("🚀 Initializing OAuth service client...");
    
    let mut client_guard = state.lock().await;
    
    if client_guard.is_some() {
        println!("⚠️ OAuth service client is already initialized");
        return Ok("OAuth service client is already initialized".to_string());
    }
    
    let client = OAuthServiceClient::new(None); // Uses default localhost:3003
    
    // Test health check
    match client.health_check().await {
        Ok(true) => {
            *client_guard = Some(client);
            println!("✅ OAuth service client initialized and health check passed");
            Ok("OAuth service client initialized successfully".to_string())
        }
        Ok(false) => {
            println!("⚠️ OAuth service is not healthy, but client initialized");
            *client_guard = Some(client);
            Ok("OAuth service client initialized (service not healthy)".to_string())
        }
        Err(e) => {
            println!("❌ Failed to initialize OAuth service client: {}", e);
            Err(format!("Failed to initialize OAuth service client: {}", e))
        }
    }
}

/// Cleanup the OAuth service client
#[tauri::command]
pub async fn stop_https_oauth_server(state: State<'_, OAuthServiceClientState>) -> Result<String, String> {
    println!("🛑 Cleaning up OAuth service client...");
    
    let mut client_guard = state.lock().await;
    
    if client_guard.take().is_some() {
        println!("✅ OAuth service client cleaned up successfully");
        Ok("OAuth service client cleaned up".to_string())
    } else {
        println!("⚠️ OAuth service client is not initialized");
        Ok("OAuth service client is not initialized".to_string())
    }
}

/// Get the status of the OAuth service
#[tauri::command]
pub async fn https_oauth_server_status(state: State<'_, OAuthServiceClientState>) -> Result<bool, String> {
    let client_guard = state.lock().await;
    let is_healthy = if let Some(client) = client_guard.as_ref() {
        client.health_check().await.unwrap_or(false)
    } else {
        false
    };
    
    println!("📊 OAuth service status: {}", if is_healthy { "healthy" } else { "unhealthy/not initialized" });
    Ok(is_healthy)
}

/// Test OAuth service connection
#[tauri::command]
pub async fn cleanup_oauth_tokens(state: State<'_, OAuthServiceClientState>) -> Result<String, String> {
    let client_guard = state.lock().await;
    if let Some(client) = client_guard.as_ref() {
        match client.health_check().await {
            Ok(true) => {
                println!("🧹 OAuth service connection test successful");
                Ok("OAuth service connection test passed".to_string())
            }
            Ok(false) => {
                println!("⚠️ OAuth service is not healthy");
                Ok("OAuth service is not healthy".to_string())
            }
            Err(e) => {
                println!("❌ OAuth service connection test failed: {}", e);
                Err(format!("OAuth service connection test failed: {}", e))
            }
        }
    } else {
        println!("⚠️ OAuth service client is not initialized");
        Ok("OAuth service client is not initialized".to_string())
    }
}