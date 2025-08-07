
// src-tauri/src/commands/debug_commands.rs

use tauri::Manager;

#[tauri::command]
pub async fn open_devtools(window: tauri::Window) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        if let Some(webview_window) = window.get_webview_window("main") {
            webview_window.open_devtools();
            Ok(())
        } else {
            Err("Main window not found".to_string())
        }
    }
    #[cfg(not(debug_assertions))]
    {
        Err("DevTools only available in debug mode".to_string())
    }
}
