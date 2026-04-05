import React, { memo } from 'react';

const SC = { on_track: "var(--green)", at_risk: "var(--gold)", completed: "var(--primary)", not_started: "var(--text3)" };
const SL = { on_track: "En curso", at_risk: "En riesgo", completed: "Completado", not_started: "Sin iniciar" };

const ObjectiveCard = memo(({ objective, perspective, onDelete, onSelect }) => {
  return (
    <div onClick={() => onSelect(objective)} className="sp-card-hover scale-in" style={{ cursor: 'pointer', position: 'relative', background: 'var(--bg)', border: '1px solid var(--border)', borderTop: `4px solid ${perspective.color}`, borderRadius: 10, padding: '12px 6px', flex: '1 1 110px', maxWidth: 160, minHeight: 52, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2, transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: perspective.color, color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, border: '2px solid var(--bg2)', letterSpacing: 0.5, boxShadow: `0 2px 4px ${perspective.color}40` }}>
        {objective.code || `${perspective.prefix}?`}
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: SC[objective.status] || 'var(--text3)', boxShadow: `0 0 8px ${SC[objective.status] || 'transparent'}` }} title={SL[objective.status] || 'Estado'} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', marginTop: 2, lineHeight: 1.25 }}>{objective.name}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(objective.id); }} data-html2canvas-ignore style={{ position: 'absolute', bottom: -10, right: -10, width: 24, height: 24, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} className="delete-node-btn" title="Eliminar objetivo">×</button>
    </div>
  );
});

export default ObjectiveCard;