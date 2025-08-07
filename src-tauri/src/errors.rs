use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize)]
pub enum SlackError {
    // Authentication errors
    InvalidCredentials { message: String },
    TokenExpired { message: String },
    InvalidToken { message: String },
    OAuthFailed { message: String, error_code: Option<String> },
    
    // API errors
    ApiError { message: String, error_code: String },
    NetworkError { message: String },
    RateLimited { message: String, retry_after: Option<u64> },
    Forbidden { message: String },
    NotFound { message: String },
    
    // Validation errors
    ValidationError { field: String, message: String },
    InvalidInput { message: String },
    
    // Internal errors
    SerializationError { message: String },
    DatabaseError { message: String },
    ConfigurationError { message: String },
}

impl fmt::Display for SlackError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SlackError::InvalidCredentials { message } => write!(f, "Credenciais inválidas: {}", message),
            SlackError::TokenExpired { message } => write!(f, "Token expirado: {}", message),
            SlackError::InvalidToken { message } => write!(f, "Token inválido: {}", message),
            SlackError::OAuthFailed { message, error_code } => {
                if let Some(code) = error_code {
                    write!(f, "Falha no OAuth ({}): {}", code, message)
                } else {
                    write!(f, "Falha no OAuth: {}", message)
                }
            },
            SlackError::ApiError { message, error_code } => write!(f, "Erro da API Slack ({}): {}", error_code, message),
            SlackError::NetworkError { message } => write!(f, "Erro de rede: {}", message),
            SlackError::RateLimited { message, retry_after } => {
                if let Some(seconds) = retry_after {
                    write!(f, "Limite de requisições excedido: {}. Tente novamente em {} segundos", message, seconds)
                } else {
                    write!(f, "Limite de requisições excedido: {}", message)
                }
            },
            SlackError::Forbidden { message } => write!(f, "Acesso negado: {}", message),
            SlackError::NotFound { message } => write!(f, "Não encontrado: {}", message),
            SlackError::ValidationError { field, message } => write!(f, "Erro de validação em '{}': {}", field, message),
            SlackError::InvalidInput { message } => write!(f, "Entrada inválida: {}", message),
            SlackError::SerializationError { message } => write!(f, "Erro de serialização: {}", message),
            SlackError::DatabaseError { message } => write!(f, "Erro de banco de dados: {}", message),
            SlackError::ConfigurationError { message } => write!(f, "Erro de configuração: {}", message),
        }
    }
}

impl std::error::Error for SlackError {}

impl From<serde_json::Error> for SlackError {
    fn from(err: serde_json::Error) -> Self {
        SlackError::SerializationError {
            message: format!("Erro ao processar JSON: {}", err),
        }
    }
}

impl From<reqwest::Error> for SlackError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            SlackError::NetworkError {
                message: "Timeout na requisição. Verifique sua conexão com a internet.".to_string(),
            }
        } else if err.is_connect() {
            SlackError::NetworkError {
                message: "Erro de conexão. Verifique sua conexão com a internet.".to_string(),
            }
        } else if err.is_status() {
            let status = err.status().unwrap_or_else(|| reqwest::StatusCode::INTERNAL_SERVER_ERROR);
            match status.as_u16() {
                401 => SlackError::InvalidCredentials {
                    message: "Token de acesso inválido ou expirado".to_string(),
                },
                403 => SlackError::Forbidden {
                    message: "Permissões insuficientes para acessar este recurso".to_string(),
                },
                404 => SlackError::NotFound {
                    message: "Recurso não encontrado".to_string(),
                },
                429 => SlackError::RateLimited {
                    message: "Muitas requisições. Aguarde alguns segundos".to_string(),
                    retry_after: None,
                },
                _ => SlackError::ApiError {
                    message: format!("Erro HTTP {}", status.as_u16()),
                    error_code: status.to_string(),
                },
            }
        } else {
            SlackError::NetworkError {
                message: format!("Erro na requisição: {}", err),
            }
        }
    }
}

// Result type alias for convenience
pub type SlackResult<T> = Result<T, SlackError>;

// Helper functions for creating specific errors
impl SlackError {
    pub fn validation(field: &str, message: &str) -> Self {
        SlackError::ValidationError {
            field: field.to_string(),
            message: message.to_string(),
        }
    }
    
    pub fn invalid_input(message: &str) -> Self {
        SlackError::InvalidInput {
            message: message.to_string(),
        }
    }
    
    pub fn oauth_failed(message: &str, error_code: Option<&str>) -> Self {
        SlackError::OAuthFailed {
            message: message.to_string(),
            error_code: error_code.map(|s| s.to_string()),
        }
    }
    
    pub fn api_error(message: &str, error_code: &str) -> Self {
        SlackError::ApiError {
            message: message.to_string(),
            error_code: error_code.to_string(),
        }
    }
    
    pub fn configuration(message: &str) -> Self {
        SlackError::ConfigurationError {
            message: message.to_string(),
        }
    }
}

// Convert SlackError to String for Tauri commands
impl From<SlackError> for String {
    fn from(err: SlackError) -> Self {
        err.to_string()
    }
}