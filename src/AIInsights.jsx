import React, { useState } from 'react';
import { claudeService, notificationService } from './services.js';
import { useStore } from './store.js';

const ANALYSIS_TYPES = [
  { id: 'okrs',      label: 'Auditoría OKRs',    icon: '🎯', desc: 'Análisis profundo de tus objetivos y resultados clave' },
  { id: 'kpis',      label: 'Diagnóstico KPIs',  icon: '📊', desc: 'Identificar indicadores en riesgo y palancas de mejora' },
  { id: 'strategy',  label: 'Alineación Estratégica', icon: '🏛️', desc: 'Evaluar coherencia entre OKRs, KPIs e iniciativas' },
  { id: 'risks',     label: 'Mapa de Riesgos IA', icon: '⚠️', desc: 'Identificar amenazas y vulnerabilidades organizacionales' },
];

export default function AIInsights() {
  const okrs        = useStore(s => s.okrs        || []);
  const kpis        = useStore(s => s.kpis        || []);
  const initiatives = useStore(s => s.initiatives || []);
  const org         = useStore(s => s.currentOrganization);

  const [selected, setSelected]   = useState('okrs');
  const [result, setResult]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [history, setHistory]     = useState([]);

  const runAnalysis = async () => {
    setLoading(true);
    setResult('');
    try {
      const ctx = {
        org: org?.name,
        okrsCount: okrs.length,
        kpisCount: kpis.length,
        initiativesCount: initiatives.length,
        avgOKRProgress: okrs.length > 0 ? Math.round(okrs.reduce((a,o) => a+(o.progress||0),0)/okrs.length) : 0,
        kpisAtRisk: kpis.filter(k => k.target>0 && (k.value/k.target)*100 < 70).length,
        okrs: okrs.slice(0,10).map(o => ({ title: o.title||o.objective, progress: o.progress, status: o.status })),
        kpis: kpis.slice(0,10).map(k => ({ name: k.name, value: k.value, target: k.target, unit: k.unit })),
      };

      const prompts = {
        okrs: 'Eres auditor de OKRs. Analiza el portafolio y entrega: 1) Diagnóstico ejecutivo 2) Top 3 OKRs en riesgo con razones 3) Top 3 recomendaciones de aceleración 4) Score de madurez OKR (0-100). Español, estructurado.',
        kpis: 'Eres analista de KPIs. Entrega: 1) Diagnóstico del sistema de medición 2) KPIs críticos (< 70% meta) con causa raíz probable 3) KPIs sobreperformando con oportunidades 4) Recomendaciones de mejora. Español.',
        strategy: 'Eres consultor estratégico senior. Evalúa: 1) Alineación entre OKRs y KPIs 2) Gaps estratégicos detectados 3) Iniciativas vs objetivos (¿hay cobertura?) 4) Plan de acción inmediato. Español, máximo 300 palabras.',
        risks: 'Eres experto en gestión de riesgos (ISO 31000/COSO). Identifica: 1) Top 5 riesgos estratégicos basados en los datos 2) Probabilidad e impacto estimado 3) Controles recomendados 4) Nivel de riesgo global (Bajo/Medio/Alto/Crítico). Español.',
      };

      const analysis = await claudeService.chat([
        { role: 'system', content: prompts[selected] },
        { role: 'user', content: 'Datos de la organización ' + (ctx.org||'') + ': ' + JSON.stringify(ctx) }
      ]);

      setResult(analysis);
      setHistory(prev => [{ type: selected, result: analysis, date: new Date().toLocaleTimeString('es-MX') }, ...prev].slice(0,5));
    } catch (e) {
      notificationService.error('Error en análisis: ' + e.message);
      setResult('⚠️ Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const currentType = ANALYSIS_TYPES.find(t => t.id === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Selector de tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {ANALYSIS_TYPES.map(t => (
          <button key={t.id} onClick={() => { setSelected(t.id); setResult(''); }}
            style={{
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: selected === t.id ? 'var(--primary)' : 'var(--bg2)',
              color: selected === t.id ? 'white' : 'var(--text)',
              border: '1.5px solid ' + (selected === t.id ? 'var(--primary)' : 'var(--border)'),
              transition: 'all 0.18s',
            }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Contexto actual */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          ['🎯', okrs.length + ' OKRs'],
          ['📊', kpis.length + ' KPIs'],
          ['🚀', initiatives.length + ' Iniciativas'],
          ['📈', (okrs.length > 0 ? Math.round(okrs.reduce((a,o)=>a+(o.progress||0),0)/okrs.length) : 0) + '% Avance'],
        ].map(([icon, label]) => (
          <span key={label} style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{icon}</span><span>{label}</span>
          </span>
        ))}
      </div>

      {/* Botón ejecutar */}
      <button onClick={runAnalysis} disabled={loading}
        className="sp-btn sp-btn-primary"
        style={{ padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
        {loading
          ? 'Analizando con Gemini AI...'
          : currentType?.icon + ' Ejecutar ' + currentType?.label
        }
      </button>

      {/* Resultado */}
      {result && (
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {currentType?.icon} {currentType?.label} — Xtratia AI
            </div>
            <button onClick={() => { navigator.clipboard.writeText(result); notificationService.success('Copiado.'); }}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)' }}>
              📋 Copiar
            </button>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Análisis anteriores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.slice(1).map((h, i) => {
              const t = ANALYSIS_TYPES.find(a => a.id === h.type);
              return (
                <button key={i} onClick={() => setResult(h.result)}
                  style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 16 }}>{t?.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t?.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{h.date}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
