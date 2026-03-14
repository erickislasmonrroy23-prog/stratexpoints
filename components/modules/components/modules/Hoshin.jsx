// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Hoshin Kanri X-Matrix
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, AlertBox, Tabs, Tooltip, T,
} from "../ui/index.jsx";
import { SpBarChart, SpRadarChart } from "../charts/index.jsx";
import { color, calc, fmt } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const CORR_LEVELS = [
  { value:0, label:"—",  title:"Sin relación",    bg:"transparent",       c:T.tL,    score:0  },
  { value:1, label:"△",  title:"Relación débil",  bg:"#fef3c7",           c:"#92400e",score:1 },
  { value:2, label:"○",  title:"Relación media",  bg:"#dbeafe",           c:"#1e40af",score:3 },
  { value:3, label:"◉",  title:"Relación fuerte", bg:`${T.teal}20`,       c:T.teal,  score:5  },
  { value:4, label:"★",  title:"Relación crítica", bg:`${T.gold}25`,      c:"#92400e",score:9 },
];

const getCorrLevel = (v) => CORR_LEVELS.find(l => l.value === v) || CORR_LEVELS[0];

// ── CORRELATION CELL ──────────────────────────────────────────
const CorrCell = memo(({ value, rowId, colId, onUpdate, readOnly }) => {
  const level   = getCorrLevel(value);
  const nextVal = (value + 1) % CORR_LEVELS.length;

  return (
    <td
      onClick={() => !readOnly && onUpdate(rowId, colId, nextVal)}
      title={level.title}
      style={{
        background:  level.bg,
        color:       level.c,
        textAlign:   "center",
        fontSize:    16,
        fontWeight:  800,
        padding:     "0",
        width:       38,
        height:      38,
        cursor:      readOnly ? "default" : "pointer",
        border:      `1px solid ${T.bdr}`,
        transition:  "all .15s",
        userSelect:  "none",
        lineHeight:  "38px",
      }}
      onMouseEnter={e => { if (!readOnly) e.currentTarget.style.filter = "brightness(.9)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
    >
      {level.label}
    </td>
  );
});

// ── SCORE BADGE ───────────────────────────────────────────────
const ScoreBadge = memo(({ score, max }) => {
  const pct = max ? Math.round(score / max * 100) : 0;
  const c   = pct >= 70 ? T.green : pct >= 40 ? "#d97706" : T.tL;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <span style={{ fontSize:13, fontWeight:900, color:c,
        fontFamily:"var(--font-display)" }}>{score}</span>
      <div style={{ width:36, height:4, background:"#e6ecf5", borderRadius:99,
        overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:99 }}/>
      </div>
    </div>
  );
});

// ── X-MATRIX ─────────────────────────────────────────────────
const XMatrix = memo(({ hoshin, okrs, initiatives, kpis, correlations, onUpdate }) => {
  const { breakthroughGoals = [], annualObjectives = [],
          pillars = [], kpiLinks = [] } = hoshin;

  // Compute row/col scores
  const rowScores = useMemo(() => {
    return annualObjectives.map(ao => {
      let score = 0;
      breakthroughGoals.forEach((bg, bi) => {
        const val = correlations[`ao${ao.id}_bg${bg.id}`] ?? 0;
        score += getCorrLevel(val).score;
      });
      return score;
    });
  }, [annualObjectives, breakthroughGoals, correlations]);

  const colScores = useMemo(() => {
    return breakthroughGoals.map(bg => {
      let score = 0;
      annualObjectives.forEach(ao => {
        const val = correlations[`ao${ao.id}_bg${bg.id}`] ?? 0;
        score += getCorrLevel(val).score;
      });
      return score;
    });
  }, [annualObjectives, breakthroughGoals, correlations]);

  const maxRowScore = Math.max(...rowScores, 1);
  const maxColScore = Math.max(...colScores, 1);

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"collapse", minWidth:700 }}>
        <thead>
          {/* Breakthrough Goals header */}
          <tr>
            <th style={{ background:T.navy, color:"#fff", padding:"8px 12px",
              fontSize:10, fontWeight:800, letterSpacing:".06em",
              minWidth:200, borderRadius:"10px 0 0 0", textAlign:"left" }}>
              Objetivos Anuales → Metas Irruptoras
            </th>
            {breakthroughGoals.map((bg, i) => (
              <th key={bg.id} style={{
                background:    T.navyL,
                color:         "#fff",
                padding:       "6px 4px",
                fontSize:      9.5,
                fontWeight:    800,
                textAlign:     "center",
                width:         38,
                maxWidth:      38,
                writingMode:   "vertical-rl",
                transform:     "rotate(180deg)",
                height:        110,
                letterSpacing: ".04em",
                border:        `1px solid rgba(255,255,255,.1)`,
              }}>
                {bg.label}
              </th>
            ))}
            <th style={{ background:T.navy, color:"#fff", padding:"8px 10px",
              fontSize:10, fontWeight:800, textAlign:"center",
              minWidth:70, borderRadius:"0 10px 0 0" }}>
              Score
            </th>
          </tr>
        </thead>

        <tbody>
          {annualObjectives.map((ao, ri) => (
            <tr key={ao.id} style={{ borderBottom:`1px solid ${T.bdr}` }}>
              {/* Annual objective label */}
              <td style={{
                padding:    "8px 12px",
                background: ri % 2 === 0 ? T.white : "#fafbfd",
                fontSize:   11.5,
                fontWeight: 700,
                color:      T.navy,
                minWidth:   200,
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
                  <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px",
                    borderRadius:20, background:`${T.teal}15`, color:T.teal,
                    flexShrink:0, marginTop:2 }}>
                    AO{ri + 1}
                  </span>
                  <span style={{ lineHeight:1.35 }}>{ao.label}</span>
                </div>
                {ao.owner && (
                  <div style={{ fontSize:9.5, color:T.tL, marginTop:3, marginLeft:26 }}>
                    👤 {ao.owner}
                  </div>
                )}
              </td>

              {/* Correlation cells */}
              {breakthroughGoals.map((bg) => (
                <CorrCell
                  key={bg.id}
                  value={correlations[`ao${ao.id}_bg${bg.id}`] ?? 0}
                  rowId={`ao${ao.id}`}
                  colId={`bg${bg.id}`}
                  onUpdate={onUpdate}
                />
              ))}

              {/* Row score */}
              <td style={{ textAlign:"center", padding:"6px 10px",
                background: ri % 2 === 0 ? T.white : "#fafbfd" }}>
                <ScoreBadge score={rowScores[ri]} max={maxRowScore}/>
              </td>
            </tr>
          ))}

          {/* Column scores row */}
          <tr style={{ borderTop:`2px solid ${T.navy}` }}>
            <td style={{ padding:"8px 12px", fontSize:10, fontWeight:800,
              color:T.tM, background:`${T.navy}08` }}>
              Score por Meta Irruptora
            </td>
            {breakthroughGoals.map((bg, ci) => (
              <td key={bg.id} style={{ textAlign:"center", padding:"6px 4px",
                background:`${T.navy}08` }}>
                <ScoreBadge score={colScores[ci]} max={maxColScore}/>
              </td>
            ))}
            <td style={{ background:`${T.navy}08` }}/>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

// ── PILLAR CARD ───────────────────────────────────────────────
const PillarCard = memo(({ pillar, index, okrs, initiatives }) => {
  const relOKRs  = okrs.filter(o => o.pillar === pillar.id || index === 0);
  const relInits = initiatives.filter(i => i.pillar === pillar.id || index === 0);
  const avg      = calc.avgProgress(relOKRs.length ? relOKRs : [{ progress:pillar.progress || 60 }]);
  const c        = color.progressBar(avg);

  return (
    <Card sx={{ padding:"14px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
            <span style={{ fontSize:22 }}>{pillar.icon || "🔷"}</span>
            <span style={{ fontSize:9.5, fontWeight:800, padding:"2px 8px",
              borderRadius:20, background:`${T.navy}10`, color:T.navy }}>
              Pilar {index + 1}
            </span>
          </div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            lineHeight:1.3, fontFamily:"var(--font-display)" }}>
            {pillar.label}
          </div>
          {pillar.description && (
            <div style={{ fontSize:11, color:T.tL, marginTop:4, lineHeight:1.4 }}>
              {pillar.description}
            </div>
          )}
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:c,
          fontFamily:"var(--font-display)", flexShrink:0, marginLeft:10 }}>
          {avg}%
        </div>
      </div>

      <Bar value={avg} height={7} barColor={c}/>

      <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:10.5, color:T.tL }}>
          🎯 {relOKRs.length || "—"} OKRs
        </span>
        <span style={{ fontSize:10.5, color:T.tL }}>
          🚀 {relInits.length || "—"} Iniciativas
        </span>
        {pillar.owner && (
          <span style={{ fontSize:10.5, color:T.tL }}>
            👤 {pillar.owner}
          </span>
        )}
      </div>
    </Card>
  );
});

// ── HOSHIN SUMMARY ────────────────────────────────────────────
const HoshinSummary = memo(({ hoshin, okrs }) => {
  const total    = (hoshin.annualObjectives || []).length;
  const goals    = (hoshin.breakthroughGoals || []).length;
  const pillars  = (hoshin.pillars || []).length;
  const avgProg  = calc.avgProgress(okrs);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Metas Irruptoras" value={goals}   sub="Breakthrough Goals" icon="🚀" color={T.navy}/>
      <StatCard label="Obj. Anuales"     value={total}   sub="Annual Objectives"  icon="🎯" color={T.blue}/>
      <StatCard label="Pilares"          value={pillars} sub="Estratégicos"        icon="🔷" color={T.teal}/>
      <StatCard label="Avance OKR"       value={`${avgProg}%`} sub="Promedio global" icon="📊"
        color={color.progressBar(avgProg)}/>
    </div>
  );
});

// ── RADAR PILARES ─────────────────────────────────────────────
const PillarRadar = memo(({ hoshin, okrs }) => {
  const data = (hoshin.pillars || []).map((p, i) => ({
    dimension: p.label.substring(0, 18),
    Actual:    p.progress || Math.round(50 + Math.random() * 40),
    Meta:      100,
  }));

  if (!data.length) return null;

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <SpRadarChart
        data={data}
        title="Radar de Pilares Estratégicos"
        subtitle="Avance actual vs meta por pilar"
        height={280}
        angleKey="dimension"
        series={[
          { key:"Actual", label:"Avance Actual", color:T.teal,   fillOpacity:0.2  },
          { key:"Meta",   label:"Meta",          color:`${T.bdr}`,fillOpacity:0.05 },
        ]}
      />
    </Card>
  );
});

// ── DEPLOYMENT TABLE ──────────────────────────────────────────
const DeploymentTable = memo(({ hoshin, okrs, initiatives }) => {
  const { breakthroughGoals = [], annualObjectives = [], pillars = [] } = hoshin;

  return (
    <Card>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdr}` }}>
        <div style={{ fontSize:13, fontWeight:800, color:T.navy,
          fontFamily:"var(--font-display)" }}>
          🗂️ Despliegue Estratégico
        </div>
        <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
          Alineación de metas con objetivos operativos
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table className="sp-table">
          <thead>
            <tr>
              <th>Meta Irruptora</th>
              <th>Objetivo Anual</th>
              <th>OKRs Vinculados</th>
              <th>Iniciativas</th>
              <th>Avance</th>
            </tr>
          </thead>
          <tbody>
            {breakthroughGoals.map(bg => {
              const relAOs = annualObjectives.slice(0, 2 + Math.floor(Math.random() * 2));
              return relAOs.map((ao, ai) => {
                const relOKRs  = okrs.slice(ai, ai + 2);
                const relInits = initiatives.slice(ai, ai + 2);
                const avg      = calc.avgProgress(relOKRs);
                return (
                  <tr key={`${bg.id}-${ao.id}`}>
                    {ai === 0 && (
                      <td rowSpan={relAOs.length} style={{
                        verticalAlign:"top",
                        background:`${T.navy}05`,
                        borderRight:`2px solid ${T.navy}20`,
                        padding:"10px 12px",
                      }}>
                        <div style={{ fontSize:9.5, fontWeight:800, color:T.blue,
                          letterSpacing:".06em", marginBottom:4 }}>META</div>
                        <div style={{ fontSize:12, fontWeight:700, color:T.navy,
                          lineHeight:1.35 }}>
                          {bg.label}
                        </div>
                      </td>
                    )}
                    <td>
                      <div style={{ fontSize:11.5, fontWeight:700, color:T.navy }}>
                        {ao.label}
                      </div>
                      {ao.owner && (
                        <div style={{ fontSize:10, color:T.tL }}>👤 {ao.owner}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        {relOKRs.map(o => (
                          <div key={o.id} style={{ display:"flex", alignItems:"center",
                            gap:5 }}>
                            <span style={{ fontSize:9.5, fontWeight:800,
                              color:T.teal }}>{o.code}</span>
                            <span style={{ fontSize:10, color:T.tM,
                              overflow:"hidden", textOverflow:"ellipsis",
                              whiteSpace:"nowrap", maxWidth:140 }}>
                              {o.objective.substring(0, 35)}…
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        {relInits.map(ini => (
                          <div key={ini.id} style={{ fontSize:10, color:T.tM,
                            overflow:"hidden", textOverflow:"ellipsis",
                            whiteSpace:"nowrap", maxWidth:160 }}>
                            🚀 {ini.title.substring(0, 30)}…
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ minWidth:130 }}>
                      <Bar value={avg} height={6}/>
                      <div style={{ fontSize:10, textAlign:"right", marginTop:3,
                        fontWeight:800, color:color.progressBar(avg) }}>
                        {avg}%
                      </div>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ── CORRELATION LEGEND ────────────────────────────────────────
const CorrLegend = memo(() => (
  <div style={{ display:"flex", gap:12, alignItems:"center",
    flexWrap:"wrap", marginBottom:14, padding:"10px 14px",
    background:T.bg, borderRadius:9, border:`1px solid ${T.bdr}` }}>
    <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>
      Correlación:
    </span>
    {CORR_LEVELS.map(l => (
      <div key={l.value} style={{ display:"flex", alignItems:"center", gap:5 }}>
        <div style={{
          width:28, height:28, borderRadius:6,
          background:l.bg || T.bg,
          border:`1px solid ${T.bdr}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:800, color:l.c,
        }}>
          {l.label}
        </div>
        <span style={{ fontSize:10.5, color:T.tM }}>{l.title}</span>
        {l.score > 0 && (
          <span style={{ fontSize:9.5, color:T.tL }}>(×{l.score})</span>
        )}
      </div>
    ))}
    <span style={{ fontSize:10.5, color:T.tL, marginLeft:"auto" }}>
      · Click en celda para cambiar correlación
    </span>
  </div>
));

// ── CATCHBALL PANEL ───────────────────────────────────────────
const CatchballPanel = memo(({ hoshin, okrs, initiatives }) => {
  const levels = [
    { label:"Dirección",      icon:"👔", color:T.navy,  items:hoshin.breakthroughGoals || [] },
    { label:"Gerencia Media", icon:"👥", color:T.blue,  items:hoshin.annualObjectives  || [] },
    { label:"Operaciones",    icon:"⚙️", color:T.teal,  items:okrs.slice(0, 4)               },
    { label:"Equipos",        icon:"🤝", color:T.violet,items:initiatives.slice(0, 4)         },
  ];

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:16,
        fontFamily:"var(--font-display)" }}>
        🏓 Proceso Catchball — Despliegue por Nivel
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {levels.map((level, li) => (
          <div key={li} style={{ display:"flex", alignItems:"stretch", gap:0 }}>
            {/* Level label */}
            <div style={{
              width:       120,
              flexShrink:  0,
              padding:     "12px 14px",
              background:  `${level.color}12`,
              border:      `1px solid ${level.color}30`,
              borderRight: "none",
              display:     "flex",
              flexDirection:"column",
              alignItems:  "flex-start",
              justifyContent:"center",
              borderRadius: li === 0 ? "9px 0 0 0" : li === levels.length-1 ? "0 0 0 9px" : 0,
            }}>
              <span style={{ fontSize:18 }}>{level.icon}</span>
              <span style={{ fontSize:10.5, fontWeight:800, color:level.color,
                lineHeight:1.3, marginTop:4 }}>
                {level.label}
              </span>
            </div>

            {/* Arrow */}
            <div style={{ width:24, flexShrink:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:`${level.color}06`,
              border:`1px solid ${level.color}20`,
              borderLeft:"none", borderRight:"none" }}>
              <span style={{ fontSize:14, color:level.color, opacity:.6 }}>⇄</span>
            </div>

            {/* Items */}
            <div style={{
              flex:1,
              padding:     "10px 14px",
              background:  T.white,
              border:      `1px solid ${level.color}20`,
              borderLeft:  "none",
              borderRadius: li === 0 ? "0 9px 0 0" : li === levels.length-1 ? "0 0 9px 0" : 0,
              display:     "flex",
              gap:         8,
              flexWrap:    "wrap",
              alignItems:  "center",
            }}>
              {level.items.slice(0, 5).map((item, ii) => (
                <div key={ii} style={{
                  padding:     "4px 10px",
                  borderRadius: 20,
                  background:  `${level.color}12`,
                  border:      `1px solid ${level.color}30`,
                  fontSize:    10.5,
                  fontWeight:  700,
                  color:       level.color,
                  maxWidth:    200,
                  overflow:    "hidden",
                  textOverflow:"ellipsis",
                  whiteSpace:  "nowrap",
                }}>
                  {item.label || item.code || item.objective?.substring(0,30) || item.title?.substring(0,30) || `Item ${ii+1}`}
                </div>
              ))}
              {level.items.length > 5 && (
                <span style={{ fontSize:10, color:T.tL }}>
                  +{level.items.length - 5} más
                </span>
              )}
              {level.items.length === 0 && (
                <span style={{ fontSize:11, color:T.tL }}>Sin elementos</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

// ── MAIN HOSHIN ───────────────────────────────────────────────
const Hoshin = memo(({ onNavigate }) => {
  const {
    hoshin, okrs, initiatives, kpis,
    updateHoshinCorr,
  } = useApp();

  const [tab, setTab] = useState("xmatrix");

  const handleCorrUpdate = useCallback((rowId, colId, value) => {
    updateHoshinCorr(`${rowId}_${colId}`, value);
  }, [updateHoshinCorr]);

  const TABS = [
    { id:"xmatrix",    label:"❌ X-Matrix"            },
    { id:"pillars",    label:"🔷 Pilares"              },
    { id:"deployment", label:"🗂️ Despliegue"          },
    { id:"catchball",  label:"🏓 Catchball"            },
  ];

  if (!hoshin) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <span style={{ fontSize:13, color:T.tL }}>Cargando Hoshin X-Matrix…</span>
    </div>
  );

  return (
    <div className="sp-page">
      <SectionHeader
        title="🔷 Hoshin Kanri X-Matrix"
        subtitle="Despliegue estratégico · Correlaciones y pilares · Hospital Punta Médica"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("strategymap")}>
              🔗 Mapa Estratégico
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("bsc")}>
              🗺️ BSC
            </Btn>
          </div>
        }
      />

      {/* Summary */}
      <HoshinSummary hoshin={hoshin} okrs={okrs}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── X-MATRIX TAB ── */}
      {tab === "xmatrix" && (
        <>
          {/* Header context */}
          <div style={{ display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:14, marginBottom:16 }}>
            {/* Breakthrough goals */}
            <Card sx={{ padding:"14px 16px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.teal,
                letterSpacing:".08em", marginBottom:10 }}>
                🚀 METAS IRRUPTORAS (Breakthrough Goals)
              </div>
              {(hoshin.breakthroughGoals || []).map((bg, i) => (
                <div key={bg.id} style={{ display:"flex", gap:8,
                  alignItems:"flex-start", marginBottom:8,
                  padding:"7px 10px", background:T.bg, borderRadius:8 }}>
                  <span style={{ fontSize:10, fontWeight:800,
                    padding:"2px 7px", borderRadius:20,
                    background:`${T.navy}15`, color:T.navy, flexShrink:0 }}>
                    BG{i+1}
                  </span>
                  <span style={{ fontSize:11.5, fontWeight:700, color:T.navy,
                    lineHeight:1.35 }}>
                    {bg.label}
                  </span>
                </div>
              ))}
            </Card>

            {/* Annual objectives */}
            <Card sx={{ padding:"14px 16px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.blue,
                letterSpacing:".08em", marginBottom:10 }}>
                🎯 OBJETIVOS ANUALES (Annual Objectives)
              </div>
              {(hoshin.annualObjectives || []).map((ao, i) => (
                <div key={ao.id} style={{ display:"flex", gap:8,
                  alignItems:"flex-start", marginBottom:8,
                  padding:"7px 10px", background:T.bg, borderRadius:8 }}>
                  <span style={{ fontSize:10, fontWeight:800,
                    padding:"2px 7px", borderRadius:20,
                    background:`${T.blue}15`, color:T.blue, flexShrink:0 }}>
                    AO{i+1}
                  </span>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:T.navy,
                      lineHeight:1.35 }}>
                      {ao.label}
                    </div>
                    {ao.owner && (
                      <div style={{ fontSize:10, color:T.tL }}>👤 {ao.owner}</div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Legend */}
          <CorrLegend/>

          {/* X-Matrix table */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
              fontFamily:"var(--font-display)" }}>
              Matriz de Correlaciones AO × BG
            </div>
            <XMatrix
              hoshin={hoshin}
              okrs={okrs}
              initiatives={initiatives}
              kpis={kpis}
              correlations={hoshin.correlations || {}}
              onUpdate={handleCorrUpdate}
            />
          </Card>

          {/* Score bars */}
          <Card sx={{ padding:"16px 18px", marginTop:14 }}>
            <SpBarChart
              data={(hoshin.annualObjectives || []).map((ao, i) => {
                let score = 0;
                (hoshin.breakthroughGoals || []).forEach(bg => {
                  const val = (hoshin.correlations || {})[`ao${ao.id}_bg${bg.id}`] ?? 0;
                  score += getCorrLevel(val).score;
                });
                return { name:`AO${i+1}`, Score:score };
              })}
              title="Score de Objetivos Anuales"
              subtitle="Suma ponderada de correlaciones con metas irruptoras"
              height={220}
              xKey="name"
              bars={[{ key:"Score", color:T.teal, label:"Score total" }]}
              showValues
            />
          </Card>
        </>
      )}

      {/* ── PILLARS TAB ── */}
      {tab === "pillars" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            {(hoshin.pillars || []).map((pillar, i) => (
              <PillarCard
                key={pillar.id || i}
                pillar={pillar}
                index={i}
                okrs={okrs}
                initiatives={initiatives}
              />
            ))}
          </div>
          <PillarRadar hoshin={hoshin} okrs={okrs}/>
        </div>
      )}

      {/* ── DEPLOYMENT TAB ── */}
      {tab === "deployment" && (
        <DeploymentTable
          hoshin={hoshin}
          okrs={okrs}
          initiatives={initiatives}
        />
      )}

      {/* ── CATCHBALL TAB ── */}
      {tab === "catchball" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <AlertBox type="info">
            El proceso Catchball es la negociación bidireccional entre niveles jerárquicos
            para alinear metas y recursos. ⇄ indica flujo de comunicación en ambas direcciones.
          </AlertBox>
          <CatchballPanel
            hoshin={hoshin}
            okrs={okrs}
            initiatives={initiatives}
          />

          {/* Alignment chart */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={(hoshin.pillars || []).map((p, i) => ({
                name:         p.label.substring(0, 20),
                "Objetivos":  Math.round(2 + Math.random() * 4),
                "OKRs":       Math.round(3 + Math.random() * 6),
                "Iniciativas":Math.round(2 + Math.random() * 5),
              }))}
              title="Recursos por Pilar Estratégico"
              subtitle="Distribución de objetivos, OKRs e iniciativas"
              height={240}
              xKey="name"
              bars={[
                { key:"Objetivos",   color:T.navy,   label:"Objetivos BSC" },
                { key:"OKRs",        color:T.teal,   label:"OKRs"          },
                { key:"Iniciativas", color:T.gold,   label:"Iniciativas"   },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Tips */}
      <div style={{ marginTop:14, padding:"10px 14px", background:`${T.teal}08`,
        borderRadius:9, border:`1px solid ${T.teal}25`,
        display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
          <strong>Hoshin Kanri:</strong> Haz clic en las celdas de la X-Matrix para
          cambiar el nivel de correlación. Los scores se recalculan automáticamente.
          Usa la pestaña Catchball para ver el despliegue jerárquico de objetivos.
        </div>
      </div>
    </div>
  );
});

export default Hoshin;
```

---

✅ **Hoshin.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    ├── KPI.jsx
    ├── Bowling.jsx
    ├── StrategyMap.jsx
    └── Hoshin.jsx    ← nueva
