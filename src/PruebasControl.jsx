import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { Modal } from './SharedUI.jsx';

/* ─────────────────────────────────────────────────────────────
   Pruebas de controles — papel de trabajo
   · Muestreo sugerido por frecuencia (práctica de firmas Big Four)
   · Selección aleatoria reproducible (semilla registrada)
   · Evidencias en almacenamiento privado por expediente
   · Firmas: preparó → revisó (personas distintas). Revisada = bloqueada.
   ───────────────────────────────────────────────────────────── */

// Tamaño de muestra por frecuencia: [riesgo normal, control clave o riesgo alto]
const TABLA_MUESTRA = {
  anual: [1, 1], trimestral: [2, 2], mensual: [2, 5], semanal: [5, 15], diaria: [20, 40], continua: [25, 60],
};
export function muestraSugerida(control, riesgoAlto) {
  if (!control) return null;
  if (control.nature === 'automatico') return { n: 1, nota: 'Control automático: prueba de uno, condicionada a controles generales de TI efectivos.' };
  const fila = TABLA_MUESTRA[control.frequency];
  if (!fila) return { n: null, nota: 'Define la frecuencia del control para sugerir la muestra.' };
  const n = riesgoAlto ? fila[1] : fila[0];
  return { n, nota: `Frecuencia ${control.frequency}: ${fila[0]}–${fila[1]} elementos; se sugiere ${n} por ser ${riesgoAlto ? 'control clave o riesgo alto' : 'riesgo moderado'}.` };
}

// Resultado sugerido según excepciones (criterio conservador)
export function resultadoSugerido(muestra, excepciones) {
  if (!muestra) return null;
  if (!excepciones) return 'efectivo';
  if (excepciones === 1 && muestra >= 25) return 'necesita_mejora';
  return 'inefectivo';
}

// Generador pseudoaleatorio reproducible (mulberry32)
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function seleccionAleatoria(poblacion, muestra, semilla) {
  if (!poblacion || !muestra || muestra > poblacion) return [];
  const r = aleatorio(semilla); const set = new Set();
  while (set.size < muestra) set.add(1 + Math.floor(r() * poblacion));
  return [...set].sort((x, y) => x - y);
}

const ESTADO = {
  borrador: ['Borrador', 'var(--bg3)', 'var(--text2)'],
  preparado: ['Preparado · por revisar', '#FFF4D1', '#9A6400'],
  revisado: ['Revisado', '#E3F5E8', '#248A3D'],
  devuelto: ['Devuelto', '#FDE4E6', '#D70015'],
};
const RESULTADO = { efectivo: ['Efectivo', '#248A3D'], necesita_mejora: ['Con observaciones', '#9A6400'], inefectivo: ['Inefectivo', '#D70015'] };
const chip = (t, bg, c) => <span className="sp-badge" style={{ background: bg, color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>{t}</span>;
const fecha = (d) => (d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const periodoActual = () => { const d = new Date(); return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`; };

/* ───────────── Evidencias ───────────── */
function Evidencias({ prueba, bloqueada }) {
  const cliente = useStore((s) => s.currentClient);
  const [lista, setLista] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!prueba?.id) return;
    const { data } = await supabase.from('evidences').select('*').eq('test_id', prueba.id).order('uploaded_at');
    setLista(data || []);
  }, [prueba?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const subir = async (e) => {
    const archivos = [...(e.target.files || [])]; e.target.value = '';
    if (!archivos.length || !cliente?.id) return;
    setSubiendo(true);
    for (const f of archivos) {
      if (f.size > 25 * 1024 * 1024) { notificationService.error(`${f.name}: excede 25 MB.`); continue; }
      const ruta = `${cliente.id}/${prueba.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`;
      const up = await supabase.storage.from('evidencias').upload(ruta, f, { contentType: f.type || 'application/octet-stream' });
      if (up.error) { notificationService.error(`${f.name}: ${up.error.message}`); continue; }
      const ins = await supabase.from('evidences').insert({ test_id: prueba.id, file_path: ruta, file_name: f.name, mime_type: f.type, size_bytes: f.size });
      if (ins.error) notificationService.error(`${f.name}: ${ins.error.message}`);
    }
    setSubiendo(false);
    cargar();
  };

  const abrir = async (ev) => {
    const { data, error } = await supabase.storage.from('evidencias').createSignedUrl(ev.file_path, 120);
    if (error) return notificationService.error('No se pudo abrir la evidencia: ' + error.message);
    window.open(data.signedUrl, '_blank', 'noopener');
  };
  const quitar = async (ev) => {
    if (!window.confirm(`¿Quitar la evidencia "${ev.file_name}"?`)) return;
    const { error } = await supabase.from('evidences').delete().eq('id', ev.id);
    if (error) return notificationService.error(error.message);
    cargar();
  };

  if (!prueba?.id) return <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Guarda la prueba para poder adjuntar evidencia.</div>;
  return (
    <div>
      {lista.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 8 }}>Sin evidencia adjunta.</div>}
      {lista.map((ev) => (
        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
          <span aria-hidden>📎</span>
          <button type="button" onClick={() => abrir(ev)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}>{ev.file_name}</button>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{ev.size_bytes ? `${Math.max(1, Math.round(ev.size_bytes / 1024))} KB` : ''}</span>
          {!bloqueada && <button type="button" onClick={() => quitar(ev)} aria-label={`Quitar ${ev.file_name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>✕</button>}
        </div>
      ))}
      {!bloqueada && (
        <label className="sp-btn" style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', marginTop: 4 }}>
          {subiendo ? 'Subiendo…' : '+ Adjuntar evidencia'}
          <input type="file" multiple onChange={subir} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
}

/* ───────────── Formulario de prueba ───────────── */
function FormPrueba({ prueba, datos, personas, onCerrar, onGuardado }) {
  const yo = useStore((s) => s.profile);
  const can = useStore.use.can();
  const puedeEditar = can('update', 'controls');
  const esAdmin = can('admin');
  const [f, setF] = useState(() => ({
    control_id: '', test_type: 'operacion', period_label: periodoActual(), procedure: '', population_size: '', sample_size: '',
    sample_method: 'aleatorio', sample_items: '', exceptions: 0, exception_detail: '', result: '', conclusion: '', review_notes: '',
    ...(prueba || {}),
  }));
  const [actual, setActual] = useState(prueba || null);
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  const control = datos.controles.find((c) => c.id === f.control_id);
  const vinculos = datos.vinculos.filter((v) => v.control_id === f.control_id);
  const esClave = vinculos.some((v) => v.is_key_control);
  const riesgoAlto = esClave || vinculos.some((v) => (datos.riesgos.find((r) => r.id === v.risk_id)?.inherent_risk || 0) >= 10);
  const sug = useMemo(() => (f.test_type === 'operacion' ? muestraSugerida(control, riesgoAlto) : null), [control, riesgoAlto, f.test_type]);
  const resSug = f.test_type === 'operacion' ? resultadoSugerido(Number(f.sample_size) || 0, Number(f.exceptions) || 0) : null;

  const estado = actual?.status || 'borrador';
  const bloqueada = estado === 'revisado' || !puedeEditar;
  const soyPreparador = actual?.prepared_by && actual.prepared_by === yo?.id;
  const nombre = (id) => { const p = personas.find((x) => x.id === id); return p ? (p.full_name || p.email) : '—'; };

  const generarSeleccion = () => {
    const pob = Number(f.population_size); const n = Number(f.sample_size);
    if (!pob || !n) return notificationService.error('Captura población y tamaño de muestra.');
    if (n > pob) return notificationService.error('La muestra no puede ser mayor que la población.');
    const semilla = Math.floor(Math.random() * 900000) + 100000;
    const sel = seleccionAleatoria(pob, n, semilla);
    setF((x) => ({ ...x, sample_items: `Semilla ${semilla} · elementos: ${sel.join(', ')}` }));
  };

  const persistir = async (estadoNuevo) => {
    if (!f.control_id) return notificationService.error('Selecciona el control que se prueba.');
    setGuardando(true);
    const payload = {
      control_id: f.control_id, test_type: f.test_type, period_label: f.period_label || null, procedure: f.procedure || null,
      population_size: f.population_size === '' ? null : Number(f.population_size), sample_size: f.sample_size === '' ? null : Number(f.sample_size),
      sample_method: f.sample_method || null, sample_items: f.sample_items || null, exceptions: Number(f.exceptions) || 0,
      exception_detail: f.exception_detail || null, result: f.result || null, conclusion: f.conclusion || null, review_notes: f.review_notes || null,
    };
    if (estadoNuevo) payload.status = estadoNuevo;
    const res = actual?.id
      ? await supabase.from('control_tests').update(payload).eq('id', actual.id).select().single()
      : await supabase.from('control_tests').insert(payload).select().single();
    setGuardando(false);
    if (res.error) { notificationService.error(res.error.message.replace(/^.*?: /, '')); return null; }
    setActual(res.data);
    return res.data;
  };

  const accion = async (estadoNuevo, mensaje) => {
    const r = await persistir(estadoNuevo);
    if (r) { notificationService.success(mensaje); onGuardado(); if (estadoNuevo) onCerrar(); }
  };

  const [txt, bg, col] = ESTADO[estado];
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {actual?.code && <strong style={{ fontSize: 15 }}>{actual.code}</strong>}
        {chip(txt, bg, col)}
        {actual?.prepared_at && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Preparó: {nombre(actual.prepared_by)} · {fecha(actual.prepared_at)}</span>}
        {actual?.reviewed_at && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{estado === 'devuelto' ? 'Devolvió' : 'Revisó'}: {nombre(actual.reviewed_by)} · {fecha(actual.reviewed_at)}</span>}
      </div>
      {estado === 'devuelto' && actual?.review_notes && (
        <div style={{ padding: 12, borderRadius: 12, background: '#FDE4E6', color: '#D70015', fontSize: 13, marginBottom: 14 }}>Notas del revisor: {actual.review_notes}</div>
      )}

      <fieldset disabled={bloqueada} style={{ border: 0, padding: 0, margin: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="sp-label">Control que se prueba</label>
            <select className="sp-input" value={f.control_id} onChange={set('control_id')}>
              <option value="">Selecciona un control</option>
              {datos.controles.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ''}{c.name}</option>)}
            </select>
            {control && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{control.nature === 'automatico' ? 'Automático' : 'Manual'} · {control.frequency || 'frecuencia sin definir'}{esClave ? ' · ★ Control clave' : ''}</div>}
          </div>
          <div><label className="sp-label">Tipo de prueba</label>
            <select className="sp-input" value={f.test_type} onChange={set('test_type')}>
              <option value="operacion">Eficacia operativa (TOE)</option>
              <option value="diseno">Diseño e implementación (TOD)</option>
            </select></div>
          <div><label className="sp-label">Periodo</label><input className="sp-input" value={f.period_label || ''} onChange={set('period_label')} placeholder="2026-T3" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Procedimiento aplicado</label>
            <textarea className="sp-input" rows={3} value={f.procedure || ''} onChange={set('procedure')} placeholder="Inspección de la evidencia de autorización, reproceso del cálculo, observación, indagación…" /></div>

          {f.test_type === 'operacion' && <>
            <div><label className="sp-label">Población (elementos del periodo)</label><input type="number" min={0} className="sp-input" value={f.population_size ?? ''} onChange={set('population_size')} /></div>
            <div>
              <label className="sp-label">Tamaño de muestra</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" min={0} className="sp-input" value={f.sample_size ?? ''} onChange={set('sample_size')} />
                {sug?.n != null && <button type="button" className="sp-btn" onClick={() => setF((x) => ({ ...x, sample_size: sug.n }))} style={{ background: 'var(--primary-light)', color: 'var(--primary)', whiteSpace: 'nowrap' }}>Usar {sug.n}</button>}
              </div>
              {sug?.nota && <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 5 }}>{sug.nota}</div>}
            </div>
            <div><label className="sp-label">Método de selección</label>
              <select className="sp-input" value={f.sample_method || ''} onChange={set('sample_method')}>
                <option value="aleatorio">Aleatorio</option><option value="sistematico">Sistemático</option><option value="juicio">A juicio del auditor</option><option value="total">Población total</option>
              </select></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="sp-label">Elementos seleccionados</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="sp-input" value={f.sample_items || ''} onChange={set('sample_items')} placeholder="Folios, fechas o números de elemento" />
                <button type="button" className="sp-btn" onClick={generarSeleccion} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Generar selección aleatoria</button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 5 }}>La semilla queda registrada para que la selección sea reproducible por el revisor.</div>
            </div>
            <div><label className="sp-label">Excepciones encontradas</label><input type="number" min={0} className="sp-input" value={f.exceptions} onChange={set('exceptions')} /></div>
            <div><label className="sp-label">Detalle de excepciones</label><input className="sp-input" value={f.exception_detail || ''} onChange={set('exception_detail')} /></div>
          </>}

          <div>
            <label className="sp-label">Resultado</label>
            <select className="sp-input" value={f.result || ''} onChange={set('result')}>
              <option value="">Sin concluir</option><option value="efectivo">Efectivo</option><option value="necesita_mejora">Con observaciones</option><option value="inefectivo">Inefectivo</option>
            </select>
            {resSug && f.sample_size !== '' && f.result !== resSug && (
              <button type="button" onClick={() => setF((x) => ({ ...x, result: resSug }))} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Sugerido por excepciones: {RESULTADO[resSug][0]} — aplicar
              </button>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Conclusión</label><textarea className="sp-input" rows={2} value={f.conclusion || ''} onChange={set('conclusion')} /></div>
        </div>
      </fieldset>

      <div style={{ marginTop: 18 }}>
        <label className="sp-label">Evidencia</label>
        <Evidencias prueba={actual} bloqueada={estado === 'revisado'} />
      </div>

      {estado === 'preparado' && puedeEditar && !soyPreparador && (
        <div style={{ marginTop: 18 }}>
          <label className="sp-label">Notas de revisión</label>
          <textarea className="sp-input" rows={2} value={f.review_notes || ''} onChange={set('review_notes')} placeholder="Obligatorias si devuelves la prueba" />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
        <button type="button" className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cerrar</button>
        {puedeEditar && (estado === 'borrador' || estado === 'devuelto') && <>
          <button type="button" className="sp-btn" disabled={guardando} onClick={() => accion(null, 'Borrador guardado.')} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Guardar borrador</button>
          <button type="button" className="sp-btn" disabled={guardando} onClick={() => accion('preparado', 'Prueba firmada como preparada. Queda pendiente de revisión.')} style={{ background: 'var(--primary)', color: '#fff' }}>Firmar: preparó</button>
        </>}
        {puedeEditar && estado === 'preparado' && soyPreparador && (
          <button type="button" className="sp-btn" disabled={guardando} onClick={() => accion('borrador', 'Firma retirada; la prueba regresa a borrador.')} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Retirar mi firma</button>
        )}
        {puedeEditar && estado === 'preparado' && !soyPreparador && <>
          <button type="button" className="sp-btn" disabled={guardando} onClick={() => { if (!String(f.review_notes || '').trim()) return notificationService.error('Escribe las notas de revisión para devolver la prueba.'); accion('devuelto', 'Prueba devuelta al preparador.'); }} style={{ background: 'var(--bg2)', color: 'var(--red)', border: '1px solid var(--border)' }}>Devolver</button>
          <button type="button" className="sp-btn" disabled={guardando} onClick={() => accion('revisado', 'Prueba revisada. El control se actualizó en la Matriz RCM.')} style={{ background: 'var(--green)', color: '#fff' }}>Firmar: revisó</button>
        </>}
        {esAdmin && estado === 'revisado' && (
          <button type="button" className="sp-btn" onClick={() => { const n = window.prompt('Motivo para reabrir la prueba revisada:'); if (n) { setF((x) => ({ ...x, review_notes: n })); supabase.from('control_tests').update({ status: 'devuelto', review_notes: n }).eq('id', actual.id).then(({ error }) => { if (error) notificationService.error(error.message); else { notificationService.success('Prueba reabierta.'); onGuardado(); onCerrar(); } }); } }}
            style={{ background: 'var(--bg2)', color: 'var(--red)', border: '1px solid var(--border)' }}>Reabrir (administrador)</button>
        )}
      </div>
      {estado === 'preparado' && soyPreparador && <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', marginTop: 8 }}>Segregación de funciones: la revisión debe hacerla otra persona.</p>}
    </div>
  );
}

/* ───────────── Lista de pruebas ───────────── */
export default function PruebasControl({ datos }) {
  const can = useStore.use.can();
  const [pruebas, setPruebas] = useState([]);
  const [evid, setEvid] = useState({});
  const [personas, setPersonas] = useState([]);
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState('pendientes');

  const cargar = useCallback(async () => {
    const [t, e, p] = await Promise.all([
      supabase.from('control_tests').select('*').order('created_at', { ascending: false }),
      supabase.from('evidences').select('test_id').not('test_id', 'is', null),
      supabase.from('profiles').select('id, full_name, email'),
    ]);
    if (t.error) notificationService.error('No se pudieron cargar las pruebas: ' + t.error.message);
    setPruebas(t.data || []);
    const c = {}; (e.data || []).forEach((x) => { c[x.test_id] = (c[x.test_id] || 0) + 1; }); setEvid(c);
    setPersonas(p.data || []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const nombre = (id) => { const p = personas.find((x) => x.id === id); return p ? (p.full_name || p.email) : ''; };
  const ctl = (id) => datos.controles.find((c) => c.id === id);
  const visibles = pruebas.filter((p) => filtro === 'todas' || (filtro === 'pendientes' ? p.status !== 'revisado' : p.status === 'revisado'));
  const porRevisar = pruebas.filter((p) => p.status === 'preparado').length;
  const sinEvidencia = pruebas.filter((p) => p.status !== 'borrador' && !evid[p.id]).length;
  const controlesSinPrueba = datos.controles.filter((c) => !pruebas.some((p) => p.control_id === c.id && p.status === 'revisado')).length;

  const th = { padding: '10px 12px', fontSize: 11.5, fontWeight: 600, color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '11px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'top' };

  return (
    <div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 14 }}>
        {[['Pruebas registradas', pruebas.length], ['Por revisar', porRevisar, porRevisar ? '#9A6400' : null], ['Sin evidencia', sinEvidencia, sinEvidencia ? 'var(--red)' : null],
          ['Controles sin prueba revisada', controlesSinPrueba, controlesSinPrueba ? '#9A6400' : null]].map(([t, v, c]) => (
          <div key={t} className="sp-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{t}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c || 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, padding: 14, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
          {[['pendientes', 'Pendientes'], ['revisadas', 'Revisadas'], ['todas', 'Todas']].map(([k, t]) => (
            <button key={k} className="sp-btn" onClick={() => setFiltro(k)} style={{ padding: '6px 14px', fontSize: 13, background: filtro === k ? 'var(--text)' : 'var(--bg2)', color: filtro === k ? 'var(--bg2)' : 'var(--text2)', border: '1px solid var(--border)' }}>{t}</button>
          ))}
          <span style={{ fontSize: 12.5, color: 'var(--text3)', marginLeft: 8 }}>Solo las pruebas revisadas actualizan la Matriz RCM.</span>
          {can('create', 'controls') && datos.controles.length > 0 && (
            <button className="sp-btn solo-edicion" onClick={() => setModal({})} style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff' }}>+ Nueva prueba</button>
          )}
        </div>
        {visibles.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            {datos.controles.length ? 'No hay pruebas en esta vista.' : 'Registra controles para poder probarlos.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead><tr>{['PT', 'Control', 'Tipo', 'Periodo', 'Muestra', 'Resultado', 'Estado', 'Firmas', 'Evidencia'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {visibles.map((p) => {
                  const c = ctl(p.control_id); const [t, bg, col] = ESTADO[p.status]; const r = RESULTADO[p.result];
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setModal({ prueba: p })}>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--primary)' }}>{p.code}</td>
                      <td style={{ ...td, maxWidth: 280 }}>{c ? `${c.code ? c.code + ' · ' : ''}${c.name}` : '—'}</td>
                      <td style={td}>{p.test_type === 'diseno' ? 'Diseño' : 'Operación'}</td>
                      <td style={td}>{p.period_label || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{p.sample_size != null ? `${p.sample_size}${p.population_size ? ' / ' + p.population_size : ''} · ${p.exceptions} exc.` : '—'}</td>
                      <td style={{ ...td, color: r?.[1], fontWeight: 600 }}>{r?.[0] || '—'}</td>
                      <td style={td}>{chip(t, bg, col)}</td>
                      <td style={{ ...td, fontSize: 12, color: 'var(--text2)' }}>{p.prepared_by ? `P: ${nombre(p.prepared_by)}` : ''}{p.reviewed_by && p.status === 'revisado' ? <div>R: {nombre(p.reviewed_by)}</div> : null}</td>
                      <td style={td}>{evid[p.id] ? `📎 ${evid[p.id]}` : <span style={{ color: p.status === 'borrador' ? 'var(--text3)' : 'var(--red)' }}>Sin evidencia</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.prueba ? `Prueba ${modal.prueba.code}` : 'Nueva prueba de control'} maxWidth={820}>
        {modal && <FormPrueba prueba={modal.prueba} datos={datos} personas={personas} onCerrar={() => setModal(null)} onGuardado={() => { cargar(); datos.recargar(); }} />}
      </Modal>
    </div>
  );
}
