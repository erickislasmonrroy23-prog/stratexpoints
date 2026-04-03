import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStore } from './store.js';
import { shallow } from 'zustand/shallow';
export default function Dashboard({ onNavigate }) {
  const okrs = useStore(state => state.okrs);
  const initiatives = useStore(state => state.initiatives);
  const okrData = (okrs || []).map(okr => ({
    name: okr.objective.length > 20 ? okr.objective.substring(0, 20) + '...' : okr.objective,
    progreso: okr.progress || 0
  }));

  const initCounts = {
    completadas: initiatives?.filter(i => i.status === 'completed').length || 0,
    en_progreso: initiatives?.filter(i => i.status === 'in_progress' || i.status === 'at_risk').length || 0,
    sin_iniciar: initiatives?.filter(i => i.status === 'not_started').length || 0,
  };

  const pieData = [
    { name: 'Completadas', value: initCounts.completadas, color: '#10b981' },
    { name: 'En Progreso / Riesgo', value: initCounts.en_progreso, color: '#0d9488' },
    { name: 'Sin Iniciar', value: initCounts.sin_iniciar, color: '#64748b' }
  ].filter(d => d.value > 0);

  if (pieData.length === 0) pieData.push({ name: 'Sin Iniciativas', value: 1, color: '#334155' });

  // Lógica IA de detección de estancamiento
  const stagnantOkrs = (okrs || []).filter(o => o.progress < 15 && o.status === 'on_track');
  const criticalOkrs = (okrs || []).filter(o => o.status === 'at_risk');
  const hasAlerts = stagnantOkrs.length > 0 || criticalOkrs.length > 0;

  const handleNotify = (okr) => {
    const subject = encodeURIComponent(`Revisión Estratégica Requerida: OKR Estancado - ${okr.objective}`);
    const body = encodeURIComponent(`Hola ${okr.owner || 'equipo'},\n\nEl sistema Xtratia ha detectado que el siguiente objetivo estratégico se encuentra estancado.\n\n🎯 OKR: ${okr.objective}\n📊 Progreso actual: ${okr.progress}%\n📁 Área: ${okr.department || 'No especificada'}\n\nActualmente el estado es "En curso", pero el avance es muy bajo. Por favor, actualiza el estatus en la plataforma o indícanos si existe algún bloqueo operativo que requiera apoyo directivo.\n\nSaludos cordiales,\nOficina de Estrategia`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fade-up">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="sp-card sp-card-hover" style={{ padding: 24, cursor: 'pointer' }} onClick={() => onNavigate('okrs')}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎯</div>
            Avance de Objetivos (OKRs)
          </h3>
          {okrData.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No hay OKRs registrados aún.</p>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={okrData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--bg3)' }} contentStyle={{ background: 'var(--bg2)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                  <Bar dataKey="progreso" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="sp-card sp-card-hover" style={{ padding: 24, cursor: 'pointer' }} onClick={() => onNavigate('iniciativas')}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.15)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚀</div>
            Distribución de Iniciativas
          </h3>
          <div style={{ height: 200, marginBottom: 20, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg2)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{initCounts.completadas + initCounts.en_progreso + initCounts.sin_iniciar}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>Totales</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /><span style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>Completadas</span></div><strong style={{ color: 'var(--green)' }}>{initCounts.completadas}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0d9488' }} /><span style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>En Progreso / Riesgo</span></div><strong style={{ color: 'var(--teal)' }}>{initCounts.en_progreso}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }} /><span style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>Sin Iniciar</span></div><strong style={{ color: 'var(--text3)' }}>{initCounts.sin_iniciar}</strong>
            </div>
          </div>
        </div>

        <div className="sp-card" style={{ gridColumn: '1 / -1', padding: 24, borderLeft: hasAlerts ? '4px solid var(--gold)' : '4px solid var(--green)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: hasAlerts ? 'rgba(245, 158, 11, 0.15)' : 'var(--green-light)', color: hasAlerts ? 'var(--gold)' : 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {hasAlerts ? '⚠️' : '✅'}
            </div>
            {hasAlerts ? 'Alertas Automáticas de Estancamiento' : 'Ejecución Saludable'}
          </h3>
          
          {!hasAlerts ? (
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>No se detectan OKRs estancados o en riesgo severo actualmente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stagnantOkrs.map(okr => (
                <div key={`stag-${okr.id}`} style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Alerta de Estancamiento: {okr.objective}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Este objetivo está marcado "En Curso" pero tiene solo un <strong style={{ color: 'var(--gold)' }}>{okr.progress}%</strong> de avance. Podría llevar semanas sin actualizarse.</div>
                  </div>
                  <button onClick={() => handleNotify(okr)} className="sp-btn" style={{ background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 11, padding: '6px 12px', flexShrink: 0 }}>
                    ✉️ Notificar Dueño
                  </button>
                </div>
              ))}
              {criticalOkrs.map(okr => (
                <div key={`risk-${okr.id}`} style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Riesgo Crítico: {okr.objective}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Reportado oficialmente en riesgo. Requiere intervención directiva para destrabar bloqueos.</div>
                  </div>
                  <button onClick={() => handleNotify(okr)} className="sp-btn" style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '6px 12px', flexShrink: 0, border: 'none' }}>
                    ✉️ Exigir Reporte
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}