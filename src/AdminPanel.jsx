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
const h3 = { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20, color: 'var(--text)', marginBottom: 6 };
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
          <button className="sp-btn" onClick={save} disabled={saving} style={{ background: 'var(--primary)', color: 'var(--bg2)', alignSelf: 'flex-start', padding: '11px 22px' }}>
            {saving ? 'Guardando…' : 'Guardar identidad'}
          </button>
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Logotipo</h3>
        <p style={lead}>Sube el logo oficial (PNG con fondo transparente, de preferencia horizontal). Aparece en el encabezado, el inicio de sesión y los reportes.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 12, background: 'var(--bg)', border: '1px dashed var(--border)', marginBottom: 16 }}>
          <BrandLogo size={48} showProduct />
          <div style={{ padding: 20, borderRadius: 10, background: '#0A2029' }}>
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
          <button className="sp-btn" type="submit" disabled={savingPwd} style={{ background: 'var(--primary)', color: 'var(--bg2)', alignSelf: 'flex-start', padding: '11px 22px' }}>
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
                <button className="sp-btn" type="submit" disabled={busy || code.length < 6} style={{ background: 'var(--primary)', color: 'var(--bg2)' }}>Verificar</button>
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
          <h1 className="page-title" style={{ fontSize: 30 }}>Administración</h1>
          <p className="page-subtitle">Usuarios del despacho, identidad institucional y seguridad de acceso.</p>
        </div>


        <div style={{ marginBottom: 24 }}>
          <TabBar
            tabs={[
              { id: 'users', icon: '👥', label: 'Usuarios' },
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
        {tab === 'identity' && <IdentityTab org={org} onSaved={(o) => setCurrentOrganization({ ...org, ...o })} />}
        {tab === 'security' && <SecurityTab orgId={org?.id} />}
        {tab === 'audit' && <AuditTab orgId={org?.id} />}
      </main>
    </div>
  );
}
