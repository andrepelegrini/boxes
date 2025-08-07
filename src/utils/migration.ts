import { initDatabase, ProjectService } from './database';
import { 
  Project, 
  Task
} from '../../types';

interface MigrationResult {
  success: boolean;
  errors: string[];
  migratedCounts: {
    projects: number;
    tasks: number;
    events: number;
    documents: number;
    activityLogs: number;
    checkIns: number;
    users: number;
    settings: number;
  };
}

export class DataMigrationService {
  /**
   * Checks if data migration is needed by looking for localStorage data
   */
  static async isMigrationNeeded(): Promise<boolean> {
    // Check if we have any data in localStorage
    const hasLocalStorageData = 
      localStorage.getItem('projects') !== null ||
      localStorage.getItem('tasks') !== null ||
      localStorage.getItem('events') !== null ||
      localStorage.getItem('documents') !== null ||
      localStorage.getItem('activityLogs') !== null ||
      localStorage.getItem('projectCheckIns') !== null;

    if (!hasLocalStorageData) return false;

    // Check if SQLite database is empty
    try {
      await initDatabase();
      const projects = await ProjectService.getAll();
      return projects.length === 0; // Only migrate if SQLite is empty
    } catch (error) {
      console.error('Error checking SQLite database:', error);
      return false;
    }
  }

  /**
   * Performs a one-time migration from localStorage to SQLite
   */
  static async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      errors: [],
      migratedCounts: {
        projects: 0,
        tasks: 0,
        events: 0,
        documents: 0,
        activityLogs: 0,
        checkIns: 0,
        users: 0,
        settings: 0,
      },
    };

    try {
      await initDatabase();

      // Migrate Projects
      const projectsData = localStorage.getItem('projects');
      if (projectsData) {
        try {
          const projects: Project[] = JSON.parse(projectsData);
          for (const project of projects) {
            try {
              await ProjectService.create(project);
              result.migratedCounts.projects++;
            } catch (error) {
              result.errors.push(`Failed to migrate project ${project.id}: ${error}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to parse projects data: ${error}`);
        }
      }

      // Migrate Tasks
      const tasksData = localStorage.getItem('tasks');
      if (tasksData) {
        try {
          const tasks: Task[] = JSON.parse(tasksData);
          for (const task of tasks) {
            try {
              await TaskService.create(task);
              result.migratedCounts.tasks++;
            } catch (error) {
              result.errors.push(`Failed to migrate task ${task.id}: ${error}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to parse tasks data: ${error}`);
        }
      }

      // Events and documents are handled through their respective services
      // EventService and DocumentService in database.ts provide full CRUD operations

      // Migrate User Settings
      const userSettings = {
        userMaxActiveProjects: localStorage.getItem('userMaxActiveProjects'),
        userTeamCapacity: localStorage.getItem('userTeamCapacity'),
        gemini_api_key: localStorage.getItem('gemini_api_key'),
        slackAccessToken: localStorage.getItem('slackAccessToken'),
        slackTeamId: localStorage.getItem('slackTeamId'),
        slackTeamName: localStorage.getItem('slackTeamName'),
        slackUserId: localStorage.getItem('slackUserId'),
        slackUserEmail: localStorage.getItem('slackUserEmail'),
      };

      for (const [key, value] of Object.entries(userSettings)) {
        if (value !== null) {
          try {
            await this.saveSetting(key, value);
            result.migratedCounts.settings++;
          } catch (error) {
            result.errors.push(`Failed to migrate setting ${key}: ${error}`);
          }
        }
      }

      // Migrate current user
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        try {
          const user: User = JSON.parse(currentUserData);
          await this.saveUser(user);
          result.migratedCounts.users++;
        } catch (error) {
          result.errors.push(`Failed to migrate user data: ${error}`);
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.success = false;
      result.errors.push(`Fatal migration error: ${error}`);
    }

    return result;
  }

  /**
   * Backs up localStorage data before migration
   */
  static backupLocalStorage(): void {
    const backup: Record<string, any> = {};
    
    const keysToBackup = [
      'projects', 'tasks', 'events', 'documents', 
      'activityLogs', 'projectCheckIns', 'currentUser',
      'userMaxActiveProjects', 'userTeamCapacity', 
      'gemini_api_key', 'slackAccessToken', 'slackTeamId',
      'slackTeamName', 'slackUserId', 'slackUserEmail'
    ];

    keysToBackup.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup[key] = value;
      }
    });

    const backupJson = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `project-boxes-backup-${timestamp}.json`;

    // Create download link
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clears localStorage after successful migration
   */
  static clearLocalStorage(): void {
    const keysToRemove = [
      'projects', 'tasks', 'events', 'documents', 
      'activityLogs', 'projectCheckIns'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Keep authentication and settings in localStorage for now
    // These will be moved to SQLite settings table
  }

  // Helper methods for saving to SQLite
  private static async saveSetting(key: string, value: string): Promise<void> {
    const db = await initDatabase();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, updatedAt, syncStatus) 
       VALUES (?, ?, ?, 'local')`,
      [key, value, new Date().toISOString()]
    );
  }

  private static async saveUser(user: User): Promise<void> {
    const db = await initDatabase();
    await db.execute(
      `INSERT OR REPLACE INTO users (id, name, email, picture, isAdmin, createdAt, updatedAt, syncStatus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'local')`,
      [
        user.id, 
        user.name, 
        user.email, 
        user.picture || null,
        user.isAdmin ? 1 : 0,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  }
}