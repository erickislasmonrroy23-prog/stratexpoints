import React, { memo, useState } from 'react';

const TenantCard = memo(({ tenant, onSelect }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const activeMods = Object.values(tenant.modules || {}).filter(Boolean).length;
  
  const tm = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, '0');
  const tp = tenant.modules?.lastPaymentMonth === tm;
  const tg = !tp && new Date().getDate() <= 10;

  return (
    <div className="sp-card sp-card-hover scale-in" style={{ display: 'flex', flexDirection: 'column', padding: 24, background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${tenant.themeColor}, transparent)` }}></div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{ position: 'relative', overflow: 'hidden', width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${tenant.themeColor}, var(--bg3))`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, border: `1px solid ${tenant.themeColor}40`, flexShrink: 0, boxShadow: `0 4px 12px ${tenant.themeColor}30` }}>
          {!isLoaded && (tenant.name || 'E')[0].toUpperCase()}
          {tenant.logoUrl && (
            <img 
              src={tenant.logoUrl} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }} 
              alt={tenant.name} 
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
            />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4, lineHeight: 1.2 }}>{tenant.name}</div>
            <span className="sp-badge" style={{ background: tp ? 'var(--green-light)' : (tg ? 'var(--gold)20' : 'var(--red-light)'), color: tp ? 'var(--green)' : (tg ? 'var(--gold)' : 'var(--red)') }}>{tp ? 'Al día' : (tg ? 'En Gracia' : 'Bloqueado')}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>ID: {tenant.id.toString().padStart(6, '0')}</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '12px 0', borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{fontSize: 18, fontWeight: 800, color: 'var(--text)'}}>{(tenant.users || []).length}</div><div style={{fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600}}>Usuarios</div></div>
        <div style={{ width: 1, background: 'var(--border)' }}></div>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{fontSize: 18, fontWeight: 800, color: 'var(--text)'}}>{activeMods}/6</div><div style={{fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600}}>Módulos</div></div>
      </div>

      <button onClick={() => onSelect(tenant.id)} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff', border: 'none', width: '100%', justifyContent: 'center', marginTop: 'auto', transition: 'all 0.2s', opacity: 0.9, padding: '12px', borderRadius: 14 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.9}>
        ⚙️ Configurar Plataforma
      </button>
    </div>
  );
});

export default TenantCard;