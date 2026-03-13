// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Dashboard Ejecutivo
// ══════════════════════════════════════════════════════════════

import { memo, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, StatCard, Donut, Bar, Badge,
  StatusBadge, TrafficLight, SectionHeader,
  T, Avatar,
} from "../ui/index.jsx";
import {
  SpLineChart, SpAreaChart, SpBarChart,
  SpPieChart, GaugeChart,
} from "../charts/index.jsx";
import { color, calc, fmt, str } from "../../utils/helpers.js";
import { MONTHS } from "../../data/mockData.js";

// ── WIDGET: IEG SCORE ─────────────────────────────────────────
const IEGWidget = memo(({ avg }) => {
  const ieg = calc.globalIndex(avg, 38);
  const status = parseFloat(ieg) >= 1.0 ? { l:"Adelantado", c:T.green }
    : parseFloat(ieg) >= 0.8 ? { l:"En ritmo",  c:T.teal  }
    : parseFloat(ieg) >= 0.6 ? { l:"En riesgo", c:"#d97706"}
    : { l:"Rezago crítico", c:T.red };

  return (
    <Card sx={{ padding:"18px 20px", background:`linear-gradient(135deg,${T.navy} 0%,${T.navyL} 60%,${T.teal}22 100%)`, border:"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
        <div>
          <div style={{ fontSize:9.5, letterSpacing:".15em", color:"rgba(255,255,255,.4)", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>
            Plataforma Estratégica · 2025–2027
          </div>
          <div style={{ fontSize:24, fontWeight:900, color:"#fff", fontFamily:"var(--font-display)", marginBottom:2 }}>
            Hospital Punta Médica
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:14 }}>
            StratexPoints · BSC + OKR + KPI + IA
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <div style={{ background:"rgba(14,165,160,.2)", border:"1px solid rgba(14,165,160,.4)", borderRadius:20, padding:"5px 14px", display:"inline-flex", alignItems:"center", gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:T.teal, display:"inline-block" }}/>
              <span style={{ color:T.teal, fontWeight:700, fontSize:11 }}>Q1–Q2 2025 Activo</span>
            </div>
            <div style={{ background:`${status.c}22`, border:`1px solid ${status.c}55`, borderRadius:20, padding:"5px 14px", display:"inline-flex", alignItems:"center", gap:6 }}>
              <span style={{ color:status.c, fontWeight:700, fontSize:11 }}>IEG: {ieg} — {status.l}</span>
            </div>
          </div>
        </div>
        <GaugeChart value={avg} max={100} label="Avance Global" size={130}/>
      </div>
    </Card>
  );
});

// ── WIDGET: KPI CARD ──────────────────────────────────────────
const KPICard = memo(({ kpi, onClick }) => {
  const pct = calc.progress(kpi.value, kpi.target, kpi.inverse);
  const tl  = color.trafficLight(kpi.value, kpi.target, kpi.inverse);
  const trendMap = { up:"↑", down:"↓", flat:"→" };
  const trendColor = { up:T.green, down:T.red, flat:T.tM };

  return (
    <Card hover onClick={onClick} sx={{ padding:"14px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.tL, letterSpacing:".06em", textTransform:"uppercase", marginBottom:3 }}>
            {kpi.name}
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:T.navy, lineHeight:1, fontFamily:"var(--font-display)" }}>
            {fmt.number(kpi.value, 1)}
            <span style={{ fontSize:13, fontWeight:600, color:T.tM, marginLeft:3 }}>{kpi.unit}</span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:tl.color, boxShadow:`0 0 6px ${tl.color}60` }}/>
          <span style={{ fontSize:12, fontWeight:800, color:trendColor[kpi.trend] }}>
            {trendMap[kpi.trend]}
          </span>
        </div>
      </div>
      <Bar value={pct} height={5} barColor={tl.color}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
        <span style={{ fontSize:10, color:T.tL }}>Meta: {kpi.target}{kpi.unit}</span>
        <span style={{ fontSize:10, fontWeight:700, color:tl.color }}>{pct}%</span>
      </div>
    </Card>
  );
});

// ── WIDGET: OKR CARD ──────────────────────────────────────────
const OKRCard = memo(({ okr, onNavigate }) => {
  const { getUserById } = useApp();
  const owner = getUserById(okr.owner);

  return (
    <Card hover onClick={() => onNavigate("okr")} sx={{ padding:"13px 15px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:9.5, fontWeight:800, background:`${T.teal}15`, color:T.teal, padding:"2px 8px", borderRadius:20 }}>
              {okr.code}
            </span>
            <StatusBadge status={okr.status}/>
          </div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.navy, lineHeight:1.35, marginBottom:8 }}>
            {okr.objective}
          </div>
        </div>
      </div>
      <Bar value={okr.progress}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:7 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <Avatar name={owner?.name || ""} size={20}/>
          <span style={{ fontSize:10, color:T.tL }}>{owner?.name?.split(" ")[0]}</span>
        </div>
        <span style={{ fontSize:10, color:T.tL }}>{okr.keyResults.length} KRs</span>
      </div>
    </Card>
  );
});

// ── WIDGET: ALERT ROW ─────────────────────────────────────────
const AlertRow = memo(({ alert, onMarkRead }) => {
  const sev = {
    critical: { c:T.red,   i:"🚨", bg:"#fef2f2" },
    warning:  { c:"#d97706",i:"⚠️",bg:"#fef9c3" },
    info:     { c:T.blue,  i:"ℹ️", bg:"#eff6ff" },
  };
  const s = sev[alert.severity] || sev.info;

  return (
    <div onClick={() => onMarkRead(alert.id)} style={{
      display:"flex", gap:10, padding:"9px 14px",
      background: alert.read ? "transparent" : `${T.teal}06`,
      borderLeft: `3px solid ${alert.read ? "transparent" : s.c}`,
      cursor:"pointer", transition:"background .15s",
      borderBottom:`1px solid ${T.bdr}`,
    }}
    onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
    onMouseLeave={e => e.currentTarget.style.background= alert.read ? "transparent" : `${T.teal}06`}
    >
      <span style={{ fontSize:16, flexShrink:0 }}>{s.i}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight: alert.read ? 600 : 800, color: alert.read ? T.tM : T.navy }}>
          {alert.title}
        </div>
        <div style={{ fontSize:11, color:T.tL, marginTop:2, lineHeight:1.4,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {alert.message}
        </div>
      </div>
      {!alert.read && (
        <span style={{ width:8, height:8, borderRadius:"50%", background:T.teal,
          display:"inline-block", flexShrink:0, marginTop:4 }}/>
      )}
    </div>
  );
});

// ── WIDGET: PERSPECTIVE HEALTH ────────────────────────────────
const PerspectiveHealth = memo(({ onNavigate }) => {
  const { getPerspectiveHealth } = useApp();
  const health = getPerspectiveHealth();

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:12, fontWeight:800, color:T.navy, marginBottom:12,
        fontFamily:"var(--font-display)" }}>
        Salud por Perspectiva BSC
      </div>
      {health.map(p => (
        <div key={p.id} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:14 }}>{p.icon}</span>
              <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>{p.label}</span>
              <span style={{ fontSize:10, color:T.tL }}>{p.objectiveCount} objetivos</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:12, fontWeight:800, color:p.color }}>{p.avgProgress}%</span>
              <div style={{ width:8, height:8, borderRadius:"50%",
                background: p.health==="green" ? T.green : p.health==="yellow" ? "#d97706" : T.red }}/>
            </div>
          </div>
          <Bar value={p.avgProgress} height={6} barColor={p.color}/>
        </div>
      ))}
    </Card>
  );
});

// ── WIDGET: QUICK STATS ───────────────────────────────────────
const QuickStats = memo(({ okrs, kpis, initiatives, alerts, onNavigate }) => {
  const stats = [
    {
      label:"Índice Global",
      value:`${calc.avgProgress(okrs)}%`,
      sub:"Ejecución OKR",
      color: color.progressBar(calc.avgProgress(okrs)),
      icon:"📊",
      module:"okr",
    },
    {
      label:"KPIs Críticos",
      value: kpis.filter(k => k.trafficLight === "red").length,
      sub:"En zona roja",
      color: T.red,
      icon:"🚨",
      module:"kpi",
    },
    {
      label:"Iniciativas Activas",
      value: initiatives.filter(i => i.status !== "completed").length,
      sub:`de ${initiatives.length} totales`,
      color: T.blue,
      icon:"🚀",
      module:"initiatives",
    },
    {
      label:"Alertas Pendientes",
      value: alerts.filter(a => !a.read).length,
      sub:"Sin revisar",
      color: "#d97706",
      icon:"🔔",
      module:"alerts",
    },
  ];

  return (
    <div className="sp-grid-4">
      {stats.map((s, i) => (
        <StatCard
          key={i}
          label={s.label}
          value={s.value}
          sub={s.sub}
          icon={s.icon}
          color={s.color}
          onClick={() => onNavigate(s.module)}
        />
      ))}
    </div>
  );
});

// ── MAIN DASHBOARD ────────────────────────────────────────────
const Dashboard = memo(({ onNavigate }) => {
  const {
    okrs, kpis, initiatives, alerts,
    kpiHistory, markAlertRead, months,
  } = useApp();

  const avg = useMemo(() => calc.avgProgress(okrs), [okrs]);

  // Datos para gráfica de tendencia
  const trendData = useMemo(() =>
    MONTHS.map((m, i) => ({
      name: m,
      Admisiones: kpiHistory.kpi1?.[i]  ?? null,
      NPS:        kpiHistory.kpi5?.[i]  ?? null,
      Personal:   kpiHistory.kpi13?.[i] ?? null,
    })).filter(d => d.Admisiones !== null),
  [kpiHistory]);

  // Datos para pie de perspectivas
  const perspectiveData = useMemo(() => {
    const { getPerspectiveHealth } = useApp();
    return []; // Se calcula abajo con el hook
  }, []);

  const { getPerspectiveHealth } = useApp();
  const healthData = useMemo(() =>
    getPerspectiveHealth().map(p => ({
      name:  p.label,
      value: p.avgProgress,
      color: p.color,
    })),
  [getPerspectiveHealth]);

  // KPIs destacados
  const featuredKPIs = useMemo(() =>
    kpis.filter(k => ["kpi1","kpi5","kpi9","kpi3","kpi12","kpi11"].includes(k.id)),
  [kpis]);

  // Initiatives budget data
  const budgetData = useMemo(() =>
    initiatives.slice(0, 6).map(i => ({
      name:       i.title.substring(0, 20) + "…",
      Presupuesto:i.budget / 1000,
      Ejecutado:  i.spent  / 1000,
    })),
  [initiatives]);

  return (
    <div className="sp-page" style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* Hero IEG */}
      <IEGWidget avg={avg}/>

      {/* Quick stats */}
      <QuickStats
        okrs={okrs} kpis={kpis}
        initiatives={initiatives} alerts={alerts}
        onNavigate={onNavigate}
      />

      {/* KPIs grid */}
      <div>
        <SectionHeader
          title="KPIs Estratégicos"
          subtitle="Indicadores clave en tiempo real"
          action={
            <button onClick={() => onNavigate("kpi")}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:12, color:T.teal, fontWeight:700 }}>
              Ver todos →
            </button>
          }
        />
        <div className="sp-grid-3" style={{ gap:10 }}>
          {featuredKPIs.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} onClick={() => onNavigate("kpi")}/>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="sp-grid-2">
        <Card sx={{ padding:"16px 18px" }}>
          <SpAreaChart
            data={trendData}
            title="Tendencia KPIs Clave"
            subtitle="Últimos 3 meses registrados"
            height={220}
            xKey="name"
            areas={[
              { key:"Admisiones", label:"Admisiones/mes",   color:T.teal   },
              { key:"NPS",        label:"NPS Pacientes",    color:T.blue   },
              { key:"Personal",   label:"Personal Cert. %", color:T.violet },
            ]}
          />
        </Card>
        <Card sx={{ padding:"16px 18px" }}>
          <SpPieChart
            data={healthData}
            title="Progreso por Perspectiva"
            subtitle="Promedio de avance BSC"
            height={220}
            innerRadius={45}
            outerRadius={80}
            showLabels={false}
          />
        </Card>
      </div>

      {/* OKRs grid */}
      <div>
        <SectionHeader
          title="OKRs Activos"
          subtitle={`${okrs.length} objetivos · Período Q1-Q2 2025`}
          action={
            <button onClick={() => onNavigate("okr")}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:12, color:T.teal, fontWeight:700 }}>
              Ver todos →
            </button>
          }
        />
        <div className="sp-grid-2">
          {okrs.map(okr => (
            <OKRCard key={okr.id} okr={okr} onNavigate={onNavigate}/>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="sp-grid-2">

        {/* Alerts */}
        <Card>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdr}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              fontFamily:"var(--font-display)" }}>
              🔔 Alertas Recientes
            </div>
            <button onClick={() => onNavigate("alerts")}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:11.5, color:T.teal, fontWeight:700 }}>
              Ver todas →
            </button>
          </div>
          <div>
            {alerts.slice(0, 5).map(al => (
              <AlertRow key={al.id} alert={al} onMarkRead={markAlertRead}/>
            ))}
          </div>
        </Card>

        {/* Budget chart */}
        <Card sx={{ padding:"16px 18px" }}>
          <SpBarChart
            data={budgetData}
            title="Presupuesto vs Ejecutado"
            subtitle="Iniciativas estratégicas (MXN miles)"
            height={260}
            xKey="name"
            horizontal={true}
            bars={[
              { key:"Presupuesto", color:`${T.teal}55`, label:"Presupuesto" },
              { key:"Ejecutado",   color:T.teal,        label:"Ejecutado"   },
            ]}
          />
        </Card>
      </div>

      {/* Perspective health */}
      <div className="sp-grid-2">
        <PerspectiveHealth onNavigate={onNavigate}/>

        {/* Donuts OKR */}
        <Card sx={{ padding:"16px 18px" }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
            fontFamily:"var(--font-display)" }}>
            Avance Individual OKRs
          </div>
          <div style={{ display:"flex", gap:18, flexWrap:"wrap", justifyContent:"center" }}>
            {okrs.map(okr => (
              <Donut
                key={okr.id}
                percent={okr.progress}
                size={80}
                label={okr.code}
                sub={okr.status === "on_track" ? "✅" : "⚠️"}
                onClick={() => onNavigate("okr")}
              />
            ))}
          </div>
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${T.bdr}` }}>
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {[["✅","En curso"],["⚠️","En riesgo"],["🏆","Completado"],["⭕","Sin iniciar"]].map(([i,l]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:T.tM }}>
                  <span>{i}</span><span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick nav */}
      <Card sx={{ padding:"16px 18px" }}>
        <div style={{ fontSize:12, fontWeight:800, color:T.navy, marginBottom:12,
          fontFamily:"var(--font-display)" }}>
          Acceso Rápido a Módulos
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
          {[
            { id:"bsc",        i:"🗺️", l:"Mapa BSC"       },
            { id:"okr",        i:"🎯", l:"OKR Manager"     },
            { id:"kpi",        i:"📊", l:"KPI Analytics"   },
            { id:"bowling",    i:"🎳", l:"Bowling Chart"   },
            { id:"radar",      i:"🕸️", l:"Radar"           },
            { id:"simulator",  i:"⚡", l:"Simulador"       },
            { id:"prediction", i:"🔮", l:"Predicción IA"   },
            { id:"ai",         i:"🤖", l:"IA Estratégica"  },
            { id:"chat",       i:"💬", l:"Asistente"       },
            { id:"benchmark",  i:"📈", l:"Benchmark"       },
            { id:"export",     i:"📤", l:"Exportar"        },
            { id:"alerts",     i:"🔔", l:"Alertas"         },
          ].map(n => (
            <div key={n.id}
              onClick={() => onNavigate(n.id)}
              style={{ padding:"11px 8px", background:T.bg, borderRadius:9,
                textAlign:"center", cursor:"pointer", transition:"all .15s",
                border:`1px solid ${T.bdr}` }}
              onMouseEnter={e => { e.currentTarget.style.background=`${T.teal}10`; e.currentTarget.style.borderColor=T.teal; }}
              onMouseLeave={e => { e.currentTarget.style.background=T.bg; e.currentTarget.style.borderColor=T.bdr; }}
            >
              <div style={{ fontSize:20, marginBottom:4 }}>{n.i}</div>
              <div style={{ fontSize:10.5, fontWeight:700, color:T.navy }}>{n.l}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
});

export default Dashboard;
```

---

✅ **Carpeta 8 — Dashboard lista.**

Estructura actualizada:
```
stratexpoints/
├── components/
│   ├── modules/
│   │   └── Dashboard.jsx    ← nueva
│   ├── charts/
│   ├── layout/
│   └── ui/
├── context/
├── data/
├── utils/
├── App.jsx ...
