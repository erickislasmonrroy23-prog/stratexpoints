// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — KPI Analytics
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, Input, Select, Textarea, AlertBox,
  EmptyState, Tabs, T, Spinner,
} from "../ui/index.jsx";
import {
  SpLineChart, SpBarChart, SpAreaChart,
  BulletChart, GaugeChart,
} from "../charts/index.jsx";
import { color, calc, fmt, genId } from "../../utils/helpers.js";
import { MONTHS } from "../../data/mockData.js";

// ── CONSTANTES ────────────────────────────────────────────────
const FREQ_OPTIONS = [
  { value:"monthly",   label:"Mensual"   },
  { value:"quarterly", label:"Trimestral"},
  { value:"weekly",    label:"Semanal"   },
  { value:"annual",    label:"Anual"     },
];
const TREND_OPTIONS = [
  { value:"up",   label:"↑ Subiendo" },
  { value:"down", label:"↓ Bajando"  },
  { value:"flat", label:"→ Estable"  },
];
const TYPE_OPTIONS = [
  { value:"resultado",  label:"Resultado"  },
  { value:"proceso",    label:"Proceso"    },
  { value:"inductor",   label:"Inductor"   },
  { value:"financiero", label:"Financiero" },
];

// ── SEMÁFORO GRANDE ───────────────────────────────────────────
const TrafficLightBig = memo(({ value, target, inverse }) => {
  const key = color.trafficLightKey(value, target, inverse);
  const cfg = {
    green:  { c:"#059669", bg:"#d1fae5", label:"✅ En Meta",      desc:"Indicador dentro del rango objetivo" },
    yellow: { c:"#d97706", bg:"#fef3c7", label:"⚠️ En Riesgo",    desc:"Requiere monitoreo cercano"          },
    red:    { c:"#dc2626", bg:"#fee2e2", label:"🚨 Fuera de Meta", desc:"Acción correctiva requerida"         },
  };
  const m = cfg[key];
  return (
    <div style={{ padding:"10px 14px", borderRadius:10, background:m.bg,
      border:`1.5px solid ${m.c}30`, textAlign:"center" }}>
      <div style={{ fontSize:13, fontWeight:800, color:m.c }}>{m.label}</div>
      <div style={{ fontSize:10.5, color:m.c, opacity:.8, marginTop:2 }}>{m.desc}</div>
    </div>
  );
});

// ── KPI CARD ──────────────────────────────────────────────────
const KPICard = memo(({ kpi, perspective, onSelect, onEdit }) => {
  const pct = calc.progress(kpi.value, kpi.target, kpi.inverse);
  const tl  = color.trafficLight(kpi.value, kpi.target, kpi.inverse);
  const trendMap   = { up:"↑", down:"↓", flat:"→" };
  const trendColor = { up:T.green, down:T.red, flat:T.tM };

  return (
    <Card hover sx={{ padding:"14px 16px" }} onClick={() => onSelect(kpi)}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:9 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:5 }}>
            {perspective && (
              <span style={{ fontSize:9, fontWeight:800, padding:"1px 7px",
                borderRadius:20, background:perspective.bg, color:perspective.color }}>
                {perspective.icon}
              </span>
            )}
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px",
              borderRadius:20, background:T.bg, color:T.tM,
              border:`1px solid ${T.bdr}` }}>
              {kpi.frequency === "monthly" ? "Mensual" :
               kpi.frequency === "quarterly" ? "Trimestral" : kpi.frequency}
            </span>
            {kpi.inverse && (
              <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px",
                borderRadius:20, background:"#fef3c7", color:"#92400e" }}>
                ↓ Inverso
              </span>
            )}
          </div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.navy,
            lineHeight:1.3 }}>
            {kpi.name}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column",
          alignItems:"flex-end", gap:4, flexShrink:0 }}>
          <div style={{ width:11, height:11, borderRadius:"50%",
            background:tl.color, boxShadow:`0 0 7px ${tl.color}60` }}/>
          <span style={{ fontSize:12, fontWeight:800,
            color:trendColor[kpi.trend] }}>
            {trendMap[kpi.trend]}
          </span>
        </div>
      </div>

      {/* Value */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-end", marginBottom:9 }}>
        <div>
          <span style={{ fontSize:26, fontWeight:900, color:tl.color,
            fontFamily:"var(--font-display)", lineHeight:1 }}>
            {fmt.number(kpi.value, 1)}
          </span>
          <span style={{ fontSize:13, fontWeight:600, color:T.tM, marginLeft:3 }}>
            {kpi.unit}
          </span>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:T.tL }}>Meta</div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy }}>
            {kpi.target}{kpi.unit}
          </div>
        </div>
      </div>

      <Bar value={pct} height={6} barColor={tl.color}/>

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginTop:8, flexWrap:"wrap", gap:4 }}>
        <span style={{ fontSize:10, color:T.tL }}>
          {kpi.formula?.substring(0, 35)}...
        </span>
        <div style={{ display:"flex", gap:6 }}>
          <span style={{ fontSize:10, fontWeight:800, color:tl.color }}>{pct}%</span>
          <button onClick={e => { e.stopPropagation(); onEdit(kpi); }}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:11, padding:"1px 3px" }} title="Editar">✏️</button>
        </div>
      </div>
    </Card>
  );
});

// ── KPI DETAIL MODAL ──────────────────────────────────────────
const KPIDetailModal = memo(({ kpi, perspective, history, onClose, onEdit, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [newVal,  setNewVal]  = useState(kpi.value);
  const pct = calc.progress(kpi.value, kpi.target, kpi.inverse);
  const tl  = color.trafficLight(kpi.value, kpi.target, kpi.inverse);

  const histData = useMemo(() => {
    const h = history[kpi.id] || [];
    return MONTHS.slice(0, h.length).map((m, i) => ({
      name: m,
      Valor: h[i],
      Meta:  kpi.target,
    }));
  }, [history, kpi]);

  const saveValue = () => {
    onUpdate({ ...kpi, value: parseFloat(newVal) || 0 });
    setEditing(false);
  };

  return (
    <Modal
      title={`📊 ${kpi.name}`}
      onClose={onClose}
      maxWidth={720}
      footer={
        <Btn variant="primary" onClick={() => { onEdit(kpi); onClose(); }}>
          ✏️ Editar KPI
        </Btn>
      }
    >
      {/* Badges */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
        {perspective && (
          <span style={{ padding:"3px 11px", borderRadius:20, fontSize:11,
            fontWeight:700, background:perspective.bg, color:perspective.color,
            border:`1px solid ${perspective.border}` }}>
            {perspective.icon} {perspective.label}
          </span>
        )}
        <span style={{ padding:"3px 11px", borderRadius:20, fontSize:11,
          fontWeight:700, background:T.bg, color:T.tM, border:`1px solid ${T.bdr}` }}>
          {kpi.type}
        </span>
        <span style={{ padding:"3px 11px", borderRadius:20, fontSize:11,
          fontWeight:700, background:T.bg, color:T.tM, border:`1px solid ${T.bdr}` }}>
          📅 {kpi.frequency}
        </span>
        {kpi.inverse && (
          <span style={{ padding:"3px 11px", borderRadius:20, fontSize:11,
            fontWeight:700, background:"#fef3c7", color:"#92400e" }}>
            ↓ Indicador inverso
          </span>
        )}
      </div>

      {/* Hero value */}
      <div className="sp-grid-2" style={{ gap:14, marginBottom:16 }}>
        <Card sx={{ padding:"16px", background:`${tl.color}08`,
          border:`1.5px solid ${tl.color}30` }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.tL,
            letterSpacing:".08em", marginBottom:8 }}>VALOR ACTUAL</div>
          {editing ? (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input
                type="number"
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                autoFocus
                style={{ width:100, padding:"6px 10px", borderRadius:7, fontSize:20,
                  fontWeight:900, border:`2px solid ${T.teal}`, textAlign:"center",
                  color:tl.color }}
                onKeyDown={e => { if (e.key==="Enter") saveValue(); }}
              />
              <span style={{ fontSize:16, color:T.tM }}>{kpi.unit}</span>
              <Btn variant="primary" size="sm" onClick={saveValue}>✓</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>✕</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
              <span style={{ fontSize:38, fontWeight:900, color:tl.color,
                fontFamily:"var(--font-display)", lineHeight:1 }}>
                {fmt.number(kpi.value, 1)}
              </span>
              <span style={{ fontSize:17, color:T.tM }}>{kpi.unit}</span>
              <button onClick={() => setEditing(true)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:T.tL, fontSize:14, marginLeft:4 }}>✏️</button>
            </div>
          )}
          <div style={{ marginTop:10 }}>
            <Bar value={pct} height={8} barColor={tl.color}/>
          </div>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <TrafficLightBig value={kpi.value} target={kpi.target} inverse={kpi.inverse}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"Meta",       value:`${kpi.target}${kpi.unit}`,    c:T.navy  },
              { label:"Avance",     value:`${pct}%`,                      c:tl.color},
              { label:"Línea base", value:`${kpi.baseline}${kpi.unit}`,  c:T.tM    },
              { label:"Tendencia",  value:kpi.trend==="up"?"↑":kpi.trend==="down"?"↓":"→", c:kpi.trend==="up"?T.green:kpi.trend==="down"?T.red:T.tM },
            ].map(item => (
              <div key={item.label} style={{ padding:"7px 10px", background:T.bg,
                borderRadius:8, border:`1px solid ${T.bdr}` }}>
                <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
                  letterSpacing:".06em" }}>{item.label}</div>
                <div style={{ fontSize:14, fontWeight:900, color:item.c,
                  marginTop:2 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formula */}
      <div style={{ padding:"10px 14px", background:`${T.teal}08`,
        borderRadius:8, border:`1px solid ${T.teal}25`, marginBottom:16 }}>
        <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
          letterSpacing:".08em", marginBottom:4 }}>FÓRMULA</div>
        <div style={{ fontSize:12, color:T.navy, fontWeight:600 }}>{kpi.formula}</div>
        {kpi.dataSource && (
          <div style={{ fontSize:10.5, color:T.tL, marginTop:4 }}>
            📁 Fuente: {kpi.dataSource}
          </div>
        )}
      </div>

      {/* History chart */}
      {histData.length > 0 && (
        <Card sx={{ padding:"14px 16px", marginBottom:16 }}>
          <SpLineChart
            data={histData}
            title="Histórico de Valores"
            subtitle={`Últimos ${histData.length} meses`}
            height={200}
            xKey="name"
            lines={[
              { key:"Valor", label:`${kpi.name}`, color:tl.color, width:2.5 },
              { key:"Meta",  label:"Meta",         color:`${T.bdr}`, width:1.5, dashed:true },
            ]}
          />
        </Card>
      )}

      {/* Responsible */}
      {kpi.responsible && (
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"10px 14px",
          background:T.bg, borderRadius:8, border:`1px solid ${T.bdr}` }}>
          <span style={{ fontSize:16 }}>👤</span>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.navy }}>
              {kpi.responsible}
            </div>
            <div style={{ fontSize:10, color:T.tL }}>Responsable del indicador</div>
          </div>
        </div>
      )}
    </Modal>
  );
});

// ── KPI FORM MODAL ────────────────────────────────────────────
const KPIFormModal = memo(({ kpi, perspectives, objectives, onSave, onClose }) => {
  const isEdit = !!kpi;
  const [form, setForm] = useState({
    name:          kpi?.name          || "",
    perspectiveId: kpi?.perspectiveId || "fin",
    type:          kpi?.type          || "resultado",
    unit:          kpi?.unit          || "%",
    value:         kpi?.value         ?? 0,
    target:        kpi?.target        ?? 100,
    baseline:      kpi?.baseline      ?? 0,
    frequency:     kpi?.frequency     || "monthly",
    trend:         kpi?.trend         || "up",
    formula:       kpi?.formula       || "",
    dataSource:    kpi?.dataSource    || "",
    responsible:   kpi?.responsible   || "",
    inverse:       kpi?.inverse       ?? false,
    objectiveId:   kpi?.objectiveId   || "",
  });
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "El nombre es requerido";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      ...form,
      id:          kpi?.id || genId("kpi"),
      value:       parseFloat(form.value)    || 0,
      target:      parseFloat(form.target)   || 100,
      baseline:    parseFloat(form.baseline) || 0,
      trafficLight:color.trafficLightKey(
        parseFloat(form.value), parseFloat(form.target), form.inverse
      ),
    });
    onClose();
  };

  const perspOptions = perspectives.map(p => ({
    value:p.id, label:`${p.icon} ${p.label}`,
  }));
  const objOptions = [
    { value:"", label:"— Sin objetivo padre —" },
    ...objectives.map(o => ({ value:o.id, label:`${o.code}: ${o.title.substring(0,40)}` })),
  ];

  return (
    <Modal
      title={isEdit ? "✏️ Editar KPI" : "➕ Nuevo KPI"}
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {isEdit ? "Guardar Cambios" : "Crear KPI"}
          </Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <Input
          label="Nombre del KPI"
          value={form.name}
          onChange={e => set("name", e.target.value)}
          error={errors.name}
          placeholder="Ej: Tasa de Satisfacción del Paciente"
        />
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Perspectiva BSC" value={form.perspectiveId}
            options={perspOptions}
            onChange={e => set("perspectiveId", e.target.value)}/>
          <Select label="Tipo" value={form.type}
            options={TYPE_OPTIONS}
            onChange={e => set("type", e.target.value)}/>
        </div>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Objetivo Estratégico" value={form.objectiveId}
            options={objOptions}
            onChange={e => set("objectiveId", e.target.value)}/>
          <Input label="Responsable" value={form.responsible}
            onChange={e => set("responsible", e.target.value)}
            placeholder="Nombre del responsable"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
          <Input label="Valor Actual" type="number" value={form.value}
            onChange={e => set("value", e.target.value)}/>
          <Input label="Meta" type="number" value={form.target}
            onChange={e => set("target", e.target.value)}/>
          <Input label="Línea Base" type="number" value={form.baseline}
            onChange={e => set("baseline", e.target.value)}/>
          <Input label="Unidad" value={form.unit}
            onChange={e => set("unit", e.target.value)} placeholder="%"/>
        </div>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Frecuencia" value={form.frequency}
            options={FREQ_OPTIONS}
            onChange={e => set("frequency", e.target.value)}/>
          <Select label="Tendencia esperada" value={form.trend}
            options={TREND_OPTIONS}
            onChange={e => set("trend", e.target.value)}/>
        </div>
        <Input label="Fórmula de cálculo" value={form.formula}
          onChange={e => set("formula", e.target.value)}
          placeholder="Ej: (Pacientes satisfechos / Total pacientes) × 100"/>
        <Input label="Fuente de datos" value={form.dataSource}
          onChange={e => set("dataSource", e.target.value)}
          placeholder="Ej: Sistema HIS, Encuesta NPS"/>

        {/* Inverse toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:10,
          padding:"10px 14px", background:T.bg, borderRadius:8,
          border:`1px solid ${T.bdr}` }}>
          <input
            type="checkbox"
            id="inverse-chk"
            checked={form.inverse}
            onChange={e => set("inverse", e.target.checked)}
            style={{ width:16, height:16, cursor:"pointer", accentColor:T.teal }}
          />
          <label htmlFor="inverse-chk" style={{ fontSize:12.5, fontWeight:600,
            color:T.navy, cursor:"pointer" }}>
            Indicador inverso (menor es mejor)
          </label>
          <span style={{ fontSize:10.5, color:T.tL }}>
            Ej: tiempo de espera, tasa de errores
          </span>
        </div>
      </div>
    </Modal>
  );
});

// ── KPI STATS ─────────────────────────────────────────────────
const KPIStats = memo(({ kpis }) => {
  const total   = kpis.length;
  const green   = kpis.filter(k => k.trafficLight === "green").length;
  const yellow  = kpis.filter(k => k.trafficLight === "yellow").length;
  const red     = kpis.filter(k => k.trafficLight === "red").length;
  const avgProg = useMemo(() => {
    if (!kpis.length) return 0;
    const sum = kpis.reduce((s,k) => s + calc.progress(k.value,k.target,k.inverse), 0);
    return Math.round(sum / kpis.length);
  }, [kpis]);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total KPIs"  value={total}  sub="Indicadores"    icon="📊" color={T.navy}/>
      <StatCard label="En Meta"     value={green}  sub="Semáforo verde" icon="✅" color={T.green}/>
      <StatCard label="En Riesgo"   value={yellow} sub="Monitoreo"      icon="⚠️" color="#d97706"/>
      <StatCard label="Fuera Meta"  value={red}    sub="Acción urgente" icon="🚨" color={T.red}/>
    </div>
  );
});

// ── BULLET SUMMARY ────────────────────────────────────────────
const BulletSummary = memo(({ kpis }) => {
  const items = kpis.slice(0, 8).map(k => ({
    name:   k.name.substring(0, 28),
    value:  k.value,
    target: k.target,
    unit:   k.unit,
  }));
  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        KPIs vs Meta
      </div>
      <BulletChart items={items}/>
    </Card>
  );
});

// ── MAIN KPI ──────────────────────────────────────────────────
const KPI = memo(({ onNavigate }) => {
  const {
    kpis, perspectives, strategicObjectives, kpiHistory,
    updateKPI, addKPI,
  } = useApp();

  const [tab,         setTab]         = useState("grid");
  const [perspFilter, setPerspFilter] = useState("Todos");
  const [tlFilter,    setTLFilter]    = useState("Todos");
  const [typeFilter,  setTypeFilter]  = useState("Todos");
  const [search,      setSearch]      = useState("");
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [editKPI,     setEditKPI]     = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);

  // Filtered KPIs
  const filtered = useMemo(() => kpis.filter(k => {
    const perspOk = perspFilter === "Todos" || k.perspectiveId === perspFilter;
    const tlOk    = tlFilter    === "Todos" || k.trafficLight  === tlFilter;
    const typeOk  = typeFilter  === "Todos" || k.type          === typeFilter;
    const searchOk = !search    || k.name.toLowerCase().includes(search.toLowerCase());
    return perspOk && tlOk && typeOk && searchOk;
  }), [kpis, perspFilter, tlFilter, typeFilter, search]);

  const handleSave = useCallback(data => {
    if (data.id && kpis.find(k => k.id === data.id)) updateKPI(data);
    else addKPI(data);
  }, [kpis, updateKPI, addKPI]);

  const handleUpdate = useCallback(data => {
    updateKPI(data);
  }, [updateKPI]);

  const selectedPersp = useMemo(() =>
    perspectives.find(p => p.id === selectedKPI?.perspectiveId),
  [perspectives, selectedKPI]);

  // Chart data by perspective
  const perspAvgData = useMemo(() =>
    perspectives.map(p => {
      const pKpis = kpis.filter(k => k.perspectiveId === p.id);
      const avg   = pKpis.length
        ? Math.round(pKpis.reduce((s,k) => s + calc.progress(k.value,k.target,k.inverse), 0) / pKpis.length)
        : 0;
      return { name:p.label, Avance:avg, color:p.color };
    }),
  [perspectives, kpis]);

  // Traffic light chart
  const tlChartData = useMemo(() => [
    { name:"En Meta",      value:kpis.filter(k=>k.trafficLight==="green").length,  color:T.green   },
    { name:"En Riesgo",    value:kpis.filter(k=>k.trafficLight==="yellow").length, color:"#d97706" },
    { name:"Fuera de Meta",value:kpis.filter(k=>k.trafficLight==="red").length,    color:T.red     },
  ].filter(d=>d.value>0), [kpis]);

  const TABS = [
    { id:"grid",   label:"📋 Cuadrícula" },
    { id:"table",  label:"📄 Tabla"      },
    { id:"charts", label:"📊 Análisis"   },
    { id:"bullet", label:"🎯 Bullet"     },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="📊 KPI Analytics"
        subtitle={`${kpis.length} indicadores estratégicos · Hospital Punta Médica`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("prediction")}>
              🔮 Ver Predicciones
            </Btn>
            <Btn variant="primary" onClick={() => setShowAdd(true)}>
              + Nuevo KPI
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <KPIStats kpis={kpis}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:16,
        flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar KPI..."
          style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.bdr}`,
            fontSize:12, color:T.txt, background:T.white, minWidth:180 }}
        />
        <select value={perspFilter} onChange={e => setPerspFilter(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
            fontSize:12, color:T.txt, background:T.white }}>
          <option value="Todos">Todas las perspectivas</option>
          {perspectives.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
          ))}
        </select>
        <select value={tlFilter} onChange={e => setTLFilter(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
            fontSize:12, color:T.txt, background:T.white }}>
          <option value="Todos">Todos los semáforos</option>
          <option value="green">✅ En Meta</option>
          <option value="yellow">⚠️ En Riesgo</option>
          <option value="red">🚨 Fuera de Meta</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
            fontSize:12, color:T.txt, background:T.white }}>
          <option value="Todos">Todos los tipos</option>
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(perspFilter!=="Todos"||tlFilter!=="Todos"||typeFilter!=="Todos"||search) && (
          <Btn variant="ghost" size="sm" onClick={() => {
            setPerspFilter("Todos"); setTLFilter("Todos");
            setTypeFilter("Todos"); setSearch("");
          }}>✕ Limpiar</Btn>
        )}
        <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
          {filtered.length} de {kpis.length} KPIs
        </span>
      </div>

      {/* ── GRID TAB ── */}
      {tab === "grid" && (
        filtered.length === 0
          ? <EmptyState icon="📊" title="Sin KPIs"
              description="No hay indicadores para los filtros seleccionados"
              action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Crear KPI</Btn>}/>
          : (
            <div className="sp-grid-3">
              {filtered.map(kpi => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  perspective={perspectives.find(p => p.id === kpi.perspectiveId)}
                  onSelect={setSelectedKPI}
                  onEdit={setEditKPI}
                />
              ))}
            </div>
          )
      )}

      {/* ── TABLE TAB ── */}
      {tab === "table" && (
        <Card>
          <div style={{ overflowX:"auto" }}>
            <table className="sp-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Perspectiva</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Meta</th>
                  <th>Avance</th>
                  <th>Semáforo</th>
                  <th>Tendencia</th>
                  <th>Frec.</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(kpi => {
                  const pct = calc.progress(kpi.value, kpi.target, kpi.inverse);
                  const tl  = color.trafficLight(kpi.value, kpi.target, kpi.inverse);
                  const persp = perspectives.find(p => p.id === kpi.perspectiveId);
                  return (
                    <tr key={kpi.id} style={{ cursor:"pointer" }}
                      onClick={() => setSelectedKPI(kpi)}>
                      <td style={{ fontSize:12, fontWeight:700, color:T.navy,
                        maxWidth:200 }}>
                        {kpi.name}
                      </td>
                      <td>
                        {persp && (
                          <span style={{ fontSize:10, padding:"2px 8px",
                            borderRadius:20, background:persp.bg, color:persp.color,
                            fontWeight:700 }}>
                            {persp.icon}
                          </span>
                        )}
                      </td>
                      <td><span style={{ fontSize:10.5, color:T.tM }}>{kpi.type}</span></td>
                      <td>
                        <span style={{ fontSize:13, fontWeight:900, color:tl.color }}>
                          {kpi.value}{kpi.unit}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize:12, color:T.tM }}>{kpi.target}{kpi.unit}</span>
                      </td>
                      <td style={{ minWidth:120 }}>
                        <Bar value={pct} height={6}/>
                      </td>
                      <td>
                        <div style={{ width:11, height:11, borderRadius:"50%",
                          background:tl.color, margin:"0 auto",
                          boxShadow:`0 0 5px ${tl.color}60` }}/>
                      </td>
                      <td>
                        <span style={{ fontSize:14, fontWeight:800,
                          color:kpi.trend==="up"?T.green:kpi.trend==="down"?T.red:T.tM }}>
                          {kpi.trend==="up"?"↑":kpi.trend==="down"?"↓":"→"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize:10, color:T.tL }}>
                          {kpi.frequency==="monthly"?"Mensual":
                           kpi.frequency==="quarterly"?"Trim.":"Semanal"}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditKPI(kpi)}
                          style={{ background:"none", border:"none", cursor:"pointer",
                            color:T.tL, fontSize:13 }}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={perspAvgData}
                title="Avance Promedio por Perspectiva"
                height={260}
                xKey="name"
                bars={[{ key:"Avance", color:T.teal, label:"% Promedio" }]}
                showValues
              />
            </Card>
            <Card sx={{ padding:"16px 18px" }}>
              {/* Semáforos summary */}
              <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                marginBottom:14, fontFamily:"var(--font-display)" }}>
                Distribución Semáforo
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { l:"En Meta",      c:T.green,  tl:"green",  i:"✅" },
                  { l:"En Riesgo",    c:"#d97706",tl:"yellow", i:"⚠️" },
                  { l:"Fuera de Meta",c:T.red,    tl:"red",    i:"🚨" },
                ].map(s => {
                  const count = kpis.filter(k=>k.trafficLight===s.tl).length;
                  const pct   = kpis.length ? Math.round(count/kpis.length*100) : 0;
                  return (
                    <div key={s.tl}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:5 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                          {s.i} {s.l}
                        </span>
                        <span style={{ fontSize:12, fontWeight:900, color:s.c }}>
                          {count} KPIs ({pct}%)
                        </span>
                      </div>
                      <div style={{ height:10, background:"#e6ecf5", borderRadius:99,
                        overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`,
                          background:s.c, borderRadius:99,
                          transition:"width .5s ease" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* By perspective breakdown */}
              <div style={{ marginTop:18, paddingTop:14,
                borderTop:`1px solid ${T.bdr}` }}>
                <div style={{ fontSize:11, fontWeight:800, color:T.teal,
                  letterSpacing:".08em", marginBottom:10 }}>
                  DESGLOSE POR PERSPECTIVA
                </div>
                {perspectives.map(p => {
                  const pKpis = kpis.filter(k => k.perspectiveId === p.id);
                  const gn = pKpis.filter(k=>k.trafficLight==="green").length;
                  const yw = pKpis.filter(k=>k.trafficLight==="yellow").length;
                  const rd = pKpis.filter(k=>k.trafficLight==="red").length;
                  if (!pKpis.length) return null;
                  return (
                    <div key={p.id} style={{ marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:p.color }}>
                          {p.icon} {p.label}
                        </span>
                        <div style={{ display:"flex", gap:8 }}>
                          {[[gn,"✅"],[yw,"⚠️"],[rd,"🚨"]].map(([n,ic],i) =>
                            n > 0 ? <span key={i} style={{ fontSize:10.5, color:T.tM }}>{ic}{n}</span> : null
                          )}
                        </div>
                      </div>
                      <div style={{ height:6, display:"flex", borderRadius:99, overflow:"hidden" }}>
                        {gn>0&&<div style={{ flex:gn, background:T.green }}/>}
                        {yw>0&&<div style={{ flex:yw, background:"#d97706" }}/>}
                        {rd>0&&<div style={{ flex:rd, background:T.red }}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
          {/* Historical area chart */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpAreaChart
              data={MONTHS.map((m,i) => ({
                name:        m,
                Admisiones:  kpiHistory.kpi1?.[i]  || null,
                Satisfacción:kpiHistory.kpi5?.[i]  || null,
                Ocupación:   kpiHistory.kpi3?.[i]  || null,
              })).filter(d => d.Admisiones !== null)}
              title="Tendencia Histórica — KPIs Clave"
              subtitle="Valores mensuales registrados"
              height={240}
              xKey="name"
              areas={[
                { key:"Admisiones",   color:T.teal,   label:"Admisiones/mes"    },
                { key:"Satisfacción", color:T.blue,   label:"NPS Satisfacción"  },
                { key:"Ocupación",    color:T.violet, label:"Ocupación camas %" },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ── BULLET TAB ── */}
      {tab === "bullet" && (
        <div className="sp-grid-2">
          {perspectives.map(p => {
            const pKpis = kpis.filter(k => k.perspectiveId === p.id);
            if (!pKpis.length) return null;
            return (
              <Card key={p.id} sx={{ padding:"16px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7,
                  marginBottom:14, paddingBottom:10,
                  borderBottom:`2px solid ${p.border}` }}>
                  <span style={{ fontSize:18 }}>{p.icon}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:p.color,
                    fontFamily:"var(--font-display)" }}>
                    {p.label}
                  </span>
                </div>
                <BulletChart
                  items={pKpis.map(k => ({
                    name:   k.name.substring(0,24),
                    value:  k.value,
                    target: k.target,
                    unit:   k.unit,
                  }))}
                />
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedKPI && (
        <KPIDetailModal
          kpi={selectedKPI}
          perspective={selectedPersp}
          history={kpiHistory}
          onClose={() => setSelectedKPI(null)}
          onEdit={k => { setEditKPI(k); setSelectedKPI(null); }}
          onUpdate={handleUpdate}
        />
      )}

      {(editKPI || showAdd) && (
        <KPIFormModal
          kpi={editKPI}
          perspectives={perspectives}
          objectives={strategicObjectives}
          onSave={handleSave}
          onClose={() => { setEditKPI(null); setShowAdd(false); }}
        />
      )}
    </div>
  );
});

export default KPI;
```

---

✅ **KPI.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    └── KPI.jsx    ← nueva
