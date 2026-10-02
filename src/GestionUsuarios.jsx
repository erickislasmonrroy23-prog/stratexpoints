import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { Modal } from './SharedUI.jsx';

/* ─────────────────────────────────────────────────────────────
   Usuarios — una sola pantalla de control
   Por persona: TIPO (Administrador · Consultor · Cliente) + EMPRESAS.
   · Administrador: ve y controla todo.
   · Consultor (equipo C&C): trabaja en todas las empresas o en las elegidas.
   · Cliente: ve un portal simple de su(s) empresa(s) y sube evidencia/documentos.
   ───────────────────────────────────────────────────────────── */

const TIPOS = {
  administrador: { t: 'Administrador', d: 'Controla todo: usuarios, empresas y configuración.', c: '#0071E3' },
  consultor: { t: 'Consultor', d: 'Equipo C&C. Captura y edita en sus empresas.', c: '#248A3D' },
  cliente: { t: 'Cliente', d: 'Portal simple: su empresa, sus pendientes y documentos.', c: '#C93400' },
};
const URL_ALTA = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/create-tenant-user';
const URL_PASS = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/change-user-password';
const URL_BAJA = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/delete-user';

const tipoDe = (u) => (u.is_super_admin || ['admin', 'Admin', 'super_admin'].includes(u.role) ? 'administrador' : ['editor', 'Editor'].includes(u.role) ? 'consultor' : 'cliente');
const generarPassword = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return 'CyC-' + Array.from(crypto.getRandomValues(new Uint32Array(10))).map((n) => c[n % c.length]).join('');
};
async function llamar(url, body) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token}` }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

function SelectorEmpresas({ clientes, valor, onChange, permitirTodas, todas, onTodas }) {
  return (
    <div>
      {permitirTodas && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={todas} onChange={(e) => onTodas(e.target.checked)} style={{ width: 18, height: 18 }} /> Todas las empresas
        </label>
      )}
      {!todas && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {clientes.map((c) => {
            const on = valor.includes(c.id);
            return (
              <button type="button" key={c.id} onClick={() => onChange(on ? valor.filter((x) => x !== c.id) : [...valor, c.id])}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 99, fontSize: 13, cursor: 'pointer',
                  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-light)' : 'var(--bg2)', color: on ? 'var(--primary)' : 'var(--text2)', fontWeight: on ? 600 : 400 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color }} />{c.name}{on ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditarUsuario({ usuario, clientes, accesos, yo, onCerrar, onGuardado }) {
  const nuevo = !usuario;
  const [f, setF] = useState(() => ({
    full_name: usuario?.full_name || '', email: usuario?.email || '', password: nuevo ? generarPassword() : '',
    tipo: usuario ? tipoDe(usuario) : 'cliente', todas: usuario ? !!usuario.all_clients : false,
    empresas: usuario ? accesos.filter((a) => a.user_id === usuario.id).map((a) => a.client_id) : [],
  }));
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const soyYo = usuario?.id === yo?.id;

  const guardar = async () => {
    if (nuevo && (!f.full_name.trim() || !f.email.trim())) return notificationService.error('Nombre y correo son obligatorios.');
    if (f.tipo !== 'administrador' && !(f.tipo === 'consultor' && f.todas) && f.empresas.length === 0) return notificationService.error('Elige al menos una empresa.');
    setGuardando(true);
    try {
      let id = usuario?.id;
      if (nuevo) {
        if (f.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const r = await llamar(URL_ALTA, { email: f.email.trim(), password: f.password, full_name: f.full_name.trim(), role: 'viewer' });
        id = r.userId;
      }
      const { error } = await supabase.rpc('fn_configurar_usuario', { p_user: id, p_tipo: f.tipo, p_todas: f.tipo === 'consultor' && f.todas, p_empresas: f.empresas });
      if (error) throw new Error(error.message);
      if (!nuevo && f.password) await llamar(URL_PASS, { userId: id, newPassword: f.password });
      notificationService.success(nuevo ? 'Usuario creado.' : 'Usuario actualizado.');
      if (nuevo || f.password) setCreado({ email: f.email.trim(), password: f.password });
      else { onGuardado(); onCerrar(); }
    } catch (e) { notificationService.error(e.message); }
    setGuardando(false);
  };

  if (creado) {
    const texto = `Acceso a la plataforma de Cabrera & Consultores\n${window.location.origin}\nCorreo: ${creado.email}\nContraseña: ${creado.password}`;
    return (
      <div>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 14 }}>Comparte estos datos con la persona. Por seguridad, la contraseña no se volverá a mostrar.</p>
        <pre style={{ background: 'var(--bg3)', padding: 16, borderRadius: 14, fontSize: 14, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', margin: 0 }}>{texto}</pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="sp-btn" onClick={() => { navigator.clipboard.writeText(texto); notificationService.success('Copiado.'); }} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Copiar</button>
          <button className="sp-btn" onClick={() => { onGuardado(); onCerrar(); }} style={{ background: 'var(--primary)', color: '#fff' }}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {nuevo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 12 }}>
          <div><label className="sp-label">Nombre completo</label><input className="sp-input" value={f.full_name} onChange={set('full_name')} autoFocus /></div>
          <div><label className="sp-label">Correo</label><input className="sp-input" type="email" value={f.email} onChange={set('email')} /></div>
        </div>
      )}
      <div>
        <label className="sp-label">Tipo de usuario</label>
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(TIPOS).map(([k, v]) => (
            <label key={k} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 14, cursor: soyYo ? 'not-allowed' : 'pointer',
              border: `1.5px solid ${f.tipo === k ? v.c : 'var(--border)'}`, background: f.tipo === k ? 'var(--bg3)' : 'var(--bg2)', opacity: soyYo && k !== 'administrador' ? 0.5 : 1 }}>
              <input type="radio" name="tipo" checked={f.tipo === k} disabled={soyYo} onChange={() => setF((x) => ({ ...x, tipo: k }))} style={{ marginTop: 3 }} />
              <div><div style={{ fontWeight: 600, color: v.c }}>{v.t}</div><div style={{ fontSize: 13, color: 'var(--text3)' }}>{v.d}</div></div>
            </label>
          ))}
        </div>
      </div>
      {f.tipo !== 'administrador' && (
        <div>
          <label className="sp-label">Empresas que puede ver</label>
          <SelectorEmpresas clientes={clientes} valor={f.empresas} onChange={(v) => setF((x) => ({ ...x, empresas: v }))}
            permitirTodas={f.tipo === 'consultor'} todas={f.tipo === 'consultor' && f.todas} onTodas={(v) => setF((x) => ({ ...x, todas: v }))} />
        </div>
      )}
      <div>
        <label className="sp-label">{nuevo ? 'Contraseña inicial' : 'Nueva contraseña (opcional)'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="sp-input" value={f.password} onChange={set('password')} placeholder={nuevo ? '' : 'Déjala vacía para no cambiarla'} style={{ fontFamily: 'ui-monospace, monospace' }} />
          <button type="button" className="sp-btn" onClick={() => setF((x) => ({ ...x, password: generarPassword() }))} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Generar</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cancelar</button>
        <button className="sp-btn" onClick={guardar} disabled={guardando} style={{ background: 'var(--primary)', color: '#fff' }}>{guardando ? 'Guardando…' : nuevo ? 'Crear usuario' : 'Guardar'}</button>
      </div>
    </div>
  );
}

export default function GestionUsuarios({ yo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(async () => {
    const [u, c, a] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, is_super_admin, all_clients, portal_mode').order('full_name'),
      supabase.from('clients').select('id, name, color, status').neq('status', 'cerrado').order('is_internal', { ascending: false }).order('name'),
      supabase.from('client_access').select('user_id, client_id'),
    ]);
    setUsuarios((u.data || []).filter((x) => x.email)); setClientes(c.data || []); setAccesos(a.data || []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.full_name || u.email}? Ya no podrá entrar a la plataforma.`)) return;
    try { await llamar(URL_BAJA, { userId: u.id }); notificationService.success('Usuario eliminado.'); cargar(); }
    catch (e) { notificationService.error(e.message); }
  };

  const visibles = usuarios.filter((u) => `${u.full_name || ''} ${u.email}`.toLowerCase().includes(busca.toLowerCase()));
  const empresasDe = (u) => {
    const t = tipoDe(u);
    if (t === 'administrador') return 'Todas';
    if (u.all_clients && t === 'consultor') return 'Todas';
    const ids = accesos.filter((a) => a.user_id === u.id).map((a) => a.client_id);
    const nombres = clientes.filter((c) => ids.includes(c.id)).map((c) => c.name);
    return nombres.length ? nombres.join(', ') : 'Sin empresas asignadas';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="sp-input" placeholder="Buscar persona" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="sp-btn" onClick={() => setModal({})} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 20px' }}>+ Nuevo usuario</button>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {visibles.map((u, i) => {
          const t = tipoDe(u); const sinEmpresa = empresasDe(u) === 'Sin empresas asignadas';
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i ? '1px solid var(--border)' : 'none', flexWrap: 'wrap', background: 'var(--bg2)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 99, background: TIPOS[t].c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {(u.full_name || u.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{u.full_name || u.email}{u.id === yo?.id ? <span style={{ color: 'var(--text3)', fontWeight: 400 }}> (tú)</span> : null}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>{u.email}</div>
              </div>
              <span className="sp-badge" style={{ background: 'var(--bg3)', color: TIPOS[t].c, fontWeight: 600 }}>{TIPOS[t].t}</span>
              <div style={{ flex: '1 1 200px', fontSize: 13, color: sinEmpresa ? 'var(--red)' : 'var(--text2)' }}>{empresasDe(u)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="sp-btn" onClick={() => setModal({ usuario: u })} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '7px 14px' }}>Editar</button>
                {u.id !== yo?.id && <button className="sp-btn" onClick={() => eliminar(u)} aria-label={`Eliminar ${u.full_name || u.email}`} style={{ background: 'var(--bg2)', color: 'var(--red)', border: '1px solid var(--border)', padding: '7px 12px' }}>Eliminar</button>}
              </div>
            </div>
          );
        })}
        {visibles.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>Sin resultados.</div>}
      </div>
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.usuario ? (modal.usuario.full_name || modal.usuario.email) : 'Nuevo usuario'} maxWidth={620}>
        {modal && <EditarUsuario usuario={modal.usuario} clientes={clientes} accesos={accesos} yo={yo} onCerrar={() => setModal(null)} onGuardado={cargar} />}
      </Modal>
    </div>
  );
}
