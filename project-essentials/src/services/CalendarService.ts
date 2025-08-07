import { invoke } from '../utils/tauri';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participants?: string[];
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  reminders?: CalendarReminder[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  source: 'manual' | 'ai_detected' | 'slack_import';
  sourceData?: {
    slackChannel?: string;
    slackMessage?: string;
    slackUser?: string;
    slackTimestamp?: string;
    aiConfidence?: number;
  };
}

export interface CalendarReminder {
  method: 'popup' | 'email' | 'notification';
  minutesBefore: number;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  date: string;
  time?: string;
  duration?: number; // minutes
  participants?: string[];
  eventType?: 'meeting' | 'deadline' | 'launch' | 'milestone' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  isAllDay?: boolean;
  reminders?: CalendarReminder[];
  projectId?: string;
  sourceData?: CalendarEvent['sourceData'];
}

export interface CalendarIntegration {
  type: 'native' | 'google' | 'outlook' | 'apple' | 'internal';
  enabled: boolean;
  configuration?: {
    calendarId?: string;
    syncDirection?: 'one_way' | 'two_way';
    defaultReminders?: CalendarReminder[];
  };
}

class CalendarService {
  private integrations: Map<string, CalendarIntegration> = new Map();

  constructor() {
    this.initializeIntegrations();
  }

  private initializeIntegrations() {
    // Internal calendar is always available
    this.integrations.set('internal', {
      type: 'internal',
      enabled: true,
      configuration: {
        defaultReminders: [
          { method: 'popup', minutesBefore: 15 },
          { method: 'notification', minutesBefore: 5 }
        ]
      }
    });

    // Check for system calendar availability
    this.detectSystemCalendars();
  }

  private async detectSystemCalendars() {
    try {
      // Detect available system calendars
      const platform = await invoke('get_platform_info') as any;
      
      if (platform.os === 'macos') {
        this.integrations.set('apple', {
          type: 'apple',
          enabled: false, // User must enable manually
          configuration: {}
        });
      }
      
      if (platform.os === 'windows') {
        this.integrations.set('outlook', {
          type: 'outlook',
          enabled: false,
          configuration: {}
        });
      }
    } catch (error) {
      console.warn('Failed to detect system calendars:', error);
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(eventInput: CalendarEventInput): Promise<CalendarEvent> {
    // Generate event ID
    const eventId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse and validate date/time
    const startDate = this.parseDate(eventInput.date);
    const startTime = eventInput.time;
    
    // Calculate end time if duration is provided
    let endDate = startDate;
    let endTime = startTime;
    
    if (eventInput.duration && startTime) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + eventInput.duration * 60000);
      endDate = endDateTime.toISOString().split('T')[0];
      endTime = endDateTime.toTimeString().substr(0, 5);
    }

    const calendarEvent: CalendarEvent = {
      id: eventId,
      title: eventInput.title,
      description: eventInput.description,
      startDate,
      endDate,
      startTime,
      endTime,
      location: eventInput.location,
      participants: eventInput.participants || [],
      isAllDay: eventInput.isAllDay || false,
      recurrence: 'none',
      reminders: eventInput.reminders || this.getDefaultReminders(),
      status: 'confirmed',
      source: eventInput.sourceData ? 'ai_detected' : 'manual',
      sourceData: eventInput.sourceData,
    };

    // Store in database
    try {
      await invoke('store_event_detection', {
        projectId: eventInput.projectId || 'default',
        name: calendarEvent.title,
        description: calendarEvent.description,
        date: calendarEvent.startDate,
        time: calendarEvent.startTime,
        eventType: eventInput.eventType || 'other',
        participants: JSON.stringify(calendarEvent.participants),
        priority: eventInput.priority || 'medium',
        sourceSlackChannel: eventInput.sourceData?.slackChannel,
        sourceSlackMessage: eventInput.sourceData?.slackMessage,
        sourceSlackUser: eventInput.sourceData?.slackUser,
        sourceSlackTimestamp: eventInput.sourceData?.slackTimestamp,
        aiConfidence: eventInput.sourceData?.aiConfidence,
        aiGenerated: !!eventInput.sourceData
      });
    } catch (error) {
      console.error('Failed to store event in database:', error);
      throw new Error('Failed to create calendar event');
    }

    // Sync to external calendars if enabled
    await this.syncToExternalCalendars(calendarEvent);

    // Send notifications
    this.scheduleReminders(calendarEvent);

    return calendarEvent;
  }

  /**
   * Create event from AI detection
   */
  async createEventFromAIDetection(detection: {
    title: string;
    description: string;
    eventType: string;
    date?: string;
    time?: string;
    participants: string[];
    confidence: number;
    sourceMessage: string;
    sourceUser: string;
    sourceTimestamp: string;
    priority: string;
  }, projectId: string): Promise<CalendarEvent> {
    const eventInput: CalendarEventInput = {
      title: detection.title,
      description: detection.description,
      date: detection.date || new Date().toISOString().split('T')[0],
      time: detection.time,
      participants: detection.participants,
      eventType: detection.eventType as any,
      priority: detection.priority as any,
      projectId,
      sourceData: {
        slackMessage: detection.sourceMessage,
        slackUser: detection.sourceUser,
        slackTimestamp: detection.sourceTimestamp,
        aiConfidence: detection.confidence
      }
    };

    return this.createEvent(eventInput);
  }

  /**
   * Get events for a project
   */
  async getEventsForProject(projectId: string): Promise<CalendarEvent[]> {
    try {
      // Use frontend database service instead of broken backend command
      const { EventService } = await import('../utils/database');
      const events = await EventService.getByProjectId(projectId);
      
      if (Array.isArray(events)) {
        return events.map(event => this.mapDatabaseEventToCalendarEvent(event));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get events for project:', error);
      return [];
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<CalendarEventInput>): Promise<CalendarEvent> {
    try {
      await invoke('update_event', {
        event_id: eventId,
        event_data: updates
      });

      // Get updated event
      const updatedEvent = await invoke('get_event_by_id', { event_id: eventId });
      return this.mapDatabaseEventToCalendarEvent(updatedEvent);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await invoke('delete_event', { event_id: eventId });
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(projectId?: string): Promise<CalendarEvent[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    try {
      const events = await invoke('get_events_in_range', {
        projectId,
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0]
      });

      if (Array.isArray(events)) {
        return events
          .map(event => this.mapDatabaseEventToCalendarEvent(event))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      }

      return [];
    } catch (error) {
      console.error('Failed to get upcoming events:', error);
      return [];
    }
  }

  /**
   * Configure calendar integration
   */
  setIntegration(type: CalendarIntegration['type'], config: CalendarIntegration): void {
    this.integrations.set(type, config);
    
    // Save to local storage
    try {
      localStorage.setItem(
        'calendar-integrations',
        JSON.stringify(Array.from(this.integrations.entries()))
      );
    } catch (error) {
      console.warn('Failed to save calendar integration config:', error);
    }
  }

  /**
   * Get available integrations
   */
  getIntegrations(): CalendarIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Test calendar integration
   */
  async testIntegration(type: CalendarIntegration['type']): Promise<boolean> {
    const integration = this.integrations.get(type);
    if (!integration || !integration.enabled) {
      return false;
    }

    try {
      switch (type) {
        case 'internal':
          return true; // Internal calendar is always available
        case 'apple':
          return await this.testAppleCalendar();
        case 'outlook':
          return await this.testOutlookCalendar();
        case 'google':
          return await this.testGoogleCalendar();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to test ${type} calendar integration:`, error);
      return false;
    }
  }

  // Private helper methods

  private parseDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      // Fallback to today if date parsing fails
      return new Date().toISOString().split('T')[0];
    }
  }

  private getDefaultReminders(): CalendarReminder[] {
    const internalIntegration = this.integrations.get('internal');
    return internalIntegration?.configuration?.defaultReminders || [
      { method: 'popup', minutesBefore: 15 },
      { method: 'notification', minutesBefore: 5 }
    ];
  }

  private async syncToExternalCalendars(event: CalendarEvent): Promise<void> {
    const enabledIntegrations = Array.from(this.integrations.entries())
      .filter(([_, integration]) => integration.enabled && integration.type !== 'internal');

    for (const [type] of enabledIntegrations) {
      try {
        await this.syncEventToIntegration(event, type);
      } catch (error) {
        console.warn(`Failed to sync event to ${type}:`, error);
      }
    }
  }

  private async syncEventToIntegration(
    event: CalendarEvent,
    type: string
  ): Promise<void> {
    // Implementation would depend on the calendar system
    // For now, this is a placeholder for future development
    console.log(`Syncing event ${event.id} to ${type} calendar`);
  }

  private scheduleReminders(event: CalendarEvent): void {
    event.reminders?.forEach(reminder => {
      const eventDateTime = new Date(`${event.startDate}T${event.startTime || '00:00'}`);
      const reminderTime = new Date(eventDateTime.getTime() - reminder.minutesBefore * 60000);
      
      if (reminderTime > new Date()) {
        // Schedule the reminder
        this.scheduleReminder(event, reminder, reminderTime);
      }
    });
  }

  private scheduleReminder(event: CalendarEvent, reminder: CalendarReminder, reminderTime: Date): void {
    const delay = reminderTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.showReminder(event, reminder);
      }, delay);
    }
  }

  private showReminder(event: CalendarEvent, reminder: CalendarReminder): void {
    switch (reminder.method) {
      case 'popup':
        this.showPopupReminder(event);
        break;
      case 'notification':
        this.showNotificationReminder(event);
        break;
      case 'email':
        this.sendEmailReminder(event);
        break;
    }
  }

  private showPopupReminder(event: CalendarEvent): void {
    // In a real app, this would show a system dialog or app notification
    console.log(`Reminder: ${event.title} starting soon at ${event.startTime}`);
  }

  private showNotificationReminder(event: CalendarEvent): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Upcoming Event: ${event.title}`, {
        body: `Starting ${event.startTime ? `at ${event.startTime}` : 'soon'}`,
        icon: '/calendar-icon.png'
      });
    }
  }

  private sendEmailReminder(event: CalendarEvent): void {
    // Placeholder for email reminder functionality
    console.log(`Email reminder scheduled for event: ${event.title}`);
  }

  private mapDatabaseEventToCalendarEvent(dbEvent: any): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.name,
      description: dbEvent.description,
      startDate: dbEvent.date,
      endDate: dbEvent.date, // Default to same day
      startTime: dbEvent.time,
      endTime: dbEvent.end_time,
      location: dbEvent.location,
      participants: dbEvent.participants ? JSON.parse(dbEvent.participants) : [],
      isAllDay: !dbEvent.time,
      recurrence: 'none',
      reminders: this.getDefaultReminders(),
      status: 'confirmed',
      source: dbEvent.ai_generated ? 'ai_detected' : 'manual',
      sourceData: dbEvent.ai_generated ? {
        slackChannel: dbEvent.source_slack_channel,
        slackMessage: dbEvent.source_slack_message,
        slackUser: dbEvent.source_slack_user,
        slackTimestamp: dbEvent.source_slack_timestamp,
        aiConfidence: dbEvent.ai_confidence
      } : undefined
    };
  }

  private async testAppleCalendar(): Promise<boolean> {
    // Would integrate with macOS Calendar app
    return false; // Not implemented yet
  }

  private async testOutlookCalendar(): Promise<boolean> {
    // Would integrate with Outlook calendar
    return false; // Not implemented yet
  }

  private async testGoogleCalendar(): Promise<boolean> {
    // Would integrate with Google Calendar API
    return false; // Not implemented yet
  }
}

// Export singleton instance
export const calendarService = new CalendarService();