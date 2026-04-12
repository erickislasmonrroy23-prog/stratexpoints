import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

export default function UserDirectory({ users = [], onEditUser, onRefresh, canEdit = false }) {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [changingPwdUser, setChangingPwdUser] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (user) => {
    if (!window.confirm('Eliminar a ' + (user.full_name || user.email) + '? Esta accion no se puede deshacer.')) return;
    setDeletingId(user.id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      notificationService.success('Usuario eliminado correctamente.');
      if (onRefresh) onRefresh();
    } catch (e) {
      notificationService.error('Error al eliminar: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) return notificationService.error('Minimo 6 caracteres.');
    if (newPwd !== confirmPwd) return notificationService.error('Las contrasenas no coinciden.');
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(changingPwdUser.id, { password: newPwd });
      if (error) {
        // Fallback: enviar magic link de reset si no hay permisos admin
        const { error: e2 } = await supabase.auth.resetPasswordForEmail(changingPwdUser.email);
        if (e2) throw e2;
        notificationService.success('Se envio un enlace de cambio de contrasena al correo del usuario.');
      } else {
        notificationService.success('Contrasena actualizada correctamente.');
      }
      setChangingPwdUser(null); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      notificationService.error('Error: ' + err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const roleColors = {
    admin:  { bg: '#ede9fe', color: '#6d28d9' },
    editor: { bg: '#dbeafe', color: '#1d4ed8' },
    viewer: { bg: '#dcfce7', color: '#15803d' },
  };

  return (
    <div>
      <input
        className="sp-input"
        placeholder="Buscar por nombre, email o rol..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
      />

      {changingPwdUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sp-card" style={{ padding: 32, width: 420, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginBottom: 4, color: 'var(--text)', fontSize: 18 }}>Cambiar contrasena</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>{changingPwdUser.full_name || changingPwdUser.email}</p>
            <form onSubmit={handleChangePwd}>
              <label className="sp-label" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Nueva contrasena</label>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  className="sp-input"
                  type={showNewPwd ? 'text' : 'password'}
                  placeholder="Minimo 6 caracteres"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  style={{ padding: '12px 40px 12px 14px', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                  required
                />
                <button type="button" onClick={() => setShowNewPwd(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                  {showNewPwd ? 'x' : 'o'}
                </button>
              </div>
              <label className="sp-label" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Confirmar contrasena</label>
              <input
                className="sp-input"
                type="password"
                placeholder="Repite la contrasena"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
                required
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={pwdLoading}
                  className="sp-btn sp-btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  {pwdLoading ? 'Guardando...' : 'Guardar contrasena'}
                </button>
                <button type="button"
                  onClick={() => { setChangingPwdUser(null); setNewPwd(''); setConfirmPwd(''); }}
                  className="sp-btn"
                  style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 14 }}>No se encontraron usuarios.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => {
            const rs = roleColors[u.role] || { bg: '#f3f4f6', color: '#374151' };
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12,
                background: 'var(--bg2)', border: '1px solid var(--border)', gap: 12, flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 180 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 15, overflow: 'hidden'
                  }}>
                    {u.photo_url
                      ? <img src={u.photo_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                      : (u.full_name || u.email || '?')[0].toUpperCase()
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{u.full_name || '(Sin nombre)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email} {u.job_title ? '· ' + u.job_title : ''}</div>
                  </div>
                </div>

                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: rs.bg, color: rs.color, whiteSpace: 'nowrap' }}>
                  {(u.role || 'viewer').toUpperCase()}
                </span>

                {canEdit && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onEditUser && onEditUser(u)}
                      title="Editar datos del usuario"
                      style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => setChangingPwdUser(u)}
                      title="Cambiar contrasena"
                      style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer' }}>
                      Contrasena
                    </button>
                    <button onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      title="Eliminar usuario"
                      style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}>
                      {deletingId === u.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
