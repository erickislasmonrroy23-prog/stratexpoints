import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

const ALL_MODULES = [
  { id: 'okrs',        label: 'OKRs',              icon: '🎯', desc: 'Objetivos y Resultados Clave',        plan: 'basic'      },
  { id: 'kpis',        label: 'KPIs',              icon: '📊', desc: 'Indicadores clave de rendimiento',    plan: 'basic'      },
  { id: 'initiatives', label: 'Iniciativas',       icon: '🚀', desc: 'Gestión de proyectos estratégicos',  plan: 'basic'      },
  { id: 'map',         label: 'Mapa Estratégico',  icon: '🗺️', desc: 'Balanced Scorecard visual',          plan: 'basic'      },
  { id: 'analytics',   label: 'Analítica',         icon: '📈', desc: 'Dashboards y reportes avanzados',    plan: 'basic'      },
  { id: 'reports',     label: 'Reportes',          icon: '📄', desc: 'Generación de reportes PDF/Excel',   plan: 'basic'      },
  { id: 'alerts',      label: 'Alertas',           icon: '🔔', desc: 'Notificaciones y alertas críticas',  plan: 'basic'      },
  { id: 'ai',          label: 'Inteligencia IA',   icon: '🤖', desc: 'Chat IA, auditoría y predicciones',  plan: 'premium'    },
  { id: 'bowling',     label: 'Bowling Chart',     icon: '🎳', desc: 'Seguimiento de metas tipo bowling',  plan: 'premium'    },
  { id: 'hoshin',      label: 'Hoshin Kanri',      icon: '🏯', desc: 'Metodología japonesa de planeación', plan: 'premium'    },
  { id: 'docreader',   label: 'Lector de Docs',    icon: '📑', desc: 'Análisis de documentos con IA',      plan: 'premium'    },
  { id: 'multiuser',   label: 'Multi-Usuario',     icon: '👥', desc: 'Usuarios ilimitados y roles',         plan: 'enterprise' },
  { id: 'api',         label: 'API Pública',       icon: '🔌', desc: 'Acceso vía API REST documentada',    plan: 'enterprise' },
  { id: 'whitelabel',  label: 'White Label',       icon: '🎨', desc: 'Marca blanca y dominio propio',      plan: 'enterprise' },
];

const PLAN_ORDER = { basic: 1, premium: 2, enterprise: 3 };
const PLAN_COLORS = { basic: '#6366f1', premium: '#8b5cf6', enterprise: '#14b8a6' };

export default function ModuleProvisioning({ tenant, onUpdate }) {
  const [modules, setModules] = useState(tenant?.modules || {});
  const [saving, setSaving] = useState(false);

  const toggleModule = (moduleId) => {
    setModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ modules })
        .eq('id', tenant.id);
      if (error) throw error;
      notificationService.success('Módulos actualizados correctamente.');
      if (onUpdate) onUpdate({ ...tenant, modules });
    } catch (e) {
      notificationService.error('Error al guardar módulos: ' + e.message);
    } finally { setSaving(false); }
  };

  const enableAll = (plan) => {
    const planLevel = PLAN_ORDER[plan] || 1;
    const updated = { ...modules };
    ALL_MODULES.forEach(m => {
      if (PLAN_ORDER[m.plan] <= planLevel) updated[m.id] = true;
    });
    setModules(updated);
  };

  const enabledCount = ALL_MODULES.filter(m => modules[m.id]).length;

  return (
    <div>
      {/* Acceso rápido por plan */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>Activar por plan:</span>
        {['basic', 'premium', 'enterprise'].map(plan => (
          <button key={plan} onClick={() => enableAll(plan)}
            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: PLAN_COLORS[plan] + '15', color: PLAN_COLORS[plan], border: '1px solid ' + PLAN_COLORS[plan] + '40' }}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)} +
          </button>
        ))}
        <button onClick={() => setModules({})}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
          Desactivar todos
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
          {enabledCount}/{ALL_MODULES.length} activos
        </span>
      </div>

      {/* Grid de módulos agrupados por plan */}
      {['basic', 'premium', 'enterprise'].map(planGroup => (
        <div key={planGroup} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PLAN_COLORS[planGroup], textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>
            — Plan {planGroup} —
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {ALL_MODULES.filter(m => m.plan === planGroup).map(mod => {
              const isOn = !!modules[mod.id];
              return (
                <div key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: isOn ? PLAN_COLORS[planGroup] + '12' : 'var(--bg2)',
                    border: '1.5px solid ' + (isOn ? PLAN_COLORS[planGroup] : 'var(--border)'),
                    transition: 'all 0.18s',
                    userSelect: 'none',
                  }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{mod.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{mod.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.desc}</div>
                  </div>
                  {/* Toggle visual */}
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: isOn ? PLAN_COLORS[planGroup] : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s'
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: isOn ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={saving}
        className="sp-btn sp-btn-primary"
        style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, marginTop: 8 }}>
        {saving ? 'Guardando...' : '💾 Guardar configuración de módulos'}
      </button>
    </div>
  );
}
