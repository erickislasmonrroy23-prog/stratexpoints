import React, { useState, useEffect } from 'react';
import { groqService, objectivesService, okrService, kpiService, initiativeService, notificationService } from './services.js';
import { useStore } from './store.js';
import { shallow } from 'zustand/shallow';
export default function StrategicEngine() {
  const [running, setRunning] = useState(true);
  const [baseStrategy, setBaseStrategy] = useState({ mission: '', vision: '', values: '' });
  const [generating, setGenerating] = useState(false);
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const initiatives = useStore(state => state.initiatives);
  const objectives = useStore(state => state.objectives);
  const perspectives = useStore(state => state.perspectives);
  
  const okrHealth = okrs?.length > 0 ? Math.round(okrs.reduce((acc, o) => acc + (o.progress || 0), 0) / okrs.length) : 0;
  const kpiHealth = kpis?.length > 0 ? Math.round(kpis.reduce((acc, k) => acc + Math.min(100, ((k.value || 0) / (k.target || 1)) * 100), 0) / kpis.length) : 0;
  const initHealth = initiatives?.length > 0 ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length) : 0;
  const overallHealth = Math.round((okrHealth + kpiHealth + initHealth) / 3) || 0;

  // Cálculos de Auditoría Real
  const okrsTotal = okrs?.length || 0;
  const okrsOnTrack = okrs?.filter(o => o.status === 'on_track' || o.status === 'completed').length || 0;
  const kpisMissing = kpis?.filter(k => !k.target || k.target === 0).length || 0;
  const initiativesRisk = initiatives?.filter(i => i.status === 'at_risk').length || 0;
  
  const totalNodes = okrsTotal + (kpis?.length || 0) + (initiatives?.length || 0);
  const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleGenerateBase = async () => {
    setGenerating(true);
    const prompt = `Actúa como un Consultor Estratégico de élite (estilo McKinsey/Gartner). Basado en la Misión: "${baseStrategy.mission}", Visión: "${baseStrategy.vision}" y Valores: "${baseStrategy.values}", diseña una estrategia corporativa de alto rendimiento bajo el marco metodológico estricto del Balanced Scorecard.

    REGLAS DE ESTRUCTURACIÓN JERÁRQUICA OBLIGATORIAS:
    Nivel 1: Perspectiva Financiera (perspective_id: 1). Crea objetivos divididos claramente en "Enfoque al Cliente" (retención, satisfacción), "Productividad y Rentabilidad" (costos, eficiencia) y "Expansión" (nuevos mercados, ingresos).
    Nivel 2: Perspectiva del Cliente (perspective_id: 2). Propuestas de valor basadas en: Atributos del servicio (precio/calidad), Relaciones, o Imagen de Marca.
    Nivel 3: Perspectiva de Procesos Internos (perspective_id: 3). Bloques operativos: Admón. de operaciones, Admón. del cliente, Innovación, o Regulación/Sociedad.
    Nivel 4: Perspectiva de Aprendizaje y Crecimiento (perspective_id: 4). Base estructural: Capital Humano, Capital de Información, e Infraestructura (Cultura/Liderazgo).

    ESTRUCTURA JSON REQUERIDA EXACTA: 
    {"objectives": [{"name": "Texto del Objetivo de alto nivel", "perspective_id": 1}], "okrs": [{"objective": "OKR táctico derivado", "department": "Área"}], "kpis": [{"name": "KPI numérico de impacto", "target": 100}], "initiatives": [{"title": "Proyecto clave operativo"}]}
    
    IMPORTANTE: Devuelve SOLO el JSON válido, sin texto decorativo, Markdown ni explicaciones.`;
    
    try {
      const res = await groqService.ask([{ role: 'user', content: prompt }], true);
      const parsed = JSON.parse(res);
      let count = 0;

      // Inyectar en BD de forma paralela para mayor velocidad
      const promises = [];
      
      const newObjectivesPayloads = [];
      const tempObjectives = [...(objectives || [])]; // Start with existing objectives

      if (parsed.objectives) {
        for (const o of parsed.objectives) {
          const perspectiveId = o.perspective_id || 1; // Default to Financial
          const perspective = (perspectives || []).find(p => p.id === perspectiveId) || { name: 'AI' };
          const prefix = perspective.prefix || (perspective.name || 'AI').substring(0, 3).toUpperCase();

          const objectivesInPerspective = tempObjectives.filter(obj => obj.perspective_id === perspectiveId && obj.code?.startsWith(prefix));
          const existingNumbers = objectivesInPerspective
            .map(obj => parseInt(obj.code.substring(prefix.length), 10))
            .filter(n => !isNaN(n));
          const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
          const newCode = `${prefix}${maxNumber + 1}`;
          
          const payload = { name: o.name, perspective_id: perspectiveId, status: 'on_track', code: newCode };
          newObjectivesPayloads.push(payload);
          tempObjectives.push(payload); // Add to temp list for next iteration
        }
      }
      for (const payload of newObjectivesPayloads) {
        promises.push(objectivesService.create(payload));
        count++;
      }
      if (parsed.okrs) {
        for (let o of parsed.okrs) { promises.push(okrService.create({ objective: o.objective || o.obj, department: o.department || 'General', status: 'not_started', progress: 0, period: 'Q1 2024' })); count++; }
      }
      if (parsed.kpis) {
        for (let k of parsed.kpis) { promises.push(kpiService.create({ name: k.name, target: k.target || 100, value: 0, unit: '%' })); count++; }
      }
      if (parsed.initiatives) {
        for (let i of parsed.initiatives) { promises.push(initiativeService.create({ title: i.title, status: 'not_started', progress: 0 })); count++; }
      }

      await Promise.all(promises);

      notificationService.success(`✨ ¡Éxito! Estrategia Base generada por IA.\nSe han guardado ${count} elementos estratégicos nuevos en tu base de datos.`);
    } catch (e) {
      notificationService.error("Error al generar estrategia base: " + e.message);
    }
    setGenerating(false);
  };

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24, marginBottom: 20, borderTop: '4px solid var(--violet)' }}>
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span>🏛️</span> FASE A: Fundación Estratégica (Generador IA)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div><label className="sp-label">Misión (Propósito)</label><textarea className="sp-input" value={baseStrategy.mission} onChange={e => setBaseStrategy({...baseStrategy, mission: e.target.value})} placeholder="¿Por qué existimos?" style={{ minHeight: 60, resize: 'vertical' }}/></div>
          <div><label className="sp-label">Visión (Aspiración)</label><textarea className="sp-input" value={baseStrategy.vision} onChange={e => setBaseStrategy({...baseStrategy, vision: e.target.value})} placeholder="¿A dónde queremos llegar?" style={{ minHeight: 60, resize: 'vertical' }}/></div>
          <div><label className="sp-label">Valores (Cultura)</label><textarea className="sp-input" value={baseStrategy.values} onChange={e => setBaseStrategy({...baseStrategy, values: e.target.value})} placeholder="Ej: Innovación, Integridad..." style={{ minHeight: 60, resize: 'vertical' }}/></div>
        </div>
        <button className="sp-btn" onClick={handleGenerateBase} disabled={generating || !baseStrategy.mission} style={{ background: 'var(--violet)', width: '100%', justifyContent: 'center' }}>{generating ? '✨ Diseñando cascada estratégica (Objetivos, OKRs, KPIs)...' : '✨ Auto-generar Estrategia Completa con IA'}</button>
      </div>

      <div className="sp-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderTop: '4px solid var(--green)', paddingTop: 20 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>⚡ Motor de Ejecución en Tiempo Real</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Procesamiento continuo de alineación estratégica.</p>
          </div>
          <button className="sp-btn" onClick={() => setRunning(!running)} style={{ background: running ? 'var(--red)' : 'var(--green)' }}>
            {running ? 'Detener Motor' : 'Iniciar Motor'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 12, border: `1px solid ${overallHealth > 70 ? 'var(--green)' : 'var(--gold)'}`, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>SALUD DE LA ESTRATEGIA</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: overallHealth > 70 ? 'var(--green)' : overallHealth > 40 ? 'var(--gold)' : 'var(--red)' }}>{overallHealth}%</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Índice compuesto de ejecución</div>
          </div>
          
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>DESGLOSE DE RENDIMIENTO</div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 600 }}><span style={{ color: 'var(--text)' }}>Rendimiento OKRs</span><span style={{ color: 'var(--primary)' }}>{okrHealth}%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${okrHealth}%`, background: 'var(--primary)' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 600 }}><span style={{ color: 'var(--text)' }}>Cumplimiento KPIs</span><span style={{ color: 'var(--teal)' }}>{kpiHealth}%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${kpiHealth}%`, background: 'var(--teal)' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 600 }}><span style={{ color: 'var(--text)' }}>Avance Iniciativas</span><span style={{ color: 'var(--violet)' }}>{initHealth}%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${initHealth}%`, background: 'var(--violet)' }} /></div>
            </div>
          </div>
        </div>

        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Auditoría de Ejecución Estratégica</h4>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Último chequeo: {syncTime}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: kpisMissing > 0 ? 'var(--gold)' : 'var(--green)' }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Integridad de Datos (KPIs)</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{kpisMissing > 0 ? `Se detectaron ${kpisMissing} indicadores sin meta u objetivo definido. Se requiere revisión.` : 'Todos los indicadores cuentan con parámetros de medición válidos.'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: okrsOnTrack < (okrsTotal / 2) ? 'var(--gold)' : 'var(--green)' }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Alineación de Objetivos</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{okrsTotal > 0 ? `${okrsOnTrack} de ${okrsTotal} OKRs se encuentran en curso o completados con éxito.` : 'Aún no hay objetivos trazados en el sistema.'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: initiativesRisk > 0 ? 'var(--red)' : 'var(--green)' }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Riesgo Operativo (Iniciativas)</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{initiativesRisk > 0 ? `${initiativesRisk} iniciativas han sido marcadas en riesgo. Potencial impacto en metas.` : 'No se detectan bloqueos operativos graves en las iniciativas activas.'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Estado del Bus de Datos</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Sistema estable monitorizando un total de {totalNodes} nodos estratégicos.</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}