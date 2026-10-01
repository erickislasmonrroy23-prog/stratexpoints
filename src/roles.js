// Roles de C&C — misma lógica que las funciones app_role()/can_edit()/is_admin() de la base.
// Mantener ambos lados alineados: la base es la autoridad, la app solo refleja.
export const ROL = { ADMIN: 'admin', EDITOR: 'editor', LECTOR: 'viewer' };

export const ROL_ETIQUETA = { admin: 'Administrador', editor: 'Editor', viewer: 'Lector' };

/** Normaliza el rol de un perfil a admin | editor | viewer (null si no hay perfil). */
export function rolDe(profile) {
  if (!profile) return null;
  if (profile.is_super_admin || ['admin', 'Admin', 'super_admin'].includes(profile.role)) return ROL.ADMIN;
  if (['editor', 'Editor'].includes(profile.role)) return ROL.EDITOR;
  return ROL.LECTOR;
}

/** ¿El rol puede ejecutar la acción? read | create | update | delete | admin */
export function permite(rol, accion) {
  if (!rol) return false;
  if (rol === ROL.ADMIN) return true;
  if (accion === 'read') return true;
  if (rol === ROL.EDITOR) return accion === 'create' || accion === 'update';
  return false;
}
