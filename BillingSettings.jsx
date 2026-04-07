import React from 'react';

export default function BillingSettings({ tenant, isSystemOwner, onUpdate, onSendInvoice }) {
  const today = new Date();
  const currentMonthStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = today.getDate();
  const isPaidThisMonth = tenant.modules?.lastPaymentMonth === currentMonthStr;
  const isGracePeriod = !isPaidThisMonth && currentDay <= 10;

  const activePrice = tenant.modules?.ai ? tenant.pricePremium : tenant.priceBasic;
  const totalBilled = (tenant.users || []).length * activePrice;

  return (
    <div className="sp-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217, 119, 6, 0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
          Facturación Mensual
        </h3>
        <button onClick={() => {
          if (!isSystemOwner) return;
          const newMods = { ...(tenant.modules || {}) };
          newMods.lastPaymentMonth = isPaidThisMonth ? null : currentMonthStr;
          onUpdate('modules', newMods);
        }} className="sp-badge" style={{ background: isPaidThisMonth ? 'var(--green-light)' : (isGracePeriod ? 'var(--gold)20' : 'var(--red-light)'), color: isPaidThisMonth ? 'var(--green)' : (isGracePeriod ? 'var(--gold)' : 'var(--red)'), border: `1px solid ${isPaidThisMonth ? 'var(--green)40' : (isGracePeriod ? 'var(--gold)40' : 'var(--red)40')}`, cursor: isSystemOwner ? 'pointer' : 'default', transition: 'all 0.2s', padding: '6px 12px' }}>
          {isPaidThisMonth ? '✅ Mes Pagado (Activo)' : (isGracePeriod ? `⏳ En Gracia (Vence el día 10)` : '❌ Bloqueado (Impago)')}
        </button>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        El ciclo de la plataforma inicia el día 1 de cada mes. Si el pago no se confirma antes del día 10, la cuenta se bloqueará automáticamente.
      </p>

      {isSystemOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div><label className="sp-label">Precio Plan Básico ($)</label><input type="number" className="sp-input" value={tenant.priceBasic} onChange={e => onUpdate('priceBasic', Number(e.target.value))} style={{ padding: '12px', borderRadius: 12 }} /></div>
          <div><label className="sp-label">Precio Premium ($)</label><input type="number" className="sp-input" value={tenant.pricePremium} onChange={e => onUpdate('pricePremium', Number(e.target.value))} style={{ padding: '12px', borderRadius: 12 }} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="sp-label">Correo de Facturación</label><input type="email" className="sp-input" placeholder="finanzas@cliente.com" value={tenant.billingEmail} onChange={e => onUpdate('billingEmail', e.target.value)} style={{ padding: '12px', borderRadius: 12 }} /></div>
        </div>
      )}

      <div style={{ background: 'var(--bg3)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
          <span>Licencias activadas ({(tenant.users || []).length} asientos)</span>
          <span>${totalBilled}.00 USD</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
          <span>Precio unitario ({tenant.modules?.ai ? 'Plan Enterprise' : 'Plan Básico'})</span>
          <span>${activePrice}.00 / usuario</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
          <span>Cargos adicionales por almacenamiento</span>
          <span>Incluido en plan</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--primary-light))', margin: '16px -20px -20px -20px', padding: '20px', borderTop: '1px solid var(--primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'block' }}>Total a facturar mensual</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Siguiente corte: 1 de mes</span>
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px', textShadow: '0 2px 4px rgba(37,99,235,0.1)' }}>${totalBilled}<span style={{fontSize: 16, color: 'var(--text3)', fontWeight: 600}}>.00 USD</span></span>
        </div>
      </div>

      {isSystemOwner ? (
        <button className="sp-btn sp-card-hover" onClick={() => onSendInvoice(tenant, (tenant.users || []).length, totalBilled)} style={{ width: '100%', justifyContent: 'center', background: 'var(--text)', color: 'var(--bg)', padding: '18px', borderRadius: 16, fontSize: 15, fontWeight: 800, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
          📄 Emitir Factura de Cobro Automática
        </button>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Para adquirir más licencias o cambiar de plan, por favor contacta al proveedor del software.</div>
      )}
    </div>
  );
}