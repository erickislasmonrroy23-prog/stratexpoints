import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { Modal } from './SharedUI.jsx';
import { generarBoardPack } from './boardPackPDF.js';

/* ─────────────────────────────────────────────────────────────
   Plan Anual de Auditoría basado en riesgos (IIA · Norma 2010)
   · Propuesta automática desde la Matriz de Riesgos
   · Calendario trimestral, horas presupuestadas vs reales, avance
   · Board pack trimestral para el consejo / comité de auditoría
   ───────────────────────────────────────────────────────────── */

const TIPO = { auditoria: 'Auditoría', revision_controles: 'Revisión de controles', seguimiento: 'Seguimiento', consultoria: 'Consultoría', especial: 'Especial' };
const PRIORIDAD = { alta: ['Alta', '#D70015', '#FDE4E6'], media: ['Media', '#9A6400', '#FFF4D1'], baja: ['Baja', '#248A3D', '#E3F5E8'] };
const ESTADO = {
  planeada: ['Planeada', 'var(--bg3)', 'var(--text2)'], en_curso: ['En curso', '#E8F1FC', '#0071E3'], en_revision: ['En revisión', '#FFF4D1', '#9A6400'],
  concluida: ['Concluida', '#E3F5E8', '#248A3D'], cancelada: ['Cancelada', 'var(--bg3)', 'var(--text3)'],
};
const CALIF = { satisfactorio: ['Satisfactorio', '#248A3D'], requiere_mejora: ['Requiere mejora', '#9A6400'], insatisfactorio: ['Insatisfactorio', '#D70015'] };
const chip = ([t, c, bg]) => <span className="sp-badge" style={{ background: bg, color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>{t}</span>;
const chipE = (k) => { const [t, bg, c] = ESTADO[k] || ESTADO.planeada; return <span className="sp-badge" style={{ background: bg, color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>{t}</span>; };
const trimestreActual = () => Math.floor(new Date().getMonth() / 3) + 1;

function FormItem({ item, year, areas, personas, puedeEditar, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => ({
    title: '', area_id: '', audit_type: 'auditoria', priority: 'media', quarter: trimestreActual(), start_date: '', end_date: '',
    budget_hours: '', actual_hours: '', lead_id: '', status: 'planeada', progress: 0, rating: '', rationale: '', conclusion: '', ...(item || {}),
  }));
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const num = (v) => (v === '' || v == null ? null : Number(v));

  const guardar = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return notificationService.error('El nombre del trabajo es obligatorio.');
    if (f.status === 'concluida' && !f.rating) return notificationService.error('Para concluir, registra la calificación del trabajo.');
    setGuardando(true);
    const payload = {
      year, title: f.title.trim(), area_id: f.area_id || null, audit_type: f.audit_type, priority: f.priority, quarter: num(f.quarter),
      start_date: f.start_date || null, end_date: f.end_date || null, budget_hours: num(f.budget_hours), actual_hours: num(f.actual_hours),
      lead_id: f.lead_id || null, status: f.status, progress: Number(f.progress) || 0, rating: f.rating || null,
      rationale: f.rationale || null, conclusion: f.conclusion || null,
    };
    const res = item?.id ? await supabase.from('audit_plan_items').update(payload).eq('id', item.id) : await supabase.from('audit_plan_items').insert(payload);
    setGuardando(false);
    if (res.error) return notificationService.error(res.error.message);
    notificationService.success(item ? 'Trabajo actualizado.' : 'Trabajo agregado al plan.');
    onGuardado();
  };

  const G = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>{children}</div>;
  return (
    <form onSubmit={guardar}>
      <fieldset disabled={!puedeEditar} style={{ border: 0, padding: 0, margin: 0 }}>
        <G>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Trabajo</label><input className="sp-input" value={f.title} onChange={set('title')} required /></div>
          <div><label className="sp-label">Área / proceso</label>
            <select className="sp-input" value={f.area_id || ''} onChange={set('area_id')}><option value="">Transversal</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div><label className="sp-label">Tipo</label>
            <select className="sp-input" value={f.audit_type} onChange={set('audit_type')}>{Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="sp-label">Prioridad</label>
            <select className="sp-input" value={f.priority} onChange={set('priority')}>{Object.entries(PRIORIDAD).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
          <div><label className="sp-label">Trimestre</label>
            <select className="sp-input" value={f.quarter || ''} onChange={set('quarter')}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>T{q}</option>)}</select></div>
          <div><label className="sp-label">Inicio</label><input type="date" className="sp-input" value={f.start_date || ''} onChange={set('start_date')} /></div>
          <div><label className="sp-label">Fin</label><input type="date" className="sp-input" value={f.end_date || ''} onChange={set('end_date')} /></div>
          <div><label className="sp-label">Horas presupuestadas</label><input type="number" min={0} className="sp-input" value={f.budget_hours ?? ''} onChange={set('budget_hours')} /></div>
          <div><label className="sp-label">Horas reales</label><input type="number" min={0} className="sp-input" value={f.actual_hours ?? ''} onChange={set('actual_hours')} /></div>
          <div><label className="sp-label">Responsable</label>
            <select className="sp-input" value={f.lead_id || ''} onChange={set('lead_id')}><option value="">Sin asignar</option>{personas.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
          <div><label className="sp-label">Estado</label>
            <select className="sp-input" value={f.status} onChange={set('status')}>{Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Avance: {f.progress}%</label><input type="range" min={0} max={100} step={5} value={f.progress} onChange={set('progress')} style={{ width: '100%' }} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Justificación (basada en riesgos)</label><textarea className="sp-input" rows={2} value={f.rationale || ''} onChange={set('rationale')} /></div>
          <div><label className="sp-label">Calificación del trabajo</label>
            <select className="sp-input" value={f.rating || ''} onChange={set('rating')}><option value="">Pendiente</option>{Object.entries(CALIF).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Conclusión</label><textarea className="sp-input" rows={2} value={f.conclusion || ''} onChange={set('conclusion')} /></div>
        </G>
      </fieldset>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cancelar</button>
        {puedeEditar && <button type="submit" className="sp-btn" disabled={guardando} style={{ background: 'var(--primary)', color: '#fff' }}>{guardando ? 'Guardando…' : 'Guardar'}</button>}
      </div>
    </form>
  );
}

export default function ModuloPlanAuditoria() {
  const can = useStore.use.can();
  const cliente = useStore((s) => s.currentClient);
  const puedeEditar = can('update', 'audit_plan_items');
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [modal, setModal] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [boardPack, setBoardPack] = useState(false);

  const cargar = useCallback(async () => {
    const [i, a, p] = await Promise.all([
      supabase.from('audit_plan_items').select('*').eq('year', year).order('quarter').order('priority'),
      supabase.from('areas').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
    ]);
    if (i.error) notificationService.error('No se pudo cargar el plan: ' + i.error.message);
    setItems(i.data || []); setAreas(a.data || []); setPersonas(p.data || []);
  }, [year]);
  useEffect(() => { cargar(); }, [cargar]);

  const proponer = async () => {
    setGenerando(true);
    const { data, error } = await supabase.rpc('fn_proponer_plan_auditoria', { p_year: year });
    setGenerando(false);
    if (error) return notificationService.error(error.message);
    notificationService.success(data ? `Se propusieron ${data} trabajo(s) con base en la matriz de riesgos.` : 'No hay áreas nuevas por proponer: registra riesgos por área o el plan ya las incluye.');
    cargar();
  };
  const descargarBoardPack = async () => {
    setBoardPack(true);
    try { await generarBoardPack({ cliente, organizacion: useStore.getState().currentOrganization }); }
    catch (e) { notificationService.error('No se pudo generar el board pack: ' + e.message); }
    setBoardPack(false);
  };

  const activos = items.filter((i) => i.status !== 'cancelada');
  const avance = activos.length ? Math.round(activos.reduce((s, i) => s + (i.progress || 0), 0) / activos.length) : 0;
  const hp = activos.reduce((s, i) => s + (Number(i.budget_hours) || 0), 0);
  const hr = activos.reduce((s, i) => s + (Number(i.actual_hours) || 0), 0);
  const concluidos = activos.filter((i) => i.status === 'concluida').length;
  const atrasados = activos.filter((i) => i.status !== 'concluida' && year === new Date().getFullYear() && i.quarter && i.quarter < trimestreActual()).length;
  const areaDe = (id) => areas.find((a) => a.id === id)?.name || 'Transversal';
  const nombre = (id) => { const p = personas.find((x) => x.id === id); return p ? (p.full_name || p.email) : ''; };
  const porQ = useMemo(() => [1, 2, 3, 4].map((q) => items.filter((i) => i.quarter === q)), [items]);

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Plan anual de auditoría</h1>
          <p className="page-subtitle">{cliente ? `${cliente.name} · ` : ''}Programa basado en riesgos · Normas Globales de Auditoría Interna (IIA)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="sp-input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 110 }} aria-label="Año del plan">
            {[-1, 0, 1, 2].map((d) => { const y = new Date().getFullYear() + d; return <option key={y} value={y}>{y}</option>; })}
          </select>
          {puedeEditar && <button className="sp-btn solo-edicion" onClick={proponer} disabled={generando} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>{generando ? 'Analizando riesgos…' : '✨ Proponer plan desde riesgos'}</button>}
          {puedeEditar && <button className="sp-btn solo-edicion" onClick={() => setModal({})} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>+ Trabajo</button>}
          <button className="sp-btn" onClick={descargarBoardPack} disabled={boardPack} style={{ background: 'var(--primary)', color: '#fff' }}>{boardPack ? 'Generando…' : 'Board pack trimestral'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 18 }}>
        {[['Trabajos', activos.length], ['Avance del plan', `${avance}%`], ['Concluidos', `${concluidos} / ${activos.length}`],
          ['Horas reales / presupuesto', `${hr} / ${hp}`, hp && hr > hp ? 'var(--red)' : null], ['Atrasados', atrasados, atrasados ? 'var(--red)' : null]].map(([t, v, c]) => (
          <div key={t} className="sp-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden', marginBottom: 22 }} aria-label={`Avance del plan ${avance}%`}>
        <div style={{ width: `${avance}%`, height: '100%', background: 'var(--primary)', transition: 'width .4s' }} />
      </div>

      {items.length === 0 ? (
        <div className="sp-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🗓️</div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>Sin plan para {year}</div>
          <p style={{ color: 'var(--text3)', fontSize: 14, maxWidth: 460, margin: '8px auto 16px' }}>
            Usa <strong>Proponer plan desde riesgos</strong>: se priorizan las áreas por riesgo residual, riesgos críticos, fuera de apetito y deficiencias de control.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
          {porQ.map((lista, idx) => (
            <div key={idx} style={{ background: 'var(--bg3)', borderRadius: 18, padding: 12, minHeight: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' }}>
                <strong style={{ fontSize: 15 }}>T{idx + 1} {year}</strong>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{lista.length} trabajo(s) · {lista.reduce((s, i) => s + (Number(i.budget_hours) || 0), 0)} h</span>
              </div>
              {lista.map((i) => (
                <button key={i.id} onClick={() => setModal({ item: i })} className="sp-card"
                  style={{ width: '100%', textAlign: 'left', padding: 12, marginBottom: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, opacity: i.status === 'cancelada' ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{i.title}</span>
                    {chip(PRIORIDAD[i.priority])}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{TIPO[i.audit_type]} · {areaDe(i.area_id)}{i.lead_id ? ` · ${nombre(i.lead_id)}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden' }}><div style={{ width: `${i.progress}%`, height: '100%', background: i.status === 'concluida' ? 'var(--green)' : 'var(--primary)' }} /></div>
                    <span style={{ fontSize: 11.5, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{i.progress}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {chipE(i.status)}
                    {i.rating && <span style={{ fontSize: 11.5, fontWeight: 600, color: CALIF[i.rating][1] }}>{CALIF[i.rating][0]}</span>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.item ? modal.item.title : `Nuevo trabajo · Plan ${year}`} maxWidth={760}>
        {modal && <FormItem item={modal.item} year={year} areas={areas} personas={personas} puedeEditar={puedeEditar} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); cargar(); }} />}
      </Modal>
    </div>
  );
}
