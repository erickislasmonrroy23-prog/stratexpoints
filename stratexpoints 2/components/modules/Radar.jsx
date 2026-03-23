// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Radar Estratégico
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, AlertBox, Tabs, T,
} from "../ui/index.jsx";
import {
  SpRadarChart, SpBarChart, SpAreaChart, SpLineChart,
} from "../charts/index.jsx";
import { color, calc, fmt } from "../../utils/helpers.js";

// ── DIMENSION CARD ────────────────────────────────────────────
const DimensionCard = memo(({ dimension, index, onSelect, selected }) => {
  const isSelected = selected === dimension.id;
  const c = color.progressBar(dimension.score);

  return (
    <div
      onClick={() => onSelect(isSelected ? null : dimension.id)}
      style={{
        padding:      "13px 15px",
        borderRadius: 10,
        background:   isSelected ? `${dimension.color}12` : T.white,
        border:       `1.5px solid ${isSelected ? dimension.color : T.bdr}`,
        cursor:       "pointer",
        transition:   "all .18s",
        boxShadow:    isSelected ? `0 4px 16px ${dimension.color}25` : "none",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = dimension.color;
          e.currentTarget.style.background  = `${dimension.color}06`;
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = T.bdr;
          e.currentTarget.style.background  = T.white;
        }
      }}
    >
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:9 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            marginBottom:5 }}>
            <span style={{ fontSize:18 }}>{dimension.icon}</span>
            <span style={{ fontSize:9, fontWeight:800, padding:"1px 7px",
              borderRadius:20, background:`${dimension.color}18`,
              color:dimension.color }}>
              D{index + 1}
            </span>
          </div>
          <div style={{ fontSize:12.5, fontWeight:800, color:T.navy,
            lineHeight:1.3, fontFamily:"var(--font-display)" }}>
            {dimension.label}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
          <div style={{ fontSize:22, fontWeight:900, color:c,
            fontFamily:"var(--font-display)", lineHeight:1 }}>
            {dimension.score}
          </div>
          <div style={{ fontSize:9.5, color:T.tL }}>/ 100</div>
        </div>
      </div>

      <Bar value={dimension.score} height={6} barColor={dimension.color || c}/>

      {dimension.subDimensions && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4 }}>
          {dimension.subDimensions.slice(0, 3).map((sub, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center" }}>
              <span style={{ fontSize:10, color:T.tL, flex:1, minWidth:0,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {sub.label}
              </span>
              <span style={{ fontSize:10, fontWeight:800, color:dimension.color,
                marginLeft:8 }}>
                {sub.score}
              </span>
            </div>
          ))}
          {dimension.subDimensions.length > 3 && (
            <div style={{ fontSize:9.5, color:T.tL, textAlign:"right" }}>
              +{dimension.subDimensions.length - 3} más
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── DIMENSION DETAIL PANEL ────────────────────────────────────
const DimensionDetail = memo(({ dimension, radarData, onClose }) => {
  if (!dimension) return null;
  const c = color.progressBar(dimension.score);

  return (
    <Card sx={{ padding:"16px 18px", border:`2px solid ${dimension.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:28 }}>{dimension.icon}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:T.navy,
              fontFamily:"var(--font-display)" }}>
              {dimension.label}
            </div>
            {dimension.description && (
              <div style={{ fontSize:11, color:T.tL, marginTop:3 }}>
                {dimension.description}
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tM, fontSize:20, lineHeight:1, padding:"2px 6px" }}>×</button>
      </div>

      {/* Score hero */}
      <div style={{ display:"flex", gap:14, marginBottom:16,
        padding:"12px 14px", background:`${dimension.color}08`,
        borderRadius:10, border:`1px solid ${dimension.color}25` }}>
        <div style={{ textAlign:"center", flex:1 }}>
          <div style={{ fontSize:38, fontWeight:900, color:c,
            fontFamily:"var(--font-display)", lineHeight:1 }}>
            {dimension.score}
          </div>
          <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>Score Actual</div>
        </div>
        {dimension.previousScore != null && (
          <>
            <div style={{ width:1, background:T.bdr }}/>
            <div style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontSize:30, fontWeight:900, color:T.tL,
                fontFamily:"var(--font-display)", lineHeight:1 }}>
                {dimension.previousScore}
              </div>
              <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>
                Período Anterior
              </div>
            </div>
            <div style={{ width:1, background:T.bdr }}/>
            <div style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontSize:26, fontWeight:900,
                color: dimension.score > dimension.previousScore ? T.green : T.red,
                fontFamily:"var(--font-display)", lineHeight:1 }}>
                {dimension.score > dimension.previousScore ? "+" : ""}
                {dimension.score - dimension.previousScore}
              </div>
              <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>Variación</div>
            </div>
          </>
        )}
        <div style={{ width:1, background:T.bdr }}/>
        <div style={{ textAlign:"center", flex:1 }}>
          <div style={{ fontSize:30, fontWeight:900, color:T.navy,
            fontFamily:"var(--font-display)", lineHeight:1 }}>
            {dimension.target || 85}
          </div>
          <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>Meta</div>
        </div>
      </div>

      <Bar value={dimension.score} height={10} barColor={dimension.color || c}/>

      {/* Sub-dimensions */}
      {dimension.subDimensions?.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:10 }}>
            SUBDIMENSIONES
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {dimension.subDimensions.map((sub, i) => {
              const sc = color.progressBar(sub.score);
              return (
                <div key={i} style={{ padding:"8px 12px", background:T.bg,
                  borderRadius:8, border:`1px solid ${T.bdr}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:11.5, fontWeight:700,
                      color:T.navy }}>{sub.label}</span>
                    <span style={{ fontSize:13, fontWeight:900,
                      color:sc }}>{sub.score}</span>
                  </div>
                  <Bar value={sub.score} height={5} barColor={sc}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {dimension.actions?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            ACCIONES RECOMENDADAS
          </div>
          {dimension.actions.map((action, i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:7,
              padding:"7px 10px", background:`${T.teal}08`, borderRadius:7,
              border:`1px solid ${T.teal}20` }}>
              <span style={{ fontSize:14, flexShrink:0 }}>
                {action.priority === "high" ? "🚨" :
                 action.priority === "medium" ? "⚠️" : "ℹ️"}
              </span>
              <span style={{ fontSize:11.5, color:T.navy, lineHeight:1.4 }}>
                {action.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

// ── COMPARISON RADAR ──────────────────────────────────────────
const ComparisonRadar = memo(({ radarData, perspectives }) => {
  const [mode, setMode] = useState("periods");

  // Period comparison data
  const periodData = useMemo(() =>
    (radarData?.dimensions || []).map(d => ({
      dimension:  d.label.substring(0, 18),
      "Q1 2024":  d.previousScore || Math.round(d.score * 0.85),
      "Q1 2025":  d.score,
      Meta:       d.target || 85,
    })),
  [radarData]);

  // Perspective comparison data
  const perspData = useMemo(() =>
    (perspectives || []).map(p => {
      const dims = (radarData?.dimensions || []).filter(d => d.perspectiveId === p.id);
      const avg  = dims.length
        ? Math.round(dims.reduce((s,d) => s+d.score, 0) / dims.length)
        : Math.round(55 + Math.random() * 35);
      return {
        dimension:  p.label.substring(0, 16),
        Actual:     avg,
        Meta:       85,
      };
    }),
  [radarData, perspectives]);

  const chartData = mode === "periods" ? periodData : perspData;
  const series    = mode === "periods"
    ? [
        { key:"Q1 2024", label:"Q1 2024",  color:T.tL,   fillOpacity:0.1 },
        { key:"Q1 2025", label:"Q1 2025",  color:T.teal, fillOpacity:0.2 },
        { key:"Meta",    label:"Meta",     color:T.gold, fillOpacity:0.05},
      ]
    : [
        { key:"Actual",  label:"Actual",   color:T.teal, fillOpacity:0.2 },
        { key:"Meta",    label:"Meta",     color:T.gold, fillOpacity:0.05},
      ];

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)" }}>
            Radar Comparativo
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
            {mode === "periods" ? "Comparación entre períodos" : "Por perspectiva BSC"}
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[
            { id:"periods",      label:"📅 Períodos"    },
            { id:"perspectives", label:"🗺️ Perspectivas" },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{
                padding:    "5px 12px",
                borderRadius:20,
                fontSize:   11,
                fontWeight: 700,
                border:     `1.5px solid ${mode===m.id ? T.teal : T.bdr}`,
                background: mode===m.id ? `${T.teal}15` : "transparent",
                color:      mode===m.id ? T.teal : T.tM,
                cursor:     "pointer",
                transition: "all .15s",
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <SpRadarChart
        data={chartData}
        height={300}
        angleKey="dimension"
        series={series}
      />
    </Card>
  );
});

// ── SCORE BARS ────────────────────────────────────────────────
const ScoreBars = memo(({ dimensions }) => {
  const sorted = [...(dimensions || [])].sort((a,b) => b.score - a.score);

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        📊 Ranking de Dimensiones
      </div>
      {sorted.map((dim, i) => {
        const c   = dim.color || color.progressBar(dim.score);
        const tl  = dim.score >= 80 ? "✅" : dim.score >= 60 ? "⚠️" : "🚨";
        const gap = (dim.target || 85) - dim.score;
        return (
          <div key={dim.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9.5, fontWeight:800, color:T.tL,
                  minWidth:18 }}>#{i+1}</span>
                <span style={{ fontSize:14 }}>{dim.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                  {dim.label}
                </span>
                <span style={{ fontSize:12 }}>{tl}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {gap > 0 && (
                  <span style={{ fontSize:10, color:T.tL }}>
                    GAP: -{gap}
                  </span>
                )}
                <span style={{ fontSize:14, fontWeight:900, color:c }}>
                  {dim.score}
                </span>
              </div>
            </div>
            <div style={{ position:"relative", height:8,
              background:"#e6ecf5", borderRadius:99, overflow:"visible" }}>
              <div style={{ height:"100%", width:`${dim.score}%`,
                background:c, borderRadius:99,
                transition:"width .5s ease" }}/>
              {/* Target marker */}
              <div style={{
                position:  "absolute",
                top:       -3,
                left:      `${dim.target || 85}%`,
                width:     2,
                height:    14,
                background:T.navy,
                borderRadius:2,
                opacity:   0.4,
              }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginTop:3 }}>
              <span style={{ fontSize:9.5, color:T.tL }}>
                {dim.subDimensions?.length || 0} subdimensiones
              </span>
              <span style={{ fontSize:9.5, color:T.tL }}>
                Meta: {dim.target || 85}
              </span>
            </div>
          </div>
        );
      })}
    </Card>
  );
});

// ── EVOLUTION CHART ───────────────────────────────────────────
const EvolutionChart = memo(({ dimensions }) => {
  const [selected, setSelected] = useState(
    dimensions?.slice(0,3).map(d => d.id) || []
  );

  const toggle = (id) => setSelected(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
  );

  // Simulated evolution data (6 quarters)
  const quarters = ["Q1'23","Q2'23","Q3'23","Q4'23","Q1'24","Q2'24","Q3'24","Q4'24","Q1'25"];
  const chartData = quarters.map((q, qi) => {
    const row = { name:q };
    (dimensions || []).forEach(d => {
      if (selected.includes(d.id)) {
        const base  = d.previousScore || Math.round(d.score * 0.75);
        const noise = Math.round((Math.random() - 0.4) * 8);
        row[d.label] = Math.min(100, Math.max(20,
          Math.round(base + (d.score - base) * qi / (quarters.length - 1) + noise)
        ));
      }
    });
    return row;
  });

  const lines = (dimensions || [])
    .filter(d => selected.includes(d.id))
    .map(d => ({
      key:   d.label,
      label: d.label,
      color: d.color || color.progressBar(d.score),
    }));

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)" }}>
            📈 Evolución Histórica
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
            Tendencia trimestral por dimensión
          </div>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {(dimensions || []).map(d => (
            <button key={d.id} onClick={() => toggle(d.id)}
              style={{
                padding:    "3px 9px",
                borderRadius:20,
                fontSize:   10,
                fontWeight: 700,
                border:     `1.5px solid ${selected.includes(d.id)
                  ? (d.color || T.teal) : T.bdr}`,
                background: selected.includes(d.id)
                  ? `${d.color || T.teal}18` : "transparent",
                color:      selected.includes(d.id)
                  ? (d.color || T.teal) : T.tL,
                cursor:     "pointer",
                transition: "all .15s",
              }}>
              {d.icon} {d.label.substring(0, 12)}
            </button>
          ))}
        </div>
      </div>

      {lines.length > 0
        ? (
          <SpLineChart
            data={chartData}
            height={240}
            xKey="name"
            lines={lines}
          />
        )
        : (
          <div style={{ height:240, display:"flex", alignItems:"center",
            justifyContent:"center", color:T.tL, fontSize:12 }}>
            Selecciona al menos una dimensión para ver su evolución
          </div>
        )
      }
    </Card>
  );
});

// ── RADAR SUMMARY STATS ───────────────────────────────────────
const RadarSummaryStats = memo(({ dimensions }) => {
  const dims      = dimensions || [];
  const total     = dims.length;
  const avgScore  = total
    ? Math.round(dims.reduce((s,d) => s+d.score, 0) / total)
    : 0;
  const strong    = dims.filter(d => d.score >= 80).length;
  const critical  = dims.filter(d => d.score < 60).length;
  const maxGap    = total
    ? Math.max(...dims.map(d => (d.target||85) - d.score))
    : 0;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Dimensiones"   value={total}      sub="Evaluadas"           icon="🕸️" color={T.navy}/>
      <StatCard label="Score Global"  value={avgScore}   sub="Promedio general"    icon="📊" color={color.progressBar(avgScore)}/>
      <StatCard label="Fortalezas"    value={strong}     sub="Score ≥ 80"          icon="💪" color={T.green}/>
      <StatCard label="Brecha Máx."   value={maxGap}     sub="Puntos a mejorar"    icon="🎯" color={maxGap > 20 ? T.red : "#d97706"}/>
    </div>
  );
});

// ── MAIN RADAR ────────────────────────────────────────────────
const Radar = memo(({ onNavigate }) => {
  const { radarData, perspectives, okrs } = useApp();

  const [tab,      setTab]      = useState("radar");
  const [selected, setSelected] = useState(null);

  const dimensions = useMemo(() => {
    if (radarData?.dimensions) return radarData.dimensions;
    // Fallback: build from perspectives
    return (perspectives || []).map((p, i) => ({
      id:            p.id,
      label:         p.label,
      icon:          p.icon,
      score:         Math.round(55 + Math.random() * 35),
      previousScore: Math.round(45 + Math.random() * 30),
      target:        85,
      color:         p.color,
      perspectiveId: p.id,
      description:   `Desempeño en perspectiva ${p.label}`,
      subDimensions: [],
      actions:       [],
    }));
  }, [radarData, perspectives]);

  // Main radar data
  const mainRadarData = useMemo(() =>
    dimensions.map(d => ({
      dimension:    d.label.substring(0, 20),
      "Actual":     d.score,
      "Anterior":   d.previousScore || Math.round(d.score * 0.85),
      "Meta":       d.target || 85,
    })),
  [dimensions]);

  const selectedDim = useMemo(() =>
    dimensions.find(d => d.id === selected),
  [dimensions, selected]);

  const TABS = [
    { id:"radar",     label:"🕸️ Radar Principal" },
    { id:"ranking",   label:"📊 Ranking"          },
    { id:"evolution", label:"📈 Evolución"        },
    { id:"compare",   label:"⚖️ Comparativo"      },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🕸️ Radar Estratégico"
        subtitle="Evaluación multidimensional · Fortalezas y brechas estratégicas"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("benchmark")}>
              📈 Benchmark
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("kpi")}>
              📊 KPIs
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <RadarSummaryStats dimensions={dimensions}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── RADAR TAB ── */}
      {tab === "radar" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Main radar */}
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpRadarChart
                data={mainRadarData}
                title="Radar Estratégico Global"
                subtitle="Actual vs Anterior vs Meta"
                height={340}
                angleKey="dimension"
                series={[
                  { key:"Anterior", label:"Período Anterior", color:T.tL,   fillOpacity:0.08 },
                  { key:"Meta",     label:"Meta",             color:T.gold, fillOpacity:0.08 },
                  { key:"Actual",   label:"Actual",           color:T.teal, fillOpacity:0.2  },
                ]}
              />
            </Card>

            {/* Dimension cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {dimensions.map((d, i) => (
                <DimensionCard
                  key={d.id}
                  dimension={d}
                  index={i}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>

          {/* Detail panel */}
          {selectedDim && (
            <DimensionDetail
              dimension={selectedDim}
              radarData={radarData}
              onClose={() => setSelected(null)}
            />
          )}

          {/* Gap analysis */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
              fontFamily:"var(--font-display)" }}>
              🎯 Análisis de Brechas
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
              gap:10 }}>
              {dimensions.map((d, i) => {
                const gap  = (d.target || 85) - d.score;
                const pct  = Math.max(0, gap);
                const c    = pct === 0 ? T.green : pct <= 10 ? "#d97706" : T.red;
                return (
                  <div key={d.id} style={{ padding:"10px 12px", background:T.bg,
                    borderRadius:9, border:`1px solid ${T.bdr}` }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:6, marginBottom:6 }}>
                      <span style={{ fontSize:14 }}>{d.icon}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:T.navy,
                        flex:1, minWidth:0, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {d.label}
                      </span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:5 }}>
                      <span style={{ fontSize:10, color:T.tL }}>Brecha</span>
                      <span style={{ fontSize:14, fontWeight:900, color:c }}>
                        {gap <= 0 ? "✅ Meta" : `-${gap} pts`}
                      </span>
                    </div>
                    {gap > 0 && (
                      <div style={{ height:5, background:"#e6ecf5",
                        borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%",
                          width:`${Math.min(100, pct / (d.target||85) * 100)}%`,
                          background:c, borderRadius:99 }}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── RANKING TAB ── */}
      {tab === "ranking" && (
        <div className="sp-grid-2">
          <ScoreBars dimensions={dimensions}/>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Strengths */}
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.green,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                💪 Fortalezas (Score ≥ 80)
              </div>
              {dimensions.filter(d => d.score >= 80).length === 0
                ? <div style={{ fontSize:12, color:T.tL }}>
                    Sin dimensiones en fortaleza aún
                  </div>
                : dimensions.filter(d => d.score >= 80).map(d => (
                  <div key={d.id} style={{ display:"flex", alignItems:"center",
                    gap:8, marginBottom:8, padding:"8px 10px",
                    background:"#d1fae5", borderRadius:8 }}>
                    <span style={{ fontSize:16 }}>{d.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#065f46",
                      flex:1 }}>{d.label}</span>
                    <span style={{ fontSize:14, fontWeight:900,
                      color:T.green }}>{d.score}</span>
                  </div>
                ))
              }
            </Card>

            {/* Areas of improvement */}
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.red,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                🚨 Áreas de Mejora (Score &lt; 60)
              </div>
              {dimensions.filter(d => d.score < 60).length === 0
                ? <div style={{ fontSize:12, color:T.tL }}>
                    Sin dimensiones críticas ✅
                  </div>
                : dimensions.filter(d => d.score < 60).map(d => (
                  <div key={d.id} style={{ display:"flex", alignItems:"center",
                    gap:8, marginBottom:8, padding:"8px 10px",
                    background:"#fee2e2", borderRadius:8 }}>
                    <span style={{ fontSize:16 }}>{d.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#b91c1c",
                      flex:1 }}>{d.label}</span>
                    <span style={{ fontSize:14, fontWeight:900,
                      color:T.red }}>{d.score}</span>
                  </div>
                ))
              }
            </Card>

            {/* Summary donut grid */}
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                Distribución de Scores
              </div>
              <SpBarChart
                data={[
                  { range:"< 60",   count:dimensions.filter(d=>d.score<60).length },
                  { range:"60–79",  count:dimensions.filter(d=>d.score>=60&&d.score<80).length },
                  { range:"≥ 80",   count:dimensions.filter(d=>d.score>=80).length },
                ]}
                height={180}
                xKey="range"
                bars={[{ key:"count", label:"Dimensiones", color:T.teal }]}
                showValues
              />
            </Card>
          </div>
        </div>
      )}

      {/* ── EVOLUTION TAB ── */}
      {tab === "evolution" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <EvolutionChart dimensions={dimensions}/>

          {/* Period vs period table */}
          <Card>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdr}` }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                fontFamily:"var(--font-display)" }}>
                📋 Variación vs Período Anterior
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Dimensión</th>
                    <th>Período Ant.</th>
                    <th>Actual</th>
                    <th>Variación</th>
                    <th>Meta</th>
                    <th>Brecha</th>
                    <th>Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map(d => {
                    const prev    = d.previousScore || Math.round(d.score * 0.85);
                    const delta   = d.score - prev;
                    const gap     = (d.target || 85) - d.score;
                    const tl      = color.progressBar(d.score);
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center",
                            gap:7 }}>
                            <span style={{ fontSize:16 }}>{d.icon}</span>
                            <span style={{ fontSize:12, fontWeight:700,
                              color:T.navy }}>{d.label}</span>
                          </div>
                        </td>
                        <td style={{ textAlign:"center", fontSize:13,
                          fontWeight:700, color:T.tM }}>
                          {prev}
                        </td>
                        <td style={{ textAlign:"center", fontSize:14,
                          fontWeight:900, color:tl }}>
                          {d.score}
                        </td>
                        <td style={{ textAlign:"center" }}>
                          <span style={{
                            fontSize:13, fontWeight:800,
                            color: delta > 0 ? T.green : delta < 0 ? T.red : T.tM,
                          }}>
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        </td>
                        <td style={{ textAlign:"center", fontSize:12,
                          color:T.tM }}>{d.target || 85}</td>
                        <td style={{ textAlign:"center" }}>
                          <span style={{ fontSize:12, fontWeight:700,
                            color: gap <= 0 ? T.green : gap <= 10 ? "#d97706" : T.red }}>
                            {gap <= 0 ? "✅" : `-${gap}`}
                          </span>
                        </td>
                        <td style={{ textAlign:"center", fontSize:18 }}>
                          {delta > 3 ? "↑" : delta < -3 ? "↓" : "→"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── COMPARE TAB ── */}
      {tab === "compare" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <ComparisonRadar radarData={radarData} perspectives={perspectives}/>

          {/* Side by side bars */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={dimensions.map(d => ({
                name:       d.label.substring(0, 16),
                "Q1 2024":  d.previousScore || Math.round(d.score * 0.85),
                "Q1 2025":  d.score,
                Meta:       d.target || 85,
              }))}
              title="Comparativo Períodos — Todas las Dimensiones"
              subtitle="Evolución Q1 2024 → Q1 2025 vs Meta"
              height={280}
              xKey="name"
              bars={[
                { key:"Q1 2024", color:`${T.tL}`,  label:"Q1 2024" },
                { key:"Q1 2025", color:T.teal,     label:"Q1 2025" },
                { key:"Meta",    color:`${T.gold}88`, label:"Meta"  },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
});

export default Radar;
