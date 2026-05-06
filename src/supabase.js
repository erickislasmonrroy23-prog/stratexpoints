import logger from './utils/logger.js';
import { createClient } from '@supabase/supabase-js';

// Handle both Vite (frontend) and Node.js (backend) environments
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY || '';

// Only create Supabase client if URL and key are available
// In backend mode, this will be null unless explicitly configured
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 2 },
    timeout: 10000,
  },
  global: {
    // Silenciar logs de WebSocket en producción
    fetch: (...args) => fetch(...args),
  },
}) : null;