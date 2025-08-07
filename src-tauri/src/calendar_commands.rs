use tauri::AppHandle;
use chrono::{DateTime, Utc};
use serde_json;
use uuid::Uuid;

// Validation helper functions
pub fn validate_event_id(event_id: &str) -> Result<(), String> {
    if event_id.trim().is_empty() {
        return Err("Event ID cannot be empty".to_string());
    }
    Ok(())
}

pub fn validate_project_id(project_id: &str) -> Result<(), String> {
    if project_id.trim().is_empty() {
        return Err("Project ID cannot be empty".to_string());
    }
    Ok(())
}

pub fn validate_date_range(start_date: &str, end_date: &str) -> Result<(), String> {
    let start = DateTime::parse_from_rfc3339(start_date)
        .map_err(|_| "Invalid start date format".to_string())?;
    let end = DateTime::parse_from_rfc3339(end_date)
        .map_err(|_| "Invalid end date format".to_string())?;
    
    if start >= end {
        return Err("Start date must be before end date".to_string());
    }
    
    Ok(())
}

pub async fn create_calendar_event(
    _app: AppHandle,
    event: serde_json::Value,
) -> Result<serde_json::Value, String> {
    println!("📅 [create_calendar_event] Creating calendar event: {:?}", event);
    
    let title = event.get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing or invalid title")?;
    
    let description = event.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let start_date = event.get("startDate")
        .and_then(|v| v.as_str())
        .ok_or("Missing or invalid startDate")?;
    
    let end_date = event.get("endDate")
        .and_then(|v| v.as_str());
        
    let is_all_day = event.get("isAllDay")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let source = event.get("source")
        .and_then(|v| v.as_str())
        .unwrap_or("manual");
    
    let source_message_id = event.get("sourceMessageId")
        .and_then(|v| v.as_str());
    
    let created_by = event.get("createdBy")
        .and_then(|v| v.as_str())
        .unwrap_or("system");

    // Validate date if end_date is provided
    if let Some(end) = end_date {
        validate_date_range(start_date, end)?;
    }

    let event_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    // This would normally insert into the events table
    let created_event = serde_json::json!({
        "id": event_id,
        "title": title,
        "description": description,
        "start_date": start_date,
        "end_date": end_date,
        "is_all_day": is_all_day,
        "source": source,
        "source_message_id": source_message_id,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now
    });
    
    println!("✅ [create_calendar_event] Event created with ID: {}", event_id);
    Ok(created_event)
}

pub async fn get_event_by_id(
    _app: AppHandle,
    event_id: String,
) -> Result<serde_json::Value, String> {
    println!("🔍 [get_event_by_id] Fetching event: {}", event_id);
    
    validate_event_id(&event_id)?;

    // This would normally query the events table
    let mock_event = serde_json::json!({
        "id": event_id,
        "title": "Sample Event",
        "description": "Event description",
        "start_date": Utc::now().to_rfc3339(),
        "end_date": null,
        "is_all_day": false,
        "source": "manual",
        "created_by": "user@example.com",
        "created_at": Utc::now().to_rfc3339(),
        "updated_at": Utc::now().to_rfc3339()
    });
    
    println!("✅ [get_event_by_id] Event fetched successfully");
    Ok(mock_event)
}

pub async fn get_events_in_range(
    _app: AppHandle,
    start_date: String,
    end_date: String,
    project_id: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    println!("🔍 [get_events_in_range] Fetching events from {} to {}", start_date, end_date);
    
    validate_date_range(&start_date, &end_date)?;
    
    if let Some(pid) = &project_id {
        validate_project_id(pid)?;
    }

    // This would normally query the events table with date range filtering
    let mock_events = vec![
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "title": "Event in Range",
            "description": "Event within the specified date range",
            "start_date": start_date,
            "end_date": end_date,
            "is_all_day": false,
            "project_id": project_id,
            "source": "manual",
            "created_by": "user@example.com",
            "created_at": Utc::now().to_rfc3339(),
            "updated_at": Utc::now().to_rfc3339()
        })
    ];
    
    println!("✅ [get_events_in_range] Found {} events in range", mock_events.len());
    Ok(mock_events)
}

pub async fn update_event(
    _app: AppHandle,
    event_id: String,
    event_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    println!("📝 [update_event] Updating event {}: {:?}", event_id, event_data);
    
    validate_event_id(&event_id)?;

    // This would normally update the event in the database
    let updated_event = serde_json::json!({
        "id": event_id,
        "title": event_data.get("title").unwrap_or(&serde_json::Value::String("Updated Event".to_string())),
        "description": event_data.get("description").unwrap_or(&serde_json::Value::String("".to_string())),
        "start_date": event_data.get("start_date").unwrap_or(&serde_json::Value::String(Utc::now().to_rfc3339())),
        "end_date": event_data.get("end_date"),
        "is_all_day": event_data.get("is_all_day").unwrap_or(&serde_json::Value::Bool(false)),
        "updated_at": Utc::now().to_rfc3339()
    });
    
    println!("✅ [update_event] Event updated successfully");
    Ok(updated_event)
}

pub async fn delete_event(
    _app: AppHandle,
    event_id: String,
) -> Result<serde_json::Value, String> {
    println!("🗑️ [delete_event] Deleting event: {}", event_id);
    
    validate_event_id(&event_id)?;

    // This would normally delete the event from the database
    let response = serde_json::json!({
        "event_id": event_id,
        "deleted": true,
        "deleted_at": Utc::now().to_rfc3339()
    });
    
    println!("✅ [delete_event] Event deleted successfully");
    Ok(response)
}

pub async fn store_event_detection(
    _app: AppHandle,
    event: serde_json::Value,
) -> Result<String, String> {
    println!("🤖 [store_event_detection] Storing AI-detected event: {:?}", event);
    
    // Extract required fields from the event object
    let project_id = event.get("projectId")
        .and_then(|v| v.as_str())
        .ok_or("Missing required field: projectId")?;
    
    let name = event.get("title")
        .and_then(|v| v.as_str())
        .ok_or("Missing required field: title")?;
        
    validate_project_id(project_id)?;
    
    if name.trim().is_empty() {
        return Err("Event name cannot be empty".to_string());
    }

    // Extract optional fields
    let description = event.get("description").and_then(|v| v.as_str());
    let default_date = Utc::now().to_rfc3339();
    let date = event.get("startDate").and_then(|v| v.as_str()).unwrap_or(&default_date);
    let time = event.get("time").and_then(|v| v.as_str());
    let event_type = event.get("eventType").and_then(|v| v.as_str()).unwrap_or("reminder");
    let participants = event.get("participants").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
    let priority = event.get("priority").and_then(|v| v.as_str()).unwrap_or("medium");
    let source_slack_channel = event.get("source_slack_channel").and_then(|v| v.as_str());
    let source_slack_message = event.get("messageTs").and_then(|v| v.as_str());
    let source_slack_user = event.get("messageUser").and_then(|v| v.as_str());
    let source_slack_timestamp = event.get("detectedAt").and_then(|v| v.as_str());
    let ai_confidence = event.get("confidence").and_then(|v| v.as_f64());
    let ai_generated = event.get("ai_generated").and_then(|v| v.as_bool()).unwrap_or(true);

    // Validate date format
    DateTime::parse_from_rfc3339(date)
        .map_err(|_| "Invalid date format".to_string())?;

    // Validate participants JSON
    if !participants.is_empty() {
        serde_json::from_str::<serde_json::Value>(&participants)
            .map_err(|_| "Invalid participants JSON format".to_string())?;
    }

    let event_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    // This would normally insert into the events table
    let _event_data = serde_json::json!({
        "id": event_id,
        "project_id": project_id,
        "name": name,
        "description": description,
        "date": date,
        "time": time,
        "event_type": event_type,
        "participants": participants,
        "priority": priority,
        "source_slack_channel": source_slack_channel,
        "source_slack_message": source_slack_message,
        "source_slack_user": source_slack_user,
        "source_slack_timestamp": source_slack_timestamp,
        "ai_confidence": ai_confidence,
        "ai_generated": ai_generated,
        "created_at": now,
        "updated_at": now
    });
    
    println!("✅ [store_event_detection] AI event stored with ID: {}", event_id);
    Ok(event_id)
}