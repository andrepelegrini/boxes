import path from 'path';
import { defineConfig } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    return {
      // Fix for Tauri app white screen - ensure proper base for file:// protocol
      base: mode === 'production' ? './' : '/',
      clearScreen: false,
      // Environment variables for Tauri
      envPrefix: ['VITE_', 'TAURI_'],
      test: {
        // Exclude e2e tests from vitest (they should use playwright)
        exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/tests/setup.ts'],
      },
      plugins: [
        react(),
        // Bundle analyzer - generates stats.html after build
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        })
      ],
      css: {
        postcss: path.resolve(__dirname, 'postcss.config.js'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
        }
      },
      build: {
        // Tauri production build configuration
        target: 'esnext',
        minify: process.env.TAURI_DEBUG ? false : 'esbuild',
        sourcemap: !!process.env.TAURI_DEBUG,
        // Enable detailed chunk analysis and tree shaking optimization
        rollupOptions: {
          onwarn(warning, warn) {
            // Suppress "use client" directive warnings from Radix UI and other client-side libraries
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message?.includes('"use client"')) {
              return;
            }
            warn(warning);
          },
          // Tree shaking configuration disabled for debugging
          external: ['@tauri-apps/api/tauri', '@tauri-apps/api/event'],
          output: {
            manualChunks: (id) => {
              // Unified components chunk
              if (id.includes('components/SlackUnifiedIntegration') ||
                  id.includes('components/ModalUnified') ||
                  id.includes('components/DashboardLayoutUnified') ||
                  id.includes('components/CreateProjectWizardUnified') ||
                  id.includes('components/ProjectCardUnified') ||
                  id.includes('contexts/SlackGlobalContext') ||
                  id.includes('contexts/SimplifiedRootProvider')) {
                return 'unified-components';
              }
              
              // Vendor chunks
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                  return 'vendor-react';
                }
                if (id.includes('@radix-ui')) {
                  return 'vendor-ui';
                }
                if (id.includes('react-icons')) {
                  return 'vendor-icons';
                }
                if (id.includes('@google/generative-ai')) {
                  return 'vendor-ai';
                }
                if (id.includes('@tauri-apps')) {
                  return 'vendor-tauri';
                }
                if (id.includes('react-markdown') || id.includes('remark-gfm')) {
                  return 'vendor-markdown';
                }
                return 'vendor-other';
              }
              
              // Types chunk
              if (id.includes('types/unified-components') || id.includes('types/index')) {
                return 'types';
              }
              
              // Debug and testing utilities
              if (id.includes('debug-') || id.includes('test-') || id.includes('scripts/')) {
                return 'dev-tools';
              }
              
              // Default case
              return undefined;
            }
          }
        },
        // Set chunk size warning limit
        chunkSizeWarningLimit: 1000,
      },
      server: {
        // Use HTTP for main app to avoid IPC issues, HTTPS only for OAuth callback
        host: 'localhost',
        port: 5173,
        strictPort: true,
        // Configure both HTTP and HTTPS endpoints
        ...(process.env.VITE_FORCE_HTTPS ? {
          https: {
            key: fs.readFileSync(path.resolve(__dirname, '../config/localhost+2-key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, '../config/localhost+2.pem')),
          }
        } : {})
      },
      // Prevent vite from obscuring rust errors
      logLevel: 'info'
    };
});
