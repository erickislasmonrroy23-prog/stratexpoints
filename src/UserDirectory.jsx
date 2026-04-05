import React, { useState } from 'react';
import LazyAvatar from './LazyAvatar.jsx';
import { notificationService } from './services.js';
import * as XLSX from 'xlsx';

export default function UserDirectory({ tenant, onAddUser, onEditUser, onDownloadPDF, onSendInvite }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const users = tenant?.users || [];
  const maxUsers = tenant?.maxUsers || 5;

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUserPages = Math.ceil(filteredUsers.length / 10) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * 10, currentPage * 10);

  const isNewUser = (createdAt) => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  };

  const exportToExcel = () => {
    if (filteredUsers.length === 0) {
      notificationService.error("No hay usuarios para exportar.");
      return;
    }
    
    const rows = [
      ["Nombre Completo", "Correo Electrónico", "Rol / Acceso", "Puesto", "Área / Departamento", "Fecha de Registro", "Estado"]
    ];
    
    filteredUsers.forEach(u => {
      const roleStr = String(u.role).toLowerCase() === 'admin' ? 'Admin Empresa' : String(u.role).toLowerCase() === 'editor' ? 'Editor' : 'Viewer';
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
      const statusStr = isNewUser(u.createdAt) ? 'Nuevo' : 'Activo';
      
      rows.push([
        u.name || '',
        u.email || '',
        roleStr,
        u.jobTitle || 'Colaborador',
        u.department || 'General',
        dateStr,
        statusStr
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch: 30}, {wch: 35}, {wch: 18}, {wch: 25}, {wch: 25}, {wch: 18}, {wch: 12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    XLSX.writeFile(wb, `Directorio_Usuarios_${tenant?.name?.replace(/\s+/g, '_') || 'Empresa'}.xlsx`);
  };

  return (
    <div className="sp-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13, 148, 136, 0.15)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
            Directorio de Colaboradores
          </h3>
          <div style={{ fontSize: 13, color: users.length >= maxUsers ? 'var(--red)' : 'var(--text3)' }}>
            Licencias usadas: <strong>{users.length} de {maxUsers}</strong> permitidas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={exportToExcel} className="sp-btn" style={{ padding: '10px 16px', borderRadius: 99, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 12 }}>
            📥 Exportar Excel
          </button>
          <button 
            onClick={users.length >= maxUsers ? undefined : onAddUser} 
            disabled={users.length >= maxUsers}
            title={users.length >= maxUsers ? "Límite de licencias alcanzado. Contacta a soporte para ampliar tu plan." : "Crear nueva cuenta de acceso"}
            className="sp-btn scale-in" 
            style={{ padding: '10px 20px', borderRadius: 99, background: users.length >= maxUsers ? 'var(--bg3)' : 'var(--text)', color: users.length >= maxUsers ? 'var(--text3)' : 'var(--bg)', boxShadow: users.length >= maxUsers ? 'none' : '0 4px 12px rgba(0,0,0,0.1)', cursor: users.length >= maxUsers ? 'not-allowed' : 'pointer' }}
          >
            + Añadir Nuevo Usuario
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }}>🔍</span>
        <input 
          className="sp-input" 
          value={searchQuery} 
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
          placeholder="Buscar colaborador por nombre, correo, puesto o área..." 
          style={{ paddingLeft: 36, borderRadius: 12 }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13, background: 'var(--bg3)', borderRadius: 10, border: '1px dashed var(--border)' }}>
            No se encontraron usuarios que coincidan con "{searchQuery}".
          </div>
        ) : paginatedUsers.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '14px 16px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = 'var(--primary-light)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <LazyAvatar user={u} tenantThemeColor={tenant.themeColor} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.name}
                  {isNewUser(u.createdAt) && <span className="sp-badge" style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '2px 6px', fontSize: 10, border: 'none' }}>✨ Nuevo</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.jobTitle || 'Colaborador'} {u.department && `(${u.department})`} • {u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="sp-badge" style={{ background: String(u.role).toLowerCase() === 'admin' ? 'var(--gold)20' : String(u.role).toLowerCase() === 'editor' ? 'var(--primary-light)' : 'var(--bg2)', color: String(u.role).toLowerCase() === 'admin' ? 'var(--gold)' : String(u.role).toLowerCase() === 'editor' ? 'var(--primary)' : 'var(--text2)', border: '1px solid var(--border)' }}>{String(u.role).toLowerCase() === 'admin' ? '⚡ Admin Empresa' : String(u.role).toLowerCase() === 'editor' ? '✏️ Editor' : '👁️ Viewer'}</span>
              <button onClick={() => onDownloadPDF(u)} className="sp-btn" style={{ padding: '8px 16px', borderRadius: 99, fontSize: 11, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'} title="Descargar credenciales de acceso">📄 PDF Accesos</button>
              <button onClick={() => onSendInvite(u)} className="sp-btn" style={{ padding: '8px 16px', borderRadius: 99, fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>✉️ Enviar Acceso</button>
              <button onClick={() => onEditUser(u)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, padding: '8px', borderRadius: 12, transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background = 'var(--text)'; e.currentTarget.style.color = 'var(--bg)';}} onMouseLeave={e => {e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text2)';}} title="Editar usuario">✏️</button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredUsers.length > 10 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="sp-btn" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', color: currentPage === 1 ? 'var(--text3)' : 'var(--text)', opacity: currentPage === 1 ? 0.5 : 1 }}>← Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Página {currentPage} de {totalUserPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalUserPages))} disabled={currentPage === totalUserPages} className="sp-btn" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', color: currentPage === totalUserPages ? 'var(--text3)' : 'var(--text)', opacity: currentPage === totalUserPages ? 0.5 : 1 }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}