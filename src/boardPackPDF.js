// Board pack trimestral — Informe al Consejo / Comité de Auditoría
// Cabrera & Consultores en Estrategia y Riesgos
import { jsPDF } from 'jspdf';
import autoTablePkg from 'jspdf-autotable';
import { supabase } from './supabase.js';
import { BRAND } from './brand.js';

const autoTable = typeof autoTablePkg === 'function' ? autoTablePkg : autoTablePkg.default;
const TINTA = [29, 29, 31]; const GRIS = [110, 110, 115]; const LINEA = [229, 229, 234]; const AZUL = [0, 113, 227];
const ROJO = [215, 0, 21]; const VERDE = [36, 138, 61]; const AMBAR = [201, 52, 0];
const NIVEL = (v) => (v == null ? '' : v <= 4 ? 'Bajo' : v <= 9 ? 'Moderado' : v <= 16 ? 'Alto' : 'Crítico');
const FONDO = (v) => (v == null ? null : v <= 4 ? [227, 245, 232] : v <= 9 ? [255, 244, 209] : v <= 16 ? [255, 233, 214] : [253, 228, 230]);

export function periodo(d = new Date()) { return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`; }
export function periodoAnterior(p) { const [y, t] = p.split('-T').map(Number); return t === 1 ? `${y - 1}-T4` : `${y}-T${t - 1}`; }
const etiquetaPeriodo = (p) => { const [y, t] = p.split('-T'); return `${['primer', 'segundo', 'tercer', 'cuarto'][Number(t) - 1]} trimestre de ${y}`; };

function deficiencia(control, riesgo, clave) {
  const falla = control.design_evaluation === 'inadecuado' || control.test_result === 'inefectivo';
  const obs = control.design_evaluation === 'necesita_mejora' || control.test_result === 'necesita_mejora';
  const inh = riesgo?.inherent_risk || 0;
  if (falla && clave && inh >= 17) return 'Debilidad material';
  if (falla && clave) return 'Deficiencia significativa';
  if (obs && clave && inh >= 17) return 'Deficiencia significativa';
  if (falla || obs) return 'Deficiencia';
  return null;
}
function estadoKRI(v, dir, aviso, lim) {
  if (v == null || (aviso == null && lim == null)) return null;
  if (dir === 'menor_peor') return lim != null && v <= lim ? 'rojo' : aviso != null && v <= aviso ? 'amarillo' : 'verde';
  return lim != null && v >= lim ? 'rojo' : aviso != null && v >= aviso ? 'amarillo' : 'verde';
}
async function dataURL(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try { const r = await fetch(src); if (!r.ok) return null; const b = await r.blob(); return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); } catch { return null; }
}

/** Calcula el contenido del board pack (separado del dibujo para poder probarlo). */
export function analizar({ riesgos, controles, vinculos, planes, kpis, plan, actual, previa, apetito, hoy = new Date().toISOString().slice(0, 10) }) {
  const res = (r) => r.residual_risk ?? r.inherent_risk;
  const activos = riesgos.filter((r) => r.status === 'activo');
  const m = actual?.metrics || {};
  const mp = previa?.metrics || null;
  const prevMap = Object.fromEntries((previa?.risks || []).map((r) => [r.id, r]));
  const nuevos = previa ? activos.filter((r) => !prevMap[r.id]) : [];
  const suben = previa ? activos.filter((r) => prevMap[r.id] && res(r) > prevMap[r.id].res) : [];
  const bajan = previa ? activos.filter((r) => prevMap[r.id] && res(r) < prevMap[r.id].res) : [];

  const defs = [];
  activos.forEach((r) => {
    const vs = vinculos.filter((v) => v.risk_id === r.id);
    if (!vs.length && res(r) >= 10) defs.push({ tipo: 'Brecha: sin control', riesgo: r, control: null });
    vs.forEach((v) => { const c = controles.find((x) => x.id === v.control_id); if (!c) return; const d = deficiencia(c, r, v.is_key_control); if (d) defs.push({ tipo: d, riesgo: r, control: c }); });
  });
  const orden = { 'Debilidad material': 0, 'Deficiencia significativa': 1, 'Brecha: sin control': 2, Deficiencia: 3 };
  defs.sort((a, b) => orden[a.tipo] - orden[b.tipo]);

  const kris = activos.map((r) => { const k = kpis.find((x) => x.id === r.kri_id); const e = k ? estadoKRI(Number(k.value), r.kri_direction, r.kri_warning, r.kri_limit) : null; return { r, k, e }; })
    .filter((x) => x.e === 'rojo' || x.e === 'amarillo');

  const abiertos = planes.filter((p) => p.status !== 'cerrado');
  const vencidos = abiertos.filter((p) => p.status !== 'en_validacion' && p.due_date && p.due_date < hoy);
  const vencidos30 = vencidos.filter((p) => (new Date(hoy) - new Date(p.due_date)) / 86400000 > 30);
  const enValid = abiertos.filter((p) => p.status === 'en_validacion');

  const trabajos = plan.filter((i) => i.status !== 'cancelada');
  const avancePlan = trabajos.length ? Math.round(trabajos.reduce((s, i) => s + (i.progress || 0), 0) / trabajos.length) : null;

  const fuera = activos.filter((r) => res(r) > apetito);
  const decisiones = [];
  fuera.filter((r) => !abiertos.some((p) => p.risk_id === r.id) && r.status !== 'aceptado')
    .forEach((r) => decisiones.push(`Definir respuesta (mitigar, transferir o aceptar formalmente) para "${r.name}", con residual ${res(r)} por encima del apetito de ${apetito}.`));
  defs.filter((d) => d.tipo === 'Debilidad material').forEach((d) => decisiones.push(`Aprobar plan de remediación de la debilidad material en el control "${d.control?.name}".`));
  if (vencidos30.length) decisiones.push(`Instruir a la Administración la atención de ${vencidos30.length} plan(es) de acción vencidos por más de 30 días.`);
  kris.filter((x) => x.e === 'rojo').forEach((x) => decisiones.push(`Revisar el indicador "${x.k.name}" (${x.k.value}) que rebasa su límite en el riesgo "${x.r.name}".`));

  const semaforo = defs.some((d) => d.tipo === 'Debilidad material') || activos.some((r) => res(r) >= 17) || vencidos30.length ? 'rojo'
    : fuera.length || defs.length || vencidos.length ? 'amarillo' : 'verde';

  return { activos, m, mp, nuevos, suben, bajan, defs, kris, abiertos, vencidos, vencidos30, enValid, trabajos, avancePlan, fuera, decisiones, semaforo, res, prevMap };
}

export async function generarBoardPack({ cliente, organizacion }) {
  const per = periodo(); const perAnt = periodoAnterior(per); const hoyISO = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const [r, c, v, p, k, s, pl] = await Promise.all([
    supabase.from('risks').select('*'), supabase.from('controls').select('*'), supabase.from('risk_controls').select('*'),
    supabase.from('action_plans').select('*'), supabase.from('kpis').select('id, name, value, unit'),
    supabase.from('governance_snapshots').select('*').in('period_label', [per, perAnt]),
    supabase.from('audit_plan_items').select('*').eq('year', year),
  ]);
  const err = [r, c, v, p, k, s, pl].find((x) => x.error); if (err) throw new Error(err.error.message);
  const actual = (s.data || []).find((x) => x.period_label === per);
  const previa = (s.data || []).find((x) => x.period_label === perAnt);
  const apetito = cliente?.risk_appetite ?? 9;
  const A = analizar({ riesgos: r.data, controles: c.data, vinculos: v.data, planes: p.data, kpis: k.data, plan: pl.data, actual, previa, apetito, hoy: hoyISO });

  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight(); const M = 18;
  const logoFirma = await dataURL(organizacion?.logo_url || BRAND.logo);
  const logoCliente = cliente && !cliente.is_internal ? await dataURL(cliente.logo_url) : null;
  const tipoImg = (d) => (d && d.includes('image/jpeg') ? 'JPEG' : 'PNG');
  const razon = cliente ? (cliente.legal_name || cliente.name) : BRAND.legalName;

  // Portada
  doc.setFillColor(245, 245, 247); doc.rect(0, 0, W, H, 'F');
  const lp = logoCliente || logoFirma; if (lp) { try { doc.addImage(lp, tipoImg(lp), W / 2 - 24, 44, 48, 48); } catch { /* */ } }
  doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('INFORME TRIMESTRAL AL CONSEJO DE ADMINISTRACIÓN', W / 2, 112, { align: 'center' });
  doc.setTextColor(...TINTA); doc.setFont('helvetica', 'bold'); doc.setFontSize(26);
  doc.text('Riesgos, Control Interno', W / 2, 126, { align: 'center' }); doc.text('y Auditoría', W / 2, 137, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(...GRIS); doc.text(razon, W / 2, 150, { align: 'center' });
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.8); doc.line(W / 2 - 12, 157, W / 2 + 12, 157);
  doc.setFontSize(11); doc.text(`Periodo: ${etiquetaPeriodo(per)}`, W / 2, 166, { align: 'center' });
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, W / 2, 173, { align: 'center' });
  doc.setFontSize(9); doc.text(`Preparado por ${BRAND.legalName} · Documento confidencial`, W / 2, H - 22, { align: 'center' });

  const pagina = (t) => { doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...TINTA); doc.text(t, M, 26); doc.setDrawColor(...LINEA); doc.setLineWidth(0.3); doc.line(M, 30, W - M, 30); return 38; };
  const parrafo = (txt, y, opts = {}) => { doc.setFont('helvetica', opts.bold ? 'bold' : 'normal'); doc.setFontSize(opts.size || 10.5); doc.setTextColor(...(opts.color || TINTA)); const l = doc.splitTextToSize(txt, W - 2 * M - (opts.indent || 0)); doc.text(l, M + (opts.indent || 0), y); return y + l.length * ((opts.size || 10.5) * 0.48) + 2.5; };
  const tabla = (y, head, body, extra = {}) => { autoTable(doc, { startY: y, margin: { left: M, right: M }, head: [head], body, styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.3, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2 }, headStyles: { fillColor: [245, 245, 247], textColor: GRIS, fontStyle: 'bold' }, ...extra }); return doc.lastAutoTable.finalY + 8; };

  // 1. Resumen ejecutivo
  let y = pagina('1. Resumen ejecutivo');
  const colSem = { rojo: ROJO, amarillo: AMBAR, verde: VERDE }[A.semaforo];
  const txtSem = { rojo: 'Requiere atención del Consejo', amarillo: 'En vigilancia', verde: 'Bajo control' }[A.semaforo];
  doc.setFillColor(...colSem); doc.circle(M + 3, y - 1.5, 2.6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TINTA); doc.text(`Estado general: ${txtSem}`, M + 9, y); y += 10;
  const delta = (a, b, inverso = false) => { if (b == null || a == null) return ['', GRIS]; const d = Math.round((a - b) * 10) / 10; if (!d) return ['sin cambio', GRIS]; const malo = inverso ? d < 0 : d > 0; return [`${d > 0 ? '+' : ''}${d} vs trim. anterior`, malo ? ROJO : VERDE]; };
  const tiles = [
    ['Riesgos activos', A.activos.length, A.mp?.riesgos_activos], ['Críticos (residual)', A.activos.filter((x) => A.res(x) >= 17).length, A.mp?.criticos],
    ['Fuera de apetito', A.fuera.length, A.mp?.fuera_apetito], ['Deficiencias de control', A.defs.length, A.mp?.deficiencias],
    ['Planes vencidos', A.vencidos.length, A.mp?.planes_vencidos], ['Avance plan de auditoría', A.avancePlan == null ? '—' : `${A.avancePlan}%`, null],
  ];
  const tw = (W - 2 * M - 10) / 3;
  tiles.forEach(([t, val, prev], i) => {
    const x = M + (i % 3) * (tw + 5); const yy = y + Math.floor(i / 3) * 27;
    doc.setFillColor(245, 245, 247); doc.roundedRect(x, yy, tw, 23, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(t, x + 5, yy + 6.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...TINTA); doc.text(String(val), x + 5, yy + 15.5);
    const [dt, dc] = typeof val === 'number' ? delta(val, prev) : ['', GRIS];
    if (dt) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...dc); doc.text(dt, x + 5, yy + 20.5); }
  });
  y += 62;
  if (!A.mp) y = parrafo('Este es el primer trimestre con medición; a partir del siguiente informe se presentarán variaciones contra el trimestre anterior.', y, { color: GRIS, size: 9.5 });
  y = parrafo('Mensajes clave', y + 2, { bold: true, size: 12 });
  const msgs = [
    `El perfil de riesgo incluye ${A.activos.length} riesgos activos; ${A.fuera.length} se encuentran fuera del apetito aprobado (residual mayor a ${apetito}).`,
    A.defs.length ? `Se identifican ${A.defs.length} deficiencia(s) de control${A.defs.some((d) => d.tipo === 'Debilidad material') ? ', incluida al menos una debilidad material' : ''}.` : 'No se identifican deficiencias de control en las pruebas revisadas.',
    `${A.abiertos.length} plan(es) de acción abiertos: ${A.vencidos.length} vencido(s) y ${A.enValid.length} en validación de evidencia.`,
    A.avancePlan != null ? `El plan anual de auditoría ${year} registra un avance de ${A.avancePlan}% (${A.trabajos.filter((i) => i.status === 'concluida').length} de ${A.trabajos.length} trabajos concluidos).` : '',
  ].filter(Boolean);
  msgs.forEach((t) => { y = parrafo('•  ' + t, y, { indent: 2 }); });

  // 2. Evolución del perfil de riesgo
  y = pagina('2. Evolución del perfil de riesgo');
  const filas = [
    ['Riesgos activos', 'riesgos_activos'], ['Riesgos críticos (residual 17–25)', 'criticos'], ['Riesgos altos (residual 10–16)', 'altos'],
    ['Fuera de apetito', 'fuera_apetito'], ['Riesgo inherente promedio', 'inherente_prom'], ['Riesgo residual promedio', 'residual_prom'],
    ['Controles probados', 'controles_probados'], ['Deficiencias de control', 'deficiencias'], ['Planes de acción abiertos', 'planes_abiertos'], ['Planes de acción vencidos', 'planes_vencidos'],
  ].map(([t, key]) => { const a = A.m[key]; const b = A.mp ? A.mp[key] : null; const d = a != null && b != null ? Math.round((a - b) * 10) / 10 : null; return [t, b ?? '—', a ?? '—', d == null ? '—' : d > 0 ? `+${d}` : String(d)]; });
  y = tabla(y, ['Indicador', `Trimestre anterior (${perAnt})`, `Trimestre actual (${per})`, 'Variación'], filas, {
    didParseCell: (h) => { if (h.section === 'body' && h.column.index === 3) { const n = parseFloat(h.cell.raw); if (!isNaN(n) && n !== 0) { const buenaBaja = h.row.index !== 6; h.cell.styles.textColor = (n > 0) === buenaBaja ? ROJO : VERDE; h.cell.styles.fontStyle = 'bold'; } } },
  });
  if (A.mp) {
    y = parrafo('Movimientos del trimestre', y, { bold: true, size: 12 });
    const mov = [
      ...A.nuevos.map((x) => ['Nuevo', x.code || '', x.name, '—', A.res(x)]),
      ...A.suben.map((x) => ['Aumentó', x.code || '', x.name, A.prevMap[x.id].res, A.res(x)]),
      ...A.bajan.map((x) => ['Disminuyó', x.code || '', x.name, A.prevMap[x.id].res, A.res(x)]),
    ];
    y = mov.length ? tabla(y, ['Movimiento', 'ID', 'Riesgo', 'Residual anterior', 'Residual actual'], mov, {
      didParseCell: (h) => { if (h.section === 'body' && h.column.index === 0) { h.cell.styles.fontStyle = 'bold'; h.cell.styles.textColor = h.cell.raw === 'Disminuyó' ? VERDE : h.cell.raw === 'Aumentó' ? ROJO : AZUL; } },
    }) : parrafo('Sin cambios en la calificación de riesgos respecto del trimestre anterior.', y, { color: GRIS });
  }

  // 3. Principales riesgos
  y = pagina('3. Principales riesgos residuales');
  y = tabla(y, ['ID', 'Riesgo', 'Inherente', 'Residual', 'Nivel', 'Apetito'],
    [...A.activos].sort((a, b) => A.res(b) - A.res(a)).slice(0, 12).map((x) => [x.code || '', x.name, x.inherent_risk, A.res(x), NIVEL(A.res(x)), A.res(x) > apetito ? 'Fuera' : 'Dentro']),
    { columnStyles: { 1: { cellWidth: 72 } }, didParseCell: (h) => { if (h.section !== 'body') return; if (h.column.index === 3 || h.column.index === 4) { const f = FONDO(h.row.raw[3]); if (f) h.cell.styles.fillColor = f; } if (h.column.index === 5 && h.cell.raw === 'Fuera') { h.cell.styles.textColor = ROJO; h.cell.styles.fontStyle = 'bold'; } } });

  // 4. Control interno
  y = pagina('4. Control interno: deficiencias e indicadores');
  y = A.defs.length ? tabla(y, ['Clasificación', 'Riesgo', 'Control', 'Diseño', 'Operación'],
    A.defs.map((d) => [d.tipo, d.riesgo.name, d.control?.name || 'Sin control', d.control?.design_evaluation || '—', d.control?.test_result || '—']),
    { columnStyles: { 1: { cellWidth: 50 }, 2: { cellWidth: 50 } }, didParseCell: (h) => { if (h.section === 'body' && h.column.index === 0) { h.cell.styles.fontStyle = 'bold'; h.cell.styles.textColor = h.cell.raw === 'Debilidad material' ? ROJO : h.cell.raw === 'Deficiencia' ? GRIS : AMBAR; } } })
    : parrafo('No se identifican deficiencias de control.', y, { color: GRIS });
  y = parrafo('Indicadores clave de riesgo (KRI) en alerta', y, { bold: true, size: 12 });
  y = A.kris.length ? tabla(y, ['Riesgo', 'Indicador', 'Valor', 'Alerta', 'Límite', 'Estado'],
    A.kris.map((x) => [x.r.name, x.k.name, x.k.value, x.r.kri_warning ?? '—', x.r.kri_limit ?? '—', x.e === 'rojo' ? 'Fuera de límite' : 'En alerta']),
    { didParseCell: (h) => { if (h.section === 'body' && h.column.index === 5) { h.cell.styles.fontStyle = 'bold'; h.cell.styles.textColor = h.cell.raw === 'Fuera de límite' ? ROJO : AMBAR; } } })
    : parrafo('Todos los indicadores con umbral definido se encuentran en rango.', y, { color: GRIS });

  // 5. Planes de acción
  y = pagina('5. Seguimiento de planes de acción');
  y = parrafo(`Abiertos: ${A.abiertos.length} · Vencidos: ${A.vencidos.length} (más de 30 días: ${A.vencidos30.length}) · En validación: ${A.enValid.length} · Cerrados acumulados: ${p.data.filter((x) => x.status === 'cerrado').length}`, y);
  y = A.vencidos.length ? tabla(y + 2, ['Plan de acción', 'Compromiso', 'Días de atraso'],
    [...A.vencidos].sort((a, b) => a.due_date.localeCompare(b.due_date)).map((x) => [x.title, new Date(x.due_date + 'T12:00:00').toLocaleDateString('es-MX'), Math.round((new Date(hoyISO) - new Date(x.due_date)) / 86400000)]),
    { columnStyles: { 0: { cellWidth: 110 } }, didParseCell: (h) => { if (h.section === 'body' && h.column.index === 2 && h.cell.raw > 30) { h.cell.styles.textColor = ROJO; h.cell.styles.fontStyle = 'bold'; } } })
    : parrafo('No hay planes de acción vencidos.', y + 2, { color: GRIS });

  // 6. Plan anual de auditoría
  y = pagina(`6. Avance del plan anual de auditoría ${year}`);
  y = A.trabajos.length ? tabla(y, ['T', 'Trabajo', 'Prioridad', 'Estado', 'Avance', 'Calificación'],
    [...A.trabajos].sort((a, b) => (a.quarter || 9) - (b.quarter || 9)).map((i) => [i.quarter ? `T${i.quarter}` : '—', i.title, i.priority, i.status.replace('_', ' '), `${i.progress}%`, i.rating ? i.rating.replace('_', ' ') : '—']),
    { columnStyles: { 1: { cellWidth: 78 } } })
    : parrafo('No se ha registrado plan anual de auditoría para este año.', y, { color: GRIS });

  // 7. Asuntos para decisión
  y = pagina('7. Asuntos que requieren decisión del Consejo');
  if (!A.decisiones.length) y = parrafo('No se presentan asuntos que requieran resolución del Consejo en este periodo.', y, { color: GRIS });
  A.decisiones.forEach((t, i) => { y = parrafo(`${i + 1}.  ${t}`, y, { indent: 2 }); if (y > H - 30) y = pagina('7. Asuntos que requieren decisión del Consejo (cont.)'); });
  y = parrafo('Metodología: riesgo inherente = probabilidad × impacto (1–25); residual = inherente × (1 − efectividad promedio de controles ÷ 5 × 0.70). Clasificación de deficiencias conforme a COSO 2013 (criterio simplificado). Las cifras del trimestre anterior provienen de la fotografía automática del perfil de riesgo al cierre del periodo.', y + 6, { color: GRIS, size: 8.5 });

  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`${razon} · Informe al Consejo · ${per} · Confidencial`, M, H - 10);
    doc.text(`${i - 1} / ${total - 1}`, W - M, H - 10, { align: 'right' });
    if (logoFirma) { try { doc.addImage(logoFirma, tipoImg(logoFirma), W - M - 9, 14, 9, 9); } catch { /* */ } }
  }
  doc.save(`Board_pack_${(cliente?.name || 'CyC').replace(/[^\w]+/g, '_')}_${per}.pdf`);
}
