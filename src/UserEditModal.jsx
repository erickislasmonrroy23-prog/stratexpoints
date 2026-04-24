import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import jsPDF from 'jspdf';

const ROLES = [
  { value: 'admin',  label: 'Administrador', desc: 'Acceso completo' },
  { value: 'editor', label: 'Editor',         desc: 'Crear y editar' },
  { value: 'viewer', label: 'Lector',          desc: 'Solo lectura' },
];

const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/create-tenant-user';

/** Genera y descarga el PDF de credenciales con todos los datos visibles */
function generateCredentialsPDF({ fullName, email, password, accessUrl, tenantName }) {
  const doc = new jsPDF();

  // ── Encabezado corporativo ──────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 48, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Bienvenido a ' + (tenantName || 'Xtratia'), 105, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Credenciales de acceso — Documento Confidencial', 105, 34, { align: 'center' });

  // ── Saludo ──────────────────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Hola, ' + fullName, 20, 66);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Se ha creado tu cuenta de acceso. Usa los datos siguientes para ingresar.', 20, 76);

  // ── Caja de credenciales ────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, 86, 170, 88, 4, 4, 'FD');

  // Enlace de acceso
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('🔗  ENLACE DE ACCESO', 28, 100);
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'normal');
  doc.text(accessUrl, 28, 110);

  // Correo
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('📧  CORREO DE ACCESO', 28, 124);
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(email, 28, 134);

  // Contraseña — caja amarilla destacada
  doc.setFillColor(254, 249, 195);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(20, 140, 170, 28, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('🔑  CONTRASEÑA TEMPORAL', 28, 150);
  doc.setFontSize(16);
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.text(password, 28, 162);

  // ── Instrucciones ───────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Pasos para ingresar:', 20, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Abre el enlace de acceso en tu navegador.', 24, 194);
  doc.text('2. Ingresa tu correo y la contraseña temporal que aparece en este documento.', 24, 204);
  doc.text('3. Por seguridad, cambia tu contraseña una vez que hayas ingresado.', 24, 214);

  // ── Pie de página ───────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 272, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento generado automáticamente por Xtratia Enterprise OS — Confidencial.', 105, 282, { align: 'center' });
  doc.text('Guarda este documento en un lugar seguro y no lo compartas por canales no cifrados.', 105, 289, { align: 'center' });

  doc.save('Credenciales_' + fullName.replace(/\s+/g, '_') + '.pdf');
  notificationService.success('📄 PDF de credenciales descargado.');
}

export default function UserEditModal({ user, onClose, onRefresh, tenant }) {
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
  const [saving, setSaving]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  // Credenciales generadas — se muestran en el modal hasta que el admin haga clic en Cerrar
  const [createdCreds, setCreatedCreds] = useState(null);

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
        const tempPassword = form.password || ('Xtratia@' + Math.floor(1000 + Math.random() * 9000));

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

        // Mostrar credenciales DENTRO del modal — NO cerrar hasta que el admin las vea
        setCreatedCreds({ email: form.email.trim().toLowerCase(), password: tempPassword });
        if (onRefresh) onRefresh();

      } else {
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
        if (onRefresh) onRefresh();
        if (onClose) onClose();
      }

    } catch (err) {
      const msg = err.message || 'Error desconocido';
      setErrorMsg(msg);
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

  // ── PANTALLA DE CREDENCIALES ── Se muestra después de crear el usuario
  if (createdCreds) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div className="sp-card scale-in" style={{
          width: '100%', maxWidth: 480, padding: 36, borderRadius: 20,
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            Usuario creado exitosamente
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
            Comparte estas credenciales con el usuario de forma segura.<br/>
            <strong style={{ color: 'var(--red)' }}>No podrás ver la contraseña de nuevo.</strong>
          </p>

          {/* Caja de credenciales */}
          <div style={{
            background: 'var(--bg3)', border: '2px solid var(--border)', borderRadius: 14,
            padding: 20, marginBottom: 20, textAlign: 'left'
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
                📧 Correo de acceso
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)'
              }}>
                <span style={{ flex: 1, fontSize: 14, fontFamily: 'monospace', color: 'var(--text)', fontWeight: 600 }}>
                  {createdCreds.email}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdCreds.email); notificationService.success('Correo copiado'); }}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', whiteSpace: 'nowrap' }}
                >
                  Copiar
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
                🔑 Contraseña temporal
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fef9c3', borderRadius: 8, padding: '10px 14px',
                border: '2px solid #fbbf24'
              }}>
                <span style={{ flex: 1, fontSize: 16, fontFamily: 'monospace', color: '#92400e', fontWeight: 800, letterSpacing: 2 }}>
                  {createdCreds.password}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdCreds.password); notificationService.success('Contraseña copiada'); }}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#fbbf24', border: 'none', cursor: 'pointer', color: '#78350f', whiteSpace: 'nowrap' }}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>

          {/* Botón PDF — incluye contraseña real */}
          <button
            onClick={() => {
              const accessUrl = tenant?.subdomain
                ? `https://${tenant.subdomain}.xtratia.com`
                : (tenant?.subdomain ? `${window.location.origin}/?org=${tenant.subdomain}` : window.location.origin);
              generateCredentialsPDF({
                fullName:   form.full_name || createdCreds.email,
                email:      createdCreds.email,
                password:   createdCreds.password,
                accessUrl,
                tenantName: tenant?.name || 'Xtratia',
              });
            }}
            className="sp-btn"
            style={{
              width: '100%', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15,
              marginBottom: 10, background: '#1e3a8a', color: '#fff', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            📄 Descargar PDF de Credenciales
          </button>

          <button
            onClick={onClose}
            className="sp-btn sp-btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15 }}
          >
            ✔ Ya guardé las credenciales — Cerrar
          </button>
        </div>
      </div>
    );
  }

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
            El usuario podrá iniciar sesión <strong>inmediatamente</strong> sin confirmar email.
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
