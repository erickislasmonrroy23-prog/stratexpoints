import React from 'react';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function ExecutivePanel() {
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const initiatives = useStore(state => state.initiatives);
  const avgProgress = okrs?.length > 0 
    ? (okrs.reduce((acc, okr) => acc + (okr.progress || 0), 0) / okrs.length).toFixed(1)
    : 0;

  // Tablero de Semáforos (Clasificación de KPIs)
  const redKpis = kpis.filter(k => k.target && (k.value / k.target) < 0.8);
  const yellowKpis = kpis.filter(k => k.target && (k.value / k.target) >= 0.8 && (k.value / k.target) < 0.95);
  const greenKpis = kpis.filter(k => k.target && (k.value / k.target) >= 0.95);

  // Intervenciones Requeridas
  const criticalInitiatives = (initiatives || []).filter(i => i.status === 'at_risk');
  const totalInterventions = redKpis.length + criticalInitiatives.length;

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32, marginBottom: 24, borderTop: '4px solid var(--text)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 8, letterSpacing: '-0.5px' }}>Executive Summary (CSO Framework)</h3>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Resumen de excepciones y asignación de capital. (Lectura estimada: 2 min)</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Score de Ejecución</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{avgProgress}%</div>
          </div>
        </div>

        <div style={{ background: totalInterventions > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)', border: `1px solid ${totalInterventions > 0 ? 'var(--red)' : 'var(--green)'}`, padding: 20, borderRadius: 16, marginBottom: 32 }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: totalInterventions > 0 ? 'var(--red)' : 'var(--green)', textTransform: 'uppercase', marginBottom: 12 }}>BLUF (Bottom Line Up Front) / Estado de Intervención</h4>
          <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {totalInterventions > 0 
              ? `Existen ${totalInterventions} frentes críticos que requieren decisión directiva inmediata. Tienes ${redKpis.length} métricas destruyendo valor (desviación severa) y ${criticalInitiatives.length} proyectos en riesgo de incumplimiento.` 
              : `La estrategia fluye según lo planeado. Ningún KPI se encuentra por debajo del umbral de riesgo del 80% y los proyectos operativos avanzan sin fricciones.`}
          </p>
        </div>

        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tablero de Semáforos (KPIs)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 16, borderTop: '4px solid var(--red)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}><span>🔴 ZONA DE RIESGO</span><span style={{color:'var(--text)'}}>{redKpis.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {redKpis.length === 0 ? <span style={{fontSize:12, color:'var(--text3)'}}>Sin desviaciones</span> : redKpis.map(k => <div key={k.id} style={{fontSize:13, display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--text)'}}>{k.name}</span><strong style={{color:'var(--red)'}}>{Math.round((k.value/k.target)*100)}%</strong></div>)}
            </div>
          </div>
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 16, borderTop: '4px solid var(--gold)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}><span>🟡 PRECAUCIÓN</span><span style={{color:'var(--text)'}}>{yellowKpis.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {yellowKpis.length === 0 ? <span style={{fontSize:12, color:'var(--text3)'}}>Estable</span> : yellowKpis.map(k => <div key={k.id} style={{fontSize:13, display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--text)'}}>{k.name}</span><strong style={{color:'var(--gold)'}}>{Math.round((k.value/k.target)*100)}%</strong></div>)}
            </div>
          </div>
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 16, borderTop: '4px solid var(--green)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}><span>🟢 ÓPTIMO</span><span style={{color:'var(--text)'}}>{greenKpis.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {greenKpis.length === 0 ? <span style={{fontSize:12, color:'var(--text3)'}}>Sin datos</span> : greenKpis.map(k => <div key={k.id} style={{fontSize:13, display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--text)'}}>{k.name}</span><strong style={{color:'var(--green)'}}>{Math.round((k.value/k.target)*100)}%</strong></div>)}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><span>🧠</span> 3 Preguntas de Validación Estratégica (Para el CEO)</h4>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>
            <li><strong>Asignación de Capital:</strong> Viendo los indicadores en la Zona de Riesgo, ¿qué iniciativa o producto debemos "matar" hoy para reasignar presupuesto al área que sí genera retorno?</li>
            <li><strong>Calidad de Ejecución:</strong> ¿Nuestro crecimiento actual en OKRs ({avgProgress}%) está impactando positivamente los KPIs financieros, o solo estamos midiendo "métricas de vanidad"?</li>
            <li><strong>Responsabilidad (Accountability):</strong> De las desviaciones rojas presentes, ¿qué porcentaje es por factores incontrolables y qué porcentaje es estrictamente mala ejecución del equipo?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}