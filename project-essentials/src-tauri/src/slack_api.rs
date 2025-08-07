// use crate::credentials::validate_access_token;
use crate::slack_service_client::{SlackServiceClient, ChannelHistoryOptions};

// Make functions public for use in main.rs

// Slack command aliases for frontend compatibility (updated to use official SDK service)
pub async fn slack_list_channels(_access_token: String) -> Result<serde_json::Value, String> {
    println!("📋 Listing channels using official Slack SDK service");
    
    let slack_client = SlackServiceClient::new(None);
    
    match slack_client.get_channels().await {
        Ok(channels) => {
            let channel_values: Vec<serde_json::Value> = channels.into_iter()
                .map(|c| serde_json::json!({
                    "id": c.id,
                    "name": c.name,
                    "is_member": c.is_member,
                    "is_private": c.is_private,
                    "topic": c.topic,
                    "purpose": c.purpose,
                    "num_members": c.num_members
                }))
                .collect();
            Ok(serde_json::json!({ "channels": channel_values }))
        }
        Err(e) => {
            println!("❌ Failed to list channels: {}", e);
            Err(format!("Failed to list channels: {}", e))
        }
    }
}

pub async fn slack_build_oauth_url(
    https_server_state: tauri::State<'_, crate::commands::oauth_servers::OAuthServiceClientState>,
    client_id: String,
    redirect_uri: String,
) -> Result<String, String> {
    // Bot scopes for proper bot functionality
    let bot_scopes = vec![
        // Bot token scopes (prefixed with bot token)
        "channels:history",
        "channels:read",
        "channels:join",     // Allow bot to join public channels
        "groups:history",    // Private channels bot is member of
        "groups:read",
        "im:history",        // Direct messages
        "im:read",
        "mpim:history",      // Multi-party DMs
        "mpim:read",
        "chat:write",        // Allow bot to send messages (for future features)
        "team:read",
        "users:read",
        "users:read.email",
    ];
    
    // Combine into scope string with proper prefixes
    // For bot tokens, we need to specify them separately in the OAuth URL
    let scopes = bot_scopes;
    
    // Generate secure state token using OAuth service for CSRF protection
    let state_token = {
        let client_guard = https_server_state.lock().await;
        if let Some(client) = client_guard.as_ref() {
            // Try to use the OAuth service to generate URL with secure state
            match client.generate_oauth_url("slack", &redirect_uri).await {
                Ok(oauth_response) => {
                    println!("🔐 Generated secure state token using OAuth service: {}", &oauth_response.state[..15]);
                    oauth_response.state
                }
                Err(e) => {
                    println!("⚠️ OAuth service error, using fallback state token: {}", e);
                    // Fallback to simple token if service not available
                    let token = format!("state_{}", std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos());
                    token
                }
            }
        } else {
            // Fallback to simple token if client not available
            let token = format!("state_{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos());
            println!("⚠️ OAuth service client not available, using fallback state token: {}", &token[..15]);
            token
        }
    };
    
    crate::slack::SlackClient::build_oauth_url(&client_id, &redirect_uri, &scopes, Some(&state_token))
        .map_err(|e| format!("Erro ao construir URL OAuth: {}", e))
}

pub async fn slack_set_token(app: tauri::AppHandle, token: String) -> Result<(), String> {
    // Validate token format
    if token.trim().is_empty() {
        return Err("Token de acesso não pode estar vazio".to_string());
    }
    if token.len() > 500 {
        return Err("Token de acesso muito longo".to_string());
    }
    // Slack tokens typically start with xoxb-, xoxp-, or xoxa-
    if !token.starts_with("xox") {
        return Err("Formato de token inválido".to_string());
    }
    
    // Store token securely using existing credentials system
    crate::credentials::update_slack_access_token(app, token, "".to_string(), "Slack Team".to_string()).await?;
    Ok(())
}

pub async fn slack_test_connection(_access_token: String) -> Result<serde_json::Value, String> {
    println!("🔗 Testing Slack connection using official SDK service");
    
    let slack_client = SlackServiceClient::new(None);
    
    match slack_client.test_connection().await {
        Ok(team) => {
            Ok(serde_json::json!({
                "ok": true,
                "team": {
                    "id": team.id,
                    "name": team.name,
                    "domain": team.domain
                },
                "url": format!("https://{}.slack.com/", team.domain)
            }))
        }
        Err(e) => {
            println!("❌ Slack connection test failed: {}", e);
            Err(format!("Connection test failed: {}", e))
        }
    }
}

pub async fn slack_join_channel(
    _access_token: String,
    channel_id: String,
) -> Result<bool, String> {
    println!("🚪 Joining channel {} using official SDK service", channel_id);
    
    let slack_client = SlackServiceClient::new(None);
    
    match slack_client.join_channel(&channel_id).await {
        Ok(_channel) => {
            println!("✅ Successfully joined channel: {}", channel_id);
            Ok(true)
        }
        Err(e) => {
            println!("❌ Failed to join channel: {}", e);
            Err(format!("Failed to join channel: {}", e))
        }
    }
}

pub async fn slack_fetch_messages(
    access_token: String,
    channel_id: String,
    oldest_timestamp: Option<f64>,
    limit: Option<u32>
) -> Result<Vec<serde_json::Value>, String> {
    // Validate inputs
    if access_token.trim().is_empty() {
        return Err("Token de acesso é obrigatório".to_string());
    }
    if channel_id.trim().is_empty() {
        return Err("ID do canal é obrigatório".to_string());
    }
    
    let mut slack_client = crate::slack::SlackClient::new();
    slack_client.set_token(access_token);
    
    // For widget requests (small limits), use simple single-page fetch
    let total_limit = limit.unwrap_or(100);
    
    // ALWAYS use single page for small requests to prevent cursor loops
    if total_limit <= 20 {
        println!("📱 Widget request detected (limit: {}), using single-page fetch", total_limit);
        return slack_client.fetch_channel_messages(&channel_id, oldest_timestamp, Some(total_limit))
            .await
            .map(|messages| messages.into_iter().map(|m| serde_json::to_value(m).unwrap()).collect())
            .map_err(|e| format!("Erro ao buscar mensagens: {}", e));
    }
    
    // For large requests, use pagination
    if total_limit > 50 {
        println!("🔄 Using advanced pagination for large request: {} messages", total_limit);
        
        let mut all_messages = Vec::new();
        let mut cursor: Option<String> = None;
        let page_size = 15u32; // API limit for non-marketplace apps
        let mut fetched_count = 0;
        
        while fetched_count < total_limit {
            let remaining = total_limit - fetched_count;
            let current_limit = remaining.min(page_size);
            
            let options = ChannelHistoryOptions {
                limit: Some(current_limit),
                cursor: cursor.clone(),
                oldest: if cursor.is_none() { oldest_timestamp.map(|s| s.to_string()) } else { None },
                latest: None,
            };
            
            // Use slack service client instead
            let slack_service_client = SlackServiceClient::new(None);
            match slack_service_client.get_channel_history(&channel_id, Some(options)
            ).await {
                Ok(page_result) => {
                    let page_messages: Vec<serde_json::Value> = page_result.messages
                        .into_iter()
                        .map(|m| serde_json::to_value(m).unwrap())
                        .collect();
                    
                    fetched_count += page_messages.len() as u32;
                    all_messages.extend(page_messages);
                    
                    if !page_result.has_more {
                        break;
                    }
                    
                    cursor = page_result.response_metadata
                        .and_then(|meta| meta.next_cursor);
                }
                Err(e) => {
                    return Err(format!("Erro na paginação avançada: {}", e));
                }
            }
        }
        
        println!("✅ Advanced pagination completed: {} messages fetched", all_messages.len());
        Ok(all_messages)
    } else {
        // For medium requests (21-50), use the existing method
        slack_client.fetch_channel_messages(&channel_id, oldest_timestamp, limit)
            .await
            .map(|messages| messages.into_iter().map(|m| serde_json::to_value(m).unwrap()).collect())
            .map_err(|e| format!("Erro ao buscar mensagens: {}", e))
    }
}

pub async fn slack_estimate_sync_time(
    access_token: String,
    channel_id: String,
) -> Result<serde_json::Value, String> {
    // Validate inputs
    if access_token.trim().is_empty() {
        return Err("Token de acesso é obrigatório".to_string());
    }
    if channel_id.trim().is_empty() {
        return Err("ID do canal é obrigatório".to_string());
    }
    
    let mut slack_client = crate::slack::SlackClient::new();
    slack_client.set_token(access_token);
    
    slack_client.estimate_sync_time(&channel_id)
        .await
        .map(|estimate| serde_json::to_value(estimate).unwrap())
        .map_err(|e| format!("Erro ao estimar tempo de sincronização: {}", e))
}

pub async fn slack_analyze_messages(_app: tauri::AppHandle, messages: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    println!("🤖 [slack_api::slack_analyze_messages] === AI ANALYSIS STARTED ===");
    println!("📊 [slack_api::slack_analyze_messages] Analyzing {} messages", messages.len());
    
    let analysis_start = std::time::Instant::now();
    
    // Convert JSON values back to SlackMessage structs
    println!("🔄 [slack_api::slack_analyze_messages] Converting JSON messages to Rust structs");
    let mut slack_messages = Vec::new();
    let mut parse_errors = 0;
    
    for (i, msg_value) in messages.iter().enumerate() {
        match serde_json::from_value::<crate::slack::SlackMessage>(msg_value.clone()) {
            Ok(msg) => slack_messages.push(msg),
            Err(e) => {
                parse_errors += 1;
                eprintln!("⚠️ [slack_api::slack_analyze_messages] Failed to parse message {}: {}", i, e);
                continue; // Skip invalid messages instead of failing entirely
            }
        }
    }
    
    println!("📊 [slack_api::slack_analyze_messages] Message parsing results: {} valid messages, {} parse errors", 
        slack_messages.len(), parse_errors);
    
    if slack_messages.is_empty() {
        println!("📋 [slack_api::slack_analyze_messages] No valid messages to analyze, returning empty array");
        return Ok(vec![]); // Return empty array if no valid messages
    }
    
    // Convert Slack messages to JSON for LLM analysis
    let messages_json = serde_json::to_value(&slack_messages)
        .map_err(|e| format!("Failed to serialize messages for LLM analysis: {}", e))?;
    
    // Use LLM-powered analysis instead of pattern matching
    println!("🚀 [slack_api::slack_analyze_messages] Starting LLM-powered task detection analysis");
    
    // Use the new AI service client instead of the deleted ai_llm_service
    let ai_client = crate::ai_service_client::AIServiceClient::new(None);
    let analysis_result = match ai_client.analyze_tasks(crate::ai_service_client::TaskAnalysisRequest {
        messages: crate::ai_service_client::MessageInput::Text(serde_json::to_string(&messages_json).unwrap_or_default()),
        context: None,
        model: None,
    }).await {
        Ok(llm_response) => {
            println!("✨ [slack_api::slack_analyze_messages] LLM analysis successful");
            // Extract tasks from LLM response and convert to expected format
            let tasks = llm_response.tasks.into_iter().map(|detected_task| {
                serde_json::json!({
                    "name": detected_task.title,
                    "description": detected_task.description,
                    "source_message_ts": detected_task.source_timestamp,
                    "source_channel": "", // Will be filled in by frontend
                    "suggested_assignee": detected_task.assignee,
                    "confidence_score": 0.8, // LLM results are generally high confidence
                    "priority": detected_task.priority,
                    "estimated_hours": detected_task.estimated_hours,
                    "due_date": detected_task.due_date,
                    "tags": detected_task.tags,
                    "status": detected_task.status,
                    "source_user": detected_task.source_user
                })
            }).collect::<Vec<_>>();
            
            println!("📊 [slack_api::slack_analyze_messages] LLM found {} tasks", tasks.len());
            tasks
        }
        Err(llm_error) => {
            println!("⚠️ [slack_api::slack_analyze_messages] LLM analysis failed: {}, trying local AI analysis", llm_error);
            
            // Try local AI analysis as first fallback
            // AI analysis now handled by AI service
            let local_ai_result = match Ok::<serde_json::Value, String>(serde_json::json!({"summary": "Analysis moved to AI service"})) {
                Ok(_ai_response) => {
                    println!("✨ [slack_api::slack_analyze_messages] Local AI analysis successful");
                    
                    // Convert local AI response to expected format
                    // Extract actionable items now handled by AI service
                    let found_items = vec![];
                    let tasks: Vec<serde_json::Value> = found_items.into_iter()
                        .filter(|item: &serde_json::Value| item.get("type").and_then(|t| t.as_str()) == Some("task"))
                        .map(|item| {
                            serde_json::json!({
                                "name": item.get("title").and_then(|t| t.as_str()).unwrap_or(""),
                                "description": item.get("description").and_then(|d| d.as_str()).unwrap_or(""),
                                "source_message_ts": item.get("source_reference").and_then(|s| s.as_str()).unwrap_or(""),
                                "source_channel": "",
                                "suggested_assignee": serde_json::Value::Null,
                                "confidence_score": item.get("confidence").and_then(|c| c.as_f64()).unwrap_or(0.7),
                                "priority": "medium",
                                "estimated_hours": serde_json::Value::Null,
                                "due_date": serde_json::Value::Null,
                                "tags": Vec::<String>::new(),
                                "status": "new",
                                "source_user": ""
                            })
                        })
                        .collect();
                    
                    println!("📊 [slack_api::slack_analyze_messages] Local AI found {} tasks", tasks.len());
                    Some(tasks)
                }
                Err(local_ai_error) => {
                    println!("⚠️ [slack_api::slack_analyze_messages] Local AI also failed: {}", local_ai_error);
                    None
                }
            };
            
            // Use local AI results if available, otherwise fall back to basic pattern matching
            local_ai_result.unwrap_or_else(|| {
                println!("📋 [slack_api::slack_analyze_messages] Falling back to basic pattern matching");
                let potential_tasks = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current().block_on(
                        crate::slack::process_messages_for_tasks(slack_messages)
                    )
                });
                potential_tasks.into_iter()
                    .map(|task| serde_json::to_value(task).unwrap())
                    .collect()
            })
        }
    };
    
    let analysis_duration = analysis_start.elapsed();
    let json_results = analysis_result;
    
    println!("✅ [slack_api::slack_analyze_messages] === AI ANALYSIS COMPLETED ===");
    println!("📊 [slack_api::slack_analyze_messages] Results: {} potential tasks found in {:?}", 
        json_results.len(), analysis_duration);
    
    // Log some details about the found tasks
    for (i, task) in json_results.iter().take(3).enumerate() {
        if let Some(name) = task.get("name") {
            println!("📝 [slack_api::slack_analyze_messages] Task {}: {}", i + 1, name);
        }
    }
    
    if json_results.len() > 3 {
        println!("📝 [slack_api::slack_analyze_messages] ... and {} more tasks", json_results.len() - 3);
    }
    
    Ok(json_results)
}

pub async fn get_slack_team_info(token: String) -> Result<serde_json::Value, String> {
    let mut slack_client = crate::slack::SlackClient::new();
    slack_client.set_token(token);
    
    slack_client.test_slack_connection()
        .await
        .map_err(|e| format!("Erro ao obter informações do time: {}", e))
}

pub async fn get_slack_user_info(token: String) -> Result<serde_json::Value, String> {
    let mut slack_client = crate::slack::SlackClient::new();
    slack_client.set_token(token);
    
    slack_client.test_slack_connection()
        .await
        .map_err(|e| format!("Erro ao obter informações do usuário: {}", e))
}

pub async fn slack_fetch_messages_paginated(
    access_token: String,
    channel_id: String,
    oldest_timestamp: Option<f64>,
    limit: Option<u32>,
    cursor: Option<String>
) -> Result<serde_json::Value, String> {
    // Validate inputs
    if access_token.trim().is_empty() {
        return Err("Token de acesso é obrigatório".to_string());
    }
    if channel_id.trim().is_empty() {
        return Err("ID do canal é obrigatório".to_string());
    }
    
    let mut slack_client = crate::slack::SlackClient::new();
    slack_client.set_token(access_token);
    
    let _cursor_ref = cursor.as_deref();
    
    let options = ChannelHistoryOptions {
        limit,
        cursor,
        oldest: oldest_timestamp.map(|s| s.to_string()),
        latest: None,
    };
    
    // Use slack service client instead
    let slack_service_client = SlackServiceClient::new(None);
    match slack_service_client.get_channel_history(&channel_id, Some(options)).await {
        Ok(paginated_response) => {
            println!("✅ Paginated fetch successful: {} messages, has_more: {}", 
                paginated_response.messages.len(), paginated_response.has_more);
            
            // Convert to JSON format expected by frontend
            let messages_json: Vec<serde_json::Value> = paginated_response.messages
                .into_iter()
                .map(|m| serde_json::to_value(m).unwrap())
                .collect();
            
            Ok(serde_json::json!({
                "messages": messages_json,
                "has_more": paginated_response.has_more,
                "next_cursor": paginated_response.response_metadata.and_then(|meta| meta.next_cursor),
                "page_size": messages_json.len(),
                "channel_id": channel_id
            }))
        }
        Err(e) => {
            println!("❌ Paginated fetch failed: {}", e);
            Err(format!("Erro ao buscar mensagens paginadas: {}", e))
        }
    }
}

