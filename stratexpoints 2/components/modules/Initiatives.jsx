// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Iniciativas Estratégicas
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, Avatar, Input, Select, Textarea,
  AlertBox, EmptyState, Tabs, T,
} from "../ui/index.jsx";
import { SpBarChart, SpPieChart, GaugeChart } from "../charts/index.jsx";
import { color, calc, fmt, genId } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value:"not_started", label:"⭕ Sin iniciar"  },
  { value:"in_progress", label:"🔄 En progreso"  },
  { value:"on_hold",     label:"⏸️ En pausa"     },
  { value:"completed",   label:"✅ Completada"   },
  { value:"cancelled",   label:"❌ Cancelada"    },
];

const PRIORITY_OPTIONS = [
  { value:"critical", label:"🚨 Crítica"  },
  { value:"high",     label:"🔴 Alta"     },
  { value:"medium",   label:"🟡 Media"    },
  { value:"low",      label:"🟢 Baja"     },
];

const STATUS_CFG = {
  not_started: { c:T.tL,    bg:"#f3f4f6", label:"Sin iniciar", icon:"⭕" },
  in_progress: { c:T.teal,  bg:`${T.teal}12`, label:"En progreso", icon:"🔄" },
  on_hold:     { c:"#d97706",bg:"#fef3c7", label:"En pausa",   icon:"⏸️" },
  completed:   { c:T.green, bg:"#d1fae5", label:"Completada",  icon:"✅" },
  cancelled:   { c:T.red,   bg:"#fee2e2", label:"Cancelada",   icon:"❌" },
};

const PRIORITY_CFG = {
  critical: { c:T.red,    bg:"#fee2e2", label:"Crítica"  },
  high:     { c:"#dc2626",bg:"#fee2e2", label:"Alta"     },
  medium:   { c:"#d97706",bg:"#fef3c7", label:"Media"    },
  low:      { c:T.green,  bg:"#d1fae5", label:"Baja"     },
};

// ── INITIATIVE CARD ───────────────────────────────────────────
const InitiativeCard = memo(({ initiative, objectives, onSelect, onEdit, onDelete }) => {
  const statusCfg   = STATUS_CFG[initiative.status]   || STATUS_CFG.not_started;
  const priorityCfg = PRIORITY_CFG[initiative.priority] || PRIORITY_CFG.medium;
  const budgetPct   = initiative.budget
    ? Math.round(initiative.spent / initiative.budget * 100) : 0;
  const daysLeft    = calc.daysRemaining(initiative.endDate);
  const isOverdue   = daysLeft < 0 && initiative.status !== "completed";
  const objective   = objectives.find(o => o.id === initiative.objectiveId);

  return (
    <Card hover sx={{ padding:"14px 16px" }} onClick={() => onSelect(initiative)}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:9 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ fontSize:9.5, fontWeight:800, padding:"2px 9px",
              borderRadius:20, background:statusCfg.bg, color:statusCfg.c }}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 8px",
              borderRadius:20, background:priorityCfg.bg, color:priorityCfg.c }}>
              {priorityCfg.label}
            </span>
            {isOverdue && (
              <span style={{ fontSize:9.5, fontWeight:800, padding:"2px 8px",
                borderRadius:20, background:"#fee2e2", color:T.red }}>
                ⚠️ Vencida
              </span>
            )}
          </div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            lineHeight:1.35, fontFamily:"var(--font-display)" }}>
            {initiative.title}
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexShrink:0, marginLeft:8 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(initiative)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"3px 5px" }}>✏️</button>
          <button onClick={() => onDelete(initiative.id)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"3px 5px" }}>🗑️</button>
        </div>
      </div>

      {/* Description */}
      {initiative.description && (
        <div style={{ fontSize:11, color:T.tL, marginBottom:9,
          lineHeight:1.45, overflow:"hidden", textOverflow:"ellipsis",
          display:"-webkit-box", WebkitLineClamp:2,
          WebkitBoxOrient:"vertical" }}>
          {initiative.description}
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom:9 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          marginBottom:4 }}>
          <span style={{ fontSize:10, fontWeight:700, color:T.tM }}>
            Avance
          </span>
          <span style={{ fontSize:11, fontWeight:900,
            color:color.progressBar(initiative.progress) }}>
            {initiative.progress}%
          </span>
        </div>
        <Bar value={initiative.progress} height={6}/>
      </div>

      {/* Budget */}
      {initiative.budget > 0 && (
        <div style={{ marginBottom:9 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            marginBottom:3 }}>
            <span style={{ fontSize:10, color:T.tL }}>
              Presupuesto: {fmt.currency(initiative.budget)}
            </span>
            <span style={{ fontSize:10, fontWeight:700,
              color:budgetPct > 100 ? T.red : budgetPct > 80 ? "#d97706" : T.green }}>
              {budgetPct}% ejecutado
            </span>
          </div>
          <div style={{ height:4, background:"#e6ecf5", borderRadius:99,
            overflow:"hidden" }}>
            <div style={{
              height:"100%",
              width:`${Math.min(100, budgetPct)}%`,
              background: budgetPct > 100 ? T.red
                        : budgetPct > 80  ? "#d97706"
                        : T.green,
              borderRadius:99,
            }}/>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", flexWrap:"wrap", gap:6 }}>
        <div style={{ display:"flex", gap:10 }}>
          <span style={{ fontSize:10, color:T.tL }}>
            📅 {fmt.date(initiative.endDate)}
          </span>
          {daysLeft >= 0 && initiative.status !== "completed" && (
            <span style={{ fontSize:10, fontWeight:700,
              color:daysLeft < 15 ? T.red : daysLeft < 30 ? "#d97706" : T.tL }}>
              {daysLeft}d restantes
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {initiative.owner && (
            <Avatar name={initiative.owner} size={20}/>
          )}
          {objective && (
            <span style={{ fontSize:9.5, fontWeight:700, color:T.teal,
              padding:"1px 7px", borderRadius:20,
              background:`${T.teal}12` }}>
              {objective.code}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});

// ── INITIATIVE DETAIL MODAL ───────────────────────────────────
const InitiativeDetailModal = memo(({
  initiative, objectives, okrs, onClose, onEdit,
}) => {
  const statusCfg   = STATUS_CFG[initiative.status]     || STATUS_CFG.not_started;
  const priorityCfg = PRIORITY_CFG[initiative.priority] || PRIORITY_CFG.medium;
  const budgetPct   = initiative.budget
    ? Math.round(initiative.spent / initiative.budget * 100) : 0;
  const daysLeft    = calc.daysRemaining(initiative.endDate);
  const periodPct   = calc.periodProgress(initiative.startDate, initiative.endDate);
  const objective   = objectives.find(o => o.id === initiative.objectiveId);
  const relOKRs     = okrs.filter(o => o.objectiveId === initiative.objectiveId);

  return (
    <Modal
      title={`🚀 ${initiative.title}`}
      onClose={onClose}
      maxWidth={680}
      footer={
        <Btn variant="primary"
          onClick={() => { onEdit(initiative); onClose(); }}>
          ✏️ Editar Iniciativa
        </Btn>
      }
    >
      {/* Status + priority badges */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
        <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11,
          fontWeight:800, background:statusCfg.bg, color:statusCfg.c }}>
          {statusCfg.icon} {statusCfg.label}
        </span>
        <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11,
          fontWeight:700, background:priorityCfg.bg, color:priorityCfg.c }}>
          Prioridad {priorityCfg.label}
        </span>
        {daysLeft < 0 && initiative.status !== "completed" && (
          <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11,
            fontWeight:700, background:"#fee2e2", color:T.red }}>
            ⚠️ Vencida hace {Math.abs(daysLeft)} días
          </span>
        )}
      </div>

      {/* Description */}
      {initiative.description && (
        <div style={{ fontSize:12.5, color:T.tM, lineHeight:1.6,
          marginBottom:14, padding:"10px 14px", background:T.bg,
          borderRadius:9 }}>
          {initiative.description}
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:10, marginBottom:16 }}>
        {[
          { label:"Progreso",      value:`${initiative.progress}%`,
            c:color.progressBar(initiative.progress) },
          { label:"Período",       value:`${periodPct}% transcurrido`,
            c:T.blue },
          { label:"Días restantes",value:daysLeft >= 0 ? `${daysLeft}d` : "Vencida",
            c:daysLeft < 0 ? T.red : daysLeft < 15 ? T.red : T.green },
          { label:"Presupuesto",   value:fmt.currency(initiative.budget),
            c:T.navy },
          { label:"Ejecutado",     value:fmt.currency(initiative.spent),
            c:budgetPct > 100 ? T.red : T.teal },
          { label:"% Presupuesto", value:`${budgetPct}%`,
            c:budgetPct > 100 ? T.red : budgetPct > 80 ? "#d97706" : T.green },
        ].map((m, i) => (
          <div key={i} style={{ padding:"9px 12px", background:T.bg,
            borderRadius:9, border:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
              letterSpacing:".06em", marginBottom:3 }}>{m.label}</div>
            <div style={{ fontSize:16, fontWeight:900, color:m.c,
              fontFamily:"var(--font-display)", lineHeight:1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          marginBottom:5 }}>
          <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>
            Avance de Implementación
          </span>
          <span style={{ fontSize:13, fontWeight:900,
            color:color.progressBar(initiative.progress) }}>
            {initiative.progress}%
          </span>
        </div>
        <Bar value={initiative.progress} height={10}/>
      </div>

      {/* Dates */}
      <div style={{ display:"flex", gap:14, marginBottom:14,
        padding:"10px 14px", background:T.bg, borderRadius:9,
        flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
            marginBottom:2 }}>INICIO</div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.navy }}>
            📅 {fmt.date(initiative.startDate)}
          </div>
        </div>
        <div style={{ width:1, background:T.bdr }}/>
        <div>
          <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
            marginBottom:2 }}>FIN PLANIFICADO</div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.navy }}>
            🏁 {fmt.date(initiative.endDate)}
          </div>
        </div>
        <div style={{ width:1, background:T.bdr }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
            marginBottom:5 }}>PERÍODO TRANSCURRIDO</div>
          <Bar value={periodPct} height={5} barColor={T.blue}/>
        </div>
      </div>

      {/* Objective link */}
      {objective && (
        <div style={{ marginBottom:14, padding:"10px 14px",
          background:`${T.teal}08`, borderRadius:9,
          border:`1px solid ${T.teal}25` }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:5 }}>
            OBJETIVO ESTRATÉGICO
          </div>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.navy }}>
            {objective.code}: {objective.title}
          </div>
          <div style={{ marginTop:6 }}>
            <Bar value={objective.progress} height={5} barColor={T.teal}/>
          </div>
        </div>
      )}

      {/* Team */}
      {initiative.team?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            EQUIPO
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {initiative.team.map((member, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center",
                gap:6, padding:"5px 10px", background:T.bg,
                borderRadius:20, border:`1px solid ${T.bdr}` }}>
                <Avatar name={member} size={22}/>
                <span style={{ fontSize:11.5, fontWeight:600,
                  color:T.navy }}>{member}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs impacted */}
      {initiative.kpiImpact?.length > 0 && (
        <div>
          <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            KPIs IMPACTADOS
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {initiative.kpiImpact.map((kpi, i) => (
              <span key={i} style={{ fontSize:10.5, fontWeight:700,
                padding:"3px 10px", borderRadius:20,
                background:`${T.blue}15`, color:T.blue,
                border:`1px solid ${T.blue}30` }}>
                📊 {kpi}
              </span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
});

// ── INITIATIVE FORM ───────────────────────────────────────────
const InitiativeFormModal = memo(({
  initiative, objectives, users, onSave, onClose,
}) => {
  const isEdit = !!initiative;
  const [form, setForm] = useState({
    title:       initiative?.title       || "",
    description: initiative?.description || "",
    status:      initiative?.status      || "not_started",
    priority:    initiative?.priority    || "medium",
    objectiveId: initiative?.objectiveId || "",
    owner:       initiative?.owner       || "",
    startDate:   initiative?.startDate   || new Date().toISOString().split("T")[0],
    endDate:     initiative?.endDate     || "",
    budget:      initiative?.budget      ?? 0,
    spent:       initiative?.spent       ?? 0,
    progress:    initiative?.progress    ?? 0,
    team:        initiative?.team?.join(", ") || "",
    kpiImpact:   initiative?.kpiImpact?.join(", ") || "",
  });
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "El título es requerido";
    if (!form.endDate)      errs.endDate = "La fecha de fin es requerida";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      ...form,
      id:        initiative?.id || genId("ini"),
      budget:    parseFloat(form.budget)   || 0,
      spent:     parseFloat(form.spent)    || 0,
      progress:  parseInt(form.progress)   || 0,
      team:      form.team.split(",").map(s=>s.trim()).filter(Boolean),
      kpiImpact: form.kpiImpact.split(",").map(s=>s.trim()).filter(Boolean),
    });
    onClose();
  };

  const objOptions = [
    { value:"", label:"— Sin objetivo padre —" },
    ...objectives.map(o => ({ value:o.id, label:`${o.code}: ${o.title.substring(0,40)}` })),
  ];

  return (
    <Modal
      title={isEdit ? "✏️ Editar Iniciativa" : "➕ Nueva Iniciativa"}
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {isEdit ? "Guardar Cambios" : "Crear Iniciativa"}
          </Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <Input label="Título" value={form.title}
          onChange={e => set("title", e.target.value)}
          error={errors.title}
          placeholder="Ej: Implementar sistema de gestión de camas"/>

        <Textarea label="Descripción" value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe el alcance y objetivos de la iniciativa"
          sx={{ marginBottom:2 }}/>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Estado" value={form.status}
            options={STATUS_OPTIONS}
            onChange={e => set("status", e.target.value)}/>
          <Select label="Prioridad" value={form.priority}
            options={PRIORITY_OPTIONS}
            onChange={e => set("priority", e.target.value)}/>
        </div>

        <Select label="Objetivo Estratégico" value={form.objectiveId}
          options={objOptions}
          onChange={e => set("objectiveId", e.target.value)}/>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Input label="Responsable" value={form.owner}
            onChange={e => set("owner", e.target.value)}
            placeholder="Nombre del responsable"/>
          <Input label="Progreso (%)" type="number" value={form.progress}
            onChange={e => set("progress", e.target.value)}
            min="0" max="100"/>
        </div>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Input label="Fecha Inicio" type="date" value={form.startDate}
            onChange={e => set("startDate", e.target.value)}/>
          <Input label="Fecha Fin" type="date" value={form.endDate}
            onChange={e => set("endDate", e.target.value)}
            error={errors.endDate}/>
        </div>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Input label="Presupuesto (MXN)" type="number" value={form.budget}
            onChange={e => set("budget", e.target.value)}
            placeholder="0"/>
          <Input label="Ejecutado (MXN)" type="number" value={form.spent}
            onChange={e => set("spent", e.target.value)}
            placeholder="0"/>
        </div>

        <Input label="Equipo (separado por comas)"
          value={form.team}
          onChange={e => set("team", e.target.value)}
          placeholder="Dr. López, Lic. García, Ing. Martínez"/>

        <Input label="KPIs Impactados (separado por comas)"
          value={form.kpiImpact}
          onChange={e => set("kpiImpact", e.target.value)}
          placeholder="Satisfacción, Ocupación, Reingresos"/>
      </div>
    </Modal>
  );
});

// ── GANTT CHART ───────────────────────────────────────────────
const GanttChart = memo(({ initiatives }) => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end   = new Date(now.getFullYear(), 11, 31);
  const total = end - start;

  const toPercent = (date) => {
    const d = new Date(date);
    return Math.max(0, Math.min(100,
      ((d - start) / total) * 100
    ));
  };

  const widthPercent = (s, e) => {
    const sp = toPercent(s);
    const ep = toPercent(e);
    return Math.max(1, ep - sp);
  };

  // Month markers
  const months = Array.from({ length:12 }, (_, i) => {
    const d = new Date(now.getFullYear(), i, 1);
    return { label:["E","F","M","A","M","J","J","A","S","O","N","D"][i],
      pct:toPercent(d) };
  });

  const nowPct = toPercent(now);

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        📅 Gantt — Cronograma {now.getFullYear()}
      </div>

      {/* Month header */}
      <div style={{ position:"relative", height:24, marginBottom:4,
        marginLeft:180 }}>
        {months.map((m, i) => (
          <div key={i} style={{
            position:  "absolute",
            left:      `${m.pct}%`,
            fontSize:  9.5,
            fontWeight:700,
            color:     T.tL,
            transform: "translateX(-50%)",
          }}>
            {m.label}
          </div>
        ))}
        {/* Today line */}
        <div style={{
          position:  "absolute",
          left:      `${nowPct}%`,
          top:       0,
          bottom:    -4,
          width:     2,
          background:T.red,
          opacity:   0.7,
        }}/>
      </div>

      {/* Gantt rows */}
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {initiatives.map((ini, i) => {
          const statusCfg   = STATUS_CFG[ini.status] || STATUS_CFG.not_started;
          const sp          = toPercent(ini.startDate);
          const w           = widthPercent(ini.startDate, ini.endDate);
          const isOverdue   = calc.daysRemaining(ini.endDate) < 0
            && ini.status !== "completed";

          return (
            <div key={ini.id} style={{ display:"flex", alignItems:"center",
              gap:0, height:30 }}>
              {/* Label */}
              <div style={{ width:180, flexShrink:0, paddingRight:10,
                overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap", fontSize:11, fontWeight:700,
                color:T.navy }}>
                {ini.title.substring(0, 22)}
                {ini.title.length > 22 ? "…" : ""}
              </div>

              {/* Bar container */}
              <div style={{ flex:1, position:"relative", height:22,
                background:T.bg, borderRadius:4 }}>
                {/* Month grid lines */}
                {months.map((m, mi) => (
                  <div key={mi} style={{
                    position:  "absolute",
                    left:      `${m.pct}%`,
                    top:       0,
                    bottom:    0,
                    width:     1,
                    background:T.bdr,
                    opacity:   0.5,
                  }}/>
                ))}

                {/* Today line */}
                <div style={{
                  position:  "absolute",
                  left:      `${nowPct}%`,
                  top:       -4,
                  bottom:    -4,
                  width:     2,
                  background:T.red,
                  opacity:   0.5,
                  zIndex:    2,
                }}/>

                {/* Gantt bar */}
                <div style={{
                  position:  "absolute",
                  left:      `${sp}%`,
                  width:     `${w}%`,
                  top:       3,
                  bottom:    3,
                  background:isOverdue ? T.red
                            : ini.status === "completed" ? T.green
                            : statusCfg.c,
                  borderRadius:4,
                  opacity:   ini.status === "cancelled" ? 0.4 : 0.85,
                  display:   "flex",
                  alignItems:"center",
                  paddingLeft:4,
                  overflow:  "hidden",
                  minWidth:  4,
                }}>
                  {w > 8 && (
                    <span style={{ fontSize:9, fontWeight:800,
                      color:"#fff", whiteSpace:"nowrap" }}>
                      {ini.progress}%
                    </span>
                  )}
                </div>

                {/* Progress overlay */}
                <div style={{
                  position:  "absolute",
                  left:      `${sp}%`,
                  width:     `${w * ini.progress / 100}%`,
                  top:       3,
                  bottom:    3,
                  background:"rgba(255,255,255,.3)",
                  borderRadius:4,
                  borderRight:"2px solid rgba(255,255,255,.7)",
                  minWidth:  2,
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap",
        paddingTop:10, borderTop:`1px solid ${T.bdr}` }}>
        {[
          { c:T.teal,  l:"En progreso" },
          { c:T.green, l:"Completada"  },
          { c:T.red,   l:"Vencida"     },
          { c:T.tL,    l:"Sin iniciar" },
        ].map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:14, height:8, borderRadius:3, background:s.c }}/>
            <span style={{ fontSize:10, color:T.tM }}>{s.l}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto" }}>
          <div style={{ width:2, height:14, background:T.red, opacity:.7 }}/>
          <span style={{ fontSize:10, color:T.tM }}>Hoy</span>
        </div>
      </div>
    </Card>
  );
});

// ── INITIATIVES SUMMARY ───────────────────────────────────────
const InitiativesSummary = memo(({ initiatives }) => {
  const total      = initiatives.length;
  const active     = initiatives.filter(i => i.status === "in_progress").length;
  const completed  = initiatives.filter(i => i.status === "completed").length;
  const overdue    = initiatives.filter(i =>
    calc.daysRemaining(i.endDate) < 0 && i.status !== "completed"
    && i.status !== "cancelled").length;
  const totalBudget = initiatives.reduce((s,i) => s + (i.budget || 0), 0);
  const totalSpent  = initiatives.reduce((s,i) => s + (i.spent  || 0), 0);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total"      value={total}     sub="Iniciativas"      icon="🚀" color={T.navy}/>
      <StatCard label="Activas"    value={active}    sub="En progreso"      icon="🔄" color={T.teal}/>
      <StatCard label="Completadas"value={completed} sub="Finalizadas"      icon="✅" color={T.green}/>
      <StatCard label="Vencidas"   value={overdue}   sub="Requieren atención" icon="⚠️"
        color={overdue > 0 ? T.red : T.green}/>
    </div>
  );
});

// ── MAIN INITIATIVES ──────────────────────────────────────────
const Initiatives = memo(({ onNavigate }) => {
  const {
    initiatives, strategicObjectives, users,
    addInitiative, updateInitiative, deleteInitiative,
  } = useApp();

  const [tab,        setTab]        = useState("cards");
  const [statusFlt,  setStatusFlt]  = useState("Todos");
  const [priorityFlt,setPriorityFlt]= useState("Todos");
  const [search,     setSearch]     = useState("");
  const [selectedIni,setSelectedIni]= useState(null);
  const [editIni,    setEditIni]    = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [showConfirm,setShowConfirm]= useState(null);

  // Filtered
  const filtered = useMemo(() => initiatives.filter(i => {
    const statusOk   = statusFlt   === "Todos" || i.status   === statusFlt;
    const priorityOk = priorityFlt === "Todos" || i.priority === priorityFlt;
    const searchOk   = !search || i.title.toLowerCase().includes(search.toLowerCase());
    return statusOk && priorityOk && searchOk;
  }), [initiatives, statusFlt, priorityFlt, search]);

  const handleSave = useCallback(data => {
    if (data.id && initiatives.find(i => i.id === data.id)) updateInitiative(data);
    else addInitiative(data);
  }, [initiatives, updateInitiative, addInitiative]);

  const confirmDelete = useCallback(() => {
    deleteInitiative(showConfirm);
    setShowConfirm(null);
  }, [showConfirm, deleteInitiative]);

  // Chart data
  const statusChartData = useMemo(() =>
    Object.entries(STATUS_CFG).map(([k, v]) => ({
      name:  v.label,
      value: initiatives.filter(i => i.status === k).length,
      color: v.c,
    })).filter(d => d.value > 0),
  [initiatives]);

  const budgetChartData = useMemo(() =>
    initiatives.slice(0, 8).map(i => ({
      name:         i.title.substring(0, 20),
      Presupuesto:  Math.round(i.budget / 1000),
      Ejecutado:    Math.round(i.spent  / 1000),
    })),
  [initiatives]);

  const TABS = [
    { id:"cards",  label:"🃏 Tarjetas"  },
    { id:"table",  label:"📋 Tabla"     },
    { id:"gantt",  label:"📅 Gantt"     },
    { id:"charts", label:"📊 Análisis"  },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🚀 Iniciativas Estratégicas"
        subtitle={`${initiatives.length} iniciativas · Hospital Punta Médica 2025`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("okr")}>
              🎯 Ver OKRs
            </Btn>
            <Btn variant="primary" onClick={() => setShowAdd(true)}>
              + Nueva Iniciativa
            </Btn>
          </div>
        }
      />

      <InitiativesSummary initiatives={initiatives}/>

      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* Filters */}
      {tab !== "gantt" && (
        <div style={{ display:"flex", gap:8, marginBottom:16,
          flexWrap:"wrap", alignItems:"center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar iniciativa..."
            style={{ padding:"6px 12px", borderRadius:8,
              border:`1px solid ${T.bdr}`, fontSize:12,
              color:T.txt, background:T.white, minWidth:180 }}/>
          <select value={statusFlt} onChange={e => setStatusFlt(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8,
              border:`1px solid ${T.bdr}`, fontSize:12, color:T.txt,
              background:T.white }}>
            <option value="Todos">Todos los estados</option>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={priorityFlt} onChange={e => setPriorityFlt(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8,
              border:`1px solid ${T.bdr}`, fontSize:12, color:T.txt,
              background:T.white }}>
            <option value="Todos">Todas las prioridades</option>
            {PRIORITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(statusFlt !== "Todos" || priorityFlt !== "Todos" || search) && (
            <Btn variant="ghost" size="sm" onClick={() => {
              setStatusFlt("Todos"); setPriorityFlt("Todos"); setSearch("");
            }}>✕ Limpiar</Btn>
          )}
          <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
            {filtered.length} de {initiatives.length}
          </span>
        </div>
      )}

      {/* ── CARDS TAB ── */}
      {tab === "cards" && (
        filtered.length === 0
          ? <EmptyState icon="🚀" title="Sin iniciativas"
              description="No hay iniciativas para los filtros seleccionados"
              action={<Btn variant="primary" onClick={() => setShowAdd(true)}>
                + Crear Iniciativa</Btn>}/>
          : (
            <div className="sp-grid-2">
              {filtered.map(ini => (
                <InitiativeCard
                  key={ini.id}
                  initiative={ini}
                  objectives={strategicObjectives}
                  onSelect={setSelectedIni}
                  onEdit={setEditIni}
                  onDelete={id => setShowConfirm(id)}
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
                  <th>Iniciativa</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Avance</th>
                  <th>Presupuesto</th>
                  <th>Fin</th>
                  <th>Días</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ini, i) => {
                  const sc        = STATUS_CFG[ini.status]     || STATUS_CFG.not_started;
                  const pc        = PRIORITY_CFG[ini.priority] || PRIORITY_CFG.medium;
                  const daysLeft  = calc.daysRemaining(ini.endDate);
                  const budgetPct = ini.budget
                    ? Math.round(ini.spent / ini.budget * 100) : 0;
                  return (
                    <tr key={ini.id} style={{ cursor:"pointer" }}
                      onClick={() => setSelectedIni(ini)}>
                      <td style={{ maxWidth:220 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.navy,
                          overflow:"hidden", textOverflow:"ellipsis",
                          whiteSpace:"nowrap" }}>
                          {ini.title}
                        </div>
                        {ini.owner && (
                          <div style={{ fontSize:10, color:T.tL,
                            marginTop:2 }}>👤 {ini.owner}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:800,
                          padding:"2px 8px", borderRadius:20,
                          background:sc.bg, color:sc.c }}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:700,
                          padding:"2px 8px", borderRadius:20,
                          background:pc.bg, color:pc.c }}>
                          {pc.label}
                        </span>
                      </td>
                      <td style={{ minWidth:130 }}>
                        <Bar value={ini.progress} height={6}/>
                      </td>
                      <td>
                        <div style={{ fontSize:11, color:T.navy }}>
                          {fmt.currency(ini.budget)}
                        </div>
                        <div style={{ fontSize:10, color:
                          budgetPct > 100 ? T.red : T.tL }}>
                          {budgetPct}% ejec.
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:T.tM, whiteSpace:"nowrap" }}>
                        {fmt.date(ini.endDate)}
                      </td>
                      <td>
                        <span style={{ fontSize:11, fontWeight:700,
                          color:daysLeft < 0 ? T.red
                              : daysLeft < 15 ? "#d97706" : T.green }}>
                          {daysLeft < 0 ? `+${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={() => setEditIni(ini)}
                            style={{ background:"none", border:"none",
                              cursor:"pointer", fontSize:13 }}>✏️</button>
                          <button onClick={() => setShowConfirm(ini.id)}
                            style={{ background:"none", border:"none",
                              cursor:"pointer", fontSize:13 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── GANTT TAB ── */}
      {tab === "gantt" && (
        <GanttChart initiatives={initiatives}/>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpPieChart
                data={statusChartData}
                title="Iniciativas por Estado"
                height={260}
                innerRadius={50}
                outerRadius={90}
                showLabels={false}
              />
            </Card>
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={[
                  { name:"Crítica", count:initiatives.filter(i=>i.priority==="critical").length },
                  { name:"Alta",    count:initiatives.filter(i=>i.priority==="high").length    },
                  { name:"Media",   count:initiatives.filter(i=>i.priority==="medium").length  },
                  { name:"Baja",    count:initiatives.filter(i=>i.priority==="low").length     },
                ]}
                title="Iniciativas por Prioridad"
                height={260}
                xKey="name"
                bars={[{ key:"count", color:T.teal, label:"Iniciativas" }]}
                showValues
              />
            </Card>
          </div>

          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={budgetChartData}
              title="Presupuesto vs Ejecutado (MXN miles)"
              subtitle="Top 8 iniciativas por presupuesto"
              height={280}
              xKey="name"
              horizontal={true}
              bars={[
                { key:"Presupuesto", color:`${T.teal}50`, label:"Presupuesto" },
                { key:"Ejecutado",   color:T.teal,        label:"Ejecutado"   },
              ]}
            />
          </Card>

          {/* Progress distribution */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:14, fontFamily:"var(--font-display)" }}>
              📊 Distribución de Progreso
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"0–25%",    range:[0,25]  },
                { label:"26–50%",   range:[26,50] },
                { label:"51–75%",   range:[51,75] },
                { label:"76–99%",   range:[76,99] },
                { label:"100%",     range:[100,100]},
              ].map(bucket => {
                const count = initiatives.filter(i =>
                  i.progress >= bucket.range[0] && i.progress <= bucket.range[1]
                ).length;
                const pct   = initiatives.length
                  ? Math.round(count / initiatives.length * 100) : 0;
                return (
                  <div key={bucket.label}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      marginBottom:4 }}>
                      <span style={{ fontSize:11.5, fontWeight:700,
                        color:T.navy }}>{bucket.label}</span>
                      <span style={{ fontSize:11, fontWeight:800,
                        color:T.teal }}>{count} iniciativas</span>
                    </div>
                    <div style={{ height:8, background:"#e6ecf5",
                      borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`,
                        background:T.teal, borderRadius:99 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      {selectedIni && (
        <InitiativeDetailModal
          initiative={selectedIni}
          objectives={strategicObjectives}
          okrs={[]}
          onClose={() => setSelectedIni(null)}
          onEdit={ini => { setEditIni(ini); setSelectedIni(null); }}
        />
      )}

      {(editIni || showAdd) && (
        <InitiativeFormModal
          initiative={editIni}
          objectives={strategicObjectives}
          users={users}
          onSave={handleSave}
          onClose={() => { setEditIni(null); setShowAdd(false); }}
        />
      )}

      {showConfirm && (
        <Modal title="🗑️ Eliminar Iniciativa"
          onClose={() => setShowConfirm(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowConfirm(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={confirmDelete}>Eliminar</Btn>
            </>
          }>
          <AlertBox type="err">
            Esta acción eliminará la iniciativa permanentemente y no se puede deshacer.
          </AlertBox>
        </Modal>
      )}
    </div>
  );
});

export default Initiatives;
