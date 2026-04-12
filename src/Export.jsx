import React, { useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { notificationService } from './services.js';
import { useStore } from './store.js';

export default function Export() {
  const okrs        = useStore(s => s.okrs        || []);
  const kpis        = useStore(s => s.kpis        || []);
  const initiatives = useStore(s => s.initiatives || []);
  const org         = useStore(s => s.currentOrganization);
  const [loading, setLoading] = useState('');

  // ── PDF ──────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    setLoading('pdf');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const orgName = org?.name || 'Xtratia Enterprise';
      const dateStr = new Date().toLocaleDateString('es-MX');

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte Estratégico — ' + orgName, 14, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Generado: ' + dateStr + ' | Xtratia Enterprise OS v3.0', 14, 22);

      let y = 38;
      doc.setTextColor(0, 0, 0);

      // Resumen ejecutivo
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('RESUMEN EJECUTIVO', 14, y); y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const avgProgress = okrs.length > 0 ? Math.round(okrs.reduce((a, o) => a + (o.progress || 0), 0) / okrs.length) : 0;
      const riskKPIs = kpis.filter(k => k.target > 0 && (k.value / k.target) * 100 < 70).length;

      doc.text('OKRs Activos: ' + okrs.length + '  |  Avance Global: ' + avgProgress + '%', 14, y); y += 6;
      doc.text('KPIs Monitoreados: ' + kpis.length + '  |  KPIs en Riesgo: ' + riskKPIs, 14, y); y += 6;
      doc.text('Iniciativas Registradas: ' + initiatives.length, 14, y); y += 12;

      // OKRs
      if (okrs.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text('OBJETIVOS Y RESULTADOS CLAVE (OKRs)', 14, y); y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);

        okrs.slice(0, 15).forEach((okr, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const pct = okr.progress || 0;
          doc.setFont('helvetica', 'bold');
          doc.text((i + 1) + '. ' + (okr.title || okr.objective || 'Sin título').substring(0, 80), 14, y); y += 5;
          doc.setFont('helvetica', 'normal');
          doc.text('   Avance: ' + pct + '%  |  Responsable: ' + (okr.owner || 'N/A'), 14, y); y += 6;
        });
        y += 4;
      }

      // KPIs
      if (kpis.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text('INDICADORES CLAVE (KPIs)', 14, y); y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        kpis.slice(0, 15).forEach((kpi, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const pct = kpi.target > 0 ? Math.round((kpi.value / kpi.target) * 100) : 0;
          const status = pct >= 80 ? 'OK' : pct >= 60 ? 'ATENCIÓN' : 'RIESGO';
          doc.setTextColor(pct >= 80 ? 22 : pct >= 60 ? 180 : 220, pct >= 80 ? 163 : pct >= 60 ? 100 : 38, pct >= 80 ? 74 : pct >= 60 ? 26 : 38);
          doc.text((i + 1) + '. [' + status + '] ' + (kpi.name || 'KPI').substring(0, 60) + ' — ' + pct + '%', 14, y); y += 5;
          doc.setTextColor(40, 40, 40);
        });
        y += 4;
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text('Xtratia Enterprise OS — Confidencial | Página ' + p + ' de ' + pageCount, 14, 290);
      }

      doc.save('Reporte_Estrategico_' + orgName.replace(/\s+/g, '_') + '_' + dateStr.replace(/\//g, '-') + '.pdf');
      notificationService.success('✅ PDF generado correctamente.');
    } catch (e) {
      notificationService.error('Error al generar PDF: ' + e.message);
    } finally { setLoading(''); }
  };

  // ── EXCEL ─────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    setLoading('excel');
    try {
      const wb = XLSX.utils.book_new();
      const dateStr = new Date().toLocaleDateString('es-MX');

      // Hoja 1: OKRs
      const okrData = [
        ['#', 'Objetivo', 'Avance (%)', 'Responsable', 'Fecha Límite', 'Estado'],
        ...okrs.map((o, i) => [
          i + 1,
          o.title || o.objective || '',
          o.progress || 0,
          o.owner || '',
          o.due_date || '',
          o.status || 'active'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(okrData), 'OKRs');

      // Hoja 2: KPIs
      const kpiData = [
        ['#', 'Nombre', 'Valor Actual', 'Meta', 'Avance (%)', 'Unidad', 'Departamento', 'Responsable'],
        ...kpis.map((k, i) => {
          const pct = k.target > 0 ? Math.round((k.value / k.target) * 100) : 0;
          return [i + 1, k.name || '', k.value || 0, k.target || 0, pct, k.unit || '', k.department || '', k.owner || ''];
        })
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiData), 'KPIs');

      // Hoja 3: Iniciativas
      const initData = [
        ['#', 'Nombre', 'Fase', 'Responsable', 'Inicio', 'Fin', 'Presupuesto'],
        ...initiatives.map((ini, i) => [
          i + 1,
          ini.name || '',
          ini.phase || '',
          ini.owner || '',
          ini.start_date || '',
          ini.end_date || '',
          ini.budget || 0
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(initData), 'Iniciativas');

      // Hoja 4: Resumen
      const summary = [
        ['Reporte Estratégico — ' + (org?.name || 'Xtratia'), ''],
        ['Fecha de Generación', dateStr],
        ['', ''],
        ['Métrica', 'Valor'],
        ['OKRs Activos', okrs.length],
        ['Avance Global OKRs', (okrs.length > 0 ? Math.round(okrs.reduce((a,o) => a+(o.progress||0),0)/okrs.length) : 0) + '%'],
        ['KPIs Monitoreados', kpis.length],
        ['KPIs en Riesgo (<70%)', kpis.filter(k => k.target > 0 && (k.value/k.target)*100 < 70).length],
        ['Iniciativas Registradas', initiatives.length],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Resumen');

      XLSX.writeFile(wb, 'Reporte_Estrategico_' + (org?.name||'Xtratia').replace(/\s+/g,'_') + '_' + dateStr.replace(/\//g,'-') + '.xlsx');
      notificationService.success('✅ Excel generado correctamente.');
    } catch (e) {
      notificationService.error('Error al generar Excel: ' + e.message);
    } finally { setLoading(''); }
  };

  const cards = [
    {
      id: 'pdf', icon: '📄', label: 'Reporte PDF Ejecutivo',
      desc: 'OKRs, KPIs e iniciativas con gráficos y colores de estado. Listo para presentar a directivos.',
      action: exportPDF, color: '#dc2626', bg: '#fee2e2'
    },
    {
      id: 'excel', icon: '📊', label: 'Reporte Excel Detallado',
      desc: '4 hojas: Resumen, OKRs, KPIs e Iniciativas. Ideal para análisis y auditorías.',
      action: exportExcel, color: '#16a34a', bg: '#dcfce7'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
        Genera reportes con los datos actuales de tu organización: {okrs.length} OKRs · {kpis.length} KPIs · {initiatives.length} Iniciativas
      </div>
      {cards.map(card => (
        <div key={card.id} style={{
          padding: 20, borderRadius: 14, background: 'var(--bg2)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {card.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{card.desc}</div>
          </div>
          <button onClick={card.action} disabled={loading === card.id}
            style={{
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: loading === card.id ? 'var(--border)' : card.color,
              color: loading === card.id ? 'var(--text3)' : 'white',
              border: 'none', cursor: loading === card.id ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}>
            {loading === card.id ? 'Generando...' : 'Descargar →'}
          </button>
        </div>
      ))}
    </div>
  );
}
