import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { TabBar, Modal, EmptyState, ConfirmationModal } from './SharedUI.jsx';
import { generarInformeRiesgos } from './informeRiesgosPDF.js';
import MatrizRCM from './MatrizRCM.jsx';
import PruebasControl from './PruebasControl.jsx';

/* ─────────────────────────────────────────────────────────────
   Módulo de Riesgos y Controles — Cabrera & Consultores
   Marco: COSO ERM 2017 / COSO 2013 / ISO 31000
   Cálculos en servidor (metodología EBC):
     Inherente = Probabilidad × Impacto (1–25)
     Residual  = Inherente × (1 − efectividad promedio ÷ 5 × 0.7)
     Efectividad del control = evaluación de diseño + resultado de prueba
   ───────────────────────────────────────────────────────────── */

export const NIVELES = [
  { max: 4, label: 'Bajo', color: '#248A3D', bg: '#E3F5E8', solido: '#34C759' },
  { max: 9, label: 'Moderado', color: '#9A6400', bg: '#FFF4D1', solido: '#FFCC00' },
  { max: 16, label: 'Alto', color: '#C93400', bg: '#FFE9D6', solido: '#FF9500' },
  { max: 25, label: 'Crítico', color: '#D70015', bg: '#FDE4E6', solido: '#FF3B30' },
];
export const nivelDe = (v) => (v == null ? null : NIVELES.find((n) => v <= n.max) || NIVELES[3]);

const ESCALA_P = ['', 'Rara', 'Improbable', 'Posible', 'Probable', 'Casi segura'];
const ESCALA_I = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'];
const ASEVERACIONES = ['Existencia u ocurrencia', 'Integridad', 'Exactitud', 'Valuación', 'Corte', 'Derechos y obligaciones', 'Presentación y revelación'];
const ESTADO_RIESGO = { activo: 'Activo', mitigado: 'Mitigado', aceptado: 'Aceptado', transferido: 'Transferido', cerrado: 'Cerrado' };
const TIPO_CONTROL = { preventivo: 'Preventivo', detectivo: 'Detectivo', correctivo: 'Correctivo' };
const NATURALEZA = { manual: 'Manual', automatico: 'Automático' };
const FRECUENCIA = { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual', continua: 'Continua' };
const ESTADO_CONTROL = { 'diseñado': 'Diseñado', implementado: 'Implementado', en_pruebas: 'En pruebas', no_operando: 'No operando' };
const DISENO = { adecuado: 'Adecuado', necesita_mejora: 'Necesita mejora', inadecuado: 'Inadecuado' };
const PRUEBA = { efectivo: 'Efectivo', necesita_mejora: 'Necesita mejora', inefectivo: 'Inefectivo' };
const ESTADO_PLAN = { abierto: 'Abierto', en_progreso: 'En progreso', cerrado: 'Cerrado', vencido: 'Vencido' };

const hoy = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (d) => (d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const limpiar = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));

/* ───────────── Datos ───────────── */
function useDatosRiesgo() {
  const [d, setD] = useState({ areas: [], subprocesos: [], categorias: [], riesgos: [], controles: [], vinculos: [], planes: [], personas: [], objetivos: [], indicadores: [] });
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const q = (t, sel = '*', ord) => {
      let x = supabase.from(t).select(sel);
      if (ord) x = x.order(ord, { ascending: true });
      return x;
    };
    const [areas, subprocesos, categorias, riesgos, controles, vinculos, planes, personas, objetivos, indicadores] = await Promise.all([
      q('areas', '*', 'order_index'), q('subprocesses', '*', 'order_index'), q('risk_categories', '*', 'order_index'),
      q('risks', '*', 'code'), q('controls', '*', 'code'), q('risk_controls'), q('action_plans', '*', 'due_date'),
      q('profiles', 'id, full_name, email', 'full_name'),
      q('objectives', 'id, name, code', 'code'), q('kpis', 'id, name, value, target, unit, inverse', 'name'),
    ]);
    const err = [areas, subprocesos, categorias, riesgos, controles, vinculos, planes, personas, objetivos, indicadores].find((r) => r.error);
    if (err) notificationService.error('No se pudo cargar el módulo de riesgos: ' + err.error.message);
    setD({
      areas: areas.data || [], subprocesos: subprocesos.data || [], categorias: categorias.data || [],
      riesgos: riesgos.data || [], controles: controles.data || [], vinculos: vinculos.data || [],
      planes: planes.data || [], personas: personas.data || [],
      objetivos: objetivos.data || [], indicadores: indicadores.data || [],
    });
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  return { ...d, cargando, recargar: cargar };
}

async function guardar(tabla, id, payload) {
  const res = id
    ? await supabase.from(tabla).update(limpiar(payload)).eq('id', id).select().single()
    : await supabase.from(tabla).insert(limpiar(payload)).select().single();
  if (res.error) throw new Error(traducirError(res.error));
  return res.data;
}
async function eliminar(tabla, id) {
  const { error } = await supabase.from(tabla).delete().eq('id', id);
  if (error) throw new Error(traducirError(error));
}
function traducirError(e) {
  const m = e?.message || '';
  if (/row-level security|permission denied/i.test(m)) return 'Tu rol no tiene permiso para esta acción.';
  if (/violates check constraint/i.test(m)) return 'Algún valor está fuera del rango permitido.';
  if (/duplicate key/i.test(m)) return 'Ya existe un registro con ese código.';
  return m;
}

/* ───────────── Piezas visuales ───────────── */
function Nivel({ valor, compacto = false }) {
  const n = nivelDe(valor);
  if (!n) return <span style={{ color: 'var(--text3)' }}>—</span>;
  return (
    <span className="sp-badge" style={{ background: n.bg, color: n.color, fontWeight: 700, minWidth: compacto ? 0 : 92, justifyContent: 'center' }}>
      {valor}{!compacto && ` · ${n.label}`}
    </span>
  );
}

function Campo({ label, children, ayuda, ancho }) {
  return (
    <div style={{ gridColumn: ancho ? '1 / -1' : undefined }}>
      <label className="sp-label">{label}</label>
      {children}
      {ayuda && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{ayuda}</div>}
    </div>
  );
}
const Rejilla = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>{children}</div>
);
const Sel = ({ value, onChange, opciones, vacio = 'Sin asignar', disabled }) => (
  <select className="sp-input" value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    {vacio !== false && <option value="">{vacio}</option>}
    {Object.entries(opciones).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
  </select>
);
const aOpciones = (lista, etiqueta = (x) => x.name) => Object.fromEntries(lista.map((x) => [x.id, etiqueta(x)]));

function Botonera({ onCancel, guardando, puedeGuardar = true, textoGuardar = 'Guardar' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
      <button type="button" className="sp-btn" onClick={onCancel} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cancelar</button>
      {puedeGuardar && (
        <button type="submit" className="sp-btn" disabled={guardando} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 20px' }}>
          {guardando ? 'Guardando…' : textoGuardar}
        </button>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' };
const td = { padding: '11px 12px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };

/* ───────────── Matriz de calor ───────────── */
function MatrizCalor({ riesgos, modo, seleccion, onSeleccion, apetito = 25 }) {
  // Residual: se ubica por su valor en la diagonal equivalente (probabilidad conservada, impacto ajustado)
  const celda = (r) => {
    if (modo === 'inherente') return [r.probability, r.impact];
    const v = r.residual_risk ?? r.inherent_risk;
    const p = r.probability;
    return [p, Math.max(1, Math.min(5, Math.round(v / p)))];
  };
  const conteo = {};
  riesgos.forEach((r) => { const [p, i] = celda(r); const k = `${p}-${i}`; (conteo[k] = conteo[k] || []).push(r); });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(5, minmax(56px, 1fr))', gap: 4, minWidth: 420 }}>
        {[5, 4, 3, 2, 1].map((p) => (
          <React.Fragment key={p}>
            <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, textAlign: 'right', lineHeight: 1.2 }}>
              <span><strong style={{ color: 'var(--text2)' }}>{p}</strong> {ESCALA_P[p]}</span>
            </div>
            {[1, 2, 3, 4, 5].map((i) => {
              const n = nivelDe(p * i);
              const lista = conteo[`${p}-${i}`] || [];
              const activa = seleccion === `${p}-${i}`;
              return (
                <button key={i} type="button" onClick={() => onSeleccion(activa ? null : `${p}-${i}`)}
                  aria-label={`Probabilidad ${p}, impacto ${i}: ${lista.length} riesgos`}
                  style={{
                    aspectRatio: '1.4', borderRadius: 12, border: activa ? '2px solid var(--primary)' : (p * i > apetito ? '1.5px dashed rgba(215,0,21,.45)' : '1px solid transparent'),
                    background: n.bg, color: n.color, cursor: lista.length ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    opacity: lista.length ? 1 : 0.55,
                  }}>
                  <span style={{ fontSize: lista.length ? 20 : 12, fontWeight: 800 }}>{lista.length || ''}</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>{p * i}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', paddingTop: 6, lineHeight: 1.2 }}>
            <strong style={{ color: 'var(--text2)' }}>{i}</strong><br />{ESCALA_I[i]}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
        <span>↑ Probabilidad</span><span>Impacto →</span>
      </div>
    </div>
  );
}

/* ───────────── Formulario de riesgo ───────────── */
function FormRiesgo({ riesgo, datos, puedeEditar, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => ({
    code: '', name: '', description: '', area_id: '', subprocess_id: '', category_id: '', objective_id: '', kri_id: '',
    business_objective: '', potential_error: '', affected_account: '', assertions: [],
    probability: 3, impact: 3, owner_id: '', responsible_id: '', status: 'activo', next_review_at: '',
    ...(riesgo || {}),
  }));
  const [n1, setN1] = useState(() => {
    const c = datos.categorias.find((x) => x.id === riesgo?.category_id);
    return c ? (c.parent_id || c.id) : '';
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const subprocesos = datos.subprocesos.filter((s) => !f.area_id || s.area_id === f.area_id);
  const raices = datos.categorias.filter((c) => !c.parent_id);
  const hijas = datos.categorias.filter((c) => c.parent_id === n1);
  const inherente = Number(f.probability) * Number(f.impact);

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return notificationService.error('El nombre del riesgo es obligatorio.');
    setGuardando(true);
    try {
      const payload = {
        code: f.code, name: f.name.trim(), description: f.description, area_id: f.area_id, subprocess_id: f.subprocess_id,
        category_id: f.category_id || n1 || null, business_objective: f.business_objective, potential_error: f.potential_error,
        affected_account: f.affected_account, assertions: f.assertions || [], objective_id: f.objective_id, kri_id: f.kri_id, probability: Number(f.probability), impact: Number(f.impact),
        owner_id: f.owner_id, responsible_id: f.responsible_id, status: f.status, next_review_at: f.next_review_at,
        last_reviewed_at: riesgo ? hoy() : null,
      };
      await guardar('risks', riesgo?.id, payload);
      notificationService.success(riesgo ? 'Riesgo actualizado.' : 'Riesgo registrado.');
      onGuardado();
    } catch (err) { notificationService.error(err.message); }
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={!puedeEditar} style={{ border: 0, padding: 0, margin: 0 }}>
        <Rejilla>
          <Campo label="Código"><input className="sp-input" value={f.code || ''} onChange={set('code')} placeholder="R-001" /></Campo>
          <Campo label="Estado"><Sel value={f.status} onChange={set('status')} opciones={ESTADO_RIESGO} vacio={false} /></Campo>
          <Campo label="Riesgo" ancho><input className="sp-input" value={f.name} onChange={set('name')} placeholder="Ej.: Otorgamiento de crédito sin validar capacidad de pago" required /></Campo>
          <Campo label="Descripción (causa → evento → consecuencia)" ancho><textarea className="sp-input" rows={3} value={f.description || ''} onChange={set('description')} /></Campo>
          <Campo label="Área"><Sel value={f.area_id} onChange={(v) => setF((x) => ({ ...x, area_id: v, subprocess_id: '' }))} opciones={aOpciones(datos.areas)} /></Campo>
          <Campo label="Subproceso"><Sel value={f.subprocess_id} onChange={set('subprocess_id')} opciones={aOpciones(subprocesos)} /></Campo>
          <Campo label="Categoría (N1)"><Sel value={n1} onChange={(v) => { setN1(v); setF((x) => ({ ...x, category_id: '' })); }} opciones={aOpciones(raices, (c) => `${c.code} ${c.name}`)} /></Campo>
          <Campo label="Subcategoría (N2)"><Sel value={f.category_id} onChange={set('category_id')} opciones={aOpciones(hijas, (c) => `${c.code || ''} ${c.name}`)} vacio={hijas.length ? 'Usar solo N1' : 'Sin subcategorías'} /></Campo>
          <Campo label="Objetivo estratégico que amenaza" ayuda="Vincula el riesgo al Mapa Estratégico (COSO ERM: estrategia y riesgo integrados).">
            <Sel value={f.objective_id} onChange={set('objective_id')} opciones={aOpciones(datos.objetivos, (o) => `${o.code ? o.code + ' · ' : ''}${o.name}`)} vacio="Sin vincular" />
          </Campo>
          <Campo label="Indicador clave de riesgo (KRI)" ayuda="KPI que anticipa la materialización del riesgo.">
            <Sel value={f.kri_id} onChange={set('kri_id')} opciones={aOpciones(datos.indicadores, (k) => k.name)} vacio="Sin indicador" />
          </Campo>
          <Campo label="Objetivo de negocio (descripción)" ancho><input className="sp-input" value={f.business_objective || ''} onChange={set('business_objective')} /></Campo>
          <Campo label="Error potencial"><input className="sp-input" value={f.potential_error || ''} onChange={set('potential_error')} /></Campo>
          <Campo label="Cuenta contable afectada"><input className="sp-input" value={f.affected_account || ''} onChange={set('affected_account')} /></Campo>
          <Campo label="Aseveraciones de los estados financieros" ancho>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ASEVERACIONES.map((a) => {
                const on = (f.assertions || []).includes(a);
                return (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 99, border: '1px solid var(--border)', background: on ? 'var(--primary-light)' : 'var(--bg)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={on} onChange={() => setF((x) => ({ ...x, assertions: on ? x.assertions.filter((y) => y !== a) : [...(x.assertions || []), a] }))} />
                    {a}
                  </label>
                );
              })}
            </div>
          </Campo>
          <Campo label={`Probabilidad: ${f.probability} · ${ESCALA_P[f.probability]}`}>
            <input type="range" min={1} max={5} value={f.probability} onChange={set('probability')} style={{ width: '100%' }} />
          </Campo>
          <Campo label={`Impacto: ${f.impact} · ${ESCALA_I[f.impact]}`}>
            <input type="range" min={1} max={5} value={f.impact} onChange={set('impact')} style={{ width: '100%' }} />
          </Campo>
          <Campo label="Riesgo inherente (calculado)"><div style={{ paddingTop: 6 }}><Nivel valor={inherente} /></div></Campo>
          <Campo label="Riesgo residual (calculado)" ayuda="Se recalcula con la efectividad de los controles vinculados.">
            <div style={{ paddingTop: 6 }}><Nivel valor={riesgo ? riesgo.residual_risk : inherente} /></div>
          </Campo>
          <Campo label="Dueño del riesgo"><Sel value={f.owner_id} onChange={set('owner_id')} opciones={aOpciones(datos.personas, (p) => p.full_name || p.email)} /></Campo>
          <Campo label="Responsable de gestión"><Sel value={f.responsible_id} onChange={set('responsible_id')} opciones={aOpciones(datos.personas, (p) => p.full_name || p.email)} /></Campo>
          <Campo label="Próxima revisión"><input type="date" className="sp-input" value={f.next_review_at || ''} onChange={set('next_review_at')} /></Campo>
        </Rejilla>
      </fieldset>
      <Botonera onCancel={onCerrar} guardando={guardando} puedeGuardar={puedeEditar} />
    </form>
  );
}

/* ───────────── Formulario de control ───────────── */
function FormControl({ control, datos, puedeEditar, onCerrar, onGuardado }) {
  const vinculosIniciales = datos.vinculos.filter((v) => v.control_id === control?.id);
  const [f, setF] = useState(() => ({
    code: '', name: '', description: '', control_objective: '', type: 'preventivo', nature: 'manual', frequency: 'mensual',
    responsible_id: '', status: 'implementado', design_evaluation: '', test_result: '', test_reference: '',
    is_documented: false, prevents_fraud: false, monitoring_mechanism: '', ...(control || {}),
  }));
  const [riesgosSel, setRiesgosSel] = useState(() => Object.fromEntries(vinculosIniciales.map((v) => [v.risk_id, v.is_key_control])));
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return notificationService.error('El nombre del control es obligatorio.');
    setGuardando(true);
    try {
      const { id, created_at, updated_at, effectiveness, segregation_duties, control_exists, ...resto } = f;
      const guardado = await guardar('controls', control?.id, { ...resto, name: f.name.trim() });
      const cid = guardado.id;
      const antes = Object.fromEntries(vinculosIniciales.map((v) => [v.risk_id, v.is_key_control]));
      const quitar = Object.keys(antes).filter((r) => !(r in riesgosSel));
      const poner = Object.entries(riesgosSel).filter(([r, k]) => !(r in antes) || antes[r] !== k);
      for (const r of quitar) await supabase.from('risk_controls').delete().eq('risk_id', r).eq('control_id', cid);
      if (poner.length) {
        const { error } = await supabase.from('risk_controls').upsert(poner.map(([risk_id, is_key_control]) => ({ risk_id, control_id: cid, is_key_control })));
        if (error) throw new Error(traducirError(error));
      }
      notificationService.success(control ? 'Control actualizado.' : 'Control registrado.');
      onGuardado();
    } catch (err) { notificationService.error(err.message); }
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={!puedeEditar} style={{ border: 0, padding: 0, margin: 0 }}>
        <Rejilla>
          <Campo label="Código"><input className="sp-input" value={f.code || ''} onChange={set('code')} placeholder="C-001" /></Campo>
          <Campo label="Estado"><Sel value={f.status} onChange={set('status')} opciones={ESTADO_CONTROL} vacio={false} /></Campo>
          <Campo label="Control" ancho><input className="sp-input" value={f.name} onChange={set('name')} placeholder="Ej.: Validación de capacidad de pago por comité de crédito" required /></Campo>
          <Campo label="Objetivo de control" ancho><input className="sp-input" value={f.control_objective || ''} onChange={set('control_objective')} /></Campo>
          <Campo label="Descripción de la actividad" ancho><textarea className="sp-input" rows={3} value={f.description || ''} onChange={set('description')} placeholder="Quién, qué, cuándo, con qué evidencia" /></Campo>
          <Campo label="Tipo"><Sel value={f.type} onChange={set('type')} opciones={TIPO_CONTROL} vacio={false} /></Campo>
          <Campo label="Naturaleza"><Sel value={f.nature} onChange={set('nature')} opciones={NATURALEZA} vacio={false} /></Campo>
          <Campo label="Frecuencia"><Sel value={f.frequency} onChange={set('frequency')} opciones={FRECUENCIA} /></Campo>
          <Campo label="Responsable"><Sel value={f.responsible_id} onChange={set('responsible_id')} opciones={aOpciones(datos.personas, (p) => p.full_name || p.email)} /></Campo>
          <Campo label="Evaluación de diseño" ayuda="Se actualiza sola al revisarse una prueba de diseño (pestaña Pruebas)."><Sel value={f.design_evaluation} onChange={set('design_evaluation')} opciones={DISENO} vacio="Sin evaluar" /></Campo>
          <Campo label="Resultado de la prueba" ayuda="Se actualiza solo al revisarse una prueba de operación."><Sel value={f.test_result} onChange={set('test_result')} opciones={PRUEBA} vacio="Sin probar" /></Campo>
          <Campo label="Referencia del papel de trabajo"><input className="sp-input" value={f.test_reference || ''} onChange={set('test_reference')} placeholder="PT-04 / Muestra 25" /></Campo>
          <Campo label="Mecanismo de monitoreo"><input className="sp-input" value={f.monitoring_mechanism || ''} onChange={set('monitoring_mechanism')} /></Campo>
          <Campo label="Atributos" ancho>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!f.is_documented} onChange={set('is_documented')} /> Documentado</label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!f.prevents_fraud} onChange={set('prevents_fraud')} /> Previene fraude</label>
            </div>
          </Campo>
          <Campo label="Riesgos que mitiga" ancho ayuda="Marca ★ en los riesgos donde este es un control clave.">
            {datos.riesgos.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Aún no hay riesgos registrados.</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                {datos.riesgos.map((r) => {
                  const on = r.id in riesgosSel;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <input type="checkbox" checked={on} onChange={() => setRiesgosSel((s) => { const n = { ...s }; if (on) delete n[r.id]; else n[r.id] = false; return n; })} aria-label={`Vincular ${r.name}`} />
                      <span style={{ flex: 1 }}><strong>{r.code || '—'}</strong> {r.name}</span>
                      <Nivel valor={r.inherent_risk} compacto />
                      {on && (
                        <button type="button" onClick={() => setRiesgosSel((s) => ({ ...s, [r.id]: !s[r.id] }))} title="Control clave"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: riesgosSel[r.id] ? 'var(--gold)' : 'var(--text3)' }}>
                          {riesgosSel[r.id] ? '★' : '☆'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Campo>
        </Rejilla>
      </fieldset>
      {control?.effectiveness != null && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text2)' }}>Efectividad calculada: <strong>{control.effectiveness} / 5</strong></div>
      )}
      <Botonera onCancel={onCerrar} guardando={guardando} puedeGuardar={puedeEditar} />
    </form>
  );
}

/* ───────────── Formulario de plan de acción ───────────── */
function FormPlan({ plan, datos, puedeEditar, onCerrar, onGuardado, riesgoInicial }) {
  const [f, setF] = useState(() => ({
    title: '', description: '', risk_id: riesgoInicial || '', control_id: '', responsible_id: '', due_date: '',
    status: 'abierto', proposed_control_activity: '', evidence_notes: '', ...(plan || {}),
  }));
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return notificationService.error('El título del plan es obligatorio.');
    if (f.status === 'cerrado' && !String(f.evidence_notes || '').trim()) return notificationService.error('Para cerrar un plan registra la evidencia de cierre.');
    setGuardando(true);
    try {
      const prof = useStore.getState().profile;
      const cierra = f.status === 'cerrado' && plan?.status !== 'cerrado';
      await guardar('action_plans', plan?.id, {
        title: f.title.trim(), description: f.description, risk_id: f.risk_id, control_id: f.control_id,
        responsible_id: f.responsible_id, due_date: f.due_date, status: f.status,
        proposed_control_activity: f.proposed_control_activity, evidence_notes: f.evidence_notes,
        ...(cierra ? { closed_at: new Date().toISOString(), closed_by: prof?.id || null } : {}),
        ...(f.status !== 'cerrado' ? { closed_at: null, closed_by: null } : {}),
      });
      notificationService.success(plan ? 'Plan actualizado.' : 'Plan de acción registrado.');
      onGuardado();
    } catch (err) { notificationService.error(err.message); }
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={!puedeEditar} style={{ border: 0, padding: 0, margin: 0 }}>
        <Rejilla>
          <Campo label="Hallazgo / acción" ancho><input className="sp-input" value={f.title} onChange={set('title')} required /></Campo>
          <Campo label="Descripción (condición, criterio, causa, efecto)" ancho><textarea className="sp-input" rows={3} value={f.description || ''} onChange={set('description')} /></Campo>
          <Campo label="Riesgo"><Sel value={f.risk_id} onChange={set('risk_id')} opciones={aOpciones(datos.riesgos, (r) => `${r.code || ''} ${r.name}`)} /></Campo>
          <Campo label="Control relacionado"><Sel value={f.control_id} onChange={set('control_id')} opciones={aOpciones(datos.controles, (c) => `${c.code || ''} ${c.name}`)} /></Campo>
          <Campo label="Actividad de control propuesta" ancho><textarea className="sp-input" rows={2} value={f.proposed_control_activity || ''} onChange={set('proposed_control_activity')} /></Campo>
          <Campo label="Responsable"><Sel value={f.responsible_id} onChange={set('responsible_id')} opciones={aOpciones(datos.personas, (p) => p.full_name || p.email)} /></Campo>
          <Campo label="Fecha compromiso"><input type="date" className="sp-input" value={f.due_date || ''} onChange={set('due_date')} /></Campo>
          <Campo label="Estado"><Sel value={f.status} onChange={set('status')} opciones={ESTADO_PLAN} vacio={false} /></Campo>
          <Campo label="Evidencia de cierre" ancho ayuda="Obligatoria para cerrar el plan."><textarea className="sp-input" rows={2} value={f.evidence_notes || ''} onChange={set('evidence_notes')} /></Campo>
        </Rejilla>
      </fieldset>
      <Botonera onCancel={onCerrar} guardando={guardando} puedeGuardar={puedeEditar} />
    </form>
  );
}

/* ───────────── Áreas y subprocesos ───────────── */
function AreasProcesos({ datos, puedeEditar, puedeBorrar, recargar }) {
  const [nuevaArea, setNuevaArea] = useState('');
  const [nuevoSub, setNuevoSub] = useState({});
  const agregarArea = async () => {
    if (!nuevaArea.trim()) return;
    try { await guardar('areas', null, { name: nuevaArea.trim(), order_index: datos.areas.length }); setNuevaArea(''); recargar(); }
    catch (e) { notificationService.error(e.message); }
  };
  const agregarSub = async (areaId) => {
    const nombre = (nuevoSub[areaId] || '').trim();
    if (!nombre) return;
    try {
      await guardar('subprocesses', null, { area_id: areaId, name: nombre, order_index: datos.subprocesos.filter((s) => s.area_id === areaId).length });
      setNuevoSub((s) => ({ ...s, [areaId]: '' })); recargar();
    } catch (e) { notificationService.error(e.message); }
  };
  const borrar = async (tabla, id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"? Los riesgos ligados quedarán sin ${tabla === 'areas' ? 'área' : 'subproceso'}.`)) return;
    try { await eliminar(tabla, id); recargar(); } catch (e) { notificationService.error(e.message); }
  };

  return (
    <div className="sp-card" style={{ padding: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, marginBottom: 4 }}>Universo de procesos</h3>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>Áreas y subprocesos a los que se asignan los riesgos.</p>
      {puedeEditar && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, maxWidth: 520 }}>
          <input className="sp-input" value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} placeholder="Nueva área (ej. Crédito y Cobranza)" onKeyDown={(e) => e.key === 'Enter' && agregarArea()} />
          <button className="sp-btn" onClick={agregarArea} style={{ background: 'var(--primary)', color: '#fff', whiteSpace: 'nowrap' }}>Agregar área</button>
        </div>
      )}
      {datos.areas.length === 0 ? (
        <EmptyState icon="🏛️" title="Sin áreas" desc="Agrega las áreas de la organización para clasificar los riesgos." />
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
          {datos.areas.map((a) => {
            const subs = datos.subprocesos.filter((s) => s.area_id === a.id);
            const nR = datos.riesgos.filter((r) => r.area_id === a.id).length;
            return (
              <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{a.name}</strong>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="sp-badge" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>{nR} riesgos</span>
                    {puedeBorrar && <button onClick={() => borrar('areas', a.id, a.name)} aria-label={`Eliminar ${a.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>🗑</button>}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                  {subs.map((s) => (
                    <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px dashed var(--border)', color: 'var(--text2)' }}>
                      <span>{s.name}</span>
                      {puedeBorrar && <button onClick={() => borrar('subprocesses', s.id, s.name)} aria-label={`Eliminar ${s.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12 }}>✕</button>}
                    </li>
                  ))}
                </ul>
                {puedeEditar && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input className="sp-input" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="Nuevo subproceso" value={nuevoSub[a.id] || ''} onChange={(e) => setNuevoSub((x) => ({ ...x, [a.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && agregarSub(a.id)} />
                    <button className="sp-btn" onClick={() => agregarSub(a.id)} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 10px', fontSize: 12 }}>+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────── Módulo principal ───────────── */
export default function ModuloRiesgos() {
  const datos = useDatosRiesgo();
  const cliente = useStore((s) => s.currentClient);
  const apetito = cliente?.risk_appetite ?? 25;
  const can = useStore.use.can();
  const puedeEditar = can('update', 'risks');
  const puedeCrear = can('create', 'risks');
  const puedeBorrar = can('delete', 'risks');

  const [tab, setTab] = useState('panorama');
  const [modoMatriz, setModoMatriz] = useState('residual');
  const [celda, setCelda] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [modal, setModal] = useState(null); // { tipo, item, extra }
  const [porBorrar, setPorBorrar] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [revisando, setRevisando] = useState(false);

  const descargarInforme = async () => {
    setGenerando(true);
    try {
      const st = useStore.getState();
      await generarInformeRiesgos({ datos, organizacion: st.currentOrganization, cliente: st.currentClient, autor: st.profile?.full_name || st.profile?.email });
    } catch (e) { notificationService.error('No se pudo generar el informe: ' + e.message); }
    setGenerando(false);
  };
  const revisarAlertas = async () => {
    setRevisando(true);
    const { data, error } = await supabase.rpc('fn_alertas_grc');
    setRevisando(false);
    if (error) return notificationService.error('No se pudo ejecutar la revisión: ' + error.message);
    notificationService.success(data ? `Revisión completa: ${data} alerta(s) nueva(s) en el módulo Alertas.` : 'Revisión completa: sin alertas nuevas.');
    datos.recargar();
  };

  const nombre = useCallback((id) => {
    const p = datos.personas.find((x) => x.id === id);
    return p ? (p.full_name || p.email) : '—';
  }, [datos.personas]);
  const areaDe = (id) => datos.areas.find((a) => a.id === id)?.name || '—';
  const categoriaDe = (id) => {
    const c = datos.categorias.find((x) => x.id === id);
    if (!c) return '—';
    const p = c.parent_id ? datos.categorias.find((x) => x.id === c.parent_id) : null;
    return p ? `${p.name} › ${c.name}` : c.name;
  };
  const controlesDe = (rid) => datos.vinculos.filter((v) => v.risk_id === rid);

  const riesgosFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return datos.riesgos.filter((r) => {
      if (filtroArea && r.area_id !== filtroArea) return false;
      if (t && !`${r.code || ''} ${r.name} ${r.description || ''}`.toLowerCase().includes(t)) return false;
      if (celda) {
        const [p, i] = celda.split('-').map(Number);
        if (modoMatriz === 'inherente') { if (r.probability !== p || r.impact !== i) return false; }
        else {
          const v = r.residual_risk ?? r.inherent_risk;
          if (r.probability !== p || Math.max(1, Math.min(5, Math.round(v / p))) !== i) return false;
        }
      }
      return true;
    });
  }, [datos.riesgos, busca, filtroArea, celda, modoMatriz]);

  const activos = datos.riesgos.filter((r) => r.status === 'activo');
  const criticos = activos.filter((r) => (r.residual_risk ?? r.inherent_risk) >= 17).length;
  const altos = activos.filter((r) => { const v = r.residual_risk ?? r.inherent_risk; return v >= 10 && v < 17; }).length;
  const sinControl = activos.filter((r) => controlesDe(r.id).length === 0).length;
  const controlesInefectivos = datos.controles.filter((c) => c.test_result === 'inefectivo' || c.status === 'no_operando').length;
  const planesVencidos = datos.planes.filter((p) => p.status !== 'cerrado' && p.due_date && p.due_date < hoy()).length;
  const fueraApetito = activos.filter((r) => (r.residual_risk ?? r.inherent_risk) > apetito).length;
  const reduccion = (() => {
    const inh = activos.reduce((s, r) => s + (r.inherent_risk || 0), 0);
    const res = activos.reduce((s, r) => s + (r.residual_risk ?? r.inherent_risk ?? 0), 0);
    return inh ? Math.round((1 - res / inh) * 100) : 0;
  })();

  const cerrarModal = () => setModal(null);
  const trasGuardar = () => { setModal(null); datos.recargar(); };

  const confirmarBorrado = async () => {
    const { tabla, id } = porBorrar;
    setPorBorrar(null);
    try { await eliminar(tabla, id); notificationService.success('Registro eliminado.'); datos.recargar(); }
    catch (e) { notificationService.error(e.message); }
  };

  const Tarjeta = ({ etiqueta, valor, nota, color }) => (
    <div className="sp-card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{etiqueta}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--text)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      {nota && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{nota}</div>}
    </div>
  );

  const BotonNuevo = ({ texto, onClick }) => (puedeCrear ? (
    <button className="sp-btn solo-edicion" onClick={onClick} style={{ background: 'var(--primary)', color: '#fff', padding: '9px 16px', fontWeight: 600 }}>+ {texto}</button>
  ) : null);

  if (datos.cargando) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Cargando matriz de riesgos…</div>;
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Riesgos y Controles</h1>
          <p className="page-subtitle">{cliente ? `${cliente.name} · ` : ''}Identificación, evaluación y respuesta al riesgo · COSO ERM 2017 · ISO 31000</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="sp-btn" onClick={revisarAlertas} disabled={revisando} title="Busca planes vencidos, controles sin probar y riesgos críticos sin respuesta"
            style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {revisando ? 'Revisando…' : '🔔 Revisar alertas'}
          </button>
          <button className="sp-btn" onClick={descargarInforme} disabled={generando || datos.riesgos.length === 0}
            title={datos.riesgos.length ? 'Descargar informe con marca C&C' : 'Registra riesgos para generar el informe'}
            style={{ background: 'var(--primary)', color: '#fff' }}>
            {generando ? 'Generando…' : 'Descargar informe PDF'}
          </button>
        </div>
      </div>

      <TabBar
        active={tab}
        onChange={setTab}
        style={{ marginBottom: 18 }}
        tabs={[
          { id: 'panorama', icon: '🧭', label: 'Panorama' },
          { id: 'rcm', icon: '🧮', label: 'Matriz RCM' },
          { id: 'riesgos', icon: '⚠️', label: `Riesgos (${datos.riesgos.length})` },
          { id: 'controles', icon: '🛡️', label: `Controles (${datos.controles.length})` },
          { id: 'pruebas', icon: '🧪', label: 'Pruebas' },
          { id: 'planes', icon: '📌', label: `Planes de acción (${datos.planes.filter((p) => p.status !== 'cerrado').length})` },
          { id: 'procesos', icon: '🏛️', label: 'Áreas y procesos' },
        ]}
      />

      {/* ── PANORAMA ── */}
      {tab === 'panorama' && (
        <>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 18 }}>
            <Tarjeta etiqueta="Riesgos activos" valor={activos.length} nota={`${datos.riesgos.length} en total`} />
            <Tarjeta etiqueta="Críticos (residual)" valor={criticos} color={criticos ? 'var(--red)' : undefined} nota="Puntaje 17–25" />
            <Tarjeta etiqueta="Altos (residual)" valor={altos} color={altos ? 'var(--gold)' : undefined} nota="Puntaje 10–16" />
            <Tarjeta etiqueta="Fuera de apetito" valor={fueraApetito} color={fueraApetito ? 'var(--red)' : undefined} nota={`Residual mayor a ${apetito}`} />
            <Tarjeta etiqueta="Sin control asignado" valor={sinControl} color={sinControl ? 'var(--gold)' : undefined} nota="Riesgos activos" />
            <Tarjeta etiqueta="Controles con falla" valor={controlesInefectivos} color={controlesInefectivos ? 'var(--red)' : undefined} nota="Inefectivos o no operando" />
            <Tarjeta etiqueta="Planes vencidos" valor={planesVencidos} color={planesVencidos ? 'var(--red)' : undefined} nota={`Mitigación lograda: ${reduccion}%`} />
          </div>

          {datos.riesgos.length === 0 ? (
            <div className="sp-card" style={{ padding: 32 }}>
              <EmptyState icon="🧭" title="Aún no hay riesgos registrados"
                desc="Empieza por definir las áreas y subprocesos, después registra los riesgos con su probabilidad e impacto, y vincula los controles que los mitigan."
                action={puedeCrear ? (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="sp-btn" onClick={() => setTab('procesos')} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>1 · Definir áreas</button>
                    <button className="sp-btn" onClick={() => setModal({ tipo: 'riesgo' })} style={{ background: 'var(--primary)', color: '#fff' }}>2 · Registrar primer riesgo</button>
                  </div>
                ) : null} />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', alignItems: 'start' }}>
              <div className="sp-card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, margin: 0 }}>Mapa de calor</h3>
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', padding: 3, borderRadius: 8 }}>
                    {['inherente', 'residual'].map((m) => (
                      <button key={m} onClick={() => { setModoMatriz(m); setCelda(null); }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: modoMatriz === m ? 'var(--bg2)' : 'transparent', color: modoMatriz === m ? 'var(--text)' : 'var(--text3)' }}>
                        {m === 'inherente' ? 'Inherente' : 'Residual'}
                      </button>
                    ))}
                  </div>
                </div>
                <MatrizCalor apetito={apetito} riesgos={activos} modo={modoMatriz} seleccion={celda} onSeleccion={(c) => { setCelda(c); if (c) setTab('riesgos'); }} />
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}><span style={{ width: 12, height: 10, borderRadius: 3, border: '1.5px dashed rgba(215,0,21,.6)' }} />Fuera de apetito (&gt; {apetito})</span>
                  {NIVELES.map((n) => <span key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}><span style={{ width: 10, height: 10, borderRadius: 99, background: n.solido }} />{n.label}</span>)}
                </div>
              </div>

              <div className="sp-card" style={{ padding: 22 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, marginBottom: 14 }}>Riesgos prioritarios</h3>
                {[...activos].sort((a, b) => (b.residual_risk ?? b.inherent_risk) - (a.residual_risk ?? a.inherent_risk)).slice(0, 8).map((r) => (
                  <button key={r.id} onClick={() => setModal({ tipo: 'riesgo', item: r })}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}>
                    <Nivel valor={r.residual_risk ?? r.inherent_risk} compacto />
                    <span style={{ flex: 1, fontSize: 13 }}><strong style={{ color: 'var(--text3)', marginRight: 6 }}>{r.code}</strong>{r.name}</span>
                    <span style={{ fontSize: 11, color: controlesDe(r.id).length ? 'var(--text3)' : 'var(--gold)', whiteSpace: 'nowrap' }}>
                      {controlesDe(r.id).length ? `${controlesDe(r.id).length} control(es)` : 'Sin control'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {datos.riesgos.length > 0 && (
            <div className="sp-card" style={{ padding: 22, marginTop: 18 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, marginBottom: 4 }}>Objetivos estratégicos expuestos</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Riesgo residual máximo que amenaza cada objetivo del Mapa Estratégico.</p>
              {(() => {
                const filas = datos.objetivos.map((o) => {
                  const rs = activos.filter((r) => r.objective_id === o.id);
                  const max = rs.reduce((m, r) => Math.max(m, r.residual_risk ?? r.inherent_risk ?? 0), 0);
                  return { o, rs, max };
                }).filter((x) => x.rs.length).sort((a, b) => b.max - a.max);
                const sinVinculo = activos.filter((r) => !r.objective_id).length;
                return (
                  <>
                    {filas.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text3)' }}>Aún no hay riesgos vinculados a objetivos. Ábrelos y elige "Objetivo estratégico que amenaza".</div>
                    ) : filas.map(({ o, rs, max }) => (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <Nivel valor={max} compacto />
                        <span style={{ flex: 1, fontSize: 14 }}>{o.code && <strong style={{ color: 'var(--text3)', marginRight: 6 }}>{o.code}</strong>}{o.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{rs.length} riesgo(s)</span>
                      </div>
                    ))}
                    {sinVinculo > 0 && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 10 }}>{sinVinculo} riesgo(s) activo(s) sin objetivo vinculado.</div>}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── RIESGOS ── */}
      {tab === 'riesgos' && (
        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 10, padding: 16, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <input className="sp-input" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por código, nombre o descripción" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <div style={{ width: 220 }}><Sel value={filtroArea} onChange={setFiltroArea} opciones={aOpciones(datos.areas)} vacio="Todas las áreas" /></div>
            {celda && (
              <button className="sp-btn" onClick={() => setCelda(null)} style={{ background: 'var(--gold-light)', color: 'var(--gold)', border: '1px solid var(--gold)', fontSize: 12 }}>
                Celda P{celda.split('-')[0]}×I{celda.split('-')[1]} ({modoMatriz}) ✕
              </button>
            )}
            <BotonNuevo texto="Nuevo riesgo" onClick={() => setModal({ tipo: 'riesgo' })} />
          </div>
          {riesgosFiltrados.length === 0 ? (
            <div style={{ padding: 32 }}><EmptyState icon="⚠️" title="Sin riesgos" desc={datos.riesgos.length ? 'Ningún riesgo coincide con el filtro.' : 'Registra el primer riesgo.'} /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr>
                  <th style={th}>Código</th><th style={th}>Riesgo</th><th style={th}>Área</th><th style={th}>Categoría</th>
                  <th style={th}>P×I</th><th style={th}>Inherente</th><th style={th}>Residual</th><th style={th}>Controles</th><th style={th}>Estado</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {riesgosFiltrados.map((r) => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setModal({ tipo: 'riesgo', item: r })}>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text2)' }}>{r.code || '—'}</td>
                      <td style={{ ...td, maxWidth: 320 }}>{r.name}<div style={{ fontSize: 11, color: 'var(--text3)' }}>Dueño: {nombre(r.owner_id)}</div></td>
                      <td style={td}>{areaDe(r.area_id)}</td>
                      <td style={{ ...td, fontSize: 12, color: 'var(--text2)' }}>{categoriaDe(r.category_id)}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.probability}×{r.impact}</td>
                      <td style={td}><Nivel valor={r.inherent_risk} compacto /></td>
                      <td style={td}><Nivel valor={r.residual_risk} />{(r.residual_risk ?? r.inherent_risk) > apetito && <div style={{ fontSize: 10.5, color: 'var(--red)', marginTop: 3, fontWeight: 600 }}>Fuera de apetito</div>}</td>
                      <td style={td}>{controlesDe(r.id).length || <span style={{ color: 'var(--gold)' }}>0</span>}</td>
                      <td style={td}>{ESTADO_RIESGO[r.status]}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        {puedeEditar && <button title="Agregar plan de acción" onClick={() => setModal({ tipo: 'plan', extra: r.id })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>📌</button>}
                        {puedeBorrar && <button title="Eliminar" aria-label={`Eliminar ${r.name}`} onClick={() => setPorBorrar({ tabla: 'risks', id: r.id, nombre: r.name })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CONTROLES ── */}
      {tab === 'controles' && (
        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>La efectividad se calcula con la evaluación de diseño y el resultado de la prueba.</span>
            <BotonNuevo texto="Nuevo control" onClick={() => setModal({ tipo: 'control' })} />
          </div>
          {datos.controles.length === 0 ? (
            <div style={{ padding: 32 }}><EmptyState icon="🛡️" title="Sin controles" desc="Registra los controles y vincúlalos a los riesgos que mitigan." /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr>
                  <th style={th}>Código</th><th style={th}>Control</th><th style={th}>Tipo</th><th style={th}>Naturaleza</th><th style={th}>Frecuencia</th>
                  <th style={th}>Diseño</th><th style={th}>Prueba</th><th style={th}>Efectividad</th><th style={th}>Riesgos</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {datos.controles.map((c) => {
                    const v = datos.vinculos.filter((x) => x.control_id === c.id);
                    const colorPrueba = c.test_result === 'efectivo' ? 'var(--green)' : c.test_result === 'inefectivo' ? 'var(--red)' : c.test_result ? 'var(--gold)' : 'var(--text3)';
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setModal({ tipo: 'control', item: c })}>
                        <td style={{ ...td, fontWeight: 700, color: 'var(--text2)' }}>{c.code || '—'}</td>
                        <td style={{ ...td, maxWidth: 300 }}>{c.name}<div style={{ fontSize: 11, color: 'var(--text3)' }}>{nombre(c.responsible_id)}{c.prevents_fraud ? ' · Antifraude' : ''}</div></td>
                        <td style={td}>{TIPO_CONTROL[c.type]}</td>
                        <td style={td}>{NATURALEZA[c.nature]}</td>
                        <td style={td}>{FRECUENCIA[c.frequency] || '—'}</td>
                        <td style={td}>{DISENO[c.design_evaluation] || <span style={{ color: 'var(--text3)' }}>Sin evaluar</span>}</td>
                        <td style={{ ...td, color: colorPrueba, fontWeight: 600 }}>{PRUEBA[c.test_result] || 'Sin probar'}</td>
                        <td style={td}>{c.effectiveness != null ? `${c.effectiveness}/5` : '—'}</td>
                        <td style={td}>{v.length}{v.some((x) => x.is_key_control) && <span title="Control clave" style={{ color: 'var(--gold)', marginLeft: 4 }}>★</span>}</td>
                        <td style={td} onClick={(e) => e.stopPropagation()}>
                          {puedeBorrar && <button aria-label={`Eliminar ${c.name}`} onClick={() => setPorBorrar({ tabla: 'controls', id: c.id, nombre: c.name })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PLANES DE ACCIÓN ── */}
      {tab === 'planes' && (
        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Seguimiento de observaciones: responsable, fecha compromiso y evidencia de cierre.</span>
            <BotonNuevo texto="Nuevo plan" onClick={() => setModal({ tipo: 'plan' })} />
          </div>
          {datos.planes.length === 0 ? (
            <div style={{ padding: 32 }}><EmptyState icon="📌" title="Sin planes de acción" desc="Registra hallazgos y compromisos de remediación." /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead><tr>
                  <th style={th}>Hallazgo / acción</th><th style={th}>Riesgo</th><th style={th}>Responsable</th><th style={th}>Compromiso</th><th style={th}>Estado</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {[...datos.planes].sort((a, b) => (a.status === 'cerrado') - (b.status === 'cerrado') || String(a.due_date || '9').localeCompare(String(b.due_date || '9'))).map((p) => {
                    const vencido = p.status !== 'cerrado' && p.due_date && p.due_date < hoy();
                    const r = datos.riesgos.find((x) => x.id === p.risk_id);
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer', opacity: p.status === 'cerrado' ? 0.6 : 1 }} onClick={() => setModal({ tipo: 'plan', item: p })}>
                        <td style={{ ...td, maxWidth: 340 }}>{p.title}</td>
                        <td style={{ ...td, fontSize: 12 }}>{r ? `${r.code || ''} ${r.name}` : '—'}</td>
                        <td style={td}>{nombre(p.responsible_id)}</td>
                        <td style={{ ...td, color: vencido ? 'var(--red)' : 'var(--text)', fontWeight: vencido ? 700 : 400, whiteSpace: 'nowrap' }}>{fmtFecha(p.due_date)}{vencido && ' · Vencido'}</td>
                        <td style={td}>{ESTADO_PLAN[vencido ? 'vencido' : p.status]}</td>
                        <td style={td} onClick={(e) => e.stopPropagation()}>
                          {puedeBorrar && <button aria-label={`Eliminar ${p.title}`} onClick={() => setPorBorrar({ tabla: 'action_plans', id: p.id, nombre: p.title })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'rcm' && (
        <MatrizRCM datos={datos} cliente={cliente}
          onAbrirRiesgo={(r) => setModal({ tipo: 'riesgo', item: r })}
          onAbrirControl={(c) => setModal({ tipo: 'control', item: c })} />
      )}

      {tab === 'pruebas' && <PruebasControl datos={datos} />}

      {tab === 'procesos' && <AreasProcesos datos={datos} puedeEditar={puedeEditar} puedeBorrar={puedeBorrar} recargar={datos.recargar} />}

      {/* ── Modales ── */}
      <Modal isOpen={modal?.tipo === 'riesgo'} onClose={cerrarModal} title={modal?.item ? `Riesgo ${modal.item.code || ''}` : 'Nuevo riesgo'} maxWidth={820}>
        {modal?.tipo === 'riesgo' && <FormRiesgo riesgo={modal.item} datos={datos} puedeEditar={modal.item ? puedeEditar : puedeCrear} onCerrar={cerrarModal} onGuardado={trasGuardar} />}
      </Modal>
      <Modal isOpen={modal?.tipo === 'control'} onClose={cerrarModal} title={modal?.item ? `Control ${modal.item.code || ''}` : 'Nuevo control'} maxWidth={820}>
        {modal?.tipo === 'control' && <FormControl control={modal.item} datos={datos} puedeEditar={modal.item ? puedeEditar : puedeCrear} onCerrar={cerrarModal} onGuardado={trasGuardar} />}
      </Modal>
      <Modal isOpen={modal?.tipo === 'plan'} onClose={cerrarModal} title={modal?.item ? 'Plan de acción' : 'Nuevo plan de acción'} maxWidth={760}>
        {modal?.tipo === 'plan' && <FormPlan plan={modal.item} riesgoInicial={modal.extra} datos={datos} puedeEditar={modal.item ? puedeEditar : puedeCrear} onCerrar={cerrarModal} onGuardado={trasGuardar} />}
      </Modal>
      <ConfirmationModal isOpen={!!porBorrar} title="Eliminar registro" danger confirmLabel="Eliminar"
        message={porBorrar ? `¿Eliminar "${porBorrar.nombre}"? Esta acción queda registrada en la bitácora.` : ''}
        onConfirm={confirmarBorrado} onCancel={() => setPorBorrar(null)} />
    </div>
  );
}
