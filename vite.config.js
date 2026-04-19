import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      timeout: 60000,
      overlay: true,
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('airtable')) {
              return 'vendor-airtable'
            }
            if (id.includes('lucide')) {
              return 'vendor-icons'
            }
          }
        }
      }
    }
  }
})
