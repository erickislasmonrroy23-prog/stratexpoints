import { supabase } from './supabase.js';
import { deepEqual } from 'fast-equals'; // Importa la función de comparación profunda
import { ROLES } from './constants.js';

export const createAuthSlice = (set, get) => ({
  user: null,
  profile: null,
  currentOrganization: null,   // alias de profile.organizations para compatibilidad con módulos
  impersonatedProfile: null,
  isSystemOwner: false,
  // Permite establecer el tenant antes de login (detección de subdominio)
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
    }
  },
  setImpersonatedProfile: (profile) => set({ impersonatedProfile: profile }),
  clearImpersonation: () => set({ impersonatedProfile: null }),

  // Evaluador de Permisos ABAC (Attribute-Based Access Control) con soporte multi-tenant
  can: (action, resource) => {
    const { profile, currentOrganization, impersonatedProfile, user } = get();

    // Regla 1: El Super Administrador real (no impersonado) tienen acceso a TODO.
    // Este es el nivel más alto de privilegio.
    if (!impersonatedProfile && profile?.is_super_admin) {
      return true;
    }

    // Regla 1.1: El panel de Super Admin es *exclusivo* para el Super Admin real.
    // Si NO eres un Super Administrador real (Regla 1 no aplicada), y el recurso es el panel de super admin,
    // entonces se deniega el acceso completo (el PIN lo gestiona a nivel de UI en App.jsx).
    if (resource === 'super_admin_panel' && !profile?.is_super_admin) {
        return false;
    }

    // A partir de aquí, evaluamos los permisos para un usuario normal o uno impersonado.
    const activeProfile = impersonatedProfile || profile;

    // Si no hay un perfil activo, no tiene permisos para nada.
    if (!activeProfile) {
      return false;
    }

    // ============================================================================
    // Regla 2: Evaluar permisos basados en el rol del usuario dentro de su organización.
    // MEJORADO: Soporte para roles POR ORGANIZACIÓN (multi-tenant role assignment)
    // ============================================================================

    // Determinar el rol del usuario en la organización actual.
    // Prioridad 1: Si existen organization_roles JSONB, usar el rol específico para esta org
    // Prioridad 2: Si no, usar el rol global (backward compatibility)
    const currentOrgId = currentOrganization?.id;
    let userRoleInOrg = activeProfile.role || 'viewer'; // Default: rol global con fallback a viewer

    // Si el usuario tiene roles por organización y estamos en una org específica, usar ese rol
    if (activeProfile.organization_roles && typeof activeProfile.organization_roles === 'object' && currentOrgId) {
      const orgSpecificRole = activeProfile.organization_roles[currentOrgId];
      if (orgSpecificRole) {
        userRoleInOrg = orgSpecificRole;
      }
    }

    // Validación de seguridad: Si el usuario está en una org pero no tiene rol, denegar
    if (currentOrgId && !userRoleInOrg) {
      console.warn('⚠️ User has no role in current organization. Access denied.');
      return false;
    }

    // Definición de roles y sus permisos (roles estándar de RBAC)
    const roleDefinitions = {
      [ROLES.ADMIN]: { id: ROLES.ADMIN, permissions: [{ resource: '*', action: '*' }] },
      'admin': { id: 'admin', permissions: [{ resource: '*', action: '*' }] },  // Alias común
      'editor': { id: 'editor', permissions: [
        { resource: 'okrs', action: '*' },
        { resource: 'kpis', action: '*' },
        { resource: 'initiatives', action: '*' },
        { resource: 'objectives', action: '*' },
        { resource: 'perspectives', action: '*' }
      ]},
      'viewer': { id: 'viewer', permissions: [{ resource: '*', action: 'read' }] },
      'lector': { id: 'lector', permissions: [{ resource: '*', action: 'read' }] }  // Alias español
    };

    const normalizedRole = String(userRoleInOrg || '').toLowerCase();
    const roleDef = roleDefinitions[normalizedRole];
    const permissions = roleDef?.permissions || [];

    // Comprobar si algún permiso en el rol del usuario coincide con la acción/recurso solicitado.
    const hasPermission = permissions.some(p =>
        (p.resource === resource || p.resource === '*') &&
        (p.action === action || p.action === '*')
    );

    // Debug: Log si se deniega acceso
    if (!hasPermission) {
      console.debug(`[RBAC] Acceso denegado - Rol: ${normalizedRole}, Recurso: ${resource}, Acción: ${action}`);
    }

    return hasPermission;
  },

  // Push notifications: deshabilitadas hasta que se agregue push_subscription a profiles
  requestPushNotifications: async () => {
    // No-op: columna push_subscription no existe en la tabla profiles de Supabase.
    // Para habilitar: ALTER TABLE profiles ADD COLUMN push_subscription jsonb;
    return;
  }
});