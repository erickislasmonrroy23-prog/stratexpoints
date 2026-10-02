import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService, iaServidor } from './services.js';
import { useStore } from './store.js';

/* ─────────────────────────────────────────────────────────────
   IA con criterio de auditor (servidor) — Cabrera & Consultores
   · Sugerir riesgos por proceso y giro
   · Sugerir controles para un riesgo
   · Redactar hallazgos: condición · criterio · causa · efecto · recomendación
   Todo pasa por revisión humana antes de guardarse.
   ───────────────────────────────────────────────────────────── */

const contextoCliente = () => {
  const c = useStore.getState().currentClient;
  return { cliente: c?.legal_name || c?.name, industria: c?.industry };
};
const mensajeError = (e) => (e.codigo === 'sin_llave'
  ? 'La IA del servidor aún no tiene llave. Configura ANTHROPIC_API_KEY, GEMINI_API_KEY o GROQ_API_KEY en Supabase → Edge Functions → Secrets.'
  : e.message);

function Tarjeta({ on, onToggle, titulo, children }) {
  return (
    <label style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 14, border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-light)' : 'var(--bg2)', cursor: 'pointer', marginBottom: 10 }}>
      <input type="checkbox" checked={on} onChange={onToggle} style={{ marginTop: 3, width: 18, height: 18 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{titulo}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>{children}</div>
      </div>
    </label>
  );
}

/* ───────────── Sugerir riesgos ───────────── */
export function SugerirRiesgos({ datos, onCerrar, onAgregado }) {
  const [area, setArea] = useState(datos.areas[0]?.id || '');
  const [proceso, setProceso] = useState('');
  const [contexto, setContexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [sel, setSel] = useState({});
  const [guardando, setGuardando] = useState(false);

  const nombreProceso = proceso.trim() || datos.areas.find((a) => a.id === area)?.name || '';
  const pedir = async () => {
    if (!nombreProceso) return notificationService.error('Elige un área o describe el proceso.');
    setCargando(true); setSugs([]);
    try {
      const r = await iaServidor('sugerir_riesgos', { ...contextoCliente(), proceso: nombreProceso, contexto, existentes: datos.riesgos.map((x) => x.name).slice(0, 60) });
      const lista = r?.riesgos || [];
      setSugs(lista); setSel(Object.fromEntries(lista.map((_, i) => [i, true])));
      if (!lista.length) notificationService.error('La IA no devolvió sugerencias; intenta con más contexto.');
    } catch (e) { notificationService.error(mensajeError(e)); }
    setCargando(false);
  };

  const categoriaId = (nombre) => {
    if (!nombre) return null;
    const n = nombre.toLowerCase();
    const c = datos.categorias.find((x) => !x.parent_id && (x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase())));
    return c?.id || null;
  };
  const agregar = async () => {
    const elegidos = sugs.filter((_, i) => sel[i]);
    if (!elegidos.length) return;
    setGuardando(true);
    const filas = elegidos.map((s) => ({
      name: s.name, description: s.description || null, area_id: area || null, category_id: categoriaId(s.categoria),
      probability: Math.min(5, Math.max(1, Number(s.probability) || 3)), impact: Math.min(5, Math.max(1, Number(s.impact) || 3)),
      potential_error: s.potential_error || null, affected_account: s.affected_account || null, assertions: Array.isArray(s.assertions) ? s.assertions : [],
      status: 'activo',
    }));
    const { error } = await supabase.from('risks').insert(filas);
    setGuardando(false);
    if (error) return notificationService.error(error.message);
    notificationService.success(`${filas.length} riesgo(s) agregados. Revisa su calificación y asigna dueño.`);
    onAgregado();
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginBottom: 12 }}>
        <div><label className="sp-label">Área</label>
          <select className="sp-input" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Sin área</option>{datos.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></div>
        <div><label className="sp-label">Proceso específico (opcional)</label><input className="sp-input" value={proceso} onChange={(e) => setProceso(e.target.value)} placeholder="Originación de crédito de nómina" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Contexto adicional (opcional)</label>
          <textarea className="sp-input" rows={2} value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Sistemas usados, volumen, hallazgos previos, regulación aplicable…" /></div>
      </div>
      <button className="sp-btn" onClick={pedir} disabled={cargando} style={{ background: 'var(--primary)', color: '#fff', marginBottom: 16 }}>{cargando ? 'Analizando proceso…' : '✨ Sugerir riesgos'}</button>
      {sugs.map((s, i) => (
        <Tarjeta key={i} on={!!sel[i]} onToggle={() => setSel((x) => ({ ...x, [i]: !x[i] }))} titulo={s.name}>
          {s.description}
          <div style={{ marginTop: 6, color: 'var(--text3)' }}>{s.categoria} · P{s.probability} × I{s.impact} = {(Number(s.probability) || 0) * (Number(s.impact) || 0)}{s.affected_account ? ` · Cuenta: ${s.affected_account}` : ''}</div>
        </Tarjeta>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Sugerencias generadas por IA: valídalas con tu criterio profesional.</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cerrar</button>
          {sugs.length > 0 && <button className="sp-btn" onClick={agregar} disabled={guardando} style={{ background: 'var(--green)', color: '#fff' }}>{guardando ? 'Agregando…' : `Agregar ${Object.values(sel).filter(Boolean).length} seleccionados`}</button>}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Sugerir controles para un riesgo ───────────── */
export function SugerirControles({ riesgo, datos, onAgregado }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [sel, setSel] = useState({});

  const pedir = async () => {
    setAbierto(true); setCargando(true); setSugs([]);
    try {
      const ligados = datos.vinculos.filter((v) => v.risk_id === riesgo.id).map((v) => datos.controles.find((c) => c.id === v.control_id)?.name).filter(Boolean);
      const r = await iaServidor('sugerir_controles', { ...contextoCliente(), riesgo: riesgo.name, descripcion: riesgo.description, probability: riesgo.probability, impact: riesgo.impact, existentes: ligados });
      const lista = r?.controles || [];
      setSugs(lista); setSel(Object.fromEntries(lista.map((_, i) => [i, true])));
    } catch (e) { notificationService.error(mensajeError(e)); setAbierto(false); }
    setCargando(false);
  };
  const agregar = async () => {
    const elegidos = sugs.filter((_, i) => sel[i]);
    for (const c of elegidos) {
      const { data, error } = await supabase.from('controls').insert({
        name: c.name, description: [c.description, c.evidencia ? `Evidencia: ${c.evidencia}` : ''].filter(Boolean).join('\n'),
        control_objective: c.control_objective || null, type: ['preventivo', 'detectivo', 'correctivo'].includes(c.type) ? c.type : 'preventivo',
        nature: c.nature === 'automatico' ? 'automatico' : 'manual', frequency: c.frequency || null, prevents_fraud: !!c.prevents_fraud, status: 'diseñado',
      }).select('id').single();
      if (error) { notificationService.error(error.message); return; }
      await supabase.from('risk_controls').insert({ risk_id: riesgo.id, control_id: data.id, is_key_control: !!c.clave });
    }
    notificationService.success(`${elegidos.length} control(es) agregados y vinculados al riesgo.`);
    setAbierto(false); setSugs([]); onAgregado();
  };

  if (!abierto) return <button type="button" className="sp-btn solo-edicion" onClick={pedir} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>✨ Sugerir controles con IA</button>;
  return (
    <div style={{ padding: 14, borderRadius: 16, background: 'var(--bg3)', marginTop: 8 }}>
      {cargando ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>Diseñando actividades de control…</div> : <>
        {sugs.map((c, i) => (
          <Tarjeta key={i} on={!!sel[i]} onToggle={() => setSel((x) => ({ ...x, [i]: !x[i] }))} titulo={`${c.clave ? '★ ' : ''}${c.name}`}>
            {c.description}
            <div style={{ marginTop: 6, color: 'var(--text3)' }}>{c.type} · {c.nature} · {c.frequency}{c.prevents_fraud ? ' · antifraude' : ''}</div>
          </Tarjeta>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="sp-btn" onClick={() => setAbierto(false)} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Descartar</button>
          {sugs.length > 0 && <button type="button" className="sp-btn" onClick={agregar} style={{ background: 'var(--green)', color: '#fff' }}>Agregar y vincular</button>}
        </div>
      </>}
    </div>
  );
}

/* ───────────── Redactar hallazgo ───────────── */
export async function redactarHallazgo({ riesgo, control, prueba, notas }) {
  const datos = {
    riesgo: riesgo ? { nombre: riesgo.name, descripcion: riesgo.description, inherente: riesgo.inherent_risk, residual: riesgo.residual_risk } : null,
    control: control ? { nombre: control.name, descripcion: control.description, diseno: control.design_evaluation, operacion: control.test_result } : null,
    prueba: prueba ? { muestra: prueba.sample_size, excepciones: prueba.exceptions, detalle: prueba.exception_detail, conclusion: prueba.conclusion } : null,
    notas_del_auditor: notas || null,
  };
  try {
    const h = await iaServidor('redactar_hallazgo', { ...contextoCliente(), datos });
    return {
      title: h.titulo,
      description: `Condición: ${h.condicion}\n\nCriterio: ${h.criterio}\n\nCausa: ${h.causa}\n\nEfecto: ${h.efecto}\n\nRecomendación: ${h.recomendacion}`,
      proposed_control_activity: h.accion_propuesta,
      severidad: h.severidad,
    };
  } catch (e) { notificationService.error(mensajeError(e)); return null; }
}
