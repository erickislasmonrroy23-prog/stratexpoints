import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function StrategicBus() {
  const [logs, setLogs] = useState([
    { id: 1, type: 'SYNC', msg: 'Conectando al Bus de Eventos de Supabase...', color: 'var(--teal)' }
  ]);
  const objectives = useStore(state => state.objectives);
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const initiatives = useStore(state => state.initiatives);
  const totalNodes = (objectives?.length || 0) + (okrs?.length || 0) + (kpis?.length || 0) + (initiatives?.length || 0);
  const unlinkedInitiatives = (initiatives || []).filter(i => i.status === 'not_started' && i.progress === 0);

  useEffect(() => {
    setLogs(prev => [{ id: Date.now(), type: 'ONLINE', msg: 'Sistema PUB/SUB activo. Escuchando cambios en la red en tiempo real...', color: 'var(--green)' }, ...prev]);
    
    // Suscripción Real a Supabase (WebSockets)
    const channel = supabase.channel('strategic-bus')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis' }, (payload) => {
        const action = payload.eventType === 'UPDATE' ? 'actualizado' : 'creado';
        setLogs(prev => [{ id: Date.now(), type: 'KPI_SYNC', msg: `Indicador ${action}. Recalculando Score Global del mapa...`, color: 'var(--teal)' }, ...prev].slice(0, 6));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'okrs' }, (payload) => {
         const isRisk = payload.new?.status === 'at_risk';
         setLogs(prev => [{ id: Date.now(), type: isRisk ? 'ALERTA' : 'EVENTO', msg: `Cambio en OKR detectado. Actualizando tableros dependientes...`, color: isRisk ? 'var(--red)' : 'var(--primary)' }, ...prev].slice(0, 6));
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); }
  }, []);

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 10 }}>🔗 Bus de Comunicación Estratégico</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Topología de la red de datos. Verifica la alineación en cascada de la estrategia organizacional.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📡</div>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Nodos Activos</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Puntos de datos en la red</div></div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{totalNodes}</div>
          </div>

          <div style={{ padding: 20, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: unlinkedInitiatives.length > 0 ? 'var(--red-light)' : 'var(--green-light)', color: unlinkedInitiatives.length > 0 ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Nodos Huérfanos</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Iniciativas sin ejecución</div></div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: unlinkedInitiatives.length > 0 ? 'var(--red)' : 'var(--green)' }}>{unlinkedInitiatives.length}</div>
          </div>
        </div>

        <h4 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text2)' }}>Flujo de Alineación Estructural</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', overflowX: 'auto', gap: 16 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: 24, marginBottom: 8 }}>🗺️</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{objectives?.length || 0} Objetivos</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Estratégicos</div></div>
          <div style={{ flex: 1, height: 2, background: 'var(--border)', minWidth: 40, position: 'relative' }}><div style={{ position: 'absolute', right: 0, top: -4, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid var(--border)' }}/></div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{okrs?.length || 0} OKRs</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Resultados Clave</div></div>
          <div style={{ flex: 1, height: 2, background: 'var(--border)', minWidth: 40, position: 'relative' }}><div style={{ position: 'absolute', right: 0, top: -4, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid var(--border)' }}/></div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: 24, marginBottom: 8 }}>📊</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{kpis?.length || 0} KPIs</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Métricas</div></div>
          <div style={{ flex: 1, height: 2, background: 'var(--border)', minWidth: 40, position: 'relative' }}><div style={{ position: 'absolute', right: 0, top: -4, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid var(--border)' }}/></div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{initiatives?.length || 0} Proyectos</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Ejecución</div></div>
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>FASE B: Log de Eventos en Tiempo Real</h4>
            <span className="sp-badge" style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green)' }}>● WebSockets Live</span>
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map(log => (
              <div key={log.id} className="fade-up" style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8 }}>
                <span style={{ color: log.color, fontWeight: 700 }}>[{log.type}]</span> <span>{log.msg}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic', borderTop: '1px dashed var(--border)', paddingTop: 8 }}>*Escuchando mutaciones de BD en la red neuronal de {totalNodes} nodos vía Postgres Changes.</div>
          </div>
        </div>

        {unlinkedInitiatives.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, color: 'var(--red)', marginBottom: 12 }}>Atención Requerida (Nodos Huérfanos)</h4>
            <div style={{ background: 'var(--red-light)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 12 }}>Las siguientes iniciativas están estancadas sin progreso y sin iniciar. Asegúrate de que aporten valor a la estrategia:</p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--red)' }}>
                {unlinkedInitiatives.map(u => <li key={u.id} style={{ marginBottom: 4 }}><strong>{u.title}</strong></li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}