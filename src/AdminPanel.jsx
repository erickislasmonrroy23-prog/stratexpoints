import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { objectivesService, notificationService, organizationService } from './services.js';
import { useStore } from './store.js';
import { useAuditLogs } from './useAuditLogs.jsx';
import UserDirectory from './UserDirectory.jsx';
import BrandLogo from './BrandLogo.jsx';
import { BRAND } from './brand.js';
import { TabBar } from './SharedUI.jsx';

const card = { padding: 28, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 };
const h3 = { fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, color: 'var(--text)', marginBottom: 6 };
const lead = { fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6, maxWidth: '66ch' };

/* ───────────── Identidad institucional ───────────── */
function IdentityTab({ org, onSaved }) {
  const [form, setForm] = useState({
    name: org?.name && org.name !== 'Mi Organización' ? org.name : BRAND.legalName,
    mission: org?.mission || '',
    vision: org?.vision || '',
    values: org?.values || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const data = await organizationService.update(1, form);
      onSaved(data);
      notificationService.success('Identidad institucional guardada.');
    } catch (e) {
      notificationService.error('No se pudo guardar: ' + e.message);
    } finally { setSaving(false); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) return notificationService.error('Usa una imagen PNG, JPG, SVG o WEBP.');
    if (file.size > 3 * 1024 * 1024) return notificationService.error('El logo debe pesar menos de 3 MB.');
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `cyc/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
      const data = await organizationService.update(1, { logo_url: pub.publicUrl });
      onSaved(data);
      notificationService.success('Logo actualizado en toda la plataforma.');
    } catch (err) {
      notificationService.error('No se pudo subir el logo: ' + err.message);
    } finally { setUploading(false); }
  };

  const removeLogo = async () => {
    if (!window.confirm('¿Quitar el logo subido? Se mostrará el monograma C&C.')) return;
    try {
      const data = await organizationService.update(1, { logo_url: null });
      try { localStorage.removeItem('cyc-logo-url'); } catch { /* ignore */ }
      onSaved(data);
      notificationService.success('Logo retirado.');
    } catch (err) { notificationService.error(err.message); }
  };

  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
      <div style={card}>
        <h3 style={h3}>Identidad institucional</h3>
        <p style={lead}>Estos textos alimentan el Mapa Estratégico, el asistente de IA y los reportes exportados.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="sp-label">Razón social</label><input className="sp-input" value={form.name} onChange={set('name')} /></div>
          <div><label className="sp-label">Misión</label><textarea className="sp-input" rows={3} value={form.mission} onChange={set('mission')} /></div>
          <div><label className="sp-label">Visión</label><textarea className="sp-input" rows={3} value={form.vision} onChange={set('vision')} /></div>
          <div><label className="sp-label">Valores</label><textarea className="sp-input" rows={3} value={form.values} onChange={set('values')} placeholder="Integridad, rigor técnico, confidencialidad…" /></div>
          <button className="sp-btn" onClick={save} disabled={saving} style={{ background: 'var(--primary)', color: '#fff', alignSelf: 'flex-start', padding: '11px 22px' }}>
            {saving ? 'Guardando…' : 'Guardar identidad'}
          </button>
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Logotipo</h3>
        <p style={lead}>Sube el logo oficial (PNG con fondo transparente, de preferencia horizontal). Aparece en el encabezado, el inicio de sesión y los reportes.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 12, background: 'var(--bg)', border: '1px dashed var(--border)', marginBottom: 16 }}>
          <BrandLogo size={48} showProduct />
          <div style={{ padding: 20, borderRadius: 10, background: '#2B3442' }}>
            <BrandLogo size={40} light />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label className="sp-btn" style={{ background: 'var(--accent)', color: '#fff', cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Subiendo…' : 'Subir logo'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={uploadLogo} disabled={uploading} style={{ display: 'none' }} />
          </label>
          {org?.logo_url && (
            <button className="sp-btn" onClick={removeLogo} style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}>Quitar logo</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Seguridad de mi cuenta ───────────── */
function SecurityTab({ orgId }) {
  const [pwd, setPwd] = useState({ a: '', b: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [mfa, setMfa] = useState({ enabled: false, factors: [] });
  const [setup, setSetup] = useState({ qr: null, secret: '', factorId: '' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp || []).filter((f) => f.status === 'verified');
    setMfa({ enabled: verified.length > 0, factors: verified });
  };
  useEffect(() => { refreshMfa(); }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.a.length < 8) return notificationService.error('La contraseña debe tener al menos 8 caracteres.');
    if (pwd.a !== pwd.b) return notificationService.error('Las contraseñas no coinciden.');
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.a });
    setSavingPwd(false);
    if (error) return notificationService.error('No se pudo cambiar: ' + error.message);
    setPwd({ a: '', b: '' });
    notificationService.success('Contraseña actualizada.');
  };

  const startMfa = async () => {
    setBusy(true);
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of (existing?.totp || []).filter((x) => x.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'C&C Gestión Estratégica' });
      if (error) throw error;
      setSetup({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
    } catch (e) { notificationService.error('No se pudo iniciar 2FA: ' + e.message); }
    setBusy(false);
  };

  const verifyMfa = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: setup.factorId });
    if (chErr) { notificationService.error(chErr.message); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: setup.factorId, challengeId: ch.id, code });
    if (error) notificationService.error('Código incorrecto. Revisa tu app de autenticación.');
    else { notificationService.success('Verificación en dos pasos activada.'); setSetup({ qr: null, secret: '', factorId: '' }); setCode(''); await refreshMfa(); }
    setBusy(false);
  };

  const disableMfa = async (factorId) => {
    if (!window.confirm('¿Desactivar la verificación en dos pasos de tu cuenta?')) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) notificationService.error(error.message);
    await refreshMfa();
    setBusy(false);
  };

  const backfill = async () => {
    if (!orgId) return;
    if (!window.confirm('Se asignarán códigos (F1, C1, P1, A1…) a los objetivos que no tengan. ¿Continuar?')) return;
    try {
      const n = await objectivesService.backfillObjectiveCodes(orgId);
      notificationService.success(`Códigos asignados a ${n} objetivos.`);
    } catch (e) { notificationService.error('Error al asignar códigos: ' + e.message); }
  };

  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
      <div style={card}>
        <h3 style={h3}>Mi contraseña</h3>
        <p style={lead}>Al cambiarla, las sesiones abiertas en otros dispositivos se cerrarán.</p>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="sp-label">Nueva contraseña</label><input className="sp-input" type="password" value={pwd.a} onChange={(e) => setPwd({ ...pwd, a: e.target.value })} autoComplete="new-password" /></div>
          <div><label className="sp-label">Confirmar contraseña</label><input className="sp-input" type="password" value={pwd.b} onChange={(e) => setPwd({ ...pwd, b: e.target.value })} autoComplete="new-password" /></div>
          <button className="sp-btn" type="submit" disabled={savingPwd} style={{ background: 'var(--primary)', color: '#fff', alignSelf: 'flex-start', padding: '11px 22px' }}>
            {savingPwd ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      <div style={card}>
        <h3 style={h3}>Verificación en dos pasos</h3>
        <p style={lead}>Pide un código temporal de Google Authenticator o Authy al iniciar sesión.</p>
        {mfa.enabled ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 16, borderRadius: 10, background: 'var(--green-light)', border: '1px solid var(--green)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Activa en tu cuenta</span>
            <button className="sp-btn" onClick={() => disableMfa(mfa.factors[0].id)} disabled={busy} style={{ background: 'var(--bg2)', color: 'var(--red)', border: '1px solid var(--red)' }}>Desactivar</button>
          </div>
        ) : !setup.qr ? (
          <button className="sp-btn" onClick={startMfa} disabled={busy} style={{ background: 'var(--accent)', color: '#fff', padding: '11px 22px' }}>
            {busy ? 'Preparando…' : 'Activar verificación en dos pasos'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <img src={setup.qr} alt="Código QR para tu app de autenticación" style={{ width: 150, height: 150, background: '#fff', padding: 8, borderRadius: 10, border: '1px solid var(--border)' }} />
            <form onSubmit={verifyMfa} style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Clave manual: <strong style={{ color: 'var(--text)', userSelect: 'all' }}>{setup.secret}</strong></div>
              <label className="sp-label">Código de 6 dígitos</label>
              <input className="sp-input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 18, letterSpacing: 4, width: 150 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="sp-btn" type="submit" disabled={busy || code.length < 6} style={{ background: 'var(--primary)', color: '#fff' }}>Verificar</button>
                <button className="sp-btn" type="button" onClick={() => setSetup({ qr: null, secret: '', factorId: '' })} style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={h3}>Mantenimiento de datos</h3>
        <p style={lead}>Asigna códigos por perspectiva a los objetivos estratégicos que no tengan uno.</p>
        <button className="sp-btn" onClick={backfill} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Asignar códigos faltantes</button>
      </div>
    </div>
  );
}

/* ───────────── Bitácora de auditoría ───────────── */
function AuditTab({ orgId }) {
  const {
    auditLogs, loadingLogs, exportingLogs, startDate, setStartDate, endDate, setEndDate,
    searchLogQuery, setSearchLogQuery, currentPage, setCurrentPage, totalLogPages, exportLogsToExcel,
  } = useAuditLogs(orgId);
  const label = { CREATE: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja', INSERT: 'Alta' };
  const [names, setNames] = useState({});
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').then(({ data }) => {
      setNames(Object.fromEntries((data || []).map((p) => [p.id, p.full_name || p.email])));
    });
  }, []);

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h3 style={h3}>Bitácora de cambios</h3>
          <p style={{ ...lead, marginBottom: 0 }}>Registro de altas, cambios y bajas en OKRs, KPIs, objetivos e iniciativas.</p>
        </div>
        <button className="sp-btn" onClick={exportLogsToExcel} disabled={exportingLogs} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
          {exportingLogs ? 'Generando Excel…' : 'Exportar a Excel'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input className="sp-input" placeholder="Buscar por módulo o acción" value={searchLogQuery} onChange={(e) => { setSearchLogQuery(e.target.value); setCurrentPage(1); }} style={{ flex: 1, minWidth: 200 }} />
        <input className="sp-input" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} style={{ width: 'auto' }} aria-label="Desde" />
        <input className="sp-input" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} style={{ width: 'auto' }} aria-label="Hasta" />
      </div>
      {loadingLogs ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>Cargando bitácora…</div>
      ) : auditLogs.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 10 }}>Sin movimientos en el periodo seleccionado.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text3)' }}>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Fecha</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Usuario</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Movimiento</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Módulo</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Registro</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'var(--text2)' }}>{log.created_at ? new Date(log.created_at).toLocaleString('es-MX') : '—'}</td>
                  <td style={{ padding: '9px 10px' }}>{names[log.user_id] || 'Sistema'}</td>
                  <td style={{ padding: '9px 10px', color: log.action === 'DELETE' ? 'var(--red)' : 'var(--text)' }}>{label[log.action] || log.action}</td>
                  <td style={{ padding: '9px 10px' }}>{log.table_name}</td>
                  <td style={{ padding: '9px 10px', color: 'var(--text3)' }}>{String(log.record_id || '').split('-')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalLogPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button className="sp-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Página {currentPage} de {totalLogPages}</span>
          <button className="sp-btn" disabled={currentPage === totalLogPages} onClick={() => setCurrentPage((p) => Math.min(totalLogPages, p + 1))} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

/* ───────────── Accesos por expediente ───────────── */
function AccesosTab({ yo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [accesos, setAccesos] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [busca, setBusca] = useState('');
  const [guardando, setGuardando] = useState(null);

  const cargar = async () => {
    setCargando(true);
    const [u, c, a] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, is_super_admin, all_clients, portal_mode, job_title').order('full_name'),
      supabase.from('clients').select('id, name, color, logo_url, is_internal, status').order('is_internal', { ascending: false }).order('name'),
      supabase.from('client_access').select('user_id, client_id'),
    ]);
    if (u.error || c.error || a.error) notificationService.error('No se pudieron cargar los accesos.');
    setUsuarios(u.data || []);
    setClientes((c.data || []).filter((x) => x.status !== 'cerrado'));
    setAccesos(new Set((a.data || []).map((x) => x.user_id + ':' + x.client_id)));
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);

  const esAdmin = (u) => u.is_super_admin || ['admin', 'Admin', 'super_admin'].includes(u.role);
  const rol = (u) => (esAdmin(u) ? 'Administrador' : ['editor', 'Editor'].includes(u.role) ? 'Editor' : 'Lector');

  const alternarTotal = async (u) => {
    setGuardando(u.id);
    const { error } = await supabase.from('profiles').update({ all_clients: !u.all_clients }).eq('id', u.id);
    setGuardando(null);
    if (error) return notificationService.error(error.message);
    setUsuarios((l) => l.map((x) => (x.id === u.id ? { ...x, all_clients: !u.all_clients } : x)));
    notificationService.success(!u.all_clients ? `${u.full_name || u.email} ahora ve todos los expedientes.` : `${u.full_name || u.email} ahora solo ve los expedientes que le asignes.`);
  };

  const alternarPortal = async (u) => {
    setGuardando('p:' + u.id);
    const { error } = await supabase.from('profiles').update({ portal_mode: !u.portal_mode }).eq('id', u.id);
    setGuardando(null);
    if (error) return notificationService.error(error.message);
    setUsuarios((l) => l.map((x) => (x.id === u.id ? { ...x, portal_mode: !u.portal_mode } : x)));
    notificationService.success(!u.portal_mode ? `${u.full_name || u.email} verá el portal simplificado del cliente.` : `${u.full_name || u.email} verá la plataforma completa.`);
  };

  const alternar = async (u, c) => {
    const k = u.id + ':' + c.id;
    const tiene = accesos.has(k);
    setGuardando(k);
    const res = tiene
      ? await supabase.from('client_access').delete().eq('user_id', u.id).eq('client_id', c.id)
      : await supabase.from('client_access').insert({ user_id: u.id, client_id: c.id, granted_by: yo?.id || null });
    setGuardando(null);
    if (res.error) return notificationService.error(res.error.message);
    setAccesos((s) => { const n = new Set(s); if (tiene) n.delete(k); else n.add(k); return n; });
  };

  const visibles = usuarios.filter((u) => `${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(busca.toLowerCase()));
  const Logo = ({ c }) => (c.logo_url
    ? <img src={c.logo_url} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)' }} />
    : <span style={{ width: 22, height: 22, borderRadius: 6, background: c.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{c.name.charAt(0)}</span>);

  return (
    <div style={card}>
      <h3 style={h3}>Accesos por expediente</h3>
      <p style={lead}>
        Decide qué empresas ve cada persona. <strong>Acceso total</strong>: ve todos los expedientes.
        Si lo desactivas, solo verá los que marques (uno, varios o ninguno). Los administradores siempre ven todo.
        Lo aplica la base de datos: aunque alguien manipule la pantalla, no podrá ver expedientes que no tenga asignados.
      </p>
      <input className="sp-input" placeholder="Buscar persona" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 320, marginBottom: 16 }} />
      {cargando ? <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div> : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 300 + clientes.length * 110 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 12, color: 'var(--text3)', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg3)', zIndex: 2, minWidth: 220 }}>Persona</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--text3)', fontWeight: 600, background: 'var(--bg3)', minWidth: 96 }} title="Usuario del cliente: ve un portal simplificado con sus planes de acción y riesgos">Vista portal</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--text3)', fontWeight: 600, background: 'var(--bg3)', minWidth: 100 }}>Acceso total</th>
                {clientes.map((c) => (
                  <th key={c.id} style={{ padding: '10px 8px', fontSize: 11.5, color: 'var(--text2)', fontWeight: 600, background: 'var(--bg3)', minWidth: 100 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><Logo c={c} /><span style={{ lineHeight: 1.2 }}>{c.name}</span></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const admin = esAdmin(u);
                const total = admin || u.all_clients;
                const n = clientes.filter((c) => accesos.has(u.id + ':' + c.id)).length;
                return (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{rol(u)} · {admin ? 've todo' : total ? 'todos los expedientes' : n ? `${n} expediente(s)` : 'sin acceso'}</div>
                    </td>
                    <td style={{ textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                      {admin ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span> : (
                        <button role="switch" aria-checked={!!u.portal_mode} aria-label={`Vista portal para ${u.full_name || u.email}`}
                          disabled={guardando === 'p:' + u.id} onClick={() => alternarPortal(u)}
                          style={{ width: 44, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', background: u.portal_mode ? 'var(--primary)' : 'var(--border)', transition: 'background .2s' }}>
                          <span style={{ position: 'absolute', top: 3, left: u.portal_mode ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} />
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                      {admin ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>Siempre</span> : (
                        <button role="switch" aria-checked={u.all_clients} aria-label={`Acceso total para ${u.full_name || u.email}`}
                          disabled={guardando === u.id} onClick={() => alternarTotal(u)}
                          style={{ width: 44, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', background: u.all_clients ? 'var(--green)' : 'var(--border)', transition: 'background .2s' }}>
                          <span style={{ position: 'absolute', top: 3, left: u.all_clients ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} />
                        </button>
                      )}
                    </td>
                    {clientes.map((c) => {
                      const k = u.id + ':' + c.id;
                      const on = accesos.has(k);
                      return (
                        <td key={c.id} style={{ textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                          {total ? <span style={{ color: 'var(--green)', fontSize: 15 }} title="Incluido por acceso total">✓</span> : (
                            <input type="checkbox" checked={on} disabled={guardando === k} onChange={() => alternar(u, c)}
                              aria-label={`${u.full_name || u.email} puede ver ${c.name}`} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...lead, marginTop: 14, marginBottom: 0, fontSize: 12 }}>
        Los usuarios nuevos se crean <strong>sin acceso</strong>: después de darlos de alta, asígnales aquí sus expedientes.
        Activa <strong>Vista portal</strong> para personal de tus clientes: verán solo su semáforo, sus planes de acción (con carga de evidencia) y sus riesgos principales.
        El rol (Lector / Editor / Administrador) define qué pueden hacer dentro de los expedientes que ven.
      </p>
    </div>
  );
}

/* ───────────── Panel principal ───────────── */
export default function AdminPanel({ profile, onBack }) {
  const currentOrganization = useStore((s) => s.currentOrganization);
  const setCurrentOrganization = useStore((s) => s.setCurrentOrganization);
  const [tab, setTab] = useState('users');
  const org = currentOrganization;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <BrandLogo size={30} showProduct />
        <button className="header-action" onClick={onBack}>Volver al tablero</button>
      </header>

      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title">Administración</h1>
          <p className="page-subtitle">Usuarios, accesos por expediente, identidad institucional y seguridad.</p>
        </div>


        <div style={{ marginBottom: 24 }}>
          <TabBar
            tabs={[
              { id: 'users', icon: '👥', label: 'Usuarios' },
              { id: 'accesos', icon: '🔑', label: 'Accesos' },
              { id: 'identity', icon: '🏛️', label: 'Identidad' },
              { id: 'security', icon: '🔐', label: 'Seguridad' },
              { id: 'audit', icon: '📜', label: 'Bitácora' },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === 'users' && (
          <div style={card}>
            <h3 style={h3}>Usuarios del despacho</h3>
            <p style={lead}>Da de alta al equipo, asigna su rol (Administrador, Editor o Lector), restablece contraseñas o revoca el acceso.</p>
            <UserDirectory currentUserId={profile?.id} />
          </div>
        )}
        {tab === 'accesos' && <AccesosTab yo={profile} />}
        {tab === 'identity' && <IdentityTab org={org} onSaved={(o) => setCurrentOrganization({ ...org, ...o })} />}
        {tab === 'security' && <SecurityTab orgId={org?.id} />}
        {tab === 'audit' && <AuditTab orgId={org?.id} />}
      </main>
    </div>
  );
}
