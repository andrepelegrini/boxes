import Database from '@tauri-apps/plugin-sql';
import { 
  Project, 
  ProjectCheckIn
} from '../types/app';
import { isTauri } from './tauri';
// Simple logging helper
const logDatabase = () => {
  // Database logs removed for cleaner console
};

let db: Database | null = null;

// Database operation queue to prevent concurrent writes
class DatabaseQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }
    this.processing = false;
  }
}

const dbQueue = new DatabaseQueue();

// Retry logic with exponential backoff for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 5,  // Increased retries for better resilience
  initialDelay = 50  // Reduced initial delay
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is related to database lock
      if (error?.message?.includes('database is locked') || 
          error?.message?.includes('database busy') ||
          error?.message?.includes('SQLITE_BUSY') ||
          error?.code === 5) { // SQLITE_BUSY
        
        const delay = initialDelay * Math.pow(1.5, attempt); // Reduced backoff multiplier
        logDatabase(`🔄 Database busy (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms. Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, throw immediately
      logDatabase(`❌ Non-retryable database error: ${error.message}`);
      throw error;
    }
  }
  
  logDatabase(`❌ Database operation failed after ${maxRetries} attempts: ${lastError?.message}`);
  throw lastError;
}

// Execute database operation with retry and queue
export async function executeDbOperation<T>(
  operation: () => Promise<T>,
  useQueue = true
): Promise<T> {
  if (useQueue) {
    return dbQueue.enqueue(() => withRetry(operation));
  }
  return withRetry(operation);
}

// Initialize database connection
export async function initDatabase(): Promise<Database> {
  console.log('💾 [Database] Initializing database...');
  if (db) {
    console.log('✅ [Database] Using existing database connection');
    return db;
  }
  
  // Check if we're in a Tauri environment
  if (!isTauri()) {
    const error = new Error('Database initialization failed: Tauri environment not available');
    console.error('❌ [Database] Not in Tauri environment:', error);
    throw error;
  }
  
  // Check if Tauri internals are available
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__ || !window.__TAURI_INTERNALS__.invoke) {
    const error = new Error('Database initialization failed: Tauri internals not available');
    console.error('❌ [Database] Tauri internals not available:', error);
    throw error;
  }
  
  console.log('💾 [Database] Creating new database connection...');
  db = await Database.load('sqlite:project_boxes.db');
  console.log('✅ [Database] Database connection established');
  
  // Enable SQLite optimizations for concurrent access
  await db.execute('PRAGMA foreign_keys = ON'); // Enable foreign key constraints
  await db.execute('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  await db.execute('PRAGMA busy_timeout = 60000'); // Wait up to 60 seconds for locks (increased)
  await db.execute('PRAGMA synchronous = NORMAL'); // Balance between safety and performance
  await db.execute('PRAGMA temp_store = MEMORY'); // Use memory for temporary tables
  await db.execute('PRAGMA mmap_size = 30000000000'); // Use memory-mapped I/O for better performance
  await db.execute('PRAGMA cache_size = -64000'); // 64MB cache size for better performance
  await db.execute('PRAGMA wal_autocheckpoint = 1000'); // Checkpoint every 1000 WAL pages
  
  console.log('💾 [Database] Creating tables...');
  await createTables();
  console.log('✅ [Database] Database initialization complete');
  
  return db;
}

// Create all necessary tables with clean, simple schema
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'shelf')),
      isNextUp INTEGER DEFAULT 0,
      archiveReason TEXT,
      archivedAt TEXT,
      strategicGoal TEXT,
      lastReviewedAt TEXT,
      aiAnalysis TEXT, -- JSON string
      slackChannelUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT
    )
  `);

  // Tasks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      dueDate TEXT,
      estimatedHours REAL,
      actualHours REAL,
      isBlocked INTEGER DEFAULT 0,
      blockingReason TEXT,
      assignedTo TEXT,
      tags TEXT, -- JSON array
      dependencies TEXT, -- JSON array
      subtasks TEXT, -- JSON array
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT,
      attendees TEXT, -- JSON array
      duration INTEGER,
      recurring TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Documents table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      content TEXT,
      url TEXT,
      tags TEXT, -- JSON array
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Activity logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      user TEXT,
      type TEXT DEFAULT 'general',
      metadata TEXT, -- JSON object
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Project check-ins table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_checkins (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT,
      blockers TEXT, -- JSON array
      achievements TEXT, -- JSON array
      nextSteps TEXT, -- JSON array
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member',
      avatar TEXT,
      preferences TEXT, -- JSON object
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt TEXT,
      teamId TEXT
    )
  `);

  // Settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Simple project-channel connections (new approach) - persist data
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_slack_connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sync_interval_minutes INTEGER DEFAULT 15,
      last_analysis_at TEXT,
      analysis_message_count INTEGER,
      UNIQUE(project_id, channel_id)
    )
  `);

  // Add missing columns to existing project_slack_connections table
  try {
    await db.execute(`ALTER TABLE project_slack_connections ADD COLUMN last_analysis_at TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.execute(`ALTER TABLE project_slack_connections ADD COLUMN analysis_message_count INTEGER`);
  } catch (error) {
    // Column might already exist, ignore error
  }

  // Slack sync metadata table (legacy - still used for analysis)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slack_sync_metadata (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      channelName TEXT NOT NULL,
      teamId TEXT,
      teamName TEXT,
      workspaceId TEXT,
      workspaceName TEXT,
      isEnabled INTEGER DEFAULT 1,
      syncFrequency TEXT DEFAULT 'real-time',
      lastSyncAt TEXT,
      lastMessageId TEXT,
      lastMessageTimestamp TEXT,
      connectionHealthy INTEGER DEFAULT 1,
      lastHealthCheck TEXT,
      lastSyncError TEXT,
      notificationSettings TEXT, -- JSON object
      analysisSettings TEXT, -- JSON object
      metadata TEXT, -- JSON object
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncStatus TEXT DEFAULT 'local' CHECK (syncStatus IN ('local', 'synced', 'conflict')),
      lastSyncAt_meta TEXT,
      teamId_meta TEXT,
      UNIQUE(projectId, channelId)
    )
  `);

  // Slack derived tasks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slack_derived_tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      messageId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      assignedTo TEXT,
      dueDate TEXT,
      status TEXT NOT NULL CHECK (status IN ('suggested', 'accepted', 'rejected', 'completed')),
      confidence REAL DEFAULT 0.5,
      sourceContext TEXT, -- JSON object
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Slack conversation sync state table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slack_conversation_sync_state (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      lastProcessedTs TEXT NOT NULL,
      conversationCount INTEGER DEFAULT 0,
      lastSyncAt TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE,
      UNIQUE(projectId, channelId)
    )
  `);

  // Slack messages table  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slack_messages (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      text TEXT NOT NULL,
      user TEXT NOT NULL,
      username TEXT,
      timestamp TEXT NOT NULL,
      threadTs TEXT,
      reactions TEXT, -- JSON array
      files TEXT, -- JSON array
      edited TEXT,
      deleted TEXT,
      messageType TEXT DEFAULT 'message',
      subtype TEXT,
      UNIQUE(messageId, channelId)
    )
  `);

  // Check if migration is needed for existing databases
  try {
    // Check if slack_task_suggestions table exists
    const tables = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_task_suggestions'");
    if (tables.length === 0) {
      logDatabase('Creating slack_task_suggestions table...');
      await db.execute(`
        CREATE TABLE slack_task_suggestions (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          channelId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          confidence REAL NOT NULL,
          priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
          status TEXT NOT NULL CHECK (status IN ('pending_review', 'accepted', 'rejected')),
          sourceMessages TEXT NOT NULL, -- JSON array
          participants TEXT NOT NULL, -- JSON array
          createdAt TEXT NOT NULL,
          reviewedAt TEXT,
          reviewedBy TEXT,
          FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
        )
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_task_suggestions_project 
        ON slack_task_suggestions(projectId)
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_task_suggestions_status 
        ON slack_task_suggestions(status)
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_task_suggestions_channel 
        ON slack_task_suggestions(channelId)
      `);
    }

    // Check if slack_processed_messages table exists
    const processedMessagesTable = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_processed_messages'");
    if (processedMessagesTable.length === 0) {
      logDatabase('Creating slack_processed_messages table...');
      await db.execute(`
        CREATE TABLE slack_processed_messages (
          id TEXT PRIMARY KEY,
          messageId TEXT NOT NULL,
          channelId TEXT NOT NULL,
          processedAt TEXT NOT NULL,
          processingVersion TEXT NOT NULL,
          analysisResult TEXT, -- JSON object
          UNIQUE(messageId, processingVersion)
        )
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_processed_messages_channel 
        ON slack_processed_messages(channelId)
      `);
    }

    // Check if slack_background_sync_jobs table exists
    const backgroundJobsTable = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_background_sync_jobs'");
    if (backgroundJobsTable.length === 0) {
      logDatabase('Creating slack_background_sync_jobs table...');
      await db.execute(`
        CREATE TABLE slack_background_sync_jobs (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL,
          channelId TEXT NOT NULL,
          jobType TEXT NOT NULL,
          priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
          status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          metadata TEXT, -- JSON object
          scheduledFor TEXT,
          startedAt TEXT,
          completedAt TEXT,
          errorMessage TEXT,
          retryCount INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
        )
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_background_jobs_status 
        ON slack_background_sync_jobs(status)
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_slack_background_jobs_scheduled 
        ON slack_background_sync_jobs(scheduledFor)
      `);
    }

    // Check if slack_manual_disconnections table exists
    const manualDisconnectionsTable = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_manual_disconnections'");
    if (manualDisconnectionsTable.length === 0) {
      logDatabase('Creating slack_manual_disconnections table...');
      await db.execute(`
        CREATE TABLE slack_manual_disconnections (
          projectId TEXT NOT NULL,
          channelId TEXT NOT NULL,
          disconnectedAt TEXT NOT NULL,
          reason TEXT,
          PRIMARY KEY (projectId, channelId)
        )
      `);
    }




  } catch (error) {
    console.error('Error during database migration:', error);
  }

  // Create indexes for better performance
  await db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_events_project ON events(projectId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(projectId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(projectId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_slack_sync_project ON slack_sync_metadata(projectId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_slack_messages_channel ON slack_messages(channelId)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_slack_messages_timestamp ON slack_messages(timestamp)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_slack_derived_tasks_project ON slack_derived_tasks(projectId)');
}
export async function runDatabaseCleanup(): Promise<void> {
  try {
    logDatabase('Database: Running cleanup operations...');
    // Basic cleanup - remove orphaned records
    if (!db) db = await initDatabase();
    await db.execute('DELETE FROM slack_derived_tasks WHERE projectId NOT IN (SELECT id FROM projects)');
    await db.execute('DELETE FROM slack_sync_metadata WHERE projectId NOT IN (SELECT id FROM projects)');
    logDatabase('Database: Cleanup completed successfully');
  } catch (error) {
    console.warn('⚠️ [Database] Cleanup failed:', error);
  }
}

// Add basic services that were in database-services.ts

// Project Service
export class ProjectService {
  static async getAll(): Promise<Project[]> {
    if (!db) db = await initDatabase();
    return executeDbOperation(async () => {
      const projects = await db!.select<Project[]>('SELECT * FROM projects ORDER BY updatedAt DESC');
      return projects.map(project => ({
        ...project,
        isNextUp: !!project.isNextUp,
        aiAnalysis: project.aiAnalysis ? JSON.parse(project.aiAnalysis as string) : undefined,
      }));
    });
  }

  static async getById(id: string): Promise<Project | null> {
    if (!db) db = await initDatabase();
    return executeDbOperation(async () => {
      const projects = await db!.select<Project[]>('SELECT * FROM projects WHERE id = ?', [id]);
      if (projects.length === 0) return null;
      const project = projects[0];
      return {
        ...project,
        isNextUp: !!project.isNextUp,
        aiAnalysis: project.aiAnalysis ? JSON.parse(project.aiAnalysis as string) : undefined,
      };
    });
  }

  static async create(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (!db) db = await initDatabase();
    return executeDbOperation(async () => {
      const now = new Date().toISOString();
      const projectWithTimestamps = {
        ...project,
        createdAt: now,
        updatedAt: now,
      };

      await db!.execute(
        `INSERT INTO projects (
          id, name, description, status, isNextUp, archiveReason, archivedAt,
          strategicGoal, lastReviewedAt, aiAnalysis, slackChannelUrl,
          createdAt, updatedAt, syncStatus, lastSyncAt, teamId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectWithTimestamps.id,
          projectWithTimestamps.name,
          projectWithTimestamps.description,
          projectWithTimestamps.status,
          projectWithTimestamps.isNextUp ? 1 : 0,
          projectWithTimestamps.archiveReason || null,
          projectWithTimestamps.archivedAt || null,
          projectWithTimestamps.strategicGoal || null,
          projectWithTimestamps.lastReviewedAt || null,
          projectWithTimestamps.aiAnalysis ? JSON.stringify(projectWithTimestamps.aiAnalysis) : null,
          projectWithTimestamps.slackChannelUrl || null,
          projectWithTimestamps.createdAt,
          projectWithTimestamps.updatedAt,
          projectWithTimestamps.syncStatus || 'local',
          projectWithTimestamps.lastSyncAt || null,
          projectWithTimestamps.teamId || null,
        ]
      );

      return projectWithTimestamps;
    });
  }

  static async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (!db) db = await initDatabase();
    return executeDbOperation(async () => {
      const now = new Date().toISOString();
      const updatesWithTimestamp = { ...updates, updatedAt: now };

      const setClause = Object.keys(updatesWithTimestamp)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.entries(updatesWithTimestamp).map(([key, value]) => {
        if (key === 'aiAnalysis' && value) {
          return JSON.stringify(value);
        }
        if (key === 'isNextUp') {
          return value ? 1 : 0;
        }
        return value;
      });

      await db!.execute(
        `UPDATE projects SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      const updated = await ProjectService.getById(id);
      if (!updated) throw new Error('Project not found after update');
      return updated;
    });
  }

  static async delete(id: string): Promise<void> {
    if (!db) db = await initDatabase();
    return executeDbOperation(async () => {
      console.log(`🗑️ Starting cascading deletion for project ${id}`);
      
      // 1. Disable Slack channels first (before deletion to avoid foreign key issues)
      try {
        const { SlackSyncService } = await import('../modules/slack/services/SlackSyncService');
        const disabledCount = await SlackSyncService.disableChannelsForProject(id);
        if (disabledCount > 0) {
          console.log(`🔌 Disabled ${disabledCount} Slack channels for project ${id}`);
        }
      } catch (error) {
        console.error('⚠️ Error disabling Slack channels during project deletion:', error);
        // Continue with deletion even if Slack cleanup fails
      }
      
      // 2. Clean up slack_sync_metadata (no CASCADE constraint)
      try {
        await db!.execute('DELETE FROM slack_sync_metadata WHERE projectId = ?', [id]);
        console.log(`🧹 Cleaned up slack_sync_metadata for project ${id}`);
      } catch (error) {
        console.error('⚠️ Error cleaning slack_sync_metadata:', error);
      }
      
      // 3. Clean up orphaned slack_messages for disconnected channels
      try {
        // Get channel IDs that were connected to this project
        const channelIds = await db!.select<{channelId: string}[]>(
          'SELECT DISTINCT channelId FROM project_slack_connections WHERE project_id = ?',
          [id]
        );
        
        // Delete messages for these channels
        for (const {channelId} of channelIds) {
          await db!.execute('DELETE FROM slack_messages WHERE channelId = ?', [channelId]);
        }
        
        if (channelIds.length > 0) {
          console.log(`🧹 Cleaned up slack_messages for ${channelIds.length} channels`);
        }
      } catch (error) {
        console.error('⚠️ Error cleaning slack_messages:', error);
      }
      
      // 4. Delete the project (this will CASCADE delete most related entities)
      await db!.execute('DELETE FROM projects WHERE id = ?', [id]);
      
      console.log(`✅ Successfully deleted project ${id} and all related data`);
    });
  }
}

// Project check-ins service (kept here as it's small and not used frequently)
export class ProjectCheckInService {
  static async getByProjectId(projectId: string): Promise<ProjectCheckIn[]> {
    if (!db) db = await initDatabase();
    const result = await db!.select<ProjectCheckIn[]>(
      'SELECT * FROM project_checkins WHERE projectId = ? ORDER BY timestamp DESC',
      [projectId]
    );
    return result.map(checkIn => ({
      ...checkIn,
      blockers: checkIn.blockers ? JSON.parse(checkIn.blockers as string) : [],
      achievements: checkIn.achievements ? JSON.parse(checkIn.achievements as string) : [],
      nextSteps: checkIn.nextSteps ? JSON.parse(checkIn.nextSteps as string) : [],
    }));
  }

  static async create(checkIn: Omit<ProjectCheckIn, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectCheckIn> {
    if (!db) db = await initDatabase();
    const now = new Date().toISOString();
    const checkInToInsert = {
      ...checkIn,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local' as const,
      lastSyncAt: undefined,
      teamId: undefined,
    };

    const result = await db!.execute(
      `INSERT INTO project_checkins (
        projectId, timestamp, content, mood, blockers, achievements, 
        nextSteps, createdAt, updatedAt, syncStatus, lastSyncAt, teamId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checkInToInsert.projectId,
        checkInToInsert.timestamp,
        checkInToInsert.content,
        checkInToInsert.mood || null,
        checkInToInsert.blockers ? JSON.stringify(checkInToInsert.blockers) : null,
        checkInToInsert.achievements ? JSON.stringify(checkInToInsert.achievements) : null,
        checkInToInsert.nextSteps ? JSON.stringify(checkInToInsert.nextSteps) : null,
        checkInToInsert.createdAt,
        checkInToInsert.updatedAt,
        checkInToInsert.syncStatus,
        checkInToInsert.lastSyncAt || null,
        checkInToInsert.teamId || null,
      ]
    );

    return {
        ...checkInToInsert,
        id: result.lastInsertId?.toString() || '',
    };
  }

  static async delete(id: string): Promise<void> {
    if (!db) db = await initDatabase();
    await db!.execute('DELETE FROM project_checkins WHERE id = ?', [id]);
  }
}

