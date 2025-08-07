use crate::credentials::{store_slack_credentials as store_slack_credentials_internal, get_slack_credentials as get_slack_credentials_internal, update_slack_access_token as update_slack_access_token_internal, delete_slack_credentials as delete_slack_credentials_internal, force_slack_reconnection as force_slack_reconnection_internal, debug_slack_credentials_status as debug_slack_credentials_status_internal,};
use crate::slack_api::{slack_list_channels as slack_list_channels_internal, slack_build_oauth_url as slack_build_oauth_url_internal, slack_set_token as slack_set_token_internal, slack_test_connection as slack_test_connection_internal, slack_join_channel as slack_join_channel_internal, slack_fetch_messages as slack_fetch_messages_internal, slack_estimate_sync_time as slack_estimate_sync_time_internal, slack_analyze_messages as slack_analyze_messages_internal, get_slack_team_info as get_slack_team_info_internal, get_slack_user_info as get_slack_user_info_internal, slack_fetch_messages_paginated as slack_fetch_messages_paginated_internal,};
use crate::commands::oauth_servers::OAuthServiceClientState;

// src-tauri/src/commands/slack_commands.rs

#[tauri::command]
pub async fn store_slack_credentials(
    app_handle: tauri::AppHandle,
    client_id: String,
    client_secret: String,
) -> Result<String, String> {
    store_slack_credentials_internal(app_handle, client_id, client_secret).await
}

#[tauri::command]
pub async fn get_slack_credentials(app_handle: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    get_slack_credentials_internal(app_handle).await
        .map(|opt| opt.map(|creds| serde_json::to_value(creds).unwrap()))
}

#[tauri::command]
pub async fn update_slack_access_token(
    app_handle: tauri::AppHandle,
    access_token: String,
    team_id: String,
    team_name: String,
) -> Result<String, String> {
    update_slack_access_token_internal(app_handle, access_token, team_id, team_name).await
}

#[tauri::command]
pub async fn delete_slack_credentials(app_handle: tauri::AppHandle) -> Result<String, String> {
    delete_slack_credentials_internal(app_handle).await
}

#[tauri::command]
pub async fn force_slack_reconnection(app_handle: tauri::AppHandle) -> Result<String, String> {
    force_slack_reconnection_internal(app_handle).await
}

#[tauri::command]
pub async fn debug_slack_credentials_status(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    debug_slack_credentials_status_internal(app_handle).await
}

#[tauri::command]
pub async fn slack_list_channels(access_token: String) -> Result<serde_json::Value, String> {
    slack_list_channels_internal(access_token).await
}

#[tauri::command]
pub async fn slack_build_oauth_url(
    https_server_state: tauri::State<'_, OAuthServiceClientState>,
    client_id: String,
    redirect_uri: String,
) -> Result<String, String> {
    slack_build_oauth_url_internal(https_server_state, client_id, redirect_uri).await
}

#[tauri::command]
pub async fn slack_set_token(app_handle: tauri::AppHandle, token: String) -> Result<(), String> {
    slack_set_token_internal(app_handle, token).await
}

#[tauri::command]
pub async fn slack_test_connection(access_token: String) -> Result<serde_json::Value, String> {
    slack_test_connection_internal(access_token).await
}

#[tauri::command]
pub async fn slack_join_channel(access_token: String, channel_id: String) -> Result<bool, String> {
    slack_join_channel_internal(access_token, channel_id).await
}

#[tauri::command]
pub async fn slack_fetch_messages(
    access_token: String,
    channel_id: String,
    oldest_timestamp: Option<f64>,
    limit: Option<u32>,
) -> Result<Vec<serde_json::Value>, String> {
    slack_fetch_messages_internal(access_token, channel_id, oldest_timestamp, limit).await
}

#[tauri::command]
pub async fn slack_estimate_sync_time(
    access_token: String,
    channel_id: String,
) -> Result<serde_json::Value, String> {
    slack_estimate_sync_time_internal(access_token, channel_id).await
}

#[tauri::command]
pub async fn slack_analyze_messages(
    app_handle: tauri::AppHandle,
    messages: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    slack_analyze_messages_internal(app_handle, messages).await
}

#[tauri::command]
pub async fn get_slack_team_info(token: String) -> Result<serde_json::Value, String> {
    get_slack_team_info_internal(token).await
}

#[tauri::command]
pub async fn get_slack_user_info(token: String) -> Result<serde_json::Value, String> {
    get_slack_user_info_internal(token).await
}

#[tauri::command]
pub async fn slack_fetch_messages_paginated(
    access_token: String,
    channel_id: String,
    oldest_timestamp: Option<f64>,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<serde_json::Value, String> {
    slack_fetch_messages_paginated_internal(access_token, channel_id, oldest_timestamp, limit, cursor).await
}