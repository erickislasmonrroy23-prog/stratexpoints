import React, { useState } from 'react';
import { groqService, notificationService } from './services.js';
import { useStore } from './store.js';

export default function Prediction() {
  const okrs = useStore(s => s.okrs || []);
  const kpis = useStore(s => s.kpis || []);
  const org  = useStore(s => s.currentOrganization);

  const [result, setResult]   = useState('');
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState('30');

  const runPrediction = async () => {
    setLoading(true);
    setResult('');
    try {
      const prompt = [
        {
          role: 'system',
          content: 'Eres un analista predictivo estratégico. Basándote en los datos de OKRs y KPIs, genera una predicción de desempeño a ' + horizon + ' días. Incluye: 1) Score proyectado (0-100%), 2) Principales riesgos, 3) Palancas de aceleración, 4) Acciones críticas. Sé específico y cuantitativo. Español.'
        },
        {
          role: 'user',
          content: 'Organización: ' + (org?.name || 'Xtratia') +
            '\nOKRs activos: ' + okrs.length +
            '\nKPIs monitoreados: ' + kpis.length +
            '\nAvance promedio OKRs: ' + (okrs.length > 0 ? Math.round(okrs.reduce((a,o) => a + (o.progress || 0), 0) / okrs.length) : 0) + '%' +
            '\nKPIs en riesgo (< 70%): ' + kpis.filter(k => k.target > 0 && (k.value/k.target)*100 < 70).length +
            '\nHorizonte de predicción: ' + horizon + ' días'
        }
      ];

      const prediction = await groqService.chat(prompt, 'llama3-70b-8192');
      setResult(prediction);
    } catch (e) {
      notificationService.error('Error en predicción: ' + e.message);
      setResult('⚠️ Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const healthPct = okrs.length > 0
    ? Math.round(okrs.reduce((a, o) => a + (o.progress || 0), 0) / okrs.length)
    : 0;

  const healthColor = healthPct >= 70 ? '#16a34a' : healthPct >= 40 ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Resumen actual */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'OKRs Activos', value: okrs.length, icon: '🎯', color: 'var(--primary)' },
          { label: 'KPIs Monitoreados', value: kpis.length, icon: '📊', color: '#8b5cf6' },
          { label: 'Avance Global', value: healthPct + '%', icon: '📈', color: healthColor },
        ].map(m => (
          <div key={m.label} style={{ padding: '16px', borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Selector de horizonte */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
          Horizonte de Predicción
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['30', '60', '90'].map(d => (
            <button key={d} onClick={() => setHorizon(d)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.18s',
                background: horizon === d ? 'var(--primary)' : 'var(--bg2)',
                color: horizon === d ? 'white' : 'var(--text)',
                border: '1.5px solid ' + (horizon === d ? 'var(--primary)' : 'var(--border)'),
              }}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Botón predicción */}
      <button onClick={runPrediction} disabled={loading}
        className="sp-btn sp-btn-primary"
        style={{ padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
        {loading ? '🔮 Calculando predicción IA...' : '🔮 Generar Predicción con IA'}
      </button>

      {/* Resultado */}
      {result && (
        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🔮 Predicción a {horizon} días — Xtratia AI
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(result); notificationService.success('Copiado.'); }}
            style={{ marginTop: 12, padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)' }}>
            📋 Copiar
          </button>
        </div>
      )}

      {/* Estado vacío */}
      {!result && !loading && okrs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg2)', borderRadius: 14, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔮</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Sin datos para predecir</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Crea al menos un OKR o KPI para activar el motor predictivo.</div>
        </div>
      )}
    </div>
  );
}
