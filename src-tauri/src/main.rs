// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]



// Core modules

mod slack;
mod slack_api;
mod credentials;

// mod oauth_management;
// mod task_analysis;
mod slack_sync;
// mod ai_analysis;
// mod ai_automation_service;
// mod prompt_improvement_service;
// mod behavioral_pattern_analyzer;
// mod meta_prompting_engine;
// mod prompt_management;
// mod prompt_template_service;
mod calendar_commands;
mod project_commands;
mod document_commands;
// mod database;
mod whatsapp;
mod whatsapp_service_client;
mod whatsapp_commands;
mod whatsapp_process_manager;
mod ai_service_client;
mod oauth_service_client;
mod queue_service_client;
mod slack_service_client;

// Modular command structure
mod commands;

#[cfg(test)]
mod tests;

// Import command modules
use commands::{
    ai_automation::{
        analyze_behavioral_patterns, analyze_text_for_insights, analyze_with_ai,
        ai_automation_health_check, apply_project_update_suggestion,
        bulk_process_task_suggestions, capture_behavioral_feedback_advanced,
        capture_task_modification_feedback, create_task_from_ai_suggestion,
        extract_actionable_items, extract_high_confidence_items, get_pending_ai_items,
        improve_prompts_from_feedback, improve_prompts_with_analysis, init_ai_automation,
        initialize_advanced_prompt_improvement, initialize_prompt_improvement_service,
        process_slack_messages_with_ai,
        reject_project_update_suggestion, store_project_insight, store_task_update_detection,
    },
    background_sync_commands::{
        cancel_sync_job, get_active_sync_jobs, get_sync_job_status, queue_background_sync,
    },
    calendar_commands::{
        create_calendar_event, delete_event, get_event_by_id, get_events_in_range,
        store_event_detection, update_event,
    },
    debug_commands::{open_devtools},
    document_commands::create_document,
    oauth_servers::{
        cleanup_oauth_tokens, https_oauth_server_status, start_https_oauth_server,
        stop_https_oauth_server, OAuthServiceClientState,
    },
    project_commands::{create_project, get_all_projects, get_project, update_project_field},
    prompt_commands::{
        get_all_prompts, get_effective_prompt, get_prompt_by_key, initialize_default_prompts,
        record_prompt_usage, update_prompt,
    },
    settings::{get_setting, store_setting},
    slack_commands::{
        debug_slack_credentials_status, delete_slack_credentials, force_slack_reconnection,
        get_slack_credentials, get_slack_team_info, get_slack_user_info, slack_analyze_messages,
        slack_build_oauth_url, slack_estimate_sync_time, slack_fetch_messages,
        slack_fetch_messages_paginated, slack_join_channel, slack_list_channels, slack_set_token,
        slack_test_connection, store_slack_credentials,
        update_slack_access_token,
    },
    slack_integration::{
        check_slack_config_status, connect_project_to_channel, create_slack_sync,
        delete_slack_sync, disconnect_slack_channel, get_project_connected_channels,
        get_slack_sync_for_project, slack_check_connection, slack_complete_oauth,
        slack_exchange_code, slack_exchange_oauth_code, slack_get_users_list, slack_start_oauth,
        slack_store_credentials, slack_sync_scheduler_status, start_slack_sync_scheduler,
        stop_slack_sync_scheduler, update_slack_sync,
    },
    system_commands::{get_platform_info, get_system_user_info, reset_database, send_notification},
    task_commands::{
        apply_task_update,
    },
    user_management::{
        create_local_user, get_local_user, update_local_user, update_local_user_activity,
    },
    get_projects,
};

// Import WhatsApp commands
use whatsapp::{
    whatsapp_connect, whatsapp_disconnect, whatsapp_get_status, whatsapp_start_monitoring,
    whatsapp_get_unprocessed_messages, whatsapp_mark_processed, whatsapp_check_login,
};

// Import new WhatsApp service commands
use whatsapp_commands::{
    whatsapp_connect_v2, whatsapp_disconnect_v2, whatsapp_get_status_v2, whatsapp_start_monitoring_v2,
    whatsapp_get_unprocessed_messages_v2, whatsapp_mark_processed_v2, whatsapp_check_login_v2,
    whatsapp_refetch_messages_v2,
};

// Import WhatsApp process management commands
use whatsapp_process_manager::{
    whatsapp_service_start, whatsapp_service_stop, whatsapp_service_status, whatsapp_service_restart,
};

use std::process::Command;
use tauri::AppHandle;
use chrono::Utc;


// Service management for embedded distribution with orchestrated startup
async fn start_embedded_services(_app_handle: AppHandle) {
    println!("🚀 Starting embedded Node.js services...");
    
    // Use concurrent startup (more stable) with orchestrated fallback
    println!("🔧 Using concurrent startup with orchestrated fallback...");
    println!("[{}] ⏰ Starting service startup", Utc::now().format("%Y-%m-%d %H:%M:%S%.3f"));
    
    // Start with concurrent method (more stable) and fall back to orchestrated if needed
    let result = Command::new("npm")
        .arg("run")
        .arg("services:start")
        .current_dir("../") // Go up one directory from src-tauri to project root
        .spawn();
    
    match result {
        Ok(_) => {
            println!("✅ Concurrent services startup initiated!");
            println!("📋 All services will start simultaneously");
        }
        Err(e) => {
            println!("❌ Failed to start concurrent services: {}", e);
            println!("🔄 Falling back to orchestrated startup...");
            
            // Fallback to orchestrated method if concurrent startup fails
            let fallback_result = Command::new("npm")
                .arg("run")
                .arg("services:start:orchestrated")
                .current_dir("../")
                .spawn();
                
            match fallback_result {
                Ok(_) => println!("✅ Orchestrated services startup initiated!"),
                Err(fallback_e) => println!("❌ Both startup methods failed: {}", fallback_e),
            }
        }
    }
}

#[tokio::main]
async fn main() {
    println!("🚀 Starting Tauri application...");

    #[cfg(debug_assertions)]
    let builder = tauri::Builder::default();

    #[cfg(not(debug_assertions))]
    let builder = tauri::Builder::default();

    let app = builder
        // Register plugins
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_keyring::init())
        
        // Initialize state for OAuth servers
        
        .manage(OAuthServiceClientState::default())
        
        // Register all commands (both modular and legacy)
        .invoke_handler(tauri::generate_handler![
            // Debug commands
            open_devtools,
            
            // New modular commands from commands module
            get_projects,
            
            // Settings commands
            get_setting, store_setting,
            
            // User management commands
            create_local_user, update_local_user, update_local_user_activity, get_local_user,
            
            // OAuth server commands
            start_https_oauth_server, stop_https_oauth_server, https_oauth_server_status,
            cleanup_oauth_tokens,
            
            // Slack integration commands
            slack_start_oauth, slack_store_credentials, check_slack_config_status, 
            slack_exchange_code, slack_exchange_oauth_code, slack_complete_oauth,
            create_slack_sync, update_slack_sync, get_slack_sync_for_project,
            delete_slack_sync, disconnect_slack_channel, get_project_connected_channels,
            connect_project_to_channel, start_slack_sync_scheduler, stop_slack_sync_scheduler,
            slack_sync_scheduler_status, slack_check_connection, slack_get_users_list,
            
            // AI automation commands  
            analyze_with_ai, process_slack_messages_with_ai, 
            get_pending_ai_items, apply_project_update_suggestion, reject_project_update_suggestion,
            bulk_process_task_suggestions, create_task_from_ai_suggestion,
            ai_automation_health_check, init_ai_automation, extract_actionable_items,
            extract_high_confidence_items, analyze_behavioral_patterns,
            improve_prompts_from_feedback, initialize_prompt_improvement_service,
            capture_task_modification_feedback, store_task_update_detection,
            store_project_insight, analyze_text_for_insights, improve_prompts_with_analysis,
            capture_behavioral_feedback_advanced, initialize_advanced_prompt_improvement,
            
            // Background sync commands
            queue_background_sync, get_sync_job_status, get_active_sync_jobs,
            cancel_sync_job,
            
            // System commands
            get_platform_info,
            get_system_user_info,
            send_notification,
            reset_database,
            
            // Task management commands
            apply_task_update,
            
            // Prompt management commands
            get_all_prompts,
            get_effective_prompt,
            get_prompt_by_key,
            initialize_default_prompts,
            record_prompt_usage,
            update_prompt,
            
            // Calendar management commands
            create_calendar_event,
            get_event_by_id,
            get_events_in_range,
            update_event,
            delete_event,
            store_event_detection,
            
            // Project management commands
            get_all_projects,
            get_project,
            create_project,
            update_project_field,
            
            // Document management commands
            create_document,
            
            // WhatsApp commands (legacy - headless Chrome)
            whatsapp_connect,
            whatsapp_disconnect, 
            whatsapp_get_status,
            whatsapp_start_monitoring,
            whatsapp_get_unprocessed_messages,
            whatsapp_mark_processed,
            whatsapp_check_login,
            
            // WhatsApp commands (new - Node.js service)
            whatsapp_connect_v2,
            whatsapp_disconnect_v2,
            whatsapp_get_status_v2,
            whatsapp_start_monitoring_v2,
            whatsapp_get_unprocessed_messages_v2,
            whatsapp_mark_processed_v2,
            whatsapp_check_login_v2,
            whatsapp_refetch_messages_v2,
            
            // WhatsApp process management commands
            whatsapp_service_start,
            whatsapp_service_stop,
            whatsapp_service_status,
            whatsapp_service_restart,

            // Slack commands
            store_slack_credentials,
            get_slack_credentials,
            update_slack_access_token,
            delete_slack_credentials,
            force_slack_reconnection,
            debug_slack_credentials_status,
            slack_list_channels,
            slack_build_oauth_url,
            slack_set_token,
            slack_test_connection,
            slack_join_channel,
            slack_fetch_messages,
            slack_estimate_sync_time,
            slack_analyze_messages,
            get_slack_team_info,
            get_slack_user_info,
            slack_fetch_messages_paginated,
        ])
        .setup(|app| {
            println!("✅ Tauri application setup started");
            
            // Auto-start all Node.js services for distribution
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_embedded_services(app_handle).await;
            });
            
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    println!("🎉 Tauri application started successfully");
    
    
    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });
}