// Safe Tauri wrapper that works in all environments
// Simple logging helper
const logTauri = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🦀 [Tauri] ${message}`, ...args);
  }
};

let tauriInvoke: any = null;
let tauriListen: any = null;
let tauriInitialized = false;


// Check if we're in a Tauri environment
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window || 
         window.location.protocol === 'tauri:' ||
         navigator.userAgent.includes('Tauri') ||
         // Force Tauri mode if Tauri globals are available
         (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__);
};

// Initialize Tauri if available (only when actually needed)
const initTauri = async (): Promise<boolean> => {
  if (tauriInitialized) return !!tauriInvoke;
  
  try {
    // Always try to load Tauri first, regardless of detection
    const tauriModule = await import(/* webpackIgnore: true */ '@tauri-apps/api/core');
    const eventModule = await import(/* webpackIgnore: true */ '@tauri-apps/api/event');
    
    tauriInvoke = tauriModule.invoke;
    tauriListen = eventModule.listen;
    
    tauriInitialized = true;
    logTauri('Tauri API initialized successfully');
    return !!tauriInvoke;
  } catch (error) {
    if (!tauriInitialized) {
      console.warn('⚠️ Tauri API not available, will use mock fallbacks for unhandled commands:', error);
    }
    tauriInitialized = true;
    return false;
  }
};

// Real Tauri invoke function - with internals check
export const invoke = async (command: string, args?: Record<string, any>): Promise<any> => {
  const hasRealTauri = await initTauri();
  
  if (!hasRealTauri || !tauriInvoke) {
    const error = new Error(`Tauri API not available - cannot execute command: ${command}`);
    console.error(`❌ [NO_TAURI] ${command} failed:`, error);
    throw error;
  }
  
  // Check if Tauri internals are ready
  if (!window.__TAURI_INTERNALS__ || !window.__TAURI_INTERNALS__.invoke) {
    const error = new Error(`Tauri internals not ready - cannot execute command: ${command}`);
    console.error(`❌ [TAURI_INTERNALS] ${command} failed:`, error);
    throw error;
  }
  
  try {
    logTauri(`Tauri command: ${command}`, args);
    return await tauriInvoke(command, args);
  } catch (error) {
    console.error(`❌ [TAURI] ${command} failed:`, error);
    throw error;
  }
};

// Real Tauri listen function - NO MOCKS
export const listen = async (event: string, handler: (event: any) => void): Promise<any> => {
  const hasRealTauri = await initTauri();
  
  if (hasRealTauri && tauriListen) {
    try {
      logTauri(`Tauri listening to event: ${event}`);
      return await tauriListen(event, handler);
    } catch (error) {
      console.error(`❌ [TAURI] Listen failed for ${event}:`, error);
      throw error;
    }
  } else {
    // NO MOCKS - throw error if Tauri is not available
    const error = new Error(`Tauri API not available - cannot listen to event: ${event}`);
    console.error(`❌ [NO_TAURI] Listen failed for ${event}:`, error);
    throw error;
  }
};

// Get environment info
export const getTauriState = () => ({
  isInitialized: tauriInitialized,
  isTauriEnvironment: isTauri(),
  hasRealTauri: !!tauriInvoke
});

