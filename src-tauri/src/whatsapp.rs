use headless_chrome::{Browser, LaunchOptions, Tab};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::time::{Duration, interval, sleep, Instant};
use anyhow::{Result, Context};
use thiserror::Error;
use chrono::Utc;
use once_cell::sync::Lazy;
use log::{info, warn, error, debug};
use std::ffi::OsStr;

// WhatsApp database now handled by database service
// use crate::database::{WhatsAppDatabase, WhatsAppMessage};

// Placeholder types for legacy compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppMessage {
    pub id: String,
    pub text: String,
    pub sender: String,
    pub timestamp: String,
    pub chat_id: String,
    pub contact_name: Option<String>,
    pub message_type: Option<String>,
    pub processed_by_llm: bool,
    pub work_related: Option<bool>,
    pub task_priority: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone)]
pub struct WhatsAppDatabase {
    // Database operations now handled by database service
}

impl WhatsAppDatabase {
    pub fn new(_db_path: &str) -> Result<Self, WhatsAppError> {
        Ok(WhatsAppDatabase {})
    }
    
    pub fn initialize(&self) -> Result<(), WhatsAppError> {
        // Initialization now handled by database service
        Ok(())
    }
    
    pub async fn store_message(&self, _message: &WhatsAppMessage) -> Result<(), WhatsAppError> {
        // Messages now stored via database service
        Ok(())
    }
    
    pub async fn get_messages(&self, _chat_id: &str, _limit: Option<u32>) -> Result<Vec<WhatsAppMessage>, WhatsAppError> {
        // Messages now retrieved via database service
        Ok(vec![])
    }
    
    pub async fn get_unprocessed_messages(&self, _limit: Option<u32>) -> Result<Vec<WhatsAppMessage>, WhatsAppError> {
        // Unprocessed messages now retrieved via database service
        Ok(vec![])
    }
    
    pub async fn mark_as_processed(&self, _message_id: &str, _work_related: Option<bool>, _task_priority: Option<String>) -> Result<(), WhatsAppError> {
        // Processing status now updated via database service
        Ok(())
    }

    pub fn get_unrecovered_gaps(&self) -> Result<Vec<MessageGap>, WhatsAppError> {
        // Placeholder implementation
        Ok(vec![])
    }

    pub fn mark_gap_recovery_attempted(&self, _gap_id: &str) -> Result<(), WhatsAppError> {
        // Placeholder implementation
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MessageGap {
    pub id: String,
    pub gap_start: String,
    pub gap_end: String,
}

#[derive(Error, Debug)]
pub enum WhatsAppError {
    #[error("Browser initialization failed: {0}")]
    BrowserInit(String),
    #[error("Navigation failed: {0}")]
    Navigation(String),
    #[error("Element not found: {0}")]
    ElementNotFound(String),
    #[error("Connection timeout")]
    Timeout,
    #[error("QR code generation failed: {0}")]
    QrCodeGeneration(String),
    #[error("Database error: {0}")]
    Database(String),
    #[error("Already connected")]
    AlreadyConnected,
    #[error("Not connected")]
    NotConnected,
    #[error("Anyhow error: {0}")]
    Anyhow(#[from] anyhow::Error),
}

// Remove this implementation as the type is private

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    QrCodeReady,
    Connected,
    Monitoring,
    Reconnecting,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppConnectionState {
    pub status: ConnectionStatus,
    pub qr_code: Option<String>,
    pub connected_since: Option<i64>,
    pub last_message_timestamp: Option<i64>,
    pub message_count: i32,
    pub active_chats: Vec<String>,
    pub health_status: HealthStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub last_heartbeat: i64,
    pub consecutive_failures: i32,
    pub last_recovery_attempt: Option<i64>,
    pub gap_count: i32,
    pub monitoring_active: bool,
}

pub struct WhatsAppMonitor {
    browser: Option<Browser>,
    tab: Option<Arc<Tab>>,
    database: WhatsAppDatabase,
    state: Arc<Mutex<WhatsAppConnectionState>>,
    message_sender: Option<mpsc::UnboundedSender<WhatsAppMessage>>,
    monitoring_active: Arc<Mutex<bool>>,
}

static WHATSAPP_MONITOR: Lazy<Arc<Mutex<WhatsAppMonitor>>> = Lazy::new(|| {
    Arc::new(Mutex::new(WhatsAppMonitor::new().unwrap_or_else(|e| {
        error!("Failed to initialize WhatsApp monitor: {}", e);
        // Return a default instance
        WhatsAppMonitor {
            browser: None,
            tab: None,
            database: WhatsAppDatabase { },
            state: Arc::new(Mutex::new(WhatsAppConnectionState {
                status: ConnectionStatus::Disconnected,
                qr_code: None,
                connected_since: None,
                last_message_timestamp: None,
                message_count: 0,
                active_chats: Vec::new(),
                health_status: HealthStatus {
                    last_heartbeat: chrono::Utc::now().timestamp(),
                    consecutive_failures: 0,
                    last_recovery_attempt: None,
                    gap_count: 0,
                    monitoring_active: false,
                },
            })),
            message_sender: None,
            monitoring_active: Arc::new(Mutex::new(false)),
        }
    })))
});

impl WhatsAppMonitor {
    pub fn new() -> Result<Self, WhatsAppError> {
        let db_path = "whatsapp_messages.db"; // TODO: Make configurable
        let database = WhatsAppDatabase::new(db_path)?;
        
        // Initialize database schema
        if let Err(e) = database.initialize() {
            error!("Failed to initialize WhatsApp database: {}", e);
        }

        Ok(Self {
            browser: None,
            tab: None,
            database,
            state: Arc::new(Mutex::new(WhatsAppConnectionState {
                status: ConnectionStatus::Disconnected,
                qr_code: None,
                connected_since: None,
                last_message_timestamp: None,
                message_count: 0,
                active_chats: Vec::new(),
                health_status: HealthStatus {
                    last_heartbeat: Utc::now().timestamp(),
                    consecutive_failures: 0,
                    last_recovery_attempt: None,
                    gap_count: 0,
                    monitoring_active: false,
                },
            })),
            message_sender: None,
            monitoring_active: Arc::new(Mutex::new(false)),
        })
    }

    pub fn get_instance() -> Arc<Mutex<WhatsAppMonitor>> {
        WHATSAPP_MONITOR.clone()
    }

    pub async fn connect(&mut self) -> Result<(), WhatsAppError> {
        // Logging disabled
        info!("[WhatsApp] Starting WhatsApp Web connection...");
        
        // Check if already connected
        {
            let state = self.state.lock().await;
            if matches!(state.status, ConnectionStatus::Connected | ConnectionStatus::Monitoring) {
                warn!("[WhatsApp] Connection attempt while already connected/monitoring");
                return Err(WhatsAppError::AlreadyConnected);
            }
            info!("[WhatsApp] Current status: {:?}", state.status);
        }

        // Update status to connecting
        info!("[WhatsApp] Setting status to Connecting...");
        self.update_status(ConnectionStatus::Connecting).await;

        // Initialize browser
        info!("[WhatsApp] Initializing headless browser...");
        let browser = self.init_browser().await?;
        info!("[WhatsApp] Browser initialized successfully");
        
        info!("[WhatsApp] Creating new browser tab...");
        let tab = browser.new_tab().context("Failed to create new tab")?;
        info!("[WhatsApp] Tab created successfully");
        
        self.browser = Some(browser);
        self.tab = Some(tab);

        // Navigate to WhatsApp Web and handle initial connection
        {
            let tab = self.tab.as_ref()
                .ok_or(WhatsAppError::NotConnected)?;
            
            // Logging disabled
            info!("[WhatsApp] Navigating to WhatsApp Web...");
            
            match tab.navigate_to("https://web.whatsapp.com/") {
                Ok(_) => {
                    // Logging disabled
                }
                Err(e) => {
                    // Logging disabled
                    return Err(WhatsAppError::BrowserInit(format!("Navigation failed: {}", e)));
                }
            }

            // Wait for page to load with timeout
            // Logging disabled
            info!("[WhatsApp] Waiting for page body to load...");
            
            match tab.wait_for_element("body") {
                Ok(_) => {
                    // Logging disabled
                }
                Err(e) => {
                    // Logging disabled
                    return Err(WhatsAppError::BrowserInit(format!("Page load timeout: {}", e)));
                }
            }

            // Logging disabled
            info!("[WhatsApp] WhatsApp Web page loaded successfully, checking for QR code or existing session...");
        }
        
        // Check if already logged in or need QR code
        let tab = self.tab.as_ref()
            .ok_or(WhatsAppError::NotConnected)?
            .clone();
        self.handle_initial_connection(&tab).await?;

        info!("[WhatsApp] Connection process completed");
        Ok(())
    }

    async fn init_browser(&self) -> Result<Browser, WhatsAppError> {
        // Logging disabled
        let launch_options = LaunchOptions::default_builder()
            .headless(true)
            .window_size(Some((1280, 720)))
            .args(vec![
                OsStr::new("--no-sandbox"),
                OsStr::new("--disable-setuid-sandbox"),
                OsStr::new("--disable-dev-shm-usage"),
                OsStr::new("--disable-gpu"),
                OsStr::new("--no-first-run"),
                OsStr::new("--disable-default-apps"),
                OsStr::new("--disable-popup-blocking"),
                OsStr::new("--disable-translate"),
                OsStr::new("--disable-background-timer-throttling"),
                OsStr::new("--disable-renderer-backgrounding"),
                OsStr::new("--disable-backgrounding-occluded-windows"),
                OsStr::new("--disable-client-side-phishing-detection"),
                OsStr::new("--disable-ipc-flooding-protection"),
                OsStr::new("--disable-web-security"),
                OsStr::new("--disable-features=TranslateUI"),
                OsStr::new("--disable-extensions"),
                OsStr::new("--disable-component-extensions-with-background-pages"),
                OsStr::new("--no-default-browser-check"),
                OsStr::new("--no-first-run"),
                OsStr::new("--disable-default-apps"),
                OsStr::new("--remote-debugging-port=0"),
            ])
            .user_data_dir(Some(std::path::PathBuf::from("./whatsapp_profile")))
            .build()
            .map_err(|e| {
                // Logging disabled
                WhatsAppError::BrowserInit(e.to_string())
            })?;

        // Logging disabled
        
        // Use tokio timeout to prevent hanging
        let browser_future = tokio::task::spawn_blocking(move || {
            Browser::new(launch_options)
        });
        
        match tokio::time::timeout(Duration::from_secs(30), browser_future).await {
            Ok(Ok(browser_result)) => {
                match browser_result {
                    Ok(browser) => {
                        // Logging disabled
                        Ok(browser)
                    }
                    Err(e) => {
                        // Logging disabled
                        Err(WhatsAppError::BrowserInit(e.to_string()))
                    }
                }
            }
            Ok(Err(e)) => {
                // Logging disabled
                Err(WhatsAppError::BrowserInit(format!("Task failed: {}", e)))
            }
            Err(_) => {
                // Logging disabled
                Err(WhatsAppError::BrowserInit("Browser launch timeout".to_string()))
            }
        }
    }

    async fn handle_initial_connection(&mut self, tab: &Arc<Tab>) -> Result<(), WhatsAppError> {
        info!("[WhatsApp] Starting initial connection handling");
        
        // Wait a bit for the page to settle
        info!("[WhatsApp] Waiting for page to settle...");
        sleep(Duration::from_secs(3)).await;

        // Check if we're already logged in
        // Logging disabled
        info!("[WhatsApp] Checking if already logged in...");
        if self.is_already_logged_in(tab)? {
            // Logging disabled
            info!("[WhatsApp] DOM elements suggest logged in state, validating session...");
            
            // Wait longer to ensure the page is fully loaded and validate the session
            // Logging disabled
            sleep(Duration::from_secs(5)).await;
            
            // Logging disabled
            if self.validate_active_session(tab)? {
                // Logging disabled
                info!("[WhatsApp] Session validated successfully - already logged in");
                self.update_status(ConnectionStatus::Connected).await;
                self.start_monitoring().await?;
                return Ok(());
            } else {
                // Logging disabled
                warn!("[WhatsApp] Session validation failed - session appears to be invalid");
                // Continue to QR code check - do NOT set connected status
            }
        } else {
            // Logging disabled
            info!("[WhatsApp] Not logged in, checking for QR code...");
        }

        // Look for QR code
        // Logging disabled
        if let Some(qr_code) = self.extract_qr_code(tab)? {
            // Logging disabled
            info!("QR code found, setting status to QrCodeReady");
            self.update_status_with_qr(ConnectionStatus::QrCodeReady, Some(qr_code)).await;
            
            // QR code is ready - user can scan it and the frontend will check status
            // Logging disabled
        } else {
            // Logging disabled
            return Err(WhatsAppError::ElementNotFound("QR code not found".to_string()));
        }

        Ok(())
    }

    fn is_already_logged_in(&self, tab: &Arc<Tab>) -> Result<bool, WhatsAppError> {
        // Logging disabled
        info!("[WhatsApp] Checking for logged-in DOM elements...");
        
        // Check for main chat interface elements
        let selectors = vec![
            "[data-testid='chat-list']",
            ".app-wrapper-web",
            "#main",
            "[data-testid='side']",
            "[data-testid='conversation-panel-wrapper']"
        ];

        for selector in &selectors {
            // Logging disabled
            info!("[WhatsApp] Checking selector: {}", selector);
            if tab.find_element(selector).is_ok() {
                // Logging disabled
                info!("[WhatsApp] Found element with selector: {}", selector);
                return Ok(true);
            } else {
                // Logging disabled
            }
        }

        // Also check if QR code is gone (which would indicate login)
        // Logging disabled
        let qr_selectors = vec![
            "[data-testid='qr-code']",
            "[data-ref] canvas",
            "canvas"
        ];
        
        let mut qr_found = false;
        for selector in &qr_selectors {
            if tab.find_element(selector).is_ok() {
                // Logging disabled
                qr_found = true;
                break;
            }
        }
        
        if !qr_found {
            // Logging disabled
            return Ok(true);
        }

        // Logging disabled
        info!("[WhatsApp] No logged-in elements found");
        Ok(false)
    }

    fn validate_active_session(&self, tab: &Arc<Tab>) -> Result<bool, WhatsAppError> {
        // Logging disabled
        info!("[WhatsApp] Validating active session...");
        
        // First, check for elements that indicate session issues (QR code, landing page, etc.)
        let error_selectors = vec![
            "[data-testid='qr-code']",
            "[data-testid='intro-qr-code']", 
            ".landing-wrapper",
            "._1hI5g", // QR code container class
            "[data-ref='qr-canvas']",
            "[data-testid='qr-canvas']",
            ".qr-code",
            "[alt='Scan me!']",
            "canvas[aria-label='Scan me!']"
        ];
        
        // If we find ANY error indicators, session is definitely invalid
        // Logging disabled
        for selector in &error_selectors {
            if tab.find_element(selector).is_ok() {
                // Logging disabled
                warn!("[WhatsApp] Found session error indicator: {} - session is invalid", selector);
                return Ok(false);
            } else {
                // Logging disabled
            }
        }
        
        // Check for very specific elements that indicate an ACTIVE session
        let critical_selectors = vec![
            "[data-testid='chat-list']", // Must have chat list
            "[data-testid='search']",    // Must have search functionality
            "[data-testid='side']",      // Side panel
            "#main",                     // Main content area
        ];
        
        // Logging disabled
        let mut found_count = 0;
        for selector in &critical_selectors {
            if tab.find_element(selector).is_ok() {
                // Logging disabled
                info!("[WhatsApp] Found critical element: {}", selector);
                found_count += 1;
            } else {
                // Logging disabled
                warn!("[WhatsApp] Missing critical element: {} - session not fully active", selector);
            }
        }
        
        // We need at least 2 critical elements to consider it a valid session
        if found_count < 2 {
            // Logging disabled
            return Ok(false);
        }
        
        // Additional check: try to execute JavaScript to verify WhatsApp Web is loaded
        // Logging disabled
        let js_check = r#"
            try {
                // Check if WhatsApp Web's main application object exists
                const hasStore = window.Store !== undefined;
                const hasRequire = window.require !== undefined;
                const chatList = document.querySelector('[data-testid="chat-list"]');
                const hasChats = chatList && chatList.children.length > 0;
                const hasMain = document.querySelector('#main') !== null;
                
                console.log('[Session Check] Store:', hasStore, 'Require:', hasRequire, 'Chats:', hasChats, 'Main:', hasMain);
                
                return hasStore || hasRequire || hasChats || hasMain;
            } catch(e) {
                console.error('[Session Check] Error:', e);
                return false;
            }
        "#;
        
        match tab.evaluate(js_check, false) {
            Ok(result) => {
                if let Some(value) = result.value {
                    let js_result = value.as_bool().unwrap_or(false);
                    // Logging disabled
                    if !js_result {
                        // Logging disabled
                        warn!("[WhatsApp] JavaScript validation failed - WhatsApp Web not properly loaded");
                        return Ok(false);
                    }
                    // Logging disabled
                    info!("[WhatsApp] JavaScript validation passed");
                } else {
                    // Logging disabled
                    warn!("[WhatsApp] JavaScript evaluation returned no value");
                    return Ok(false);
                }
            }
            Err(e) => {
                // Logging disabled
                warn!("[WhatsApp] JavaScript execution failed: {}", e);
                return Ok(false);
            }
        }
        
        // Logging disabled
        info!("[WhatsApp] Session validation PASSED - all checks successful");
        Ok(true)
    }

    fn extract_qr_code(&self, tab: &Arc<Tab>) -> Result<Option<String>, WhatsAppError> {
        // Logging disabled
        
        // Try multiple QR code selectors (most specific first)
        let selectors = vec![
            "[data-testid='qr-code'] canvas",
            "[data-testid='intro-qr-code'] canvas", 
            "[data-ref='qr-canvas']",
            "[data-testid='qr-canvas']",
            ".qr-code canvas",
            "[alt='Scan me!']",
            "canvas[aria-label='Scan me!']",
            ".landing-window canvas",
            "[data-ref] canvas",
            "canvas"
        ];

        for (_i, selector) in selectors.iter().enumerate() {
            // Logging disabled
            
            if let Ok(element) = tab.find_element(selector) {
                // Logging disabled
                
                // Try to get canvas data
                let canvas_js = r#"
                    function() {
                        try {
                            console.log('[QR Extraction] Canvas element found:', this.tagName);
                            console.log('[QR Extraction] Canvas dimensions:', this.width, 'x', this.height);
                            
                            // Check if canvas has content
                            if (this.width === 0 || this.height === 0) {
                                console.log('[QR Extraction] Canvas has zero dimensions');
                                return null;
                            }
                            
                            const dataUrl = this.toDataURL('image/png');
                            console.log('[QR Extraction] DataURL length:', dataUrl.length);
                            console.log('[QR Extraction] DataURL prefix:', dataUrl.substring(0, 50));
                            
                            return dataUrl;
                        } catch (e) {
                            console.error('[QR Extraction] Error extracting canvas data:', e);
                            return null;
                        }
                    }
                "#;
                
                match element.call_js_fn(canvas_js, vec![], false) {
                    Ok(canvas_data) => {
                        if let Some(value) = canvas_data.value {
                            if let Some(data_url) = value.as_str() {
                                if data_url.len() > 100 && data_url.starts_with("data:image/") {
                                    // Logging disabled
                                    return Ok(Some(data_url.to_string()));
                                } else if data_url.len() <= 100 {
                                    // Logging disabled
                                } else {
                                    // Logging disabled
                                }
                            } else {
                                // Logging disabled
                            }
                        } else {
                            // Logging disabled
                        }
                    }
                    Err(_e) => {
                        // Logging disabled
                    }
                }
            } else {
                // Logging disabled
            }
        }

        // Also try a more comprehensive JavaScript approach
        // Logging disabled
        let comprehensive_js = r#"
            (function() {
                try {
                    // Find all canvas elements
                    const canvases = document.querySelectorAll('canvas');
                    console.log('[QR Detection] Found', canvases.length, 'canvas elements');
                    
                    for (let i = 0; i < canvases.length; i++) {
                        const canvas = canvases[i];
                        console.log('[QR Detection] Canvas', i, ':', {
                            width: canvas.width,
                            height: canvas.height,
                            className: canvas.className,
                            id: canvas.id,
                            dataset: Object.keys(canvas.dataset),
                            parentClass: canvas.parentElement?.className
                        });
                        
                        // Skip empty canvases
                        if (canvas.width === 0 || canvas.height === 0) continue;
                        
                        try {
                            const dataUrl = canvas.toDataURL('image/png');
                            if (dataUrl.length > 1000) { // QR codes should be substantial
                                console.log('[QR Detection] Found substantial canvas data (length:', dataUrl.length, ')');
                                return dataUrl;
                            }
                        } catch (e) {
                            console.log('[QR Detection] Canvas', i, 'extraction failed:', e.message);
                        }
                    }
                    
                    return null;
                } catch (e) {
                    console.error('[QR Detection] Comprehensive detection failed:', e);
                    return null;
                }
            })()
        "#;
        
        match tab.evaluate(comprehensive_js, false) {
            Ok(result) => {
                if let Some(value) = result.value {
                    if let Some(data_url) = value.as_str() {
                        if data_url.len() > 100 && data_url.starts_with("data:image/") {
                            // Logging disabled
                            return Ok(Some(data_url.to_string()));
                        }
                    }
                }
            }
            Err(_e) => {
                // Logging disabled
            }
        }

        // Logging disabled
        Ok(None)
    }

    async fn poll_for_connection(&mut self, tab: Arc<Tab>) -> Result<(), WhatsAppError> {
        let timeout = Duration::from_secs(120); // 2 minute timeout
        let start = Instant::now();
        let mut poll_interval = interval(Duration::from_secs(2));

        while start.elapsed() < timeout {
            poll_interval.tick().await;

            // Only check for QR code changes if we don't already have one
            let has_qr_code = {
                let state = self.state.lock().await;
                state.qr_code.is_some()
            };
            
            if !has_qr_code {
                match self.extract_qr_code(&tab) {
                    Ok(Some(qr_code)) => {
                        // Logging disabled
                        info!("QR code detected during poll");
                        self.update_status_with_qr(ConnectionStatus::QrCodeReady, Some(qr_code)).await;
                    }
                    Ok(None) => {
                        // Logging disabled
                    }
                    Err(e) => {
                        // Logging disabled
                        warn!("QR code extraction failed during poll: {}", e);
                    }
                }
            } else {
                // Logging disabled
            }

            // Check if we're now logged in - with error handling
            match self.is_already_logged_in(&tab) {
                Ok(true) => {
                    // Logging disabled
                    match self.validate_active_session(&tab) {
                        Ok(true) => {
                            // Logging disabled
                            info!("Successfully connected to WhatsApp Web!");
                            self.update_status(ConnectionStatus::Connected).await;
                            self.start_monitoring().await?;
                            return Ok(());
                        }
                        Ok(false) => {
                            // Logging disabled
                            // Continue polling
                        }
                        Err(e) => {
                            // Logging disabled
                            warn!("Session validation error during poll: {}", e);
                            // Continue polling
                        }
                    }
                }
                Ok(false) => {
                    // Not logged in yet, continue polling
                }
                Err(e) => {
                    // Logging disabled
                    warn!("Login check error during poll: {}", e);
                    // Continue polling
                }
            }
        }

        // Logging disabled
        Err(WhatsAppError::Timeout)
    }

    pub async fn start_monitoring(&mut self) -> Result<(), WhatsAppError> {
        info!("[WhatsApp] Starting real-time message monitoring...");
        
        let tab = self.tab.as_ref()
            .ok_or_else(|| {
                error!("[WhatsApp] Cannot start monitoring: no active tab");
                WhatsAppError::NotConnected
            })?
            .clone();

        // Set up message channel
        info!("[WhatsApp] Setting up message channel...");
        let (tx, _rx) = mpsc::unbounded_channel();
        self.message_sender = Some(tx);

        // Update monitoring status
        {
            let mut monitoring = self.monitoring_active.lock().await;
            *monitoring = true;
            info!("[WhatsApp] Monitoring active flag set to true");
        }
        
        info!("[WhatsApp] Updating status to Monitoring...");
        self.update_status(ConnectionStatus::Monitoring).await;

        // Start message listener
        info!("[WhatsApp] Starting message monitoring loop task...");
        let database = self.database.clone();
        let state = self.state.clone();
        let monitoring_active = self.monitoring_active.clone();

        tokio::spawn(async move {
            info!("[WhatsApp] Message monitoring loop task started");
            Self::message_monitoring_loop(tab, database, state, monitoring_active).await;
            info!("[WhatsApp] Message monitoring loop task ended");
        });

        // Start gap detection scheduler
        info!("[WhatsApp] Starting gap detection scheduler...");
        self.start_gap_detection_scheduler().await;

        // Start health monitoring
        self.start_health_monitoring().await;

        Ok(())
    }

    async fn message_monitoring_loop(
        tab: Arc<Tab>,
        database: WhatsAppDatabase,
        state: Arc<Mutex<WhatsAppConnectionState>>,
        monitoring_active: Arc<Mutex<bool>>,
    ) {
        // Logging disabled
        info!("[WhatsApp] Message monitoring loop started with 500ms intervals");
        let mut check_interval = interval(Duration::from_millis(500)); // Check every 500ms
        let mut last_check = Utc::now().timestamp();
        let mut iteration_count = 0;
        let mut total_messages_found = 0;

        while *monitoring_active.lock().await {
            check_interval.tick().await;
            iteration_count += 1;

            // Log heartbeat every 2 minutes (240 iterations at 500ms)
            if iteration_count % 240 == 0 {
                info!("[WhatsApp] Monitoring heartbeat - iteration {}, total messages: {}", iteration_count, total_messages_found);
            }

            match Self::scan_for_new_messages(&tab, last_check).await {
                Ok(messages) => {
                    if !messages.is_empty() {
                        total_messages_found += messages.len();
                        info!("[WhatsApp] Found {} new messages (total: {})", messages.len(), total_messages_found);
                        
                        for message in messages {
                            // Save to database with deduplication
                            match database.store_message(&message).await {
                                Ok(_) => {
                                    debug!("[WhatsApp] Saved message: {} from {}", message.id, message.sender);
                                    last_check = message.created_at.max(last_check);
                                        
                                    // Update state
                                    {
                                        let mut s = state.lock().await;
                                        s.last_message_timestamp = Some(message.timestamp.parse().unwrap_or(0));
                                        s.message_count += 1;
                                        s.health_status.last_heartbeat = Utc::now().timestamp();
                                    }
                                }
                                Err(e) => {
                                    error!("[WhatsApp] Failed to save message {}: {}", message.id, e);
                                }
                            }
                        }
                    } else {
                        // Update heartbeat even when no messages - but only log occasionally
                        if iteration_count % 120 == 0 { // Every minute
                            debug!("[WhatsApp] No new messages found (iteration {})", iteration_count);
                        }
                        let mut s = state.lock().await;
                        s.health_status.last_heartbeat = Utc::now().timestamp();
                        s.health_status.consecutive_failures = 0;
                    }
                }
                Err(e) => {
                    // Logging disabled
                    error!("[WhatsApp] Error scanning for messages (iteration {}): {}", iteration_count, e);
                    let mut s = state.lock().await;
                    s.health_status.consecutive_failures += 1;
                    // Logging disabled
                    warn!("[WhatsApp] Consecutive failures: {}/5", s.health_status.consecutive_failures);
                    
                    // If too many consecutive failures, trigger recovery
                    if s.health_status.consecutive_failures > 5 {
                        // Logging disabled
                        error!("[WhatsApp] Too many consecutive failures ({}), marking connection as lost", s.health_status.consecutive_failures);
                        s.status = ConnectionStatus::Error("Connection lost - too many scan failures".to_string());
                        break;
                    }
                }
            }
        }

        info!("[WhatsApp] Message monitoring loop ended after {} iterations, {} total messages found", iteration_count, total_messages_found);
    }

    async fn scan_for_new_messages(tab: &Arc<Tab>, since_timestamp: i64) -> Result<Vec<WhatsAppMessage>> {
        // Execute JavaScript to extract new messages
        let js_code = format!(r#"
        (function() {{
            const messages = [];
            const chatElements = document.querySelectorAll('[data-testid="conversation-panel-messages"] [data-testid="msg-container"]');
            
            chatElements.forEach(msgEl => {{
                try {{
                    const timeEl = msgEl.querySelector('[data-testid="msg-meta"] span[title]');
                    if (!timeEl) return;
                    
                    const timeStr = timeEl.getAttribute('title');
                    const msgTime = new Date(timeStr).getTime() / 1000;
                    
                    if (msgTime <= {}) return; // Skip old messages
                    
                    const textEl = msgEl.querySelector('[data-testid="selectable-text"]');
                    const content = textEl ? textEl.innerText : '';
                    
                    if (!content) return;
                    
                    // Try to determine sender
                    const isOutgoing = msgEl.classList.contains('message-out') || 
                                     msgEl.querySelector('[data-testid="tail-out"]');
                    const sender = isOutgoing ? 'me' : 'contact';
                    
                    // Generate unique message ID based on content and timestamp
                    const msgId = btoa(content + msgTime + sender).replace(/[^a-zA-Z0-9]/g, '');
                    
                    messages.push({{
                        id: msgId,
                        content: content,
                        timestamp: Math.floor(msgTime),
                        sender: sender,
                        chat_id: 'current_chat', // Will be improved to get actual chat ID
                        message_type: 'text'
                    }});
                }} catch (e) {{
                    console.error('Error processing message:', e);
                }}
            }});
            
            return messages;
        }})()
        "#, since_timestamp);

        let result = tab.evaluate(&js_code, false)
            .context("Failed to execute message scanning JavaScript")?;

        if let Some(value) = result.value {
            if let Some(array) = value.as_array() {
            let mut messages = Vec::new();
            
            for item in array {
                if let Ok(message_data) = serde_json::from_value::<serde_json::Value>(item.clone()) {
                    let message = WhatsAppMessage {
                        id: message_data["id"].as_str().unwrap_or("unknown").to_string(),
                        chat_id: message_data["chat_id"].as_str().unwrap_or("unknown").to_string(),
                        sender: message_data["sender"].as_str().unwrap_or("unknown").to_string(),
                        text: message_data["content"].as_str().unwrap_or("").to_string(),
                        timestamp: message_data["timestamp"].as_i64().unwrap_or(0).to_string(),
                        message_type: Some(message_data["message_type"].as_str().unwrap_or("text").to_string()),
                        contact_name: None,
                        processed_by_llm: false,
                        work_related: None,
                        task_priority: None,
                        created_at: Utc::now().timestamp(),
                    };
                    messages.push(message);
                }
            }
            
            Ok(messages)
            } else {
                Ok(Vec::new())
            }
        } else {
            Ok(Vec::new())
        }
    }

    async fn start_gap_detection_scheduler(&self) {
        let database = self.database.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(60)); // Check every minute
            
            loop {
                interval.tick().await;
                
                // Check for unrecovered gaps and attempt recovery
                match database.get_unrecovered_gaps() {
                    Ok(gaps) => {
                        for gap in gaps {
                            info!("Attempting to recover gap: {} to {}", gap.gap_start, gap.gap_end);
                            
                            // Mark attempt
                            let _ = database.mark_gap_recovery_attempted(&gap.id);
                            
                            // TODO: Implement gap recovery logic
                            // This could involve scrolling back in chat history
                        }
                    }
                    Err(e) => {
                        error!("Failed to check for gaps: {}", e);
                    }
                }
            }
        });
    }

    async fn start_health_monitoring(&self) {
        let state = self.state.clone();
        let monitoring_active = self.monitoring_active.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(30)); // Health check every 30s
            
            while *monitoring_active.lock().await {
                interval.tick().await;
                
                let should_recover = {
                    let s = state.lock().await;
                    let now = Utc::now().timestamp();
                    let last_heartbeat = s.health_status.last_heartbeat;
                    
                    // If no heartbeat for 2 minutes, consider connection lost
                    now - last_heartbeat > 120
                };
                
                if should_recover {
                    warn!("Health check failed, connection may be lost");
                    {
                        let mut s = state.lock().await;
                        s.status = ConnectionStatus::Reconnecting;
                        s.health_status.last_recovery_attempt = Some(Utc::now().timestamp());
                    }
                    
                    // TODO: Implement connection recovery
                    // This could involve refreshing the page or restarting the browser
                }
            }
        });
    }

    pub async fn disconnect(&mut self) -> Result<(), WhatsAppError> {
        info!("Disconnecting WhatsApp Web...");
        
        // Stop monitoring
        {
            let mut monitoring = self.monitoring_active.lock().await;
            *monitoring = false;
        }

        // Close browser
        if let Some(browser) = self.browser.take() {
            // Browser will be dropped and closed
            drop(browser);
        }
        
        self.tab = None;
        self.message_sender = None;
        
        self.update_status(ConnectionStatus::Disconnected).await;
        
        Ok(())
    }

    pub async fn get_connection_status(&self) -> WhatsAppConnectionState {
        self.state.lock().await.clone()
    }

    pub async fn get_unprocessed_messages(&self, limit: Option<i32>) -> Result<Vec<WhatsAppMessage>, WhatsAppError> {
        let u32_limit = limit.map(|l| l as u32);
        self.database.get_unprocessed_messages(u32_limit)
            .await
            .map_err(|e| WhatsAppError::Database(e.to_string()))
    }

    pub async fn mark_message_processed(&self, message_id: &str, work_related: bool, task_priority: Option<String>) -> Result<(), WhatsAppError> {
        self.database.mark_as_processed(message_id, Some(work_related), task_priority)
            .await
            .map_err(|e| WhatsAppError::Database(e.to_string()))
    }

    async fn update_status(&self, status: ConnectionStatus) {
        let mut state = self.state.lock().await;
        state.status = status;
        
        if matches!(state.status, ConnectionStatus::Connected | ConnectionStatus::Monitoring) {
            state.connected_since = Some(Utc::now().timestamp());
        } else if matches!(state.status, ConnectionStatus::Disconnected) {
            state.connected_since = None;
            state.qr_code = None;
        }
    }

    async fn update_status_with_qr(&self, status: ConnectionStatus, qr_code: Option<String>) {
        let mut state = self.state.lock().await;
        state.status = status;
        state.qr_code = qr_code.clone();
        
        // Logging disabled
        // Logging disabled
        // Logging disabled
        
        info!("[WhatsApp] Status updated with QR: {:?}, QR present: {}", 
              state.status, qr_code.is_some());
    }
}

// Tauri command handlers
use tauri::command;

#[command]
pub async fn whatsapp_connect() -> Result<WhatsAppConnectionState, String> {
    // Logging disabled
    info!("[WhatsApp Command] whatsapp_connect called from frontend");
    let monitor = WhatsAppMonitor::get_instance();
    
    // Clone the Arc to avoid holding the lock across await
    // Logging disabled
    info!("[WhatsApp Command] Acquiring monitor lock for connection...");
    let result = {
        let mut monitor = monitor.lock().await;
        // Logging disabled
        info!("[WhatsApp Command] Monitor lock acquired, calling connect()...");
        monitor.connect().await
    };
    
    match result {
        Ok(_) => {
            // Logging disabled
            info!("[WhatsApp Command] Connection successful, getting status...");
            let monitor = monitor.lock().await;
            let status = monitor.get_connection_status().await;
            // Logging disabled
            info!("[WhatsApp Command] Returning status: {:?}", status.status);
            Ok(status)
        },
        Err(e) => {
            // Logging disabled
            error!("[WhatsApp Command] Connection failed: {}", e);
            Err(e.to_string())
        },
    }
}

#[command]
pub async fn whatsapp_disconnect() -> Result<(), String> {
    info!("[WhatsApp Command] whatsapp_disconnect called from frontend");
    let monitor = WhatsAppMonitor::get_instance();
    info!("[WhatsApp Command] Acquiring monitor lock for disconnection...");
    let mut monitor = monitor.lock().await;
    
    info!("[WhatsApp Command] Monitor lock acquired, calling disconnect()...");
    match monitor.disconnect().await {
        Ok(_) => {
            info!("[WhatsApp Command] Disconnect successful");
            Ok(())
        }
        Err(e) => {
            error!("[WhatsApp Command] Disconnect failed: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn whatsapp_get_status() -> WhatsAppConnectionState {
    debug!("[WhatsApp Command] whatsapp_get_status called from frontend");
    let monitor = WhatsAppMonitor::get_instance();
    let monitor = monitor.lock().await;
    let status = monitor.get_connection_status().await;
    debug!("[WhatsApp Command] Status: {:?}, Message count: {}", status.status, status.message_count);
    status
}

#[command]
pub async fn whatsapp_start_monitoring() -> Result<(), String> {
    info!("[WhatsApp Command] whatsapp_start_monitoring called from frontend");
    let monitor = WhatsAppMonitor::get_instance();
    
    info!("[WhatsApp Command] Acquiring monitor lock for start monitoring...");
    let result = {
        let mut monitor = monitor.lock().await;
        info!("[WhatsApp Command] Monitor lock acquired, calling start_monitoring()...");
        monitor.start_monitoring().await
    };
    
    match result {
        Ok(_) => {
            info!("[WhatsApp Command] Start monitoring successful");
            Ok(())
        }
        Err(e) => {
            error!("[WhatsApp Command] Start monitoring failed: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn whatsapp_get_unprocessed_messages(limit: Option<i32>) -> Result<Vec<WhatsAppMessage>, String> {
    info!("[WhatsApp Command] whatsapp_get_unprocessed_messages called with limit: {:?}", limit);
    let monitor = WhatsAppMonitor::get_instance();
    let monitor = monitor.lock().await;
    
    match monitor.get_unprocessed_messages(limit).await {
        Ok(messages) => {
            info!("[WhatsApp Command] Retrieved {} unprocessed messages", messages.len());
            Ok(messages)
        }
        Err(e) => {
            error!("[WhatsApp Command] Failed to get unprocessed messages: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn whatsapp_mark_processed(message_id: String, work_related: bool, task_priority: Option<String>) -> Result<(), String> {
    let monitor = WhatsAppMonitor::get_instance();
    let monitor = monitor.lock().await;
    
    monitor.mark_message_processed(&message_id, work_related, task_priority).await.map_err(|e| e.to_string())
}

#[command]
pub async fn whatsapp_check_login() -> Result<WhatsAppConnectionState, String> {
    // Logging disabled
    let monitor = WhatsAppMonitor::get_instance();
    let mut monitor = monitor.lock().await;
    
    // Check if we have a browser tab available
    if let Some(tab) = &monitor.tab {
        match monitor.is_already_logged_in(tab) {
            Ok(true) => {
                // Logging disabled
                match monitor.validate_active_session(tab) {
                    Ok(true) => {
                        // Logging disabled
                        monitor.update_status(ConnectionStatus::Connected).await;
                        if let Err(e) = monitor.start_monitoring().await {
                            error!("Failed to start monitoring: {}", e);
                            monitor.update_status(ConnectionStatus::Error(format!("Failed to start monitoring: {}", e))).await;
                        }
                    }
                    Ok(false) => {
                        // Logging disabled
                    }
                    Err(_e) => {
                        // Logging disabled
                    }
                }
            }
            Ok(false) => {
                // Logging disabled
            }
                                Err(_e) => {
                        // Logging disabled
                    }
        }
    } else {
        // Logging disabled
    }
    
    let status = monitor.get_connection_status().await;
    Ok(status)
}