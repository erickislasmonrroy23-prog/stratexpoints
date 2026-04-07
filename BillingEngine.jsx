import React, { useState } from 'react';
import { organizationService } from './services.js';
import { TabBar } from './SharedUI.jsx';
import ReconciliationModule from './ReconciliationModule.jsx';

export default function BillingEngine({ tenants, onUpdateTenant, onSendInvoice }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [billingTab, setBillingTab] = useState('subs');

  const today = new Date();
  const currentMonthStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = today.getDate();

  let totalMRR = 0;
  let activeCount = 0;
  let overdueCount = 0;

  const enrichedTenants = tenants.map(t => {
    const isPaidThisMonth = t.modules?.lastPaymentMonth === currentMonthStr;
    const isGracePeriod = !isPaidThisMonth && currentDay <= 10;
    const activePrice = t.modules?.ai ? (t.pricePremium || 29) : (t.priceBasic || 12);
    const usersCount = (t.users || []).length;
    const mrr = usersCount * activePrice;
    
    if (isPaidThisMonth || isGracePeriod) {
      totalMRR += mrr;
      activeCount++;
    }
    if (!isPaidThisMonth && currentDay > 10) {
      overdueCount++;
    }

    return { ...t, isPaidThisMonth, isGracePeriod, mrr, activePrice, usersCount };
  });

  const filtered = enrichedTenants.filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const handleTogglePayment = async (tenant) => {
    setProcessingId(tenant.id);
    const newMods = { ...(tenant.modules || {}) };
    newMods.lastPaymentMonth = tenant.isPaidThisMonth ? null : currentMonthStr;
    try {
      await organizationService.update(tenant.id, { modules: newMods });
      onUpdateTenant('modules', newMods, tenant.id);
    } catch (e) {
      alert("Error actualizando estado de pago: " + e.message);
    }
    setProcessingId(null);
  };

  const handleSendInvoice = async (tenant) => {
    setProcessingId(`inv-${tenant.id}`);
    await onSendInvoice(tenant, tenant.usersCount, tenant.mrr);
    setProcessingId(null);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TabBar 
        tabs={[
          {id: 'subs', icon: '💳', label: 'Suscripciones y Cobros'}, 
          {id: 'recon', icon: '⚖️', label: 'Conciliación Bancaria (FinTech)'}
        ]} 
        active={billingTab} 
        onChange={setBillingTab} 
      />

      {billingTab === 'subs' && (
        <>
          {/* Kpis Financieros Globales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--primary)', background: 'linear-gradient(135deg, var(--bg2), var(--primary-light))' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Ingreso Recurrente (MRR)</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px' }}>${totalMRR.toLocaleString()}<span style={{fontSize: 16, color: 'var(--text3)', fontWeight: 600}}>.00</span></div>
            </div>
            <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--teal)' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Suscripciones Activas</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--teal)', letterSpacing: '-1px' }}>{activeCount} <span style={{fontSize: 16, color: 'var(--text3)', fontWeight: 600}}>empresas</span></div>
            </div>
            <div className="sp-card" style={{ padding: 24, borderTop: overdueCount > 0 ? '4px solid var(--red)' : '4px solid var(--green)' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Cuentas en Mora (Riesgo)</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: overdueCount > 0 ? 'var(--red)' : 'var(--green)', letterSpacing: '-1px' }}>{overdueCount} <span style={{fontSize: 16, color: 'var(--text3)', fontWeight: 600}}>bloqueadas</span></div>
            </div>
          </div>

          {/* Tabla de Control de Facturación */}
          <div className="sp-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217, 119, 6, 0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                Panel Central de Cobranza
              </h3>
              <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }}>🔍</span>
                <input className="sp-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar empresa por nombre..." style={{ paddingLeft: 36, borderRadius: 12 }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
              <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Organización</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Plan & Asientos</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Facturación (MRR)</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Estado de Pago</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Acciones Ejecutivas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No se encontraron suscripciones.</td></tr> : filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{t.logoUrl ? <img src={t.logoUrl} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: 'var(--bg2)' }}/> : <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🏢</div>}<div>{t.name}<div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{t.billingEmail || 'Sin email de finanzas'}</div></div></div></td>
                      <td style={{ padding: '16px' }}><div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{t.modules?.ai ? 'Enterprise' : 'Básico'} (${t.activePrice}/u)</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.usersCount} licencias activas</div></td>
                      <td style={{ padding: '16px', fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>${t.mrr}<span style={{fontSize: 11, color: 'var(--text3)', fontWeight: 600}}>.00 / mes</span></td>
                      <td style={{ padding: '16px' }}><span className="sp-badge" style={{ background: t.isPaidThisMonth ? 'var(--green-light)' : (t.isGracePeriod ? 'var(--gold)20' : 'var(--red-light)'), color: t.isPaidThisMonth ? 'var(--green)' : (t.isGracePeriod ? 'var(--gold)' : 'var(--red)'), border: `1px solid ${t.isPaidThisMonth ? 'var(--green)40' : (t.isGracePeriod ? 'var(--gold)40' : 'var(--red)40')}` }}>{t.isPaidThisMonth ? '✅ Al día' : (t.isGracePeriod ? '⏳ En Gracia' : '❌ Bloqueado')}</span></td>
                      <td style={{ padding: '16px', textAlign: 'right' }}><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleSendInvoice(t)} disabled={processingId === `inv-${t.id}` || !t.billingEmail} className="sp-btn" style={{ background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 12px' }} title={!t.billingEmail ? 'Falta email de facturación' : 'Enviar factura por email'}>{processingId === `inv-${t.id}` ? '...' : '📄 Facturar'}</button>
                        <button onClick={() => handleTogglePayment(t)} disabled={processingId === t.id} className="sp-btn" style={{ background: t.isPaidThisMonth ? 'var(--red)' : 'var(--green)', color: '#fff', border: 'none', fontSize: 11, padding: '6px 12px' }}>{processingId === t.id ? '...' : (t.isPaidThisMonth ? 'Marcar Impago' : 'Marcar Pagado')}</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {billingTab === 'recon' && <ReconciliationModule />}
    </div>
  );
}