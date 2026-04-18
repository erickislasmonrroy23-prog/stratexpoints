import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#14b8a6','#0ea5e9','#f59e0b',
  '#ef4444','#22c55e','#f97316','#ec4899','#06b6d4',
];

export default function BrandingSettings({ tenant, onUpdate }) {
  const [form, setForm] = useState({
    name:        tenant?.name        || '',
    industry:    tenant?.industry    || '',
    subdomain:   tenant?.subdomain   || '',
    logo_url:    tenant?.logo_url    || '',
    theme_color: tenant?.theme_color || '#6366f1',
    mission:     tenant?.mission     || '',
    vision:      tenant?.vision      || '',
    values:      tenant?.values      || '',
  });
  const [saving, setSaving] = useState(false);
  const [previewLogo, setPreviewLogo] = useState(tenant?.logo_url || '');

  // URLs de acceso para compartir con el cliente
  const slug = form.subdomain || tenant?.subdomain || '';
  // URL de testing gratis (query param) — funciona en cualquier Vercel URL
  const appOrigin = window.location.origin;
  const testingUrl = slug ? `${appOrigin}/?org=${slug}` : null;
  // URL de producción con subdominio propio
  const productionUrl = slug ? `https://${slug}.xtratia.com` : null;

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    notificationService.success('🔗 Enlace copiado al portapapeles');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notificationService.error('El nombre de la empresa es requerido.');
    setSaving(true);
    try {
      const { error } = await supabase.from('organizations').update({
        name:        form.name,
        industry:    form.industry,
        subdomain:   form.subdomain || null,
        logo_url:    form.logo_url  || null,
        theme_color: form.theme_color,
        mission:     form.mission   || null,
        vision:      form.vision    || null,
        values:      form.values    || null,
      }).eq('id', tenant?.id);
      if (error) throw error;
      notificationService.success('✅ Configuración de marca guardada.');
      if (onUpdate) onUpdate({ ...tenant, ...form });
    } catch (e) { notificationService.error('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const inputStyle = { padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      
      {/* Preview de marca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 14, background: form.theme_color + '15', border: '2px solid ' + form.theme_color + '40' }}>
        {previewLogo ? (
          <img src={previewLogo} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, background: 'white', padding: 6 }} onError={() => setPreviewLogo('')} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 10, background: form.theme_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>
            {(form.name || 'X')[0].toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{form.name || 'Nombre de la empresa'}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{form.industry || 'Industria'} · {form.subdomain ? form.subdomain + '.xtratia.com' : 'sin subdominio'}</div>
        </div>
      </div>

      {/* Datos básicos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Nombre de la Empresa *</label>
          <input className="sp-input" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Mi Empresa S.A." style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Industria</label>
          <select className="sp-input" value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} style={inputStyle}>
            <option value="">Selecciona...</option>
            {['Tecnología','Finanzas','Salud','Manufactura','Retail','Servicios','Educación','Construcción','Logística','Consultoría','Otro'].map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Subdominio</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input className="sp-input" value={form.subdomain} onChange={e => setForm(f => ({...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="miempresa" style={{ ...inputStyle, borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
            <span style={{ padding: '10px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '0 8px 8px 0', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>.xtratia.com</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>URL del Logo</label>
          <input className="sp-input" type="url" value={form.logo_url} onChange={e => { setForm(f => ({...f, logo_url: e.target.value})); setPreviewLogo(e.target.value); }} placeholder="https://mi-empresa.com/logo.png" style={inputStyle} />
        </div>
      </div>

      {/* Color de marca */}
      <div>
        <label style={labelStyle}>Color Principal de Marca</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({...f, theme_color: c}))}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer',
                border: form.theme_color === c ? '3px solid var(--text)' : '3px solid transparent',
                transition: 'all 0.15s', transform: form.theme_color === c ? 'scale(1.2)' : 'scale(1)',
              }} />
          ))}
          <input type="color" value={form.theme_color} onChange={e => setForm(f => ({...f, theme_color: e.target.value}))}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} title="Color personalizado" />
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace' }}>{form.theme_color}</span>
        </div>
      </div>

      {/* Identidad estratégica */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Identidad Estratégica</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Misión</label>
            <textarea className="sp-input" value={form.mission} onChange={e => setForm(f => ({...f, mission: e.target.value}))} placeholder="Define la misión de tu organización..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Visión</label>
            <textarea className="sp-input" value={form.vision} onChange={e => setForm(f => ({...f, vision: e.target.value}))} placeholder="Define la visión a largo plazo..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Valores Corporativos</label>
            <textarea className="sp-input" value={form.values} onChange={e => setForm(f => ({...f, values: e.target.value}))} placeholder="Integridad, Innovación, Excelencia..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Panel de URLs de Acceso */}
      {slug && (
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🔗 URLs de Acceso del Cliente
          </div>

          {/* URL de Testing — FUNCIONA AHORA GRATIS */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: 4 }}>✅ FUNCIONA HOY</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sin dominio propio</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--primary)', wordBreak: 'break-all' }}>{testingUrl}</div>
              </div>
              <button type="button" onClick={() => copyUrl(testingUrl)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Copiar
              </button>
            </div>
          </div>

          {/* URL de Producción */}
          <div style={{ padding: '12px 14px', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#fef9c3', color: '#b45309', padding: '2px 6px', borderRadius: 4 }}>⚙️ PRODUCCIÓN</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Requiere DNS wildcard</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)', wordBreak: 'break-all' }}>{productionUrl}</div>
              </div>
              <button type="button" onClick={() => copyUrl(productionUrl)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="submit" disabled={saving} className="sp-btn sp-btn-primary" style={{ padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
        {saving ? 'Guardando...' : '💾 Guardar Configuración de Marca'}
      </button>
    </form>
  );
}
