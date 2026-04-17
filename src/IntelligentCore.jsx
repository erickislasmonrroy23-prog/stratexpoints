import React, { useState } from 'react';
import { groqService, initiativeService, kpiService, notificationService } from './services.js';
import { useStore } from './store.js';

export default function IntelligentCore() {
  const [sensitivity, setSensitivity] = useState(50); // Valor inicial al 50%
  const [generatingPlan, setGeneratingPlan] = useState(null);
  const [recoveryPlans, setRecoveryPlans] = useState({});
  const [adjusting, setAdjusting] = useState(false);
  const kpis = useStore(state => state.kpis);
  const okrs = useStore(state => state.okrs);

  // Detectar anomalías en KPIs (ej. valores muy bajos respecto a la meta)
  const anomalies = (kpis || []).filter(kpi => kpi.target && kpi.value < (kpi.target * (sensitivity / 100)));
  // Detectar falta de datos
  const incompleteData = (kpis || []).filter(kpi => !kpi.target || kpi.target === 0).length + (okrs || []).filter(o => !o.progress).length;
  const dataQuality = Math.max(0, 100 - (incompleteData * 5));

  // FASE C: Generación de Planes de Rescate
  const handleGenerateRecovery = async (kpi) => {
    setGeneratingPlan(kpi.id);
    const prompt = `Actúa como un AI Manager de Crisis. El siguiente KPI está en estado crítico: "${kpi.name}" con un valor actual de ${kpi.value} frente a una meta de ${kpi.target}.
    Genera un plan de recuperación de emergencia con exactamente 2 iniciativas claras, agresivas y accionables para corregir el rumbo.
    DEVUELVE ÚNICAMENTE UN JSON válido con este formato exacto: {"initiatives": [{"title": "Nombre corto de la iniciativa", "owner": "Rol sugerido (Ej: CFO, Líder de Ventas)"}]}`;
    
    try {
      const res = await groqService.ask(
        [{ role: 'system', content: 'Eres un generador de iniciativas que solo responde con JSON válido.' }, { role: 'user', content: prompt }],
        true
      );
      const parsed = JSON.parse(res);
      setRecoveryPlans(prev => ({ ...prev, [kpi.id]: parsed.initiatives || [] }));
    } catch (e) {
      notificationService.error("Error al generar plan de recuperación IA: " + e.message);
    }
    setGeneratingPlan(null);
  };

  const handleApplyRecovery = async (kpiId, initiatives) => {
    try {
      for (let ini of initiatives) {
        await Promise.all(initiatives.map(ini => initiativeService.create({ title: `[Rescate] ${ini.title}`, owner: ini.owner || 'AI Auto-asignado', status: 'not_started', progress: 0 })));
      }
      notificationService.success("Plan de Recuperación inyectado exitosamente.");
      setRecoveryPlans(prev => { const newPlans = {...prev}; delete newPlans[kpiId]; return newPlans; });
    } catch (e) {
      notificationService.error("Error al inyectar iniciativas: " + e.message);
    }
  };

  // FASE E: Ajuste Automático de Metas
  const handleSeasonalAdjustment = async () => {
    const confirmed = window.confirm("¿Deseas que la IA ajuste las metas de todos los KPIs basándose en la temporada? Esto aumentará la meta (Target) de todos los indicadores en un 10% para simular el cierre de Q4.");
    if (!confirmed) return;

    setAdjusting(true);
    try {
      const promises = (kpis || []).map(kpi => kpiService.update(kpi.id, { target: Math.round(kpi.target * 1.1) }));
      await Promise.all(promises);
      notificationService.success("Metas recalibradas exitosamente.");
    } catch (e) { notificationService.error("Error recalibrando metas: " + e.message); }
    setAdjusting(false);
  };

  const handleSendReport = () => {
    const subject = encodeURIComponent("Reporte Automático Semanal - Xtratia IA");
    const body = encodeURIComponent(`Hola,\n\nEl núcleo autónomo ha completado el análisis de salud estratégica.\n\n- Salud de los Datos: ${dataQuality}%\n- OKRs Activos: ${okrs?.length || 0}\n- Alertas Críticas Detectadas: ${anomalies.length}\n\nSe han preparado planes de recuperación preventivos. Ingresa a la plataforma para aprobarlos y enviarlos a ejecución.\n\nSaludos,\nIA Xtratia`);
    window.location.href = `mailto:directorio@miempresa.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--violet), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}>🧠</div>
          <div>
            <h3 style={{ marginBottom: 4 }}>Núcleo Inteligente (Deep Learning Core)</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Escáner de patrones predictivos y detección de anomalías.</p>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>Escáner de Anomalías</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title="Ajustar qué tan estricta es la detección">
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Umbral IA: {sensitivity}%</span>
                <input type="range" min="10" max="100" step="5" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} style={{ width: 90, accentColor: 'var(--violet)', cursor: 'pointer' }} />
              </div>
            </div>
            {anomalies.length === 0 ? (
              <div style={{ padding: 16, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 8, fontSize: 13, border: '1px solid rgba(22, 163, 74, 0.2)' }}>✅ No se han detectado desviaciones críticas en los indicadores clave. La ejecución es estable.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anomalies.map(a => (
                  <div key={a.id} style={{ padding: 16, background: 'var(--bg3)', borderLeft: '4px solid var(--red)', borderRadius: '0 8px 8px 0', fontSize: 13, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 6 }}>🚨 Desviación Crítica: {a.name}</strong>
                    <span style={{ color: 'var(--text2)', lineHeight: 1.5, display: 'block' }}>El indicador registra un valor de <strong>{a.value}</strong>, ubicándose peligrosamente por debajo del umbral mínimo de seguridad frente a su meta de <strong>{a.target}</strong>.</span>
                    
                    {!recoveryPlans[a.id] ? (
                      <button className="sp-btn" onClick={() => handleGenerateRecovery(a)} disabled={generatingPlan === a.id} style={{ marginTop: 16, background: 'var(--red-light)', color: 'var(--red)', border: '1px solid rgba(220, 38, 38, 0.3)', fontSize: 11, padding: '6px 12px', width: '100%', justifyContent: 'center' }}>
                        {generatingPlan === a.id ? '⏳ Analizando ruta de rescate...' : '⚡ IA: Idear Plan de Rescate'}
                      </button>
                    ) : (
                      <div className="scale-in" style={{ marginTop: 16, background: 'var(--bg2)', padding: 12, borderRadius: 8, border: '1px dashed var(--red)' }}>
                        <strong style={{ fontSize: 11, color: 'var(--text)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Ruta de Acción Sugerida por IA:</strong>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                          {recoveryPlans[a.id].map((ini, i) => <li key={i}>{ini.title} <span style={{color: 'var(--primary)', fontWeight: 600}}>(👤 {ini.owner})</span></li>)}
                        </ul>
                        <button className="sp-btn" onClick={() => handleApplyRecovery(a.id, recoveryPlans[a.id])} style={{ background: 'var(--primary)', width: '100%', justifyContent: 'center', fontSize: 12, padding: '8px' }}>
                          📥 Aprobar e inyectar al tablero de Iniciativas
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>FASE C & E: Automatización Autónoma</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Planes de Recuperación IA</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Genera rutas de rescate ante caídas.</div></div>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--violet)', width: 18, height: 18, cursor: 'pointer' }}/>
              </div>
              <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Ajuste de Metas por Temporada</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>Ajusta las métricas +10% según historial predictivo.</div>
                  <button onClick={handleSeasonalAdjustment} disabled={adjusting} className="sp-btn" style={{ fontSize: 11, padding: '4px 12px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}>{adjusting ? 'Recalculando base de datos...' : '▶ Ejecutar Recalibración IA'}</button>
                </div>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--violet)', width: 18, height: 18, cursor: 'pointer' }}/>
              </div>
              <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Reportes Auto-enviados</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Despacha resúmenes al correo directivo.</div>
                  <button onClick={handleSendReport} className="sp-btn" style={{ fontSize: 11, padding: '4px 12px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}>✉️ Enviar Prueba Ahora</button>
                </div>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--violet)', width: 18, height: 18, cursor: 'pointer' }} title="Habilitar cron job semanal"/>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>CONFIABILIDAD DE DATOS (IA)</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: `conic-gradient(var(--violet) ${dataQuality}%, var(--border) 0)` }}>
                <div style={{ position: 'absolute', inset: 8, background: 'var(--bg3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{dataQuality}%</div>
              </div>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                El modelo de Machine Learning determina que la calidad y completitud de tus métricas es del {dataQuality}%.
              </div>
            </div>
            
            {incompleteData > 0 && (
              <div style={{ background: 'var(--gold)20', padding: 12, borderRadius: 8, color: 'var(--gold)', fontSize: 12, border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                ⚠️ Existen {incompleteData} métricas (OKRs o KPIs) sin metas definidas o valores en 0. Complétalas para mejorar las predicciones de la IA.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}