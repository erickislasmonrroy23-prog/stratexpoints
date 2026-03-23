// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Charts (Recharts)
// ══════════════════════════════════════════════════════════════

import { memo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush,
} from "recharts";
import { T } from "../ui/index.jsx";
import { color, fmt } from "../../utils/helpers.js";

// ── PALETA COMPARTIDA ─────────────────────────────────────────
export const PALETTE = [
  T.teal, T.blue, T.gold, T.violet,
  T.green, "#f59e0b", "#ec4899", "#06b6d4",
];

// ── TOOLTIP PERSONALIZADO ─────────────────────────────────────
const CustomTooltip = memo(({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:   T.white,
      border:       `1px solid ${T.bdr}`,
      borderRadius: 9,
      padding:      "9px 13px",
      boxShadow:    "0 4px 16px rgba(0,0,0,.1)",
      fontSize:     11.5,
      minWidth:     120,
    }}>
      {label && (
        <div style={{ fontWeight:800, color:T.navy, marginBottom:5,
          borderBottom:`1px solid ${T.bdr}`, paddingBottom:4 }}>
          {label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center",
          gap:6, marginBottom:2 }}>
          <span style={{ width:8, height:8, borderRadius:"50%",
            background:entry.color, display:"inline-block", flexShrink:0 }}/>
          <span style={{ color:T.tM }}>{entry.name}:</span>
          <span style={{ fontWeight:700, color:T.navy }}>
            {typeof entry.value === "number"
              ? `${fmt.number(entry.value, 1)}${unit || ""}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
});

// ── CHART WRAPPER ─────────────────────────────────────────────
const ChartWrap = memo(({ title, subtitle, children, height = 260, action }) => (
  <div style={{ width:"100%" }}>
    {(title || action) && (
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div>
          {title && (
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              fontFamily:"var(--font-display)" }}>{title}</div>
          )}
          {subtitle && (
            <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>{subtitle}</div>
          )}
        </div>
        {action}
      </div>
    )}
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  </div>
));

// ── 1. LINE CHART ─────────────────────────────────────────────
export const SpLineChart = memo(({
  data = [], lines = [], title, subtitle,
  height = 260, xKey = "name", unit = "",
  showGrid = true, showBrush = false, action,
}) => (
  <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
    <LineChart data={data} margin={{ top:5, right:16, left:0, bottom:5 }}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>}
      <XAxis dataKey={xKey} tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
      <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
      <Tooltip content={<CustomTooltip unit={unit}/>}/>
      <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
      {lines.map((line, i) => (
        <Line
          key={line.key}
          type="monotone"
          dataKey={line.key}
          name={line.label || line.key}
          stroke={line.color || PALETTE[i % PALETTE.length]}
          strokeWidth={line.width || 2.5}
          dot={{ r:3, fill:line.color || PALETTE[i % PALETTE.length] }}
          activeDot={{ r:5 }}
          strokeDasharray={line.dashed ? "5 3" : undefined}
        />
      ))}
      {showBrush && <Brush dataKey={xKey} height={22} stroke={T.bdr}
        travellerWidth={6} fill={T.bg}/>}
    </LineChart>
  </ChartWrap>
));

// ── 2. AREA CHART ─────────────────────────────────────────────
export const SpAreaChart = memo(({
  data = [], areas = [], title, subtitle,
  height = 240, xKey = "name", unit = "",
  showGrid = true, stacked = false, action,
}) => (
  <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
    <AreaChart data={data} margin={{ top:5, right:16, left:0, bottom:5 }}>
      <defs>
        {areas.map((area, i) => {
          const c = area.color || PALETTE[i % PALETTE.length];
          return (
            <linearGradient key={area.key} id={`grad_${area.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={c} stopOpacity={0.18}/>
              <stop offset="95%" stopColor={c} stopOpacity={0.02}/>
            </linearGradient>
          );
        })}
      </defs>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>}
      <XAxis dataKey={xKey} tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
      <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
      <Tooltip content={<CustomTooltip unit={unit}/>}/>
      <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
      {areas.map((area, i) => {
        const c = area.color || PALETTE[i % PALETTE.length];
        return (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.label || area.key}
            stroke={c}
            strokeWidth={2.5}
            fill={`url(#grad_${area.key})`}
            stackId={stacked ? "stack" : undefined}
          />
        );
      })}
    </AreaChart>
  </ChartWrap>
));

// ── 3. BAR CHART ──────────────────────────────────────────────
export const SpBarChart = memo(({
  data = [], bars = [], title, subtitle,
  height = 240, xKey = "name", unit = "",
  showGrid = true, horizontal = false,
  showValues = false, action,
}) => {
  const ChartComponent = horizontal ? BarChart : BarChart;

  const renderCustomLabel = (props) => {
    const { x, y, width, height: h, value } = props;
    if (!value) return null;
    return (
      <text x={x + width / 2} y={y - 4} fill={T.tM}
        textAnchor="middle" fontSize={9} fontWeight={700}>
        {value}
      </text>
    );
  };

  return (
    <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top:showValues?18:5, right:16, left:0, bottom:5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={T.bdr}
          vertical={!horizontal} horizontal={horizontal}/>}
        {horizontal
          ? <>
              <XAxis type="number" tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
              <YAxis dataKey={xKey} type="category" tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={110}/>
            </>
          : <>
              <XAxis dataKey={xKey} tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
            </>
        }
        <Tooltip content={<CustomTooltip unit={unit}/>}/>
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>}
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label || bar.key}
            fill={bar.color || PALETTE[i % PALETTE.length]}
            radius={[4,4,0,0]}
            maxBarSize={48}
            label={showValues ? renderCustomLabel : false}
          />
        ))}
      </BarChart>
    </ChartWrap>
  );
});

// ── 4. RADAR CHART ────────────────────────────────────────────
export const SpRadarChart = memo(({
  data = [], series = [], title, subtitle,
  height = 300, angleKey = "dimension", action,
}) => (
  <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
    <RadarChart data={data} margin={{ top:10, right:30, left:30, bottom:10 }}>
      <PolarGrid stroke={T.bdr} strokeDasharray="3 3"/>
      <PolarAngleAxis dataKey={angleKey}
        tick={{ fontSize:10.5, fill:T.tM, fontWeight:600 }}/>
      <PolarRadiusAxis
        angle={90} domain={[0, 100]}
        tick={{ fontSize:9, fill:T.tL }} tickCount={5}/>
      <Tooltip content={<CustomTooltip unit="%"/>}/>
      {series.length > 1 && <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>}
      {series.map((s, i) => (
        <Radar
          key={s.key}
          name={s.label || s.key}
          dataKey={s.key}
          stroke={s.color || PALETTE[i % PALETTE.length]}
          fill={s.color   || PALETTE[i % PALETTE.length]}
          fillOpacity={s.fillOpacity ?? 0.15}
          strokeWidth={2}
        />
      ))}
    </RadarChart>
  </ChartWrap>
));

// ── 5. PIE / DONUT CHART ──────────────────────────────────────
export const SpPieChart = memo(({
  data = [], title, subtitle,
  height = 280, innerRadius = 55,
  outerRadius = 90, showLabels = true, action,
}) => {
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null;
    const RADIAN  = Math.PI / 180;
    const radius  = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={T.tM} textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central" fontSize={10} fontWeight={600}>
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
          labelLine={showLabels}
          label={showLabels ? renderLabel : false}
        >
          {data.map((entry, i) => (
            <Cell
              key={`cell-${i}`}
              fill={entry.color || PALETTE[i % PALETTE.length]}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value}`, name]}
          contentStyle={{ borderRadius:9, border:`1px solid ${T.bdr}`, fontSize:11.5 }}
        />
        <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
      </PieChart>
    </ChartWrap>
  );
});

// ── 6. COMBO LINE + BAR ───────────────────────────────────────
export const SpComboChart = memo(({
  data = [], bars = [], lines = [], title, subtitle,
  height = 260, xKey = "name", unit = "", action,
}) => (
  <ChartWrap title={title} subtitle={subtitle} height={height} action={action}>
    <BarChart data={data} margin={{ top:5, right:16, left:0, bottom:5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>
      <XAxis dataKey={xKey} tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
      <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
      <Tooltip content={<CustomTooltip unit={unit}/>}/>
      <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
      {bars.map((bar, i) => (
        <Bar key={bar.key} dataKey={bar.key} name={bar.label || bar.key}
          fill={bar.color || PALETTE[i % PALETTE.length]} radius={[4,4,0,0]} maxBarSize={40}/>
      ))}
      {lines.map((line, i) => (
        <Line key={line.key} type="monotone" dataKey={line.key}
          name={line.label || line.key}
          stroke={line.color || PALETTE[(i + bars.length) % PALETTE.length]}
          strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }}/>
      ))}
    </BarChart>
  </ChartWrap>
));

// ── 7. GAUGE CHART ────────────────────────────────────────────
export const GaugeChart = memo(({ value, max = 100, label, size = 160 }) => {
  const pct     = Math.min(100, Math.max(0, (value / max) * 100));
  const angle   = -135 + (pct / 100) * 270;
  const c       = color.progressBar(pct);
  const cx      = size / 2;
  const cy      = size / 2;
  const R       = size * 0.38;

  const polarToCartesian = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  };

  const describeArc = (startDeg, endDeg) => {
    const s = polarToCartesian(startDeg);
    const e = polarToCartesian(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Track */}
        <path d={describeArc(-135, 135)} fill="none" stroke={T.bdr} strokeWidth={size * 0.08}
          strokeLinecap="round"/>
        {/* Fill */}
        <path d={describeArc(-135, angle)} fill="none" stroke={c} strokeWidth={size * 0.08}
          strokeLinecap="round" style={{ transition:"all .5s ease" }}/>
        {/* Value text */}
        <text x={cx} y={cy * 0.98} textAnchor="middle" dominantBaseline="middle"
          fill={c} fontSize={size * 0.2} fontWeight={900}
          fontFamily="var(--font-display)">
          {Math.round(pct)}%
        </text>
        <text x={cx} y={cy * 1.25} textAnchor="middle" dominantBaseline="middle"
          fill={T.tL} fontSize={size * 0.09}>
          {value} / {max}
        </text>
      </svg>
      {label && (
        <div style={{ fontSize:11, fontWeight:700, color:T.tM, textAlign:"center" }}>
          {label}
        </div>
      )}
    </div>
  );
});

// ── 8. WATERFALL CHART ────────────────────────────────────────
export const WaterfallChart = memo(({ data = [], title, height = 260, unit = "" }) => {
  const processed = data.reduce((acc, item, i) => {
    const prev  = acc[i - 1];
    const start = i === 0 ? 0 : prev.start + prev.value;
    const isPos = item.value >= 0;
    return [...acc, { ...item, start, isPos }];
  }, []);

  return (
    <ChartWrap title={title} height={height}>
      <BarChart data={processed} margin={{ top:5, right:16, left:0, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={42}/>
        <Tooltip
          formatter={(v, name) => name === "value" ? [`${v > 0 ? "+" : ""}${v}${unit}`, "Cambio"] : null}
          contentStyle={{ borderRadius:9, border:`1px solid ${T.bdr}`, fontSize:11.5 }}
        />
        <Bar dataKey="start" stackId="a" fill="transparent"/>
        <Bar dataKey="value" stackId="a" radius={[4,4,0,0]} maxBarSize={48}>
          {processed.map((entry, i) => (
            <Cell key={i} fill={entry.isPos ? T.green : T.red}/>
          ))}
        </Bar>
      </BarChart>
    </ChartWrap>
  );
});

// ── 9. BULLET CHART (KPI vs meta) ─────────────────────────────
export const BulletChart = memo(({ items = [], title, height }) => (
  <div>
    {title && (
      <div style={{ fontSize:13, fontWeight:800, color:T.navy,
        fontFamily:"var(--font-display)", marginBottom:12 }}>{title}</div>
    )}
    {items.map((item, i) => {
      const pct = Math.min(100, Math.round((item.value / item.target) * 100));
      const c   = color.progressBar(pct);
      return (
        <div key={i} style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:12, fontWeight:600, color:T.txt }}>{item.name}</span>
            <span style={{ fontSize:11, color:T.tL }}>
              {item.value}{item.unit} / <span style={{ fontWeight:700 }}>{item.target}{item.unit}</span>
            </span>
          </div>
          <div style={{ position:"relative", height:14, background:"#e6ecf5",
            borderRadius:99, overflow:"hidden" }}>
            {/* Background zones */}
            <div style={{ position:"absolute", inset:0, display:"flex" }}>
              <div style={{ width:"60%", background:"#fee2e2", opacity:.3 }}/>
              <div style={{ width:"25%", background:"#fef3c7", opacity:.3 }}/>
              <div style={{ width:"15%", background:"#d1fae5", opacity:.3 }}/>
            </div>
            {/* Actual value */}
            <div style={{ position:"absolute", top:0, left:0, height:"100%",
              width:`${pct}%`, background:c, borderRadius:99,
              transition:"width .5s ease" }}/>
            {/* Target line */}
            <div style={{ position:"absolute", top:0, right:0, width:2,
              height:"100%", background:T.navy, opacity:.5 }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
            <span style={{ fontSize:9.5, color:c, fontWeight:700 }}>{pct}%</span>
            <span style={{ fontSize:9.5, color:T.tL }}>Meta: {item.target}{item.unit}</span>
          </div>
        </div>
      );
    })}
  </div>
));

// ── 10. PREDICTION CHART ──────────────────────────────────────
export const PredictionChart = memo(({
  historical = [], predictions = [], title, subtitle,
  xLabels = [], height = 260, unit = "", confidence = 0,
}) => {
  const histLen = historical.length;
  const allLabels = [
    ...xLabels.slice(0, histLen),
    ...Array.from({ length: predictions.length }, (_, i) => `+${i + 1}`),
  ];

  const chartData = [
    ...historical.map((v, i) => ({
      name:       allLabels[i] || `M${i + 1}`,
      real:       v,
      prediction: null,
    })),
    // Overlap point for smooth join
    ...(historical.length > 0 ? [{
      name:       allLabels[histLen] || `+1`,
      real:       historical[historical.length - 1],
      prediction: historical[historical.length - 1],
    }] : []),
    ...predictions.map((v, i) => ({
      name:       allLabels[histLen + i + 1] || `+${i + 2}`,
      real:       null,
      prediction: v,
    })),
  ];

  return (
    <ChartWrap title={title} subtitle={subtitle} height={height}>
      <AreaChart data={chartData} margin={{ top:5, right:16, left:0, bottom:5 }}>
        <defs>
          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={T.teal} stopOpacity={0.15}/>
            <stop offset="95%" stopColor={T.teal} stopOpacity={0.02}/>
          </linearGradient>
          <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={T.gold} stopOpacity={0.15}/>
            <stop offset="95%" stopColor={T.gold} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
        <Tooltip content={<CustomTooltip unit={unit}/>}/>
        <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
        <ReferenceLine
          x={allLabels[histLen - 1] || `M${histLen}`}
          stroke={T.bdr} strokeDasharray="6 3"
          label={{ value:"Hoy", position:"top", fontSize:9.5, fill:T.tL }}
        />
        <Area type="monotone" dataKey="real" name="Real"
          stroke={T.teal} strokeWidth={2.5} fill="url(#gradReal)"
          dot={{ r:3, fill:T.teal }} connectNulls={false}/>
        <Area type="monotone" dataKey="prediction" name={`Predicción (${confidence}%)`}
          stroke={T.gold} strokeWidth={2} strokeDasharray="6 3"
          fill="url(#gradPred)" dot={{ r:3, fill:T.gold }} connectNulls={false}/>
      </AreaChart>
    </ChartWrap>
  );
});

// ── 11. BENCHMARK BAR ─────────────────────────────────────────
export const BenchmarkChart = memo(({ data = [], title, height = 280 }) => {
  const chartData = data.map(d => ({
    name:      d.metric,
    Empresa:   d.company,
    Industria: d.industry,
    Top10:     d.top10,
  }));

  return (
    <ChartWrap title={title} height={height}>
      <BarChart data={chartData} margin={{ top:5, right:16, left:0, bottom:60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.bdr} vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize:10, fill:T.tL, angle:-25,
          textAnchor:"end" }} axisLine={false} tickLine={false} interval={0}/>
        <YAxis tick={{ fontSize:10, fill:T.tL }} axisLine={false} tickLine={false} width={36}/>
        <Tooltip contentStyle={{ borderRadius:9, border:`1px solid ${T.bdr}`, fontSize:11.5 }}/>
        <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
        <Bar dataKey="Empresa"   fill={T.teal}   radius={[4,4,0,0]} maxBarSize={32}/>
        <Bar dataKey="Industria" fill={T.blue}   radius={[4,4,0,0]} maxBarSize={32}/>
        <Bar dataKey="Top10"     fill={T.gold}   radius={[4,4,0,0]} maxBarSize={32}/>
      </BarChart>
    </ChartWrap>
  );
});

export { CustomTooltip, ChartWrap };
