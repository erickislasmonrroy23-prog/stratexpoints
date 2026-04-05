import React, { useState } from 'react';
import { notificationService } from './services.js';

export default function RoleManagement({ tenant, onUpdate }) {
  // Roles por defecto en caso de que el tenant no tenga ninguno configurado aún
  const roles = tenant?.roles || [
    { id: 'admin', icon: '⚡', name: 'Admin Empresa', description: 'Acceso total a la empresa, invita usuarios y edita la marca.', permissions: [{ resource: '*', action: '*' }] },
    { id: 'editor', icon: '✏️', name: 'Editor Operativo', description: 'Permite crear y actualizar OKRs, KPIs e Iniciativas.', permissions: [{ resource: 'okrs', action: '*' }, { resource: 'kpis', action: '*' }, { resource: 'initiatives', action: '*' }] },
    { id: 'viewer', icon: '👁️', name: 'Solo Lectura', description: 'Acceso limitado. Solo visualización de mapas y reportes.', permissions: [{ resource: '*', action: 'read' }] }
  ];

  const [editingRole, setEditingRole] = useState(null);

  const resources = [
    { id: 'okrs', label: '🎯 OKRs' },
    { id: 'kpis', label: '📊 KPIs' },
    { id: 'initiatives', label: '🚀 Iniciativas' },
    { id: 'users', label: '👥 Usuarios' },
    { id: 'billing', label: '💳 Facturación' }
  ];

  const actions = [
    { id: 'read', label: 'Ver' },
    { id: 'create', label: 'Crear' },
    { id: 'update', label: 'Editar' },
    { id: 'delete', label: 'Eliminar' }
  ];

  const handleAddRole = () => {
    setEditingRole({
      id: `role_${Date.now()}`,
      icon: '👤',
      name: '',
      description: '',
      permissions: [],
      isNew: true
    });
  };

  const togglePermission = (resourceId, actionId) => {
    const currentPerms = [...editingRole.permissions];
    const permIndex = currentPerms.findIndex(p => p.resource === resourceId && p.action === actionId);
    
    if (permIndex > -1) {
      currentPerms.splice(permIndex, 1); // Quitar permiso
    } else {
      currentPerms.push({ resource: resourceId, action: actionId }); // Añadir permiso
    }
    setEditingRole({ ...editingRole, permissions: currentPerms });
  };

  const hasPermission = (resourceId, actionId) => {
    // Si tiene permiso universal '*' o permiso específico
    return editingRole.permissions.some(p => 
      (p.resource === '*' || p.resource === resourceId) && 
      (p.action === '*' || p.action === actionId)
    );
  };

  const saveRole = () => {
    if (!editingRole.name.trim()) {
      return notificationService.error("El nombre del rol es obligatorio.");
    }
    
    let newRoles;
    if (editingRole.isNew) {
      const { isNew, ...roleData } = editingRole;
      newRoles = [...roles, roleData];
    } else {
      newRoles = roles.map(r => r.id === editingRole.id ? editingRole : r);
    }
    
    onUpdate('roles', newRoles);
    setEditingRole(null);
  };

  const deleteRole = (roleId) => {
    if (roleId === 'admin') {
      return notificationService.error("No puedes eliminar el rol de Administrador principal.");
    }
    
    const confirmed = window.confirm("¿Estás seguro de eliminar este rol? Los usuarios asignados a él podrían perder acceso o funcionalidades.");
    if (!confirmed) return;
    
    const newRoles = roles.filter(r => r.id !== roleId);
    onUpdate('roles', newRoles);
  };

  return (
    <div className="sp-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234, 179, 8, 0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            Roles y Permisos Dinámicos
          </h3>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Crea roles personalizados y define exactamente qué puede ver y hacer cada colaborador.
          </div>
        </div>
        <button onClick={handleAddRole} className="sp-btn scale-in" style={{ padding: '10px 20px', borderRadius: 99, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          + Crear Rol Personalizado
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {roles.map(role => (
          <div key={role.id} style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 24 }}>{role.icon}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditingRole(role)} className="icon-btn" style={{ width: 28, height: 28, fontSize: 12 }} title="Editar rol">✏️</button>
                {role.id !== 'admin' && (
                  <button onClick={() => deleteRole(role.id)} className="delete-btn" style={{ width: 28, height: 28, fontSize: 12 }} title="Eliminar rol">🗑</button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{role.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4, flex: 1, marginBottom: 16 }}>{role.description}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 8px', borderRadius: 6, display: 'inline-block', alignSelf: 'flex-start' }}>
              {role.permissions.length} Reglas asignadas
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Crear/Editar Rol */}
      {editingRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="scale-in" style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 700, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
              <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234, 179, 8, 0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
                {editingRole.isNew ? 'Diseñar Nuevo Rol' : `Editar Rol: ${editingRole.name}`}
              </h3>
              <button onClick={() => setEditingRole(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none' }}>×</button>
            </div>
            
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16 }}>
                <div><label className="sp-label">Icono</label><input className="sp-input" style={{ fontSize: 24, textAlign: 'center', padding: '10px' }} value={editingRole.icon} onChange={e => setEditingRole({...editingRole, icon: e.target.value})} maxLength={2} /></div>
                <div><label className="sp-label">Nombre del Rol</label><input className="sp-input" style={{ fontSize: 14, padding: '14px 16px' }} value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="Ej: Auditor Financiero" /></div>
              </div>
              
              <div>
                <label className="sp-label">Descripción</label>
                <input className="sp-input" style={{ fontSize: 14, padding: '14px 16px' }} value={editingRole.description} onChange={e => setEditingRole({...editingRole, description: e.target.value})} placeholder="Ej: Puede ver KPIs financieros pero no editarlos..." />
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg3)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                  Matriz de Permisos (ABAC)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Módulo / Recurso</th>
                        {actions.map(a => <th key={a.id} style={{ textAlign: 'center', padding: '12px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>{a.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map(res => (
                        <tr key={res.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{res.label}</td>
                          {actions.map(act => (
                            <td key={act.id} style={{ textAlign: 'center', padding: '12px 8px' }}>
                              <input type="checkbox" disabled={editingRole.id === 'admin'} checked={hasPermission(res.id, act.id)} onChange={() => togglePermission(res.id, act.id)} style={{ accentColor: 'var(--gold)', width: 18, height: 18, cursor: editingRole.id === 'admin' ? 'not-allowed' : 'pointer' }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingRole(null)} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px' }}>Cancelar</button>
              <button onClick={saveRole} className="sp-btn" style={{ background: 'var(--gold)', color: '#fff', padding: '12px 32px', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.3)' }}>💾 Guardar Reglas de Acceso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}