use tauri::AppHandle;
use tauri_plugin_keyring::KeyringExt;
use serde::{Deserialize, Serialize};

// Slack credentials structure
#[derive(Debug, Serialize, Deserialize)]
pub struct SlackCredentials {
    pub client_id: String,
    pub client_secret: String,
    pub access_token: Option<String>,
    pub team_id: Option<String>,
    pub team_name: Option<String>,
}

// Input validation helper functions
pub fn validate_client_id(client_id: &str) -> Result<(), String> {
    if client_id.trim().is_empty() {
        return Err("Client ID não pode estar vazio".to_string());
    }
    if client_id.len() > 255 {
        return Err("Client ID muito longo (máximo 255 caracteres)".to_string());
    }
    // Slack client IDs typically follow a pattern like "1234567890.1234567890"
    if !client_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-') {
        return Err("Client ID contém caracteres inválidos".to_string());
    }
    Ok(())
}

pub fn validate_client_secret(client_secret: &str) -> Result<(), String> {
    if client_secret.trim().is_empty() {
        return Err("Client Secret não pode estar vazio".to_string());
    }
    if client_secret.len() < 8 {
        return Err("Client Secret muito curto (mínimo 8 caracteres)".to_string());
    }
    if client_secret.len() > 255 {
        return Err("Client Secret muito longo (máximo 255 caracteres)".to_string());
    }
    // Basic validation for printable ASCII characters
    if !client_secret.chars().all(|c| c.is_ascii() && !c.is_control()) {
        return Err("Client Secret contém caracteres inválidos".to_string());
    }
    Ok(())
}

pub fn validate_access_token(token: &str) -> Result<(), String> {
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
    if !token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("Token contém caracteres inválidos".to_string());
    }
    Ok(())
}

pub fn validate_team_id(team_id: &str) -> Result<(), String> {
    if team_id.trim().is_empty() {
        return Err("Team ID não pode estar vazio".to_string());
    }
    if team_id.len() > 50 {
        return Err("Team ID muito longo".to_string());
    }
    // Slack team IDs typically start with 'T'
    if !team_id.starts_with('T') || !team_id.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("Formato de Team ID inválido".to_string());
    }
    Ok(())
}

pub fn validate_team_name(team_name: &str) -> Result<(), String> {
    if team_name.trim().is_empty() {
        return Err("Nome da equipe não pode estar vazio".to_string());
    }
    if team_name.len() > 100 {
        return Err("Nome da equipe muito longo (máximo 100 caracteres)".to_string());
    }
    // Allow most characters but prevent control characters
    if team_name.chars().any(|c| c.is_control()) {
        return Err("Nome da equipe contém caracteres inválidos".to_string());
    }
    Ok(())
}

// Store Slack credentials securely
pub async fn store_slack_credentials(
    app: AppHandle,
    client_id: String,
    client_secret: String,
) -> Result<String, String> {
    println!("🔐 [STORE] Starting credential storage...");
    println!("🔐 [STORE] Client ID: {}...", &client_id[..std::cmp::min(client_id.len(), 10)]);
    
    // Validate inputs
    validate_client_id(&client_id).map_err(|e| {
        println!("❌ [STORE] Client ID validation failed: {}", e);
        e
    })?;
    validate_client_secret(&client_secret).map_err(|e| {
        println!("❌ [STORE] Client Secret validation failed: {}", e);
        e
    })?;
    
    println!("✅ [STORE] Input validation passed");
    
    let keyring = app.keyring();
    
    let credentials = SlackCredentials {
        client_id: client_id.clone(),
        client_secret: client_secret.clone(),
        access_token: None,
        team_id: None,
        team_name: None,
    };
    
    let credentials_json = serde_json::to_string(&credentials)
        .map_err(|e| {
            let error = format!("Erro ao serializar credenciais: {}", e);
            println!("❌ [STORE] Serialization failed: {}", error);
            error
        })?;
    
    println!("✅ [STORE] Credentials serialized, storing in keychain...");
    
    keyring.set_password("project_boxes", "slack_credentials", &credentials_json)
        .map_err(|e| {
            let error = format!("Erro ao armazenar credenciais no keychain: {}. Isso pode indicar um problema de assinatura do app ou permissões do keychain.", e);
            println!("❌ [STORE] Keychain storage failed: {}", error);
            error
        })?;
    
    println!("✅ [STORE] Credentials stored successfully in keychain");
    
    
    Ok("Credenciais armazenadas com sucesso".to_string())
}

// Retrieve Slack credentials
pub async fn get_slack_credentials(app: AppHandle) -> Result<Option<SlackCredentials>, String> {
    // Credential retrieval (debug logging can be enabled via RUST_LOG=debug)
    
    let keyring = app.keyring();
    
    match keyring.get_password("project_boxes", "slack_credentials") {
        Ok(Some(credentials_json)) => {
            match serde_json::from_str::<SlackCredentials>(&credentials_json) {
                Ok(credentials) => {
                    Ok(Some(credentials))
                }
                Err(e) => {
                    let error = format!("Erro ao deserializar credenciais: {}", e);
                    println!("❌ [GET] Deserialization failed: {}", error);
                    Err(error)
                }
            }
        }
        Ok(None) => {
            println!("ℹ️ [GET] No credentials found in keychain");
            Ok(None)
        }
        Err(e) => {
            println!("❌ [GET] Keychain access error: {}", e);
            // Return None instead of error to handle keychain access gracefully
            Ok(None)
        }
    }
}

// Update Slack access token after OAuth
pub async fn update_slack_access_token(
    app: AppHandle,
    access_token: String,
    team_id: String,
    team_name: String,
) -> Result<String, String> {
    println!("🔄 [UPDATE] Starting access token update...");
    println!("🔄 [UPDATE] Team: {} ({})", team_name, team_id);
    println!("🔄 [UPDATE] Token: {}...", &access_token[..std::cmp::min(access_token.len(), 20)]);
    
    // Validate inputs
    validate_access_token(&access_token).map_err(|e| {
        println!("❌ [UPDATE] Access token validation failed: {}", e);
        e
    })?;
    validate_team_id(&team_id).map_err(|e| {
        println!("❌ [UPDATE] Team ID validation failed: {}", e);
        e
    })?;
    validate_team_name(&team_name).map_err(|e| {
        println!("❌ [UPDATE] Team name validation failed: {}", e);
        e
    })?;
    
    println!("✅ [UPDATE] Input validation passed");
    
    let keyring = app.keyring();
    
    // Get existing credentials
    let mut credentials = match keyring.get_password("project_boxes", "slack_credentials") {
        Ok(Some(credentials_json)) => {
            println!("✅ [UPDATE] Found existing credentials");
            serde_json::from_str::<SlackCredentials>(&credentials_json)
                .map_err(|e| {
                    let error = format!("Erro ao deserializar credenciais existentes: {}", e);
                    println!("❌ [UPDATE] Deserialization failed: {}", error);
                    error
                })?
        }
        Ok(None) => {
            let error = "Credenciais não encontradas. Configure primeiro o Client ID e Client Secret.".to_string();
            println!("❌ [UPDATE] {}", error);
            return Err(error);
        }
        Err(e) => {
            let error = format!("Erro ao acessar credenciais existentes: {}. Configure primeiro o Client ID e Client Secret.", e);
            println!("❌ [UPDATE] {}", error);
            return Err(error);
        }
    };
    
    println!("✅ [UPDATE] Existing credentials loaded, updating with OAuth data...");
    
    // Update with new access token
    credentials.access_token = Some(access_token.clone());
    credentials.team_id = Some(team_id.clone());
    credentials.team_name = Some(team_name.clone());
    
    let credentials_json = serde_json::to_string(&credentials)
        .map_err(|e| {
            let error = format!("Erro ao serializar credenciais atualizadas: {}", e);
            println!("❌ [UPDATE] Serialization failed: {}", error);
            error
        })?;
    
    println!("✅ [UPDATE] Credentials serialized, updating keychain...");
    
    keyring.set_password("project_boxes", "slack_credentials", &credentials_json)
        .map_err(|e| {
            let error = format!("Erro ao atualizar credenciais no keychain: {}", e);
            println!("❌ [UPDATE] Keychain update failed: {}", error);
            error
        })?;
    
    println!("✅ [UPDATE] Credentials updated successfully in keychain");
    
    
    Ok("Token de acesso atualizado com sucesso".to_string())
}

// Delete Slack credentials
pub async fn delete_slack_credentials(app: AppHandle) -> Result<String, String> {
    let keyring = app.keyring();
    
    keyring.delete_password("project_boxes", "slack_credentials")
        .map_err(|e| format!("Erro ao deletar credenciais: {}", e))?;
    
    Ok("Credenciais removidas com sucesso".to_string())
}

// Force Slack reconnection by clearing all credentials
pub async fn force_slack_reconnection(app: AppHandle) -> Result<String, String> {
    println!("🔄 [RECONNECT] Starting force reconnection...");
    let keyring = app.keyring();
    
    // Clear stored credentials completely
    match keyring.delete_password("project_boxes", "slack_credentials") {
        Ok(()) => {
            println!("✅ [RECONNECT] Credentials deleted successfully");
            
            // Verify deletion
            match keyring.get_password("project_boxes", "slack_credentials") {
                Ok(None) => {
                    println!("✅ [RECONNECT] Deletion verified - no credentials found");
                }
                Ok(Some(_)) => {
                    println!("⚠️ [RECONNECT] Warning: credentials still exist after deletion attempt");
                }
                Err(e) => {
                    println!("ℹ️ [RECONNECT] Keychain access error after deletion (expected): {}", e);
                }
            }
        }
        Err(e) => {
            println!("⚠️ [RECONNECT] Warning: deletion failed: {}", e);
        }
    }
    
    Ok("Credenciais do Slack limpas completamente. Execute a autenticação OAuth novamente para obter acesso com os scopes atualizados.".to_string())
}

// Debug command to check credential status
pub async fn debug_slack_credentials_status(app: AppHandle) -> Result<serde_json::Value, String> {
    println!("🔍 [DEBUG] Starting comprehensive credential status check...");
    
    let keyring = app.keyring();
    
    let mut status = serde_json::json!({
        "keychain_accessible": false,
        "credentials_exist": false,
        "credentials_valid": false,
        "has_client_id": false,
        "has_client_secret": false,
        "has_access_token": false,
        "team_info": null,
        "error": null,
        "raw_data_length": 0
    });
    
    // Test keychain access
    match keyring.get_password("project_boxes", "slack_credentials") {
        Ok(Some(credentials_json)) => {
            println!("✅ [DEBUG] Keychain accessible, credentials found");
            status["keychain_accessible"] = serde_json::Value::Bool(true);
            status["credentials_exist"] = serde_json::Value::Bool(true);
            status["raw_data_length"] = serde_json::Value::Number(credentials_json.len().into());
            
            // Try to parse credentials
            match serde_json::from_str::<SlackCredentials>(&credentials_json) {
                Ok(credentials) => {
                    println!("✅ [DEBUG] Credentials parsed successfully");
                    status["credentials_valid"] = serde_json::Value::Bool(true);
                    status["has_client_id"] = serde_json::Value::Bool(!credentials.client_id.is_empty());
                    status["has_client_secret"] = serde_json::Value::Bool(!credentials.client_secret.is_empty());
                    status["has_access_token"] = serde_json::Value::Bool(credentials.access_token.is_some());
                    
                    if let (Some(team_id), Some(team_name)) = (&credentials.team_id, &credentials.team_name) {
                        status["team_info"] = serde_json::json!({
                            "id": team_id,
                            "name": team_name
                        });
                    }
                    
                    println!("✅ [DEBUG] Client ID: {}...", &credentials.client_id[..std::cmp::min(credentials.client_id.len(), 10)]);
                    println!("✅ [DEBUG] Has Client Secret: {}", credentials.client_secret.is_empty());
                    println!("✅ [DEBUG] Has Access Token: {}", credentials.access_token.is_some());
                }
                Err(e) => {
                    let error = format!("Credentials exist but are corrupted: {}", e);
                    println!("❌ [DEBUG] {}", error);
                    status["error"] = serde_json::Value::String(error);
                }
            }
        }
        Ok(None) => {
            println!("ℹ️ [DEBUG] Keychain accessible, but no credentials found");
            status["keychain_accessible"] = serde_json::Value::Bool(true);
        }
        Err(e) => {
            let error = format!("Keychain access failed: {}", e);
            println!("❌ [DEBUG] {}", error);
            status["error"] = serde_json::Value::String(error);
        }
    }
    
    println!("📊 [DEBUG] Status check complete: {}", status);
    Ok(status)
}


// Status enum for Slack credentials
#[derive(Debug, Serialize, Deserialize)]
pub enum SlackCredentialsStatus {
    Configured,
    PartiallyConfigured,
    NotConfigured,
}

// Validate Slack credentials
pub async fn validate_slack_credentials(app: AppHandle) -> Result<SlackCredentialsStatus, String> {
    match get_slack_credentials(app).await {
        Ok(Some(credentials)) => {
            if credentials.access_token.is_some() && credentials.team_id.is_some() {
                Ok(SlackCredentialsStatus::Configured)
            } else {
                Ok(SlackCredentialsStatus::PartiallyConfigured)
            }
        }
        Ok(None) => Ok(SlackCredentialsStatus::NotConfigured),
        Err(e) => Err(e),
    }
}