import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env': 'import.meta.env'
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false,  // If you're using self-signed certificates in development
      },
      '/socket.io': {
        target: 'https://localhost:3001',
        ws: true,             // Enable WebSocket proxying
        changeOrigin: true,
        secure: false,       // If you're using self-signed certificates in development
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})