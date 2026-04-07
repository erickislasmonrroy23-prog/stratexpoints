import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { notificationService } from './services.js';
import { useStore } from './store.js';

export default function Export() {
  const [exporting, setExporting] = useState(null);
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      if (format === 'Excel/CSV') {
        const rows = [
          ['Tipo', 'Elemento', 'Progreso / Valor', 'Estado'],
          ...(okrs || []).map(o => ['OKR', o.objective, `${o.progress}%`, o.status]),
          ...(kpis || []).map(k => ['KPI', k.name, `${k.value}`, `Meta: ${k.target}`]),
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "Estrategia_Data.csv";
        link.click();
      } else if (format === 'PDF') {
        const doc = new jsPDF();
        doc.text("Reporte Estratégico - Xtratia", 14, 15);
        const tableData = (okrs || []).map(o => [o.objective, `${o.progress}%`, o.status]);
        doc.autoTable({ head: [['Objetivo (OKR)', 'Avance', 'Estado']], body: tableData, startY: 25 });
        doc.save("Reporte_Estrategia.pdf");
      } else if (format === 'Word') {
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Reporte</title></head><body>";
        const footer = "</body></html>";
        const content = "<h1>Reporte Estratégico</h1><h2>OKRs Activos</h2><ul>" + (okrs||[]).map(o => "<li>" + o.objective + " - Avance: " + o.progress + "%</li>").join("") + "</ul>";
        const blob = new Blob([header + content + footer], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Reporte_Estrategia.doc';
        link.click();
      } else {
        notificationService.error(`La generación de ${format} no está implementada en este demo.`);
      }
    } catch (error) {
      console.error("Error exportando:", error);
    }
    setExporting(null);
  };

  const formats = [
    { id: 'PDF', icon: '📄', color: 'var(--red)', desc: 'Reporte ejecutivo visual con gráficas estáticas.' },
    { id: 'Excel/CSV', icon: '📊', color: 'var(--green)', desc: 'Sábana de datos crudos de OKRs y KPIs activos.' },
    { id: 'Word', icon: '📝', color: 'var(--primary)', desc: 'Documento redactado con la narrativa de la estrategia.' }
  ];

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📥</div>
          Centro de Exportación Documental
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>Descarga el estado actual de tu estrategia en formatos estandarizados para tus reuniones directivas.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {formats.map(f => (
            <div key={f.id} className="sp-card-hover scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderTop: `4px solid ${f.color}`, borderRadius: 16, padding: 32, textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 48, marginBottom: 20, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{f.icon}</div>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{f.id}</h4>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 32, minHeight: 40, lineHeight: 1.5 }}>{f.desc}</p>
              <button className="sp-btn" onClick={() => handleExport(f.id)} disabled={exporting !== null} style={{ width: '100%', justifyContent: 'center', background: f.color, padding: '12px', borderRadius: 99, fontSize: 14, fontWeight: 700, boxShadow: `0 4px 12px ${f.color}40`, transition: 'all 0.2s' }}>
                {exporting === f.id ? 'Generando...' : `Descargar ${f.id}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}