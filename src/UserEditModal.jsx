import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const ROLES = [
  { value: 'admin',  label: 'Administrador', desc: 'Acceso completo' },
  { value: 'editor', label: 'Editor',         desc: 'Crear y editar' },
  { value: 'viewer', label: 'Lector',          desc: 'Solo lectura' },
];

export default function UserEditModal({ user, onClose, onRefresh }) {
  const isNew = !user?.id || user?.isNew;
  const [form, setForm] = useState({
    full_name:  user?.full_name  || '',
    email:      user?.email      || '',
    role:       user?.role       || 'viewer',
    job_title:  user?.job_title  || '',
    department: user?.department || '',
    photo_url:  user?.photo_url  || '',
    password:   user?.password   || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return notificationService.error('El nombre es requerido.');
    if (isNew && !form.email.trim()) return notificationService.error('El correo es requerido para nuevos usuarios.');
    setSaving(true);

    try {
      if (isNew) {
        // Crear usuario nuevo via Supabase Auth (requiere service role — usamos signup anónimo como fallback)
        const tempPassword = form.password || ('Temp' + Math.floor(1000 + Math.random() * 9000) + '@');
        
        // Intentar crear via admin si está disponible, sino via invite
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: form.email,
            password: tempPassword,
            email_confirm: true,
          });
          if (authError) throw authError;
          
          // Crear perfil
          await supabase.from('profiles').insert({
            id: authData.user.id,
            full_name: form.full_name,
            role: form.role,
            job_title: form.job_title,
            department: form.department,
            photo_url: form.photo_url || null,
            organization_id: user?.organization_id,
          });
        } catch {
          // Fallback: enviar invitación
          const { error: invErr } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
          });
          if (invErr) throw invErr;
          notificationService.success('Se envió invitación a ' + form.email);
        }
      } else {
        // Actualizar perfil existente
        const { error } = await supabase.from('profiles')
          .update({
            full_name:  form.full_name,
            role:       form.role,
            job_title:  form.job_title,
            department: form.department,
            photo_url:  form.photo_url || null,
          })
          .eq('id', user.id);
        if (error) throw error;
      }

      notificationService.success(isNew ? '✅ Usuario creado.' : '✅ Usuario actualizado.');
      if (onRefresh) onRefresh();
      if (onClose) onClose();
    } catch (err) {
      notificationService.error('Error: ' + err.message);
    } finally { setSaving(false); }
  };

  if (!user) return null;

  const inputStyle = { padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="sp-card" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
          {isNew ? '👤 Nuevo Usuario' : '✏️ Editar Usuario'}
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, var(--primary), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700, flexShrink: 0 }}>
              {form.photo_url ? <img src={form.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={e => { e.target.style.display='none'; }} /> : (form.full_name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>URL de Foto (opcional)</label>
              <input className="sp-input" type="url" placeholder="https://..." value={form.photo_url} onChange={e => setForm(f => ({...f, photo_url: e.target.value}))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre Completo *</label>
            <input className="sp-input" required value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="Nombre Apellido" style={inputStyle} />
          </div>

          {isNew && (
            <>
              <div>
                <label style={labelStyle}>Correo Electrónico *</label>
                <input className="sp-input" required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="usuario@empresa.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña temporal</label>
                <input className="sp-input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Se generará automáticamente si se deja vacío" style={inputStyle} />
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Puesto</label>
              <input className="sp-input" value={form.job_title} onChange={e => setForm(f => ({...f, job_title: e.target.value}))} placeholder="Gerente, Director..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Departamento</label>
              <input className="sp-input" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} placeholder="Ventas, Ops, RRHH..." style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Rol en el Sistema</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm(f => ({...f, role: r.value}))}
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
            <button type="submit" disabled={saving} className="sp-btn sp-btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
              {saving ? 'Guardando...' : isNew ? '✅ Crear Usuario' : '✅ Guardar Cambios'}
            </button>
            <button type="button" onClick={onClose} className="sp-btn" style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
