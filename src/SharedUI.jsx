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