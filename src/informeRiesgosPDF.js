// Informe de Riesgos y Controles — PDF con identidad Cabrera & Consultores
// Estructura: portada · resumen ejecutivo · mapa de calor · registro de riesgos ·
// evaluación de controles · planes de acción · nota metodológica.
import { jsPDF } from 'jspdf';
import autoTablePkg from 'jspdf-autotable';
// Compatibilidad: el paquete expone la función como default o como default.default según el empaquetador
const autoTable = typeof autoTablePkg === 'function' ? autoTablePkg : autoTablePkg.default;
import { BRAND } from './brand.js';

const TINTA = [29, 29, 31];
const GRIS = [110, 110, 115];
const LINEA = [229, 229, 234];
const AZUL = [0, 113, 227];
const NIVEL = (v) => (v == null ? null
  : v <= 4 ? { t: 'Bajo', c: [52, 199, 89] }
  : v <= 9 ? { t: 'Moderado', c: [255, 204, 0] }
  : v <= 16 ? { t: 'Alto', c: [255, 149, 0] }
  : { t: 'Crítico', c: [255, 59, 48] });

const fecha = (d) => (d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

async function imagenComoDataURL(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const r = await fetch(src);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
  } catch { return null; }
}

export async function generarInformeRiesgos({ datos, organizacion, autor }) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const logo = await imagenComoDataURL(organizacion?.logo_url || BRAND.logo);
  const razon = organizacion?.name || BRAND.legalName;
  const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const activos = datos.riesgos.filter((r) => r.status === 'activo');
  const res = (r) => r.residual_risk ?? r.inherent_risk;
  const nombre = (id) => { const p = datos.personas.find((x) => x.id === id); return p ? (p.full_name || p.email) : '—'; };
  const area = (id) => datos.areas.find((a) => a.id === id)?.name || '—';
  const controlesDe = (rid) => datos.vinculos.filter((v) => v.risk_id === rid).length;
  const hoyISO = new Date().toISOString().slice(0, 10);

  // ── Portada ──
  doc.setFillColor(245, 245, 247); doc.rect(0, 0, W, H, 'F');
  if (logo) { try { doc.addImage(logo, 'PNG', W / 2 - 28, 46, 56, 56); } catch { /* formato no soportado */ } }
  doc.setTextColor(...TINTA); doc.setFont('helvetica', 'bold'); doc.setFontSize(26);
  doc.text('Informe de Riesgos y Controles', W / 2, 126, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(...GRIS);
  doc.text(razon, W / 2, 136, { align: 'center' });
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.8); doc.line(W / 2 - 12, 144, W / 2 + 12, 144);
  doc.setFontSize(11);
  doc.text(`Emitido el ${hoy}`, W / 2, 154, { align: 'center' });
  if (autor) doc.text(`Elaboró: ${autor}`, W / 2, 161, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Marco de referencia: COSO ERM 2017 · COSO Control Interno 2013 · ISO 31000:2018', W / 2, H - 30, { align: 'center' });
  doc.text(`${BRAND.legalName} · Documento confidencial`, W / 2, H - 24, { align: 'center' });

  // ── Encabezado/pie de páginas interiores ──
  const nuevaPagina = (titulo) => {
    doc.addPage();
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...TINTA);
    doc.text(titulo, M, 26);
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.3); doc.line(M, 30, W - M, 30);
    return 38;
  };

  // ── 1. Resumen ejecutivo ──
  let y = nuevaPagina('1. Resumen ejecutivo');
  const criticos = activos.filter((r) => res(r) >= 17).length;
  const altos = activos.filter((r) => res(r) >= 10 && res(r) < 17).length;
  const sinControl = activos.filter((r) => controlesDe(r.id) === 0).length;
  const inefectivos = datos.controles.filter((c) => c.test_result === 'inefectivo' || c.status === 'no_operando').length;
  const vencidos = datos.planes.filter((p) => p.status !== 'cerrado' && p.due_date && p.due_date < hoyISO).length;
  const inh = activos.reduce((s, r) => s + (r.inherent_risk || 0), 0);
  const rsd = activos.reduce((s, r) => s + (res(r) || 0), 0);
  const mitig = inh ? Math.round((1 - rsd / inh) * 100) : 0;

  const tarjetas = [
    ['Riesgos activos', activos.length], ['Críticos (residual)', criticos], ['Altos (residual)', altos],
    ['Sin control asignado', sinControl], ['Controles con falla', inefectivos], ['Planes vencidos', vencidos],
  ];
  const cw = (W - 2 * M - 10) / 3;
  tarjetas.forEach(([t, v], i) => {
    const x = M + (i % 3) * (cw + 5); const yy = y + Math.floor(i / 3) * 26;
    doc.setFillColor(245, 245, 247); doc.roundedRect(x, yy, cw, 22, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(t, x + 5, yy + 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...TINTA); doc.text(String(v), x + 5, yy + 17);
  });
  y += 60;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...TINTA);
  const conclusion = [
    `Se evaluaron ${activos.length} riesgos activos. Los controles vinculados reducen la exposición agregada en ${mitig}% respecto del riesgo inherente.`,
    criticos ? `Existen ${criticos} riesgo(s) en nivel crítico que requieren atención de la Dirección y del Comité de Auditoría.` : 'No se identifican riesgos residuales en nivel crítico.',
    sinControl ? `${sinControl} riesgo(s) activo(s) carecen de controles asignados; se recomienda diseñar actividades de control o documentar su aceptación.` : 'Todos los riesgos activos cuentan con al menos un control asignado.',
    inefectivos ? `${inefectivos} control(es) presentan deficiencias de operación o diseño; deben remediarse y volver a probarse.` : '',
    vencidos ? `${vencidos} plan(es) de acción se encuentran vencidos respecto de su fecha compromiso.` : '',
  ].filter(Boolean);
  conclusion.forEach((p) => { const l = doc.splitTextToSize(p, W - 2 * M); doc.text(l, M, y); y += l.length * 5.2 + 2; });

  // ── 2. Mapa de calor (residual) ──
  y = nuevaPagina('2. Mapa de calor de riesgo residual');
  const celda = 22; const x0 = M + 30; const y0 = y + 4;
  const conteo = {};
  activos.forEach((r) => { const v = res(r); const p = r.probability; const i = Math.max(1, Math.min(5, Math.round(v / p))); conteo[`${p}-${i}`] = (conteo[`${p}-${i}`] || 0) + 1; });
  const etP = ['', 'Rara', 'Improbable', 'Posible', 'Probable', 'Casi segura'];
  const etI = ['', 'Insignif.', 'Menor', 'Moderado', 'Mayor', 'Catastróf.'];
  for (let p = 5; p >= 1; p--) {
    const yy = y0 + (5 - p) * (celda + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`${p} ${etP[p]}`, x0 - 3, yy + celda / 2 + 1, { align: 'right' });
    for (let i = 1; i <= 5; i++) {
      const xx = x0 + (i - 1) * (celda + 2); const n = NIVEL(p * i);
      doc.setFillColor(...n.c.map((c) => Math.round(c + (255 - c) * 0.72))); doc.roundedRect(xx, yy, celda, celda, 2.5, 2.5, 'F');
      const k = conteo[`${p}-${i}`];
      if (k) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...TINTA); doc.text(String(k), xx + celda / 2, yy + celda / 2 + 2, { align: 'center' }); }
    }
  }
  for (let i = 1; i <= 5; i++) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`${i} ${etI[i]}`, x0 + (i - 1) * (celda + 2) + celda / 2, y0 + 5 * (celda + 2) + 4, { align: 'center' });
  }
  doc.text('Eje vertical: probabilidad  ·  Eje horizontal: impacto', x0, y0 + 5 * (celda + 2) + 12);

  // ── 3. Registro de riesgos ──
  y = nuevaPagina('3. Registro de riesgos');
  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [['Código', 'Riesgo', 'Área', 'Dueño', 'P×I', 'Inherente', 'Residual', 'Ctrl.']],
    body: [...datos.riesgos].sort((a, b) => (res(b) || 0) - (res(a) || 0)).map((r) => [
      r.code || '—', r.name, area(r.area_id), nombre(r.owner_id), `${r.probability}×${r.impact}`,
      `${r.inherent_risk ?? '—'} ${NIVEL(r.inherent_risk)?.t || ''}`, `${res(r) ?? '—'} ${NIVEL(res(r))?.t || ''}`, controlesDe(r.id),
    ]),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2 },
    headStyles: { fillColor: [245, 245, 247], textColor: GRIS, fontStyle: 'bold' },
    columnStyles: { 1: { cellWidth: 58 } },
    didParseCell: (h) => {
      if (h.section === 'body' && (h.column.index === 5 || h.column.index === 6)) {
        const v = parseInt(String(h.cell.raw), 10); const n = NIVEL(v);
        if (n) { h.cell.styles.fillColor = n.c.map((c) => Math.round(c + (255 - c) * 0.75)); h.cell.styles.fontStyle = 'bold'; }
      }
    },
  });

  // ── 4. Evaluación de controles ──
  y = nuevaPagina('4. Evaluación de controles');
  const tx = { preventivo: 'Preventivo', detectivo: 'Detectivo', correctivo: 'Correctivo' };
  const dz = { adecuado: 'Adecuado', necesita_mejora: 'Necesita mejora', inadecuado: 'Inadecuado' };
  const pr = { efectivo: 'Efectivo', necesita_mejora: 'Necesita mejora', inefectivo: 'Inefectivo' };
  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [['Código', 'Control', 'Tipo', 'Naturaleza', 'Diseño', 'Prueba', 'Efect.', 'Ref. PT']],
    body: datos.controles.map((c) => [c.code || '—', c.name, tx[c.type] || '—', c.nature === 'automatico' ? 'Automático' : 'Manual',
      dz[c.design_evaluation] || 'Sin evaluar', pr[c.test_result] || 'Sin probar', c.effectiveness != null ? `${c.effectiveness}/5` : '—', c.test_reference || '—']),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2 },
    headStyles: { fillColor: [245, 245, 247], textColor: GRIS, fontStyle: 'bold' },
    columnStyles: { 1: { cellWidth: 52 } },
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 5) {
        const t = String(h.cell.raw);
        if (t === 'Inefectivo') h.cell.styles.textColor = [215, 0, 21];
        if (t === 'Efectivo') h.cell.styles.textColor = [36, 138, 61];
      }
    },
  });

  // ── 5. Planes de acción ──
  y = nuevaPagina('5. Seguimiento de planes de acción');
  const ep = { abierto: 'Abierto', en_progreso: 'En progreso', cerrado: 'Cerrado', vencido: 'Vencido' };
  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [['Hallazgo / acción', 'Riesgo', 'Responsable', 'Compromiso', 'Estado']],
    body: datos.planes.map((p) => {
      const r = datos.riesgos.find((x) => x.id === p.risk_id);
      const venc = p.status !== 'cerrado' && p.due_date && p.due_date < hoyISO;
      return [p.title, r ? `${r.code || ''} ${r.name}` : '—', nombre(p.responsible_id), fecha(p.due_date), ep[venc ? 'vencido' : p.status]];
    }),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2 },
    headStyles: { fillColor: [245, 245, 247], textColor: GRIS, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 60 } },
    didParseCell: (h) => { if (h.section === 'body' && h.column.index === 4 && h.cell.raw === 'Vencido') { h.cell.styles.textColor = [215, 0, 21]; h.cell.styles.fontStyle = 'bold'; } },
  });

  // ── 6. Nota metodológica ──
  y = nuevaPagina('6. Nota metodológica');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TINTA);
  [
    'Riesgo inherente = Probabilidad (1–5) × Impacto (1–5), en escala de 1 a 25.',
    'Efectividad del control (1–5) = evaluación de diseño (adecuado 2.5 · necesita mejora 1.25 · inadecuado 0) + resultado de la prueba de operación (efectivo 2.5 · necesita mejora 1.25 · inefectivo 0).',
    'Riesgo residual = Inherente × (1 − efectividad promedio de los controles vinculados ÷ 5 × 0.70). La reducción máxima atribuible a controles es de 70%.',
    'Niveles: Bajo 1–4 · Moderado 5–9 · Alto 10–16 · Crítico 17–25.',
    'Los cálculos se ejecutan en la base de datos y quedan registrados en la bitácora de auditoría.',
  ].forEach((t) => { const l = doc.splitTextToSize('•  ' + t, W - 2 * M); doc.text(l, M, y); y += l.length * 5.2 + 3; });

  // ── Pie y numeración ──
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`${BRAND.name} · Informe de Riesgos y Controles · Confidencial`, M, H - 10);
    doc.text(`${i - 1} / ${total - 1}`, W - M, H - 10, { align: 'right' });
    if (logo) { try { doc.addImage(logo, 'PNG', W - M - 9, 14, 9, 9); } catch { /* ignora */ } }
  }

  doc.save(`Informe_Riesgos_${(razon || 'CyC').replace(/[^\w]+/g, '_')}_${hoyISO}.pdf`);
}
