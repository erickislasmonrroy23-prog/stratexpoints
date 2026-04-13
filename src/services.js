import { supabase } from './supabase.js';

// ── Notification Service ─────────────────────────────────────────────────────
export const notificationService = {
  success: (msg) => console.log('[OK]', msg),
  error:   (msg) => console.error('[ERR]', msg),
  info:    (msg) => console.info('[INFO]', msg),
  warning: (msg) => console.warn('[WARN]', msg),
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
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('perspectiveService.getAll:', error.message); return []; }
    return data || [];
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
};

// ── Objectives Service ─────────────────────────────────────────────────────────
export const objectivesService = {
  getAll: async (orgId) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) { console.error('objectivesService.getAll:', error.message); return []; }
    return data || [];
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

// ── Groq AI Service ──────────────────────────────────────────────────────────
export const groqService = {
  chat: async (messages, model = 'llama3-8b-8192') => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key no configurada. Agrega VITE_GROQ_API_KEY en Vercel.');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || 'Error Groq HTTP ' + res.status);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },
  analyzeOKRs: async (okrs, kpis) => {
    return groqService.chat([
      { role: 'system', content: 'Eres consultor experto en OKRs y KPIs. Analiza y entrega: 1) Salud general 2) Top 3 riesgos 3) Top 3 recomendaciones. Español, máximo 400 palabras.' },
      { role: 'user', content: 'OKRs: ' + JSON.stringify((okrs||[]).slice(0,10)) + ' | KPIs: ' + JSON.stringify((kpis||[]).slice(0,10)) }
    ]);
  },
  flashInsight: async (data) => {
    return groqService.chat([
      { role: 'system', content: 'Asesor ejecutivo. Da 3 insights estratégicos accionables en máximo 5 oraciones. Español.' },
      { role: 'user', content: 'Datos: ' + JSON.stringify(data) }
    ]);
  },
  analyzeDocument: async (text, question) => {
    return groqService.chat([
      { role: 'system', content: 'Analista experto. Responde de forma concisa y estructurada. Español.' },
      { role: 'user', content: 'Documento:\n' + text.substring(0,8000) + '\n\nPregunta: ' + (question || 'Puntos principales del documento') }
    ]);
  },
};

// ── Profile Service ──────────────────────────────────────────────
export const profileService = {
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
};
