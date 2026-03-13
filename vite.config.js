import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Cambia 'stratexpoints' por el nombre exacto de tu repositorio en GitHub
export default defineConfig({
  plugins: [react()],
  base: '/stratexpoints/',
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 5173, open: true }
})
