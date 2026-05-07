import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const PLANS = [
  { id: 'trial',      label: 'Trial',      price: 0,    color: '#f59e0b', users: 3,  api: 100  },
  { id: 'basic',      label: 'Basic',      price: 499,  color: '#6366f1', users: 10, api: 500  },
  { id: 'premium',    label: 'Premium',    price: 1299, color: '#8b5cf6', users: 30, api: 2000 },
  { id: 'enterprise', label: 'Enterprise', price: 2999, color: '#14b8a6', users: 999,api: 9999 },
];

export default function BillingSettings({ tenant, onUpdate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    plan:          tenant?.plan          || 'basic',
    status:        tenant?.status        || 'active',
    billing_email: tenant?.billing_email || '',
    is_paid:       tenant?.is_paid       || false,
    trial_ends_at: tenant?.trial_ends_at?.substring(0, 10) || '',
    price_basic:   tenant?.price_basic   || 499,
    price_premium: tenant?.price_premium || 1299,
    max_users:     tenant?.max_users     || 10,
    max_api_calls: tenant?.max_api_calls || 500,
  });
  const [newRecord, setNewRecord] = useState({ concept: '', amount: '', due_date: '', status: 'pending' });

  useEffect(() => { if (tenant?.id) loadBillingRecords(); }, [tenant?.id]);

  const loadBillingRecords = async () => {
    const { data } = await supabase
      .from('billing_records')
      .select('*')
      .eq('organization_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecords(data || []);
  };

  const handleSavePlan = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('organizations').update({
        plan:          form.plan,
        status:        form.status,
        billing_email: form.billing_email,
        is_paid:       form.is_paid,
        price_basic:   parseFloat(form.price_basic) || 0,
        price_premium: parseFloat(form.price_premium) || 0,
        max_users:     parseInt(form.max_users) || 10,
        max_api_calls: parseInt(form.max_api_calls) || 500,
        trial_ends_at: form.trial_ends_at || null,
      }).eq('id', tenant.id);
      if (error) throw error;
      notificationService.success('Plan y configuracion actualizados.');
      if (onUpdate) onUpdate();
    } catch (e) { notificationService.error('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('billing_records').insert({
        organization_id: tenant.id,
        concept:  newRecord.concept,
        amount:   parseFloat(newRecord.amount) || 0,
        due_date: newRecord.due_date || null,
        status:   newRecord.status,
      });
      if (error) throw error;
      notificationService.success('Registro de pago agregado.');
      setNewRecord({ concept: '', amount: '', due_date: '', status: 'pending' });
      loadBillingRecords();
    } catch (e) { notificationService.error('Error: ' + e.message); }
  };

  const handleMarkPaid = async (record) => {
    const { error } = await supabase.from('billing_records')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', record.id);
    if (!error) { notificationService.success('Marcado como pagado.'); loadBillingRecords(); }
  };

  const currentPlan = PLANS.find(p => p.id === form.plan) || PLANS[1];
  const statusColors = { active: '#16a34a', suspended: '#dc2626', trial: '#f59e0b', inactive: '#6b7280' };

  const inputStyle = { padding: '10px 12px', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', marginBottom: 8 };
  const labelStyle = { fontSize: 11, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header con estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColors[form.status] || '#6b7280', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{tenant?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Plan: <strong style={{ color: currentPlan.color }}>{currentPlan.label}</strong> · Estado: <strong>{form.status}</strong> · Pago: <strong>{form.is_paid ? '✅ Al corriente' : '⚠️ Pendiente'}</strong></div>
        </div>
      </div>

      {/* Selector de plan */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Plan Comercial</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => setForm(f => ({ ...f, plan: plan.id, max_users: plan.users, max_api_calls: plan.api }))}
              style={{
                padding: '12px 8px', borderRadius: 10, border: '2px solid',
                borderColor: form.plan === plan.id ? plan.color : 'var(--border)',
                background: form.plan === plan.id ? plan.color + '15' : 'var(--bg2)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
              <div style={{ fontWeight: 700, color: plan.color, fontSize: 13 }}>{plan.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>${plan.price > 0 ? plan.price.toLocaleString() + '/mes' : 'Gratis'}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{plan.users === 999 ? 'Ilimitados' : plan.users + ' usuarios'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuración */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Estado del Tenant</label>
          <select className="sp-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
            <option value="active">✅ Activo</option>
            <option value="trial">⏳ Trial</option>
            <option value="suspended">⛔ Suspendido</option>
            <option value="inactive">💤 Inactivo</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Email de Facturación</label>
          <input className="sp-input" type="email" placeholder="pagos@empresa.com" value={form.billing_email} onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fin de Trial</label>
          <input className="sp-input" type="date" value={form.trial_ends_at} onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Máx. Usuarios</label>
          <input className="sp-input" type="number" min="1" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Precio Básico (MXN/mes)</label>
          <input className="sp-input" type="number" min="0" step="0.01" value={form.price_basic} onChange={e => setForm(f => ({ ...f, price_basic: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Precio Premium (MXN/mes)</label>
          <input className="sp-input" type="number" min="0" step="0.01" value={form.price_premium} onChange={e => setForm(f => ({ ...f, price_premium: e.target.value }))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="isPaid" checked={form.is_paid} onChange={e => setForm(f => ({...f, is_paid: e.target.checked}))} />
        <label htmlFor="isPaid" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Cliente al corriente de pago</label>
      </div>

      <button onClick={handleSavePlan} disabled={loading} className="sp-btn sp-btn-primary"
        style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, width: '100%' }}>
        {loading ? 'Guardando...' : '💾 Guardar Configuración de Plan'}
      </button>

      {/* Historial de pagos */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Historial de Pagos</div>
        <form onSubmit={handleAddRecord} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
          <input className="sp-input" placeholder="Concepto (ej. Mensualidad Abril)" value={newRecord.concept} onChange={e => setNewRecord(r => ({...r, concept: e.target.value}))} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12 }} required />
          <input className="sp-input" type="number" placeholder="Monto MXN" min="0" step="0.01" value={newRecord.amount} onChange={e => setNewRecord(r => ({...r, amount: e.target.value}))} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12 }} required />
          <input className="sp-input" type="date" value={newRecord.due_date} onChange={e => setNewRecord(r => ({...r, due_date: e.target.value}))} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12 }} />
          <button type="submit" className="sp-btn sp-btn-primary" style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap' }}>+ Agregar</button>
        </form>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>Sin registros de pago aún.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {records.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.concept || 'Sin concepto'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.due_date ? 'Vence: ' + r.due_date : ''} {r.paid_at ? '· Pagado: ' + r.paid_at.substring(0,10) : ''}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>${parseFloat(r.amount || 0).toLocaleString()} MXN</div>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: r.status === 'paid' ? '#dcfce7' : r.status === 'failed' ? '#fee2e2' : '#fef9c3',
                  color: r.status === 'paid' ? '#16a34a' : r.status === 'failed' ? '#dc2626' : '#ca8a04'
                }}>
                  {r.status === 'paid' ? 'PAGADO' : r.status === 'failed' ? 'FALLIDO' : 'PENDIENTE'}
                </span>
                {r.status !== 'paid' && (
                  <button onClick={() => handleMarkPaid(r)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', cursor: 'pointer' }}>
                    Marcar pagado
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
