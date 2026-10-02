import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { Modal, EmptyState } from './SharedUI.jsx';

/* ─────────────────────────────────────────────────────────────
   Expedientes por empresa — portafolio de clientes de C&C
   Cada expediente aísla su Mapa Estratégico, OKRs, KPIs, iniciativas
   y Matriz de Riesgos y Controles (aislamiento aplicado en la base).
   ───────────────────────────────────────────────────────────── */

const ESTADOS = { activo: 'Activo', en_pausa: 'En pausa', cerrado: 'Cerrado' };
const COLORES = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#1D1D1F'];

/** Cambia el expediente activo del usuario y recarga la app con sus datos. */
export async function activarExpediente(clientId) {
  const prof = useStore.getState().profile;
  if (!prof?.id) return;
  const interno = (useStore.getState().clients || []).find((c) => c.is_internal);
  const { error } = await supabase.from('profiles')
    .update({ current_client_id: clientId === interno?.id ? null : clientId })
    .eq('id', prof.id);
  if (error) { notificationService.error('No se pudo cambiar de expediente: ' + error.message); return; }
  try { sessionStorage.setItem('cyc-modulo', 'home'); } catch { /* sin almacenamiento */ }
  window.location.reload();
}

function Tarjeta({ c, s, actual, onAbrir, onEditar, puedeEditar }) {
  const sem = !s ? 'var(--text3)' : s.criticos || s.planes_vencidos ? 'var(--red)' : s.fuera_apetito || s.deficiencias ? 'var(--gold)' : 'var(--green)';
  return (
    <div className="sp-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, outline: actual ? '2px solid var(--primary)' : 'none' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {c.logo_url ? (
          <img src={c.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            {(c.name || '?').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{[c.industry, c.engagement].filter(Boolean).join(' · ') || 'Sin giro registrado'}</div>
        </div>
        <span title="Semáforo del expediente" style={{ width: 10, height: 10, borderRadius: 99, background: sem, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          ['Riesgos', s?.riesgos ?? 0], ['Críticos', s?.criticos ?? 0, s?.criticos ? 'var(--red)' : null],
          ['Fuera de apetito', s?.fuera_apetito ?? 0, s?.fuera_apetito ? 'var(--gold)' : null],
          ['Deficiencias', s?.deficiencias ?? 0, s?.deficiencias ? 'var(--gold)' : null],
          ['Planes vencidos', s?.planes_vencidos ?? 0, s?.planes_vencidos ? 'var(--red)' : null],
          ['Objetivos', s?.objetivos ?? 0],
        ].map(([t, v, col]) => (
          <div key={t} style={{ background: 'var(--bg3)', borderRadius: 12, padding: '8px 10px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: col || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text3)' }}>
        <span className="sp-badge" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>{ESTADOS[c.status]}</span>
        <span>Apetito ≤ {c.risk_appetite}</span>
        {c.is_internal && <span className="sp-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>Interno</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="sp-btn" onClick={onAbrir} disabled={actual} style={{ flex: 1, background: actual ? 'var(--bg3)' : 'var(--primary)', color: actual ? 'var(--text3)' : '#fff' }}>
          {actual ? 'Expediente abierto' : 'Abrir expediente'}
        </button>
        {puedeEditar && <button className="sp-btn" onClick={onEditar} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Editar</button>}
      </div>
    </div>
  );
}

function FormExpediente({ cliente, personas, puedeBorrar, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => ({
    name: '', legal_name: '', industry: '', engagement: '', period_start: '', period_end: '', lead_id: '',
    risk_appetite: 9, color: '#0071E3', status: 'activo', notes: '', logo_url: null, ...(cliente || {}),
  }));
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmar, setConfirmar] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  const subirLogo = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 3 * 1024 * 1024) return notificationService.error('Usa una imagen de menos de 3 MB.');
    setSubiendo(true);
    const ruta = `clientes/${Date.now()}-${file.name.replace(/[^\w.]+/g, '_')}`;
    const { error } = await supabase.storage.from('logos').upload(ruta, file, { upsert: true, contentType: file.type });
    setSubiendo(false);
    if (error) return notificationService.error('No se pudo subir el logo: ' + error.message);
    setF((x) => ({ ...x, logo_url: supabase.storage.from('logos').getPublicUrl(ruta).data.publicUrl }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return notificationService.error('El nombre del expediente es obligatorio.');
    setGuardando(true);
    const payload = {
      name: f.name.trim(), legal_name: f.legal_name || null, industry: f.industry || null, engagement: f.engagement || null,
      period_start: f.period_start || null, period_end: f.period_end || null, lead_id: f.lead_id || null,
      risk_appetite: Number(f.risk_appetite), color: f.color, status: f.status, notes: f.notes || null, logo_url: f.logo_url || null,
      updated_at: new Date().toISOString(),
    };
    const res = cliente
      ? await supabase.from('clients').update(payload).eq('id', cliente.id).select().single()
      : await supabase.from('clients').insert(payload).select().single();
    setGuardando(false);
    if (res.error) return notificationService.error('No se pudo guardar: ' + res.error.message);
    notificationService.success(cliente ? 'Expediente actualizado.' : 'Expediente creado.');
    onGuardado(res.data, !cliente);
  };

  const borrar = async () => {
    const { error } = await supabase.from('clients').delete().eq('id', cliente.id);
    if (error) return notificationService.error('No se pudo eliminar: ' + error.message);
    notificationService.success('Expediente eliminado con toda su información.');
    onGuardado(null, false);
  };

  return (
    <form onSubmit={guardar}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 14, alignItems: 'center' }}>
          {f.logo_url ? <img src={f.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)' }} />
            : <div style={{ width: 56, height: 56, borderRadius: 14, background: f.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22 }}>{(f.name || '?').charAt(0).toUpperCase()}</div>}
          <label className="sp-btn" style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            {subiendo ? 'Subiendo…' : 'Subir logo del cliente'}
            <input type="file" accept="image/*" onChange={subirLogo} style={{ display: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORES.map((c) => <button key={c} type="button" onClick={() => setF((x) => ({ ...x, color: c }))} aria-label={`Color ${c}`}
              style={{ width: 22, height: 22, borderRadius: 99, background: c, border: f.color === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />)}
          </div>
        </div>
        <div><label className="sp-label">Nombre del expediente</label><input className="sp-input" value={f.name} onChange={set('name')} placeholder="ActiveCapital" required /></div>
        <div><label className="sp-label">Razón social</label><input className="sp-input" value={f.legal_name || ''} onChange={set('legal_name')} /></div>
        <div><label className="sp-label">Giro / industria</label><input className="sp-input" value={f.industry || ''} onChange={set('industry')} placeholder="SOFOM, hospital, retail…" /></div>
        <div><label className="sp-label">Tipo de servicio</label><input className="sp-input" value={f.engagement || ''} onChange={set('engagement')} placeholder="Auditoría interna, ERM, estrategia…" /></div>
        <div><label className="sp-label">Inicio del servicio</label><input type="date" className="sp-input" value={f.period_start || ''} onChange={set('period_start')} /></div>
        <div><label className="sp-label">Fin del servicio</label><input type="date" className="sp-input" value={f.period_end || ''} onChange={set('period_end')} /></div>
        <div><label className="sp-label">Socio / responsable</label>
          <select className="sp-input" value={f.lead_id || ''} onChange={set('lead_id')}>
            <option value="">Sin asignar</option>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select></div>
        <div><label className="sp-label">Estado</label>
          <select className="sp-input" value={f.status} onChange={set('status')}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="sp-label">Apetito de riesgo: residual máximo aceptable = {f.risk_appetite} ({f.risk_appetite <= 4 ? 'Bajo' : f.risk_appetite <= 9 ? 'Moderado' : f.risk_appetite <= 16 ? 'Alto' : 'Crítico'})</label>
          <input type="range" min={1} max={25} value={f.risk_appetite} onChange={set('risk_appetite')} style={{ width: '100%' }} />
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Los riesgos con residual por encima de este valor se marcan como "fuera de apetito" en la matriz y generan alerta.</div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Notas del expediente</label><textarea className="sp-input" rows={3} value={f.notes || ''} onChange={set('notes')} /></div>
      </div>

      {cliente && puedeBorrar && !cliente.is_internal && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'var(--red-light)' }}>
          <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Eliminar expediente</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Se borrarán su mapa estratégico, OKRs, KPIs, iniciativas, riesgos, controles y planes. El respaldo diario conserva 30 días. Escribe el nombre para confirmar.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="sp-input" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder={cliente.name} />
            <button type="button" className="sp-btn" disabled={confirmar.trim() !== cliente.name} onClick={borrar} style={{ background: 'var(--red)', color: '#fff' }}>Eliminar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <button type="button" className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cancelar</button>
        <button type="submit" className="sp-btn" disabled={guardando} style={{ background: 'var(--primary)', color: '#fff' }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export default function ModuloExpedientes() {
  const can = useStore.use.can();
  const actual = useStore((s) => s.currentClient);
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({});
  const [personas, setPersonas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState('activos');

  const cargar = useCallback(async () => {
    setCargando(true);
    const [c, s, p] = await Promise.all([
      supabase.from('clients').select('*').order('is_internal', { ascending: false }).order('name'),
      supabase.rpc('fn_portafolio'),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
    ]);
    if (c.error) notificationService.error('No se pudieron cargar los expedientes: ' + c.error.message);
    setClientes(c.data || []);
    setStats(Object.fromEntries((s.data || []).map((x) => [x.client_id, x])));
    setPersonas(p.data || []);
    useStore.setState({ clients: c.data || [] });
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = clientes.filter((c) => filtro === 'todos' || (filtro === 'activos' ? c.status !== 'cerrado' : c.status === 'cerrado'));
  const tot = Object.values(stats).reduce((a, s) => ({
    riesgos: a.riesgos + s.riesgos, criticos: a.criticos + s.criticos, fuera: a.fuera + s.fuera_apetito, venc: a.venc + s.planes_vencidos,
  }), { riesgos: 0, criticos: 0, fuera: 0, venc: 0 });

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Expedientes</h1>
          <p className="page-subtitle">Portafolio de clientes. Cada expediente tiene su propia estrategia, indicadores y matriz de riesgos.</p>
        </div>
        {can('create', 'clients') && (
          <button className="sp-btn solo-edicion" onClick={() => setModal({})} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 20px' }}>+ Nuevo expediente</button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 20 }}>
        {[['Expedientes activos', clientes.filter((c) => c.status === 'activo').length], ['Riesgos en portafolio', tot.riesgos],
          ['Críticos', tot.criticos, 'var(--red)'], ['Fuera de apetito', tot.fuera, 'var(--gold)'], ['Planes vencidos', tot.venc, 'var(--red)']].map(([t, v, c]) => (
          <div key={t} className="sp-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: v && c ? c : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['activos', 'Activos'], ['cerrados', 'Cerrados'], ['todos', 'Todos']].map(([k, t]) => (
          <button key={k} className="sp-btn" onClick={() => setFiltro(k)} style={{ padding: '6px 14px', fontSize: 13, background: filtro === k ? 'var(--text)' : 'var(--bg2)', color: filtro === k ? 'var(--bg2)' : 'var(--text2)', border: '1px solid var(--border)' }}>{t}</button>
        ))}
      </div>

      {cargando ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Cargando expedientes…</div>
        : visibles.length === 0 ? <div className="sp-card" style={{ padding: 32 }}><EmptyState icon="🗂️" title="Sin expedientes" desc="Crea el primer expediente de cliente." /></div>
        : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
            {visibles.map((c) => (
              <Tarjeta key={c.id} c={c} s={stats[c.id]} actual={actual?.id === c.id}
                puedeEditar={can('update', 'clients')} onAbrir={() => activarExpediente(c.id)} onEditar={() => setModal({ cliente: c })} />
            ))}
          </div>
        )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.cliente ? `Expediente · ${modal.cliente.name}` : 'Nuevo expediente'} maxWidth={760}>
        {modal && (
          <FormExpediente cliente={modal.cliente} personas={personas} puedeBorrar={can('delete', 'clients')}
            onCerrar={() => setModal(null)}
            onGuardado={async (dato, esNuevo) => {
              setModal(null);
              if (esNuevo && dato && window.confirm(`¿Abrir ahora el expediente "${dato.name}" para empezar a capturar su información?`)) return activarExpediente(dato.id);
              if (!dato && modal.cliente?.id === actual?.id) return activarExpediente(clientes.find((c) => c.is_internal)?.id);
              cargar();
            }} />
        )}
      </Modal>
    </div>
  );
}
