use tauri::{AppHandle, State};
use serde_json::Value;
use chrono;
use url::form_urlencoded;
use crate::credentials::{
    get_slack_credentials, validate_slack_credentials, SlackCredentialsStatus,
    store_slack_credentials as store_credentials_legacy,
};
use crate::slack::{SlackClient, SlackSyncScheduler, SlackSyncState};
use crate::slack_sync::{
    SlackSync, create_sync, update_sync, get_syncs_for_project, delete_sync,
    disconnect_channel, get_connected_channels_for_project,
};
use crate::commands::oauth_servers::{OAuthServiceClientState, start_https_oauth_server};
use crate::oauth_service_client::OAuthServiceClient;

/// Start Slack OAuth flow
#[tauri::command]
pub async fn slack_start_oauth(
    app: AppHandle,
    oauth_server_state: State<'_, OAuthServiceClientState>,
    client_id: String,
) -> Result<serde_json::Value, String> {
    println!("🚀 Starting Slack OAuth flow for client_id: {}", &client_id[..8]);
    
    // Get credentials from keychain and sync to OAuth service
    match get_slack_credentials(app.clone()).await {
        Ok(Some(credentials)) => {
            println!("📋 Retrieved credentials from keychain");
            
            // Ensure OAuth service client is initialized before syncing credentials
            let mut client_guard = oauth_server_state.lock().await;
            if client_guard.is_none() {
                println!("🔄 Initializing OAuth service client...");
                let client = OAuthServiceClient::new(None);
                *client_guard = Some(client);
                println!("✅ OAuth service client initialized");
            }
            
            // Sync credentials to OAuth service
            if let Some(oauth_client) = client_guard.as_ref() {
                if let Err(e) = oauth_client.configure_credentials("slack", &credentials.client_id, &credentials.client_secret).await {
                    println!("⚠️ Failed to sync credentials to OAuth service: {}", e);
                } else {
                    println!("✅ Credentials synced to OAuth service");
                }
            }
        }
        Ok(None) => {
            println!("⚠️ No credentials found in keychain");
        }
        Err(e) => {
            println!("❌ Failed to retrieve credentials from keychain: {}", e);
        }
    }
    
    // Start the OAuth service client
    let server_result = start_https_oauth_server(app.clone(), oauth_server_state.clone()).await;
    match server_result {
        Ok(_) => {
            println!("✅ OAuth service client started successfully");
        }
        Err(e) => {
            println!("❌ Failed to start OAuth service client: {}", e);
            return Ok(serde_json::json!({
                "success": false,
                "error": format!("Failed to start OAuth server: {}", e)
            }));
        }
    };
    
    // Use OAuth service callback URI - works with existing OAuth service
    let redirect_uri = "https://localhost:3003/api/oauth/slack/callback".to_string();
    
    // Build the OAuth URL manually since we're using HTTP server
    let oauth_url = format!(
        "https://slack.com/oauth/v2/authorize?client_id={}&scope={}&redirect_uri={}&state={}",
        client_id,
        "channels:history,channels:read,channels:join,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read,chat:write,team:read,users:read,users:read.email",
        form_urlencoded::byte_serialize(redirect_uri.as_bytes()).collect::<String>(),
        format!("state_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos())
    );
    
    println!("✅ OAuth URL generated successfully");
    
    // Open the OAuth URL in the user's default browser
    if let Err(e) = open::that(&oauth_url) {
        println!("⚠️ Failed to open browser automatically: {}", e);
        // Don't fail the whole operation if browser opening fails
    }
    
    Ok(serde_json::json!({
        "success": true,
        "url": oauth_url,
        "redirect_uri": redirect_uri
    }))
}

/// Store Slack credentials using the new interface
#[tauri::command]
pub async fn slack_store_credentials(
    app: AppHandle,
    oauth_server_state: State<'_, OAuthServiceClientState>,
    credentials: serde_json::Value,
) -> Result<serde_json::Value, String> {
    println!("🔐 Storing Slack credentials via new interface");
    
    // Extract client_id and client_secret from the credentials object
    let client_id = credentials.get("client_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing client_id in credentials".to_string())?
        .to_string();
    
    let client_secret = credentials.get("client_secret")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing client_secret in credentials".to_string())?
        .to_string();
    
    // Store credentials in keychain
    match store_credentials_legacy(app.clone(), client_id.clone(), client_secret.clone()).await {
        Ok(_) => {
            println!("✅ Credentials stored successfully in keychain");
            
            // Ensure OAuth service client is initialized before syncing credentials
            let mut client_guard = oauth_server_state.lock().await;
            if client_guard.is_none() {
                println!("🔄 Initializing OAuth service client...");
                let client = OAuthServiceClient::new(None);
                *client_guard = Some(client);
                println!("✅ OAuth service client initialized");
            }
            
            // Sync credentials to OAuth service
            if let Some(oauth_client) = client_guard.as_ref() {
                match oauth_client.configure_credentials("slack", &client_id, &client_secret).await {
                    Ok(_) => {
                        println!("✅ Credentials synced to OAuth service");
                        Ok(serde_json::json!({ "success": true }))
                    }
                    Err(e) => {
                        println!("⚠️ Failed to sync credentials to OAuth service: {}", e);
                        // Still return success since keychain storage worked
                        Ok(serde_json::json!({ "success": true, "warning": "Credentials stored but OAuth service sync failed" }))
                    }
                }
            } else {
                println!("⚠️ OAuth service client not initialized");
                Ok(serde_json::json!({ "success": true, "warning": "Credentials stored but OAuth service not available" }))
            }
        }
        Err(e) => {
            println!("❌ Failed to store credentials: {}", e);
            Ok(serde_json::json!({ "success": false, "error": e }))
        }
    }
}

/// Check Slack configuration status
#[tauri::command]
pub async fn check_slack_config_status(app: AppHandle) -> Result<SlackCredentialsStatus, String> {
    println!("🔍 Checking Slack configuration status");
    
    match get_slack_credentials(app.clone()).await {
        Ok(Some(_credentials)) => {
            println!("✅ Slack credentials found, validating...");
            validate_slack_credentials(app).await
        }
        Ok(None) => {
            println!("❌ No Slack credentials found");
            Ok(SlackCredentialsStatus::NotConfigured)
        }
        Err(e) => {
            println!("❌ Error checking credentials: {}", e);
            Err(format!("Failed to check credentials: {}", e))
        }
    }
}

/// Exchange Slack OAuth code for access token (legacy endpoint)
#[tauri::command]
pub async fn slack_exchange_code(
    app: AppHandle,
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<Value, String> {
    println!("🔄 Exchanging Slack OAuth code (legacy)");
    
    let slack_client = SlackClient::new();
    
    match slack_client.exchange_code_for_token(&code, &client_id, &client_secret, &redirect_uri).await {
        Ok(response) => {
            println!("✅ Successfully exchanged OAuth code");
            
            // Store credentials if successful
            if let Some(access_token) = &response.access_token {
                let team_id = response.team.as_ref().map(|t| t.id.as_str()).unwrap_or("");
                let team_name = response.team.as_ref().map(|t| t.name.as_str()).unwrap_or("");
                
                if let Err(e) = crate::credentials::update_slack_access_token(
                    app.clone(),
                    access_token.clone(),
                    team_id.to_string(),
                    team_name.to_string(),
                ).await {
                    println!("⚠️ Failed to store access token: {}", e);
                }
            }
            
            Ok(serde_json::to_value(response).unwrap_or_default())
        }
        Err(e) => {
            println!("❌ Failed to exchange OAuth code: {}", e);
            Err(e.to_string())
        }
    }
}

/// Exchange Slack OAuth code for access token (new endpoint)
#[tauri::command]
pub async fn slack_exchange_oauth_code(
    app: AppHandle,
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<Value, String> {
    println!("🔄 Exchanging Slack OAuth code");
    
    let slack_client = SlackClient::new();
    
    match slack_client.exchange_code_for_token(&code, &client_id, &client_secret, &redirect_uri).await {
        Ok(response) => {
            println!("✅ Successfully exchanged OAuth code");
            
            // Store credentials if successful
            if let Some(access_token) = &response.access_token {
                let team_id = response.team.as_ref().map(|t| t.id.as_str()).unwrap_or("");
                let team_name = response.team.as_ref().map(|t| t.name.as_str()).unwrap_or("");
                
                if let Err(e) = crate::credentials::update_slack_access_token(
                    app.clone(),
                    access_token.clone(),
                    team_id.to_string(),
                    team_name.to_string(),
                ).await {
                    println!("⚠️ Failed to store access token: {}", e);
                }
            }
            
            Ok(serde_json::to_value(response).unwrap_or_default())
        }
        Err(e) => {
            println!("❌ Failed to exchange OAuth code: {}", e);
            Err(e.to_string())
        }
    }
}

/// Complete Slack OAuth flow using stored credentials
#[tauri::command]
pub async fn slack_complete_oauth(
    app: AppHandle,
    code: String,
) -> Result<serde_json::Value, String> {
    println!("🔄 Completing Slack OAuth with stored credentials");
    
    // Get stored credentials
    let credentials = match get_slack_credentials(app.clone()).await {
        Ok(Some(creds)) => creds,
        Ok(None) => {
            println!("❌ No Slack credentials found");
            return Ok(serde_json::json!({
                "success": false,
                "error": "No Slack credentials configured. Please configure credentials first."
            }));
        }
        Err(e) => {
            println!("❌ Failed to get Slack credentials: {}", e);
            return Ok(serde_json::json!({
                "success": false,
                "error": format!("Failed to get credentials: {}", e)
            }));
        }
    };
    
    // Use HTTPS redirect URI (must match what was used in oauth flow)
    let redirect_uri = "https://localhost:3003/api/oauth/slack/callback".to_string();
    
    let slack_client = SlackClient::new();
    
    match slack_client.exchange_code_for_token(
        &code, 
        &credentials.client_id, 
        &credentials.client_secret, 
        &redirect_uri
    ).await {
        Ok(response) => {
            println!("✅ Successfully completed OAuth flow");
            
            // Store access token if successful
            if let Some(access_token) = &response.access_token {
                let team_id = response.team.as_ref().map(|t| t.id.as_str()).unwrap_or("");
                let team_name = response.team.as_ref().map(|t| t.name.as_str()).unwrap_or("");
                
                if let Err(e) = crate::credentials::update_slack_access_token(
                    app.clone(),
                    access_token.clone(),
                    team_id.to_string(),
                    team_name.to_string(),
                ).await {
                    println!("⚠️ Failed to store access token: {}", e);
                    return Ok(serde_json::json!({
                        "success": false,
                        "error": format!("Failed to store access token: {}", e)
                    }));
                }
            }
            
            // Return success response in the expected format
            Ok(serde_json::json!({
                "success": true,
                "data": {
                    "team": response.team.as_ref().map(|t| serde_json::json!({
                        "name": t.name,
                        "id": t.id
                    }))
                }
            }))
        }
        Err(e) => {
            println!("❌ Failed to complete OAuth flow: {}", e);
            Ok(serde_json::json!({
                "success": false,
                "error": format!("OAuth completion failed: {}", e)
            }))
        }
    }
}

/// Create a new Slack sync connection
#[tauri::command]
pub async fn create_slack_sync(
    app: AppHandle,
    project_id: String,
    channel_id: String,
    channel_name: String,
    _metadata: Option<serde_json::Value>,
) -> Result<SlackSync, String> {
    println!("🔗 Creating Slack sync for project {} <-> channel {}", project_id, channel_id);
    
    let sync = SlackSync {
        id: uuid::Uuid::new_v4().to_string(),
        project_id,
        channel_id,
        channel_name,
        last_sync_timestamp: None,
        last_message_timestamp: None,
        is_active: true,
        sync_interval_minutes: Some(15),
        sync_status: Some("local".to_string()),
        last_sync_at: None,
        team_id: None, // Extract from metadata if needed
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    
    let created_sync = create_sync(app, sync).await?;
    
    println!("✅ Slack sync created successfully");
    Ok(created_sync)
}

/// Update an existing Slack sync connection
#[tauri::command]
pub async fn update_slack_sync(app: AppHandle, sync: SlackSync) -> Result<SlackSync, String> {
    println!("📝 Updating Slack sync: {}", sync.id);
    
    let mut updated_sync = sync;
    updated_sync.updated_at = chrono::Utc::now().to_rfc3339();
    
    let updates = std::collections::HashMap::new();
    let updated_result = update_sync(app, updated_sync.id.clone(), updates).await?;
    
    println!("✅ Slack sync updated successfully");
    Ok(updated_result)
}

/// Get Slack syncs for a project
#[tauri::command]
pub async fn get_slack_sync_for_project(app: AppHandle, project_id: String) -> Result<Vec<SlackSync>, String> {
    println!("📋 Getting Slack syncs for project: {}", project_id);
    
    let syncs = get_syncs_for_project(app, project_id).await?;
    
    println!("✅ Found {} Slack syncs for project", syncs.len());
    Ok(syncs)
}

/// Delete a Slack sync connection
#[tauri::command]
pub async fn delete_slack_sync(app: AppHandle, project_id: String, channel_id: String) -> Result<(), String> {
    println!("🗑️ Deleting Slack sync for project {} <-> channel {}", project_id, channel_id);
    
    // Find the sync by project_id and channel_id
    let syncs = get_syncs_for_project(app.clone(), project_id.clone()).await?;
    let sync_to_delete = syncs.into_iter().find(|s| s.channel_id == channel_id);
    
    match sync_to_delete {
        Some(sync) => {
            delete_sync(app, sync.id).await?;
            println!("✅ Slack sync deleted successfully");
            Ok(())
        }
        None => {
            println!("⚠️ No sync found for project {} and channel {}", project_id, channel_id);
            Ok(()) // Don't error if sync doesn't exist
        }
    }
}

/// Disconnect a Slack channel from a project
#[tauri::command]
pub async fn disconnect_slack_channel(
    app: AppHandle,
    project_id: String,
    channel_id: String,
    _reason: Option<String>,
) -> Result<(), String> {
    println!("🔌 Disconnecting channel {} from project {}", channel_id, project_id);
    
    disconnect_channel(app, project_id, channel_id).await?;
    
    println!("✅ Slack channel disconnected successfully");
    Ok(())
}

/// Get connected channels for a project
#[tauri::command]
pub async fn get_project_connected_channels(app: AppHandle, project_id: String) -> Result<Vec<SlackSync>, String> {
    println!("📡 Getting connected channels for project: {}", project_id);
    
    let channels = get_connected_channels_for_project(app).await?;
    
    println!("✅ Found {} connected channels for project", channels.len());
    Ok(channels.into_iter().map(|c| SlackSync {
        id: format!("{}_{}_{}", c.project_id, c.channel_id, chrono::Utc::now().timestamp()),
        project_id: c.project_id,
        channel_id: c.channel_id,
        channel_name: c.channel_name,
        last_sync_timestamp: None,
        last_message_timestamp: None,
        is_active: c.is_active,
        sync_interval_minutes: Some(15),
        sync_status: Some("synced".to_string()),
        last_sync_at: c.last_sync_at,
        team_id: None,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    }).collect())
}

/// Connect a project to a Slack channel
#[tauri::command]
pub async fn connect_project_to_channel(
    app: AppHandle,
    project_id: String,
    channel_id: String,
    channel_name: String,
    sync_interval_minutes: Option<i32>,
) -> Result<SlackSync, String> {
    println!("🔗 Connecting project {} to channel {} ({})", project_id, channel_id, channel_name);
    
    // Create the sync connection
    let sync = SlackSync {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: project_id.clone(),
        channel_id: channel_id.clone(),
        channel_name: channel_name.clone(),
        last_sync_timestamp: None,
        last_message_timestamp: None,
        is_active: true,
        sync_interval_minutes: sync_interval_minutes.or(Some(15)),
        sync_status: Some("connected".to_string()),
        last_sync_at: None,
        team_id: None,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    
    let created_sync = create_sync(app.clone(), sync).await?;
    
    println!("✅ Project {} connected to channel {} successfully", project_id, channel_id);
    Ok(created_sync)
}

// Global state for sync scheduler
use std::sync::Arc;
use tokio::sync::Mutex;
use std::sync::OnceLock;

static SYNC_SCHEDULER: OnceLock<Arc<Mutex<Option<SlackSyncScheduler>>>> = OnceLock::new();

fn get_sync_scheduler() -> &'static Arc<Mutex<Option<SlackSyncScheduler>>> {
    SYNC_SCHEDULER.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Start the Slack sync scheduler
#[tauri::command]
pub async fn start_slack_sync_scheduler(app: AppHandle, interval_minutes: Option<u64>) -> Result<String, String> {
    println!("🔄 Starting Slack sync scheduler...");
    
    let interval = interval_minutes.unwrap_or(15); // Default 15 minutes
    
    // Get Slack credentials
    let credentials = match get_slack_credentials(app.clone()).await {
        Ok(Some(creds)) => creds,
        Ok(None) => return Err("No Slack credentials found".to_string()),
        Err(e) => return Err(format!("Failed to get credentials: {}", e)),
    };
    
    // Create client and scheduler  
    let mut client = SlackClient::new();
    if let Some(token) = credentials.access_token {
        client.set_token(token);
    }
    let scheduler = SlackSyncScheduler::new(client, interval);
    
    // Get active sync configs
    let sync_configs = match get_syncs_for_project(app.clone(), "".to_string()).await {
        Ok(syncs) => syncs.into_iter().map(|s| SlackSyncState {
            project_id: s.project_id,
            channel_id: s.channel_id,
            is_active: s.is_active,
            last_sync: chrono::Utc::now(), // Use current time as default
        }).collect(),
        Err(e) => {
            println!("⚠️ No sync configs found: {}", e);
            vec![]
        }
    };
    
    // Start scheduler
    if let Err(e) = scheduler.start(sync_configs).await {
        return Err(format!("Failed to start scheduler: {}", e));
    }
    
    // Store scheduler in global state
    let scheduler_state = get_sync_scheduler();
    let mut guard = scheduler_state.lock().await;
    *guard = Some(scheduler);
    
    println!("✅ Slack sync scheduler started with {}-minute intervals", interval);
    Ok(format!("Scheduler started with {}-minute intervals", interval))
}

/// Stop the Slack sync scheduler
#[tauri::command]
pub async fn stop_slack_sync_scheduler() -> Result<String, String> {
    println!("🛑 Stopping Slack sync scheduler...");
    
    let scheduler_state = get_sync_scheduler();
    let mut guard = scheduler_state.lock().await;
    
    if let Some(scheduler) = guard.take() {
        scheduler.stop().await;
        println!("✅ Slack sync scheduler stopped");
        Ok("Scheduler stopped".to_string())
    } else {
        println!("⚠️ Scheduler is not running");
        Ok("Scheduler is not running".to_string())
    }
}

/// Get the status of the Slack sync scheduler
#[tauri::command]
pub async fn slack_sync_scheduler_status() -> Result<bool, String> {
    let scheduler_state = get_sync_scheduler();
    let guard = scheduler_state.lock().await;
    
    let is_running = if let Some(scheduler) = guard.as_ref() {
        scheduler.is_running().await
    } else {
        false
    };
    
    println!("📊 Slack sync scheduler status: {}", if is_running { "running" } else { "stopped" });
    Ok(is_running)
}

/// Check Slack connection status
#[tauri::command]
pub async fn slack_check_connection(app: AppHandle) -> Result<serde_json::Value, String> {
    
    // Get stored credentials
    let credentials = match get_slack_credentials(app.clone()).await {
        Ok(Some(creds)) => creds,
        Ok(None) => {
            println!("❌ No Slack credentials found");
            return Ok(serde_json::json!({
                "success": false,
                "error": "No Slack credentials configured",
                "data": {
                    "connected": false
                }
            }));
        }
        Err(e) => {
            println!("❌ Failed to get Slack credentials: {}", e);
            return Ok(serde_json::json!({
                "success": false,
                "error": format!("Failed to get credentials: {}", e),
                "data": {
                    "connected": false
                }
            }));
        }
    };
    
    // Check if we have an access token
    if let Some(access_token) = credentials.access_token {
        // Test connection using existing Slack client
        let mut slack_client = SlackClient::new();
        slack_client.set_token(access_token);
        
        match slack_client.test_slack_connection().await {
            Ok(team_info) => {
                Ok(serde_json::json!({
                    "success": true,
                    "data": {
                        "connected": true,
                        "teamInfo": team_info
                    }
                }))
            }
            Err(e) => {
                println!("❌ Slack connection test failed: {}", e);
                Ok(serde_json::json!({
                    "success": false,
                    "error": format!("Connection test failed: {}", e),
                    "data": {
                        "connected": false
                    }
                }))
            }
        }
    } else {
        println!("❌ No access token found");
        Ok(serde_json::json!({
            "success": false,
            "error": "No access token configured. Please complete OAuth flow.",
            "data": {
                "connected": false
            }
        }))
    }
}

/// Get list of users from Slack workspace
#[tauri::command]
pub async fn slack_get_users_list(app: AppHandle) -> Result<Vec<crate::slack::SlackUser>, String> {
    println!("👥 Getting Slack users list");
    
    // Get stored credentials
    let credentials = match get_slack_credentials(app.clone()).await {
        Ok(Some(creds)) => creds,
        Ok(None) => {
            println!("❌ No Slack credentials found");
            return Err("No Slack credentials configured".to_string());
        }
        Err(e) => {
            println!("❌ Failed to get Slack credentials: {}", e);
            return Err(format!("Failed to get credentials: {}", e));
        }
    };
    
    // Check if we have an access token
    if let Some(access_token) = credentials.access_token {
        // Get users using existing Slack client
        let mut slack_client = SlackClient::new();
        slack_client.set_token(access_token);
        
        match slack_client.list_users().await {
            Ok(users) => {
                println!("✅ Successfully fetched {} users from Slack", users.len());
                Ok(users)
            }
            Err(e) => {
                println!("❌ Failed to fetch users: {}", e);
                Err(format!("Failed to fetch users: {}", e))
            }
        }
    } else {
        println!("❌ No access token found");
        Err("No access token configured. Please complete OAuth flow.".to_string())
    }
}