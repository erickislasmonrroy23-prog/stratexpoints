import React from 'react';

const STATUS_CONFIG = {
  active:    { label: 'Activo',     color: '#16a34a', bg: '#dcfce7', icon: '✅' },
  trial:     { label: 'Trial',      color: '#f59e0b', bg: '#fef9c3', icon: '⏳' },
  suspended: { label: 'Suspendido', color: '#dc2626', bg: '#fee2e2', icon: '⛔' },
  inactive:  { label: 'Inactivo',   color: '#6b7280', bg: '#f3f4f6', icon: '💤' },
};

const PLAN_CONFIG = {
  trial:      { label: 'Trial',      color: '#f59e0b' },
  basic:      { label: 'Basic',      color: '#6366f1' },
  premium:    { label: 'Premium',    color: '#8b5cf6' },
  enterprise: { label: 'Enterprise', color: '#14b8a6' },
};

export default function TenantCard({ tenant, isSelected, onClick, onEditTenant }) {
  if (!tenant) return null;

  const status   = STATUS_CONFIG[tenant.status] || STATUS_CONFIG.active;
  const plan     = PLAN_CONFIG[tenant.plan]     || PLAN_CONFIG.basic;
  const initials = (tenant.name || 'E').substring(0, 2).toUpperCase();

  // Score de salud (0-100) basado en usuarios + isPaid + status
  // useTenants normaliza a camelCase: isPaid, userCount, logoUrl
  const healthScore = [
    tenant.status === 'active'                    ? 40 : 0,
    (tenant.isPaid ?? tenant.is_paid)             ? 30 : 0,
    ((tenant.userCount ?? tenant.user_count) || 0) > 0 ? 20 : 0,
    tenant.modules?.okrs                          ? 10 : 0,
  ].reduce((a, b) => a + b, 0);

  const healthColor = healthScore >= 80 ? '#16a34a' : healthScore >= 50 ? '#f59e0b' : '#dc2626';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: 14,
        background: isSelected ? 'var(--primary-light)' : 'var(--bg2)',
        border: '2px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
        cursor: 'pointer',
        transition: 'all 0.18s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barra de color del plan arriba */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: plan.color, borderRadius: '14px 14px 0 0' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {(tenant.logoUrl || tenant.logo_url) ? (
          <img src={tenant.logoUrl || tenant.logo_url} alt={tenant.name}
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', background: 'white', padding: 4, flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: plan.color + '20', color: plan.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, border: '1.5px solid ' + plan.color + '40'
          }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tenant.name || 'Sin nombre'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {tenant.subdomain ? tenant.subdomain + '.xtratia.com' : tenant.industry || 'Sin industria'}
          </div>
        </div>
        {/* Status badge */}
        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: status.bg, color: status.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tenant.userCount ?? tenant.user_count ?? 0}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Usuarios</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: plan.color }}>{plan.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Plan</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: healthColor }}>{healthScore}%</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Salud</div>
        </div>
      </div>

      {/* Barra de salud */}
      <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: healthScore + '%', background: healthColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>

      {/* Footer: pago + módulos activos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: (tenant.isPaid ?? tenant.is_paid) ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {(tenant.isPaid ?? tenant.is_paid) ? '💳 Al corriente' : '⚠️ Pago pendiente'}
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {['okrs', 'kpis', 'ai', 'analytics'].map(mod => (
            <div key={mod} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: tenant.modules?.[mod] ? '#6366f1' : 'var(--border)'
            }} title={mod.toUpperCase()} />
          ))}
        </div>
      </div>
    </div>
  );
}
