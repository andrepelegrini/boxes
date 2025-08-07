
use crate::calendar_commands::{create_calendar_event as create_calendar_event_internal, get_event_by_id as get_event_by_id_internal, get_events_in_range as get_events_in_range_internal, update_event as update_event_internal, delete_event as delete_event_internal, store_event_detection as store_event_detection_internal,};
// src-tauri/src/commands/calendar_commands.rs

#[tauri::command]
pub async fn create_calendar_event(
    app_handle: tauri::AppHandle,
    event: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_calendar_event_internal(app_handle, event).await
}

#[tauri::command]
pub async fn get_event_by_id(app_handle: tauri::AppHandle, event_id: String) -> Result<serde_json::Value, String> {
    get_event_by_id_internal(app_handle, event_id).await
}

#[tauri::command]
pub async fn get_events_in_range(app_handle: tauri::AppHandle, start_date: String, end_date: String, project_id: Option<String>) -> Result<serde_json::Value, String> {
    get_events_in_range_internal(app_handle, start_date, end_date, project_id).await.map(|events| serde_json::to_value(events).unwrap_or_default())
}

#[tauri::command]
pub async fn update_event(
    app_handle: tauri::AppHandle,
    event_id: String,
    event_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    update_event_internal(app_handle, event_id, event_data).await
}

#[tauri::command]
pub async fn delete_event(app_handle: tauri::AppHandle, event_id: String) -> Result<serde_json::Value, String> {
    delete_event_internal(app_handle, event_id).await
}

#[tauri::command]
pub async fn store_event_detection(
    app_handle: tauri::AppHandle,
    event: serde_json::Value,
) -> Result<String, String> {
    store_event_detection_internal(app_handle, event).await
}
