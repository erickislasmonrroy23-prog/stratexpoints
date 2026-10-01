import { rolDe, permite } from './roles.js';
import logger from './utils/logger.js';
import { supabase } from './supabase.js';
import { deepEqual } from 'fast-equals';
import { ROLES } from './constants.js';
import { callEdgeFunction } from './utils/jwtUtils.js';

export const createAuthSlice = (set, get) => ({
  user: null,
  profile: null,
  currentOrganization: null,
  impersonatedProfile: null,
  isSystemOwner: false,

  // NEW: Enterprise features and session management
  enterpriseFeatures: null,
  passwordRotationDue: false,
  sessionInfo: null,
  authContextLoading: false,
  authContextError: null,

  setCurrentOrganization: (org) => set({ currentOrganization: org }),

  setAuth: (newUser, newProfile) => {
    const current = get();
    // Solo actualiza si el usuario o el perfil han cambiado realmente (comparación profunda)
    if (!deepEqual(current.user, newUser) || !deepEqual(current.profile, newProfile)) {
      // Normalizar organizations: si es un objeto sin id, usar como es; si es un array, tomar el primero
      let org = null;
      if (newProfile?.organizations) {
        if (Array.isArray(newProfile.organizations)) {
          org = newProfile.organizations[0] || null;
        } else {
          org = newProfile.organizations;
        }
      }

      const isOwner = !!(newProfile?.is_super_admin || newProfile?.role === 'super_admin');
      set({ user: newUser, profile: newProfile, currentOrganization: org, isSystemOwner: isOwner });

      // Fire-and-forget: auth context enriches the session but is not required
      if (newUser && newProfile) {
        get().loadAuthContext().catch(() => {});
      }
    }
  },

  setImpersonatedProfile: (profile) => set({ impersonatedProfile: profile }),
  clearImpersonation: () => set({ impersonatedProfile: null }),

  loadAuthContext: async () => {
    set({ authContextLoading: true, authContextError: null });
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('auth-context timeout')), 8000)
      );
      const response = await Promise.race([callEdgeFunction('auth-context', {}), timeout]);

      if (response.ok && response.data) {
        const authContext = response.data.data || response.data;

        set({
          enterpriseFeatures: authContext.enterprise_features || null,
          passwordRotationDue: authContext.password_rotation_due || false,
          sessionInfo: authContext.session_info || null,
          authContextLoading: false,
          authContextError: null
        });

        logger.log('[Auth] Context loaded successfully:', {
          organization: authContext.organizations?.[0]?.name,
          features: authContext.enterprise_features,
          passwordRotation: authContext.password_rotation_due
        });

        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to load auth context');
      }
    } catch (error) {
      logger.error('[Auth] Error loading context:', error);
      set({
        authContextLoading: false,
        authContextError: error.message
      });
      return false;
    }
  },

  // NEW: Refresh JWT session
  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.error('[Auth] Session refresh error:', error);
        return false;
      }

      if (data.session) {
        logger.log('[Auth] Session refreshed');
        // Reload auth context with new token
        await get().loadAuthContext();
        return true;
      }
      return false;
    } catch (err) {
      logger.error('[Auth] Session refresh exception:', err);
      return false;
    }
  },

  // NEW: Check if password rotation is required
  checkPasswordRotation: () => {
    const { passwordRotationDue } = get();
    return passwordRotationDue;
  },

  // NEW: Get complete auth context
  getAuthContext: () => {
    const { enterpriseFeatures, sessionInfo, profile, currentOrganization } = get();
    return {
      profile,
      organization: currentOrganization,
      features: enterpriseFeatures,
      session: sessionInfo
    };
  },

  // Evaluador de Permisos ABAC (Attribute-Based Access Control) con soporte multi-tenant
  can: (action, resource) => {
    // Reglas alineadas 1:1 con las políticas de la base (app_role / can_edit / is_admin).
    const { profile, impersonatedProfile } = get();
    const rol = rolDe(impersonatedProfile || profile);
    if (resource === 'super_admin_panel' || resource === 'admin' || action === 'admin') return rolDe(profile) === 'admin' && !impersonatedProfile;
    return permite(rol, action === 'edit' ? 'update' : action === 'remove' ? 'delete' : action);
  },

  // Push notifications: deshabilitadas hasta que se agregue push_subscription a profiles
  requestPushNotifications: async () => {
    // No-op: columna push_subscription no existe en la tabla profiles de Supabase.
    // Para habilitar: ALTER TABLE profiles ADD COLUMN push_subscription jsonb;
    return;
  }
});
