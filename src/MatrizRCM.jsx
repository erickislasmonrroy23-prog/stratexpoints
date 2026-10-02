import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTablePkg from 'jspdf-autotable';
import { BRAND } from './brand.js';

const autoTable = typeof autoTablePkg === 'function' ? autoTablePkg : autoTablePkg.default;

/* ─────────────────────────────────────────────────────────────
   Matriz de Riesgos y Controles (RCM) — formato de firmas Big Four
   Una fila por par riesgo-control. Incluye aseveraciones, control clave,
   naturaleza/tipo/frecuencia, prueba de diseño y de operación (TOD/TOE),
   clasificación de deficiencias (PCAOB AS 2201 / COSO 2013) y respuesta.
   ───────────────────────────────────────────────────────────── */

const NIVEL = (v) => (v == null ? null
  : v <= 4 ? { t: 'Bajo', c: '#248A3D', bg: '#E3F5E8' }
  : v <= 9 ? { t: 'Moderado', c: '#9A6400', bg: '#FFF4D1' }
  : v <= 16 ? { t: 'Alto', c: '#C93400', bg: '#FFE9D6' }
  : { t: 'Crítico', c: '#D70015', bg: '#FDE4E6' });

const TIPO = { preventivo: 'Preventivo', detectivo: 'Detectivo', correctivo: 'Correctivo' };
const FREC = { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual', continua: 'Continua' };
const DIS = { adecuado: 'Efectivo', necesita_mejora: 'Con observaciones', inadecuado: 'Inefectivo' };
const OPE = { efectivo: 'Efectivo', necesita_mejora: 'Con observaciones', inefectivo: 'Inefectivo' };
const RESP = { activo: 'Mitigar', mitigado: 'Mitigado', aceptado: 'Aceptar', transferido: 'Transferir', cerrado: 'Cerrado' };

/** Clasificación de deficiencia de control (criterio COSO 2013 / PCAOB AS 2201 simplificado). */
export function clasificarDeficiencia(control, riesgo, esClave) {
  if (!control) return { t: 'Brecha: sin control', sev: 3 };
  const falla = control.design_evaluation === 'inadecuado' || control.test_result === 'inefectivo';
  const obs = control.design_evaluation === 'necesita_mejora' || control.test_result === 'necesita_mejora';
  const inh = riesgo?.inherent_risk || 0;
  if (falla && esClave && inh >= 17) return { t: 'Debilidad material', sev: 4 };
  if (falla && esClave) return { t: 'Deficiencia significativa', sev: 3 };
  if (falla || (obs && esClave && inh >= 17)) return { t: obs && !falla ? 'Deficiencia significativa' : 'Deficiencia', sev: obs && !falla ? 3 : 2 };
  if (obs) return { t: 'Deficiencia', sev: 2 };
  if (!control.test_result) return { t: 'Pendiente de prueba', sev: 1 };
  return { t: 'Sin deficiencia', sev: 0 };
}
const COLOR_DEF = { 4: ['#FDE4E6', '#D70015'], 3: ['#FFE9D6', '#C93400'], 2: ['#FFF4D1', '#9A6400'], 1: ['var(--bg3)', 'var(--text3)'], 0: ['#E3F5E8', '#248A3D'] };

export default function MatrizRCM({ datos, cliente, onAbrirRiesgo, onAbrirControl }) {
  const apetito = cliente?.risk_appetite ?? 9;
  const [busca, setBusca] = useState('');
  const [area, setArea] = useState('');
  const [soloClaves, setSoloClaves] = useState(false);
  const [soloDef, setSoloDef] = useState(false);
  const [soloFuera, setSoloFuera] = useState(false);

  const nombre = (id) => { const p = datos.personas.find((x) => x.id === id); return p ? (p.full_name || p.email) : '—'; };
  const areaDe = (id) => datos.areas.find((a) => a.id === id)?.name || 'Sin área';
  const subDe = (id) => datos.subprocesos.find((s) => s.id === id)?.name || '—';
  const catDe = (id) => {
    const c = datos.categorias.find((x) => x.id === id); if (!c) return '—';
    const p = c.parent_id ? datos.categorias.find((x) => x.id === c.parent_id) : null;
    return p ? `${p.code || ''} ${p.name} › ${c.name}` : `${c.code || ''} ${c.name}`;
  };
  const objDe = (id) => { const o = datos.objetivos?.find((x) => x.id === id); return o ? `${o.code ? o.code + ' ' : ''}${o.name}` : '—'; };

  // Filas: un renglón por par riesgo-control (riesgos sin control → renglón de brecha)
  const grupos = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const res = (r) => r.residual_risk ?? r.inherent_risk;
    return [...datos.riesgos]
      .filter((r) => r.status !== 'cerrado')
      .filter((r) => !area || r.area_id === area)
      .filter((r) => !soloFuera || res(r) > apetito)
      .sort((a, b) => areaDe(a.area_id).localeCompare(areaDe(b.area_id)) || String(a.code || '').localeCompare(String(b.code || ''), 'es', { numeric: true }))
      .map((r) => {
        const vinc = datos.vinculos.filter((v) => v.risk_id === r.id);
        let filas = vinc.map((v) => ({ control: datos.controles.find((c) => c.id === v.control_id), clave: v.is_key_control }))
          .filter((x) => x.control)
          .sort((a, b) => (b.clave - a.clave) || String(a.control.code || '').localeCompare(String(b.control.code || '')));
        if (!filas.length) filas = [{ control: null, clave: false }];
        filas = filas.map((f) => ({ ...f, def: clasificarDeficiencia(f.control, r, f.clave) }));
        if (soloClaves) filas = filas.filter((f) => f.clave);
        if (soloDef) filas = filas.filter((f) => f.def.sev >= 2);
        if (t) {
          const hay = `${r.code || ''} ${r.name} ${r.description || ''}`.toLowerCase().includes(t)
            || filas.some((f) => f.control && `${f.control.code || ''} ${f.control.name}`.toLowerCase().includes(t));
          if (!hay) filas = [];
        }
        const planes = datos.planes.filter((p) => p.risk_id === r.id && p.status !== 'cerrado');
        return { r, filas, planes };
      })
      .filter((g) => g.filas.length);
  }, [datos, busca, area, soloClaves, soloDef, soloFuera, apetito]);

  // Indicadores de cobertura
  const activos = datos.riesgos.filter((r) => r.status === 'activo');
  const conClave = activos.filter((r) => datos.vinculos.some((v) => v.risk_id === r.id && v.is_key_control)).length;
  const probados = datos.controles.filter((c) => c.test_result).length;
  const conteoDef = { 'Debilidad material': 0, 'Deficiencia significativa': 0, 'Deficiencia': 0, 'Brecha: sin control': 0 };
  activos.forEach((r) => {
    const vinc = datos.vinculos.filter((v) => v.risk_id === r.id);
    if (!vinc.length) { conteoDef['Brecha: sin control']++; return; }
    vinc.forEach((v) => { const d = clasificarDeficiencia(datos.controles.find((c) => c.id === v.control_id), r, v.is_key_control); if (d.t in conteoDef) conteoDef[d.t]++; });
  });
  const fuera = activos.filter((r) => (r.residual_risk ?? r.inherent_risk) > apetito).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // ── Exportaciones ──
  const filasPlanas = () => grupos.flatMap(({ r, filas, planes }) => filas.map((f) => ({
    'Proceso': areaDe(r.area_id), 'Subproceso': subDe(r.subprocess_id), 'Objetivo estratégico': objDe(r.objective_id),
    'ID riesgo': r.code || '', 'Riesgo': r.name, 'Categoría': catDe(r.category_id), 'Error potencial': r.potential_error || '',
    'Cuenta afectada': r.affected_account || '', 'Aseveraciones': (r.assertions || []).join(', '),
    'Probabilidad': r.probability, 'Impacto': r.impact, 'Riesgo inherente': r.inherent_risk, 'Nivel inherente': NIVEL(r.inherent_risk)?.t || '',
    'ID control': f.control?.code || '', 'Control': f.control?.name || 'SIN CONTROL', 'Objetivo de control': f.control?.control_objective || '',
    'Control clave': f.control ? (f.clave ? 'Sí' : 'No') : '', 'Tipo': TIPO[f.control?.type] || '', 'Naturaleza': f.control ? (f.control.nature === 'automatico' ? 'Automático' : 'Manual') : '',
    'Frecuencia': FREC[f.control?.frequency] || '', 'Responsable': f.control ? nombre(f.control.responsible_id) : '',
    'Antifraude': f.control ? (f.control.prevents_fraud ? 'Sí' : 'No') : '', 'Documentado': f.control ? (f.control.is_documented ? 'Sí' : 'No') : '',
    'Prueba de diseño (TOD)': DIS[f.control?.design_evaluation] || (f.control ? 'Sin evaluar' : ''),
    'Prueba de operación (TOE)': OPE[f.control?.test_result] || (f.control ? 'Sin probar' : ''),
    'Referencia PT': f.control?.test_reference || '', 'Efectividad (1-5)': f.control?.effectiveness ?? '',
    'Clasificación de deficiencia': f.def.t, 'Riesgo residual': r.residual_risk, 'Nivel residual': NIVEL(r.residual_risk)?.t || '',
    'Dentro de apetito': (r.residual_risk ?? r.inherent_risk) > apetito ? 'No' : 'Sí', 'Respuesta al riesgo': RESP[r.status] || '',
    'Dueño del riesgo': nombre(r.owner_id), 'Planes de acción abiertos': planes.map((p) => p.title).join(' | '),
  })));

  const nombreArchivo = `RCM_${(cliente?.name || 'Expediente').replace(/[^\w]+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const filas = filasPlanas();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = Object.keys(filas[0] || {}).map((k) => ({ wch: Math.min(48, Math.max(10, k.length + 2, ...filas.map((f) => String(f[k] ?? '').length).slice(0, 200))) }));
    ws['!autofilter'] = { ref: ws['!ref'] };
    ws['!freeze'] = { xSplit: 5, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz RCM');
    const defs = filas.filter((f) => ['Debilidad material', 'Deficiencia significativa', 'Deficiencia', 'Brecha: sin control'].includes(f['Clasificación de deficiencia']))
      .map((f) => ({ 'Clasificación': f['Clasificación de deficiencia'], 'ID riesgo': f['ID riesgo'], 'Riesgo': f['Riesgo'], 'ID control': f['ID control'], 'Control': f['Control'],
        'Control clave': f['Control clave'], 'TOD': f['Prueba de diseño (TOD)'], 'TOE': f['Prueba de operación (TOE)'], 'Residual': f['Riesgo residual'], 'Planes de acción': f['Planes de acción abiertos'] }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(defs.length ? defs : [{ 'Resultado': 'Sin deficiencias identificadas' }]), 'Deficiencias');
    const resumen = [
      { Indicador: 'Expediente', Valor: cliente?.name || '' }, { Indicador: 'Fecha', Valor: new Date().toLocaleDateString('es-MX') },
      { Indicador: 'Apetito de riesgo (residual máximo)', Valor: apetito }, { Indicador: 'Riesgos activos', Valor: activos.length },
      { Indicador: 'Riesgos con control clave (%)', Valor: pct(conClave, activos.length) }, { Indicador: 'Controles probados (%)', Valor: pct(probados, datos.controles.length) },
      { Indicador: 'Riesgos fuera de apetito', Valor: fuera },
      ...Object.entries(conteoDef).map(([k, v]) => ({ Indicador: k, Valor: v })),
      { Indicador: 'Elaborado por', Valor: BRAND.legalName },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');
    XLSX.writeFile(wb, nombreArchivo + '.xlsx');
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(29, 29, 31);
    doc.text('Matriz de Riesgos y Controles (RCM)', 12, 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 110, 115);
    doc.text(`${cliente?.name || ''} · Apetito de riesgo: residual ≤ ${apetito} · ${new Date().toLocaleDateString('es-MX')} · ${BRAND.legalName}`.replace('≤', '<='), 12, 20);
    autoTable(doc, {
      startY: 25, margin: { left: 8, right: 8 },
      head: [['Proceso', 'ID', 'Riesgo', 'Asev.', 'Inh.', 'ID ctrl', 'Control', 'Clave', 'Tipo / Nat. / Frec.', 'TOD', 'TOE', 'Deficiencia', 'Res.', 'Apetito', 'Plan de acción']],
      body: filasPlanas().map((f) => [f['Proceso'], f['ID riesgo'], f['Riesgo'], f['Aseveraciones'], `${f['Riesgo inherente']} ${f['Nivel inherente']}`, f['ID control'], f['Control'],
        f['Control clave'], [f['Tipo'], f['Naturaleza'], f['Frecuencia']].filter(Boolean).join(' / '), f['Prueba de diseño (TOD)'], f['Prueba de operación (TOE)'],
        f['Clasificación de deficiencia'], `${f['Riesgo residual'] ?? ''} ${f['Nivel residual']}`, f['Dentro de apetito'], f['Planes de acción abiertos']]),
      styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.6, textColor: [29, 29, 31], lineColor: [229, 229, 234], lineWidth: 0.15, valign: 'top' },
      headStyles: { fillColor: [29, 29, 31], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 2: { cellWidth: 48 }, 6: { cellWidth: 52 }, 14: { cellWidth: 38 } },
      didParseCell: (h) => {
        if (h.section !== 'body') return;
        const v = String(h.cell.raw || '');
        if (h.column.index === 11) {
          const m = { 'Debilidad material': [253, 228, 230], 'Deficiencia significativa': [255, 233, 214], 'Deficiencia': [255, 244, 209], 'Brecha: sin control': [255, 233, 214], 'Sin deficiencia': [227, 245, 232] };
          if (m[v]) { h.cell.styles.fillColor = m[v]; h.cell.styles.fontStyle = 'bold'; }
        }
        if (h.column.index === 4 || h.column.index === 12) {
          const n = parseInt(v, 10);
          const c = n >= 17 ? [253, 228, 230] : n >= 10 ? [255, 233, 214] : n >= 5 ? [255, 244, 209] : n ? [227, 245, 232] : null;
          if (c) h.cell.styles.fillColor = c;
        }
        if (h.column.index === 13 && v === 'No') { h.cell.styles.textColor = [215, 0, 21]; h.cell.styles.fontStyle = 'bold'; }
      },
      didDrawPage: () => {
        doc.setFontSize(7); doc.setTextColor(110, 110, 115);
        doc.text(`${BRAND.name} · Confidencial · Página ${doc.internal.getNumberOfPages()}`, W - 8, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
      },
    });
    doc.save(nombreArchivo + '.pdf');
  };

  // ── Estilos de tabla ──
  const th = { padding: '9px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textAlign: 'left', whiteSpace: 'nowrap', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 2 };
  const grupo = { ...th, top: 0, textAlign: 'center', color: 'var(--text2)', borderRight: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.02em' };
  const td = { padding: '9px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--text)' };
  const chip = (txt, bg, col) => <span className="sp-badge" style={{ background: bg, color: col, whiteSpace: 'nowrap', fontWeight: 600 }}>{txt}</span>;
  const Nivel = ({ v }) => { const n = NIVEL(v); return n ? chip(`${v} · ${n.t}`, n.bg, n.c) : <span style={{ color: 'var(--text3)' }}>—</span>; };
  const evalChip = (val, mapa, vacio) => {
    if (!val) return chip(vacio, 'var(--bg3)', 'var(--text3)');
    const col = val === 'adecuado' || val === 'efectivo' ? ['#E3F5E8', '#248A3D'] : val === 'necesita_mejora' ? ['#FFF4D1', '#9A6400'] : ['#FDE4E6', '#D70015'];
    return chip(mapa[val], col[0], col[1]);
  };

  return (
    <div>
      {/* Indicadores de cobertura */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 14 }}>
        {[
          ['Cobertura con control clave', `${pct(conClave, activos.length)}%`, `${conClave} de ${activos.length} riesgos`],
          ['Controles probados (TOE)', `${pct(probados, datos.controles.length)}%`, `${probados} de ${datos.controles.length}`],
          ['Debilidades materiales', conteoDef['Debilidad material'], 'Control clave inefectivo en riesgo crítico', conteoDef['Debilidad material'] ? 'var(--red)' : null],
          ['Deficiencias significativas', conteoDef['Deficiencia significativa'], 'Control clave con falla', conteoDef['Deficiencia significativa'] ? 'var(--gold)' : null],
          ['Brechas sin control', conteoDef['Brecha: sin control'], 'Riesgos sin actividad de control', conteoDef['Brecha: sin control'] ? 'var(--gold)' : null],
          ['Fuera de apetito', fuera, `Residual > ${apetito}`, fuera ? 'var(--red)' : null],
        ].map(([t, v, n, c]) => (
          <div key={t} className="sp-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{t}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n}</div>
          </div>
        ))}
      </div>

      <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filtros y exportación */}
        <div style={{ display: 'flex', gap: 10, padding: 14, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <input className="sp-input" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar riesgo o control" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="sp-input" style={{ width: 200 }} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todos los procesos</option>
            {datos.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {[['Solo controles clave', soloClaves, setSoloClaves], ['Solo deficiencias', soloDef, setSoloDef], ['Fuera de apetito', soloFuera, setSoloFuera]].map(([t, v, s]) => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 12px', borderRadius: 99, border: '1px solid var(--border)', background: v ? 'var(--primary-light)' : 'var(--bg2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={v} onChange={(e) => s(e.target.checked)} /> {t}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="sp-btn" onClick={exportarExcel} disabled={!grupos.length} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Exportar Excel</button>
            <button className="sp-btn" onClick={exportarPDF} disabled={!grupos.length} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Exportar PDF</button>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            {datos.riesgos.length ? 'Ningún renglón coincide con los filtros.' : 'La matriz se construye sola al registrar riesgos y vincularles controles.'}
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1900, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...grupo, left: 0, zIndex: 3 }} colSpan={2}>PROCESO</th>
                  <th style={grupo} colSpan={4}>RIESGO</th>
                  <th style={grupo} colSpan={1}>INHERENTE</th>
                  <th style={grupo} colSpan={5}>ACTIVIDAD DE CONTROL</th>
                  <th style={grupo} colSpan={3}>EVALUACIÓN DEL CONTROL</th>
                  <th style={{ ...grupo, borderRight: 'none' }} colSpan={3}>RESIDUAL Y RESPUESTA</th>
                </tr>
                <tr>
                  {['Proceso', 'Subproceso', 'ID', 'Riesgo', 'Categoría', 'Aseveraciones', 'P×I', 'ID', 'Control', 'Clave', 'Tipo · Naturaleza', 'Frecuencia · Responsable',
                    'Diseño (TOD)', 'Operación (TOE)', 'Deficiencia', 'Residual', 'Apetito', 'Respuesta / Plan'].map((h, i) => (
                    <th key={i} style={{ ...th, top: 36, ...(i === 0 ? { left: 0, zIndex: 3 } : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(({ r, filas, planes }) => filas.map((f, i) => {
                  const n = filas.length;
                  const res = r.residual_risk ?? r.inherent_risk;
                  const dentro = res <= apetito;
                  const [bgD, colD] = COLOR_DEF[f.def.sev];
                  return (
                    <tr key={r.id + (f.control?.id || 'brecha')}>
                      {i === 0 && <>
                        <td rowSpan={n} style={{ ...td, position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 1, fontWeight: 600, minWidth: 130 }}>{areaDe(r.area_id)}</td>
                        <td rowSpan={n} style={{ ...td, color: 'var(--text2)', minWidth: 120 }}>{subDe(r.subprocess_id)}</td>
                        <td rowSpan={n} style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <button onClick={() => onAbrirRiesgo(r)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 12.5 }}>{r.code || 'Ver'}</button>
                        </td>
                        <td rowSpan={n} style={{ ...td, minWidth: 260 }}>
                          <div style={{ fontWeight: 500 }}>{r.name}</div>
                          {r.potential_error && <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 3 }}>Error potencial: {r.potential_error}</div>}
                          {r.objective_id && <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Objetivo: {objDe(r.objective_id)}</div>}
                        </td>
                        <td rowSpan={n} style={{ ...td, fontSize: 11.5, color: 'var(--text2)', minWidth: 150 }}>{catDe(r.category_id)}</td>
                        <td rowSpan={n} style={{ ...td, fontSize: 11.5, color: 'var(--text2)', minWidth: 130 }}>{(r.assertions || []).join(', ') || '—'}{r.affected_account && <div style={{ color: 'var(--text3)' }}>Cuenta: {r.affected_account}</div>}</td>
                        <td rowSpan={n} style={{ ...td, whiteSpace: 'nowrap' }}><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{r.probability}×{r.impact}</div><Nivel v={r.inherent_risk} /></td>
                      </>}
                      {f.control ? <>
                        <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <button onClick={() => onAbrirControl(f.control)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 12.5 }}>{f.control.code || 'Ver'}</button>
                        </td>
                        <td style={{ ...td, minWidth: 260 }}>
                          <div>{f.control.name}</div>
                          {f.control.test_reference && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>PT: {f.control.test_reference}</div>}
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>{f.clave ? <span title="Control clave" style={{ color: 'var(--primary)', fontSize: 15 }}>★</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        <td style={{ ...td, fontSize: 12, whiteSpace: 'nowrap' }}>{TIPO[f.control.type]}<div style={{ color: 'var(--text3)' }}>{f.control.nature === 'automatico' ? 'Automático' : 'Manual'}{f.control.prevents_fraud ? ' · Antifraude' : ''}</div></td>
                        <td style={{ ...td, fontSize: 12, minWidth: 140 }}>{FREC[f.control.frequency] || '—'}<div style={{ color: 'var(--text3)' }}>{nombre(f.control.responsible_id)}</div></td>
                        <td style={td}>{evalChip(f.control.design_evaluation, DIS, 'Sin evaluar')}</td>
                        <td style={td}>{evalChip(f.control.test_result, OPE, 'Sin probar')}</td>
                      </> : <>
                        <td colSpan={7} style={{ ...td, background: '#FFF4E8', color: '#C93400', fontWeight: 600 }}>⚠ Brecha de control: el riesgo no tiene actividades de control asignadas.</td>
                      </>}
                      <td style={td}>{chip(f.def.t, bgD, colD)}</td>
                      {i === 0 && <>
                        <td rowSpan={n} style={{ ...td, whiteSpace: 'nowrap' }}><Nivel v={r.residual_risk} /></td>
                        <td rowSpan={n} style={td}>{dentro ? chip('Dentro', '#E3F5E8', '#248A3D') : chip('Fuera', '#FDE4E6', '#D70015')}</td>
                        <td rowSpan={n} style={{ ...td, minWidth: 200, fontSize: 12 }}>
                          <strong>{RESP[r.status]}</strong>
                          {planes.length ? planes.map((p) => <div key={p.id} style={{ color: 'var(--text2)', marginTop: 3 }}>• {p.title}{p.due_date ? ` (${new Date(p.due_date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })})` : ''}</div>)
                            : !dentro ? <div style={{ color: '#D70015', marginTop: 3 }}>Requiere plan de acción</div> : null}
                        </td>
                      </>}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10, lineHeight: 1.6 }}>
        Clasificación de deficiencias (COSO 2013 · PCAOB AS 2201, criterio simplificado): <strong>Debilidad material</strong> = control clave inefectivo en diseño u operación sobre un riesgo inherente crítico ·
        <strong> Deficiencia significativa</strong> = control clave inefectivo, o con observaciones sobre riesgo crítico · <strong>Deficiencia</strong> = control no clave inefectivo o con observaciones ·
        <strong> Brecha</strong> = riesgo sin control. TOD = prueba de diseño; TOE = prueba de eficacia operativa.
      </p>
    </div>
  );
}
