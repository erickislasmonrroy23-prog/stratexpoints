import React, { useState } from 'react';
import { groqService, notificationService } from './services.js';
import { useStore } from './store.js';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getColor(pct) {
  if (pct === null || pct === undefined) return '#e5e7eb';
  if (pct >= 100) return '#16a34a';
  if (pct >= 80)  return '#22c55e';
  if (pct >= 60)  return '#f59e0b';
  if (pct >= 40)  return '#f97316';
  return '#dc2626';
}

function Cell({ value, isTarget, isEditing, onChange }) {
  if (isTarget) {
    return (
      <td style={{ padding: '6px 4px', textAlign: 'center', background: '#f0f4ff', fontWeight: 700, fontSize: 13, color: 'var(--primary)', border: '1px solid var(--border)', minWidth: 52 }}>
        {isEditing
          ? <input type="number" defaultValue={value || 0} onBlur={e => onChange(Number(e.target.value))}
              style={{ width: 44, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--primary)', fontSize: 13 }} />
          : value ?? '—'
        }
      </td>
    );
  }
  const pct = value !== null && value !== undefined ? value : null;
  const bg = getColor(pct);
  return (
    <td style={{ padding: '6px 4px', textAlign: 'center', background: bg + '22', border: '1px solid var(--border)', minWidth: 52 }}>
      {isEditing
        ? <input type="number" defaultValue={pct ?? ''} onBlur={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            style={{ width: 44, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 600, color: bg === '#e5e7eb' ? 'var(--text3)' : '#000', fontSize: 12 }} />
        : pct !== null ? (
          <span style={{ fontWeight: 700, fontSize: 12, color: bg === '#e5e7eb' ? 'var(--text3)' : '#111' }}>{pct}%</span>
        ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
      }
    </td>
  );
}

export default function BowlingChart() {
  const kpis = useStore(s => s.kpis || []);
  const org  = useStore(s => s.currentOrganization);

  // Inicializar matriz: para cada KPI, 12 meses de metas y avances
  const initRows = () => kpis.slice(0, 20).map(kpi => ({
    id: kpi.id,
    name: kpi.name || 'KPI',
    unit: kpi.unit || '%',
    annualTarget: kpi.target || 100,
    targets: Array(12).fill(null).map((_,i) => Math.round((kpi.target || 100) * ((i+1)/12))),
    actuals: Array(12).fill(null),
  }));

  const [rows, setRows]       = useState(() => initRows().length > 0 ? initRows() : [
    { id: 'demo1', name: 'Ingreso por Ventas', unit: '$', annualTarget: 1000000, targets: [83333,166666,250000,333333,416666,500000,583333,666666,750000,833333,916666,1000000], actuals: Array(12).fill(null) },
    { id: 'demo2', name: 'Satisfacción Cliente', unit: '%', annualTarget: 90, targets: [75,77,78,80,81,82,84,85,86,87,89,90], actuals: Array(12).fill(null) },
    { id: 'demo3', name: 'Retención Talento', unit: '%', annualTarget: 95, targets: [90,90,91,91,92,92,93,93,94,94,94,95], actuals: Array(12).fill(null) },
  ]);

  const [isEditing, setIsEditing]       = useState(false);
  const [aiAnalysis, setAiAnalysis]     = useState('');
  const [aiLoading, setAiLoading]       = useState(false);
  const [newRowName, setNewRowName]     = useState('');
  const [yearLabel, setYearLabel]       = useState(new Date().getFullYear().toString());

  const updateTarget = (rowIdx, monthIdx, val) => {
    setRows(prev => prev.map((r,i) => i !== rowIdx ? r : { ...r, targets: r.targets.map((t,j) => j === monthIdx ? val : t) }));
  };
  const updateActual = (rowIdx, monthIdx, val) => {
    setRows(prev => prev.map((r,i) => i !== rowIdx ? r : { ...r, actuals: r.actuals.map((a,j) => j === monthIdx ? val : a) }));
  };
  const addRow = () => {
    if (!newRowName.trim()) return;
    setRows(prev => [...prev, {
      id: 'custom-' + Date.now(), name: newRowName.trim(), unit: '%', annualTarget: 100,
      targets: Array(12).fill(null), actuals: Array(12).fill(null),
    }]);
    setNewRowName('');
  };
  const removeRow = (rowIdx) => {
    setRows(prev => prev.filter((_,i) => i !== rowIdx));
  };

  const getPct = (actual, target) => {
    if (actual === null || target === null || target === 0) return null;
    return Math.round((actual / target) * 100);
  };

  const runAIAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const summary = rows.map(r => ({
        kpi: r.name,
        actuals: r.actuals.filter(a => a !== null).length,
        lastActual: r.actuals.filter(a => a !== null).slice(-1)[0],
        lastTarget: r.targets[r.actuals.filter(a => a !== null).length - 1] || r.targets[0],
      }));
      const analysis = await groqService.chat([
        { role: 'system', content: 'Analiza la tabla Bowling Chart y genera: 1) Tendencia general, 2) Top 3 KPIs críticos, 3) Recomendaciones de aceleración. Conciso, máximo 200 palabras. En español.' },
        { role: 'user', content: 'Bowling Chart ' + yearLabel + ': ' + JSON.stringify(summary) },
      ]);
      setAiAnalysis(analysis);
    } catch (e) { notificationService.error('Error IA: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const currentMonth = new Date().getMonth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={yearLabel} onChange={e => setYearLabel(e.target.value)}
            style={{ width: 72, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, fontWeight: 700, color: 'var(--text)', background: 'var(--bg2)' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{rows.length} KPIs · Mes actual: {MONTHS[currentMonth]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsEditing(e => !e)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isEditing ? 'var(--primary)' : 'var(--bg2)', color: isEditing ? 'white' : 'var(--text)', border: '1px solid var(--border)' }}>
            {isEditing ? '✅ Listo' : '✏️ Editar'}
          </button>
          <button onClick={runAIAnalysis} disabled={aiLoading}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e0d7ff' }}>
            {aiLoading ? 'Analizando...' : '🤖 Análisis IA'}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['≥100%','#16a34a'],['80-99%','#22c55e'],['60-79%','#f59e0b'],['40-59%','#f97316'],['<40%','#dc2626'],['Sin datos','#e5e7eb']].map(([l,c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c + '44', border: '1px solid ' + c }} />
            <span style={{ color: 'var(--text3)' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid var(--border)', minWidth: 140, fontSize: 12 }}>KPI / Indicador</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border)', fontSize: 11, color: 'var(--primary)', background: '#f0f4ff' }}>Meta Anual</th>
              {MONTHS.map((m, i) => (
                <th key={m} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border)', fontSize: 11, color: i === currentMonth ? 'var(--primary)' : 'var(--text3)', background: i === currentMonth ? '#f0f4ff' : 'var(--bg2)', minWidth: 52 }}>
                  {m}
                </th>
              ))}
              {isEditing && <th style={{ border: '1px solid var(--border)', padding: '6px 4px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <React.Fragment key={row.id}>
                {/* Fila Meta */}
                <tr>
                  <td rowSpan={2} style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{row.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Unidad: {row.unit}</div>
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', background: '#f0f4ff', border: '1px solid var(--border)', fontWeight: 700, fontSize: 11, color: 'var(--primary)' }}>
                    {isEditing
                      ? <input type="number" defaultValue={row.annualTarget} onBlur={e => setRows(p => p.map((r,i) => i!==ri ? r : {...r, annualTarget: Number(e.target.value)}))}
                          style={{ width: 50, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--primary)', fontSize: 11 }} />
                      : row.annualTarget + ' ' + row.unit
                    }
                  </td>
                  {row.targets.map((t, mi) => (
                    <Cell key={mi} value={t} isTarget onChange={v => updateTarget(ri, mi, v)} isEditing={isEditing} />
                  ))}
                  {isEditing && <td rowSpan={2} style={{ border: '1px solid var(--border)', textAlign: 'center' }}>
                    <button onClick={() => removeRow(ri)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </td>}
                </tr>
                {/* Fila Real */}
                <tr>
                  <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)', background: 'var(--bg)' }}>Real</td>
                  {row.actuals.map((a, mi) => (
                    <Cell key={mi} value={getPct(a, row.targets[mi])} isTarget={false} onChange={v => updateActual(ri, mi, v)} isEditing={isEditing} />
                  ))}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agregar fila */}
      {isEditing && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="sp-input" placeholder="Nombre del nuevo KPI..." value={newRowName} onChange={e => setNewRowName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRow()}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13 }} />
          <button onClick={addRow} className="sp-btn sp-btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 700 }}>+ Agregar</button>
        </div>
      )}

      {/* Análisis IA */}
      {aiAnalysis && (
        <div style={{ padding: 18, borderRadius: 12, background: '#f5f3ff', border: '1px solid #e0d7ff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textTransform: 'uppercase' }}>🤖 Análisis Bowling Chart — Xtratia AI</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
        </div>
      )}
    </div>
  );
}
