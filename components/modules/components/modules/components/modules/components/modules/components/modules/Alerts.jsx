// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Centro de Alertas
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, Input, Select, Textarea, AlertBox,
  EmptyState, Tabs, Avatar, T,
} from "../ui/index.jsx";
import { SpBarChart, SpPieChart, SpAreaChart } from "../charts/index.jsx";
import { color, calc, fmt, genId } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const SEVERITY_CFG = {
  critical: { c:T.red,    bg:"#fee2e2", border:"#fca5a5", icon:"🚨", label:"Crítica"    },
  warning:  { c:"#d97706",bg:"#fef3c7", border:"#fcd34d", icon:"⚠️", label:"Advertencia" },
  info:     { c:T.blue,   bg:"#dbeafe", border:"#93c5fd", icon:"ℹ️", label:"Información" },
  success:  { c:T.green,  bg:"#d1fae5", border:"#6ee7b7", icon:"✅", label:"Éxito"       },
};

const TYPE_OPTIONS = [
  { value:"kpi",         label:"📊 KPI Semáforo"       },
  { value:"okr",         label:"🎯 Progreso OKR"        },
  { value:"initiative",  label:"🚀 Iniciativa"          },
  { value:"budget",      label:"💰 Presupuesto"         },
  { value:"deadline",    label:"📅 Fecha límite"        },
  { value:"system",      label:"⚙️ Sistema"             },
  { value:"custom",      label:"✏️ Personalizada"       },
];

const SEVERITY_OPTIONS = [
  { value:"critical", label:"🚨 Crítica"       },
  { value:"warning",  label:"⚠️ Advertencia"   },
  { value:"info",     label:"ℹ️ Información"   },
  { value:"success",  label:"✅ Éxito"          },
];

// ── ALERT CARD ────────────────────────────────────────────────
const AlertCard = memo(({ alert, onMarkRead, onDelete, onSelect }) => {
  const sev = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.info;

  return (
    <div
      style={{
        padding:    "13px 16px",
        borderRadius:10,
        background: alert.read ? T.white : sev.bg,
        border:     `1.5px solid ${alert.read ? T.bdr : sev.border}`,
        borderLeft: `4px solid ${sev.c}`,
        transition: "all .18s",
        cursor:     "pointer",
        opacity:    alert.read ? 0.75 : 1,
      }}
      onClick={() => onSelect(alert)}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 14px ${sev.c}20`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", gap:10 }}>
        {/* Icon + content */}
        <div style={{ display:"flex", gap:10, flex:1, minWidth:0 }}>
          <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>
            {sev.icon}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", gap:7, alignItems:"center",
              flexWrap:"wrap", marginBottom:4 }}>
              <span style={{ fontSize:12.5, fontWeight:800, color:T.navy,
                fontFamily:"var(--font-display)" }}>
                {alert.title}
              </span>
              {!alert.read && (
                <span style={{ width:8, height:8, borderRadius:"50%",
                  background:sev.c, display:"inline-block", flexShrink:0 }}/>
              )}
            </div>
            <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.5,
              marginBottom:7 }}>
              {alert.message}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap",
              alignItems:"center" }}>
              <span style={{ fontSize:9.5, fontWeight:800, padding:"1px 8px",
                borderRadius:20, background:`${sev.c}18`, color:sev.c }}>
                {sev.label}
              </span>
              {alert.type && (
                <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 8px",
                  borderRadius:20, background:T.bg, color:T.tM,
                  border:`1px solid ${T.bdr}` }}>
                  {TYPE_OPTIONS.find(t => t.value === alert.type)?.label || alert.type}
                </span>
              )}
              <span style={{ fontSize:10, color:T.tL }}>
                🕐 {fmt.date(alert.createdAt)}
              </span>
              {alert.kpiName && (
                <span style={{ fontSize:10, color:T.blue, fontWeight:700 }}>
                  📊 {alert.kpiName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:5, flexShrink:0 }}
          onClick={e => e.stopPropagation()}>
          {!alert.read && (
            <button
              onClick={() => onMarkRead(alert.id)}
              title="Marcar como leída"
              style={{ background:"none", border:`1px solid ${T.bdr}`,
                borderRadius:6, cursor:"pointer", color:T.tM,
                fontSize:11, padding:"3px 8px", fontWeight:700 }}>
              ✓
            </button>
          )}
          <button
            onClick={() => onDelete(alert.id)}
            title="Eliminar"
            style={{ background:"none", border:"none",
              cursor:"pointer", color:T.tL, fontSize:14,
              padding:"3px 5px" }}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
});

// ── ALERT DETAIL MODAL ────────────────────────────────────────
const AlertDetailModal = memo(({ alert, onClose, onMarkRead }) => {
  const sev = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.info;

  return (
    <Modal
      title={`${sev.icon} Detalle de Alerta`}
      onClose={onClose}
      maxWidth={520}
      footer={
        <div style={{ display:"flex", gap:8 }}>
          {!alert.read && (
            <Btn variant="primary" onClick={() => { onMarkRead(alert.id); onClose(); }}>
              ✓ Marcar como leída
            </Btn>
          )}
          <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
        </div>
      }
    >
      {/* Severity banner */}
      <div style={{ padding:"12px 14px", background:sev.bg,
        borderRadius:9, border:`1px solid ${sev.border}`,
        marginBottom:14, display:"flex", gap:10,
        alignItems:"center" }}>
        <span style={{ fontSize:24 }}>{sev.icon}</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:sev.c }}>
            {alert.title}
          </div>
          <div style={{ fontSize:10.5, color:sev.c, opacity:.8, marginTop:2 }}>
            {sev.label} · {fmt.date(alert.createdAt)}
          </div>
        </div>
        {!alert.read && (
          <span style={{ marginLeft:"auto", fontSize:9.5, fontWeight:800,
            padding:"3px 10px", borderRadius:20,
            background:sev.c, color:"#fff" }}>
            NUEVA
          </span>
        )}
      </div>

      {/* Message */}
      <div style={{ fontSize:13, color:T.tM, lineHeight:1.65,
        marginBottom:14, padding:"12px 14px",
        background:T.bg, borderRadius:9 }}>
        {alert.message}
      </div>

      {/* Metadata */}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
        gap:8, marginBottom:14 }}>
        {[
          { label:"Tipo",      value:TYPE_OPTIONS.find(t=>t.value===alert.type)?.label || alert.type || "—" },
          { label:"Severidad", value:sev.label                                                               },
          { label:"Estado",    value:alert.read ? "✅ Leída" : "🔵 Sin leer"                                },
          { label:"Fecha",     value:fmt.date(alert.createdAt)                                               },
        ].map((m, i) => (
          <div key={i} style={{ padding:"8px 11px", background:T.bg,
            borderRadius:8, border:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
              letterSpacing:".06em", marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Related entity */}
      {(alert.kpiName || alert.objectiveName || alert.initiativeName) && (
        <div style={{ padding:"10px 14px", background:`${T.teal}08`,
          borderRadius:9, border:`1px solid ${T.teal}25` }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:5 }}>
            ENTIDAD RELACIONADA
          </div>
          {alert.kpiName && (
            <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
              📊 KPI: {alert.kpiName}
            </div>
          )}
          {alert.objectiveName && (
            <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
              🎯 Objetivo: {alert.objectiveName}
            </div>
          )}
          {alert.initiativeName && (
            <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
              🚀 Iniciativa: {alert.initiativeName}
            </div>
          )}
          {alert.currentValue != null && (
            <div style={{ fontSize:11, color:T.tM, marginTop:5 }}>
              Valor actual: <strong>{alert.currentValue}</strong>
              {alert.threshold != null && ` / Umbral: ${alert.threshold}`}
            </div>
          )}
        </div>
      )}

      {/* Action suggested */}
      {alert.action && (
        <div style={{ marginTop:12, padding:"10px 14px",
          background:`${T.gold}10`, borderRadius:9,
          border:`1px solid ${T.gold}30` }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:"#92400e",
            letterSpacing:".08em", marginBottom:5 }}>
            💡 ACCIÓN SUGERIDA
          </div>
          <div style={{ fontSize:12, color:T.navy, lineHeight:1.5 }}>
            {alert.action}
          </div>
        </div>
      )}
    </Modal>
  );
});

// ── ALERT FORM MODAL ──────────────────────────────────────────
const AlertFormModal = memo(({ onSave, onClose }) => {
  const [form, setForm] = useState({
    title:    "",
    message:  "",
    severity: "warning",
    type:     "custom",
  });
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = () => {
    const errs = {};
    if (!form.title.trim())   errs.title   = "El título es requerido";
    if (!form.message.trim()) errs.message = "El mensaje es requerido";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      ...form,
      id:        genId("al"),
      read:      false,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      title="➕ Nueva Alerta"
      onClose={onClose}
      maxWidth={500}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>Crear Alerta</Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <Input label="Título" value={form.title}
          onChange={e => set("title", e.target.value)}
          error={errors.title}
          placeholder="Ej: KPI crítico detectado"/>
        <Textarea label="Mensaje" value={form.message}
          onChange={e => set("message", e.target.value)}
          error={errors.message}
          placeholder="Describe el detalle de la alerta..."
          sx={{ marginBottom:2 }}/>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Severidad" value={form.severity}
            options={SEVERITY_OPTIONS}
            onChange={e => set("severity", e.target.value)}/>
          <Select label="Tipo" value={form.type}
            options={TYPE_OPTIONS}
            onChange={e => set("type", e.target.value)}/>
        </div>
      </div>
    </Modal>
  );
});

// ── ALERT RULE CARD ───────────────────────────────────────────
const AlertRuleCard = memo(({ rule, index }) => (
  <div style={{ padding:"12px 14px", background:T.white,
    borderRadius:9, border:`1px solid ${T.bdr}`,
    marginBottom:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between",
      alignItems:"flex-start", marginBottom:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:16 }}>{rule.icon}</span>
        <div>
          <div style={{ fontSize:12.5, fontWeight:800, color:T.navy }}>
            {rule.name}
          </div>
          <div style={{ fontSize:10.5, color:T.tL, marginTop:1 }}>
            {rule.description}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px",
          borderRadius:20,
          background:rule.active ? `${T.green}15` : T.bg,
          color:rule.active ? T.green : T.tL,
          border:`1px solid ${rule.active ? T.green+"30" : T.bdr}` }}>
          {rule.active ? "✅ Activa" : "⏸️ Pausada"}
        </span>
      </div>
    </div>
    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
      <span style={{ fontSize:10, color:T.tL }}>
        Condición: <strong style={{ color:T.navy }}>{rule.condition}</strong>
      </span>
      <span style={{ fontSize:10, color:T.tL }}>
        Umbral: <strong style={{ color:T.navy }}>{rule.threshold}</strong>
      </span>
      <span style={{ fontSize:10, color:T.tL }}>
        Frecuencia: <strong style={{ color:T.navy }}>{rule.frequency}</strong>
      </span>
    </div>
  </div>
));

// ── TIMELINE VIEW ─────────────────────────────────────────────
const AlertTimeline = memo(({ alerts }) => {
  // Group by date
  const groups = useMemo(() => {
    const map = {};
    alerts.forEach(a => {
      const date = a.createdAt
        ? new Date(a.createdAt).toLocaleDateString("es-MX",
            { day:"numeric", month:"long" })
        : "Sin fecha";
      if (!map[date]) map[date] = [];
      map[date].push(a);
    });
    return Object.entries(map).slice(0, 10);
  }, [alerts]);

  return (
    <div style={{ position:"relative" }}>
      {/* Timeline line */}
      <div style={{ position:"absolute", left:18, top:0, bottom:0,
        width:2, background:T.bdr, zIndex:0 }}/>

      {groups.map(([date, dayAlerts], gi) => (
        <div key={gi} style={{ marginBottom:20 }}>
          {/* Date label */}
          <div style={{ display:"flex", alignItems:"center", gap:10,
            marginBottom:10, position:"relative", zIndex:1 }}>
            <div style={{ width:36, height:36, borderRadius:"50%",
              background:T.navy, display:"flex", alignItems:"center",
              justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:11, color:"#fff", fontWeight:800 }}>
                {new Date(dayAlerts[0].createdAt).getDate()}
              </span>
            </div>
            <span style={{ fontSize:12, fontWeight:800, color:T.navy }}>
              {date}
            </span>
            <span style={{ fontSize:10, color:T.tL }}>
              {dayAlerts.length} alerta{dayAlerts.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Day alerts */}
          <div style={{ marginLeft:54, display:"flex",
            flexDirection:"column", gap:7 }}>
            {dayAlerts.map(al => {
              const sev = SEVERITY_CFG[al.severity] || SEVERITY_CFG.info;
              return (
                <div key={al.id} style={{ padding:"9px 12px",
                  background:al.read ? T.white : sev.bg,
                  borderRadius:9, border:`1px solid ${al.read ? T.bdr : sev.border}`,
                  borderLeft:`3px solid ${sev.c}`,
                  opacity:al.read ? 0.7 : 1 }}>
                  <div style={{ display:"flex", alignItems:"center",
                    gap:7, marginBottom:3 }}>
                    <span style={{ fontSize:13 }}>{sev.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color:T.navy }}>
                      {al.title}
                    </span>
                    {!al.read && (
                      <span style={{ width:7, height:7, borderRadius:"50%",
                        background:sev.c, flexShrink:0 }}/>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:T.tM, lineHeight:1.4 }}>
                    {al.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <EmptyState icon="🔔" title="Sin alertas en la línea de tiempo"
          description="No hay alertas para mostrar"/>
      )}
    </div>
  );
});

// ── ALERT RULES ───────────────────────────────────────────────
const BUILT_IN_RULES = [
  {
    id:"r1", name:"KPI en Semáforo Rojo", icon:"🚨",
    description:"Dispara cuando un KPI cae a zona crítica",
    condition:"valor < 80% de meta", threshold:"< 80%",
    frequency:"Tiempo real", active:true,
  },
  {
    id:"r2", name:"OKR sin avance 30 días", icon:"⚠️",
    description:"Alerta si un OKR no registra progreso en 30 días",
    condition:"sin actualización", threshold:"30 días",
    frequency:"Diaria", active:true,
  },
  {
    id:"r3", name:"Presupuesto >90% ejecutado", icon:"💰",
    description:"Aviso cuando el gasto supera el 90% del presupuesto",
    condition:"ejecutado > 90%", threshold:"> 90%",
    frequency:"Semanal", active:true,
  },
  {
    id:"r4", name:"Iniciativa próxima a vencer", icon:"📅",
    description:"Notificación 15 días antes del fin planificado",
    condition:"días restantes ≤ 15", threshold:"15 días",
    frequency:"Diaria", active:true,
  },
  {
    id:"r5", name:"Anomalía en KPI histórico", icon:"🔍",
    description:"Detecta valores atípicos con análisis estadístico",
    condition:"valor > 2σ de la media", threshold:"2 desviaciones",
    frequency:"Mensual", active:false,
  },
  {
    id:"r6", name:"Meta IEG < 0.8", icon:"📊",
    description:"Alerta cuando el Índice de Ejecución Global baja",
    condition:"IEG < 0.8", threshold:"< 0.8",
    frequency:"Semanal", active:true,
  },
];

// ── SUMMARY STATS ─────────────────────────────────────────────
const AlertsSummary = memo(({ alerts }) => {
  const total    = alerts.length;
  const unread   = alerts.filter(a => !a.read).length;
  const critical = alerts.filter(a => a.severity === "critical").length;
  const today    = alerts.filter(a => {
    if (!a.createdAt) return false;
    const d = new Date(a.createdAt);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  }).length;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total Alertas" value={total}
        sub="En el sistema" icon="🔔" color={T.navy}/>
      <StatCard label="Sin Leer" value={unread}
        sub="Pendientes" icon="🔵"
        color={unread > 0 ? T.blue : T.green}/>
      <StatCard label="Críticas" value={critical}
        sub="Alta prioridad" icon="🚨"
        color={critical > 0 ? T.red : T.green}/>
      <StatCard label="Hoy" value={today}
        sub="Generadas hoy" icon="📅" color={T.teal}/>
    </div>
  );
});

// ── MAIN ALERTS ───────────────────────────────────────────────
const Alerts = memo(({ onNavigate }) => {
  const {
    alerts, markAlertRead, markAllRead, addAlert,
  } = useApp();

  const [tab,       setTab]       = useState("list");
  const [sevFlt,    setSevFlt]    = useState("Todos");
  const [typeFlt,   setTypeFlt]   = useState("Todos");
  const [readFlt,   setReadFlt]   = useState("Todos");
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [toDelete,  setToDelete]  = useState(null);

  // Filtered alerts
  const filtered = useMemo(() => alerts.filter(a => {
    const sevOk  = sevFlt  === "Todos" || a.severity === sevFlt;
    const typeOk = typeFlt === "Todos" || a.type     === typeFlt;
    const readOk = readFlt === "Todos"
      ? true : readFlt === "unread" ? !a.read : a.read;
    const searchOk = !search
      || a.title?.toLowerCase().includes(search.toLowerCase())
      || a.message?.toLowerCase().includes(search.toLowerCase());
    return sevOk && typeOk && readOk && searchOk;
  }), [alerts, sevFlt, typeFlt, readFlt, search]);

  // Chart data
  const sevChartData = useMemo(() =>
    Object.entries(SEVERITY_CFG).map(([k, v]) => ({
      name:  v.label,
      value: alerts.filter(a => a.severity === k).length,
      color: v.c,
    })).filter(d => d.value > 0),
  [alerts]);

  const typeChartData = useMemo(() =>
    TYPE_OPTIONS.map(t => ({
      name:  t.label.replace(/^.{2}/,""),
      value: alerts.filter(a => a.type === t.value).length,
    })).filter(d => d.value > 0),
  [alerts]);

  const handleDelete = useCallback((id) => {
    setToDelete(id);
  }, []);

  const handleSave = useCallback((data) => {
    addAlert(data);
  }, [addAlert]);

  const TABS = [
    { id:"list",     label:"📋 Lista"       },
    { id:"timeline", label:"⏱️ Timeline"    },
    { id:"rules",    label:"⚙️ Reglas"      },
    { id:"charts",   label:"📊 Análisis"    },
  ];

  const unread = alerts.filter(a => !a.read).length;

  return (
    <div className="sp-page">
      <SectionHeader
        title="🔔 Centro de Alertas"
        subtitle={`${alerts.length} alertas · ${unread} sin leer`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            {unread > 0 && (
              <Btn variant="ghost" onClick={markAllRead}>
                ✓ Marcar todas leídas
              </Btn>
            )}
            <Btn variant="primary" onClick={() => setShowAdd(true)}>
              + Nueva Alerta
            </Btn>
          </div>
        }
      />

      <AlertsSummary alerts={alerts}/>

      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <>
          {/* Filters */}
          <div style={{ display:"flex", gap:8, marginBottom:16,
            flexWrap:"wrap", alignItems:"center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar alerta..."
              style={{ padding:"6px 12px", borderRadius:8,
                border:`1px solid ${T.bdr}`, fontSize:12,
                color:T.txt, background:T.white, minWidth:180 }}/>

            {/* Read filter */}
            <div style={{ display:"flex", gap:4 }}>
              {[
                { v:"Todos",  l:"Todas"    },
                { v:"unread", l:"Sin leer" },
                { v:"read",   l:"Leídas"   },
              ].map(f => (
                <button key={f.v} onClick={() => setReadFlt(f.v)}
                  style={{ padding:"5px 12px", borderRadius:20, fontSize:11,
                    fontWeight:700, cursor:"pointer", transition:"all .15s",
                    border:`1.5px solid ${readFlt===f.v ? T.teal : T.bdr}`,
                    background:readFlt===f.v ? `${T.teal}15` : "transparent",
                    color:readFlt===f.v ? T.teal : T.tM }}>
                  {f.l}
                </button>
              ))}
            </div>

            <select value={sevFlt} onChange={e => setSevFlt(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:8,
                border:`1px solid ${T.bdr}`, fontSize:12,
                color:T.txt, background:T.white }}>
              <option value="Todos">Todas las severidades</option>
              {SEVERITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select value={typeFlt} onChange={e => setTypeFlt(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:8,
                border:`1px solid ${T.bdr}`, fontSize:12,
                color:T.txt, background:T.white }}>
              <option value="Todos">Todos los tipos</option>
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {(sevFlt!=="Todos"||typeFlt!=="Todos"||readFlt!=="Todos"||search) && (
              <Btn variant="ghost" size="sm" onClick={() => {
                setSevFlt("Todos"); setTypeFlt("Todos");
                setReadFlt("Todos"); setSearch("");
              }}>✕ Limpiar</Btn>
            )}
            <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
              {filtered.length} de {alerts.length}
            </span>
          </div>

          {/* Alert cards */}
          {filtered.length === 0
            ? <EmptyState icon="🔔" title="Sin alertas"
                description="No hay alertas para los filtros seleccionados"
                action={<Btn variant="primary" onClick={() => setShowAdd(true)}>
                  + Crear Alerta</Btn>}/>
            : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* Critical first */}
                {filtered.filter(a => a.severity === "critical" && !a.read).length > 0 && (
                  <div style={{ padding:"10px 14px", background:"#fee2e2",
                    borderRadius:9, border:"1px solid #fca5a5",
                    marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:T.red }}>
                      🚨 {filtered.filter(a=>a.severity==="critical"&&!a.read).length} alertas críticas sin resolver
                    </span>
                  </div>
                )}

                {filtered.map(al => (
                  <AlertCard
                    key={al.id}
                    alert={al}
                    onMarkRead={markAlertRead}
                    onDelete={handleDelete}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            )
          }
        </>
      )}

      {/* ── TIMELINE TAB ── */}
      {tab === "timeline" && (
        <AlertTimeline alerts={filtered.length > 0 ? filtered : alerts}/>
      )}

      {/* ── RULES TAB ── */}
      {tab === "rules" && (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <AlertBox type="info" sx={{ marginBottom:14 }}>
            Las reglas de alerta se evalúan automáticamente según la frecuencia configurada.
            Las reglas activas generan alertas en el sistema cuando se cumple la condición.
          </AlertBox>

          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              fontFamily:"var(--font-display)" }}>
              Reglas Configuradas ({BUILT_IN_RULES.length})
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ fontSize:11, color:T.tL }}>
                {BUILT_IN_RULES.filter(r=>r.active).length} activas
              </span>
            </div>
          </div>

          {BUILT_IN_RULES.map((rule, i) => (
            <AlertRuleCard key={rule.id} rule={rule} index={i}/>
          ))}

          <div style={{ marginTop:14, padding:"12px 14px",
            background:`${T.teal}08`, borderRadius:9,
            border:`1px solid ${T.teal}25` }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.teal,
              marginBottom:5 }}>
              💡 Reglas personalizadas
            </div>
            <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
              Las reglas personalizadas permiten definir umbrales específicos por KPI,
              OKR o iniciativa. Contacta al administrador del sistema para configurar
              reglas avanzadas con múltiples condiciones.
            </div>
          </div>
        </div>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpPieChart
                data={sevChartData}
                title="Alertas por Severidad"
                height={250}
                innerRadius={50}
                outerRadius={90}
                showLabels={false}
              />
            </Card>
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={typeChartData}
                title="Alertas por Tipo"
                height={250}
                xKey="name"
                bars={[{ key:"value", color:T.teal, label:"Alertas" }]}
                showValues
              />
            </Card>
          </div>

          {/* Read vs unread */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:14, fontFamily:"var(--font-display)" }}>
              📊 Estado de Lectura
            </div>
            <div style={{ display:"flex", gap:14, alignItems:"center",
              flexWrap:"wrap" }}>
              {[
                { label:"Leídas",    count:alerts.filter(a=>a.read).length,
                  c:T.green, bg:"#d1fae5" },
                { label:"Sin leer",  count:alerts.filter(a=>!a.read).length,
                  c:T.blue,  bg:"#dbeafe" },
              ].map((s, i) => (
                <div key={i} style={{ flex:1, minWidth:120,
                  padding:"14px 16px", background:s.bg,
                  borderRadius:10, textAlign:"center" }}>
                  <div style={{ fontSize:32, fontWeight:900, color:s.c,
                    fontFamily:"var(--font-display)", lineHeight:1 }}>
                    {s.count}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color:s.c, marginTop:4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize:10, color:s.c, opacity:.7, marginTop:2 }}>
                    {alerts.length
                      ? Math.round(s.count/alerts.length*100) : 0}% del total
                  </div>
                </div>
              ))}

              {/* Severity breakdown */}
              <div style={{ flex:3, minWidth:220 }}>
                {Object.entries(SEVERITY_CFG).map(([k, v]) => {
                  const count = alerts.filter(a=>a.severity===k).length;
                  const pct   = alerts.length
                    ? Math.round(count/alerts.length*100) : 0;
                  return (
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:"flex",
                        justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:11.5, fontWeight:700,
                          color:T.navy }}>
                          {v.icon} {v.label}
                        </span>
                        <span style={{ fontSize:11, fontWeight:800,
                          color:v.c }}>{count}</span>
                      </div>
                      <div style={{ height:7, background:"#e6ecf5",
                        borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`,
                          background:v.c, borderRadius:99,
                          transition:"width .5s ease" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Resolution rate */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={Object.entries(SEVERITY_CFG).map(([k, v]) => {
                const total = alerts.filter(a=>a.severity===k).length;
                const read  = alerts.filter(a=>a.severity===k&&a.read).length;
                return {
                  name:     v.label,
                  Leídas:   read,
                  Pendientes:total - read,
                };
              }).filter(d => d.Leídas + d.Pendientes > 0)}
              title="Gestión por Severidad"
              subtitle="Alertas leídas vs pendientes"
              height={220}
              xKey="name"
              bars={[
                { key:"Leídas",     color:T.green, label:"Leídas"     },
                { key:"Pendientes", color:T.red,   label:"Pendientes" },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Modals */}
      {selected && (
        <AlertDetailModal
          alert={selected}
          onClose={() => setSelected(null)}
          onMarkRead={(id) => { markAlertRead(id); setSelected(null); }}
        />
      )}

      {showAdd && (
        <AlertFormModal
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
        />
      )}

      {toDelete && (
        <Modal title="🗑️ Eliminar Alerta"
          onClose={() => setToDelete(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setToDelete(null)}>
                Cancelar
              </Btn>
              <Btn variant="danger" onClick={() => {
                // In a real app, call deleteAlert(toDelete)
                setToDelete(null);
              }}>
                Eliminar
              </Btn>
            </>
          }>
          <AlertBox type="warn">
            ¿Eliminar esta alerta permanentemente?
            Esta acción no se puede deshacer.
          </AlertBox>
        </Modal>
      )}
    </div>
  );
});

export default Alerts;
```

---

✅ **Alerts.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx    ├── BSC.jsx        ├── OKR.jsx
    ├── KPI.jsx          ├── Bowling.jsx    ├── StrategyMap.jsx
    ├── Hoshin.jsx       ├── Radar.jsx      ├── Benchmark.jsx
    ├── Prediction.jsx   ├── Initiatives.jsx
    └── Alerts.jsx    ← nueva
