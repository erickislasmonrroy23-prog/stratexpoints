// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Balanced Scorecard Module
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, StatusBadge, Bar,
  SectionHeader, StatCard, Avatar, Input,
  Select, Textarea, AlertBox, EmptyState, T,
} from "../ui/index.jsx";
import { SpBarChart, SpPieChart, GaugeChart } from "../charts/index.jsx";
import { color, calc, fmt, str, genId, validate } from "../../utils/helpers.js";

// ── FILTROS ───────────────────────────────────────────────────
const PILLAR_FILTERS = ["Todos","Cliente","Productividad","Expansión"];
const STATUS_FILTERS = ["Todos","on_track","at_risk","completed","not_started"];

// ── OBJECTIVE CARD ────────────────────────────────────────────
const ObjectiveCard = memo(({ objective, perspective, okrs, initiatives, onSelect, onEdit, onDelete }) => {
  const relatedOKRs  = okrs.filter(o => o.objectiveId === objective.id);
  const relatedInits = initiatives.filter(i => i.objectiveId === objective.id);
  const avgOKR       = calc.avgProgress(relatedOKRs);

  return (
    <div
      onClick={() => onSelect(objective)}
      style={{
        padding:    "11px 13px",
        background: perspective.bg,
        border:     `1.5px solid ${perspective.border}`,
        borderRadius: 9,
        cursor:     "pointer",
        transition: "all .18s",
        position:   "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = perspective.color;
        e.currentTarget.style.boxShadow   = `0 4px 14px ${perspective.color}22`;
        e.currentTarget.style.transform   = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = perspective.border;
        e.currentTarget.style.boxShadow   = "none";
        e.currentTarget.style.transform   = "none";
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{
            fontSize:9.5, fontWeight:800, padding:"2px 8px",
            borderRadius:20, background:`${perspective.color}20`,
            color:perspective.color,
          }}>
            {objective.code}
          </span>
          <StatusBadge status={objective.status}/>
        </div>
        <div style={{ display:"flex", gap:4 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(objective)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"2px 4px" }} title="Editar">✏️</button>
          <button onClick={() => onDelete(objective.id)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"2px 4px" }} title="Eliminar">🗑️</button>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize:12, fontWeight:700, color:T.navy, lineHeight:1.4, marginBottom:8 }}>
        {objective.title}
      </div>

      {/* Progress */}
      <Bar value={objective.progress} height={5} barColor={perspective.color}/>

      {/* Footer */}
      <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, color:T.tL }}>
          🎯 {relatedOKRs.length} OKRs
        </span>
        <span style={{ fontSize:10, color:T.tL }}>
          🚀 {relatedInits.length} Iniciativas
        </span>
        {relatedOKRs.length > 0 && (
          <span style={{ fontSize:10, fontWeight:700, color:perspective.color, marginLeft:"auto" }}>
            {avgOKR}% avance
          </span>
        )}
      </div>
    </div>
  );
});

// ── PERSPECTIVE SECTION ───────────────────────────────────────
const PerspectiveSection = memo(({
  perspective, objectives, okrs, initiatives,
  pillarFilter, statusFilter, onSelect, onEdit, onDelete, onAdd,
}) => {
  const filtered = useMemo(() => objectives.filter(o => {
    const pillarOk = pillarFilter === "Todos" ? true : true; // pillar logic if needed
    const statusOk = statusFilter === "Todos"  ? true : o.status === statusFilter;
    return pillarOk && statusOk;
  }), [objectives, pillarFilter, statusFilter]);

  const avgProgress = useMemo(() => calc.avgProgress(filtered), [filtered]);

  if (filtered.length === 0 && statusFilter !== "Todos") return null;

  return (
    <div style={{ marginBottom:22 }}>
      {/* Perspective header */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:10, flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:20 }}>{perspective.icon}</span>
          <span style={{
            fontSize:13, fontWeight:800, color:perspective.color,
            letterSpacing:".04em", fontFamily:"var(--font-display)",
          }}>
            {perspective.label.toUpperCase()}
          </span>
        </div>
        <div style={{ flex:1, height:1.5, background:perspective.border }}/>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:T.tL }}>
            {filtered.length} objetivos
          </span>
          <span style={{
            fontSize:12, fontWeight:800, color:perspective.color,
          }}>
            {avgProgress}%
          </span>
          <div style={{
            width:32, height:32, borderRadius:"50%",
            background:`conic-gradient(${perspective.color} ${avgProgress * 3.6}deg, #e6ecf5 0deg)`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background:T.white }}/>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => onAdd(perspective.id)}>
            + Objetivo
          </Btn>
        </div>
      </div>

      {/* Objectives grid */}
      {filtered.length === 0
        ? (
          <div style={{ padding:"20px", background:perspective.bg,
            borderRadius:9, textAlign:"center", border:`1px dashed ${perspective.border}` }}>
            <span style={{ fontSize:12, color:T.tL }}>
              Sin objetivos en esta perspectiva.
            </span>
          </div>
        )
        : (
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
            gap:9,
          }}>
            {filtered.map(obj => (
              <ObjectiveCard
                key={obj.id}
                objective={obj}
                perspective={perspective}
                okrs={okrs}
                initiatives={initiatives}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      }
    </div>
  );
});

// ── OBJECTIVE DETAIL MODAL ────────────────────────────────────
const ObjectiveDetailModal = memo(({ objective, perspective, okrs, initiatives, kpis, onClose, onEdit }) => {
  const relatedOKRs  = okrs.filter(o => o.objectiveId === objective.id);
  const relatedInits = initiatives.filter(i => i.objectiveId === objective.id);
  const relatedKPIs  = kpis.filter(k => objective.kpiIds?.includes(k.id));

  return (
    <Modal
      title={`${objective.code} — ${perspective?.label}`}
      onClose={onClose}
      maxWidth={680}
      footer={
        <Btn variant="primary" onClick={() => { onEdit(objective); onClose(); }}>
          ✏️ Editar Objetivo
        </Btn>
      }
    >
      {/* Perspective badge */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <span style={{
          padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
          background: perspective?.bg, color:perspective?.color,
          border:`1px solid ${perspective?.border}`,
        }}>
          {perspective?.icon} {perspective?.label}
        </span>
        <StatusBadge status={objective.status}/>
        <span style={{ fontSize:10, color:T.tL, display:"flex", alignItems:"center" }}>
          📅 {objective.period}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize:16, fontWeight:800, color:T.navy, marginBottom:10,
        fontFamily:"var(--font-display)", lineHeight:1.3 }}>
        {objective.title}
      </div>

      {/* Progress */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>Progreso General</span>
          <span style={{ fontSize:13, fontWeight:900, color:perspective?.color }}>
            {objective.progress}%
          </span>
        </div>
        <Bar value={objective.progress} height={8} barColor={perspective?.color}/>
      </div>

      {/* KPIs */}
      {relatedKPIs.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            KPIs ASOCIADOS
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {relatedKPIs.map(kpi => {
              const pct = calc.progress(kpi.value, kpi.target);
              const tl  = color.trafficLight(kpi.value, kpi.target);
              return (
                <div key={kpi.id} style={{ padding:"9px 12px", background:T.bg,
                  borderRadius:8, display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, color:T.navy }}>{kpi.name}</div>
                    <div style={{ fontSize:10, color:T.tL, marginTop:1 }}>{kpi.formula}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:900, color:tl.color }}>
                      {kpi.value}{kpi.unit}
                    </div>
                    <div style={{ fontSize:10, color:T.tL }}>meta: {kpi.target}{kpi.unit}</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:"50%",
                    background:tl.color, flexShrink:0 }}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OKRs */}
      {relatedOKRs.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            OKRs VINCULADOS ({relatedOKRs.length})
          </div>
          {relatedOKRs.map(okr => (
            <div key={okr.id} style={{ padding:"9px 12px", background:T.bg,
              borderRadius:8, marginBottom:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:5 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:T.navy }}>
                  {okr.objective}
                </div>
                <StatusBadge status={okr.status}/>
              </div>
              <Bar value={okr.progress} height={5}/>
              <div style={{ fontSize:10, color:T.tL, marginTop:3 }}>
                {okr.keyResults.length} Key Results · {okr.period}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initiatives */}
      {relatedInits.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            INICIATIVAS ({relatedInits.length})
          </div>
          {relatedInits.map(ini => (
            <div key={ini.id} style={{ padding:"9px 12px", background:T.bg,
              borderRadius:8, marginBottom:6, display:"flex",
              justifyContent:"space-between", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:T.navy,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {ini.title}
                </div>
                <div style={{ fontSize:10, color:T.tL, marginTop:1 }}>
                  {fmt.date(ini.startDate)} → {fmt.date(ini.endDate)}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                <Bar value={ini.progress} height={5} showPct={false}/>
                <span style={{ fontSize:11, fontWeight:800,
                  color:color.progressBar(ini.progress) }}>
                  {ini.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
});

// ── OBJECTIVE FORM MODAL ──────────────────────────────────────
const ObjectiveFormModal = memo(({ objective, perspectiveId, perspectives, users, onSave, onClose }) => {
  const isEdit = !!objective;
  const [form, setForm] = useState({
    perspectiveId: perspectiveId || objective?.perspectiveId || "fin",
    code:          objective?.code     || "",
    title:         objective?.title    || "",
    owner:         objective?.owner    || "u1",
    period:        objective?.period   || "2025",
    status:        objective?.status   || "not_started",
    progress:      objective?.progress ?? 0,
  });
  const [errors, setErrors] = useState({});

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSave = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "El título es requerido";
    if (!form.code.trim())  errs.code  = "El código es requerido";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      ...form,
      id:       objective?.id || genId("so"),
      progress: parseInt(form.progress) || 0,
      kpiIds:   objective?.kpiIds || [],
    });
    onClose();
  };

  const perspOptions = perspectives.map(p => ({ value:p.id, label:`${p.icon} ${p.label}` }));
  const userOptions  = users.map(u => ({ value:u.id, label:`${u.name} — ${u.area}` }));
  const statusOptions = [
    { value:"not_started", label:"Sin iniciar" },
    { value:"on_track",    label:"En curso"    },
    { value:"at_risk",     label:"En riesgo"   },
    { value:"completed",   label:"Completado"  },
  ];

  return (
    <Modal
      title={isEdit ? "✏️ Editar Objetivo Estratégico" : "➕ Nuevo Objetivo Estratégico"}
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {isEdit ? "Guardar Cambios" : "Crear Objetivo"}
          </Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select
            label="Perspectiva"
            value={form.perspectiveId}
            options={perspOptions}
            onChange={e => set("perspectiveId", e.target.value)}
          />
          <Input
            label="Código (ej: F4, C5)"
            value={form.code}
            onChange={e => set("code", e.target.value)}
            error={errors.code}
            placeholder="F4"
          />
        </div>

        <Input
          label="Título del Objetivo"
          value={form.title}
          onChange={e => set("title", e.target.value)}
          error={errors.title}
          placeholder="Ej: Incrementar ingresos operativos en 20%"
        />

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select
            label="Responsable"
            value={form.owner}
            options={userOptions}
            onChange={e => set("owner", e.target.value)}
          />
          <Input
            label="Período"
            value={form.period}
            onChange={e => set("period", e.target.value)}
            placeholder="2025"
          />
        </div>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select
            label="Estado"
            value={form.status}
            options={statusOptions}
            onChange={e => set("status", e.target.value)}
          />
          <Input
            label="Progreso (%)"
            type="number"
            value={form.progress}
            onChange={e => set("progress", e.target.value)}
            min="0" max="100"
          />
        </div>
      </div>
    </Modal>
  );
});

// ── BSC SUMMARY STATS ─────────────────────────────────────────
const BSCSummary = memo(({ objectives, okrs }) => {
  const total     = objectives.length;
  const onTrack   = objectives.filter(o => o.status === "on_track").length;
  const atRisk    = objectives.filter(o => o.status === "at_risk").length;
  const completed = objectives.filter(o => o.status === "completed").length;
  const avgProg   = calc.avgProgress(objectives);

  const chartData = [
    { name:"En curso",    value:onTrack,             color:T.green  },
    { name:"En riesgo",   value:atRisk,              color:"#d97706" },
    { name:"Completado",  value:completed,           color:T.blue   },
    { name:"Sin iniciar", value:total-onTrack-atRisk-completed, color:T.tL },
  ].filter(d => d.value > 0);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total Objetivos" value={total}     sub="Estratégicos"   icon="🎯" color={T.navy}/>
      <StatCard label="En Curso"        value={onTrack}   sub="Ejecutándose"   icon="✅" color={T.green}/>
      <StatCard label="En Riesgo"       value={atRisk}    sub="Requieren atención" icon="⚠️" color="#d97706"/>
      <StatCard label="Avance Global"   value={`${avgProg}%`} sub="BSC promedio" icon="📊" color={color.progressBar(avgProg)}/>
    </div>
  );
});

// ── MAIN BSC ──────────────────────────────────────────────────
const BSC = memo(({ onNavigate }) => {
  const {
    perspectives, strategicObjectives, okrs,
    initiatives, kpis, users,
    addObjective, updateObjective, deleteObjective,
  } = useApp();

  const [pillarFilter, setPillarFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedObj,  setSelectedObj]  = useState(null);
  const [editObj,      setEditObj]      = useState(null);
  const [addPerspId,   setAddPerspId]   = useState(null);
  const [showConfirm,  setShowConfirm]  = useState(null);

  const handleSave = useCallback((obj) => {
    if (obj.id && strategicObjectives.find(o => o.id === obj.id)) {
      updateObjective(obj);
    } else {
      addObjective(obj);
    }
  }, [strategicObjectives, updateObjective, addObjective]);

  const handleDelete = useCallback((id) => {
    setShowConfirm(id);
  }, []);

  const confirmDelete = useCallback(() => {
    deleteObjective(showConfirm);
    setShowConfirm(null);
  }, [showConfirm, deleteObjective]);

  const selectedPersp = useMemo(() =>
    perspectives.find(p => p.id === selectedObj?.perspectiveId),
  [perspectives, selectedObj]);

  return (
    <div className="sp-page">
      <SectionHeader
        title="🗺️ Balanced Scorecard"
        subtitle="Mapa estratégico BSC · 4 perspectivas · 2025–2027"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("strategymap")}>
              🔗 Ver Mapa Estratégico
            </Btn>
            <Btn variant="primary" onClick={() => setAddPerspId("fin")}>
              + Nuevo Objetivo
            </Btn>
          </div>
        }
      />

      {/* Summary stats */}
      <BSCSummary objectives={strategicObjectives} okrs={okrs}/>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>Estado:</span>
        {STATUS_FILTERS.map(f => (
          <button key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding:"4px 11px", borderRadius:20, fontSize:11, fontWeight:700,
              border:`1.5px solid ${statusFilter===f ? T.teal : T.bdr}`,
              background: statusFilter===f ? `${T.teal}15` : "transparent",
              color:       statusFilter===f ? T.teal : T.tM,
              cursor:"pointer", transition:"all .15s",
            }}>
            {f === "Todos" ? "Todos" : { on_track:"✅ En curso", at_risk:"⚠️ En riesgo", completed:"🏆 Completado", not_started:"⭕ Sin iniciar" }[f]}
          </button>
        ))}
      </div>

      {/* Perspectives */}
      {perspectives.map(per => (
        <PerspectiveSection
          key={per.id}
          perspective={per}
          objectives={strategicObjectives.filter(o => o.perspectiveId === per.id)}
          okrs={okrs}
          initiatives={initiatives}
          pillarFilter={pillarFilter}
          statusFilter={statusFilter}
          onSelect={setSelectedObj}
          onEdit={obj => setEditObj(obj)}
          onDelete={handleDelete}
          onAdd={id => setAddPerspId(id)}
        />
      ))}

      {/* Objective detail modal */}
      {selectedObj && (
        <ObjectiveDetailModal
          objective={selectedObj}
          perspective={selectedPersp}
          okrs={okrs}
          initiatives={initiatives}
          kpis={kpis}
          onClose={() => setSelectedObj(null)}
          onEdit={obj => { setEditObj(obj); setSelectedObj(null); }}
        />
      )}

      {/* Objective form modal */}
      {(editObj !== null || addPerspId) && (
        <ObjectiveFormModal
          objective={editObj}
          perspectiveId={addPerspId}
          perspectives={perspectives}
          users={users}
          onSave={handleSave}
          onClose={() => { setEditObj(null); setAddPerspId(null); }}
        />
      )}

      {/* Confirm delete */}
      {showConfirm && (
        <Modal
          title="🗑️ Eliminar Objetivo"
          onClose={() => setShowConfirm(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowConfirm(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={confirmDelete}>Eliminar</Btn>
            </>
          }
        >
          <AlertBox type="err">
            Esta acción eliminará el objetivo estratégico y no se puede deshacer.
            Los OKRs e iniciativas vinculados no se eliminarán.
          </AlertBox>
        </Modal>
      )}
    </div>
  );
});

export default BSC;
