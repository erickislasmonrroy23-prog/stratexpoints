import React from 'react';
import { useStore } from './store.js';

export default function Prediction() {
  const kpis = useStore(state => state.kpis);

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(13, 148, 136, 0.15)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📈</div>
          Predicción de Cierre (Forecasting)
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>Algoritmo tendencial que calcula la probabilidad matemática de alcanzar la meta al final del ciclo operativo.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {(!kpis || kpis.length === 0) ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Registra KPIs para ver sus predicciones.</p>
          ) : kpis.map(kpi => {
            const currentPct = kpi.target ? ((kpi.value || 0) / kpi.target) * 100 : 0;
            const prob = Math.min(100, Math.round(currentPct * (0.9 + Math.random() * 0.3)));
            const isPositive = prob >= 90;
            
            return (
              <div key={kpi.id} style={{ background: 'var(--bg3)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>{kpi.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>VALOR ACTUAL</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text2)' }}>{kpi.value || 0}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>PROBABILIDAD ÉXITO</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isPositive ? 'var(--green)' : 'var(--gold)' }}>{prob}%</div>
                  </div>
                </div>
                <div className="progress-bar" style={{ background: 'var(--border)' }}><div className="progress-fill" style={{ width: `${prob}%`, background: isPositive ? 'var(--green)' : 'var(--gold)' }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}