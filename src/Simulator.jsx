import React, { useState } from 'react';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function Simulator() {
  const [efforts, setEfforts] = useState({});
  const handleSlider = (id, val) => setEfforts({ ...efforts, [id]: val });
  const initiatives = useStore(state => state.initiatives);

  const totalEffort = Object.values(efforts).reduce((a, b) => a + b, 0) || 1;
  const impact = (totalEffort * 0.18).toFixed(1);

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎮</div>
          Simulador Estratégico (What-If)
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>Ajusta el nivel de esfuerzo de tus iniciativas para simular el impacto proyectado en los resultados de negocio.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(!initiatives || initiatives.length === 0) ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Crea iniciativas para simular escenarios.</p>
            ) : initiatives.map(ini => {
              const val = efforts[ini.id] !== undefined ? efforts[ini.id] : (ini.progress || 0);
              return (
                <div key={ini.id} style={{ background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{ini.title}</span><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Esfuerzo: {val}%</span></div>
                  <input type="range" min="0" max="100" value={val} onChange={e => handleSlider(ini.id, parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </div>
              );
            })}
          </div>
          
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ background: 'var(--bg3)', padding: 24, borderRadius: 12, border: '1px solid var(--primary)' }}>
              <h4 style={{ marginBottom: 20, fontSize: 14 }}>Impacto Proyectado</h4>
              <div style={{ marginBottom: 20 }}><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Crecimiento estimado</div><div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)' }}>+{impact}%</div></div>
              <div><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Nivel de Riesgo</div><div style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)' }}>{Math.max(5, 80 - (totalEffort * 0.15)).toFixed(1)}%</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}