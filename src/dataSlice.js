import { perspectiveService, okrService, kpiService, initiativeService, alertService, objectivesService, autoAlertService, notificationService } from './services.js';
import { supabase } from './supabase.js';
import { deepEqual } from 'fast-equals';

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

  setupSubscriptions: () => {
    if (get()._realtimeChannel) return;

    const channel = supabase.channel('global-store-changes');
    const tablesToSync = ['okrs', 'kpis', 'initiatives', 'objectives', 'alerts'];

    tablesToSync.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => {
          // This logic is now more robust. It gets the current state,
          // calculates changes, and only calls `set` if there's an actual
          // change. This is the most efficient way to handle realtime updates
          // and prevent infinite render loops.
          const state = get();
          const currentTable = state[table] || [];
          let updatedTable = currentTable;
          let hasChanged = false;

          if (payload.eventType === 'INSERT') {
            // Prevent duplicates from race conditions
            if (!currentTable.some(item => item.id === payload.new.id)) {
              updatedTable = [...currentTable, payload.new];
              hasChanged = true;
            }
          } else if (payload.eventType === 'UPDATE') {
            const index = currentTable.findIndex(item => item.id === payload.new.id);
            if (index !== -1) {
              // Only update if the object is actually different
              if (!deepEqual(currentTable[index], payload.new)) {
                updatedTable = [...currentTable];
                updatedTable[index] = payload.new;
                hasChanged = true;
              }
            } else { // If not found, treat as an insert
              updatedTable = [...currentTable, payload.new];
              hasChanged = true;
            }
          } else if (payload.eventType === 'DELETE') {
            const index = currentTable.findIndex(item => item.id === payload.old.id);
            if (index !== -1) {
              updatedTable = currentTable.filter(item => item.id !== payload.old.id);
              hasChanged = true;
            }
          }

          if (hasChanged) {
            set({ [table]: updatedTable });
          }
        }
      );
    });

    channel.subscribe();
    set({ _realtimeChannel: channel });
  },

  unsubscribeRealtime: () => {
    const channel = get()._realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ _realtimeChannel: null });
    }
  }
});