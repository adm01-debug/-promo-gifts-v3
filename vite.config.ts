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
          // Core React
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
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
          // Note: recharts is already code-split via lazy page imports
          // Heavy libs stay isolated (xlsx, jspdf, html2canvas already chunked by lazy imports)
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
