import React from 'react';

export default function ModuleProvisioning({ tenant, isSystemOwner, onToggleModule }) {
  return (
    <div className="sp-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.15)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          Aprovisionamiento
        </h3>
        <span className="sp-badge" style={{ background: tenant.modules?.ai ? 'var(--teal)' : 'var(--text3)', color: '#fff', padding: '4px 10px' }}>{tenant.modules?.ai ? 'Plan Enterprise' : 'Plan Básico'}</span>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Activa o desactiva de forma remota las capacidades del sistema para <strong>{tenant.name}</strong>.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { id: 'strategy', icon: '🗺️', label: 'Mapa Estratégico (BSC)', desc: 'Constructor visual de perspectivas y relaciones de causa-efecto.' },
          { id: 'okrs', icon: '🎯', label: 'Gestor de OKRs Avanzado', desc: 'Alineación táctica, matrices de 52 semanas y responsables múltiples.' },
          { id: 'kpis', icon: '📊', label: 'Centro de KPIs y Bowling Chart', desc: 'Monitoreo de indicadores numéricos y proyecciones automáticas.' },
          { id: 'ai', icon: '🤖', label: 'Motor de Inteligencia Artificial', desc: 'Acceso a IA Groq, Generador Automático, Chat y Análisis de PDF.' },
          { id: 'reports', icon: '📤', label: 'Exportación y Reportes', desc: 'Descarga nativa a PDF, Excel, Word y autogeneración de PowerPoint.' }
        ].map(mod => (
          <div key={mod.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, width: 40, height: 40, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', opacity: tenant.modules?.[mod.id] ? 1 : 0.5 }}>{mod.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: tenant.modules?.[mod.id] ? 'var(--text)' : 'var(--text3)', marginBottom: 2 }}>{mod.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{mod.desc}</div>
              </div>
            </div>
            <div onClick={() => onToggleModule(mod.id)} style={{ width: 48, height: 26, borderRadius: 13, background: tenant.modules?.[mod.id] ? 'var(--green)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease', flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: tenant.modules?.[mod.id] ? 25 : 3, transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        ))}
      </div>
      
      {isSystemOwner && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--gold)20', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 10, fontSize: 12, color: 'var(--gold)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ lineHeight: 1.5 }}><strong>Nota de Venta (Solo Admin):</strong> Desactivar IA fuerza el "Plan Básico". Usa los módulos como Upsells.</span>
        </div>
      )}
    </div>
  );
}