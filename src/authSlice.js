import { supabase } from './supabase.js';
import { deepEqual } from 'fast-equals'; // Importa la función de comparación profunda
import { ROLES } from './constants.js';

export const createAuthSlice = (set, get) => ({
  user: null,
  profile: null,
  currentOrganization: null,   // alias de profile.organizations para compatibilidad con módulos
  impersonatedProfile: null,
  isSystemOwner: false,
  setAuth: (newUser, newProfile) => {
    const current = get();
    // Solo actualiza si el usuario o el perfil han cambiado realmente (comparación profunda)
    if (!deepEqual(current.user, newUser) || !deepEqual(current.profile, newProfile)) {
      const org = newProfile?.organizations || null;
      const isOwner = !!(newProfile?.is_super_admin || newProfile?.role === 'super_admin');
      set({ user: newUser, profile: newProfile, currentOrganization: org, isSystemOwner: isOwner });
    }
  },
  setImpersonatedProfile: (profile) => set({ impersonatedProfile: profile }),
  clearImpersonation: () => set({ impersonatedProfile: null }),

  // Evaluador de Permisos ABAC (Attribute-Based Access Control)
  can: (action, resource) => {
    const { profile, impersonatedProfile, user } = get();

    // Regla 1: El Super Administrador real (no impersonado) o el usuario específico tienen acceso a todo.
    // Este es el nivel más alto de privilegio.
    // Si el perfil activo es de Super Administrador de la plataforma (is_super_admin: true), tiene acceso total.
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

    // Regla 2: Evaluar permisos basados en el rol del usuario dentro de su organización.
    const tenantRoles = activeProfile.organizations?.roles || [ // Roles por defecto si la organización no tiene roles personalizados definidos.
      // Roles por defecto si la organización no tiene roles personalizados definidos.
      { id: ROLES.ADMIN, permissions: [{ resource: '*', action: '*' }] },
      { id: 'editor', permissions: [{ resource: 'okrs', action: '*' }, { resource: 'kpis', action: '*' }, { resource: 'initiatives', action: '*' }] },
      { id: 'viewer', permissions: [{ resource: '*', action: 'read' }] }
    ];

    const roleDef = tenantRoles.find(r => String(r.id).toLowerCase() === String(activeProfile.role || '').toLowerCase());
    const permissions = roleDef?.permissions || [];

    // Comprobar si algún permiso en el rol del usuario coincide con la acción/recurso solicitado.
    const hasPermission = permissions.some(p =>
        (p.resource === resource || p.resource === '*') &&
        (p.action === action || p.action === '*')
    );

    return hasPermission;
  },

  // Push notifications: deshabilitadas hasta que se agregue push_subscription a profiles
  requestPushNotifications: async () => {
    // No-op: columna push_subscription no existe en la tabla profiles de Supabase.
    // Para habilitar: ALTER TABLE profiles ADD COLUMN push_subscription jsonb;
    return;
  }
});