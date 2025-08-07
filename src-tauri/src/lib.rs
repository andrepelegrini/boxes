pub mod slack;
pub mod credentials;
pub mod slack_api;
pub mod slack_sync;
pub mod calendar_commands;
pub mod project_commands;
pub mod document_commands;
pub mod whatsapp;
pub mod whatsapp_service_client;
pub mod whatsapp_commands;
pub mod whatsapp_process_manager;
pub mod ai_service_client;
pub mod oauth_service_client;
pub mod queue_service_client;
pub mod slack_service_client;
pub mod socket_service_client;
pub mod commands;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}