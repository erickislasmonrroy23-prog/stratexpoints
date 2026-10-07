import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { PLANTILLAS } from './plantillasIndustria.js';

/* ─────────────────────────────────────────────────────────────
   Importar Matriz de Riesgos y Controles
   · Desde Excel/CSV del cliente (reconoce columnas aunque se llamen distinto)
   · Desde plantilla por industria (SOFOM, Hospital, Corporativo)
   Un renglón = par riesgo–control. Crea áreas, subprocesos, riesgos,
   controles y vínculos sin duplicar lo que ya existe en el expediente.
   ───────────────────────────────────────────────────────────── */

export const CAMPOS = [
  { k: 'area', t: 'Proceso / Área', req: true, sin: ['area', 'proceso', 'macroproceso', 'departamento', 'unidad', 'ciclo'] },
  { k: 'subproceso', t: 'Subproceso', sin: ['subproceso', 'sub proceso', 'actividad', 'subarea'] },
  { k: 'riesgo_codigo', t: 'ID del riesgo', sin: ['id riesgo', 'codigo riesgo', 'clave riesgo', 'no riesgo', 'num riesgo', 'ref riesgo', 'riesgo id'] },
  { k: 'riesgo', t: 'Riesgo', req: true, sin: ['riesgo', 'nombre del riesgo', 'descripcion del riesgo', 'evento de riesgo', 'risk'] },
  { k: 'descripcion', t: 'Descripción (causa/consecuencia)', sin: ['descripcion', 'causa', 'consecuencia', 'detalle del riesgo'] },
  { k: 'categoria', t: 'Categoría', sin: ['categoria', 'tipo de riesgo', 'clasificacion', 'taxonomia'] },
  { k: 'probabilidad', t: 'Probabilidad (1–5)', sin: ['probabilidad', 'frecuencia del riesgo', 'likelihood', 'ocurrencia'] },
  { k: 'impacto', t: 'Impacto (1–5)', sin: ['impacto', 'severidad', 'impact', 'consecuencia nivel'] },
  { k: 'error_potencial', t: 'Error potencial', sin: ['error potencial', 'que puede salir mal', 'wcgw'] },
  { k: 'cuenta', t: 'Cuenta contable', sin: ['cuenta', 'cuenta contable', 'rubro', 'cuenta afectada'] },
  { k: 'aseveraciones', t: 'Aseveraciones', sin: ['aseveraciones', 'aseveracion', 'afirmaciones', 'assertions'] },
  { k: 'control_codigo', t: 'ID del control', sin: ['id control', 'codigo control', 'clave control', 'no control', 'ref control', 'control id'] },
  { k: 'control', t: 'Control', sin: ['control', 'actividad de control', 'descripcion del control', 'control clave descripcion', 'mitigante'] },
  { k: 'objetivo_control', t: 'Objetivo de control', sin: ['objetivo de control', 'objetivo del control'] },
  { k: 'tipo', t: 'Tipo (preventivo/detectivo)', sin: ['tipo de control', 'tipo control', 'tipo'] },
  { k: 'naturaleza', t: 'Naturaleza (manual/automático)', sin: ['naturaleza', 'manual automatico', 'automatizacion'] },
  { k: 'frecuencia', t: 'Frecuencia', sin: ['frecuencia', 'periodicidad', 'frecuencia del control'] },
  { k: 'clave', t: 'Control clave (Sí/No)', sin: ['clave', 'control clave', 'key control', 'es clave'] },
  { k: 'responsable', t: 'Responsable (texto)', sin: ['responsable', 'dueño', 'owner', 'ejecutor'] },
  { k: 'diseno', t: 'Evaluación de diseño', sin: ['diseno', 'evaluacion de diseno', 'tod', 'diseno del control'] },
  { k: 'operacion', t: 'Resultado de prueba', sin: ['operacion', 'eficacia operativa', 'toe', 'resultado de la prueba', 'resultado prueba', 'efectividad'] },
];

const limpiar = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Mapeo automático: columna del Excel → campo. Prefiere coincidencia exacta y luego parcial. */
export function autoMapeo(encabezados) {
  const m = {}; const usados = new Set();
  const pasos = [(h, s) => h === s, (h, s) => h.startsWith(s) || h.endsWith(s), (h, s) => h.includes(s)];
  for (const paso of pasos) {
    for (const c of CAMPOS) {
      if (m[c.k] != null) continue;
      const idx = encabezados.findIndex((h, i) => !usados.has(i) && c.sin.some((s) => paso(limpiar(h), s)));
      if (idx >= 0) { m[c.k] = idx; usados.add(idx); }
    }
  }
  return m;
}

const NIVEL = { 'muy baja': 1, 'muy bajo': 1, rara: 1, remota: 1, baja: 2, bajo: 2, improbable: 2, media: 3, medio: 3, moderada: 3, moderado: 3, posible: 3,
  alta: 4, alto: 4, probable: 4, mayor: 4, 'muy alta': 5, 'muy alto': 5, critico: 5, critica: 5, 'casi segura': 5, catastrofico: 5, extrema: 5 };
export function nivel15(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isNaN(n)) { if (n > 5 && n <= 100) return Math.min(5, Math.max(1, Math.ceil(n / 20))); return Math.min(5, Math.max(1, Math.round(n))); }
  return NIVEL[limpiar(v)] ?? null;
}
const tipoCtl = (v) => { const s = limpiar(v); return s.startsWith('det') ? 'detectivo' : s.startsWith('corr') ? 'correctivo' : s ? 'preventivo' : null; };
const natCtl = (v) => { const s = limpiar(v); return !s ? null : s.includes('semi') ? 'manual' : s.includes('auto') || s.includes('sistema') || s.includes('it') ? 'automatico' : 'manual'; };
export function frecuencia(v) {
  const s = limpiar(v);
  if (!s) return null;
  if (/(continu|cada operacion|por evento|transaccion|varias veces|multiple|recurrente)/.test(s)) return 'continua';
  if (/diari/.test(s)) return 'diaria';
  if (/seman|quincen/.test(s)) return 'semanal';
  if (/mensual|bimestr/.test(s)) return 'mensual';
  if (/trimestr|cuatrimestr|semestr/.test(s)) return 'trimestral';
  if (/anual/.test(s)) return 'anual';
  return null;
}
const siNo = (v) => /^(si|s|x|yes|y|1|verdadero|true|clave)$/.test(limpiar(v));
const evaluacion = (v, diseno) => {
  const s = limpiar(v); if (!s) return null;
  if (/(inefect|inadecu|deficien|no opera|falla)/.test(s)) return diseno ? 'inadecuado' : 'inefectivo';
  if (/(observ|mejora|parcial)/.test(s)) return 'necesita_mejora';
  if (/(efect|adecu|opera|satisf)/.test(s)) return diseno ? 'adecuado' : 'efectivo';
  return null;
};
const ASEV = ['Existencia u ocurrencia', 'Integridad', 'Exactitud', 'Valuación', 'Corte', 'Derechos y obligaciones', 'Presentación y revelación'];
const aseveraciones = (v) => {
  const s = limpiar(v); if (!s) return [];
  return ASEV.filter((a) => { const k = limpiar(a).split(' ')[0]; return s.includes(k) || (k === 'existencia' && s.includes('ocurrencia')); });
};

/** Convierte filas crudas en filas normalizadas + avisos. */
export function normalizar(filasCrudas, mapeo) {
  const val = (r, k) => (mapeo[k] == null ? '' : r[mapeo[k]]);
  const avisos = []; const filas = [];
  filasCrudas.forEach((r, i) => {
    const area = String(val(r, 'area') ?? '').trim(); const riesgo = String(val(r, 'riesgo') ?? '').trim();
    if (!area && !riesgo) return;
    if (!riesgo) { avisos.push(`Fila ${i + 2}: sin nombre de riesgo, se omitió.`); return; }
    const p = nivel15(val(r, 'probabilidad')); const im = nivel15(val(r, 'impacto'));
    if (mapeo.probabilidad != null && p == null) avisos.push(`Fila ${i + 2}: probabilidad "${val(r, 'probabilidad')}" no reconocida, se usará 3.`);
    if (mapeo.impacto != null && im == null) avisos.push(`Fila ${i + 2}: impacto "${val(r, 'impacto')}" no reconocido, se usará 3.`);
    filas.push({
      area: area || 'Sin área', subproceso: String(val(r, 'subproceso') ?? '').trim(),
      riesgo_codigo: String(val(r, 'riesgo_codigo') ?? '').trim(), riesgo, descripcion: String(val(r, 'descripcion') ?? '').trim(),
      categoria: String(val(r, 'categoria') ?? '').trim(), probabilidad: p ?? 3, impacto: im ?? 3,
      error_potencial: String(val(r, 'error_potencial') ?? '').trim(), cuenta: String(val(r, 'cuenta') ?? '').trim(), aseveraciones: aseveraciones(val(r, 'aseveraciones')),
      control_codigo: String(val(r, 'control_codigo') ?? '').trim(), control: String(val(r, 'control') ?? '').trim(),
      objetivo_control: String(val(r, 'objetivo_control') ?? '').trim(), tipo: tipoCtl(val(r, 'tipo')), naturaleza: natCtl(val(r, 'naturaleza')),
      frecuencia: frecuencia(val(r, 'frecuencia')), clave: siNo(val(r, 'clave')), responsable: String(val(r, 'responsable') ?? '').trim(),
      diseno: evaluacion(val(r, 'diseno'), true), operacion: evaluacion(val(r, 'operacion'), false),
    });
  });
  return { filas, avisos };
}

/** Normaliza filas de plantilla (mismo esquema, valores ya limpios). */
const desdePlantilla = (filas) => filas.map((r) => ({
  ...r, subproceso: r.subproceso || '', descripcion: r.descripcion || '', aseveraciones: aseveraciones(r.aseveraciones || ''),
  error_potencial: r.error_potencial || '', cuenta: r.cuenta || '', objetivo_control: r.objetivo_control || '',
  frecuencia: frecuencia(r.frecuencia) || r.frecuencia || null, clave: !!r.clave,
}));

/** Motor de importación. Reutiliza lo existente (por código o nombre) y crea lo nuevo. */
export async function importarFilas(filas, onAvance = () => {}) {
  const r = { areas: 0, subprocesos: 0, riesgos: 0, controles: 0, vinculos: 0, reutilizados: 0 };
  const llave = (s) => limpiar(s);
  const [A, S, R, C, cats] = await Promise.all([
    supabase.from('areas').select('id, name'), supabase.from('subprocesses').select('id, name, area_id'),
    supabase.from('risks').select('id, code, name'), supabase.from('controls').select('id, code, name'),
    supabase.from('risk_categories').select('id, name, parent_id'),
  ]);
  const areas = new Map((A.data || []).map((x) => [llave(x.name), x.id]));
  const subs = new Map((S.data || []).map((x) => [x.area_id + '|' + llave(x.name), x.id]));
  const riesgos = new Map(); (R.data || []).forEach((x) => { if (x.code) riesgos.set('c:' + llave(x.code), x.id); riesgos.set('n:' + llave(x.name), x.id); });
  const controles = new Map(); (C.data || []).forEach((x) => { if (x.code) controles.set('c:' + llave(x.code), x.id); controles.set('n:' + llave(x.name), x.id); });
  const raices = (cats.data || []).filter((c) => !c.parent_id);
  const catId = (nombre) => {
    const n = llave(nombre); if (!n) return null;
    const c = raices.find((x) => llave(x.name) === n) || raices.find((x) => llave(x.name).includes(n) || n.includes(llave(x.name)))
      || raices.find((x) => llave(x.name).split(' ')[0] === n.split(' ')[0] && n.split(' ').length === 1);
    return c?.id || null;
  };
  const err = (e) => { throw new Error(e.message || String(e)); };

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    onAvance(i + 1, filas.length);
    // Área
    let areaId = areas.get(llave(f.area));
    if (!areaId) {
      const { data, error } = await supabase.from('areas').insert({ name: f.area }).select('id').single(); if (error) err(error);
      areaId = data.id; areas.set(llave(f.area), areaId); r.areas++;
    }
    // Subproceso
    let subId = null;
    if (f.subproceso) {
      subId = subs.get(areaId + '|' + llave(f.subproceso));
      if (!subId) {
        const { data, error } = await supabase.from('subprocesses').insert({ area_id: areaId, name: f.subproceso }).select('id').single(); if (error) err(error);
        subId = data.id; subs.set(areaId + '|' + llave(f.subproceso), subId); r.subprocesos++;
      }
    }
    // Riesgo
    let riesgoId = (f.riesgo_codigo && riesgos.get('c:' + llave(f.riesgo_codigo))) || riesgos.get('n:' + llave(f.riesgo));
    if (!riesgoId) {
      const { data, error } = await supabase.from('risks').insert({
        code: f.riesgo_codigo || null, name: f.riesgo, description: f.descripcion || null, area_id: areaId, subprocess_id: subId,
        category_id: catId(f.categoria), probability: f.probabilidad, impact: f.impacto, potential_error: f.error_potencial || null,
        affected_account: f.cuenta || null, assertions: f.aseveraciones || [], status: 'activo',
      }).select('id').single(); if (error) err(error);
      riesgoId = data.id; if (f.riesgo_codigo) riesgos.set('c:' + llave(f.riesgo_codigo), riesgoId); riesgos.set('n:' + llave(f.riesgo), riesgoId); r.riesgos++;
    } else if (!f.control) r.reutilizados++;
    // Control
    if (!f.control) continue;
    let controlId = (f.control_codigo && controles.get('c:' + llave(f.control_codigo))) || controles.get('n:' + llave(f.control));
    if (!controlId) {
      const { data, error } = await supabase.from('controls').insert({
        code: f.control_codigo || null, name: f.control, description: f.responsable ? `Responsable: ${f.responsable}` : null,
        control_objective: f.objetivo_control || null, type: f.tipo || 'preventivo', nature: f.naturaleza || 'manual', frequency: f.frecuencia || null,
        design_evaluation: f.diseno || null, test_result: f.operacion || null, status: 'implementado',
      }).select('id').single(); if (error) err(error);
      controlId = data.id; if (f.control_codigo) controles.set('c:' + llave(f.control_codigo), controlId); controles.set('n:' + llave(f.control), controlId); r.controles++;
    } else r.reutilizados++;
    const { error } = await supabase.from('risk_controls').upsert({ risk_id: riesgoId, control_id: controlId, is_key_control: !!f.clave }); if (error) err(error);
    r.vinculos++;
  }
  return r;
}

/** Descarga una plantilla Excel lista para llenar (con ejemplo). */
export function descargarPlantillaExcel() {
  const enc = ['Proceso', 'Subproceso', 'ID riesgo', 'Riesgo', 'Descripción', 'Categoría', 'Probabilidad', 'Impacto', 'Error potencial', 'Cuenta contable',
    'Aseveraciones', 'ID control', 'Control', 'Objetivo de control', 'Tipo de control', 'Naturaleza', 'Frecuencia', 'Control clave', 'Responsable', 'Diseño', 'Resultado de prueba'];
  const ej = PLANTILLAS.corporativo.filas.slice(0, 3).map((x) => [x.area, x.subproceso, x.riesgo_codigo, x.riesgo, x.descripcion, x.categoria, x.probabilidad, x.impacto,
    x.error_potencial || '', x.cuenta || '', x.aseveraciones || '', x.control_codigo, x.control, '', x.tipo, x.naturaleza === 'automatico' ? 'Automático' : 'Manual', x.frecuencia, x.clave ? 'Sí' : 'No', '', '', '']);
  const ws = XLSX.utils.aoa_to_sheet([enc, ...ej]);
  ws['!cols'] = enc.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const guia = XLSX.utils.aoa_to_sheet([
    ['Guía de llenado'], [''], ['Un renglón por cada par riesgo–control. Si un riesgo tiene 3 controles, repite el riesgo en 3 renglones.'],
    ['Probabilidad e Impacto: 1 a 5, o texto (Muy baja, Baja, Media, Alta, Muy alta).'], ['Tipo de control: Preventivo, Detectivo o Correctivo.'],
    ['Naturaleza: Manual o Automático.'], ['Frecuencia: Diaria, Semanal, Mensual, Trimestral, Anual o Continua.'], ['Control clave: Sí / No.'],
    ['Diseño y Resultado de prueba (opcionales): Efectivo, Con observaciones o Inefectivo.'], ['Los nombres de columna pueden variar: la plataforma los reconoce.'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz'); XLSX.utils.book_append_sheet(wb, guia, 'Guía');
  XLSX.writeFile(wb, 'Plantilla_Matriz_Riesgos_CyC.xlsx');
}

/* ───────────── Asistente ───────────── */
export default function ImportarMatriz({ onCerrar, onImportado, plantillaInicial }) {
  const [paso, setPaso] = useState(plantillaInicial ? 'vista' : 'origen'); // origen · columnas · vista · listo
  const [libro, setLibro] = useState(null);
  const [hoja, setHoja] = useState('');
  const [mapeo, setMapeo] = useState({});
  const [plantilla, setPlantilla] = useState(plantillaInicial || null);
  const [avance, setAvance] = useState(null);
  const [resultado, setResultado] = useState(null);
  const input = useRef(null);

  const datosHoja = useMemo(() => {
    if (!libro || !hoja) return null;
    const filas = XLSX.utils.sheet_to_json(libro.Sheets[hoja], { header: 1, defval: '', blankrows: false });
    // Encabezado = primera fila con al menos 3 celdas de texto
    const idx = filas.findIndex((f) => f.filter((c) => String(c).trim()).length >= 3);
    if (idx < 0) return { encabezados: [], filas: [] };
    return { encabezados: filas[idx].map((h) => String(h).trim()), filas: filas.slice(idx + 1) };
  }, [libro, hoja]);

  const leerArchivo = async (file) => {
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      setLibro(wb);
      const h = wb.SheetNames.find((n) => { const d = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }); return d.length > 1; }) || wb.SheetNames[0];
      setHoja(h); setPlantilla(null); setPaso('columnas');
      const d = XLSX.utils.sheet_to_json(wb.Sheets[h], { header: 1, defval: '', blankrows: false });
      const i = d.findIndex((f) => f.filter((c) => String(c).trim()).length >= 3);
      setMapeo(autoMapeo((d[i] || []).map(String)));
    } catch (e) { notificationService.error('No se pudo leer el archivo: ' + e.message); }
  };
  const cambiarHoja = (h) => {
    setHoja(h);
    const d = XLSX.utils.sheet_to_json(libro.Sheets[h], { header: 1, defval: '', blankrows: false });
    const i = d.findIndex((f) => f.filter((c) => String(c).trim()).length >= 3);
    setMapeo(autoMapeo((d[i] || []).map(String)));
  };

  const preparado = useMemo(() => {
    if (plantilla) return { filas: desdePlantilla(PLANTILLAS[plantilla].filas), avisos: [] };
    if (!datosHoja) return { filas: [], avisos: [] };
    return normalizar(datosHoja.filas, mapeo);
  }, [plantilla, datosHoja, mapeo]);
  const resumen = useMemo(() => {
    const f = preparado.filas;
    return { areas: new Set(f.map((x) => x.area)).size, riesgos: new Set(f.map((x) => x.riesgo_codigo || x.riesgo)).size,
      controles: new Set(f.filter((x) => x.control).map((x) => x.control_codigo || x.control)).size, filas: f.length };
  }, [preparado]);

  const importar = async () => {
    setAvance({ i: 0, n: preparado.filas.length });
    try {
      const r = await importarFilas(preparado.filas, (i, n) => setAvance({ i, n }));
      setResultado(r); setPaso('listo'); onImportado?.();
    } catch (e) { notificationService.error('La importación se detuvo: ' + e.message); }
    setAvance(null);
  };

  const faltan = !plantilla && CAMPOS.filter((c) => c.req && mapeo[c.k] == null);
  const btn = (primario) => ({ background: primario ? 'var(--primary)' : 'var(--bg2)', color: primario ? '#fff' : 'var(--text)', border: primario ? 'none' : '1px solid var(--border)' });

  if (paso === 'origen') return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); }}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        style={{ border: '2px dashed var(--border)', borderRadius: 18, padding: 28, textAlign: 'center', cursor: 'pointer', background: 'var(--bg2)' }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ fontWeight: 600, fontSize: 16, marginTop: 6 }}>Importar desde Excel</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Arrastra la matriz del cliente (.xlsx, .xls o .csv) o haz clic para elegirla</div>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => leerArchivo(e.target.files[0])} />
      </div>
      <button className="sp-btn" onClick={descargarPlantillaExcel} style={{ ...btn(false), justifySelf: 'center' }}>⬇️ Descargar plantilla de Excel</button>
      <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>o empieza con una plantilla por industria</div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        {Object.entries(PLANTILLAS).map(([k, p]) => (
          <button key={k} className="sp-card" onClick={() => { setPlantilla(k); setPaso('vista'); }}
            style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nombre}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 4, lineHeight: 1.45 }}>{p.descripcion}</div>
            <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8 }}>{new Set(p.filas.map((x) => x.riesgo_codigo)).size} riesgos · {new Set(p.filas.map((x) => x.control_codigo)).size} controles</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (paso === 'columnas') return (
    <div>
      {libro?.SheetNames.length > 1 && (
        <div style={{ marginBottom: 14 }}><label className="sp-label">Hoja</label>
          <select className="sp-input" value={hoja} onChange={(e) => cambiarHoja(e.target.value)} style={{ maxWidth: 320 }}>{libro.SheetNames.map((n) => <option key={n}>{n}</option>)}</select></div>
      )}
      <p style={{ fontSize: 13.5, color: 'var(--text2)', marginBottom: 12 }}>Reconocí automáticamente las columnas. Revisa y corrige si hace falta:</p>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', maxHeight: '48vh', overflowY: 'auto', paddingRight: 4 }}>
        {CAMPOS.map((c) => (
          <div key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: '0 0 46%', fontSize: 13, fontWeight: c.req ? 600 : 400 }}>{c.t}{c.req ? ' *' : ''}</span>
            <select className="sp-input" value={mapeo[c.k] ?? ''} onChange={(e) => setMapeo((m) => ({ ...m, [c.k]: e.target.value === '' ? undefined : Number(e.target.value) }))}
              style={{ padding: '7px 30px 7px 10px', fontSize: 12.5, borderColor: mapeo[c.k] != null ? 'var(--green)' : undefined }}>
              <option value="">— No incluir —</option>
              {datosHoja?.encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button className="sp-btn" onClick={() => setPaso('origen')} style={btn(false)}>Atrás</button>
        <button className="sp-btn" disabled={faltan.length > 0} onClick={() => setPaso('vista')} style={btn(true)}>{faltan.length ? `Falta: ${faltan.map((c) => c.t).join(', ')}` : 'Ver vista previa'}</button>
      </div>
    </div>
  );

  if (paso === 'vista') return (
    <div>
      {plantilla && <p style={{ fontSize: 14, marginBottom: 12 }}>Plantilla: <strong>{PLANTILLAS[plantilla].nombre}</strong>. Después podrás ajustar calificaciones, dueños y controles.</p>}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 14 }}>
        {[['Procesos', resumen.areas], ['Riesgos', resumen.riesgos], ['Controles', resumen.controles], ['Renglones', resumen.filas]].map(([t, v]) => (
          <div key={t} style={{ background: 'var(--bg3)', borderRadius: 14, padding: '10px 12px' }}><div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{t}</div></div>
        ))}
      </div>
      {preparado.avisos.length > 0 && (
        <div style={{ background: '#FFF4D1', color: '#9A6400', borderRadius: 12, padding: 12, fontSize: 12.5, marginBottom: 12, maxHeight: 110, overflowY: 'auto' }}>
          {preparado.avisos.slice(0, 30).map((a, i) => <div key={i}>• {a}</div>)}{preparado.avisos.length > 30 && <div>… y {preparado.avisos.length - 30} más</div>}
        </div>
      )}
      <div style={{ overflow: 'auto', maxHeight: '38vh', border: '1px solid var(--border)', borderRadius: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, minWidth: 720 }}>
          <thead><tr>{['Proceso', 'Riesgo', 'P×I', 'Control', 'Tipo', 'Frecuencia', 'Clave'].map((h) => <th key={h} style={{ position: 'sticky', top: 0, background: 'var(--bg3)', textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text3)' }}>{h}</th>)}</tr></thead>
          <tbody>{preparado.filas.slice(0, 60).map((f, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '7px 10px' }}>{f.area}</td><td style={{ padding: '7px 10px' }}>{f.riesgo_codigo ? <strong>{f.riesgo_codigo} </strong> : null}{f.riesgo}</td>
              <td style={{ padding: '7px 10px' }}>{f.probabilidad}×{f.impacto}</td><td style={{ padding: '7px 10px' }}>{f.control || <span style={{ color: '#C93400' }}>Sin control</span>}</td>
              <td style={{ padding: '7px 10px' }}>{f.tipo || '—'}</td><td style={{ padding: '7px 10px' }}>{f.frecuencia || '—'}</td><td style={{ padding: '7px 10px' }}>{f.clave ? '★' : ''}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {preparado.filas.length > 60 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Mostrando 60 de {preparado.filas.length} renglones.</div>}
      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Lo que ya exista en el expediente (mismo código o nombre) se reutiliza; no se duplica.</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <button className="sp-btn" onClick={() => setPaso(plantilla ? 'origen' : 'columnas')} disabled={!!avance} style={btn(false)}>Atrás</button>
        <button className="sp-btn" onClick={importar} disabled={!!avance || !preparado.filas.length} style={btn(true)}>
          {avance ? `Importando ${avance.i} de ${avance.n}…` : `Importar ${resumen.riesgos} riesgos y ${resumen.controles} controles`}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div style={{ fontSize: 40 }}>✅</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 14px' }}>Importación terminada</h3>
      <div style={{ display: 'inline-grid', gap: 6, textAlign: 'left', fontSize: 14 }}>
        <div>Procesos nuevos: <strong>{resultado.areas}</strong> · Subprocesos: <strong>{resultado.subprocesos}</strong></div>
        <div>Riesgos nuevos: <strong>{resultado.riesgos}</strong> · Controles nuevos: <strong>{resultado.controles}</strong></div>
        <div>Vínculos riesgo–control: <strong>{resultado.vinculos}</strong> · Reutilizados: <strong>{resultado.reutilizados}</strong></div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', margin: '14px auto', maxWidth: 440 }}>Siguiente paso: asigna dueños a los riesgos y registra las pruebas de los controles clave. La Matriz RCM ya está lista.</p>
      <button className="sp-btn" onClick={onCerrar} style={btn(true)}>Ver la matriz</button>
    </div>
  );
}
