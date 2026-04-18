import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const ROLES = [
  { value: 'admin',  label: 'Administrador', desc: 'Acceso completo' },
  { value: 'editor', label: 'Editor',         desc: 'Crear y editar' },
  { value: 'viewer', label: 'Lector',          desc: 'Solo lectura' },
];

// URL de la Edge Function de Supabase (usa service_role, crea usuario + perfil sin RLS)
const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/create-tenant-user';

export default function UserEditModal({ user, onClose, onRefresh }) {
  const isNew = !user?.id || user?.isNew;

  const [form, setForm] = useState({
    full_name:  user?.full_name  || '',
    email:      user?.email      || '',
    role:       user?.role       || 'viewer',
    job_title:  user?.job_title  || '',
    department: user?.department || '',
    photo_url:  user?.photo_url  || '',
    password:   '',
  });
  const [saving, setSaving]     = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.full_name.trim()) return setErrorMsg('El nombre es requerido.');
    if (isNew && !form.email.trim()) return setErrorMsg('El correo es requerido.');
    if (isNew && form.password && form.password.length < 8)
      return setErrorMsg('La contraseña debe tener al menos 8 caracteres.');

    setSaving(true);

    try {
      if (isNew) {
        // ─── CREAR USUARIO VÍA EDGE FUNCTION ─────────────────────────────────
        // supabase.auth.admin requiere service_role (no disponible en browser).
        // La Edge Function lo tiene y también confirma el email automáticamente.
        const tempPassword = form.password || ('Xtratia@' + Math.floor(1000 + Math.random() * 9000));

        // Obtener JWT actual del super admin para autorizar la Edge Function
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

        const res = await fetch(EDGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email:           form.email.trim().toLowerCase(),
            password:        tempPassword,
            full_name:       form.full_name.trim(),
            role:            form.role,
            organization_id: user?.organization_id || null,
            job_title:       form.job_title  || null,
            department:      form.department || null,
            photo_url:       form.photo_url  || null,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `Error ${res.status}`);

        // Mostrar contraseña temporal al super admin para que la entregue al usuario
        notificationService.success(
          `✅ Usuario creado y listo para usar.\n` +
          `📧 Correo: ${form.email}\n` +
          `🔑 Contraseña temporal: ${tempPassword}\n` +
          `(Compártela de forma segura con el usuario)`
        );

      } else {
        // ─── ACTUALIZAR PERFIL EXISTENTE ──────────────────────────────────────
        const { error } = await supabase.from('profiles')
          .update({
            full_name:  form.full_name.trim(),
            role:       form.role,
            job_title:  form.job_title  || null,
            department: form.department || null,
            photo_url:  form.photo_url  || null,
          })
          .eq('id', user.id);
        if (error) throw error;
        notificationService.success('✅ Usuario actualizado correctamente.');
      }

      if (onRefresh) onRefresh();
      if (onClose) onClose();

    } catch (err) {
      const msg = err.message || 'Error desconocido';
      setErrorMsg(msg);
      notificationService.error('Error: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const inputStyle = {
    padding: '10px 12px', borderRadius: 8, fontSize: 14,
    width: '100%', boxSizing: 'border-box'
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: 'var(--text3)',
    display: 'block', marginBottom: 4, textTransform: 'uppercase'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="sp-card" style={{
        width: '100%', maxWidth: 500, padding: 32, borderRadius: 20,
        boxShadow: '0 24px 48px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: 4, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
          {isNew ? '👤 Nuevo Usuario' : '✏️ Editar Usuario'}
        </h3>
        {isNew && (
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
            El usuario podrá iniciar sesión inmediatamente con el correo y contraseña que asignes.
          </p>
        )}

        {/* Banner de error */}
        {errorMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <span>❌</span><span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: 'white', fontWeight: 700,
            }}>
              {form.photo_url
                ? <img src={form.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={e => { e.target.style.display = 'none'; }} />
                : (form.full_name || '?')[0].toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>URL de Foto (opcional)</label>
              <input className="sp-input" type="url" placeholder="https://..." value={form.photo_url}
                onChange={e => { setErrorMsg(''); setForm(f => ({ ...f, photo_url: e.target.value })); }}
                style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre Completo *</label>
            <input className="sp-input" required value={form.full_name}
              onChange={e => { setErrorMsg(''); setForm(f => ({ ...f, full_name: e.target.value })); }}
              placeholder="Nombre Apellido" style={inputStyle} />
          </div>

          {isNew && (
            <>
              <div>
                <label style={labelStyle}>Correo Electrónico *</label>
                <input className="sp-input" required type="email" value={form.email}
                  onChange={e => { setErrorMsg(''); setForm(f => ({ ...f, email: e.target.value })); }}
                  placeholder="usuario@empresa.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña Temporal</label>
                <input className="sp-input" type="text" value={form.password}
                  onChange={e => { setErrorMsg(''); setForm(f => ({ ...f, password: e.target.value })); }}
                  placeholder="Mín. 8 caracteres. Se genera automáticamente si se deja vacío."
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }} />
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  💡 Guarda esta contraseña — la verás una sola vez al crear el usuario.
                </p>
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Puesto</label>
              <input className="sp-input" value={form.job_title}
                onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                placeholder="Director, Gerente..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Departamento</label>
              <input className="sp-input" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="Ventas, Ops, RRHH..." style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Rol en el Sistema</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s',
                    background: form.role === r.value ? 'var(--primary)' : 'var(--bg2)',
                    color: form.role === r.value ? 'white' : 'var(--text)',
                    border: '1.5px solid ' + (form.role === r.value ? 'var(--primary)' : 'var(--border)'),
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{r.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" disabled={saving} className="sp-btn sp-btn-primary"
              style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
              {saving
                ? (isNew ? '⏳ Creando usuario...' : '⏳ Guardando...')
                : (isNew ? '✅ Crear Usuario' : '✅ Guardar Cambios')
              }
            </button>
            <button type="button" onClick={onClose} className="sp-btn"
              style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
