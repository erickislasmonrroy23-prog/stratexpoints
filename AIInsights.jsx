import React, { useState } from 'react';
import { groqService, notificationService } from './services.js';
import { useStore } from './store.js';
import { shallow } from 'zustand/shallow';

export default function AIInsights() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  // Usamos `shallow` para una comparación eficiente de los datos del store,
  // previniendo re-renders si los datos no han cambiado.
  const okrs = useStore(state => state.okrs);
  const initiatives = useStore(state => state.initiatives);
  const kpis = useStore(state => state.kpis);
  
  const generateInsight = async () => {
    setLoading(true);
    const prompt = `Actúa como un Chief Strategy Officer (CSO) experto en la metodología OKR. Aplica el método de la Pirámide de Minto (conclusión principal primero) para analizar la ejecución táctica de estos datos:
    OKRs: ${JSON.stringify(okrs || [])}
    Iniciativas asociadas: ${JSON.stringify(initiatives || [])}
    KPIs de impacto: ${JSON.stringify(kpis || [])}
    
    ENTREGABLE OBLIGATORIO:
    1. BLUF (Bottom Line Up Front): Un párrafo directo sobre el estado de avance global de los OKRs y la probabilidad de cumplir las metas al cierre del ciclo.
    2. Riesgos de Ejecución (KRs y OKRs): Identifica estrictamente los OKRs estancados, con nivel de confianza bajo (<6) o Resultados Clave (KRs) atrasados.
    3. Directriz de Enfoque Táctico: Sugiere exactamente qué OKRs requieren intervención directiva inmediata o reasignación de equipo/iniciativas hoy mismo.`;
    
    try {
      const response = await groqService.ask([{ role: 'user', content: prompt }]);
      setInsight(response);
    } catch (e) {
      notificationService.error("Error de IA: " + e.message);
    }
    setLoading(false);
  };

  const okrsCount = okrs?.length || 0;
  const avgOkrProgress = okrsCount > 0 ? (okrs.reduce((acc, okr) => acc + (okr.progress || 0), 0) / okrsCount).toFixed(1) : 0;

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🤖</span> Auditoría de OKRs (IA)
        </h3>
        <p style={{ color: 'var(--text3)', marginBottom: 20, fontSize: 14 }}>
          Análisis profundo de ejecución táctica basado en el progreso y salud de tus Objetivos y Resultados Clave (OKRs).
        </p>
        
        <div style={{ background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', padding: 16, borderRadius: '0 8px 8px 0', marginBottom: 16 }}>
          <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: 8 }}>Salud del Portafolio de OKRs</strong>
          <span style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>Se monitorean {okrsCount} OKRs activos. El avance global táctico se sitúa en un <strong>{avgOkrProgress}%</strong>. Presta atención a los Objetivos marcados "En Riesgo" o con un nivel de confianza bajo para garantizar el éxito del trimestre.</span>
        </div>

        {insight && (
          <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16, fontSize: 14, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            <strong style={{ display: 'block', marginBottom: 8, color: 'var(--teal)' }}>📊 Análisis Generado por Groq IA:</strong>
            {insight}
          </div>
        )}

        <button className="sp-btn" onClick={generateInsight} disabled={loading} style={{ width: '100%', justifyContent: 'center', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          {loading ? 'Procesando datos con IA...' : 'Generar Nuevo Análisis Profundo con Groq IA'}
        </button>
      </div>
    </div>
  );
}