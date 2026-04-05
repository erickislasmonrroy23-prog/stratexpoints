import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },

  server: {
    port: 5173,
    strictPort: false,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    // Aumenta el límite de warning a 600KB (los vendors pesados son esperados)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ── Vendors críticos con su propio chunk ──────────────────────
          if (id.includes('pdfjs-dist'))    return 'vendor-pdfjs';
          if (id.includes('xlsx'))          return 'vendor-xlsx';
          if (id.includes('pptxgenjs'))     return 'vendor-pptxgen';
          if (id.includes('html2canvas'))   return 'vendor-html2canvas';
          if (id.includes('mammoth'))       return 'vendor-mammoth';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@supabase'))     return 'vendor-supabase';

          // ── i18n en su propio chunk ───────────────────────────────────
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';

          // ── React core ─────────────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';

          // ── Resto de node_modules ─────────────────────────────────────
          return 'vendor';
        }
      }
    }
  }
})
