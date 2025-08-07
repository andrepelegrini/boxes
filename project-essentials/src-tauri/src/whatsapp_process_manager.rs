use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use once_cell::sync::Lazy;
use tauri::{command, Manager};
use std::path::PathBuf;

// Enhanced logging utility for WhatsApp Process Manager
macro_rules! log_info {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

macro_rules! log_error {
    ($msg:expr) => {
        // Logging disabled
    };
    ($msg:expr, $data:expr) => {
        // Logging disabled
    };
}

static WHATSAPP_PROCESS: Lazy<Arc<Mutex<Option<Child>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(None))
});

pub struct WhatsAppProcessManager;

impl WhatsAppProcessManager {
    pub fn new() -> Self {
        Self
    }

    fn get_whatsapp_service_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
        // Get the app's resource directory
        let resource_dir = app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource directory: {}", e))?;
        
        // In development, the service is in the project root
        // In production, it should be bundled in resources
        let service_path = if cfg!(debug_assertions) {
            // Development path - the resource_dir is already pointing to project root
            resource_dir.join("whatsapp-service")
        } else {
            // Production path (bundled with app)
            resource_dir.join("whatsapp-service")
        };

        log_info!("WhatsApp service path resolved", service_path.display().to_string());
        Ok(service_path)
    }

    pub fn start_service(app_handle: &tauri::AppHandle) -> Result<(), String> {
        log_info!("🚀 Starting WhatsApp Node.js service");

        let mut process_guard = WHATSAPP_PROCESS.lock()
            .map_err(|e| format!("Failed to acquire process lock: {}", e))?;

        // Check if already running
        if let Some(ref mut child) = *process_guard {
            match child.try_wait() {
                Ok(Some(_)) => {
                    log_info!("Previous process has exited, starting new one");
                }
                Ok(None) => {
                    log_info!("⚠️ Service already running");
                    return Ok(());
                }
                Err(e) => {
                    log_error!("Failed to check process status", e.to_string());
                    return Err(format!("Failed to check process status: {}", e));
                }
            }
        }

        let service_path = Self::get_whatsapp_service_path(app_handle)?;
        
        // Check if service directory exists
        if !service_path.exists() {
            log_error!("WhatsApp service directory not found", service_path.display().to_string());
            return Err(format!("WhatsApp service directory not found: {}", service_path.display()));
        }

        let server_js_path = service_path.join("server.js");
        if !server_js_path.exists() {
            log_error!("server.js not found", server_js_path.display().to_string());
            return Err(format!("server.js not found: {}", server_js_path.display()));
        }

        log_info!("📁 Starting Node.js process from directory", service_path.display().to_string());

        // Start the Node.js process
        let mut command = Command::new("node");
        command
            .arg("server.js")
            .current_dir(&service_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        match command.spawn() {
            Ok(child) => {
                log_info!("✅ WhatsApp service started successfully", child.id());
                *process_guard = Some(child);
                Ok(())
            }
            Err(e) => {
                log_error!("❌ Failed to start WhatsApp service", e.to_string());
                Err(format!("Failed to start WhatsApp service: {}", e))
            }
        }
    }

    pub fn stop_service() -> Result<(), String> {
        log_info!("🛑 Stopping WhatsApp Node.js service");

        let mut process_guard = WHATSAPP_PROCESS.lock()
            .map_err(|e| format!("Failed to acquire process lock: {}", e))?;

        if let Some(ref mut child) = *process_guard {
            match child.kill() {
                Ok(_) => {
                    log_info!("✅ WhatsApp service stopped successfully");
                    // Wait for the process to actually terminate
                    let _ = child.wait();
                    *process_guard = None;
                    Ok(())
                }
                            Err(_e) => {
                log_error!("❌ Failed to stop WhatsApp service", _e.to_string());
                Err(format!("Failed to stop WhatsApp service: {}", _e))
            }
            }
        } else {
            log_info!("⚠️ No WhatsApp service process to stop");
            Ok(())
        }
    }

    pub fn is_service_running() -> Result<bool, String> {
        let process_guard = WHATSAPP_PROCESS.lock()
            .map_err(|e| format!("Failed to acquire process lock: {}", e))?;

        if let Some(ref _child) = *process_guard {
            // We can't call try_wait on an immutable reference, so we'll just assume it's running
            // A more sophisticated approach would be to ping the HTTP service
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn health_check() -> Result<bool, String> {
        log_info!("💓 Performing health check on WhatsApp service");
        
        match reqwest::get("http://localhost:3001/health").await {
            Ok(response) => {
                if response.status().is_success() {
                    log_info!("✅ WhatsApp service health check passed");
                    Ok(true)
                } else {
                    log_error!("⚠️ WhatsApp service health check failed", response.status().as_u16());
                    Ok(false)
                }
            }
            Err(e) => {
                log_error!("❌ WhatsApp service health check error", e.to_string());
                Ok(false)
            }
        }
    }
}

// Tauri commands
#[command]
pub async fn whatsapp_service_start(app_handle: tauri::AppHandle) -> Result<(), String> {
    WhatsAppProcessManager::start_service(&app_handle)
}

#[command]
pub async fn whatsapp_service_stop() -> Result<(), String> {
    WhatsAppProcessManager::stop_service()
}

#[command]
pub async fn whatsapp_service_status() -> Result<bool, String> {
    WhatsAppProcessManager::health_check().await
}

#[command]
pub async fn whatsapp_service_restart(app_handle: tauri::AppHandle) -> Result<(), String> {
    log_info!("🔄 Restarting WhatsApp service");
    
    // Stop the service
    if let Err(e) = WhatsAppProcessManager::stop_service() {
        log_error!("Failed to stop service during restart", e.clone());
        return Err(e);
    }
    
    // Wait a bit for cleanup
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    // Start the service
    WhatsAppProcessManager::start_service(&app_handle)
}