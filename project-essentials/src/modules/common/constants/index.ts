// Application constants
export const APP_CONFIG = {
  // Performance
  MAX_COMPONENT_LINES: 200,
  MAX_HOOK_LINES: 100,
  MAX_SERVICE_LINES: 150,
  
  // Caching
  DEFAULT_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  // UI
  MODAL_Z_INDEX: 50,
  TOAST_Z_INDEX: 100,
  
  // Database
  MAX_RETRY_ATTEMPTS: 3,
  OPERATION_TIMEOUT: 60000, // 60 seconds
} as const;

// File naming patterns
export const NAMING_PATTERNS = {
  COMPONENT: /^[A-Z][a-zA-Z0-9]*\.tsx?$/,
  HOOK: /^use[A-Z][a-zA-Z0-9]*\.tsx?$/,
  SERVICE: /^[A-Z][a-zA-Z0-9]*Service\.tsx?$/,
  TYPE: /^[a-z][a-zA-Z0-9]*\.types\.tsx?$/,
  CONSTANT: /^[A-Z][A-Z0-9_]*\.tsx?$/,
} as const;

// Module structure validation
export const MODULE_STRUCTURE = {
  REQUIRED_FOLDERS: ['components', 'hooks', 'types', 'services'],
  REQUIRED_FILES: ['index.ts'],
  MAX_FILES_PER_FOLDER: 20,
} as const;