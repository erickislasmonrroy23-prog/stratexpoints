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

  // ── Permission check ──────────────────────────────────────────────────────
  can: (action, resource) => {
    const state = useStore.getState();
    const profile = state.profile;
    const isSystemOwner = state.isSystemOwner;
    
    // Super admin tiene acceso a todo
    if (isSystemOwner) return true;
    if (profile?.is_super_admin) return true;
    
    // Check específico para super_admin_panel
    if (resource === 'super_admin_panel') {
      return !!(isSystemOwner || profile?.is_super_admin || profile?.role === 'super_admin');
    }
    
    // Por defecto basarse en el rol
    const role = profile?.role || 'viewer';
    const roleLevel = { super_admin: 4, admin: 3, Admin: 3, editor: 2, viewer: 1 };
    const userLevel = roleLevel[role] || 1;
    
    if (action === 'access' || action === 'view') return userLevel >= 1;
    if (action === 'create' || action === 'edit') return userLevel >= 2;
    if (action === 'delete' || action === 'manage') return userLevel >= 3;
    
    return false;
  },


  // ── Loading / Error state ─────────────────────────────────────────────────
  isLoading: false,
  lastError: null,
  setIsLoading: (v) => set({ isLoading: v }),
  setError:     (e) => set({ lastError: e }),

  // ── Auth helpers ──────────────────────────────────────────────────────────
  // setAuth(user, profileData) — guarda el usuario auth Y los datos del perfil de BD
  // setAuth(null, null)        — limpia todo (logout)
  setAuth: (user, profileData) => {
    if (!user) {
      set({ profile: null, currentOrganization: null, isSystemOwner: false });
      return;
    }
    if (profileData) {
      set({
        profile: { ...profileData, id: user.id, email: user.email },
        currentOrganization: profileData.organizations || null,
        isSystemOwner: !!(profileData.is_super_admin || profileData.role === 'super_admin'),
      });
    } else {
      set({ profile: { id: user.id, email: user.email } });
    }
  },
  clearAuth: () => set({ profile: null, currentOrganization: null, isSystemOwner: false }),
  logout:    () => useStore.getState().resetAll(),

}));

export default useStore;
