import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 2 },
    timeout: 10000,
  },
  global: {
    // Silenciar logs de WebSocket en producción
    fetch: (...args) => fetch(...args),
  },
});