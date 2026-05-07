import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import UserEditModal from './UserEditModal.jsx';

const ROLE_CONFIG = {
  admin:       { label: 'Admin',       color: '#dc2626', bg: '#fee2e2' },
  Admin:       { label: 'Admin',       color: '#dc2626', bg: '#fee2e2' },
  editor:      { label: 'Editor',      color: '#f59e0b', bg: '#fef9c3' },
  viewer:      { label: 'Lector',      color: '#16a34a', bg: '#dcfce7' },
  super_admin: { label: 'Super Admin', color: '#6366f1', bg: '#eef2ff' },
};

export default function UserDirectory({ organizationId, onDownloadPDF, tenant }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editUser, setEditUser]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [passModal, setPassModal] = useState(null);
  const [newPass, setNewPass]     = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const loadUsers = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, organization_roles, job_title, department, photo_url, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // MEJORADO: Enriquecer datos con rol específico por organización (multi-tenant)
      const enrichedUsers = (data || []).map(user => ({
        ...user,
        // Determinar el rol a mostrar: primero org-específico, luego rol global
        displayRole: (user.organization_roles && user.organization_roles[organizationId])
          ? user.organization_roles[organizationId]
          : (user.role || 'viewer')
      }));

      setUsers(enrichedUsers);
    } catch (e) {
      notificationService.error('Error cargando usuarios: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, [organizationId]);

  const handleDelete = async (userId, userName) => {
    if (!window.confirm('¿Eliminar a ' + userName + '? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      notificationService.success('Usuario eliminado.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) { notificationService.error('Error: ' + e.message); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passModal?.email) return notificationService.error('El usuario no tiene correo registrado.');
    setSavingPass(true);
    try {
      // supabase.auth.admin requiere service_role (no disponible en cliente).
      // Alternativa segura: enviar email de restablecimiento al usuario.
      const { error } = await supabase.auth.resetPasswordForEmail(passModal.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      notificationService.success(`✅ Se envió un enlace de restablecimiento de contraseña a ${passModal.email}.`);
      setPassModal(null);
      setNewPass('');
    } catch (err) { notificationService.error('Error: ' + err.message); }
    finally { setSavingPass(false); }
  };

  const filtered = users.filter(u =>
    !search ||
    (u.full_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.email||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.department||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.role||'').toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) => (name||'?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
        <div>Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input className="sp-input" placeholder="Buscar por nombre, correo, rol..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, fontSize: 13 }} />
        <button onClick={() => setShowCreate(true)} className="sp-btn sp-btn-primary"
          style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
          + Nuevo Usuario
        </button>
        <button onClick={loadUsers}
          style={{ padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)' }}>
          🔄
        </button>
      </div>

      {/* Stat bar */}
      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text3)' }}>
        <span>{users.length} usuarios totales</span>
        <span>·</span>
        <span>{users.filter(u => (u.displayRole || u.role) === 'admin' || (u.displayRole || u.role) === 'Admin').length} admins</span>
        <span>·</span>
        <span>{filtered.length} mostrados</span>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg2)', borderRadius: 12, border: '2px dashed var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {search ? 'Sin resultados para "' + search + '"' : 'Sin usuarios registrados'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(user => {
            // MEJORADO: Usar displayRole (específico por organización) si existe, sino usar role global
            const userRole = user.displayRole || user.role;
            const roleConf = ROLE_CONFIG[userRole] || { label: userRole || 'N/A', color: '#6b7280', bg: '#f3f4f6' };
            return (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)',
              }}>
                {/* Avatar */}
                {user.photo_url ? (
                  <img src={user.photo_url} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'white',
                  }}>
                    {initials(user.full_name)}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.full_name || 'Sin nombre'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {user.job_title && <span>{user.job_title} · </span>}
                    {user.department && <span>{user.department}</span>}
                    {!user.job_title && !user.department && <span>Sin puesto asignado</span>}
                  </div>
                </div>

                {/* Role badge */}
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: roleConf.bg, color: roleConf.color, flexShrink: 0 }}>
                  {roleConf.label}
                </span>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditUser(user)} title="Editar"
                    style={{ padding: '5px 8px', borderRadius: 6, fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    ✏️
                  </button>
                  <button onClick={() => { setPassModal(user); setNewPass(''); }} title="Restablecer contraseña"
                    style={{ padding: '5px 8px', borderRadius: 6, fontSize: 12, background: '#fef9c3', border: '1px solid #fbbf24', cursor: 'pointer' }}>
                    🔑
                  </button>
                  {onDownloadPDF && (
                    <button onClick={() => onDownloadPDF(user)} title="Descargar PDF de acceso"
                      style={{ padding: '5px 8px', borderRadius: 6, fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      📄
                    </button>
                  )}
                  <button onClick={() => handleDelete(user.id, user.full_name)} title="Eliminar"
                    style={{ padding: '5px 8px', borderRadius: 6, fontSize: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal editar usuario existente */}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onRefresh={loadUsers}
        />
      )}

      {/* Modal crear nuevo usuario — pasa tenant para el PDF de credenciales */}
      {showCreate && (
        <UserEditModal
          user={{ isNew: true, organization_id: organizationId }}
          onClose={() => setShowCreate(false)}
          onRefresh={loadUsers}
          tenant={tenant}
        />
      )}

      {/* Modal cambiar contraseña — envía email de restablecimiento (admin API requiere service_role) */}
      {passModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="sp-card" style={{ width: '100%', maxWidth: 420, padding: 28, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 8, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              🔑 Restablecer Contraseña
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
              Se enviará un enlace de restablecimiento al correo de <strong style={{ color: 'var(--text)' }}>{passModal.full_name}</strong>:
              <br /><span style={{ color: 'var(--primary)' }}>{passModal.email}</span>
            </p>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={savingPass} className="sp-btn sp-btn-primary" style={{ flex: 1, padding: '11px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                {savingPass ? 'Enviando...' : '📧 Enviar Enlace de Acceso'}
              </button>
              <button type="button" onClick={() => setPassModal(null)} className="sp-btn" style={{ flex: 1, padding: '11px', borderRadius: 8, fontSize: 13 }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
