use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use url::Url;
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackOAuthResponse {
    pub ok: bool,
    pub access_token: Option<String>,
    pub team: Option<SlackTeam>,
    pub incoming_webhook: Option<SlackWebhook>,
    pub error: Option<String>,
    // Additional Slack OAuth v2 fields
    pub app_id: Option<String>,
    pub authed_user: Option<SlackAuthedUser>,
    pub enterprise: Option<SlackEnterprise>,
    pub is_enterprise_install: Option<bool>,
    pub bot_user_id: Option<String>,
    pub bot_id: Option<String>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackTeam {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncEstimate {
    pub channel_id: String,
    pub estimated_pages: usize,
    pub estimated_minutes: usize,
    pub estimated_seconds: usize,
    pub first_page_messages: usize,
    pub has_more_pages: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackWebhook {
    pub channel: String,
    pub channel_id: String,
    pub configuration_url: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackAuthedUser {
    pub id: String,
    pub scope: Option<String>,
    pub access_token: Option<String>,
    pub token_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackEnterprise {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackChannel {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(alias = "is_member", rename = "isMember", default)]
    pub is_member: bool,
    #[serde(alias = "is_private", rename = "isPrivate", default)]
    pub is_private: bool,
    #[serde(alias = "is_archived", rename = "isArchived", default)]
    pub is_archived: bool,
    #[serde(default)]
    pub is_im: bool,
    #[serde(default)]
    pub is_mpim: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackUser {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub real_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub is_bot: bool,
    #[serde(default)]
    pub deleted: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profile: Option<SlackUserProfile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackUserProfile {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub real_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_24: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_32: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_48: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackMessage {
    pub ts: String,
    pub user: Option<String>,
    pub text: String,
    pub channel: Option<String>, // Made optional since Slack API doesn't always include it
    #[serde(rename = "type")]
    pub msg_type: String,
    pub thread_ts: Option<String>,
    pub attachments: Option<Vec<SlackAttachment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackAttachment {
    pub title: Option<String>,
    pub text: Option<String>,
    pub author_name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackListResponse<T> {
    pub ok: bool,
    #[serde(alias = "channels")]
    pub conversations: Option<Vec<T>>,
    pub messages: Option<Vec<T>>,
    pub error: Option<String>,
    pub has_more: Option<bool>,
    pub response_metadata: Option<SlackResponseMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackResponseMetadata {
    pub next_cursor: Option<String>,
}

// Global sync state to prevent concurrent fetches for the same channel
static CHANNEL_SYNC_LOCKS: Lazy<Mutex<HashMap<String, Arc<Mutex<bool>>>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

#[derive(Clone)]
pub struct SlackClient {
    client: Client,
    access_token: Option<String>,
}

impl SlackClient {
    pub fn new() -> Self {
        // Create a more robust HTTP client with timeouts and retries
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .user_agent("ProjectBoxes/1.0")
            .build()
            .unwrap_or_else(|_| Client::new());
            
        Self {
            client,
            access_token: None,
        }
    }

    pub fn set_token(&mut self, token: String) {
        self.access_token = Some(token);
    }

    pub fn get_token(&self) -> Option<&String> {
        self.access_token.as_ref()
    }

    /// Test the connection and validate required scopes
    pub async fn test_slack_connection(&self) -> Result<serde_json::Value, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        // Simple retry logic for network issues
        let mut _last_error = None;
        for attempt in 1..=3 {
            let response_result = self.client
                .get("https://slack.com/api/auth.test")
                .bearer_auth(token)
                .send()
                .await;
                
            let response = match response_result {
                Ok(resp) => resp,
                Err(e) => {
                    _last_error = Some(e);
                    if attempt < 3 {
                        tokio::time::sleep(std::time::Duration::from_millis(1000 * attempt)).await;
                        continue;
                    } else {
                        return Err(_last_error.unwrap().into());
                    }
                }
            };
            
            // If we got a response, process it immediately
            return self.process_auth_response(response).await;
        }
        
        // This should never be reached, but just in case
        Err("Falha após múltiplas tentativas".into())
    }
    
    async fn process_auth_response(&self, response: reqwest::Response) -> Result<serde_json::Value, Box<dyn Error + Send + Sync>> {

        // Check HTTP status
        if !response.status().is_success() {
            return Err(format!("Erro HTTP {}: {}", response.status().as_u16(), 
                match response.status().as_u16() {
                    401 => "Token de acesso inválido ou expirado",
                    403 => "Permissões insuficientes",
                    429 => "Muitas requisições. Tente novamente em alguns segundos",
                    500..=599 => "Erro interno do Slack. Tente novamente mais tarde",
                    _ => "Erro desconhecido"
                }).into());
        }

        let response_text = response.text().await
            .map_err(|e| format!("Erro ao ler resposta do Slack: {}", e))?;
        
        let auth_response: serde_json::Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Erro ao processar resposta do Slack: {}", e))?;
        
        // Check if the response indicates success
        if !auth_response.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
            let error_msg = auth_response.get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Erro desconhecido");
            
            return Err(match error_msg {
                "invalid_auth" => "Token de acesso inválido. Execute a autenticação OAuth novamente".into(),
                "account_inactive" => "Conta Slack inativa".into(),
                "missing_scope" => "Permissões insuficientes. A aplicação precisa de escopos adicionais".into(),
                _ => format!("Erro do Slack: {}", error_msg).into()
            });
        }

        Ok(auth_response)
    }


    pub async fn exchange_code_for_token(
        &self,
        code: &str,
        client_id: &str,
        client_secret: &str,
        redirect_uri: &str,
    ) -> Result<SlackOAuthResponse, Box<dyn Error + Send + Sync>> {
        // Validate inputs
        if code.trim().is_empty() {
            return Err("Código de autorização não pode estar vazio".into());
        }
        if client_id.trim().is_empty() {
            return Err("Client ID não pode estar vazio".into());
        }
        if client_secret.trim().is_empty() {
            return Err("Client Secret não pode estar vazio".into());
        }
        if redirect_uri.trim().is_empty() {
            return Err("URI de redirecionamento não pode estar vazio".into());
        }

        let params = [
            ("code", code),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("redirect_uri", redirect_uri),
        ];

        let response = self.client
            .post("https://slack.com/api/oauth.v2.access")
            .form(&params)
            .send()
            .await
            .map_err(|e| -> String {
                if e.is_timeout() {
                    "Timeout na autenticação OAuth. Tente novamente.".to_string()
                } else if e.is_connect() {
                    "Erro de conexão durante OAuth. Verifique sua internet.".to_string()
                } else {
                    format!("Erro na requisição OAuth: {}", e)
                }
            })?;

        // Check HTTP status
        if !response.status().is_success() {
            return Err(format!("Erro HTTP na autenticação OAuth {}: {}", 
                response.status().as_u16(),
                match response.status().as_u16() {
                    400 => "Dados de autenticação inválidos",
                    401 => "Client ID ou Client Secret incorretos",
                    403 => "Acesso negado pelo Slack",
                    500..=599 => "Erro interno do Slack durante OAuth",
                    _ => "Erro desconhecido na autenticação"
                }).into());
        }

        let oauth_response: SlackOAuthResponse = response.json().await
            .map_err(|e| format!("Erro ao processar resposta OAuth: {}", e))?;
        
        Ok(oauth_response)
    }

    pub async fn list_channels(&self) -> Result<Vec<SlackChannel>, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        let mut all_channels = Vec::new();
        let mut cursor: Option<String> = None;
        
        // Paginate through all channels
        loop {
            let mut query_params = vec![
                ("types", "public_channel,private_channel,im,mpim"),
                ("exclude_archived", "false"), // Include archived channels for completeness
                ("limit", "1000"), // Maximum allowed by Slack API
            ];
            
            if let Some(ref c) = cursor {
                query_params.push(("cursor", c.as_str()));
            }
            
            let response = self.client
                .get("https://slack.com/api/conversations.list")
                .bearer_auth(token)
                .query(&query_params)
                .send()
                .await
                .map_err(|e| -> String {
                    if e.is_timeout() {
                        "Timeout na conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else if e.is_connect() {
                        "Erro de conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else {
                        format!("Erro na requisição ao Slack: {}", e)
                    }
                })?;

            // Check HTTP status
            if !response.status().is_success() {
                return Err(format!("Erro HTTP {}: {}", response.status().as_u16(), 
                    match response.status().as_u16() {
                        401 => "Token de acesso inválido ou expirado",
                        403 => "Permissões insuficientes. Verifique os escopos da aplicação Slack",
                        429 => "Muitas requisições. Tente novamente em alguns segundos",
                        500..=599 => "Erro interno do Slack. Tente novamente mais tarde",
                        _ => "Erro desconhecido"
                    }).into());
            }

            // First get the raw response text for debugging
            let response_text = response.text().await
                .map_err(|e| format!("Erro ao ler resposta do Slack: {}", e))?;
            
            // Try to parse the JSON and provide better error context
            let list_response: SlackListResponse<SlackChannel> = serde_json::from_str(&response_text)
                .map_err(|e| {
                    eprintln!("Slack API Response: {}", response_text);
                    format!("Erro ao processar resposta do Slack: {}. Response: {}", e, response_text.chars().take(500).collect::<String>())
                })?;
            
            if !list_response.ok {
                let error_msg = list_response.error.unwrap_or_else(|| "Erro desconhecido".to_string());
                return Err(match error_msg.as_str() {
                    "invalid_auth" => "Token de acesso inválido. Execute a autenticação OAuth novamente".into(),
                    "account_inactive" => "Conta Slack inativa".into(),
                    "missing_scope" => "Permissões insuficientes. A aplicação precisa do escopo 'channels:read'".into(),
                    "rate_limited" => "Limite de requisições excedido. Tente novamente em alguns segundos".into(),
                    _ => format!("Erro do Slack: {}", error_msg).into()
                });
            }

            // Add channels from this page
            if let Some(channels) = list_response.conversations {
                all_channels.extend(channels);
            }
            
            // Check if there's more data
            if let Some(response_metadata) = list_response.response_metadata {
                if let Some(next_cursor) = response_metadata.next_cursor {
                    if !next_cursor.is_empty() {
                        cursor = Some(next_cursor);
                        continue;
                    }
                }
            }
            
            break;
        }
        
        // Filter out archived channels and process channel names
        let mut active_channels: Vec<SlackChannel> = all_channels
            .into_iter()
            .filter(|channel| !channel.is_archived)
            .map(|mut channel| {
                // Generate appropriate names for DMs and channels without names
                if channel.name.is_none() {
                    if channel.is_im {
                        channel.name = Some(format!("DM-{}", &channel.id[1..6])); // Use part of ID for DM name
                    } else if channel.is_mpim {
                        channel.name = Some(format!("Group-{}", &channel.id[1..6])); // Use part of ID for group name
                    } else {
                        channel.name = Some(format!("Channel-{}", &channel.id[1..6])); // Fallback name
                    }
                }
                channel
            })
            .collect();

        // Sort channels: regular channels first, then DMs/groups
        active_channels.sort_by(|a, b| {
            match (a.is_im || a.is_mpim, b.is_im || b.is_mpim) {
                (false, true) => std::cmp::Ordering::Less,  // Regular channels before DMs
                (true, false) => std::cmp::Ordering::Greater, // DMs after regular channels
                _ => a.name.as_ref().unwrap_or(&String::new()).cmp(b.name.as_ref().unwrap_or(&String::new())) // Alphabetical within same type
            }
        });

        Ok(active_channels)
    }

    pub async fn fetch_channel_messages(
        &self,
        channel_id: &str,
        oldest_timestamp: Option<f64>,
        limit: Option<u32>
    ) -> Result<Vec<SlackMessage>, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        // Validate channel_id
        if channel_id.trim().is_empty() {
            return Err("Channel ID não pode estar vazio".into());
        }
        
        // Get or create a lock for this channel to prevent concurrent fetches
        let channel_lock = {
            let mut locks = CHANNEL_SYNC_LOCKS.lock().unwrap();
            locks.entry(channel_id.to_string())
                .or_insert_with(|| Arc::new(Mutex::new(false)))
                .clone()
        };
        
        // Check if sync is already in progress
        {
            let mut is_syncing = match channel_lock.try_lock() {
                Ok(guard) => guard,
                Err(_) => {
                    println!("⚠️ [DEBUG] Sync already in progress for channel {}, skipping duplicate request", channel_id);
                    return Ok(vec![]); // Return empty to avoid duplicate fetches
                }
            };
            
            if *is_syncing {
                println!("⚠️ [DEBUG] Sync already in progress for channel {} (locked), skipping duplicate request", channel_id);
                return Ok(vec![]);
            }
            
            // Mark as syncing
            *is_syncing = true;
        } // Drop the lock here before any async operations
        
        let mut all_messages = Vec::new();
        let mut cursor: Option<String> = None;
        let requested_limit = limit.unwrap_or(15);
        let page_limit = requested_limit.min(15); // Non-Marketplace apps limited to 15 messages per request
        let mut _consecutive_rate_limits = 0;
        let mut previous_cursors: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut page_count = 0;
        const MAX_PAGES: usize = 100; // Safety limit to prevent infinite loops
        
        // For small requests (widgets), disable pagination to prevent loops
        let enable_pagination = requested_limit > 15;
        
        loop {
            println!("🔄 [DEBUG] Fetching page with cursor: {:?}", cursor);
            
            // Convert limit to string to avoid temporary value issues
            let limit_str = page_limit.to_string();
            let mut query_params = vec![
                ("channel", channel_id),
                ("limit", &limit_str),
            ];
            
            // Add cursor for pagination OR oldest timestamp (but NEVER both)
            // This is crucial - Slack API doesn't handle oldest + cursor properly
            let cursor_str;
            let oldest_str;
            if let Some(ref cursor_val) = cursor {
                // When paginating, only use cursor - no oldest timestamp
                cursor_str = cursor_val.clone();
                query_params.push(("cursor", &cursor_str));
            } else if let Some(oldest) = oldest_timestamp {
                // Only use oldest timestamp on first request (when cursor is None)
                // After first request, we'll ignore oldest_timestamp
                oldest_str = oldest.to_string();
                query_params.push(("oldest", &oldest_str));
            }
            
            let response = self.client
                .get("https://slack.com/api/conversations.history")
                .bearer_auth(token)
                .query(&query_params)
                .send()
                .await
                .map_err(|e| -> String {
                    if e.is_timeout() {
                        "Timeout na conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else if e.is_connect() {
                        "Erro de conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else {
                        format!("Erro na requisição ao Slack: {}", e)
                    }
                })?;

            // Check HTTP status and handle rate limiting
            if response.status().as_u16() == 429 {
                // Rate limited - check Retry-After header
                let retry_after = response.headers()
                    .get("retry-after")
                    .and_then(|h| h.to_str().ok())
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(5); // Default to 5 seconds if no header
                    
                println!("⚠️ [DEBUG] Rate limited, waiting {} seconds...", retry_after);
                tokio::time::sleep(tokio::time::Duration::from_secs(retry_after)).await;
                continue; // Retry the same request
            }
            
            if !response.status().is_success() {
                return Err(format!("Erro HTTP {}: {}", response.status().as_u16(), 
                    match response.status().as_u16() {
                        401 => "Token de acesso inválido ou expirado",
                        403 => "Sem permissão para acessar este canal. Verifique se o bot tem acesso ao canal",
                        404 => "Canal não encontrado",
                        500..=599 => "Erro interno do Slack. Tente novamente mais tarde",
                        _ => "Erro desconhecido"
                    }).into());
            }

            let response_text = response.text().await
                .map_err(|e| format!("Erro ao ler resposta do Slack: {}", e))?;
            
            let messages_response: SlackListResponse<SlackMessage> = serde_json::from_str(&response_text)
                .map_err(|e| {
                    eprintln!("Slack Messages API Response: {}", response_text);
                    format!("Erro ao processar resposta do Slack: {}. Response: {}", e, response_text.chars().take(500).collect::<String>())
                })?;
            
            if !messages_response.ok {
                let error_msg = messages_response.error.unwrap_or_else(|| "Erro desconhecido".to_string());
                return Err(match error_msg.as_str() {
                    "invalid_auth" => "Token de acesso inválido. Execute a autenticação OAuth novamente".into(),
                    "channel_not_found" => "Canal não encontrado".into(),
                    "not_in_channel" => "Bot não tem acesso a este canal. Adicione o bot ao canal primeiro".into(),
                    "missing_scope" => "Permissões insuficientes. A aplicação precisa do escopo 'channels:history'".into(),
                    "rate_limited" => "Limite de requisições excedido. Tente novamente em alguns segundos".into(),
                    _ => format!("Erro do Slack: {}", error_msg).into()
                });
            }

            // Extract messages from this page
            let mut page_messages = messages_response.messages.unwrap_or_default();
            
            // Debug: Log pagination info
            println!("🔍 [DEBUG] Page returned {} messages", page_messages.len());
            println!("🔍 [DEBUG] Slack has_more: {:?}", messages_response.has_more);
            println!("🔍 [DEBUG] Slack next_cursor: {:?}", messages_response.response_metadata.as_ref().and_then(|m| m.next_cursor.as_ref()));
            
            // Fill in the channel field for all messages (Slack API doesn't always include it)
            for message in &mut page_messages {
                if message.channel.is_none() {
                    message.channel = Some(channel_id.to_string());
                }
            }
            
            all_messages.extend(page_messages);
            
            // For widget requests, stop after first page
            if !enable_pagination {
                println!("📱 [DEBUG] Widget request - stopping after first page (got {} messages)", all_messages.len());
                break;
            }
            
            // Check if there are more pages
            if messages_response.has_more.unwrap_or(false) {
                let next_cursor = messages_response.response_metadata
                    .and_then(|metadata| metadata.next_cursor)
                    .filter(|cursor| !cursor.is_empty()); // Filter out empty cursors
                    
                if let Some(next_cursor_val) = next_cursor {
                    // Check for cursor repetition to prevent infinite loops
                    if previous_cursors.contains(&next_cursor_val) {
                        println!("⚠️ [DEBUG] Detected cursor repetition: {}, breaking pagination loop", next_cursor_val);
                        break;
                    }
                    
                    // Check if cursor is same as current (another infinite loop prevention)
                    if cursor.as_ref() == Some(&next_cursor_val) {
                        println!("⚠️ [DEBUG] Next cursor is same as current cursor: {}, breaking loop", next_cursor_val);
                        break;
                    }
                    
                    // Add current cursor to tracking set before updating
                    if let Some(current_cursor) = &cursor {
                        previous_cursors.insert(current_cursor.clone());
                    }
                    
                    cursor = Some(next_cursor_val);
                    
                    // Safety check for max pages
                    page_count += 1;
                    if page_count >= MAX_PAGES {
                        println!("⚠️ [DEBUG] Reached maximum page limit ({}), stopping pagination", MAX_PAGES);
                        break;
                    }
                    
                    // Rate limiting: reduced to 1 second to prevent frontend timeouts
                    // while still respecting Slack API limits
                    println!("⏱️ [DEBUG] Waiting 1 second between pagination requests...");
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                } else {
                    println!("⚠️ [DEBUG] has_more is true but no valid cursor provided, stopping pagination");
                    break;
                }
            } else {
                println!("✅ [DEBUG] No more pages to fetch (has_more = false)");
                break;
            }
        }
        
        // Release the sync lock
        {
            if let Ok(mut is_syncing) = channel_lock.lock() {
                *is_syncing = false;
            }
        }
        
        println!("✅ [DEBUG] Total messages fetched: {} for channel {}", all_messages.len(), channel_id);
        Ok(all_messages)
    }

    pub async fn estimate_sync_time(&self, channel_id: &str) -> Result<SyncEstimate, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        // Validate channel_id
        if channel_id.trim().is_empty() {
            return Err("Channel ID não pode estar vazio".into());
        }

        // First, get channel info to see if it has a message count estimate
        let info_response = self.client
            .get("https://slack.com/api/conversations.info")
            .bearer_auth(token)
            .query(&[("channel", channel_id)])
            .send()
            .await
            .map_err(|e| format!("Erro na requisição ao Slack: {}", e))?;

        if !info_response.status().is_success() {
            return Err(format!("Erro HTTP {}", info_response.status().as_u16()).into());
        }

        let _info_json: serde_json::Value = info_response.json().await
            .map_err(|e| format!("Erro ao parsear resposta JSON: {}", e))?;

        // Try to get an estimate by fetching just the first page to see pagination info
        let response = self.client
            .get("https://slack.com/api/conversations.history")
            .bearer_auth(token)
            .query(&[
                ("channel", channel_id),
                ("limit", "15"), // Use the rate-limited page size
            ])
            .send()
            .await
            .map_err(|e| format!("Erro na requisição ao Slack: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Erro HTTP {}", response.status().as_u16()).into());
        }

        let json: serde_json::Value = response.json().await
            .map_err(|e| format!("Erro ao parsear resposta JSON: {}", e))?;

        let messages_in_first_page = json["messages"]
            .as_array()
            .map(|arr| arr.len())
            .unwrap_or(0);

        let has_more = json["has_more"].as_bool().unwrap_or(false);
        
        // Rough estimation logic
        let estimated_pages = if !has_more {
            1 // Only one page needed
        } else if messages_in_first_page < 15 {
            // If first page isn't full, likely just a few pages
            (messages_in_first_page * 3).max(2)
        } else {
            // Conservative estimate: assume average channel has 10-20 pages worth of history
            // This is just a rough estimate since we can't know without fetching everything
            15
        };

        // Each page takes ~15 seconds
        let estimated_minutes = estimated_pages * 15 / 60;
        let estimated_seconds = estimated_pages * 15;

        Ok(SyncEstimate {
            channel_id: channel_id.to_string(),
            estimated_pages,
            estimated_minutes,
            estimated_seconds,
            first_page_messages: messages_in_first_page,
            has_more_pages: has_more,
        })
    }

    pub async fn join_channel(&self, channel_id: &str) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        // Validate channel_id
        if channel_id.trim().is_empty() {
            return Err("Channel ID não pode estar vazio".into());
        }
        
        #[derive(Serialize)]
        struct JoinRequest {
            channel: String,
        }
        
        let request_body = JoinRequest {
            channel: channel_id.to_string(),
        };
        
        let response = self.client
            .post("https://slack.com/api/conversations.join")
            .bearer_auth(token)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| -> String {
                if e.is_timeout() {
                    "Timeout na conexão com Slack. Verifique sua conexão com a internet.".to_string()
                } else if e.is_connect() {
                    "Erro de conexão com Slack. Verifique sua conexão com a internet.".to_string()
                } else {
                    format!("Erro na requisição ao Slack: {}", e)
                }
            })?;

        // Check HTTP status
        if !response.status().is_success() {
            return Err(format!("Erro HTTP {}: {}", response.status().as_u16(), 
                match response.status().as_u16() {
                    401 => "Token de acesso inválido ou expirado",
                    403 => "Sem permissão para entrar neste canal",
                    429 => "Muitas requisições. Tente novamente em alguns segundos",
                    _ => "Erro desconhecido do Slack"
                }).into());
        }

        #[derive(Deserialize)]
        struct JoinResponse {
            ok: bool,
            error: Option<String>,
        }

        let join_response: JoinResponse = response.json().await
            .map_err(|e| format!("Erro ao processar resposta do Slack: {}", e))?;

        if !join_response.ok {
            let error_msg = join_response.error.unwrap_or_else(|| "Erro desconhecido".to_string());
            return Err(match error_msg.as_str() {
                "invalid_auth" => "Token de acesso inválido. Execute a autenticação OAuth novamente".into(),
                "channel_not_found" => "Canal não encontrado".into(),
                "is_archived" => "Não é possível entrar em canal arquivado".into(),
                "method_not_supported_for_channel_type" => "Não é possível entrar neste tipo de canal (privado ou DM)".into(),
                "missing_scope" => "Permissões insuficientes. A aplicação precisa do escopo 'channels:join'".into(),
                "rate_limited" => "Limite de requisições excedido. Tente novamente em alguns segundos".into(),
                "already_in_channel" => return Ok(true), // Already in channel is considered success
                _ => format!("Erro do Slack: {}", error_msg).into()
            });
        }

        Ok(true)
    }

    /// List all users in the Slack workspace
    pub async fn list_users(&self) -> Result<Vec<SlackUser>, Box<dyn Error + Send + Sync>> {
        let token = self.access_token.as_ref().ok_or("Token de acesso não configurado")?;
        
        let mut all_users = Vec::new();
        let mut cursor: Option<String> = None;
        
        // Paginate through all users
        loop {
            let mut query_params = vec![
                ("limit", "1000"), // Maximum allowed by Slack API
            ];
            
            if let Some(ref c) = cursor {
                query_params.push(("cursor", c.as_str()));
            }
            
            let response = self.client
                .get("https://slack.com/api/users.list")
                .bearer_auth(token)
                .query(&query_params)
                .send()
                .await
                .map_err(|e| -> String {
                    if e.is_timeout() {
                        "Timeout na conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else if e.is_connect() {
                        "Erro de conexão com Slack. Verifique sua conexão com a internet.".to_string()
                    } else {
                        format!("Erro na requisição ao Slack: {}", e)
                    }
                })?;

            // Check HTTP status
            if !response.status().is_success() {
                return Err(format!("Erro HTTP {}: {}", response.status().as_u16(), 
                    match response.status().as_u16() {
                        401 => "Token de acesso inválido ou expirado",
                        403 => "Sem permissão para listar usuários",
                        429 => "Muitas requisições. Tente novamente em alguns segundos",
                        _ => "Erro desconhecido do Slack"
                    }).into());
            }

            #[derive(Deserialize)]
            struct UsersListResponse {
                ok: bool,
                members: Option<Vec<SlackUser>>,
                error: Option<String>,
                response_metadata: Option<SlackResponseMetadata>,
            }

            let users_response: UsersListResponse = response.json().await
                .map_err(|e| format!("Erro ao processar resposta do Slack: {}", e))?;

            if !users_response.ok {
                let error_msg = users_response.error.unwrap_or_else(|| "Erro desconhecido".to_string());
                return Err(match error_msg.as_str() {
                    "invalid_auth" => "Token de acesso inválido. Execute a autenticação OAuth novamente".into(),
                    "missing_scope" => "Permissões insuficientes. A aplicação precisa do escopo 'users:read'".into(),
                    "rate_limited" => "Limite de requisições excedido. Tente novamente em alguns segundos".into(),
                    _ => format!("Erro do Slack: {}", error_msg).into()
                });
            }

            if let Some(users) = users_response.members {
                // Filter out deleted users and extend the results
                let active_users: Vec<SlackUser> = users.into_iter()
                    .filter(|user| !user.deleted)
                    .collect();
                
                all_users.extend(active_users);
            }

            // Check for pagination
            if let Some(metadata) = users_response.response_metadata {
                if let Some(next_cursor) = metadata.next_cursor.as_ref()
                    .filter(|cursor| !cursor.is_empty()) {
                    cursor = Some(next_cursor.clone());
                    
                    // Rate limiting between requests
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        println!("✅ Fetched {} users from Slack workspace", all_users.len());
        Ok(all_users)
    }

    pub fn build_oauth_url(client_id: &str, redirect_uri: &str, scopes: &[&str], state: Option<&str>) -> Result<String, Box<dyn Error + Send + Sync>> {
        println!("🔗 Building OAuth URL with redirect_uri: '{}'", redirect_uri);
        
        let mut url = Url::parse("https://slack.com/oauth/v2/authorize")?;
        
        let mut query_pairs = url.query_pairs_mut();
        query_pairs
            .append_pair("client_id", client_id)
            .append_pair("redirect_uri", redirect_uri)
            .append_pair("scope", &scopes.join(","))  // Bot scopes use comma separation
            .append_pair("response_type", "code");

        // Add state parameter for CSRF protection
        if let Some(state_param) = state {
            query_pairs.append_pair("state", state_param);
        }

        drop(query_pairs);
        let final_url = url.to_string();
        println!("🔗 Final OAuth URL: {}", final_url);
        Ok(final_url)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackSyncState {
    pub project_id: String,
    pub channel_id: String,
    pub last_sync: DateTime<Utc>,
    pub is_active: bool,
}

pub async fn process_messages_for_tasks(messages: Vec<SlackMessage>) -> Vec<PotentialTask> {
    let mut potential_tasks = Vec::new();

    for message in messages {
        if let Some(tasks) = extract_action_items(&message.text) {
            for task_text in tasks {
                potential_tasks.push(PotentialTask {
                    name: task_text.clone(),
                    description: format!("From Slack message: {}", message.text),
                    source_message_ts: message.ts.clone(),
                    source_channel: message.channel.clone().unwrap_or_default(),
                    suggested_assignee: extract_assignee(&task_text),
                    confidence_score: calculate_task_confidence(&task_text, &message),
                });
            }
        }
    }

    potential_tasks
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PotentialTask {
    pub name: String,
    pub description: String,
    pub source_message_ts: String,
    pub source_channel: String,
    pub suggested_assignee: Option<String>,
    pub confidence_score: f32,
}

fn extract_action_items(text: &str) -> Option<Vec<String>> {
    let mut tasks = Vec::new();
    
    let action_patterns = [
        "TODO:",
        "Action item:",
        "Task:",
        "Please",
        "Can you",
        "Could you",
        "Will you",
        "Need to",
        "Should",
        "Must",
    ];

    for line in text.lines() {
        let line_lower = line.to_lowercase();
        for pattern in &action_patterns {
            if line_lower.contains(&pattern.to_lowercase()) {
                let task_text = line.trim_start_matches(pattern).trim();
                if !task_text.is_empty() && task_text.len() > 10 {
                    tasks.push(task_text.to_string());
                }
            }
        }

        if line.starts_with("- [ ]") || line.starts_with("* [ ]") {
            let task_text = line.trim_start_matches("- [ ]").trim_start_matches("* [ ]").trim();
            if !task_text.is_empty() {
                tasks.push(task_text.to_string());
            }
        }
    }

    if tasks.is_empty() {
        None
    } else {
        Some(tasks)
    }
}

fn extract_assignee(text: &str) -> Option<String> {
    if text.contains("@") {
        let parts: Vec<&str> = text.split_whitespace().collect();
        for part in parts {
            if part.starts_with("@") {
                return Some(part.trim_start_matches("@").to_string());
            }
        }
    }
    None
}

fn calculate_task_confidence(task_text: &str, message: &SlackMessage) -> f32 {
    let mut score: f32 = 0.5;

    let high_confidence_indicators = ["TODO", "Action item", "Task", "ASAP", "deadline", "due"];
    for indicator in &high_confidence_indicators {
        if task_text.to_lowercase().contains(&indicator.to_lowercase()) {
            score += 0.1;
        }
    }

    if task_text.contains("@") {
        score += 0.1;
    }

    if message.thread_ts.is_some() {
        score += 0.05;
    }

    score.min(1.0_f32)
}



#[derive(Clone)]
pub struct SlackSyncScheduler {
    client: SlackClient,
    interval_minutes: u64,
    is_running: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl SlackSyncScheduler {
    pub fn new(client: SlackClient, interval_minutes: u64) -> Self {
        Self {
            client,
            interval_minutes,
            is_running: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    pub async fn start(&self, sync_configs: Vec<SlackSyncState>) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.is_running.store(true, std::sync::atomic::Ordering::SeqCst);
        
        println!("🔄 [SLACK_SYNC] Starting background sync for {} channels", sync_configs.len());
        
        let client = self.client.clone();
        let interval_minutes = self.interval_minutes;
        let is_running = Arc::clone(&self.is_running);
        
        // Spawn background task for periodic sync
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_minutes * 60));
            
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                interval.tick().await;
                
                if !is_running.load(std::sync::atomic::Ordering::SeqCst) {
                    break;
                }
                
                println!("🔄 [SLACK_SYNC] Running periodic sync...");
                
                for sync_config in &sync_configs {
                    if !sync_config.is_active {
                        continue;
                    }
                    
                    match Self::sync_channel_messages(&client, sync_config).await {
                        Ok(message_count) => {
                            println!("✅ [SLACK_SYNC] Synced {} messages from channel {}", 
                                message_count, sync_config.channel_id);
                        }
                        Err(e) => {
                            eprintln!("❌ [SLACK_SYNC] Failed to sync channel {}: {}", 
                                sync_config.channel_id, e);
                        }
                    }
                }
                
                println!("🔄 [SLACK_SYNC] Periodic sync completed");
            }
            
            println!("🛑 [SLACK_SYNC] Background sync stopped");
        });
        
        Ok(())
    }

    pub async fn stop(&self) {
        println!("🛑 [SLACK_SYNC] Stopping background sync...");
        self.is_running.store(false, std::sync::atomic::Ordering::SeqCst);
    }
    
    /// Sync messages from a specific channel
    async fn sync_channel_messages(
        client: &SlackClient,
        sync_config: &SlackSyncState,
    ) -> Result<usize, Box<dyn Error + Send + Sync>> {
        // Calculate timestamp to fetch messages from (since last sync)
        let oldest_timestamp = sync_config.last_sync.timestamp() as f64;
        
        // Fetch recent messages from the channel
        let messages = client.fetch_channel_messages(
            &sync_config.channel_id,
            Some(oldest_timestamp),
            Some(1000), // Increased limit for better context
        ).await?;
        
        println!("📥 [SLACK_SYNC] Fetched {} messages from channel {}", 
            messages.len(), sync_config.channel_id);
        
        // Process messages for potential tasks
        let potential_tasks = process_messages_for_tasks(messages.clone()).await;
        
        if !potential_tasks.is_empty() {
            println!("🔍 [SLACK_SYNC] Found {} potential tasks in channel {}", 
                potential_tasks.len(), sync_config.channel_id);
            
            // Here you could emit events to the frontend to handle these tasks
            // For now, we'll just log them
            for task in &potential_tasks {
                println!("📋 [TASK_DETECTED] {} (confidence: {:.2})", 
                    task.name, task.confidence_score);
            }
        }
        
        Ok(messages.len())
    }

    pub async fn is_running(&self) -> bool {
        self.is_running.load(std::sync::atomic::Ordering::SeqCst)
    }
}

// OAuth flow implementation
