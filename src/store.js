import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // ── Auth & Profile ────────────────────────────────────────────────────────
  profile:              null,
  currentOrganization:  null,
  impersonatedProfile:  null,
  isSystemOwner:        false,

  setProfile:             (p)    => set({ profile: p }),
  setCurrentOrganization: (org)  => set({ currentOrganization: org }),
  setImpersonatedProfile: (p)    => set({ impersonatedProfile: p }),
  setIsSystemOwner:       (v)    => set({ isSystemOwner: v }),

  // ── Strategic Data ────────────────────────────────────────────────────────
  okrs:        [],
  kpis:        [],
  initiatives: [],
  perspectives: [],
  objectives:  [],
  alerts:      [],

  setOKRs:        (data) => set({ okrs:        Array.isArray(data) ? data : [] }),
  setKPIs:        (data) => set({ kpis:        Array.isArray(data) ? data : [] }),
  setInitiatives: (data) => set({ initiatives: Array.isArray(data) ? data : [] }),
  setPerspectives:(data) => set({ perspectives: Array.isArray(data) ? data : [] }),
  setObjectives:  (data) => set({ objectives:  Array.isArray(data) ? data : [] }),
  setAlerts:      (data) => set({ alerts:      Array.isArray(data) ? data : [] }),

  // Helpers para actualizar items individuales
  updateOKR: (id, updates) => set(s => ({
    okrs: s.okrs.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  updateKPI: (id, updates) => set(s => ({
    kpis: s.kpis.map(k => k.id === id ? { ...k, ...updates } : k)
  })),
  removeOKR: (id) => set(s => ({ okrs: s.okrs.filter(o => o.id !== id) })),
  removeKPI: (id) => set(s => ({ kpis: s.kpis.filter(k => k.id !== id) })),

  // ── UI State ──────────────────────────────────────────────────────────────
  activeModule:   'dashboard',
  sidebarOpen:    true,
  zenMode:        false,
  notifications:  [],

  setActiveModule:  (m)  => set({ activeModule: m }),
  setSidebarOpen:   (v)  => set({ sidebarOpen: v }),
  setZenMode:       (v)  => set({ zenMode: v }),
  setNotifications: (n)  => set({ notifications: Array.isArray(n) ? n : [] }),
  addNotification:  (n)  => set(s => ({ notifications: [n, ...s.notifications].slice(0, 50) })),

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetAll: () => set({
    profile: null, currentOrganization: null, impersonatedProfile: null,
    isSystemOwner: false, okrs: [], kpis: [], initiatives: [],
    perspectives: [], objectives: [], alerts: [], notifications: [],
    activeModule: 'dashboard', zenMode: false,
  }),
}));

export default useStore;
