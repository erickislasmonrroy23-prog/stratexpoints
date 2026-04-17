import { supabase } from './supabase.js';

// ── Notification Service ─────────────────────────────────────────────────────
// Usa un bridge lazy para evitar importación circular con el store.
// App.jsx llama setNotifyFn() una vez montado el store.
let _notifyBridge = null;
export const setNotifyFn = (fn) => { _notifyBridge = fn; };

export const notificationService = {
  success: (msg) => { console.log('[OK]', msg);    _notifyBridge?.({ type: 'success', message: msg }); },
  error:   (msg) => { console.error('[ERR]', msg); _notifyBridge?.({ type: 'error',   message: msg }); },
  info:    (msg) => { console.info('[INFO]', msg);  _notifyBridge?.({ type: 'info',    message: msg }); },
  warning: (msg) => { console.warn('[WARN]', msg);  _notifyBridge?.({ type: 'warning', message: msg }); },
};

// ── OKR Service ──────────────────────────────────────────────────────────────
export const okrService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('okrs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('okrService.getAll:', error.message); return []; }
    // Normalizar: la tabla usa 'objective' como campo principal
    return (data || []).map(o => ({
      ...o,
      title: o.title || o.objective || 'Sin título',
    }));
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('okrs').insert(payload).select().single();
    if (error) throw error;
    return { ...data, title: data.title || data.objective || '' };
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('okrs').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('okrs').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── KPI Service ──────────────────────────────────────────────────────────────
export const kpiService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('kpiService.getAll:', error.message); return []; }
    return data || [];
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('kpis').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('kpis').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('kpis').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Initiative Service ────────────────────────────────────────────────────────
export const initiativeService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('initiatives')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('initiativeService.getAll:', error.message); return []; }
    // Normalizar: la tabla usa 'title' y 'status', traducir status a phase para UI
    return (data || []).map(i => ({
      ...i,
      name: i.name || i.title || 'Sin nombre',
      phase: i.phase || i.status || 'planning',
    }));
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('initiatives').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('initiatives').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('initiatives').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Perspective Service ────────────────────────────────────────────────────────
export const perspectiveService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('perspectives')
      .select('*')
      .eq('organization_id', orgId);
    // No se ordena por created_at — la columna puede no existir en todas las instancias
    if (error) { console.error('perspectiveService.getAll:', error.message); return []; }
    return data || [];
  },
  initDefaults: async (orgId) => {
    if (!orgId) return [];
    // Sin campo 'order' — la columna no existe en todas las instancias de la tabla
    const defaults = [
      { name: 'Financiera',               icon: '💰', color: '#10B981', prefix: 'FIN', organization_id: orgId },
      { name: 'Clientes',                 icon: '🤝', color: '#3B82F6', prefix: 'CLI', organization_id: orgId },
      { name: 'Procesos Internos',        icon: '⚙️', color: '#8B5CF6', prefix: 'PRO', organization_id: orgId },
      { name: 'Aprendizaje y Crecimiento',icon: '🚀', color: '#F59E0B', prefix: 'APR', organization_id: orgId },
    ];
    const { data, error } = await supabase.from('perspectives').insert(defaults).select();
    if (error) { console.error('perspectiveService.initDefaults:', error.message); return defaults.map((d,i)=>({...d,id:i+1})); }
    return data || [];
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('perspectives').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Alert Service ─────────────────────────────────────────────────────────────
export const alertService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) { console.error('alertService.getAll:', error.message); return []; }
    return data || [];
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('alerts').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('alerts').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Objectives Service ─────────────────────────────────────────────────────────
export const objectivesService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('organization_id', orgId);
    // Sin order('created_at') — la columna no existe en todas las instancias
    if (error) { console.error('objectivesService.getAll:', error.message); return []; }
    return data || [];
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('objectives').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from('objectives').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('objectives').delete().eq('id', id);
    if (error) throw error;
  },
  backfillObjectiveCodes: async (orgId) => {
    if (!orgId) return 0;
    const { data, error } = await supabase
      .from('objectives').select('id, code, perspective_id')
      .eq('organization_id', orgId).is('code', null);
    if (error || !data || data.length === 0) return 0;
    const counters = {};
    await Promise.allSettled(data.map(obj => {
      const prefix = obj.perspective_id ? String(obj.perspective_id).substring(0, 3).toUpperCase() : 'OBJ';
      counters[prefix] = (counters[prefix] || 0) + 1;
      const code = prefix + '-' + String(counters[prefix]).padStart(3, '0');
      return supabase.from('objectives').update({ code }).eq('id', obj.id);
    }));
    return data.length;
  },
};

// ── Organization Service ───────────────────────────────────────────────────────
export const organizationService = {
  get: async (orgId) => {
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    if (error) { console.error('organizationService.get:', error.message); return null; }
    return data;
  },
  getAll: async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('organizationService.getAll:', error.message); return []; }
    return data || [];
  },
  create: async (payload) => {
    const { data, error } = await supabase.from('organizations').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (orgId, payload) => {
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ── Auto Alert Service ──────────────────────────────────────────────────────
export const autoAlertService = {
  checkKPIs: async (orgId) => {
    if (!orgId) return;
    try {
      const { data: kpis } = await supabase
        .from('kpis')
        .select('id, name, value, target, owner, organization_id')
        .eq('organization_id', orgId);
      if (!kpis || kpis.length === 0) return;
      const criticalKpis = kpis.filter(k => k.target > 0 && (k.value / k.target) * 100 < 70);
      if (criticalKpis.length === 0) return;
      const { data: existing } = await supabase
        .from('alerts').select('title').eq('organization_id', orgId).eq('is_read', false);
      const existingTitles = new Set((existing || []).map(a => a.title));
      const toInsert = criticalKpis
        .map(kpi => {
          const pct = kpi.target > 0 ? Math.round((kpi.value / kpi.target) * 100) : 0;
          const title = 'KPI en riesgo: ' + kpi.name;
          if (existingTitles.has(title)) return null;
          return { title, message: 'Avance: ' + pct + '% (Meta: ' + kpi.target + '). Responsable: ' + (kpi.owner || 'N/A') + '.', severity: pct < 50 ? 'critical' : 'warning', is_read: false, organization_id: orgId };
        }).filter(Boolean);
      if (toInsert.length > 0) await supabase.from('alerts').insert(toInsert);
    } catch (e) { console.error('autoAlertService.checkKPIs:', e.message); }
  }
};

// ── Gemini AI Service (Google — gratis hasta 1,500 req/día) ──────────────────
// Usa el endpoint OpenAI-compatible de Google para máxima compatibilidad.
// Key gratuita en: https://aistudio.google.com → Get API Key
const AI_KEY_MISSING = '⚠️ La IA no está disponible. Configura VITE_GEMINI_API_KEY en Vercel → Settings → Environment Variables y vuelve a desplegar. Key gratuita en: aistudio.google.com';

export const groqService = {
  isAvailable: () => !!import.meta.env.VITE_GEMINI_API_KEY,

  // _model se ignora intencionalmente — siempre se usa gemini-2.0-flash
  // (los módulos viejos pasaban 'llama3-70b-8192' etc que Gemini no acepta)
  chat: async (messages, _model = 'gemini-2.0-flash') => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error(AI_KEY_MISSING);
    const model = 'gemini-2.0-flash';

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
      }
    );

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      if (res.status === 400) throw new Error('VITE_GEMINI_API_KEY inválida. Verifica la key en aistudio.google.com.');
      if (res.status === 429) throw new Error('Límite de solicitudes Gemini alcanzado. Intenta en unos segundos.');
      throw new Error(e?.error?.message || 'Error Gemini HTTP ' + res.status);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  analyzeOKRs: async (okrs, kpis) => {
    return groqService.chat([
      { role: 'system', content: 'Eres consultor experto en OKRs y KPIs. Analiza y entrega: 1) Salud general 2) Top 3 riesgos 3) Top 3 recomendaciones. Español, máximo 400 palabras.' },
      { role: 'user', content: 'OKRs: ' + JSON.stringify((okrs||[]).slice(0,10)) + ' | KPIs: ' + JSON.stringify((kpis||[]).slice(0,10)) },
    ]);
  },

  flashInsight: async (data) => {
    return groqService.chat([
      { role: 'system', content: 'Asesor ejecutivo. Da 3 insights estratégicos accionables en máximo 5 oraciones. Español.' },
      { role: 'user', content: 'Datos: ' + JSON.stringify(data) },
    ]);
  },

  analyzeDocument: async (text, question) => {
    return groqService.chat([
      { role: 'system', content: 'Analista experto. Responde de forma concisa y estructurada. Español.' },
      { role: 'user', content: 'Documento:\n' + text.substring(0, 8000) + '\n\nPregunta: ' + (question || 'Puntos principales del documento') },
    ]);
  },

  ask: async (messages, _jsonMode = false) => {
    return groqService.chat(Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }]);
  },
};

// ── Profile Service ──────────────────────────────────────────────
export const profileService = {
  create: async (payload) => {
    const { data, error } = await supabase.from('profiles').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('profileService.getAll:', error.message); return []; }
    return data || [];
  },
  update: async (id, payload) => {
    const { data, error } = await supabase
      .from('profiles').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Email Service (stub — enviar emails requiere backend) ────────────
export const emailService = {
  sendInvitation: async (email, orgName) => {
    // En producción usar Supabase Edge Functions o Resend
    console.info('emailService.sendInvitation:', email, 'org:', orgName);
    return { success: true, message: 'Invitación enviada (simulada)' };
  },
  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) throw error;
    return { success: true };
  },
  sendNotification: async (to, subject, body) => {
    console.info('emailService.sendNotification:', to, subject);
    return { success: true };
  },
  // Alias de sendInvitation — compatibilidad con módulos que usan sendInvite
  sendInvite: async (email, orgName) => {
    return emailService.sendInvitation(email, orgName);
  },
  sendInvoice: async (email, invoiceData) => {
    console.info('emailService.sendInvoice:', email, invoiceData);
    return { success: true, message: 'Factura enviada (simulada)' };
  },
};
