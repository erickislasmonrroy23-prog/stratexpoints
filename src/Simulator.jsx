import React, { useState } from 'react';
import { claudeService, notificationService } from './services.js';
import { useStore } from './store.js';

const SCENARIOS = [
  { id: 'growth',    label: 'Crecimiento Acelerado', icon: '📈', desc: 'Simula impacto de doblar la tasa de crecimiento de OKRs clave' },
  { id: 'risk',      label: 'Escenario de Crisis',   icon: '⚠️',  desc: 'Modelar impacto si los KPIs críticos caen un 30%' },
  { id: 'resource',  label: 'Restricción de Recursos', icon: '💰', desc: '¿Qué pasa si el presupuesto de iniciativas se reduce 40%?' },
  { id: 'custom',    label: 'Escenario Personalizado', icon: '🔬', desc: 'Define tu propio escenario estratégico' },
];

export default function Simulator() {
  const okrs        = useStore(s => s.okrs        || []);
  const kpis        = useStore(s => s.kpis        || []);
  const initiatives = useStore(s => s.initiatives || []);
  const org         = useStore(s => s.currentOrganization);

  const [scenario, setScenario]     = useState('growth');
  const [customText, setCustomText] = useState('');
  const [variables, setVariables]   = useState({ growth: 50, risk: -30, resource: -40 });
  const [result, setResult]         = useState('');
  const [loading, setLoading]       = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setResult('');
    try {
      const scenarioLabels = { growth: 'Crecimiento Acelerado', risk: 'Escenario de Crisis', resource: 'Restricción de Recursos', custom: 'Personalizado' };
      const scenarioContext = scenario === 'custom'
        ? customText
        : scenario === 'growth'
          ? 'Los OKRs prioritarios aumentan su avance un ' + variables.growth + '% adicional'
          : scenario === 'risk'
            ? 'Los KPIs críticos caen un ' + Math.abs(variables.risk) + '%'
            : 'El presupuesto de iniciativas se reduce un ' + Math.abs(variables.resource) + '%';

      const ctx = {
        org: org?.name,
        okrsCount: okrs.length,
        avgProgress: okrs.length > 0 ? Math.round(okrs.reduce((a,o) => a+(o.progress||0),0)/okrs.length) : 0,
        kpisCount: kpis.length,
        kpisAtRisk: kpis.filter(k => k.target>0 && (k.value/k.target)*100 < 70).length,
        initiativesCount: initiatives.length,
      };

      const analysis = await claudeService.chat([
        {
          role: 'system',
          content: 'Eres un consultor de estrategia y simulación organizacional. Analiza el escenario presentado y entrega: 1) Impacto proyectado en los próximos 90 días (cuantificado), 2) Variables más sensibles al cambio, 3) Acciones de mitigación o aceleración recomendadas, 4) Probabilidad de éxito con y sin intervención (%). Sé específico y cuantitativo. Responde en español, máximo 300 palabras, estructurado.'
        },
        {
          role: 'user',
          content: 'Organización: ' + (ctx.org||'') + '\nEscenario: ' + scenarioLabels[scenario] + '\nDescripción: ' + scenarioContext + '\nDatos actuales: ' + JSON.stringify(ctx)
        }
      ]);

      setResult(analysis);
    } catch (e) {
      notificationService.error('Error en simulación: ' + e.message);
      setResult('⚠️ Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const currentScenario = SCENARIOS.find(s => s.id === scenario);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Selector de escenario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => { setScenario(s.id); setResult(''); }}
            style={{
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: scenario === s.id ? 'var(--primary)' : 'var(--bg2)',
              color: scenario === s.id ? 'white' : 'var(--text)',
              border: '1.5px solid ' + (scenario === s.id ? 'var(--primary)' : 'var(--border)'),
              transition: 'all 0.18s',
            }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Variables del escenario */}
      {scenario !== 'custom' && (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            {scenario === 'growth' ? 'Incremento de Avance' : scenario === 'risk' ? 'Caída de KPIs' : 'Reducción de Presupuesto'}: {' '}
            <span style={{ color: 'var(--primary)' }}>
              {scenario === 'growth' ? '+' : ''}{variables[scenario]}%
            </span>
          </label>
          <input type="range" min={scenario === 'growth' ? 10 : -80} max={scenario === 'growth' ? 100 : -5}
            value={variables[scenario]}
            onChange={e => setVariables(prev => ({...prev, [scenario]: parseInt(e.target.value)}))}
            style={{ width: '100%', accentColor: 'var(--primary)' }} />
        </div>
      )}

      {scenario === 'custom' && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Describe tu escenario</label>
          <textarea className="sp-input" placeholder="Ej: Si lanzamos el nuevo producto en Q3 y obtenemos 500 clientes nuevos, ¿cómo afecta a nuestros OKRs?"
            value={customText} onChange={e => setCustomText(e.target.value)}
            rows={3} style={{ padding: '12px 14px', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
      )}

      {/* Contexto actual */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          ['🎯', okrs.length + ' OKRs activos'],
          ['📊', kpis.filter(k => k.target>0 && (k.value/k.target)*100<70).length + ' KPIs en riesgo'],
          ['🚀', initiatives.length + ' iniciativas'],
        ].map(([icon, label]) => (
          <span key={label} style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{icon}</span><span>{label}</span>
          </span>
        ))}
      </div>

      {/* Ejecutar */}
      <button onClick={runSimulation} disabled={loading || (scenario === 'custom' && !customText.trim())}
        className="sp-btn sp-btn-primary"
        style={{ padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
        {loading ? '🔬 Simulando con Groq IA...' : currentScenario?.icon + ' Ejecutar Simulación: ' + currentScenario?.label}
      </button>

      {/* Resultado */}
      {result && (
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              🔬 Resultado de Simulación — {currentScenario?.label}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(result); notificationService.success('Copiado.'); }}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)' }}>
              📋 Copiar
            </button>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (okrs.length === 0 && kpis.length === 0) && (
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg2)', borderRadius: 14, border: '2px dashed var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Sin datos para simular</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Crea OKRs y KPIs primero para alimentar el simulador con datos reales.</div>
        </div>
      )}
    </div>
  );
}
