use specta::Type;
use tauri::command;

// Module declarations
pub mod ai_automation;
pub mod oauth_servers;
pub mod settings;
pub mod slack_integration;
pub mod user_management;
pub mod debug_commands;
pub mod system_commands;
pub mod task_commands;
pub mod prompt_commands;
pub mod calendar_commands;
pub mod project_commands;
pub mod document_commands;
pub mod slack_commands;
pub mod background_sync_commands;

// Re-export commonly used types
#[allow(unused_imports)]
pub use crate::commands::oauth_servers::OAuthServiceClientState;

#[derive(Type, serde::Serialize, serde::Deserialize)]
pub struct Project {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub status: String,
}

#[command]
#[specta::specta(export = false)]
pub fn get_projects() -> Vec<Project> {
    // In a real application, you would fetch this from a database
    vec![
        Project {
            id: 1,
            name: "Project 1".to_string(),
            description: "Description for project 1".to_string(),
            status: "active".to_string(),
        },
        Project {
            id: 2,
            name: "Project 2".to_string(),
            description: "Description for project 2".to_string(),
            status: "archived".to_string(),
        },
    ]
}