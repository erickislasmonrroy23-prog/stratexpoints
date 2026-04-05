import React, { useState } from 'react';
import pptxgen from "pptxgenjs";
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function PowerPoint() {
  const [options, setOptions] = useState({ okrs: true, kpis: true, map: false, insights: true });
  const [generating, setGenerating] = useState(false);
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const initiatives = useStore(state => state.initiatives);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let pptx = new pptxgen();
      let slide = pptx.addSlide();
      slide.addText("Reporte Ejecutivo Estratégico", { x: 1, y: 1, fontSize: 28, bold: true, color: "363636" });
      slide.addText("Generado automáticamente por Xtratia IA", { x: 1, y: 1.8, fontSize: 14, color: "666666" });
      
      if (options.okrs && okrs?.length > 0) {
        let slideOkr = pptx.addSlide();
        slideOkr.addText("Avance de OKRs", { x: 0.5, y: 0.5, fontSize: 20, bold: true });
        let okrText = okrs.map(o => `• ${o.objective} (${o.progress}%) - ${o.status}`);
        slideOkr.addText(okrText.join('\n'), { x: 0.5, y: 1.2, fontSize: 14 });
      }
      
      if (options.kpis && kpis?.length > 0) {
        let slideKpi = pptx.addSlide();
        slideKpi.addText("Tablero de KPIs", { x: 0.5, y: 0.5, fontSize: 20, bold: true });
        let kpiText = kpis.map(k => `• ${k.name}: ${k.value} / Meta: ${k.target}`);
        slideKpi.addText(kpiText.join('\n'), { x: 0.5, y: 1.2, fontSize: 14 });
      }

      await pptx.writeFile({ fileName: "Presentacion_Estrategica.pptx" });
    } catch(e) {
      notificationService.error("Error generando PowerPoint: " + e.message);
    }
    setGenerating(false);
  };

  const toggleOpt = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32, maxWidth: 700 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(217, 119, 6, 0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
          Presentación Ejecutiva Automática
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>Configura y compila un archivo PowerPoint (.pptx) estructurado con el avance de la estrategia, listo para tu próxima revisión directiva.</p>
        
        <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: 24, marginBottom: 32, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 16, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Contenido de las Diapositivas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="sp-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14, cursor: 'pointer', padding: '14px 16px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <input type="checkbox" checked={options.okrs} onChange={() => toggleOpt('okrs')} style={{ accentColor: 'var(--gold)', width: 18, height: 18, cursor: 'pointer' }} /> <span style={{ fontWeight: 600, color: 'var(--text)' }}>Avance general de OKRs <span style={{ color: 'var(--text3)', fontWeight: 500 }}>({okrs?.length || 0} activos)</span></span>
            </label>
            <label className="sp-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14, cursor: 'pointer', padding: '14px 16px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <input type="checkbox" checked={options.kpis} onChange={() => toggleOpt('kpis')} style={{ accentColor: 'var(--gold)', width: 18, height: 18, cursor: 'pointer' }} /> <span style={{ fontWeight: 600, color: 'var(--text)' }}>Tablero de Bowling Chart y KPIs</span>
            </label>
            <label className="sp-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14, cursor: 'pointer', padding: '14px 16px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <input type="checkbox" checked={options.map} onChange={() => toggleOpt('map')} style={{ accentColor: 'var(--gold)', width: 18, height: 18, cursor: 'pointer' }} /> <span style={{ fontWeight: 600, color: 'var(--text)' }}>Mapa Estratégico Visual</span>
            </label>
            <label className="sp-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14, cursor: 'pointer', padding: '14px 16px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <input type="checkbox" checked={options.insights} onChange={() => toggleOpt('insights')} style={{ accentColor: 'var(--gold)', width: 18, height: 18, cursor: 'pointer' }} /> <span style={{ fontWeight: 600, color: 'var(--text)' }}>Resumen de Inteligencia Estratégica (IA)</span>
            </label>
          </div>
        </div>

        <button className="sp-btn scale-in" onClick={handleGenerate} disabled={generating} style={{ width: '100%', justifyContent: 'center', background: 'var(--gold)', padding: '16px', borderRadius: 99, fontSize: 15, fontWeight: 800, boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)' }}>
          {generating ? '⏳ Ensamblando diapositivas...' : 'Generar Presentation Deck (.pptx)'}
        </button>
        {generating && <div className="progress-bar" style={{ marginTop: 24, height: 8 }}><div className="progress-fill" style={{ width: '100%', transition: 'width 2.5s linear', background: 'var(--gold)' }} /></div>}
      </div>
    </div>
  );
}