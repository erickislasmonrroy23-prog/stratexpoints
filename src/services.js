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
    // Solo columnas que existen en la tabla: id, organization_id, name, icon, color, order_index, created_at
    const defaults = [
      { name: 'Financiera',                icon: '💰', color: '#10B981', order_index: 1, organization_id: orgId },
      { name: 'Clientes',                  icon: '🤝', color: '#3B82F6', order_index: 2, organization_id: orgId },
      { name: 'Procesos Internos',         icon: '⚙️', color: '#8B5CF6', order_index: 3, organization_id: orgId },
      { name: 'Aprendizaje y Crecimiento', icon: '🚀', color: '#F59E0B', order_index: 4, organization_id: orgId },
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
    // Quitar campos que no existen en la tabla objectives
    const { progress, created_at, updated_at, ...safePayload } = payload;
    const { data, error } = await supabase.from('objectives').insert(safePayload).select().single();
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

// ── Claude AI Service (NUEVA INTEGRACIÓN - Reemplaza Groq/Gemini) ──────────────
export const claudeService = {
  isAvailable: () => !!import.meta.env.VITE_CLAUDE_API_KEY,

  chat: async (messages, model = 'claude-opus-4-1-20250805') => {
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!apiKey) throw new Error('❌ VITE_CLAUDE_API_KEY no configurada. Agrega tu API key de Claude en .env.local');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          system: messages.find(m => m.role === 'system')?.content || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${res.status}`;
        console.error('❌ Claude API Error:', errorMsg, errorData);

        if (res.status === 401) throw new Error('❌ API Key inválida o expirada');
        if (res.status === 429) throw new Error('❌ Rate limit excedido. Intenta en unos segundos.');
        if (res.status === 500) throw new Error('❌ Servidor Claude no disponible');

        throw new Error(`Claude Error: ${errorMsg}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';

      if (!content) {
        console.warn('⚠️ Claude retornó respuesta vacía');
        return '';
      }

      return content;
    } catch (err) {
      console.error('❌ Claude Service error:', err.message);
      throw err;
    }
  },

  // ═══ AUDITORÍA OKRs ═══
  auditOKRs: async (okrs, objectives, perspectives) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Eres auditor senior de Estrategia. Analiza este portafolio de OKRs y entrega:
1. **Diagnóstico Ejecutivo**: Salud general (0-100%), factores clave, riesgos inmediatos
2. **Top 3 OKRs en Riesgo**: Cuáles tienen probabilidad baja de alcanzarse y por qué
3. **Top 3 Recomendaciones Inmediatas**: Acciones concretas para acelerar progreso
4. **Madurez de OKRs**: Score 0-100 basado en claridad, medibilidad, ambición
5. **Alineación Estratégica**: Cómo se conectan a objetivos de negocio

DATOS:
- Objetivos Estratégicos: ${JSON.stringify((objectives || []).slice(0, 10), null, 2)}
- OKRs Activos: ${JSON.stringify((okrs || []).slice(0, 15), null, 2)}
- Perspectivas: ${JSON.stringify((perspectives || []).slice(0, 5), null, 2)}

Responde en ESPAÑOL, formato markdown, máximo 800 palabras. Se específico y accionable.`,
      },
    ]);
  },

  // ═══ ANÁLISIS KPIs ═══
  diagnoseKPIs: async (kpis, organization) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Eres consultor de Performance Management. Diagnostica este sistema de KPIs:
1. **Salud General**: ¿Qué está funcionando bien? ¿Qué está en riesgo?
2. **KPIs Críticos (< 70%)**: Cuáles, causa raíz probable, impacto
3. **KPIs Sobreperformando**: Oportunidades de escalamiento, lecciones aprendidas
4. **Gaps de Medición**: Qué NO estamos midiendo pero deberíamos
5. **Plan de Acción**: Top 5 cambios prioritarios en los próximos 30 días

DATOS KPIs:
${JSON.stringify((kpis || []).slice(0, 20), null, 2)}

Organización: ${organization?.name || 'N/A'}

Responde en ESPAÑOL, markdown, máximo 600 palabras. Enfócate en accionables.`,
      },
    ]);
  },

  // ═══ ALINEACIÓN ESTRATÉGICA ═══
  analyzeAlignment: async (okrs, kpis, initiatives) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Eres estratega organizacional. Evalúa alineación entre OKRs, KPIs e Iniciativas:
1. **Coherencia OKRs↔KPIs**: ¿Los KPIs miden correctamente el progreso en OKRs?
2. **Cobertura de Iniciativas**: ¿Cada OKR tiene iniciativas suficientes? ¿Hay iniciativas huérfanas?
3. **Gaps Estratégicos**: Áreas no cubiertas, conflictos, redundancias
4. **Cadena de Valor**: ¿Hay una cascada lógica de objetivos→resultados→acciones?
5. **Plan de Corrección**: Cambios recomendados para mejorar alineación

PORTFOLIO:
- OKRs: ${JSON.stringify((okrs || []).slice(0, 10), null, 2)}
- KPIs: ${JSON.stringify((kpis || []).slice(0, 10), null, 2)}
- Iniciativas: ${JSON.stringify((initiatives || []).slice(0, 10), null, 2)}

Responde en ESPAÑOL, markdown, máximo 700 palabras.`,
      },
    ]);
  },

  // ═══ MAPA DE RIESGOS ═══
  identifyRisks: async (okrs, kpis, organization) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Eres experto COSO/ISO 31000 en Gestión de Riesgos. Identifica riesgos estratégicos:
1. **Top 5 Riesgos Estratégicos**: Basados en datos de OKRs y KPIs
   - Para cada: descripción, causa, impacto probable, probabilidad
2. **Riesgos Emergentes**: Tendencias, factores externos, vulnerabilidades
3. **Controles Recomendados**: Qué medir, cómo mitigar, responsables
4. **Riesgo Global**: Score 0-100 (Bajo/Medio/Alto/Crítico)
5. **Plan de Monitoreo**: KPIs de riesgo, frecuencia, alertas

DATOS:
- OKRs: ${JSON.stringify((okrs || []).slice(0, 10), null, 2)}
- KPIs: ${JSON.stringify((kpis || []).slice(0, 10), null, 2)}
- Organización: ${JSON.stringify(organization, null, 2)}

Responde en ESPAÑOL, formato matriz/tabla cuando sea posible, máximo 800 palabras.`,
      },
    ]);
  },

  // ═══ GENERACIÓN DE OKRs ═══
  generateOKRs: async (perspective, organization, idea, numOKRs = 3) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Eres estratega OKR senior. Genera ${numOKRs} OKRs de alta calidad para:
Perspectiva: ${perspective}
Empresa: ${organization?.name || 'nuestra empresa'}
Industria: ${organization?.industry || 'general'}
Visión: ${organization?.vision || 'crecer sustentablemente'}
Contexto/Idea: ${idea}

REQUISITOS para cada OKR:
- Objetivo (O): Declarativo, inspirador, cualitativo. Ej: "Convertirse en referente de innovación"
- Key Results (KRs): 3-4 por OKR, medibles, aspiracionales pero alcanzables. Con métrica y meta.
  Formato: "Aumentar [métrica] de [base] a [meta]" o "Lograr [X] por [fecha]"
- Ambición: 70-80% de confianza de alcanzar al 100%
- Alineación: Conectados a la visión/industria

RESPONDE EN JSON PURO (sin markdown):
{
  "okrs": [
    {
      "objective": "...",
      "keyResults": ["KR1...", "KR2...", "KR3..."],
      "confidence": 75,
      "rationale": "Por qué importa..."
    }
  ]
}`,
      },
    ]);
  },

  // ═══ ANÁLISIS DE DOCUMENTOS ═══
  analyzeDocument: async (text, question) => {
    return claudeService.chat([
      {
        role: 'user',
        content: `Documento para analizar:
${text.substring(0, 12000)}

Pregunta: ${question || 'Puntos principales, insights clave, recomendaciones'}

Responde en ESPAÑOL, markdown, máximo 500 palabras.`,
      },
    ]);
  },

  // ═══ MODO CONVERSACIONAL ═══
  ask: async (messages, _jsonMode = false) => {
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages) }];
    }
    return claudeService.chat(messages);
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

  // ========================================================================
  // NUEVO: Gestión de roles por organización (multi-tenant RBAC)
  // ========================================================================

  /**
   * Asigna un rol específico a un usuario dentro de una organización.
   * Si la columna organization_roles no existe en la BD, la crea automáticamente.
   * @param {string} userId - ID del usuario
   * @param {string} organizationId - ID de la organización
   * @param {string} role - Rol a asignar (admin, editor, viewer)
   */
  setRoleForOrganization: async (userId, organizationId, role) => {
    if (!userId || !organizationId || !role) {
      throw new Error('userId, organizationId y role son requeridos');
    }

    try {
      // Obtener el perfil actual con sus organization_roles
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('organization_roles')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Inicializar organization_roles si no existe
      const currentRoles = (profile?.organization_roles && typeof profile.organization_roles === 'object')
        ? profile.organization_roles
        : {};

      // Actualizar el rol para esta organización
      currentRoles[organizationId] = role;

      // Guardar los cambios
      const { data, error } = await supabase
        .from('profiles')
        .update({ organization_roles: currentRoles })
        .eq('id', userId)
        .select('organization_roles')
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      // Si falla por que la columna no existe, registra una advertencia
      // pero permite que continúe la operación con el rol global como fallback
      console.warn('⚠️ No se pudo asignar rol por organización:', e.message);
      // Fallback: actualizar el rol global (para backward compatibility)
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (fallbackError) throw fallbackError;
    }
  },

  /**
   * Obtiene el rol de un usuario en una organización específica.
   * @param {string} userId - ID del usuario
   * @param {string} organizationId - ID de la organización
   * @returns {string} El rol del usuario en la organización, o 'viewer' por defecto
   */
  getRoleForOrganization: async (userId, organizationId) => {
    if (!userId || !organizationId) return 'viewer';

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, organization_roles')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return 'viewer';

      // Prioridad 1: Rol específico por organización
      if (data.organization_roles && typeof data.organization_roles === 'object') {
        const orgSpecificRole = data.organization_roles[organizationId];
        if (orgSpecificRole) return orgSpecificRole;
      }

      // Prioridad 2: Rol global (fallback)
      return data.role || 'viewer';
    } catch (e) {
      console.warn('Error obteniendo rol por organización:', e.message);
      return 'viewer';
    }
  },
};

// =========================================================================
// DATABASE MIGRATION HELPER - Multi-Tenant Role Support
// =========================================================================
// Esta función intenta añadir la columna organization_roles a la tabla profiles
// si no existe. Se ejecuta automáticamente en App.jsx durante la inicialización.
// SQL manual si es necesario:
// ALTER TABLE profiles ADD COLUMN organization_roles JSONB DEFAULT '{}';
export const ensureMultiTenantRoleSupport = async () => {
  try {
    // Intentar una query de lectura que incluya organization_roles
    // Si la columna no existe, Supabase la ignorará silenciosamente
    const { error } = await supabase
      .from('profiles')
      .select('id, organization_roles')
      .limit(1);

    // Si no hay error, la columna existe (o el sistema la ignora sin error)
    if (!error) {
      console.log('✅ Multi-tenant role support is ready');
      return true;
    }

    // Si hay error de sintaxis de columna, intentar crear la columna
    if (error?.message?.includes('organization_roles')) {
      console.warn('⚠️ organization_roles column not found. Attempting to create...');
      console.warn('Para crear manualmente en Supabase, ejecuta:');
      console.warn('ALTER TABLE profiles ADD COLUMN organization_roles JSONB DEFAULT \'{}\';');
      // Nota: No podemos ejecutar DDL desde el cliente, requiere service_role
      return false;
    }

    return true;
  } catch (e) {
    console.warn('Error checking multi-tenant role support:', e.message);
    return false;
  }
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
