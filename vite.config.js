import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración optimizada para GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
})
