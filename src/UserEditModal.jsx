import React, { useRef } from 'react';

export default function UserEditModal({ 
  editingUser, 
  setEditingUser, 
  onSave, 
  tenant, // <-- NUEVO: Pasamos la información del tenant actual
  onCancel, 
  onPhotoUpload, 
  uploadingAvatar 
}) {
  const avatarInputRef = useRef(null);

  // Lógica interna para manejar puestos personalizados
  const predefinedJobs = tenant?.job_titles || ["Director", "Gerente", "Jefe", "Coordinador", "Supervisor", "Administrativo"];
  const isCustomJob = editingUser.jobTitle === 'Otro' || (editingUser.jobTitle && !predefinedJobs.includes(editingUser.jobTitle));
  const selectJobVal = isCustomJob ? 'Otro' : (editingUser.jobTitle || '');

  // Lógica interna para manejar departamentos personalizados
  const tenantDepts = tenant?.departments || ["Dirección General", "Ventas", "Finanzas"];
  const isCustomDeptUser = editingUser.department === 'Otro' || (editingUser.department && !tenantDepts.includes(editingUser.department));
  const selectDeptUserVal = isCustomDeptUser ? 'Otro' : (editingUser.department || '');

  const availableRoles = tenant?.roles || [{ id: 'editor', name: 'Editor', description: 'Permisos básicos de edición.' }];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div className="scale-in" style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 700, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
          <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 4px rgba(37,99,235,0.1)' }}>{editingUser.isNew ? '✨' : '✏️'}</div>
            {editingUser.isNew ? 'Añadir Nuevo Colaborador' : 'Editar Colaborador'}
          </h3>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none', lineHeight: 1 }}>×</button>
        </div>
        
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div><label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Nombre Completo</label><input className="sp-input" style={{ fontSize: 14, padding: '14px 16px', borderRadius: 14 }} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Ej: Ana López" /></div>
              <div>
                <label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Puesto / Jerarquía</label>
                <select className="sp-input" style={{ fontSize: 14, padding: '14px 16px', borderRadius: 14 }} value={selectJobVal} onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})}>
                  <option value="">Seleccionar puesto...</option>
                  {predefinedJobs.map(job => <option key={job} value={job}>{job}</option>)}
                  <option value="Otro">Otro</option>
                </select>
                {isCustomJob && (
                  <input className="sp-input scale-in" style={{ marginTop: 8, padding: '10px 16px', borderRadius: 12, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} autoFocus placeholder="Escribe el puesto..." value={editingUser.jobTitle === 'Otro' ? '' : editingUser.jobTitle} onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})} />
                )}
              </div>
            </div>
            
            <div>
              <label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>📂 Asignación de Área (Segregación de Datos)</label>
              <select className="sp-input" style={{ fontSize: 14, padding: '14px 16px', borderRadius: 14 }} value={selectDeptUserVal} onChange={e => setEditingUser({...editingUser, department: e.target.value})}>
                <option value="">Vista Global (Sin restricción de área)</option>
                {tenantDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                <option value="Otro">Otro área...</option>
              </select>
              {isCustomDeptUser && <input className="sp-input scale-in" style={{ marginTop: 8, padding: '10px 16px', borderRadius: 12, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} autoFocus placeholder="Escribe el área..." value={editingUser.department === 'Otro' ? '' : editingUser.department} onChange={e => setEditingUser({...editingUser, department: e.target.value})} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div><label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Correo Electrónico</label><input className="sp-input" type="email" style={{ fontSize: 14, padding: '14px 16px', borderRadius: 14 }} value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="ana@empresa.com" /></div>
              {editingUser.isNew ? (
                <div><label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Contraseña Temporal</label><input className="sp-input" type="text" style={{ fontSize: 14, padding: '14px 16px', borderRadius: 14 }} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="Ej: Temp1234*" /></div>
              ) : <div/>}
            </div>

            <div>
              <label className="sp-label" style={{ marginBottom: 12 }}>Nivel de Acceso y Autorización (Rol)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {availableRoles.map(role => (
                  <div key={role.id} onClick={() => setEditingUser({...editingUser, role: role.id})} style={{ padding: 20, borderRadius: 16, border: `2px solid ${String(editingUser.role).toLowerCase() === String(role.id).toLowerCase() ? 'var(--primary)' : 'var(--border)'}`, background: String(editingUser.role).toLowerCase() === String(role.id).toLowerCase() ? 'var(--primary-light)' : 'var(--bg2)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                    {String(editingUser.role).toLowerCase() === String(role.id).toLowerCase() && <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--primary)', fontSize: 16 }}>✔</div>}
                    <div style={{ fontSize: 24, marginBottom: 12 }}>{role.icon || '👤'}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: String(editingUser.role).toLowerCase() === String(role.id).toLowerCase() ? 'var(--primary)' : 'var(--text)', marginBottom: 6 }}>{role.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{role.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <input type="file" ref={avatarInputRef} onChange={onPhotoUpload} style={{ display: 'none' }} accept="image/*" />
            {editingUser.photoUrl ? (
              <img src={editingUser.photoUrl} alt="Perfil" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg3)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
            )}
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="sp-btn" style={{ background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--text)', padding: '10px 16px', borderRadius: 12, transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              {uploadingAvatar ? '⏳ Subiendo...' : editingUser.photoUrl ? 'Cambiar Foto' : 'Subir Fotografía'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onCancel} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '14px 28px', borderRadius: 99 }}>Cancelar</button>
            <button onClick={onSave} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff', padding: '14px 32px', borderRadius: 99, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
              💾 Guardar Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}