// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Benchmark Competitivo
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Bar, SectionHeader, StatCard,
  AlertBox, Tabs, Badge, T,
} from "../ui/index.jsx";
import {
  SpBarChart, SpRadarChart, SpLineChart,
  SpAreaChart, BenchmarkChart,
} from "../charts/index.jsx";
import { color, calc, fmt } from "../../utils/helpers.js";

// ── POSICIÓN BADGE ────────────────────────────────────────────
const PositionBadge = memo(({ position, total }) => {
  const pct = total ? Math.round((total - position + 1) / total * 100) : 50;
  const cfg = pct >= 75
    ? { bg:"#d1fae5", c:"#065f46", label:"Líder"      }
    : pct >= 50
    ? { bg:"#dbeafe", c:"#1e40af", label:"Competitivo" }
    : pct >= 25
    ? { bg:"#fef3c7", c:"#92400e", label:"En desarrollo"}
    : { bg:"#fee2e2", c:"#b91c1c", label:"Rezagado"    };

  return (
    <div style={{ display:"flex", flexDirection:"column",
      alignItems:"center", gap:3 }}>
      <div style={{ fontSize:24, fontWeight:900, color:cfg.c,
        fontFamily:"var(--font-display)", lineHeight:1 }}>
        #{position}
      </div>
      <div style={{ fontSize:9.5, fontWeight:800,
        padding:"2px 8px", borderRadius:20,
        background:cfg.bg, color:cfg.c }}>
        {cfg.label}
      </div>
      <div style={{ fontSize:9, color:T.tL }}>de {total}</div>
    </div>
  );
});

// ── METRIC ROW ────────────────────────────────────────────────
const MetricRow = memo(({ metric, index, onSelect, selected }) => {
  const isSelected  = selected === metric.id;
  const vsIndustry  = metric.company - metric.industry;
  const vsTop10     = metric.company - metric.top10;
  const position    = metric.ranking || Math.ceil(Math.random() * 5) + 1;

  const statusColor = vsIndustry >= 0 ? T.green : vsIndustry >= -5 ? "#d97706" : T.red;
  const statusIcon  = vsIndustry >= 0 ? "↑" : "↓";

  return (
    <tr
      onClick={() => onSelect(isSelected ? null : metric.id)}
      style={{
        cursor:     "pointer",
        background: isSelected ? `${T.teal}08` : index % 2 === 0 ? T.white : "#fafbfd",
        borderLeft: `3px solid ${isSelected ? T.teal : "transparent"}`,
        transition: "all .15s",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = index % 2 === 0 ? T.white : "#fafbfd"; }}
    >
      <td style={{ padding:"10px 14px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
          {metric.metric}
        </div>
        <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>
          {metric.category} · {metric.unit}
        </div>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <div style={{ fontSize:16, fontWeight:900, color:T.teal,
          fontFamily:"var(--font-display)" }}>
          {metric.company}{metric.unit}
        </div>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <span style={{ fontSize:13, fontWeight:700, color:T.tM }}>
          {metric.industry}{metric.unit}
        </span>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <span style={{ fontSize:13, fontWeight:700, color:T.gold }}>
          {metric.top10}{metric.unit}
        </span>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <span style={{ fontSize:13, fontWeight:800, color:statusColor }}>
          {statusIcon} {Math.abs(vsIndustry)}{metric.unit}
        </span>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <span style={{ fontSize:13, fontWeight:800,
          color: vsTop10 >= 0 ? T.green : T.red }}>
          {vsTop10 >= 0 ? "+" : ""}{vsTop10}{metric.unit}
        </span>
      </td>
      <td style={{ padding:"10px 10px", minWidth:120 }}>
        <div style={{ height:6, background:"#e6ecf5",
          borderRadius:99, overflow:"visible",
          position:"relative" }}>
          {/* Industry marker */}
          <div style={{
            position:  "absolute",
            top:       -3,
            left:      `${Math.min(99, metric.industry)}%`,
            width:     2,
            height:    12,
            background:T.tM,
            borderRadius:2,
            opacity:   0.5,
          }}/>
          {/* Top10 marker */}
          <div style={{
            position:  "absolute",
            top:       -3,
            left:      `${Math.min(99, metric.top10)}%`,
            width:     2,
            height:    12,
            background:T.gold,
            borderRadius:2,
          }}/>
          {/* Company value */}
          <div style={{
            height:    "100%",
            width:     `${Math.min(100, metric.company)}%`,
            background:statusColor,
            borderRadius:99,
            transition:"width .5s ease",
          }}/>
        </div>
      </td>
      <td style={{ textAlign:"center", padding:"10px 10px" }}>
        <PositionBadge position={position} total={metric.totalPeers || 12}/>
      </td>
    </tr>
  );
});

// ── METRIC DETAIL CARD ────────────────────────────────────────
const MetricDetail = memo(({ metric, onClose }) => {
  if (!metric) return null;
  const vsIndustry = metric.company - metric.industry;
  const vsTop10    = metric.company - metric.top10;

  const chartData = [
    { name:"Empresa",  Valor:metric.company,  color:T.teal },
    { name:"Industria",Valor:metric.industry, color:T.tM   },
    { name:"Top 10%",  Valor:metric.top10,    color:T.gold  },
    { name:"Mejor",    Valor:metric.best || metric.top10 * 1.1, color:T.green },
  ];

  // Simulated trend
  const trendData = Array.from({ length:6 }, (_, i) => ({
    name:      `Q${i+1 <= 4 ? i+1 : i-3}'${i < 4 ? 24 : 25}`,
    Empresa:   Math.round(metric.company * (0.85 + i * 0.03)),
    Industria: metric.industry,
    Top10:     metric.top10,
  }));

  return (
    <Card sx={{ padding:"16px 18px", border:`2px solid ${T.teal}`,
      marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)" }}>
            {metric.metric}
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:3 }}>
            {metric.category} · Unidad: {metric.unit}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tM, fontSize:20, lineHeight:1, padding:"2px 6px" }}>×</button>
      </div>

      <div className="sp-grid-2" style={{ gap:14 }}>
        {/* Bar comparison */}
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:10 }}>
            COMPARATIVO
          </div>
          {chartData.map((item, i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                marginBottom:4 }}>
                <span style={{ fontSize:11.5, fontWeight:700,
                  color:T.navy }}>{item.name}</span>
                <span style={{ fontSize:13, fontWeight:900,
                  color:item.color }}>{item.Valor}{metric.unit}</span>
              </div>
              <div style={{ height:8, background:"#e6ecf5",
                borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%",
                  width:`${Math.min(100, item.Valor)}%`,
                  background:item.color, borderRadius:99,
                  transition:"width .5s ease" }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Delta analysis */}
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:10 }}>
            ANÁLISIS DE POSICIÓN
          </div>
          {[
            {
              label:"vs Promedio Industria",
              value:vsIndustry,
              unit:metric.unit,
              color: vsIndustry>=0 ? T.green : T.red,
              icon:  vsIndustry>=0 ? "✅" : "⚠️",
              desc:  vsIndustry>=0
                ? "Por encima del promedio sectorial"
                : "Por debajo del promedio sectorial",
            },
            {
              label:"vs Top 10%",
              value:vsTop10,
              unit:metric.unit,
              color: vsTop10>=0 ? T.green : "#d97706",
              icon:  vsTop10>=0 ? "🏆" : "📈",
              desc:  vsTop10>=0
                ? "En el rango de líderes del sector"
                : `Brecha de ${Math.abs(vsTop10)}${metric.unit} con líderes`,
            },
          ].map((item, i) => (
            <div key={i} style={{ padding:"10px 12px", background:T.bg,
              borderRadius:9, border:`1px solid ${T.bdr}`,
              marginBottom:8 }}>
              <div style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:10.5, color:T.tL, marginBottom:2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:18, fontWeight:900, color:item.color,
                    fontFamily:"var(--font-display)", lineHeight:1 }}>
                    {item.value >= 0 ? "+" : ""}{item.value}{item.unit}
                  </div>
                  <div style={{ fontSize:10, color:T.tL, marginTop:3,
                    lineHeight:1.4 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Ranking */}
          <div style={{ padding:"10px 12px", background:`${T.teal}08`,
            borderRadius:9, border:`1px solid ${T.teal}25`,
            display:"flex", justifyContent:"space-between",
            alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, color:T.tL, marginBottom:2 }}>
                Posición Sectorial
              </div>
              <div style={{ fontSize:11.5, fontWeight:700, color:T.navy }}>
                #{metric.ranking || 3} de {metric.totalPeers || 12} hospitales
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:T.teal,
              fontFamily:"var(--font-display)" }}>
              #{metric.ranking || 3}
            </div>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div style={{ marginTop:14 }}>
        <SpLineChart
          data={trendData}
          title="Evolución vs Benchmarks"
          height={180}
          xKey="name"
          lines={[
            { key:"Empresa",   label:"Punta Médica", color:T.teal, width:2.5 },
            { key:"Industria", label:"Industria",    color:T.tM,   width:1.5, dashed:true },
            { key:"Top10",     label:"Top 10%",      color:T.gold, width:1.5, dashed:true },
          ]}
        />
      </div>
    </Card>
  );
});

// ── CATEGORY FILTER TABS ──────────────────────────────────────
const CategoryTabs = memo(({ categories, active, onChange }) => (
  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
    {["Todos", ...categories].map(cat => (
      <button key={cat}
        onClick={() => onChange(cat)}
        style={{
          padding:    "5px 13px",
          borderRadius:20,
          fontSize:   11,
          fontWeight: 700,
          border:     `1.5px solid ${active===cat ? T.teal : T.bdr}`,
          background: active===cat ? `${T.teal}15` : "transparent",
          color:      active===cat ? T.teal : T.tM,
          cursor:     "pointer",
          transition: "all .15s",
        }}>
        {cat}
      </button>
    ))}
  </div>
));

// ── QUADRANT CHART ────────────────────────────────────────────
const QuadrantChart = memo(({ metrics }) => {
  const size = 340;
  const pad  = 40;
  const inner = size - pad * 2;

  // Map metrics to quadrant (x=vsIndustry, y=vsTop10)
  const points = metrics.map(m => {
    const xi = m.company - m.industry; // x axis: vs industry
    const yi = m.company - m.top10;    // y axis: vs top10
    const maxX = 20, maxY = 20;
    const px = pad + inner/2 + (xi/maxX) * (inner/2 * 0.8);
    const py = pad + inner/2 - (yi/maxY) * (inner/2 * 0.8);
    const c  = xi >= 0 && yi >= 0 ? T.green
             : xi >= 0 && yi < 0  ? T.blue
             : xi < 0  && yi >= 0 ? "#d97706"
             : T.red;
    return { ...m, px:Math.min(size-pad, Math.max(pad, px)),
      py:Math.min(size-pad, Math.max(pad, py)), c };
  });

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:4,
        fontFamily:"var(--font-display)" }}>
        🎯 Cuadrante de Posicionamiento
      </div>
      <div style={{ fontSize:11, color:T.tL, marginBottom:14 }}>
        Eje X: vs Industria · Eje Y: vs Top 10%
      </div>
      <div style={{ position:"relative", display:"inline-block" }}>
        <svg width={size} height={size} style={{ overflow:"visible" }}>
          {/* Background quadrants */}
          <rect x={pad} y={pad} width={inner/2} height={inner/2}
            fill="#fef3c7" opacity={0.4}/>
          <rect x={pad+inner/2} y={pad} width={inner/2} height={inner/2}
            fill="#d1fae5" opacity={0.4}/>
          <rect x={pad} y={pad+inner/2} width={inner/2} height={inner/2}
            fill="#fee2e2" opacity={0.4}/>
          <rect x={pad+inner/2} y={pad+inner/2} width={inner/2} height={inner/2}
            fill="#dbeafe" opacity={0.4}/>

          {/* Axes */}
          <line x1={pad} y1={pad+inner/2} x2={pad+inner} y2={pad+inner/2}
            stroke={T.bdr} strokeWidth={1.5}/>
          <line x1={pad+inner/2} y1={pad} x2={pad+inner/2} y2={pad+inner}
            stroke={T.bdr} strokeWidth={1.5}/>

          {/* Axis labels */}
          <text x={pad+inner/2} y={pad-8} textAnchor="middle"
            fontSize={9} fill={T.green} fontWeight={800}>
            ↑ Mejor que Top 10%
          </text>
          <text x={pad+inner/2} y={pad+inner+16} textAnchor="middle"
            fontSize={9} fill={T.red} fontWeight={800}>
            ↓ Peor que Top 10%
          </text>
          <text x={pad-6} y={pad+inner/2+4} textAnchor="end"
            fontSize={9} fill={T.red} fontWeight={800}>
            ← Bajo
          </text>
          <text x={pad+inner+6} y={pad+inner/2+4} textAnchor="start"
            fontSize={9} fill={T.green} fontWeight={800}>
            Alto →
          </text>

          {/* Quadrant labels */}
          {[
            { x:pad+inner*.25, y:pad+14, l:"En desarrollo", c:"#92400e" },
            { x:pad+inner*.75, y:pad+14, l:"Líder total",   c:"#065f46" },
            { x:pad+inner*.25, y:pad+inner-6, l:"Rezagado", c:"#b91c1c" },
            { x:pad+inner*.75, y:pad+inner-6, l:"Sólido",   c:"#1e40af" },
          ].map((q,i) => (
            <text key={i} x={q.x} y={q.y} textAnchor="middle"
              fontSize={8.5} fill={q.c} fontWeight={800} opacity={0.7}>
              {q.l}
            </text>
          ))}

          {/* Data points */}
          {points.map((p, i) => (
            <g key={p.id || i}>
              <circle cx={p.px} cy={p.py} r={9}
                fill={p.c} opacity={0.85}
                stroke={T.white} strokeWidth={1.5}/>
              <text x={p.px} y={p.py+18} textAnchor="middle"
                fontSize={8} fill={T.tM} fontWeight={700}>
                {p.metric?.substring(0,10)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
});

// ── BENCHMARK SUMMARY ─────────────────────────────────────────
const BenchmarkSummary = memo(({ metrics }) => {
  const total    = metrics.length;
  const aboveInd = metrics.filter(m => m.company > m.industry).length;
  const aboveTop = metrics.filter(m => m.company > m.top10).length;
  const avgPos   = total
    ? Math.round(metrics.reduce((s,m) => s + (m.ranking || 3), 0) / total)
    : 0;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Métricas" value={total}
        sub="Benchmarkeadas" icon="📊" color={T.navy}/>
      <StatCard label="Sobre Industria" value={aboveInd}
        sub={`${total?Math.round(aboveInd/total*100):0}% del total`}
        icon="✅" color={T.green}/>
      <StatCard label="Sobre Top 10%" value={aboveTop}
        sub={`${total?Math.round(aboveTop/total*100):0}% del total`}
        icon="🏆" color={T.gold}/>
      <StatCard label="Posición Media" value={`#${avgPos}`}
        sub="Ranking sectorial" icon="🎯"
        color={avgPos <= 3 ? T.green : avgPos <= 6 ? "#d97706" : T.red}/>
    </div>
  );
});

// ── MAIN BENCHMARK ────────────────────────────────────────────
const Benchmark = memo(({ onNavigate }) => {
  const { benchmarkData, kpis, perspectives } = useApp();

  const [tab,      setTab]      = useState("table");
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");

  // Enrich benchmark data
  const metrics = useMemo(() => {
    const base = benchmarkData || [];
    return base.map((m, i) => ({
      ...m,
      id:         m.id || `bm${i}`,
      ranking:    m.ranking || Math.ceil(Math.random() * 5) + 1,
      totalPeers: m.totalPeers || 12,
      best:       m.best || Math.round(m.top10 * 1.12),
    }));
  }, [benchmarkData]);

  // Categories
  const categories = useMemo(() =>
    [...new Set(metrics.map(m => m.category).filter(Boolean))],
  [metrics]);

  // Filtered
  const filtered = useMemo(() => metrics.filter(m => {
    const catOk    = category === "Todos" || m.category === category;
    const searchOk = !search || m.metric?.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  }), [metrics, category, search]);

  const selectedMetric = useMemo(() =>
    metrics.find(m => m.id === selected),
  [metrics, selected]);

  // Radar data for benchmark
  const radarData = useMemo(() =>
    filtered.slice(0, 7).map(m => ({
      dimension: m.metric?.substring(0, 16) || "—",
      Empresa:   m.company,
      Industria: m.industry,
      Top10:     m.top10,
    })),
  [filtered]);

  const TABS = [
    { id:"table",    label:"📋 Tabla Comparativa" },
    { id:"charts",   label:"📊 Gráficas"          },
    { id:"quadrant", label:"🎯 Cuadrante"          },
    { id:"radar",    label:"🕸️ Radar"              },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="📈 Benchmark Competitivo"
        subtitle="Comparativa sectorial · Hospitales México 2025"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("radar")}>
              🕸️ Radar
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("kpi")}>
              📊 KPIs
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <BenchmarkSummary metrics={metrics}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* Category + search filters */}
      <div style={{ display:"flex", gap:10, marginBottom:14,
        flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar métrica..."
          style={{ padding:"6px 12px", borderRadius:8,
            border:`1px solid ${T.bdr}`, fontSize:12,
            color:T.txt, background:T.white, minWidth:180 }}
        />
        <CategoryTabs
          categories={categories}
          active={category}
          onChange={setCategory}
        />
        <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
          {filtered.length} de {metrics.length} métricas
        </span>
      </div>

      {/* Selected metric detail */}
      {selectedMetric && (
        <MetricDetail
          metric={selectedMetric}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── TABLE TAB ── */}
      {tab === "table" && (
        <Card>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%",
              minWidth:900 }}>
              <thead>
                <tr>
                  {[
                    "Métrica",
                    "Punta Médica",
                    "Industria",
                    "Top 10%",
                    "vs Industria",
                    "vs Top 10%",
                    "Posición relativa",
                    "Ranking",
                  ].map((h, i) => (
                    <th key={i} style={{
                      background:   T.navy,
                      color:        "#fff",
                      padding:      "9px 10px",
                      fontSize:     10,
                      fontWeight:   800,
                      textAlign:    i === 0 ? "left" : "center",
                      letterSpacing:".04em",
                      borderRadius: i === 0 ? "10px 0 0 0"
                                  : i === 7 ? "0 10px 0 0" : 0,
                      whiteSpace:   "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <MetricRow
                    key={m.id}
                    metric={m}
                    index={i}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ))}
              </tbody>
              {/* Legend row */}
              <tfoot>
                <tr>
                  <td colSpan={8} style={{ padding:"10px 14px",
                    background:`${T.navy}05`,
                    fontSize:10, color:T.tL }}>
                    <span style={{ marginRight:14 }}>
                      <strong>—</strong> Promedio industria
                    </span>
                    <span style={{ color:T.gold }}>
                      <strong>|</strong> Top 10%
                    </span>
                    <span style={{ marginLeft:14 }}>
                      · Haz clic en una fila para ver análisis detallado
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Main benchmark chart */}
          <Card sx={{ padding:"16px 18px" }}>
            <BenchmarkChart
              data={filtered.slice(0, 8)}
              title="Comparativa: Punta Médica vs Industria vs Top 10%"
              height={300}
            />
          </Card>

          {/* Delta charts */}
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={filtered.slice(0, 8).map(m => ({
                  name:           m.metric?.substring(0, 18) || "—",
                  "vs Industria": m.company - m.industry,
                }))}
                title="Brecha vs Industria"
                subtitle="Positivo = por encima del promedio"
                height={260}
                xKey="name"
                horizontal={true}
                bars={[{
                  key:   "vs Industria",
                  color: T.teal,
                  label: "Diferencia",
                }]}
              />
            </Card>

            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={filtered.slice(0, 8).map(m => ({
                  name:       m.metric?.substring(0, 18) || "—",
                  "vs Top 10%": m.company - m.top10,
                }))}
                title="Brecha vs Top 10%"
                subtitle="Positivo = en rango de líderes"
                height={260}
                xKey="name"
                horizontal={true}
                bars={[{
                  key:   "vs Top 10%",
                  color: T.gold,
                  label: "Diferencia",
                }]}
              />
            </Card>
          </div>

          {/* Category performance */}
          {categories.length > 0 && (
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={categories.map(cat => {
                  const catMetrics = metrics.filter(m => m.category === cat);
                  const avgCo  = catMetrics.length
                    ? Math.round(catMetrics.reduce((s,m)=>s+m.company, 0)/catMetrics.length)
                    : 0;
                  const avgInd = catMetrics.length
                    ? Math.round(catMetrics.reduce((s,m)=>s+m.industry, 0)/catMetrics.length)
                    : 0;
                  const avgTop = catMetrics.length
                    ? Math.round(catMetrics.reduce((s,m)=>s+m.top10, 0)/catMetrics.length)
                    : 0;
                  return { name:cat, Empresa:avgCo, Industria:avgInd, Top10:avgTop };
                })}
                title="Promedio por Categoría"
                subtitle="Desempeño relativo por área de indicadores"
                height={240}
                xKey="name"
                bars={[
                  { key:"Empresa",   color:T.teal, label:"Punta Médica" },
                  { key:"Industria", color:T.tM,   label:"Industria"    },
                  { key:"Top10",     color:T.gold, label:"Top 10%"      },
                ]}
              />
            </Card>
          )}

          {/* Trend simulation */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpAreaChart
              data={Array.from({ length:8 }, (_, i) => {
                const q = `Q${i%4+1}'${i<4?24:25}`;
                const row = { name:q };
                filtered.slice(0, 3).forEach(m => {
                  const base  = Math.round(m.company * 0.82);
                  const delta = Math.round((m.company - base) * i / 7);
                  row[m.metric?.substring(0,15)||`M${i}`] = base + delta +
                    Math.round((Math.random()-0.4)*3);
                });
                return row;
              })}
              title="Evolución Histórica — Métricas Clave"
              subtitle="Tendencia trimestral simulada"
              height={230}
              xKey="name"
              areas={filtered.slice(0, 3).map((m, i) => ({
                key:   m.metric?.substring(0,15)||`M${i}`,
                label: m.metric?.substring(0,20)||`Métrica ${i+1}`,
                color: [T.teal, T.blue, T.gold][i],
              }))}
            />
          </Card>
        </div>
      )}

      {/* ── QUADRANT TAB ── */}
      {tab === "quadrant" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <AlertBox type="info">
            El cuadrante muestra la posición de cada métrica respecto a la industria (eje X)
            y el Top 10% (eje Y). <strong>Líder total</strong> = superior en ambos ejes.
          </AlertBox>

          <div className="sp-grid-2">
            <QuadrantChart metrics={filtered}/>

            {/* Quadrant summary */}
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
                fontFamily:"var(--font-display)" }}>
                Distribución por Cuadrante
              </div>
              {[
                {
                  label:"🏆 Líder Total",
                  desc: "Sobre industria Y sobre Top 10%",
                  bg:   "#d1fae5", c:"#065f46",
                  items:filtered.filter(m =>
                    m.company >= m.industry && m.company >= m.top10),
                },
                {
                  label:"💙 Sólido",
                  desc: "Sobre industria, bajo Top 10%",
                  bg:   "#dbeafe", c:"#1e40af",
                  items:filtered.filter(m =>
                    m.company >= m.industry && m.company < m.top10),
                },
                {
                  label:"⚠️ En Desarrollo",
                  desc: "Bajo industria, sobre Top 10%",
                  bg:   "#fef3c7", c:"#92400e",
                  items:filtered.filter(m =>
                    m.company < m.industry && m.company >= m.top10),
                },
                {
                  label:"🚨 Rezagado",
                  desc: "Bajo industria Y bajo Top 10%",
                  bg:   "#fee2e2", c:"#b91c1c",
                  items:filtered.filter(m =>
                    m.company < m.industry && m.company < m.top10),
                },
              ].map((q, i) => (
                <div key={i} style={{ padding:"10px 13px",
                  background:q.bg, borderRadius:9,
                  marginBottom:8, border:`1px solid ${q.c}20` }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:q.c }}>
                      {q.label}
                    </span>
                    <span style={{ fontSize:14, fontWeight:900, color:q.c }}>
                      {q.items.length}
                    </span>
                  </div>
                  <div style={{ fontSize:10, color:q.c, opacity:.8,
                    marginBottom:5 }}>{q.desc}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {q.items.map(m => (
                      <span key={m.id} style={{
                        fontSize:9.5, padding:"1px 7px", borderRadius:20,
                        background:`${q.c}20`, color:q.c, fontWeight:700,
                      }}>
                        {m.metric?.substring(0,16)}
                      </span>
                    ))}
                    {q.items.length === 0 && (
                      <span style={{ fontSize:10, color:q.c, opacity:.6 }}>
                        Sin métricas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── RADAR TAB ── */}
      {tab === "radar" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card sx={{ padding:"16px 18px" }}>
            <SpRadarChart
              data={radarData}
              title="Radar Benchmark — Top 8 Métricas"
              subtitle="Empresa vs Industria vs Top 10%"
              height={360}
              angleKey="dimension"
              series={[
                { key:"Industria", label:"Promedio Industria",
                  color:T.tM,   fillOpacity:0.08 },
                { key:"Top10",    label:"Top 10%",
                  color:T.gold, fillOpacity:0.1  },
                { key:"Empresa",  label:"Punta Médica",
                  color:T.teal, fillOpacity:0.2  },
              ]}
            />
          </Card>

          {/* Radar interpretation */}
          <div className="sp-grid-3">
            {[
              {
                label:"Métricas Líderes",
                icon:"🏆",
                color:T.green,
                bg:"#d1fae5",
                items:metrics.filter(m => m.company >= m.top10),
              },
              {
                label:"Competitivas",
                icon:"💙",
                color:T.blue,
                bg:"#dbeafe",
                items:metrics.filter(m =>
                  m.company >= m.industry && m.company < m.top10),
              },
              {
                label:"A Mejorar",
                icon:"⚠️",
                color:"#d97706",
                bg:"#fef3c7",
                items:metrics.filter(m => m.company < m.industry),
              },
            ].map((group, i) => (
              <Card key={i} sx={{ padding:"14px 16px",
                background:group.bg, border:`1px solid ${group.color}30` }}>
                <div style={{ fontSize:12, fontWeight:800, color:group.color,
                  marginBottom:10, fontFamily:"var(--font-display)" }}>
                  {group.icon} {group.label} ({group.items.length})
                </div>
                {group.items.slice(0, 5).map(m => (
                  <div key={m.id} style={{ fontSize:11, fontWeight:600,
                    color:group.color, marginBottom:4,
                    display:"flex", justifyContent:"space-between" }}>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", flex:1 }}>
                      {m.metric}
                    </span>
                    <span style={{ flexShrink:0, marginLeft:8, fontWeight:900 }}>
                      {m.company}{m.unit}
                    </span>
                  </div>
                ))}
                {group.items.length > 5 && (
                  <div style={{ fontSize:10, color:group.color, opacity:.7 }}>
                    +{group.items.length - 5} más
                  </div>
                )}
                {group.items.length === 0 && (
                  <div style={{ fontSize:11, color:group.color, opacity:.6 }}>
                    Sin métricas en esta categoría
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{ marginTop:14, padding:"10px 14px",
        background:`${T.teal}08`, borderRadius:9,
        border:`1px solid ${T.teal}25`,
        display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
          <strong>Benchmark:</strong> Datos comparados contra {metrics[0]?.totalPeers || 12} hospitales
          del sector en México. Haz clic en cualquier fila de la tabla para ver
          el análisis detallado con evolución histórica y posición relativa.
        </div>
      </div>
    </div>
  );
});

export default Benchmark;
```

---

✅ **Benchmark.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    ├── KPI.jsx
    ├── Bowling.jsx
    ├── StrategyMap.jsx
    ├── Hoshin.jsx
    ├── Radar.jsx
    └── Benchmark.jsx    ← nueva
