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
export function TabBar({ tabs = [], active, onSelect, onChange, rightContent, style = {} }) {
  const handleClick = (id) => {
    if (onChange) onChange(id);
    else if (onSelect) onSelect(id);
  };
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center', ...style }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
        {tabs.map(tab => {
          const id = typeof tab === 'object' ? tab.id : tab;
          const label = typeof tab === 'object' ? (tab.label || tab.id) : tab;
          const icon = typeof tab === 'object' ? tab.icon : null;
          return (
            <button key={id} onClick={() => handleClick(id)}
              style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: active === id ? 'var(--bg)' : 'transparent', color: active === id ? 'var(--text)' : 'var(--text3)', border: active === id ? '1px solid var(--border)' : '1px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
              {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
              {label}
            </button>
          );
        })}
      </div>
      {rightContent && <div style={{ marginLeft: 'auto', flexShrink: 0 }}>{rightContent}</div>}
    </div>
  );
}

export function AddBtn({ onClick, children, label, color, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} className="sp-btn sp-btn-primary"
      style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, ...(color ? { background: color } : {}), ...style }}>
      {children || (label ? `+ ${label}` : '+ Agregar')}
    </button>
  );
}

export function EmptyState({ icon = '📭', title = 'Sin datos', desc = '', action = null, actionLabel = 'Crear' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg2)', borderRadius: 16, border: '2px dashed var(--border)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>{desc}</div>}
      {action && (
        typeof action === 'function'
          ? <button onClick={action} className="sp-btn sp-btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>+ {actionLabel}</button>
          : action
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

// ── ConfirmationModal ────────────────────────────────────────────
export function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="sp-card" style={{ width: '100%', maxWidth: 420, padding: 28, borderRadius: 18, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{title || 'Confirmar'}</h3>
        <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} className="sp-btn" style={{ flex: 1, padding: '11px', borderRadius: 9, fontWeight: 700, fontSize: 14, background: danger ? '#dc2626' : 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="sp-btn" style={{ flex: 1, padding: '11px', borderRadius: 9, fontSize: 14, cursor: 'pointer', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal genérico ──────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, maxWidth = 520 }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose && onClose()}>
      <div className="sp-card" style={{ width: '100%', maxWidth, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)', padding: '0 4px' }}>×</button>
          </div>
        )}
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Mapas de estado (Status) para OKRs / KPIs / Iniciativas ──────────────────
export const STATUS_COLORS = {
  on_track:    'var(--green)',
  completed:   'var(--teal)',
  at_risk:     'var(--gold)',
  behind:      'var(--red)',
  not_started: 'var(--text3)',
  active:      'var(--primary)',
  in_progress: 'var(--teal)',
  planning:    'var(--primary)',
  cancelled:   'var(--red)',
  paused:      'var(--text3)',
  on_hold:     'var(--gold)',
};

export const STATUS_LABELS = {
  on_track:    'En camino',
  completed:   'Completado',
  at_risk:     'En riesgo',
  behind:      'Retrasado',
  not_started: 'Sin iniciar',
  active:      'Activo',
  in_progress: 'En progreso',
  planning:    'Planeación',
  cancelled:   'Cancelado',
  paused:      'Pausado',
  on_hold:     'En espera',
};
