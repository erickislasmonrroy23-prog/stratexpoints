import React from 'react';

if (typeof document !== 'undefined' && !document.getElementById('xtratia-shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'xtratia-shimmer-style';
  style.textContent = '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }';
  document.head.appendChild(style);
}
const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div style={{ width, height, borderRadius: 6, ...shimmerStyle, ...style }} />;
}
export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <SkeletonLine width="60%" height={18} />
      {Array(Math.max(0, lines - 1)).fill(0).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? '90%' : '75%'} />
      ))}
    </div>
  );
}
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', 1fr)', gap: 8 }}>
        {Array(cols).fill(0).map((_, i) => <SkeletonLine key={i} height={12} />)}
      </div>
      {Array(rows).fill(0).map((_, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', 1fr)', gap: 8 }}>
          {Array(cols).fill(0).map((_, ci) => <SkeletonLine key={ci} height={36} />)}
        </div>
      ))}
    </div>
  );
}
export function SkeletonMetrics({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + count + ', 1fr)', gap: 12 }}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <SkeletonLine width="50%" height={12} style={{ marginBottom: 8 }} />
          <SkeletonLine width="40%" height={32} style={{ marginBottom: 6 }} />
          <SkeletonLine width="70%" height={10} />
        </div>
      ))}
    </div>
  );
}
export const SC = SkeletonCard;
export const SL = SkeletonLine;
export function TabBar({ tabs = [], active, onSelect, style = {} }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap', ...style }}>
      {tabs.map(tab => {
        const id = typeof tab === 'object' ? tab.id : tab;
        const label = typeof tab === 'object' ? (tab.label || tab.id) : tab;
        return (
          <button key={id} onClick={() => onSelect(id)}
            style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: active === id ? 'var(--bg)' : 'transparent', color: active === id ? 'var(--text)' : 'var(--text3)', border: active === id ? '1px solid var(--border)' : '1px solid transparent', transition: 'all 0.15s' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AddBtn({ onClick, children = '+ Agregar', style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} className="sp-btn sp-btn-primary"
      style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, ...style }}>
      {children}
    </button>
  );
}

export function EmptyState({ icon = '\uD83D\uDCED', title = 'Sin datos', desc = '', action = null, actionLabel = 'Crear' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg2)', borderRadius: 16, border: '2px dashed var(--border)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>{desc}</div>}
      {action && (
        <button onClick={action} className="sp-btn sp-btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>+ {actionLabel}</button>
      )}
    </div>
  );
}

export function Badge({ label, color = '#6366f1', bg = '#eef2ff', style = {} }) {
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, ...style }}>{label}</span>;
}

export function StatCard({ icon, label, value, sub, color = 'var(--primary)', trend }) {
  return (
    <div style={{ padding: 18, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend !== undefined && <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>{trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function LoadingSpinner({ size = 32, color = 'var(--primary)' }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: color, animation: 'spin 0.8s linear infinite' }} />;
}
