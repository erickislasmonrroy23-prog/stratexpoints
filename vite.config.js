import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // El Service Worker se actualizará solo cuando subas una nueva versión
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Xtratia Enterprise OS',
        short_name: 'Xtratia',
        description: 'Bóveda Estratégica y Command Center IA',
        theme_color: '#0f172a', // Color oscuro para que la barra de estado del celular se vea elegante
        background_color: '#0f172a',
        display: 'standalone', // Esto oculta la barra de navegación del navegador (experiencia app nativa)
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Necesario para que Android adapte el ícono a la forma del sistema
          }
        ]
      }
    })
  ],
  server: { port: 5173 },
  build: { 
    outDir: 'dist', 
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Agrupa todas las librerías de 'node_modules' en un solo archivo 'vendor.js'
          if (id.includes('node_modules')) {
            // Excepciones: librerías pesadas que queremos en su propio chunk
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('pptxgenjs')) return 'vendor-pptxgen';
            return 'vendor';
          }
        }
      }
    }
  }
})
