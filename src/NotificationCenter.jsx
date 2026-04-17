import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';

const SEV_CONFIG = {
  critical: { label: 'Crítico', color: '#dc2626', bg: '#fee2e2', icon: '🚨' },
  warning:  { label: 'Advertencia', color: '#f59e0b', bg: '#fef9c3', icon: '⚠️' },
  info:     { label: 'Info', color: '#3b82f6', bg: '#dbeafe', icon: 'ℹ️' },
  success:  { label: 'Éxito', color: '#16a34a', bg: '#dcfce7', icon: '✅' },
};

export default function NotificationCenter({ organizationId }) {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  const loadAlerts = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setAlerts(data || []);
    } catch (e) { console.error('NotificationCenter:', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadAlerts();

    // Suscripción realtime para alertas nuevas
    const channel = supabase
      .channel('alerts-' + organizationId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: 'organization_id=eq.' + organizationId,
      }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
        notificationService.info('Nueva alerta: ' + (payload.new.title || 'Alerta nueva'));
      })
      .subscribe((status, err) => {
        if (err) console.warn('[Realtime] Alertas no disponible en tiempo real:', err.message || err);
      });

    return () => { supabase.removeChannel(channel); };
  }, [organizationId]);

  const markRead = async (alertId) => {
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
    if (!error) setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
    if (!unreadIds.length) return;
    await supabase.from('alerts').update({ is_read: true }).in('id', unreadIds);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    notificationService.success('Todas las alertas marcadas como leídas.');
  };

  const deleteAlert = async (alertId) => {
    const { error } = await supabase.from('alerts').delete().eq('id', alertId);
    if (!error) setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const createTestAlert = async () => {
    await supabase.from('alerts').insert({
      title: '⚡ Alerta de prueba — ' + new Date().toLocaleTimeString('es-MX'),
      message: 'Esta es una alerta de prueba del sistema Xtratia.',
      severity: 'info',
      is_read: false,
      organization_id: organizationId,
    });
  };

  const filtered = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter(a => !a.is_read) : alerts.filter(a => a.severity === filter);
  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
        <div>Cargando alertas...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Centro de Alertas</span>
          {unreadCount > 0 && (
            <span style={{ background: '#dc2626', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={createTestAlert} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }}>🧪 Probar</button>
          {unreadCount > 0 && <button onClick={markAllRead} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a' }}>✓ Leer todas</button>}
          <button onClick={loadAlerts} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: 'var(--bg2)', border: '1px solid var(--border)' }}>🔄</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['all','Todas'],['unread','Sin leer'],['critical','Críticas'],['warning','Advertencias'],['info','Info']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filter === v ? 'var(--primary)' : 'var(--bg2)',
              color: filter === v ? 'white' : 'var(--text3)',
              border: '1px solid ' + (filter === v ? 'var(--primary)' : 'var(--border)') }}>
            {l} {v === 'unread' && unreadCount > 0 ? '(' + unreadCount + ')' : ''}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--bg2)', borderRadius: 12, border: '2px dashed var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Sin alertas</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Las alertas críticas de KPIs y OKRs aparecerán aquí automáticamente.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(alert => {
            const sev = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
            return (
              <div key={alert.id} style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                background: alert.is_read ? 'var(--bg2)' : sev.bg + '88',
                border: '1px solid ' + (alert.is_read ? 'var(--border)' : sev.color + '44'),
                opacity: alert.is_read ? 0.75 : 1, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{sev.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{alert.title}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: sev.bg, color: sev.color }}>{sev.label}</span>
                    {!alert.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />}
                  </div>
                  {alert.message && <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{alert.message}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                    {alert.created_at ? new Date(alert.created_at).toLocaleString('es-MX') : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!alert.is_read && (
                    <button onClick={() => markRead(alert.id)} title="Marcar como leída"
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>✓</button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} title="Eliminar"
                    style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
