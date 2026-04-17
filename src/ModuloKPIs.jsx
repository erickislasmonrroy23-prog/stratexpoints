import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from './store.js';
import { kpiService, notificationService } from './services.js';
import BowlingChart from './BowlingChart.jsx';
import Prediction from './Prediction.jsx';
import { AddBtn, TabBar, EmptyState } from './SharedUI.jsx';

export default function ModuloKPIs({ onModal, onEdit, onCreateOkrFromKpi, onDelete }) {
  const kpis = useStore(state => state.kpis);
  const profile = useStore.use.profile();
  const can = useStore.use.can();
  const [tab, setTab] = useState('list');
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiForm, setKpiForm] = useState({ name: '', target: '', value: '', unit: '%', department: '', owner: '', frequency: 'monthly' });
  const [savingKpi, setSavingKpi] = useState(false);

  const handleCreateKPI = async (e) => {
    e.preventDefault();
    if (!kpiForm.name.trim()) return notificationService.error('El nombre del KPI es requerido.');
    setSavingKpi(true);
    try {
      const { supabase } = await import('./supabase.js');
      const { error } = await supabase.from('kpis').insert({
        name: kpiForm.name,
        target: parseFloat(kpiForm.target) || 0,
        value: parseFloat(kpiForm.value) || 0,
        unit: kpiForm.unit,
        department: kpiForm.department,
        owner: kpiForm.owner,
        frequency: kpiForm.frequency,
        organization_id: profile?.organization_id,
      });
      if (error) throw error;
      notificationService.success('✅ KPI creado correctamente.');
      setShowKpiModal(false);
      setKpiForm({ name: '', target: '', value: '', unit: '%', department: '', owner: '', frequency: 'monthly' });
      const { kpiService } = await import('./services.js');
      const newKPIs = await kpiService.getAll(profile?.organization_id);
      useStore.getState().setKPIs(newKPIs || []);
    } catch (err) { notificationService.error('Error: ' + err.message); }
    finally { setSavingKpi(false); }
  };

  const [filterOwner, setFilterOwner] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState({});
  const [editingDept, setEditingDept] = useState(null);

  const toggleDept = useCallback((dept) => {
    setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  }, []);

  const renameDept = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) { setEditingDept(null); return; }
    const itemsToUpdate = (kpis || []).filter(o => (o.department || 'General') === oldName);
    try {
      await Promise.all(itemsToUpdate.map(o => kpiService.update(o.id, { department: newName })));
    } catch (e) {
      notificationService.error('Error al renombrar: ' + e.message);
    }
    setEditingDept(null);
  };

  const depts = useMemo(() =>
    [...new Set((kpis || []).map(o => o.department || 'General'))].sort(),
    [kpis]
  );

  const owners = useMemo(() =>
    [...new Set((kpis || []).map(o => o.owner || 'Sin asignar'))].sort(),
    [kpis]
  );

  const filteredKpis = useMemo(() => {
    return (kpis || []).filter(kpi => {
      const matchDept = !filterDept || (kpi.department || 'General') === filterDept;
      const matchOwner = !filterOwner || (kpi.owner || 'Sin asignar') === filterOwner;
      return matchDept && matchOwner;
    });
  }, [kpis, filterDept, filterOwner]);

  const groupedKpis = useMemo(() => {
    return filteredKpis.reduce((acc, kpi) => {
      const dept = kpi.department || 'General';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(kpi);
      return acc;
    }, {});
  }, [filteredKpis]);

  const getColor = (pct) => {
    if (pct >= 95) return 'var(--green)';
    if (pct >= 80) return 'var(--gold)';
    return 'var(--red)';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">KPIs</div>
          <div className="page-subtitle">{(kpis || []).length} indicadores activos</div>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'list', icon: '📊', label: 'Indicadores' },
          { id: 'bowling', icon: '🎳', label: 'Bowling KPI' },
          { id: 'prediction', icon: '📈', label: 'Prediccion' }
        ]}
        active={tab}
        onChange={setTab}
        rightContent={
          tab === 'list' && can('create', 'kpis')
            ? <AddBtn onClick={() => onModal('kpi')} label="Nuevo KPI" color="var(--teal)" />
            : null
        }
      />

      <div className="fade-up">
        {tab === 'list' && renderList()}
        {tab === 'bowling' && <BowlingChart />}
        {tab === 'prediction' && <Prediction />}
      </div>
    </div>
  );

  function renderList() {
    if ((kpis || []).length === 0) {
      return (
        <EmptyState
          icon="📊"
          title="Sin KPIs registrados"
          desc="Agrega indicadores clave de desempeno"
          action={can('create', 'kpis') ? <AddBtn onClick={() => onModal('kpi')} label="Crear KPI" color="var(--teal)" /> : null}
        />
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 150, maxWidth: 300 }}>
            <label className="sp-label">Filtrar por Responsable</label>
            <select className="sp-input" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
              <option value="">Todos los responsables</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 150, maxWidth: 300 }}>
            <label className="sp-label">Filtrar por Area</label>
            <select className="sp-input" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">Todas las areas</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(filterOwner !== '' || filterDept !== '') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="sp-btn"
                onClick={() => { setFilterOwner(''); setFilterDept(''); }}
                style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', height: 38 }}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {filteredKpis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 12, border: '1px dashed var(--border)' }}>
            No se encontraron resultados para los filtros seleccionados.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedKpis).map(([dept, deptKpis]) => (
              <DeptSection
                key={dept}
                dept={dept}
                kpis={deptKpis}
                collapsed={collapsedDepts[dept]}
                onToggle={toggleDept}
                editingDept={editingDept}
                onEditDept={setEditingDept}
                onRenameDept={renameDept}
                can={can}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreateOkrFromKpi={onCreateOkrFromKpi}
                getColor={getColor}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
}

function DeptSection({ dept, kpis, collapsed, onToggle, editingDept, onEditDept, onRenameDept, can, onEdit, onDelete, onCreateOkrFromKpi, getColor }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={e => {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            onToggle(dept);
          }
        }}
        className="sp-card-hover"
        style={{
          padding: '16px 24px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: collapsed ? 0 : 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📁</span>
          {editingDept === dept ? (
            <input
              autoFocus
              defaultValue={dept === 'General' ? '' : dept}
              onBlur={e => onRenameDept(dept, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') onEditDept(null);
              }}
              onClick={e => e.stopPropagation()}
              className="sp-input"
              style={{ width: 250, padding: '6px 12px', fontSize: 15, fontWeight: 800, margin: 0 }}
            />
          ) : (
            <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {dept}
              {can('update', 'kpis') && (
                <button
                  onClick={e => { e.stopPropagation(); onEditDept(dept); }}
                  className="icon-btn"
                  style={{ width: 24, height: 24, fontSize: 12, border: 'none', background: 'transparent', opacity: 0.5 }}
                >
                  ✏️
                </button>
              )}
            </h4>
          )}
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, background: 'var(--bg3)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 99 }}>
            {kpis.length} KPIs
          </span>
        </div>
        <span style={{
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: 14, color: 'var(--text3)', fontWeight: 800
        }}>
          ▼
        </span>
      </div>

      {!collapsed && (
        <div
          className="scale-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
            gap: 16,
            paddingLeft: 28,
            borderLeft: '2px dashed var(--border)',
            marginLeft: 28,
            marginBottom: 32
          }}
        >
          {kpis.map(kpi => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              can={can}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateOkrFromKpi={onCreateOkrFromKpi}
              getColor={getColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ kpi, can, onEdit, onDelete, onCreateOkrFromKpi, getColor }) {
  const pct = kpi.target ? Math.round((kpi.value || 0) / kpi.target * 100) : 0;
  const color = getColor(pct);
  const isCritical = pct < 80;

  const handleBlur = async (e) => {
    const v = Number(e.target.value);
    if (v !== (kpi.value || 0)) {
      try {
        await kpiService.update(kpi.id, { value: v });
      } catch (err) {
        notificationService.error(err.message);
      }
    }
  };

  return (
    <div className="sp-card sp-card-hover" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
            {kpi.name}
          </div>
          {kpi.owner && (
            <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              👤 {kpi.owner}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {can('update', 'kpis') && (
            <button
              className="icon-btn"
              onClick={() => onEdit && onEdit(kpi)}
              style={{ width: 28, height: 28, fontSize: 13, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)' }}
            >
              ✏️
            </button>
          )}
          {can('delete', 'kpis') && (
            <button className="delete-btn" onClick={() => onDelete(kpi.id)}>🗑</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <input
            type="number"
            disabled={!can('update', 'kpis')}
            defaultValue={kpi.value || 0}
            onBlur={handleBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            style={{
              width: 70, fontSize: 32, fontWeight: 800, color,
              background: 'transparent', border: 'none',
              borderBottom: '1px dashed transparent',
              outline: 'none', padding: 0,
              cursor: can('update', 'kpis') ? 'text' : 'not-allowed',
              lineHeight: 1,
              opacity: can('update', 'kpis') ? 1 : 0.6
            }}
          />
          <span style={{ fontSize: 16, color: 'var(--text3)', marginLeft: 2, fontWeight: 700 }}>
            {kpi.unit}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Actual</span>
      </div>

      <div className="progress-bar" style={{ marginBottom: 10, height: 6 }}>
        <div className="progress-fill" style={{ width: Math.min(100, pct) + '%', background: color }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Meta: {kpi.target}{kpi.unit}</span>
        <span style={{ fontWeight: 800, color }}>{pct}%</span>
      </div>

      {isCritical && can('create', 'okrs') && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8, fontWeight: 700 }}>
            Desviacion detectada
          </div>
          <button
            className="sp-btn"
            onClick={() => onCreateOkrFromKpi && onCreateOkrFromKpi(kpi)}
            style={{
              background: 'var(--red-light)', color: 'var(--red)',
              border: '1px solid rgba(220,38,38,0.3)',
              width: '100%', justifyContent: 'center', fontSize: 12
            }}
          >
            Crear OKR de Mejora
          </button>
        </div>
      )}
    
      {showKpiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="sp-card" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>📊 Nuevo KPI</h3>
            <form onSubmit={handleCreateKPI} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Nombre del KPI *</label>
                <input className="sp-input" required placeholder="Ej: Tasa de conversión de ventas" value={kpiForm.name} onChange={e => setKpiForm(f => ({...f, name: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Valor actual</label>
                  <input className="sp-input" type="number" step="any" placeholder="0" value={kpiForm.value} onChange={e => setKpiForm(f => ({...f, value: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Meta</label>
                  <input className="sp-input" type="number" step="any" placeholder="100" value={kpiForm.target} onChange={e => setKpiForm(f => ({...f, target: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unidad</label>
                  <input className="sp-input" placeholder="%, $, hrs..." value={kpiForm.unit} onChange={e => setKpiForm(f => ({...f, unit: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Departamento</label>
                  <input className="sp-input" placeholder="Ventas, Ops, RRHH..." value={kpiForm.department} onChange={e => setKpiForm(f => ({...f, department: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Responsable</label>
                  <input className="sp-input" placeholder="Nombre" value={kpiForm.owner} onChange={e => setKpiForm(f => ({...f, owner: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Frecuencia de medición</label>
                <select className="sp-input" value={kpiForm.frequency} onChange={e => setKpiForm(f => ({...f, frequency: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={savingKpi} className="sp-btn sp-btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  {savingKpi ? 'Guardando...' : '✅ Crear KPI'}
                </button>
                <button type="button" onClick={() => setShowKpiModal(false)} className="sp-btn" style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  );
}
