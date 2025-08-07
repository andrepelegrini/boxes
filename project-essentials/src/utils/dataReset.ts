import { cacheService } from '../modules/common/services/CacheService';

/**
 * Comprehensive data reset utility
 * Clears all application data to return to fresh user state
 */
export class DataResetService {
  private static log() {
    // System logs removed for cleaner console
  }
  private static readonly LOCAL_STORAGE_KEYS = [
    // Core data
    'projects_v2', 'tasks_v2', 'events_v2', 'documents_v2', 'activityLogs_v2', 'projectCheckIns',
    // Legacy data
    'projects', 'tasks', 'events', 'documents', 'activityLogs',
    // User settings
    'user_max_active_projects', 'user_team_capacity', 'userMaxActiveProjects', 'userTeamCapacity',
    // AI integration
    'gemini_api_key', 'ai_rate_limit_state', 'ai_analysis_cache',
    // Slack integration
    'slack_credentials_simple', 'slackAccessToken', 'slackTeamId', 'slackTeamName', 'slackUserId', 'slackUserEmail',
    'slack_workspace_id', 'slack_workspace_name', 'slack_bot_user_id', 'slack_app_id',
    // Slack WebSocket
    'slack-websocket-config', 'slack-websocket-connected', 'slack-websocket-team', 'slack-websocket-user', 
    'slack-websocket-last-connected', 'slack-websocket-state', 'slack-websocket-error-count',
    // Slack sync and channels
    'slack-sync-metadata', 'slack-channel-connections', 'slack-message-cache', 'slack-task-suggestions',
    'slack-auto-sync-config', 'slack-notification-preferences',
    // Other state
    'slack-private-channel-invitations', 'currentUser', 'hasSeenProgressiveOnboarding', 'dismissedHints', 
    'completedMilestones', 'data_migrated_to_sqlite', 'migration_skipped', 'debug_mode', 'app_errors', 'app_logs',
    'onboarding_completed', 'user_preferences', 'ui_state', 'last_sync_timestamp',
    // Services
    'project_templates_v1', 'project_template_analytics_v1', 'smart_onboarding_state',
    // Cache and performance
    'performance_metrics', 'cache_version', 'last_cleanup_timestamp'
  ];

  /**
   * Resets all application data to fresh state
   * @returns Promise resolving to success status
   */
  static async resetAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      DataResetService.log('🔄 [DataResetService] Starting complete data reset...');
      DataResetService.log(`📊 [DataResetService] Pre-reset data analysis: ${JSON.stringify(this.getDataSize())}`);
      
      // 1. Clear localStorage completely
      DataResetService.log('🧹 [DataResetService] Step 1: Clearing localStorage...');
      await this.clearLocalStorage();
      
      // 2. Clear SQLite database
      DataResetService.log('🗄️ [DataResetService] Step 2: Clearing SQLite database...');
      await this.clearDatabase();
      
      // 3. Clear in-memory cache
      DataResetService.log('💾 [DataResetService] Step 3: Clearing in-memory cache...');
      this.clearCache();
      
      // 4. Clear sessionStorage
      DataResetService.log('🔄 [DataResetService] Step 4: Clearing sessionStorage...');
      this.clearSessionStorage();
      
      // 5. Clear all localStorage (comprehensive approach)
      DataResetService.log('🧹 [DataResetService] Step 5: Comprehensive localStorage clear...');
      try {
        localStorage.clear();
        DataResetService.log('✅ [DataResetService] All localStorage cleared completely');
      } catch (error) {
        console.warn('⚠️ [DataResetService] Failed to clear all localStorage:', error);
      }
      
      // 6. Clear any remaining browser storage
      DataResetService.log('🗂️ [DataResetService] Step 6: Clearing browser storage...');
      if ('indexedDB' in window) {
        try {
          // Clear IndexedDB if used
          const databases = await indexedDB.databases();
          DataResetService.log(`🔍 [DataResetService] Found ${databases.length} IndexedDB databases to clear`);
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                DataResetService.log(`🗑️ [DataResetService] Deleting IndexedDB: ${db.name}`);
                return new Promise<void>((resolve) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                  deleteReq.onsuccess = () => {
                    DataResetService.log(`✅ [DataResetService] IndexedDB ${db.name} deleted successfully`);
                    resolve();
                  };
                  deleteReq.onerror = () => {
                    console.warn(`⚠️ [DataResetService] Failed to delete IndexedDB ${db.name}`);
                    resolve(); // Continue even if fails
                  };
                });
              }
              return Promise.resolve();
            })
          );
          DataResetService.log('✅ [DataResetService] IndexedDB cleared');
        } catch (error) {
          console.warn('⚠️ [DataResetService] IndexedDB clear failed:', error);
        }
      }
      
      // 7. Final verification
      DataResetService.log('🔍 [DataResetService] Step 7: Post-reset verification...');
      const postResetSize = this.getDataSize();
      DataResetService.log(`📊 [DataResetService] Post-reset data analysis: ${JSON.stringify(postResetSize)}`);
      
      if (postResetSize.keys.length > 0) {
        console.warn('⚠️ [DataResetService] Some data may remain after reset:', postResetSize.keys);
      }
      
      DataResetService.log('✅ [DataResetService] Data reset completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ [DataResetService] Data reset failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during reset'
      };
    }
  }

  /**
   * Clears all localStorage data
   */
  private static async clearLocalStorage(): Promise<void> {
    DataResetService.log('🧹 [DataResetService] Clearing localStorage...');
    
    let removedCount = 0;
    let failedCount = 0;
    
    // Clear specific keys
    this.LOCAL_STORAGE_KEYS.forEach(key => {
      try {
        const existsBefore = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (existsBefore) {
          DataResetService.log(`  ✓ [DataResetService] Removed: ${key}`);
          removedCount++;
        } else {
          DataResetService.log(`  • [DataResetService] Key not found: ${key}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ [DataResetService] Failed to remove ${key}:`, error);
        failedCount++;
      }
    });
    
    DataResetService.log(`✅ [DataResetService] localStorage cleared - Removed: ${removedCount}, Failed: ${failedCount}, Total attempted: ${this.LOCAL_STORAGE_KEYS.length}`);
  }

  /**
   * Clears SQLite database
   */
  private static async clearDatabase(): Promise<void> {
    DataResetService.log('🗄️ [DataResetService] Clearing SQLite database...');
    
    try {
      // Check if Tauri is available
      if (typeof window !== 'undefined' && (window as any).__TAURI__?.tauri?.invoke) {
        DataResetService.log('🔍 [DataResetService] Tauri environment detected, attempting database reset...');
        try {
          // Drop and recreate database tables
          const result = await (window as any).__TAURI__.tauri.invoke('reset_database');
          DataResetService.log(`✅ [DataResetService] SQLite database reset via Tauri: ${JSON.stringify(result)}`);
          
          // Also clear database-related localStorage keys
          const dbKeys = [
            'data_migrated_to_sqlite', 'migration_skipped'
          ];
          let dbKeysCleared = 0;
          dbKeys.forEach(key => {
            const existed = localStorage.getItem(key) !== null;
            localStorage.removeItem(key);
            if (existed) {
              DataResetService.log(`  ✓ [DataResetService] Removed database key: ${key}`);
              dbKeysCleared++;
            } else {
              DataResetService.log(`  • [DataResetService] Database key not found: ${key}`);
            }
          });
          DataResetService.log(`✅ [DataResetService] Database-related localStorage keys cleared: ${dbKeysCleared}/${dbKeys.length}`);
        } catch (invokeError: any) {
          console.warn('⚠️ [DataResetService] Tauri database reset command failed:', invokeError);
          // If Tauri command fails, still clear the localStorage keys
          const dbKeys = [
            'data_migrated_to_sqlite', 'migration_skipped'
          ];
          let dbKeysCleared = 0;
          dbKeys.forEach(key => {
            const existed = localStorage.getItem(key) !== null;
            localStorage.removeItem(key);
            if (existed) {
              DataResetService.log(`  ✓ [DataResetService] Removed database key: ${key}`);
              dbKeysCleared++;
            }
          });
          DataResetService.log(`✅ [DataResetService] Cleared database-related localStorage keys as fallback: ${dbKeysCleared}/${dbKeys.length}`);
        }
      } else {
        DataResetService.log('⚠️ [DataResetService] Tauri not available, clearing database-related localStorage keys only');
        // Clear database-related localStorage keys
        const dbKeys = [
          'data_migrated_to_sqlite', 'migration_skipped'
        ];
        let dbKeysCleared = 0;
        dbKeys.forEach(key => {
          const existed = localStorage.getItem(key) !== null;
          localStorage.removeItem(key);
          if (existed) {
            DataResetService.log(`  ✓ [DataResetService] Removed database key: ${key}`);
            dbKeysCleared++;
          }
        });
        DataResetService.log(`✅ [DataResetService] Database-related localStorage keys cleared: ${dbKeysCleared}/${dbKeys.length}`);
      }
    } catch (error) {
      console.warn('⚠️ [DataResetService] Database reset failed:', error);
      // Don't throw error - continue with other cleanup
    }
  }

  /**
   * Clears in-memory cache
   */
  private static clearCache(): void {
    DataResetService.log('💾 [DataResetService] Clearing in-memory cache...');
    
    try {
      const cacheInfo = cacheService.getCacheInfo?.() || { size: 'unknown', entries: 'unknown' };
      DataResetService.log(`🔍 [DataResetService] Cache info before clear: ${JSON.stringify(cacheInfo)}`);
      
      cacheService.clear();
      DataResetService.log('✅ [DataResetService] In-memory cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ [DataResetService] Cache clear failed:', error);
    }
  }

  /**
   * Clears sessionStorage
   */
  private static clearSessionStorage(): void {
    DataResetService.log('🔄 [DataResetService] Clearing sessionStorage...');
    
    try {
      const sessionStorageSize = sessionStorage.length;
      DataResetService.log(`🔍 [DataResetService] sessionStorage has ${sessionStorageSize} items before clear`);
      
      sessionStorage.clear();
      
      const sessionStorageSizeAfter = sessionStorage.length;
      DataResetService.log(`✅ [DataResetService] sessionStorage cleared - Items before: ${sessionStorageSize}, after: ${sessionStorageSizeAfter}`);
    } catch (error) {
      console.warn('⚠️ [DataResetService] sessionStorage clear failed:', error);
    }
  }

  /**
   * Partial reset - only clears specific data types
   */
  static async resetPartialData(dataTypes: ('projects' | 'tasks' | 'slack' | 'settings' | 'ai')[]): Promise<{ success: boolean; error?: string }> {
    try {
      DataResetService.log(`🔄 [DataResetService] Starting partial data reset for: ${JSON.stringify(dataTypes)}`);
      DataResetService.log(`📊 [DataResetService] Pre-partial-reset data analysis: ${JSON.stringify(this.getDataSize())}`);
      
      const keysToRemove: string[] = [];
      
      dataTypes.forEach(type => {
        DataResetService.log(`🔍 [DataResetService] Processing data type: ${type}`);
        switch (type) {
          case 'projects':
            keysToRemove.push('projects_v2', 'projects', 'events_v2', 'events', 'documents_v2', 'documents');
            DataResetService.log(`  📦 [DataResetService] Added ${6} project-related keys`);
            break;
          case 'tasks':
            keysToRemove.push('tasks_v2', 'tasks', 'activityLogs_v2', 'activityLogs');
            DataResetService.log(`  ✅ [DataResetService] Added ${4} task-related keys`);
            break;
          case 'slack':
            const slackKeys = [
              'slack_credentials_simple', 'slackAccessToken', 'slackTeamId', 'slackTeamName', 
              'slackUserId', 'slackUserEmail', 'slack_workspace_id', 'slack_workspace_name', 
              'slack_bot_user_id', 'slack_app_id', 'slack-websocket-config', 'slack-websocket-connected',
              'slack-websocket-team', 'slack-websocket-user', 'slack-websocket-last-connected',
              'slack-websocket-state', 'slack-websocket-error-count', 'slack-private-channel-invitations',
              'slack-sync-metadata', 'slack-channel-connections', 'slack-message-cache', 
              'slack-task-suggestions', 'slack-auto-sync-config', 'slack-notification-preferences'
            ];
            keysToRemove.push(...slackKeys);
            DataResetService.log(`  💬 [DataResetService] Added ${slackKeys.length} Slack-related keys`);
            break;
          case 'settings':
            const settingsKeys = [
              'user_max_active_projects', 'user_team_capacity', 'userMaxActiveProjects', 'userTeamCapacity',
              'user_preferences', 'ui_state', 'onboarding_completed', 'hasSeenProgressiveOnboarding',
              'dismissedHints', 'completedMilestones'
            ];
            keysToRemove.push(...settingsKeys);
            DataResetService.log(`  ⚙️ [DataResetService] Added ${settingsKeys.length} settings-related keys`);
            break;
          case 'ai':
            keysToRemove.push('gemini_api_key', 'ai_rate_limit_state', 'ai_analysis_cache');
            DataResetService.log(`  🤖 [DataResetService] Added ${3} AI-related keys`);
            break;
        }
      });
      
      DataResetService.log(`🗑️ [DataResetService] Total keys to remove: ${keysToRemove.length}`);
      
      let removedCount = 0;
      let notFoundCount = 0;
      
      keysToRemove.forEach(key => {
        const existed = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (existed) {
          DataResetService.log(`  ✓ [DataResetService] Removed: ${key}`);
          removedCount++;
        } else {
          DataResetService.log(`  • [DataResetService] Key not found: ${key}`);
          notFoundCount++;
        }
      });
      
      DataResetService.log(`✅ [DataResetService] Partial data reset completed - Removed: ${removedCount}, Not found: ${notFoundCount}, Total attempted: ${keysToRemove.length}`);
      DataResetService.log(`📊 [DataResetService] Post-partial-reset data analysis: ${JSON.stringify(this.getDataSize())}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ [DataResetService] Partial data reset failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during partial reset'
      };
    }
  }

  /**
   * Get current data size (for informational purposes)
   */
  static getDataSize(): { localStorage: number; keys: string[]; details: { [key: string]: number } } {
    let totalSize = 0;
    const keys: string[] = [];
    const details: { [key: string]: number } = {};
    
    this.LOCAL_STORAGE_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const size = value.length;
        totalSize += size;
        keys.push(key);
        details[key] = size;
      }
    });
    
    return { localStorage: totalSize, keys, details };
  }

  /**
   * Get comprehensive storage information including unknown keys
   */
  static getStorageAnalysis(): { 
    tracked: { localStorage: number; keys: string[]; details: { [key: string]: number } };
    unknown: { localStorage: number; keys: string[]; details: { [key: string]: number } };
    total: { localStorage: number; keys: string[] };
  } {
    const tracked = this.getDataSize();
    
    // Find keys that exist in localStorage but aren't in our tracked list
    const unknownKeys: string[] = [];
    const unknownDetails: { [key: string]: number } = {};
    let unknownSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !this.LOCAL_STORAGE_KEYS.includes(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length;
          unknownKeys.push(key);
          unknownDetails[key] = size;
          unknownSize += size;
        }
      }
    }
    
    return {
      tracked,
      unknown: { localStorage: unknownSize, keys: unknownKeys, details: unknownDetails },
      total: { 
        localStorage: tracked.localStorage + unknownSize, 
        keys: [...tracked.keys, ...unknownKeys] 
      }
    };
  }
}

// Export convenience functions
export const resetAllData = DataResetService.resetAllData.bind(DataResetService);
export const resetPartialData = DataResetService.resetPartialData.bind(DataResetService);
export const getDataSize = DataResetService.getDataSize.bind(DataResetService);
export const getStorageAnalysis = DataResetService.getStorageAnalysis.bind(DataResetService);

// Export the service class as default
export default DataResetService;