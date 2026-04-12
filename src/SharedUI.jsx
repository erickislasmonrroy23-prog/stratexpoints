import React from 'react';

export const SC={on_track:"var(--green)",at_risk:"var(--gold)",completed:"var(--primary)",not_started:"var(--text3)",in_progress:"var(--teal)",on_hold:"var(--gold)",cancelled:"var(--red)"};
export const SL={on_track:"En curso",at_risk:"En riesgo",completed:"Completado",not_started:"Sin iniciar",in_progress:"En progreso",on_hold:"En pausa",cancelled:"Cancelado"};

export function AddBtn({onClick,color,label}){
  const btnStyle = {
    background: color || "var(--primary)",
    color: "#fff",
    border: "none"
  };
  return (
    <button className="sp-btn" onClick={onClick} style={btnStyle} aria-label={label}>
      <span aria-hidden="true" className="mr-2">+</span>
      {label}
    </button>
  );
}

export function TabBar({tabs,active,onChange,rightContent}){
  return(
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'inline-flex', padding: 4, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button 
            key={t.id} 
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)} 
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s ease',
              background: active === t.id ? 'var(--bg)' : 'transparent',
              color: active === t.id ? 'var(--text)' : 'var(--text3)',
              boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}

export function EmptyState({icon,title,desc,action}){
  return(
    <div className="sp-card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{desc}</div>
        {action}
      </div>
    </div>
  );
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", confirmColor = "var(--red)" }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
      <div className="scale-in" style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 450, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${confirmColor}20`, color: confirmColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 24px', border: `2px solid ${confirmColor}40` }}>
            ⚠️
          </div>
          <h3 style={{ fontSize: 20, color: 'var(--text)', margin: '0 0 12px 0' }}>{title}</h3>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{message}</p>
        </div>
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="sp-btn" onClick={onClose} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px', flex: 1 }}>{cancelText}</button>
          <button className="sp-btn" onClick={onConfirm} style={{ background: confirmColor, color: '#fff', padding: '12px 32px', flex: 1, border: 'none' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
// ── Skeleton Loaders ─────────────────────────────────────────────────────────
const shimmer = {
  background: 'linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div style={{ width, height, borderRadius: 6, ...shimmer, ...style }} />;
}

export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <SkeletonLine width="60%" height={18} />
      {Array(lines - 1).fill(0).map((_, i) => (
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

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'Sin datos', desc = '', action = null, actionLabel = 'Crear' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg2)', borderRadius: 16, border: '2px dashed var(--border)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>{desc}</div>}
      {action && (
        <button onClick={action} className="sp-btn sp-btn-primary" style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
          + {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color = '#6366f1', bg = '#eef2ff', style = {} }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, ...style }}>
      {label}
    </span>
  );
}

// ── Inject shimmer CSS ────────────────────────────────────────────────────────
if (!document.getElementById('xtratia-shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'xtratia-shimmer-style';
  style.textContent = '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }';
  document.head.appendChild(style);
}
