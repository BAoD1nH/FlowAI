// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      '/api':      { target: 'http://localhost:8000', changeOrigin: true },
      '/ai':       { target: 'http://localhost:8000', changeOrigin: true },
      '/calendar': { target: 'http://localhost:8000', changeOrigin: true },
      // (tuỳ) nếu muốn test /health qua 5173:
      // '/health':   { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  plugins: [react()],
})
