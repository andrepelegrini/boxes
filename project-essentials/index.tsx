import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import { SimplifiedRootProvider } from './src/contexts/SimplifiedRootProvider';
import { isTauri } from './src/utils/tauri';
import './index.css';

console.log('🔵 [APP] Starting React app...');

// Check if we're running in Tauri environment using proper detection
const checkTauriEnvironment = () => {
  const isInTauri = isTauri();
  console.log('🔍 [APP] Tauri environment check:', {
    isTauri: isInTauri,
    protocol: window.location.protocol,
    userAgent: navigator.userAgent.includes('Tauri'),
    hasInternals: !!(window as any).__TAURI_INTERNALS__
  });
  
  if (isInTauri) {
    console.log('✅ [APP] Running in Tauri desktop app');
  } else {
    console.log('🌐 [APP] Running in browser mode');
  }
  
  return isInTauri;
};

const root = document.getElementById('root');
if (root) {
  const reactRoot = ReactDOM.createRoot(root);
  
  // Check Tauri environment and render App
  const isInTauri = checkTauriEnvironment();
  console.log('🔵 [APP] Rendering React app...');
  
  reactRoot.render(
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SimplifiedRootProvider>
        <App />
      </SimplifiedRootProvider>
    </HashRouter>
  );
  
  console.log('✅ [APP] React app rendered successfully');
  
  // Signal successful module load
  (window as any).moduleLoaded = true;
  clearTimeout((window as any).moduleLoadTimeout);
} else {
  console.error('❌ [APP] Root element not found');
}