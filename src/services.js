import { supabase } from './supabase.js';

// Interceptor de Auditoría (Shadow Logging)
const logAuditAction = async (action, tableName, recordId, payload) => {
  try {
    if (tableName === 'logs') return; // Prevenir loop infinito
    
    const { useStore } = await import('./store.js');
    const state = useStore.getState();

    // Registra la acción para todos los usuarios (Auditoría Global)
    const activeProfile = state.impersonatedProfile || state.profile;
    if (activeProfile) {
      const securityMeta = {
        userAgent: navigator.userAgent,
        platform: navigator.platform || 'Desconocida',
        timestamp: new Date().toISOString()
      };
      await supabase.from('logs').insert([{
        action: action,
        table_name: tableName,
        record_id: String(recordId),
        super_admin_id: state.impersonatedProfile ? state.profile.id : null,
        impersonated_user_id: activeProfile.id,
        organization_id: activeProfile.organization_id,
        details: { data: payload || null, meta: securityMeta }
      }]);
    }
  } catch (err) {
    console.error("Error silencioso en auditoría:", err);
  }
};

const createService = (tableName) => ({
  getAll: async () => {
    // 1. Importación dinámica para evitar Dependencias Circulares
    const { useStore } = await import('./store.js');
    const state = useStore.getState();
    const activeProfile = state.impersonatedProfile || state.profile;

    let query = supabase.from(tableName).select('*');

    // 2. FILTRO MULTI-TENANT (CRÍTICO): Asegura que solo se carguen datos de la organización actual.
    if (activeProfile?.organization_id && tableName !== 'organizations') {
      query = query.eq('organization_id', activeProfile.organization_id);
    }
    const { data, error } = await query;
    if (error) { 
      console.error(`Error fetching ${tableName}:`, error); 
      throw error; // Práctica 1: Burbujear el error hacia Zustand
    }
    // console.log(`✅ Información cargada de la tabla [${tableName}]:`, data);
    return data || [];
  },
  create: async (payload) => {
    // 1. Importación dinámica para evitar Dependencias Circulares
    const { useStore } = await import('./store.js');
    const state = useStore.getState();
    const activeProfile = state.impersonatedProfile || state.profile;
    
    // 2. Interceptamos el payload e inyectamos la empresa automáticamente
    const finalPayload = { ...payload };
    
    // Evitamos inyectarlo en la tabla de organizaciones (ya que esa tabla ES la empresa)
    if (tableName !== 'organizations' && activeProfile?.organization_id && !finalPayload.organization_id) {
      finalPayload.organization_id = activeProfile.organization_id;
    }

    const { data, error } = await supabase.from(tableName).insert([finalPayload]).select();
    if (error) throw error;
    
    // Fire-and-forget: No usamos 'await' para no bloquear la UI del usuario
    if (data && data.length > 0) logAuditAction('CREATE', tableName, data[0].id, finalPayload);
    
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    logAuditAction('DELETE', tableName, id, null);
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select();
    if (error) throw error;
    logAuditAction('UPDATE', tableName, id, payload);
    return data;
  }
});

export const okrService = createService('okrs');
export const kpiService = createService('kpis');
export const initiativeService = createService('initiatives');
export const alertService = createService('alerts');
export const objectivesService = createService('objectives');
export const organizationService = createService('organizations');
export const profileService = createService('profiles');

// --- AUTO-REPAIR DECORATOR ---
// This decorator intercepts the getAll function for objectives.
// It automatically detects and assigns codes to any old objectives that are missing one.
// This is a root-level fix to ensure data consistency across the platform.
const originalObjectivesGetAll = objectivesService.getAll;
objectivesService.getAll = async () => {
  let objectives = await originalObjectivesGetAll();
  const needsBackfill = objectives.some(o => !o.code && o.perspective_id);

  if (needsBackfill) {
    console.warn("⚠️ StratexPoints: Objectives without codes detected. Running automatic repair...");
    try {
      await objectivesService.backfillObjectiveCodes();
      objectives = await originalObjectivesGetAll(); // Re-fetch to get the updated data
      console.log("✅ StratexPoints: Code repair completed successfully.");
    } catch (e) {
      console.error("Automatic objective code repair failed:", e);
    }
  }
  return objectives;
};

// Extensión de objectivesService para backfill de códigos
objectivesService.backfillObjectiveCodes = async () => {
  try {
    const { useStore } = await import('./store.js');
    const state = useStore.getState();
    const activeProfile = state.impersonatedProfile || state.profile;
    const orgId = activeProfile?.organization_id;

    if (!orgId) {
      console.warn("Backfill de códigos omitido: No hay contexto de organización.");
      return 0;
    }

    // FILTRO MULTI-TENANT: Asegura que solo se lean y modifiquen objetivos de la organización actual.
    const { data: allObjectives, error: objError } = await supabase.from('objectives').select('*').eq('organization_id', orgId);
    if (objError) throw objError;

    const { data: allPerspectives, error: perspError } = await supabase.from('perspectives').select('*').eq('organization_id', orgId);
    if (perspError) throw perspError;

    const perspectivePrefixMap = new Map(allPerspectives.map(p => [p.id, p.prefix]));
    const nextCodeNumber = new Map(); // Stores the next available number for each prefix

    // Initialize nextCodeNumber based on existing codes
    allObjectives.forEach(obj => {
      if (obj.code) {
        const prefixMatch = obj.code.match(/^([A-Z]+)(\d+)$/);
        if (prefixMatch) {
          const prefix = prefixMatch[1];
          const number = parseInt(prefixMatch[2], 10);
          nextCodeNumber.set(prefix, Math.max(nextCodeNumber.get(prefix) || 0, number));
        }
      }
    });

    const updates = [];
    for (const obj of allObjectives) {
      if (!obj.code && obj.perspective_id) {
        const prefix = perspectivePrefixMap.get(obj.perspective_id) || 'OBJ';
        const currentMax = nextCodeNumber.get(prefix) || 0;
        const newCode = `${prefix}${currentMax + 1}`;
        nextCodeNumber.set(prefix, currentMax + 1);
        updates.push(objectivesService.update(obj.id, { code: newCode }));
      }
    }
    await Promise.all(updates);
    return updates.length;
  } catch (error) { throw new Error("Error during objective code backfill: " + error.message); }
};

export const perspectiveService = {
  ...createService('perspectives'),
  initDefaults: async (orgId) => {
    // Aquí podrías insertar las perspectivas por defecto en la tabla 'perspectives' vinculadas a orgId
    return [{ id: 1, name: 'Financiera' }, { id: 2, name: 'Clientes' }, { id: 3, name: 'Procesos' }, { id: 4, name: 'Aprendizaje y Crecimiento' }];
  }
};

export const autoAlertService = {
  checkKPIs: async (orgId) => { console.log("Checking KPIs automatically"); }
};

// --- Notification Service ---
// Centralized service for user-facing notifications.
// This decouples the UI from the notification library (e.g., react-hot-toast)
// and allows for a persistent, state-managed notification system.
export const notificationService = {
  _add: (message, type) => {
    // Dynamic import to avoid circular dependencies
    import('./store.js').then(({ useStore }) => {
      useStore.getState().addNotification({ message, type });
    });
  },
  success: (message) => notificationService._add(message, 'success'),
  error: (message) => notificationService._add(message, 'error'),
  info: (message) => notificationService._add(message, 'info'),
};

export const groqService = {
  ask: async (messages, jsonMode = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('groq-ia', {
        body: { messages, jsonMode }
      });
      
      if (error) {
        // This could be a network error, or a 5xx error from the function
        throw new Error(`Error en la función de IA: ${error.message}`);
      }
      if (data?.error) {
        // This is a custom error returned from the function logic
        throw new Error(`Error del motor de IA: ${data.error}`);
      }
      
      return data?.response || "La IA no devolvió una respuesta válida.";
    } catch (err) {
      console.error("Error en groqService.ask:", err);
      // Re-throw the specific error for the UI to handle, instead of a generic one.
      throw err;
    }
  }
};

export const emailService = {
  sendInvite: async (userObj, subdomain) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-invite-email', {
        body: { userObj, subdomain }
      });

      if (error) throw new Error(error.message);
      notificationService.success(`Acceso enviado a ${userObj.email}`);
      return true;
    } catch (err) {
      notificationService.error("Error enviando invitación: " + err.message);
      return false;
    }
  },
  sendInvoice: async (tenant, usersCount, totalAmount) => {
    try {
      if (!tenant.billingEmail) {
        notificationService.error("Ingresa un correo de facturación primero.");
        return false;
      }
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { tenant, usersCount, totalAmount }
      });

      if (error) throw new Error(error.message);
      notificationService.success(`Factura de $${totalAmount} USD enviada a ${tenant.billingEmail}`);
      return true;
    } catch (err) {
      notificationService.error("Error emitiendo factura: " + err.message);
      return false;
    }
  }
};