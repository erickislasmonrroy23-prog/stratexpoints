import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const ROLES = [
  {
    id: 'admin',
    label: 'Administrador',
    icon: '👑',
    color: '#dc2626',
    bg: '#fee2e2',
    desc: 'Acceso total a todos los módulos y configuraciones.',
    permissions: {
      okrs: ['ver','crear','editar','eliminar'],
      kpis: ['ver','crear','editar','eliminar'],
      initiatives: ['ver','crear','editar','eliminar'],
      ai: ['ver','usar'],
      analytics: ['ver'],
      reports: ['ver','exportar'],
      alerts: ['ver','crear','eliminar'],
      users: ['ver','crear','editar','eliminar'],
      billing: ['ver','editar'],
      branding: ['ver','editar'],
    }
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: '✏️',
    color: '#f59e0b',
    bg: '#fef9c3',
    desc: 'Puede crear y editar contenido, sin acceso a administración.',
    permissions: {
      okrs: ['ver','crear','editar'],
      kpis: ['ver','crear','editar'],
      initiatives: ['ver','crear','editar'],
      ai: ['ver','usar'],
      analytics: ['ver'],
      reports: ['ver','exportar'],
      alerts: ['ver','crear'],
      users: [],
      billing: [],
      branding: [],
    }
  },
  {
    id: 'viewer',
    label: 'Lector',
    icon: '👁️',
    color: '#16a34a',
    bg: '#dcfce7',
    desc: 'Solo puede visualizar información, sin modificar datos.',
    permissions: {
      okrs: ['ver'],
      kpis: ['ver'],
      initiatives: ['ver'],
      ai: ['ver'],
      analytics: ['ver'],
      reports: ['ver'],
      alerts: ['ver'],
      users: [],
      billing: [],
      branding: [],
    }
  },
];

const MODULE_LABELS = {
  okrs: 'OKRs', kpis: 'KPIs', initiatives: 'Iniciativas',
  ai: 'IA', analytics: 'Analítica', reports: 'Reportes',
  alerts: 'Alertas', users: 'Usuarios', billing: 'Facturación', branding: 'Marca',
};

const PERM_LABELS = {
  ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar',
  usar: 'Usar', exportar: 'Exportar',
};

export default function RoleManagement({ organizationId }) {
  const [selected, setSelected] = useState('admin');
  const [saving, setSaving] = useState(false);

  const role = ROLES.find(r => r.id === selected);

  const saveRolesToDB = async () => {
    setSaving(true);
    try {
      // Guardar la configuración de roles en la organización
      const rolesConfig = {};
      ROLES.forEach(r => { rolesConfig[r.id] = r.permissions; });
      const { error } = await supabase.from('organizations')
        .update({ modules: { ...rolesConfig, _roles_config: true } })
        .eq('id', organizationId);
      if (error) throw error;
      notificationService.success('Configuración de roles guardada correctamente.');
    } catch (e) { notificationService.error('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>
        Define los permisos de cada rol dentro de tu organización. Los cambios aplican a todos los usuarios con ese rol.
      </div>

      {/* Selector de rol */}
      <div style={{ display: 'flex', gap: 10 }}>
        {ROLES.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
              background: selected === r.id ? r.color + '15' : 'var(--bg2)',
              border: '2px solid ' + (selected === r.id ? r.color : 'var(--border)'),
              transition: 'all 0.18s',
            }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: selected === r.id ? r.color : 'var(--text)' }}>{r.label}</div>
          </button>
        ))}
      </div>

      {/* Info del rol */}
      {role && (
        <>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: role.bg, border: '1px solid ' + role.color + '40' }}>
            <div style={{ fontWeight: 700, color: role.color, fontSize: 14, marginBottom: 4 }}>{role.icon} {role.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{role.desc}</div>
          </div>

          {/* Tabla de permisos */}
          <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', border: '1px solid var(--border)' }}>Módulo</th>
                  {['ver','crear','editar','eliminar','exportar','usar'].map(p => (
                    <th key={p} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', border: '1px solid var(--border)' }}>
                      {PERM_LABELS[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODULE_LABELS).map(([mod, label]) => {
                  const perms = role.permissions[mod] || [];
                  return (
                    <tr key={mod} style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)', border: '1px solid var(--border)' }}>
                        {label}
                      </td>
                      {['ver','crear','editar','eliminar','exportar','usar'].map(p => (
                        <td key={p} style={{ padding: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                          {perms.includes(p) ? (
                            <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
                          ) : (
                            <span style={{ color: '#e2e8f0', fontSize: 16 }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveRolesToDB} disabled={saving} className="sp-btn sp-btn-primary"
              style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
              {saving ? 'Guardando...' : '💾 Guardar Configuración de Roles'}
            </button>
            <button onClick={() => notificationService.info('Rol ' + role.label + ' copiado al portapapeles.')}
              style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              📋 Copiar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
