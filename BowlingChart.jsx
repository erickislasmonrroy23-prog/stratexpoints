import React from 'react';
import { useStore } from './store.js';

export default function BowlingChart() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const kpis = useStore(state => state.kpis);
  
  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24, overflowX: 'auto' }}>
        <h3 style={{ marginBottom: 10 }}>Bowling Chart (Desempeño Visual)</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Tablero de control para detectar desviaciones a simple vista (Rojo = Incumplimiento, Verde = Meta lograda).</p>
        
        {(!kpis || kpis.length === 0) ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No hay KPIs suficientes para el Bowling Chart.</p>
        ) : (
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>INDICADOR</th>
                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>META</th>
                {months.map(m => <th key={m} style={{ padding: '12px', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {kpis.map(kpi => (
                <tr key={kpi.id}>
                  <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{kpi.name}</td>
                  <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 800, color: 'var(--text2)', textAlign: 'center' }}>{kpi.target}</td>
                  {months.map((m, i) => {
                    const simulatedValue = kpi.target * (0.8 + Math.random() * 0.4);
                    const isSuccess = simulatedValue >= kpi.target;
                    return (
                      <td key={i} style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}><div style={{ background: isSuccess ? 'var(--green)' : 'var(--red)', color: '#fff', borderRadius: 4, padding: '6px 0', fontSize: 11, fontWeight: 700, width: 45, margin: '0 auto' }}>{Math.round(simulatedValue)}</div></td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}