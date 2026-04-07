import React, { useRef } from 'react';

export default function BrandingSettings({ tenant, isSystemOwner, onUpdate, onSave, onCopyLink, onLogoUpload, uploadingLogo }) {
  const logoInputRef = useRef(null);

  const predefinedIndustries = ["Tecnología", "Finanzas", "Salud", "Retail", "Manufactura"];
  const isCustomIndustry = tenant?.industry === 'Otro' || (tenant?.industry && !predefinedIndustries.includes(tenant.industry));
  const selectIndustryVal = isCustomIndustry ? 'Otro' : (tenant?.industry || '');

  const predefinedSizes = ["1-50", "50-200", "200-500", "500+"];
  const isCustomSize = tenant?.size === 'Otro' || (tenant?.size && !predefinedSizes.includes(tenant.size));
  const selectSizeVal = isCustomSize ? 'Otro' : (tenant?.size || '');

  return (
    <div className="sp-card" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏢</div>
        Identidad y Accesos
      </h3>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Configura los datos base de la organización, personaliza su marca blanca y genera su enlace de acceso único.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Nombre Comercial</label>
          <input className="sp-input" value={tenant.name} onChange={e => onUpdate('name', e.target.value)} placeholder="Ej: Acme Corp" style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14 }} />
        </div>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Subdominio Único (URL)</label>
          <input className="sp-input" value={tenant.subdomain} onChange={e => onUpdate('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="ej: acme" style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14 }} />
        </div>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Idioma de la Plataforma</label>
          <select className="sp-input" value={tenant.language || 'es-MX'} onChange={e => onUpdate('language', e.target.value)} style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600 }}>
            <option value="es-MX">Español (Latinoamérica)</option>
            <option value="en-US">Inglés (EE.UU.)</option>
          </select>
        </div>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Sector / Industria</label>
          <select className="sp-input" value={selectIndustryVal} onChange={e => onUpdate('industry', e.target.value)} style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14 }}>
            <option value="">Seleccionar industria...</option>
            {predefinedIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            <option value="Otro">Otro</option>
          </select>
          {isCustomIndustry && (
            <input className="sp-input scale-in" style={{ marginTop: 8, padding: '10px 16px', borderRadius: 12, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} autoFocus placeholder="Escribe el sector..." value={tenant.industry === 'Otro' ? '' : tenant.industry} onChange={e => onUpdate('industry', e.target.value)} />
          )}
        </div>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Tamaño (Empleados)</label>
          <select className="sp-input" value={selectSizeVal} onChange={e => onUpdate('size', e.target.value)} style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14 }}>
            <option value="">Seleccionar tamaño...</option>
            {predefinedSizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
            <option value="Otro">Otro</option>
          </select>
          {isCustomSize && (
            <input className="sp-input scale-in" style={{ marginTop: 8, padding: '10px 16px', borderRadius: 12, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} autoFocus placeholder="Escribe el tamaño..." value={tenant.size === 'Otro' ? '' : tenant.size} onChange={e => onUpdate('size', e.target.value)} />
          )}
        </div>
        {isSystemOwner && (
          <div style={{ gridColumn: '1 / -1', marginTop: 8, padding: 20, background: 'rgba(217, 119, 6, 0.08)', border: '1px dashed var(--gold)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label className="sp-label" style={{ color: 'var(--gold)', fontSize: 13, marginBottom: 4 }}>Límite de Licencias Vendidas</label>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Control de aforo exclusivo para Súper Admin.</div>
            </div>
            <input className="sp-input" type="number" min="1" value={tenant.maxUsers} onChange={e => onUpdate('maxUsers', Number(e.target.value))} style={{ width: 100, padding: '14px', fontSize: 18, fontWeight: 800, textAlign: 'center', borderRadius: 14, color: 'var(--gold)' }} />
          </div>
        )}
      </div>

      <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(37,99,235,0.05)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Enlace Privado de Bóveda</div>
          <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, fontFamily: 'monospace' }}>https://{tenant.subdomain || 'empresa'}.xtratia.com</div>
        </div>
        <button className="sp-btn" onClick={() => onCopyLink(tenant.subdomain)} style={{ background: 'var(--primary)', padding: '10px 20px', borderRadius: 99, boxShadow: '0 4px 8px rgba(37,99,235,0.2)' }}>📋 Copiar Link</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, borderTop: '1px dashed var(--border)', paddingTop: 20, marginBottom: 24 }}>
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Color de Acento (Tema)</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input type="color" value={tenant.themeColor} onChange={e => onUpdate('themeColor', e.target.value)} style={{ width: 46, height: 46, padding: 0, border: '2px solid var(--border)', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} title="Elegir color corporativo" />
            <input className="sp-input" value={tenant.themeColor} onChange={e => onUpdate('themeColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace', padding: '14px 16px', borderRadius: 14, fontSize: 14 }} />
          </div>
        </div>
        
        <div>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>Logotipo de la Organización</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--bg)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: 4 }}>
              {tenant.logoUrl ? <img src={tenant.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 16 }}>🏢</span>}
            </div>
            <div style={{ flex: 1 }}>
              <input type="file" ref={logoInputRef} onChange={onLogoUpload} style={{ display: 'none' }} accept="image/*" />
              <button type="button" onClick={() => logoInputRef.current?.click()} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, width: '100%', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                {uploadingLogo ? '⏳ Subiendo...' : tenant.logoUrl ? '🔄 Cambiar Logo' : '📁 Subir Logo'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button className="sp-btn" onClick={onSave} style={{ background: 'var(--text)', color: 'var(--bg)', width: '100%', justifyContent: 'center', padding: '16px', borderRadius: 16, fontSize: 15, fontWeight: 800 }}>💾 Guardar Perfil de Empresa</button>
    </div>
  );
}