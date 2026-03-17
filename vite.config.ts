import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from "lovable-tagger";

/**
 * Vite Configuration - Production Ready
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React (split router separately to reduce main vendor)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          // UI primitives (Radix)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor';
          }
          // Data fetching
          if (id.includes('node_modules/@tanstack/')) {
            return 'query-vendor';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Animation library
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion-vendor';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'date-vendor';
          }
          // Charts - isolate recharts into its own chunk
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'charts-vendor';
          }
          // Validation
          if (id.includes('node_modules/zod/')) {
            return 'zod-vendor';
          }
          // Form handling
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/@hookform/')) {
            return 'form-vendor';
          }
          // Sonner + toast
          if (id.includes('node_modules/sonner/')) {
            return 'toast-vendor';
          }
        },
      },
    },
  },
  
  server: {
    port: 8080,
    host: "::",
  },
  
  preview: {
    port: 4173,
    host: true,
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}))
