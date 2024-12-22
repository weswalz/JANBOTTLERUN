import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://heights.clubkit.io' 
          : 'http://localhost:3000',
        ws: true,
        secure: process.env.NODE_ENV === 'production',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@nextui-org/react', 'framer-motion']
        }
      }
    }
  }
})
