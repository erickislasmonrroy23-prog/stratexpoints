import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// VitePWA desactivado temporalmente — workbox-build 7.4 tiene bug con lodash assignWith
// Reactivar cuando se resuelva: npm install vite-plugin-pwa@latest
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA({ registerType: 'autoUpdate', ... })  // TODO: reactivar con versión estable
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@config': path.resolve(__dirname, './src/config'),
    }
  },
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('pptxgenjs')) return 'vendor-pptxgen';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('supabase')) return 'vendor-supabase';
            return 'vendor';
          }
        }
      }
    }
  }
})
