#[cfg(test)]
mod slack_integration_tests {
    use super::super::*;
    use tauri::test::{mock_app, MockRuntime};
    use serde_json::json;

    // Helper function to create mock app
    fn create_mock_app() -> tauri::App<MockRuntime> {
        let app = mock_app().build().unwrap();
        app
    }

    #[tokio::test]
    async fn test_store_slack_credentials_validation() {
        let app = create_mock_app();
        
        // Test empty client ID
        let result = store_slack_credentials(
            app.handle(),
            "".to_string(),
            "valid_secret_12345".to_string(),
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Client ID não pode estar vazio"));
        
        // Test invalid client ID characters
        let result = store_slack_credentials(
            app.handle(),
            "invalid@#$%".to_string(),
            "valid_secret_12345".to_string(),
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("caracteres inválidos"));
        
        // Test short client secret
        let result = store_slack_credentials(
            app.handle(),
            "123.456".to_string(),
            "short".to_string(),
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("muito curto"));
    }

    #[tokio::test]
    async fn test_slack_oauth_url_generation() {
        let result = slack_build_oauth_url(
            "123.456".to_string(),
            "http://localhost:8080/oauth/callback".to_string(),
        ).await;
        
        assert!(result.is_ok());
        let url = result.unwrap();
        assert!(url.contains("slack.com/oauth/v2/authorize"));
        assert!(url.contains("client_id=123.456"));
        assert!(url.contains("redirect_uri="));
        assert!(url.contains("scope="));
    }

    #[tokio::test]
    async fn test_validate_project_id() {
        // Valid project ID
        assert!(validate_project_id("project-123").is_ok());
        assert!(validate_project_id("project_456").is_ok());
        assert!(validate_project_id("proj789").is_ok());
        
        // Invalid project IDs
        assert!(validate_project_id("").is_err());
        assert!(validate_project_id("project@#$").is_err());
        assert!(validate_project_id(&"x".repeat(101)).is_err());
    }

    #[tokio::test]
    async fn test_validate_channel_id() {
        // Valid channel IDs (Slack format)
        assert!(validate_channel_id("C1234567890").is_ok());
        assert!(validate_channel_id("G0987654321").is_ok());
        
        // Invalid channel IDs
        assert!(validate_channel_id("").is_err());
        assert!(validate_channel_id("invalid").is_err());
        assert!(validate_channel_id("C@#$%").is_err());
        assert!(validate_channel_id("D1234567890").is_err()); // DM channels not supported
    }

    #[tokio::test]
    async fn test_validate_access_token() {
        // Valid tokens (Slack format)
        assert!(validate_access_token("xoxb-1234567890-abcdefghijk").is_ok());
        assert!(validate_access_token("xoxp-9876543210-zyxwvutsrqp").is_ok());
        assert!(validate_access_token("xoxa-1111111111-mmmmmmmmmmm").is_ok());
        
        // Invalid tokens
        assert!(validate_access_token("").is_err());
        assert!(validate_access_token("invalid-token").is_err());
        assert!(validate_access_token("bear-token-123").is_err());
        assert!(validate_access_token(&"x".repeat(501)).is_err());
    }

    #[tokio::test]
    async fn test_validate_team_id() {
        // Valid team IDs (Slack format)
        assert!(validate_team_id("T1234567890").is_ok());
        assert!(validate_team_id("T0ABCDEFGHI").is_ok());
        
        // Invalid team IDs
        assert!(validate_team_id("").is_err());
        assert!(validate_team_id("1234567890").is_err()); // Missing T prefix
        assert!(validate_team_id("T@#$%").is_err());
        assert!(validate_team_id(&"T".repeat(51)).is_err());
    }

    #[tokio::test]
    async fn test_validate_messages_input() {
        // Valid message arrays
        let messages = vec![json!({"text": "test", "user": "U123", "ts": "1234567890"})];
        assert!(validate_messages_input(&messages).is_ok());
        
        // Empty array
        let empty_messages: Vec<serde_json::Value> = vec![];
        assert!(validate_messages_input(&empty_messages).is_err());
        
        // Too many messages
        let too_many_messages: Vec<serde_json::Value> = (0..1001)
            .map(|i| json!({"text": format!("message {}", i), "user": "U123", "ts": "1234567890"}))
            .collect();
        assert!(validate_messages_input(&too_many_messages).is_err());
    }

    #[tokio::test]
    async fn test_validate_task_status() {
        // Valid statuses
        assert!(validate_task_status("suggested").is_ok());
        assert!(validate_task_status("accepted").is_ok());
        assert!(validate_task_status("rejected").is_ok());
        assert!(validate_task_status("created").is_ok());
        
        // Invalid statuses
        assert!(validate_task_status("").is_err());
        assert!(validate_task_status("invalid").is_err());
        assert!(validate_task_status("pending").is_err());
    }

    #[tokio::test]
    async fn test_create_task_from_slack_validation() {
        // Valid inputs
        let result = create_task_from_slack(
            "project-123".to_string(),
            "Test Task".to_string(),
            "Task description".to_string(),
            Some("@user".to_string()),
        ).await;
        assert!(result.is_ok());
        
        // Empty task name
        let result = create_task_from_slack(
            "project-123".to_string(),
            "".to_string(),
            "Task description".to_string(),
            None,
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("não pode estar vazio"));
        
        // Task name too long
        let long_name = "x".repeat(201);
        let result = create_task_from_slack(
            "project-123".to_string(),
            long_name,
            "Task description".to_string(),
            None,
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("muito longo"));
        
        // Description too long
        let long_description = "x".repeat(2001);
        let result = create_task_from_slack(
            "project-123".to_string(),
            "Test Task".to_string(),
            long_description,
            None,
        ).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("muito longa"));
    }

    #[tokio::test]
    async fn test_oauth_server_port_validation() {
        // Valid ports
        assert!(validate_port(8080).is_ok());
        assert!(validate_port(3000).is_ok());
        assert!(validate_port(65535).is_ok());
        
        // Invalid ports
        assert!(validate_port(80).is_err()); // Too low for non-root
        assert!(validate_port(1023).is_err()); // Below 1024
        assert!(validate_port(65536).is_err()); // Above maximum
    }

    #[tokio::test]
    async fn test_slack_client_validation() {
        // Test empty client ID validation
        let result = slack_build_oauth_url(
            "".to_string(),
            "http://localhost:8080".to_string(),
        ).await;
        assert!(result.is_err());
        
        // Test malformed redirect URI
        let result = slack_build_oauth_url(
            "123.456".to_string(),
            "not-a-url".to_string(),
        ).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_slack_message_processing() {
        let messages = vec![
            crate::slack::SlackMessage {
                ts: "1234567890.123456".to_string(),
                user: "U1234567890".to_string(),
                text: "TODO: Implement new feature for user dashboard".to_string(),
                channel: "C1234567890".to_string(),
                msg_type: "message".to_string(),
                thread_ts: None,
                attachments: None,
            },
            crate::slack::SlackMessage {
                ts: "1234567891.123456".to_string(),
                user: "U1234567891".to_string(),
                text: "Can you please review the PR? @john".to_string(),
                channel: "C1234567890".to_string(),
                msg_type: "message".to_string(),
                thread_ts: None,
                attachments: None,
            },
        ];

        let potential_tasks = crate::slack::process_messages_for_tasks(messages).await;
        
        // Should identify at least one task from the TODO message
        assert!(!potential_tasks.is_empty());
        
        // Check that the first task contains expected information
        let first_task = &potential_tasks[0];
        assert!(first_task.name.contains("Implement new feature for user dashboard"));
        assert!(first_task.source_channel == "C1234567890");
        assert!(first_task.confidence_score > 0.0);
    }

    #[tokio::test]
    async fn test_error_message_localization() {
        // Test that all error messages are in Portuguese
        let error_cases = vec![
            validate_client_id(""),
            validate_client_secret(""),
            validate_access_token(""),
            validate_team_id(""),
            validate_team_name(""),
            validate_project_id(""),
            validate_channel_id(""),
            validate_task_status("invalid"),
            validate_task_id(""),
            validate_reviewer_name(""),
            validate_port(80),
        ];

        for error_result in error_cases {
            assert!(error_result.is_err());
            let error_message = error_result.unwrap_err();
            
            // Check for Portuguese keywords to ensure localization
            let portuguese_keywords = ["não", "muito", "inválido", "caracteres", "vazio", "longo"];
            let contains_portuguese = portuguese_keywords.iter().any(|keyword| {
                error_message.to_lowercase().contains(keyword)
            });
            
            assert!(contains_portuguese, "Error message should be in Portuguese: {}", error_message);
        }
    }

    #[tokio::test]
    async fn test_slack_task_confidence_scoring() {
        let high_confidence_message = crate::slack::SlackMessage {
            ts: "1234567890.123456".to_string(),
            user: "U1234567890".to_string(),
            text: "TODO: ASAP fix the critical bug @john deadline tomorrow".to_string(),
            channel: "C1234567890".to_string(),
            msg_type: "message".to_string(),
            thread_ts: Some("1234567890.123456".to_string()),
            attachments: None,
        };

        let low_confidence_message = crate::slack::SlackMessage {
            ts: "1234567891.123456".to_string(),
            user: "U1234567891".to_string(),
            text: "Maybe we should consider looking into this sometime".to_string(),
            channel: "C1234567890".to_string(),
            msg_type: "message".to_string(),
            thread_ts: None,
            attachments: None,
        };

        let high_tasks = crate::slack::process_messages_for_tasks(vec![high_confidence_message]).await;
        let low_tasks = crate::slack::process_messages_for_tasks(vec![low_confidence_message]).await;

        // High confidence message should produce tasks with higher confidence scores
        if !high_tasks.is_empty() && !low_tasks.is_empty() {
            assert!(high_tasks[0].confidence_score > low_tasks[0].confidence_score);
        }
    }
}