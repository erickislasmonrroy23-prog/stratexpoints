// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Bowling Chart
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, AlertBox, EmptyState, Tabs, T,
} from "../ui/index.jsx";
import { SpLineChart, SpBarChart, SpAreaChart } from "../charts/index.jsx";
import { color, calc, fmt } from "../../utils/helpers.js";
import { MONTHS } from "../../data/mockData.js";

// ── CONSTANTES ────────────────────────────────────────────────
const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun",
                      "Jul","Ago","Sep","Oct","Nov","Dic"];

// ── CELDA EDITABLE ────────────────────────────────────────────
const BowlingCell = memo(({ value, target, inverse = false, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(value ?? "");

  const key = value == null ? "empty"
    : color.trafficLightKey(value, target, inverse);

  const cfg = {
    green:  { bg:"#d1fae5", c:"#065f46", border:"#6ee7b7" },
    yellow: { bg:"#fef3c7", c:"#92400e", border:"#fcd34d" },
    red:    { bg:"#fee2e2", c:"#b91c1c", border:"#fca5a5" },
    empty:  { bg:T.bg,      c:T.tL,     border:T.bdr      },
  };
  const s = cfg[key];

  const save = () => {
    const num = parseFloat(val);
    if (!isNaN(num)) onEdit(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <td style={{ padding:0 }}>
        <input
          type="number"
          value={val}
          autoFocus
          onChange={e => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === "Enter")  save();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            width:"100%", height:"100%",
            minWidth:54, padding:"6px 4px",
            textAlign:"center", fontSize:12, fontWeight:800,
            border:`2px solid ${T.teal}`,
            borderRadius:0, background:"#f0fffe",
            color:T.navy, outline:"none",
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => setEditing(true)}
      title={value == null ? "Click para ingresar valor" : `Valor: ${value} / Meta: ${target}`}
      style={{
        background:  s.bg,
        color:       s.c,
        border:      `1px solid ${s.border}`,
        textAlign:   "center",
        fontSize:    12,
        fontWeight:  800,
        padding:     "6px 4px",
        cursor:      "pointer",
        transition:  "filter .12s",
        minWidth:    54,
        userSelect:  "none",
      }}
      onMouseEnter={e => e.currentTarget.style.filter = "brightness(.94)"}
      onMouseLeave={e => e.currentTarget.style.filter = "none"}
    >
      {value == null ? "—" : value}
    </td>
  );
});

// ── TARGET CELL ───────────────────────────────────────────────
const TargetCell = memo(({ value, unit }) => (
  <td style={{
    background: `${T.navy}10`,
    color:      T.navy,
    textAlign:  "center",
    fontSize:   11,
    fontWeight: 800,
    padding:    "6px 4px",
    borderRight:`2px solid ${T.navy}25`,
    minWidth:   54,
  }}>
    {value}{unit}
  </td>
));

// ── ROW SUMMARY ───────────────────────────────────────────────
const RowSummary = memo(({ values, target, inverse }) => {
  const valid  = values.filter(v => v != null);
  if (!valid.length) return (
    <td style={{ textAlign:"center", fontSize:11, color:T.tL, padding:"6px 8px" }}>—</td>
  );

  const last   = valid[valid.length - 1];
  const avg    = Math.round(valid.reduce((s,v) => s+v, 0) / valid.length * 10) / 10;
  const pct    = calc.progress(last, target, inverse);
  const tl     = color.trafficLight(last, target, inverse);

  return (
    <td style={{ padding:"4px 8px", minWidth:100 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:T.tL }}>Últ: </span>
          <span style={{ fontSize:12, fontWeight:900, color:tl.color }}>{last}</span>
        </div>
        <Bar value={pct} height={5} barColor={tl.color}/>
        <span style={{ fontSize:9.5, color:T.tL, textAlign:"right" }}>
          Prom: {avg}
        </span>
      </div>
    </td>
  );
});

// ── BOWLING TABLE ─────────────────────────────────────────────
const BowlingTable = memo(({ data, perspectives, onUpdate }) => {
  const [collapsedPersp, setCollapsedPersp] = useState({});

  const togglePersp = (id) =>
    setCollapsedPersp(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ overflowX:"auto", borderRadius:10,
      border:`1px solid ${T.bdr}`, background:T.white }}>
      <table style={{ borderCollapse:"collapse", width:"100%", minWidth:900 }}>
        {/* Header */}
        <thead>
          <tr>
            <th style={{
              background:T.navy, color:"#fff", padding:"10px 14px",
              textAlign:"left", fontSize:11, fontWeight:800,
              position:"sticky", left:0, zIndex:2, minWidth:200,
              borderRadius:"10px 0 0 0",
            }}>
              KPI / Indicador
            </th>
            <th style={{
              background:T.navy, color:"#fff", padding:"10px 6px",
              fontSize:10, fontWeight:800, textAlign:"center", minWidth:58,
            }}>
              Meta
            </th>
            {MONTH_LABELS.map((m, i) => (
              <th key={i} style={{
                background:  T.navy,
                color:       "#fff",
                padding:     "10px 4px",
                fontSize:    10,
                fontWeight:  800,
                textAlign:   "center",
                minWidth:    54,
                opacity:     i >= new Date().getMonth() ? .45 : 1,
              }}>
                {m}
              </th>
            ))}
            <th style={{
              background:T.navy, color:"#fff", padding:"10px 8px",
              fontSize:10, fontWeight:800, textAlign:"center",
              minWidth:110, borderRadius:"0 10px 0 0",
            }}>
              Resumen
            </th>
          </tr>
        </thead>

        <tbody>
          {perspectives.map(persp => {
            const rows = data.filter(r => r.perspectiveId === persp.id);
            if (!rows.length) return null;
            const isCollapsed = collapsedPersp[persp.id];

            return [
              /* Perspective group header */
              <tr key={`hdr-${persp.id}`}>
                <td colSpan={15} style={{
                  background:    persp.bg,
                  borderTop:     `2px solid ${persp.color}`,
                  borderBottom:  `1px solid ${persp.border}`,
                  padding:       "7px 14px",
                  cursor:        "pointer",
                  userSelect:    "none",
                  position:      "sticky",
                  left:          0,
                }}
                  onClick={() => togglePersp(persp.id)}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:15 }}>{persp.icon}</span>
                    <span style={{ fontSize:11.5, fontWeight:800, color:persp.color,
                      letterSpacing:".05em" }}>
                      {persp.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize:10, color:T.tL }}>
                      {rows.length} indicadores
                    </span>
                    <span style={{ marginLeft:"auto", fontSize:12, color:persp.color }}>
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                  </div>
                </td>
              </tr>,

              /* KPI rows */
              ...(!isCollapsed ? rows.map((row, ri) => (
                <tr key={`${persp.id}-${ri}`}
                  style={{ borderBottom:`1px solid ${T.bdr}` }}>
                  {/* KPI name */}
                  <td style={{
                    padding:    "7px 14px",
                    fontSize:   11.5,
                    fontWeight: 700,
                    color:      T.navy,
                    background: ri % 2 === 0 ? T.white : "#fafbfd",
                    position:   "sticky",
                    left:       0,
                    zIndex:     1,
                    borderRight:`1px solid ${T.bdr}`,
                    maxWidth:   200,
                  }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }}>
                      {row.name}
                    </div>
                    <div style={{ fontSize:9.5, color:T.tL, marginTop:1 }}>
                      {row.unit} · {row.type}
                    </div>
                  </td>

                  {/* Target */}
                  <TargetCell value={row.target} unit={row.unit}/>

                  {/* Monthly cells */}
                  {MONTH_LABELS.map((_, mi) => (
                    <BowlingCell
                      key={mi}
                      value={row.values[mi] ?? null}
                      target={row.target}
                      inverse={row.inverse}
                      onEdit={v => onUpdate(row.kpiId, mi, v)}
                    />
                  ))}

                  {/* Summary */}
                  <RowSummary
                    values={row.values}
                    target={row.target}
                    inverse={row.inverse}
                  />
                </tr>
              )) : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
});

// ── LEGEND ────────────────────────────────────────────────────
const Legend = memo(() => (
  <div style={{ display:"flex", gap:14, alignItems:"center",
    flexWrap:"wrap", marginBottom:14 }}>
    <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>Semáforo:</span>
    {[
      { c:"#d1fae5", bc:"#6ee7b7", tc:"#065f46", l:"✅ En Meta (≥100%)"   },
      { c:"#fef3c7", bc:"#fcd34d", tc:"#92400e", l:"⚠️ En Riesgo (80–99%)" },
      { c:"#fee2e2", bc:"#fca5a5", tc:"#b91c1c", l:"🚨 Fuera Meta (<80%)"  },
      { c:T.bg,      bc:T.bdr,    tc:T.tL,      l:"— Sin dato"            },
    ].map((s, i) => (
      <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
        <div style={{ width:20, height:16, borderRadius:4,
          background:s.c, border:`1px solid ${s.bc}` }}/>
        <span style={{ fontSize:10.5, color:s.tc, fontWeight:600 }}>{s.l}</span>
      </div>
    ))}
    <span style={{ fontSize:10.5, color:T.tL, marginLeft:6 }}>
      · Click en celda para editar valor
    </span>
  </div>
));

// ── BOWLING SUMMARY STATS ─────────────────────────────────────
const BowlingSummary = memo(({ data }) => {
  const allValues = data.flatMap(r =>
    r.values.filter(v => v != null).map(v => ({
      v, t: r.target, inv: r.inverse,
    }))
  );

  const green  = allValues.filter(x => color.trafficLightKey(x.v, x.t, x.inv) === "green").length;
  const yellow = allValues.filter(x => color.trafficLightKey(x.v, x.t, x.inv) === "yellow").length;
  const red    = allValues.filter(x => color.trafficLightKey(x.v, x.t, x.inv) === "red").length;
  const total  = allValues.length;
  const pctOk  = total ? Math.round(green / total * 100) : 0;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Celdas Totales"  value={total}  sub="Con dato registrado" icon="📋" color={T.navy}/>
      <StatCard label="En Meta"         value={green}  sub={`${total?Math.round(green/total*100):0}% del total`}  icon="✅" color={T.green}/>
      <StatCard label="En Riesgo"       value={yellow} sub={`${total?Math.round(yellow/total*100):0}% del total`} icon="⚠️" color="#d97706"/>
      <StatCard label="Fuera de Meta"   value={red}    sub={`${total?Math.round(red/total*100):0}% del total`}    icon="🚨" color={T.red}/>
    </div>
  );
});

// ── TREND PANEL ───────────────────────────────────────────────
const TrendPanel = memo(({ data, perspectives }) => {
  const [selected, setSelected] = useState(data[0]?.kpiId || "");
  const row = data.find(r => r.kpiId === selected);

  const chartData = useMemo(() => {
    if (!row) return [];
    return MONTH_LABELS.map((m, i) => ({
      name:  m,
      Valor: row.values[i] ?? null,
      Meta:  row.target,
    })).filter(d => d.Valor !== null);
  }, [row]);

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:13, fontWeight:800, color:T.navy,
          fontFamily:"var(--font-display)" }}>
          📈 Tendencia Individual
        </div>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
            fontSize:12, color:T.txt, background:T.white, maxWidth:280 }}>
          {perspectives.map(p => (
            <optgroup key={p.id} label={`${p.icon} ${p.label}`}>
              {data.filter(r => r.perspectiveId === p.id).map(r => (
                <option key={r.kpiId} value={r.kpiId}>{r.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {row && (
        <>
          <div style={{ display:"flex", gap:16, marginBottom:12,
            flexWrap:"wrap" }}>
            <div style={{ fontSize:11, color:T.tL }}>
              <strong style={{ color:T.navy }}>Meta:</strong> {row.target}{row.unit}
            </div>
            <div style={{ fontSize:11, color:T.tL }}>
              <strong style={{ color:T.navy }}>Tipo:</strong> {row.type}
            </div>
            <div style={{ fontSize:11, color:T.tL }}>
              <strong style={{ color:T.navy }}>Datos:</strong>{" "}
              {row.values.filter(v=>v!=null).length} / 12 meses
            </div>
          </div>

          {chartData.length > 0
            ? (
              <SpLineChart
                data={chartData}
                height={220}
                xKey="name"
                lines={[
                  { key:"Valor", label:row.name,  color:T.teal, width:2.5 },
                  { key:"Meta",  label:"Meta",    color:T.bdr,  width:1.5, dashed:true },
                ]}
              />
            )
            : (
              <EmptyState icon="📊" title="Sin datos históricos"
                description="Ingresa valores en la tabla bowling para ver la tendencia"/>
            )
          }
        </>
      )}
    </Card>
  );
});

// ── HEAT MAP ──────────────────────────────────────────────────
const HeatMap = memo(({ data, perspectives }) => {
  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        🌡️ Mapa de Calor — Desempeño Anual
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:700 }}>
          <thead>
            <tr>
              <th style={{ padding:"6px 10px", textAlign:"left", fontSize:10,
                fontWeight:800, color:T.tM, minWidth:160 }}>KPI</th>
              {MONTH_LABELS.map((m, i) => (
                <th key={i} style={{ padding:"6px 4px", fontSize:10, fontWeight:800,
                  color:T.tM, textAlign:"center", minWidth:44 }}>{m}</th>
              ))}
              <th style={{ padding:"6px 8px", fontSize:10, fontWeight:800,
                color:T.tM, textAlign:"center" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => {
              const greenCount = row.values.filter((v,i) =>
                v!=null && color.trafficLightKey(v, row.target, row.inverse)==="green"
              ).length;
              const filled = row.values.filter(v=>v!=null).length;
              const score  = filled ? Math.round(greenCount/filled*100) : 0;

              return (
                <tr key={ri} style={{ borderBottom:`1px solid ${T.bdr}` }}>
                  <td style={{ padding:"5px 10px", fontSize:11, fontWeight:700,
                    color:T.navy, maxWidth:160, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {row.name}
                  </td>
                  {MONTH_LABELS.map((_, mi) => {
                    const v   = row.values[mi];
                    const key = v == null ? "empty"
                      : color.trafficLightKey(v, row.target, row.inverse);
                    const bg  = key==="green"?"#d1fae5":key==="yellow"?"#fef3c7":
                                key==="red"?"#fee2e2":T.bg;
                    const tc  = key==="green"?"#065f46":key==="yellow"?"#92400e":
                                key==="red"?"#b91c1c":T.tL;
                    return (
                      <td key={mi} style={{
                        background: bg, color: tc,
                        textAlign:"center", fontSize:10, fontWeight:700,
                        padding:"5px 2px", minWidth:44,
                        border:`1px solid ${T.bdr}`,
                      }}>
                        {v ?? ""}
                      </td>
                    );
                  })}
                  <td style={{ padding:"5px 8px", textAlign:"center" }}>
                    <div style={{
                      display:"inline-flex", alignItems:"center",
                      justifyContent:"center",
                      width:38, height:22, borderRadius:20,
                      background: score>=80?"#d1fae5":score>=60?"#fef3c7":"#fee2e2",
                      color:      score>=80?"#065f46":score>=60?"#92400e":"#b91c1c",
                      fontSize:10, fontWeight:800,
                    }}>
                      {score}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ── MAIN BOWLING ──────────────────────────────────────────────
const Bowling = memo(({ onNavigate }) => {
  const {
    bowlingData, perspectives, kpis,
    updateBowling,
  } = useApp();

  const [tab, setTab] = useState("bowling");

  // Build bowling rows from kpis + bowlingData
  const rows = useMemo(() => {
    return kpis.map(kpi => ({
      kpiId:         kpi.id,
      name:          kpi.name,
      unit:          kpi.unit,
      type:          kpi.type,
      target:        kpi.target,
      inverse:       kpi.inverse || false,
      perspectiveId: kpi.perspectiveId,
      values:        bowlingData[kpi.id] || Array(12).fill(null),
    }));
  }, [kpis, bowlingData]);

  const handleUpdate = useCallback((kpiId, monthIndex, value) => {
    updateBowling(kpiId, monthIndex, value);
  }, [updateBowling]);

  const TABS = [
    { id:"bowling",  label:"🎳 Tabla Bowling" },
    { id:"heatmap",  label:"🌡️ Mapa de Calor" },
    { id:"trend",    label:"📈 Tendencia"     },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🎳 Bowling Chart"
        subtitle="Seguimiento mensual de KPIs · Edición en línea por celda"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("kpi")}>
              📊 Ver KPIs
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("prediction")}>
              🔮 Predicciones
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <BowlingSummary data={rows}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── BOWLING TAB ── */}
      {tab === "bowling" && (
        <>
          <Legend/>
          <BowlingTable
            data={rows}
            perspectives={perspectives}
            onUpdate={handleUpdate}
          />

          {/* Instructions */}
          <div style={{ marginTop:12, padding:"10px 14px",
            background:`${T.teal}08`, borderRadius:9,
            border:`1px solid ${T.teal}25`, display:"flex",
            gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:18 }}>💡</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.navy, marginBottom:3 }}>
                Cómo usar el Bowling Chart
              </div>
              <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
                Haz clic en cualquier celda para ingresar o editar el valor del mes.
                El semáforo se actualiza automáticamente comparando con la meta del KPI.
                Los grupos de perspectivas se pueden colapsar con el botón ▼.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── HEATMAP TAB ── */}
      {tab === "heatmap" && (
        <HeatMap data={rows} perspectives={perspectives}/>
      )}

      {/* ── TREND TAB ── */}
      {tab === "trend" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <TrendPanel data={rows} perspectives={perspectives}/>

          {/* Monthly performance bar */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
              fontFamily:"var(--font-display)" }}>
              📊 Desempeño Global por Mes
            </div>
            <SpBarChart
              data={MONTH_LABELS.map((m, mi) => {
                const monthVals = rows.map(r => ({
                  v: r.values[mi], t: r.target, inv: r.inverse,
                })).filter(x => x.v != null);

                const green  = monthVals.filter(x =>
                  color.trafficLightKey(x.v, x.t, x.inv) === "green").length;
                const pct    = monthVals.length
                  ? Math.round(green / monthVals.length * 100) : 0;

                return { name:m, "KPIs en Meta":pct };
              })}
              height={240}
              xKey="name"
              bars={[{ key:"KPIs en Meta", color:T.teal, label:"% KPIs en Meta" }]}
              showValues
            />
          </Card>
        </div>
      )}
    </div>
  );
});

export default Bowling;
```

---

✅ **Bowling.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    ├── KPI.jsx
    └── Bowling.jsx    ← nueva
