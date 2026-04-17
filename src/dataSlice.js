import { perspectiveService, okrService, kpiService, initiativeService, alertService, objectivesService, autoAlertService, notificationService } from './services.js';

// The store is flattened to avoid issues with nested object references,
// which was a primary cause of the "Maximum update depth exceeded" error.
// Each data array (okrs, kpis, etc.) is now a top-level property.
export const createDataSlice = (set, get) => ({
  okrs: [],
  kpis: [],
  initiatives: [],
  alerts: [],
  objectives: [],
  perspectives: [],
  _realtimeChannel: null,

  // Setters directos para actualización optimista desde los módulos
  setOKRs:         (data) => set({ okrs:         Array.isArray(data) ? data : [] }),
  setKPIs:         (data) => set({ kpis:         Array.isArray(data) ? data : [] }),
  setInitiatives:  (data) => set({ initiatives:  Array.isArray(data) ? data : [] }),
  setAlerts:       (data) => set({ alerts:       Array.isArray(data) ? data : [] }),
  setObjectives:   (data) => set({ objectives:   Array.isArray(data) ? data : [] }),
  setPerspectives: (data) => set({ perspectives: Array.isArray(data) ? data : [] }),

  loadAllData: async () => {
    set({ loadingData: true, globalError: null });
    try {
      const orgId = get().profile?.organization_id;
      if (!orgId) {
        console.warn('loadAllData: no hay organization_id en el perfil todavía.');
        set({ loadingData: false });
        return;
      }

      const results = await Promise.allSettled([
        perspectiveService.getAll(orgId),
        okrService.getAll(orgId),
        kpiService.getAll(orgId),
        initiativeService.getAll(orgId),
        alertService.getAll(orgId),
        objectivesService.getAll(orgId),
      ]);

      const hasErrors = results.some(r => r.status === 'rejected');
      if (hasErrors) {
        const msg = 'Hubo problemas sincronizando algunos módulos. Podrías ver datos incompletos.';
        notificationService.error(msg);
        set({ globalError: msg });
      }

      let perspectives = results[0].status === 'fulfilled' ? results[0].value : [];
      const okrs        = results[1].status === 'fulfilled' ? results[1].value : [];
      const kpis        = results[2].status === 'fulfilled' ? results[2].value : [];
      const initiatives = results[3].status === 'fulfilled' ? results[3].value : [];
      const alerts      = results[4].status === 'fulfilled' ? results[4].value : [];
      const objectives  = results[5].status === 'fulfilled' ? results[5].value : [];

      // Crear perspectivas BSC por defecto si el tenant no tiene ninguna
      if (perspectives.length === 0) {
        try {
          perspectives = await perspectiveService.initDefaults(orgId);
        } catch (initErr) {
          console.warn('No se pudieron crear perspectivas por defecto:', initErr.message);
        }
      }

      set({ okrs, kpis, initiatives, alerts, objectives, perspectives, loadingData: false });

      await autoAlertService.checkKPIs(orgId);
    } catch (e) {
      console.error('Error cargando datos:', e);
      notificationService.error(`Error crítico de red: ${e.message}`);
      set({ loadingData: false, globalError: e.message });
    }
  },

  // Realtime WebSocket deshabilitado — las tablas no tienen replicación activa.
  // Para habilitar: Supabase Dashboard → Table Editor → tabla → toggle Realtime ON
  // Mientras tanto, los datos se refrescan en cada acción del usuario (optimistic updates).
  setupSubscriptions: () => { /* no-op: WebSocket deshabilitado */ },
  unsubscribeRealtime: () => { /* no-op */ }
});