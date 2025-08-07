import { initDatabase, executeDbOperation } from '../utils/database';

export interface AppSession {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  isActive: boolean;
}

export class AppSessionTracker {
  private static instance: AppSessionTracker;
  private currentSessionId: string | null = null;

  static getInstance(): AppSessionTracker {
    if (!AppSessionTracker.instance) {
      AppSessionTracker.instance = new AppSessionTracker();
    }
    return AppSessionTracker.instance;
  }

  private constructor() {
    // Initialize session tracking
    this.initializeSession();
    
    // Handle app close events
    this.setupCleanupHandlers();
  }

  private async initializeSession(): Promise<void> {
    await this.ensureTableExists();
    await this.cleanupPreviousSessions();
    await this.startNewSession();
  }

  private async ensureTableExists(): Promise<void> {
    return executeDbOperation(async () => {
      const db = await initDatabase();
      
      // Check if app_sessions table exists
      const tableExists = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='app_sessions'");
      
      if (tableExists.length === 0) {
        await db.execute(`
          CREATE TABLE app_sessions (
            sessionId TEXT PRIMARY KEY,
            startedAt INTEGER NOT NULL,
            endedAt INTEGER,
            isActive INTEGER DEFAULT 1
          )
        `);
        
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_app_sessions_active 
          ON app_sessions(isActive)
        `);
        
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_app_sessions_started 
          ON app_sessions(startedAt)
        `);
      }
    });
  }

  private async cleanupPreviousSessions(): Promise<void> {
    return executeDbOperation(async () => {
      const db = await initDatabase();
      
      // Mark all previous sessions as inactive and set end time
      await db.execute(
        'UPDATE app_sessions SET isActive = 0, endedAt = ? WHERE isActive = 1',
        [Date.now()]
      );
      
    });
  }

  private async startNewSession(): Promise<void> {
    return executeDbOperation(async () => {
      const db = await initDatabase();
      
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      await db.execute(
        `INSERT INTO app_sessions (sessionId, startedAt, isActive) VALUES (?, ?, 1)`,
        [this.currentSessionId, now]
      );
      
    });
  }


  async getLastSession(): Promise<AppSession | null> {
    return executeDbOperation(async () => {
      const db = await initDatabase();
      
      const result = await db.select<any[]>(
        `SELECT sessionId, startedAt, endedAt, isActive 
         FROM app_sessions 
         WHERE isActive = 0 
         ORDER BY startedAt DESC 
         LIMIT 1`
      );
      
      if (result.length === 0) return null;
      
      const row = result[0];
      return {
        sessionId: row.sessionId,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        isActive: Boolean(row.isActive)
      };
    });
  }

  async getCurrentSession(): Promise<AppSession | null> {
    if (!this.currentSessionId) return null;
    
    return executeDbOperation(async () => {
      const db = await initDatabase();
      
      const result = await db.select<any[]>(
        `SELECT sessionId, startedAt, endedAt, isActive 
         FROM app_sessions 
         WHERE sessionId = ?`,
        [this.currentSessionId]
      );
      
      if (result.length === 0) return null;
      
      const row = result[0];
      return {
        sessionId: row.sessionId,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        isActive: Boolean(row.isActive)
      };
    });
  }

  async calculateDowntime(): Promise<number> {
    const lastSession = await this.getLastSession();
    if (!lastSession || !lastSession.endedAt) {
      return 0; // No previous session or unclean shutdown
    }
    
    const currentSession = await this.getCurrentSession();
    if (!currentSession) {
      return 0;
    }
    
    return currentSession.startedAt - lastSession.endedAt;
  }


  private setupCleanupHandlers(): void {
    // Handle various app close scenarios
    const cleanup = async () => {
      await this.endCurrentSession();
    };

    // Browser/Tauri close events
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    
    // Process exit events (for Tauri)
    if (typeof window.__TAURI__ !== 'undefined') {
      // Tauri-specific cleanup
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          cleanup();
        }
      });
    }
  }

  private async endCurrentSession(): Promise<void> {
    if (!this.currentSessionId) return;
    
    try {
      await executeDbOperation(async () => {
        const db = await initDatabase();
        
        await db.execute(
          'UPDATE app_sessions SET isActive = 0, endedAt = ? WHERE sessionId = ?',
          [Date.now(), this.currentSessionId]
        );
        
      });
    } catch (error) {
      console.error('Failed to end app session:', error);
    }
  }

  // Public method to manually trigger session end (for testing)
  async endSession(): Promise<void> {
    await this.endCurrentSession();
    this.currentSessionId = null;
  }
}

// Export singleton instance
export const appSessionTracker = AppSessionTracker.getInstance();