import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useStore } from './store.js';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#dc2626', '#22c55e', '#8b5cf6'];

function StatCard({ icon, label, value, sub, color = 'var(--primary)', trend }) {
  return (
    <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const okrs        = useStore(s => s.okrs        || []);
  const kpis        = useStore(s => s.kpis        || []);
  const initiatives = useStore(s => s.initiatives || []);
  const org         = useStore(s => s.currentOrganization);

  // ── Métricas calculadas ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const avgOKR = okrs.length > 0
      ? Math.round(okrs.reduce((a, o) => a + (o.progress || 0), 0) / okrs.length)
      : 0;
    const okrsOnTrack  = okrs.filter(o => (o.progress || 0) >= 70).length;
    const okrsAtRisk   = okrs.filter(o => (o.progress || 0) < 50).length;
    const kpisOnTarget = kpis.filter(k => k.target > 0 && (k.value / k.target) * 100 >= 80).length;
    const kpisAtRisk   = kpis.filter(k => k.target > 0 && (k.value / k.target) * 100 < 60).length;
    const initsCompleted = initiatives.filter(i => i.phase === 'completed' || i.status === 'completed').length;
    const initsActive    = initiatives.filter(i => i.phase === 'in_progress' || i.status === 'active').length;
    return { avgOKR, okrsOnTrack, okrsAtRisk, kpisOnTarget, kpisAtRisk, initsCompleted, initsActive };
  }, [okrs, kpis, initiatives]);

  // ── Datos para gráficas ──────────────────────────────────────────────────
  const okrStatusData = useMemo(() => [
    { name: 'En Curso', value: okrs.filter(o => (o.progress||0) >= 70).length, color: '#16a34a' },
    { name: 'En Riesgo', value: okrs.filter(o => (o.progress||0) >= 40 && (o.progress||0) < 70).length, color: '#f59e0b' },
    { name: 'Crítico', value: okrs.filter(o => (o.progress||0) < 40).length, color: '#dc2626' },
  ].filter(d => d.value > 0), [okrs]);

  const kpiPerformanceData = useMemo(() =>
    kpis.slice(0, 8).map(k => ({
      name: (k.name || 'KPI').substring(0, 15),
      actual: k.value || 0,
      meta: k.target || 100,
      pct: k.target > 0 ? Math.round((k.value / k.target) * 100) : 0,
    })), [kpis]);

  const okrProgressData = useMemo(() =>
    okrs.slice(0, 8).map(o => ({
      name: (o.title || o.objective || 'OKR').substring(0, 18),
      progreso: o.progress || 0,
    })), [okrs]);

  const initiativesByPhase = useMemo(() => {
    const phases = ['planning', 'in_progress', 'review', 'completed'];
    return phases.map(p => ({
      fase: p === 'planning' ? 'Planeación' : p === 'in_progress' ? 'En Progreso' : p === 'review' ? 'Revisión' : 'Completada',
      cantidad: initiatives.filter(i => i.phase === p || i.status === p).length,
    }));
  }, [initiatives]);

  const hasData = okrs.length > 0 || kpis.length > 0;

  if (!hasData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg2)', borderRadius: 16, border: '2px dashed var(--border)' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Sin datos analíticos aún</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 400, margin: '0 auto' }}>
            Crea OKRs y KPIs en los módulos correspondientes para visualizar las analíticas estratégicas de tu organización.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Título */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          📊 Analítica Estratégica
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          {org?.name} · {okrs.length} OKRs · {kpis.length} KPIs · {initiatives.length} Iniciativas
        </p>
      </div>

      {/* KPIs resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard icon="🎯" label="Avance OKRs" value={metrics.avgOKR + '%'} sub={metrics.okrsOnTrack + ' en curso · ' + metrics.okrsAtRisk + ' críticos'} color={metrics.avgOKR >= 70 ? '#16a34a' : metrics.avgOKR >= 40 ? '#f59e0b' : '#dc2626'} />
        <StatCard icon="📊" label="KPIs en Meta" value={metrics.kpisOnTarget} sub={'de ' + kpis.length + ' · ' + metrics.kpisAtRisk + ' en riesgo'} color="#6366f1" />
        <StatCard icon="🚀" label="Iniciativas" value={initiatives.length} sub={metrics.initsCompleted + ' completadas · ' + metrics.initsActive + ' activas'} color="#14b8a6" />
        <StatCard icon="⚡" label="Score Salud" value={Math.round((metrics.avgOKR + (kpis.length > 0 ? (metrics.kpisOnTarget / kpis.length) * 100 : 0)) / 2) + '%'} sub="Índice combinado" color="#8b5cf6" />
      </div>

      {/* Gráfica de barras — OKR Progress */}
      {okrProgressData.length > 0 && (
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Avance por OKR</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={okrProgressData} margin={{ top: 0, right: 10, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} domain={[0, 100]} />
              <Tooltip formatter={(v) => v + '%'} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="progreso" name="Avance %" radius={[6,6,0,0]}>
                {okrProgressData.map((entry, i) => (
                  <Cell key={i} fill={entry.progreso >= 70 ? '#16a34a' : entry.progreso >= 40 ? '#f59e0b' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: kpiPerformanceData.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Pie chart — Status OKRs */}
        {okrStatusData.length > 0 && (
          <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Estado OKRs</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={okrStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => name + ' ' + Math.round(percent*100) + '%'} labelLine={false}>
                  {okrStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar chart — KPI Actual vs Meta */}
        {kpiPerformanceData.length > 0 && (
          <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>KPIs: Actual vs Meta</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kpiPerformanceData} margin={{ top: 0, right: 10, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text3)' }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Iniciativas por fase */}
      {initiatives.length > 0 && (
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Iniciativas por Fase</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {initiativesByPhase.map((p, i) => (
              <div key={p.fase} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: COLORS[i] }}>{p.cantidad}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{p.fase}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
