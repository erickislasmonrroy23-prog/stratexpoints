// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — OKR Manager
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, StatusBadge, Bar,
  SectionHeader, StatCard, Avatar, Input,
  Select, Textarea, AlertBox, EmptyState,
  Spinner, Tabs, T,
} from "../ui/index.jsx";
import { SpBarChart, SpPieChart, GaugeChart, SpAreaChart } from "../charts/index.jsx";
import { color, calc, fmt, str, genId, aiService } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value:"not_started", label:"⭕ Sin iniciar" },
  { value:"on_track",    label:"✅ En curso"    },
  { value:"at_risk",     label:"⚠️ En riesgo"   },
  { value:"completed",   label:"🏆 Completado"  },
];
const PERIOD_OPTIONS = [
  { value:"Q1-2025", label:"Q1 2025" },
  { value:"Q2-2025", label:"Q2 2025" },
  { value:"Q3-2025", label:"Q3 2025" },
  { value:"Q4-2025", label:"Q4 2025" },
  { value:"H1-2025", label:"H1 2025" },
  { value:"H2-2025", label:"H2 2025" },
  { value:"2025",    label:"Anual 2025" },
];

// ── KR ROW ────────────────────────────────────────────────────
const KRRow = memo(({ kr, okrId, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(kr.current);
  const pct = calc.progress(kr.current, kr.target);
  const tl  = color.trafficLight(kr.current, kr.target);

  const save = () => {
    onUpdate(okrId, kr.id, { current: parseFloat(val) || 0 });
    setEditing(false);
  };

  return (
    <div style={{
      padding:"10px 13px", background:T.bg, borderRadius:8,
      border:`1px solid ${T.bdr}`, marginBottom:6,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", gap:8, marginBottom:7 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.navy,
            lineHeight:1.35, marginBottom:2 }}>
            {kr.title}
          </div>
          {kr.description && (
            <div style={{ fontSize:10.5, color:T.tL, lineHeight:1.4 }}>
              {kr.description}
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {editing ? (
            <>
              <input
                type="number"
                value={val}
                onChange={e => setVal(e.target.value)}
                style={{
                  width:70, padding:"4px 8px", borderRadius:6, fontSize:12,
                  border:`1.5px solid ${T.teal}`, fontWeight:700,
                  textAlign:"center", color:T.navy,
                }}
                autoFocus
                onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") setEditing(false); }}
              />
              <Btn variant="primary" size="sm" onClick={save}>✓</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>✕</Btn>
            </>
          ) : (
            <>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:14, fontWeight:900, color:tl.color, lineHeight:1 }}>
                  {fmt.number(kr.current, 1)}{kr.unit}
                </div>
                <div style={{ fontSize:10, color:T.tL }}>
                  / {kr.target}{kr.unit}
                </div>
              </div>
              <div style={{ width:9, height:9, borderRadius:"50%",
                background:tl.color, flexShrink:0 }}/>
              <button onClick={() => setEditing(true)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:T.tL, fontSize:12, padding:"2px 4px" }}
                title="Editar valor">✏️</button>
            </>
          )}
        </div>
      </div>
      <Bar value={pct} height={6} barColor={tl.color}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:10, color:T.tL }}>
          {kr.owner ? `👤 ${kr.owner}` : ""}
        </span>
        <span style={{ fontSize:10, fontWeight:700, color:tl.color }}>{pct}%</span>
      </div>
    </div>
  );
});

// ── OKR CARD ─────────────────────────────────────────────────
const OKRCard = memo(({ okr, perspective, onSelect, onEdit, onDelete }) => {
  const trendMap   = { up:"↑", down:"↓", flat:"→" };
  const trendColor = { up:T.green, down:T.red, flat:T.tM };

  return (
    <Card hover sx={{ padding:"14px 16px" }} onClick={() => onSelect(okr)}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:9 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{
              fontSize:9.5, fontWeight:800, padding:"2px 9px",
              borderRadius:20, background:`${T.teal}15`, color:T.teal,
            }}>
              {okr.code}
            </span>
            <StatusBadge status={okr.status}/>
            {perspective && (
              <span style={{
                fontSize:9.5, fontWeight:700, padding:"2px 9px",
                borderRadius:20, background: perspective.bg,
                color:perspective.color,
              }}>
                {perspective.icon} {perspective.label}
              </span>
            )}
          </div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            lineHeight:1.35, fontFamily:"var(--font-display)" }}>
            {okr.objective}
          </div>
        </div>
        <div style={{ display:"flex", gap:5, flexShrink:0, marginLeft:8 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(okr)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"3px 5px" }}>✏️</button>
          <button onClick={() => onDelete(okr.id)}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:T.tL, fontSize:13, padding:"3px 5px" }}>🗑️</button>
        </div>
      </div>

      {/* Progress */}
      <Bar value={okr.progress} height={7}/>

      {/* KRs summary */}
      <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
        {okr.keyResults.slice(0, 3).map((kr, i) => {
          const pct = calc.progress(kr.current, kr.target);
          const tl  = color.trafficLight(kr.current, kr.target);
          return (
            <div key={kr.id} style={{
              flex:1, minWidth:0, padding:"6px 9px",
              background:T.bg, borderRadius:7,
              border:`1px solid ${T.bdr}`,
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.tM,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                marginBottom:3 }}>
                KR{i+1}: {kr.title}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <Bar value={pct} height={4} barColor={tl.color} showPct={false}/>
                </div>
                <span style={{ fontSize:10, fontWeight:800, color:tl.color,
                  marginLeft:6 }}>{pct}%</span>
              </div>
            </div>
          );
        })}
        {okr.keyResults.length > 3 && (
          <div style={{ padding:"6px 9px", background:T.bg, borderRadius:7,
            border:`1px solid ${T.bdr}`, display:"flex", alignItems:"center",
            fontSize:10, color:T.tL, fontWeight:700 }}>
            +{okr.keyResults.length - 3} más
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginTop:10, paddingTop:9,
        borderTop:`1px solid ${T.bdr}`, flexWrap:"wrap", gap:6 }}>
        <div style={{ display:"flex", gap:10 }}>
          <span style={{ fontSize:10, color:T.tL }}>📅 {okr.period}</span>
          <span style={{ fontSize:10, color:T.tL }}>
            🎯 {okr.keyResults.length} KRs
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:11, fontWeight:800,
            color:trendColor[okr.trend || "flat"] }}>
            {trendMap[okr.trend || "flat"]}
          </span>
          <span style={{ fontSize:11, fontWeight:900,
            color:color.progressBar(okr.progress) }}>
            {okr.progress}%
          </span>
        </div>
      </div>
    </Card>
  );
});

// ── OKR DETAIL MODAL ──────────────────────────────────────────
const OKRDetailModal = memo(({ okr, perspective, onClose, onEdit, onUpdateKR, onAddKR }) => {
  const [newKR, setNewKR] = useState(false);
  const [krForm, setKRForm] = useState({
    title:"", target:100, current:0, unit:"%", owner:"",
  });

  const handleAddKR = () => {
    if (!krForm.title.trim()) return;
    onAddKR(okr.id, {
      id:      genId("kr"),
      title:   krForm.title,
      target:  parseFloat(krForm.target) || 100,
      current: parseFloat(krForm.current) || 0,
      unit:    krForm.unit || "%",
      owner:   krForm.owner,
    });
    setKRForm({ title:"", target:100, current:0, unit:"%", owner:"" });
    setNewKR(false);
  };

  return (
    <Modal
      title={`${okr.code} — OKR Detail`}
      onClose={onClose}
      maxWidth={700}
      footer={
        <Btn variant="primary" onClick={() => { onEdit(okr); onClose(); }}>
          ✏️ Editar OKR
        </Btn>
      }
    >
      {/* Status + meta */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <StatusBadge status={okr.status}/>
        {perspective && (
          <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11,
            fontWeight:700, background:perspective.bg, color:perspective.color,
            border:`1px solid ${perspective.border}` }}>
            {perspective.icon} {perspective.label}
          </span>
        )}
        <span style={{ fontSize:10.5, color:T.tL, display:"flex",
          alignItems:"center" }}>📅 {okr.period}</span>
      </div>

      {/* Objective */}
      <div style={{ fontSize:16, fontWeight:800, color:T.navy, marginBottom:12,
        fontFamily:"var(--font-display)", lineHeight:1.35 }}>
        {okr.objective}
      </div>

      {/* Overall progress */}
      <Card sx={{ padding:"12px 14px", marginBottom:16,
        background:`linear-gradient(135deg,${T.navy}08,${T.teal}08)` }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:T.tM }}>
            Progreso General
          </span>
          <span style={{ fontSize:20, fontWeight:900,
            color:color.progressBar(okr.progress),
            fontFamily:"var(--font-display)" }}>
            {okr.progress}%
          </span>
        </div>
        <Bar value={okr.progress} height={10}/>
      </Card>

      {/* Key Results */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:800, color:T.teal,
          letterSpacing:".08em" }}>
          KEY RESULTS ({okr.keyResults.length})
        </div>
        <Btn variant="secondary" size="sm" onClick={() => setNewKR(true)}>
          + KR
        </Btn>
      </div>

      {/* New KR form */}
      {newKR && (
        <Card sx={{ padding:"13px 14px", marginBottom:10,
          border:`1.5px solid ${T.teal}`, background:`${T.teal}05` }}>
          <div style={{ fontSize:11, fontWeight:800, color:T.teal,
            marginBottom:10 }}>
            Nuevo Key Result
          </div>
          <Input
            label="Título"
            value={krForm.title}
            onChange={e => setKRForm(p => ({ ...p, title:e.target.value }))}
            placeholder="Ej: Aumentar satisfacción a 90%"
          />
          <div className="sp-grid-2" style={{ gap:8 }}>
            <Input label="Meta" type="number" value={krForm.target}
              onChange={e => setKRForm(p => ({ ...p, target:e.target.value }))}/>
            <Input label="Actual" type="number" value={krForm.current}
              onChange={e => setKRForm(p => ({ ...p, current:e.target.value }))}/>
          </div>
          <div className="sp-grid-2" style={{ gap:8 }}>
            <Input label="Unidad" value={krForm.unit}
              onChange={e => setKRForm(p => ({ ...p, unit:e.target.value }))}
              placeholder="%"/>
            <Input label="Responsable" value={krForm.owner}
              onChange={e => setKRForm(p => ({ ...p, owner:e.target.value }))}
              placeholder="Nombre"/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="ghost" size="sm" onClick={() => setNewKR(false)}>
              Cancelar
            </Btn>
            <Btn variant="primary" size="sm" onClick={handleAddKR}>
              Agregar KR
            </Btn>
          </div>
        </Card>
      )}

      {/* KR list */}
      {okr.keyResults.length === 0
        ? <EmptyState icon="🎯" title="Sin Key Results" description="Agrega KRs para medir el avance"/>
        : okr.keyResults.map(kr => (
          <KRRow key={kr.id} kr={kr} okrId={okr.id} onUpdate={onUpdateKR}/>
        ))
      }
    </Modal>
  );
});

// ── OKR FORM MODAL ────────────────────────────────────────────
const OKRFormModal = memo(({ okr, perspectives, objectives, users, onSave, onClose }) => {
  const isEdit = !!okr;
  const [form, setForm] = useState({
    code:          okr?.code          || "",
    objective:     okr?.objective     || "",
    perspectiveId: okr?.perspectiveId || "fin",
    objectiveId:   okr?.objectiveId   || "",
    owner:         okr?.owner         || "u1",
    period:        okr?.period        || "Q1-2025",
    status:        okr?.status        || "not_started",
    progress:      okr?.progress      ?? 0,
  });
  const [errors,   setErrors]   = useState({});
  const [aiLoading, setAILoading] = useState(false);
  const [aiSugg,   setAISugg]   = useState(null);

  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = () => {
    const errs = {};
    if (!form.objective.trim()) errs.objective = "El objetivo es requerido";
    if (!form.code.trim())      errs.code      = "El código es requerido";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      ...form,
      id:       okr?.id || genId("okr"),
      progress: parseInt(form.progress) || 0,
      keyResults: okr?.keyResults || [],
      trend:    okr?.trend || "flat",
    });
    onClose();
  };

  const generateWithAI = async () => {
    if (!form.objective.trim()) {
      setErrors({ objective:"Escribe el objetivo primero" });
      return;
    }
    setAILoading(true);
    try {
      const result = await aiService.generateOKRs(form.objective, "hospital");
      setAISugg(result);
    } catch {
      setAISugg({ error:"No se pudo conectar con IA. Verifica la API key." });
    }
    setAILoading(false);
  };

  const applyAISugg = (kr) => {
    // Store suggestion to apply on save
    setAISugg(null);
  };

  const perspOptions = perspectives.map(p => ({ value:p.id, label:`${p.icon} ${p.label}` }));
  const objOptions   = [
    { value:"", label:"— Sin objetivo padre —" },
    ...objectives.map(o => ({ value:o.id, label:`${o.code}: ${o.title.substring(0,40)}` })),
  ];
  const userOptions  = users.map(u => ({ value:u.id, label:u.name }));

  return (
    <Modal
      title={isEdit ? "✏️ Editar OKR" : "➕ Nuevo OKR"}
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="gold" onClick={generateWithAI} disabled={aiLoading}>
            {aiLoading ? <Spinner size={12}/> : "🤖"} Generar KRs con IA
          </Btn>
          <Btn variant="primary" onClick={handleSave}>
            {isEdit ? "Guardar" : "Crear OKR"}
          </Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Input
            label="Código (ej: OKR-05)"
            value={form.code}
            onChange={e => set("code", e.target.value)}
            error={errors.code}
            placeholder="OKR-05"
          />
          <Select
            label="Período"
            value={form.period}
            options={PERIOD_OPTIONS}
            onChange={e => set("period", e.target.value)}
          />
        </div>

        <Textarea
          label="Objetivo"
          value={form.objective}
          onChange={e => set("objective", e.target.value)}
          error={errors.objective}
          placeholder="Ej: Ser el hospital de mayor satisfacción en la región"
          sx={{ marginBottom:2 }}
        />

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select
            label="Perspectiva BSC"
            value={form.perspectiveId}
            options={perspOptions}
            onChange={e => set("perspectiveId", e.target.value)}
          />
          <Select
            label="Objetivo Estratégico"
            value={form.objectiveId}
            options={objOptions}
            onChange={e => set("objectiveId", e.target.value)}
          />
        </div>

        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select
            label="Responsable"
            value={form.owner}
            options={userOptions}
            onChange={e => set("owner", e.target.value)}
          />
          <Select
            label="Estado"
            value={form.status}
            options={STATUS_OPTIONS}
            onChange={e => set("status", e.target.value)}
          />
        </div>

        <Input
          label="Progreso inicial (%)"
          type="number"
          value={form.progress}
          onChange={e => set("progress", e.target.value)}
          min="0" max="100"
        />

        {/* AI suggestions */}
        {aiLoading && (
          <AlertBox type="info">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Spinner size={13} dark/>
              Generando Key Results sugeridos con IA...
            </div>
          </AlertBox>
        )}

        {aiSugg && !aiSugg.error && (
          <div style={{ background:`${T.gold}10`, border:`1.5px solid ${T.gold}40`,
            borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#92400e", marginBottom:8 }}>
              🤖 KRs sugeridos por IA
            </div>
            {aiSugg.keyResults?.map((kr, i) => (
              <div key={i} style={{ padding:"8px 10px", background:T.white,
                borderRadius:7, marginBottom:6, fontSize:12, color:T.navy,
                border:`1px solid ${T.bdr}` }}>
                <div style={{ fontWeight:700 }}>{kr.title}</div>
                <div style={{ fontSize:10.5, color:T.tL, marginTop:2 }}>
                  Meta: {kr.target}{kr.unit}
                </div>
              </div>
            ))}
            <div style={{ fontSize:10.5, color:T.tL, marginTop:6 }}>
              Los KRs se podrán editar después de crear el OKR.
            </div>
          </div>
        )}

        {aiSugg?.error && (
          <AlertBox type="warn">{aiSugg.error}</AlertBox>
        )}
      </div>
    </Modal>
  );
});

// ── OKR STATS BAR ─────────────────────────────────────────────
const OKRStats = memo(({ okrs }) => {
  const total     = okrs.length;
  const onTrack   = okrs.filter(o => o.status === "on_track").length;
  const atRisk    = okrs.filter(o => o.status === "at_risk").length;
  const completed = okrs.filter(o => o.status === "completed").length;
  const avgProg   = calc.avgProgress(okrs);
  const totalKRs  = okrs.reduce((s, o) => s + o.keyResults.length, 0);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total OKRs"   value={total}      sub={`${totalKRs} Key Results`} icon="🎯" color={T.navy}/>
      <StatCard label="En Curso"     value={onTrack}    sub="Ejecutándose"   icon="✅" color={T.green}/>
      <StatCard label="En Riesgo"    value={atRisk}     sub="Atención req."  icon="⚠️" color="#d97706"/>
      <StatCard label="Avance Medio" value={`${avgProg}%`} sub="OKR global"  icon="📊" color={color.progressBar(avgProg)}/>
    </div>
  );
});

// ── MAIN OKR ──────────────────────────────────────────────────
const OKR = memo(({ onNavigate }) => {
  const {
    okrs, perspectives, strategicObjectives, users,
    updateKR, addKR, addOKR, updateOKR, deleteOKR,
  } = useApp();

  const [tab,         setTab]         = useState("list");
  const [filter,      setFilter]      = useState("Todos");
  const [perspFilter, setPerspFilter] = useState("Todos");
  const [search,      setSearch]      = useState("");
  const [selectedOKR, setSelectedOKR] = useState(null);
  const [editOKR,     setEditOKR]     = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);

  // Filtered OKRs
  const filtered = useMemo(() => okrs.filter(o => {
    const statusOk = filter === "Todos" || o.status === filter;
    const perspOk  = perspFilter === "Todos" || o.perspectiveId === perspFilter;
    const searchOk = !search || o.objective.toLowerCase().includes(search.toLowerCase())
      || o.code.toLowerCase().includes(search.toLowerCase());
    return statusOk && perspOk && searchOk;
  }), [okrs, filter, perspFilter, search]);

  // Chart data
  const perspChartData = useMemo(() => {
    return perspectives.map(p => {
      const related = okrs.filter(o => o.perspectiveId === p.id);
      return { name:p.label, value:calc.avgProgress(related), color:p.color };
    }).filter(d => d.value > 0);
  }, [perspectives, okrs]);

  const statusChartData = useMemo(() => [
    { name:"En curso",    value:okrs.filter(o=>o.status==="on_track").length,    color:T.green  },
    { name:"En riesgo",   value:okrs.filter(o=>o.status==="at_risk").length,     color:"#d97706"},
    { name:"Completado",  value:okrs.filter(o=>o.status==="completed").length,   color:T.blue   },
    { name:"Sin iniciar", value:okrs.filter(o=>o.status==="not_started").length, color:T.tL     },
  ].filter(d=>d.value>0), [okrs]);

  const handleSave = useCallback(data => {
    if (data.id && okrs.find(o => o.id === data.id)) updateOKR(data);
    else addOKR(data);
  }, [okrs, updateOKR, addOKR]);

  const confirmDelete = useCallback(() => {
    deleteOKR(showConfirm);
    setShowConfirm(null);
  }, [showConfirm, deleteOKR]);

  const selectedPersp = useMemo(() =>
    perspectives.find(p => p.id === selectedOKR?.perspectiveId),
  [perspectives, selectedOKR]);

  const TABS = [
    { id:"list",   label:"📋 Lista OKRs"   },
    { id:"charts", label:"📊 Análisis"     },
    { id:"matrix", label:"🗂️ Matriz"       },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🎯 OKR Manager"
        subtitle="Objetivos y Key Results · Hospital Punta Médica"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("bsc")}>
              🗺️ Ver BSC
            </Btn>
            <Btn variant="primary" onClick={() => setShowAdd(true)}>
              + Nuevo OKR
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <OKRStats okrs={okrs}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <>
          {/* Filters */}
          <div style={{ display:"flex", gap:8, marginBottom:16,
            flexWrap:"wrap", alignItems:"center" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar OKR..."
              style={{
                padding:"6px 12px", borderRadius:8, border:`1px solid ${T.bdr}`,
                fontSize:12, color:T.txt, background:T.white, minWidth:180,
              }}
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
                fontSize:12, color:T.txt, background:T.white }}>
              <option value="Todos">Todos los estados</option>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={perspFilter}
              onChange={e => setPerspFilter(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${T.bdr}`,
                fontSize:12, color:T.txt, background:T.white }}>
              <option value="Todos">Todas las perspectivas</option>
              {perspectives.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
              ))}
            </select>
            {(filter !== "Todos" || perspFilter !== "Todos" || search) && (
              <Btn variant="ghost" size="sm" onClick={() => {
                setFilter("Todos"); setPerspFilter("Todos"); setSearch("");
              }}>
                ✕ Limpiar
              </Btn>
            )}
            <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
              {filtered.length} de {okrs.length} OKRs
            </span>
          </div>

          {/* OKR Grid */}
          {filtered.length === 0
            ? <EmptyState icon="🎯" title="Sin OKRs" description="No hay resultados para los filtros seleccionados"
                action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Crear OKR</Btn>}/>
            : (
              <div className="sp-grid-2">
                {filtered.map(okr => (
                  <OKRCard
                    key={okr.id}
                    okr={okr}
                    perspective={perspectives.find(p => p.id === okr.perspectiveId)}
                    onSelect={setSelectedOKR}
                    onEdit={o => { setEditOKR(o); }}
                    onDelete={id => setShowConfirm(id)}
                  />
                ))}
              </div>
            )
          }
        </>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpPieChart
                data={statusChartData}
                title="OKRs por Estado"
                height={260}
                innerRadius={50}
                outerRadius={90}
                showLabels={false}
              />
            </Card>
            <Card sx={{ padding:"16px 18px" }}>
              <SpPieChart
                data={perspChartData}
                title="Progreso por Perspectiva"
                subtitle="Promedio de avance"
                height={260}
                innerRadius={50}
                outerRadius={90}
                showLabels={false}
              />
            </Card>
          </div>
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={okrs.map(o => ({
                name:     o.code,
                Progreso: o.progress,
                Meta:     100,
              }))}
              title="Progreso Individual por OKR"
              height={280}
              xKey="name"
              bars={[
                { key:"Meta",     color:`${T.bdr}`,  label:"Meta (100%)" },
                { key:"Progreso", color:T.teal,       label:"Avance actual" },
              ]}
              showValues={true}
            />
          </Card>
        </div>
      )}

      {/* ── MATRIX TAB ── */}
      {tab === "matrix" && (
        <div>
          {perspectives.map(persp => {
            const perspOKRs = okrs.filter(o => o.perspectiveId === persp.id);
            if (!perspOKRs.length) return null;
            return (
              <div key={persp.id} style={{ marginBottom:22 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  marginBottom:10, paddingBottom:8,
                  borderBottom:`2px solid ${persp.border}` }}>
                  <span style={{ fontSize:18 }}>{persp.icon}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:persp.color,
                    fontFamily:"var(--font-display)" }}>
                    {persp.label}
                  </span>
                  <span style={{ fontSize:11, color:T.tL }}>
                    {perspOKRs.length} OKRs · {calc.avgProgress(perspOKRs)}% promedio
                  </span>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table className="sp-table" style={{ minWidth:600 }}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Objetivo</th>
                        <th>KRs</th>
                        <th>Período</th>
                        <th>Estado</th>
                        <th>Progreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perspOKRs.map(okr => (
                        <tr key={okr.id} style={{ cursor:"pointer" }}
                          onClick={() => setSelectedOKR(okr)}>
                          <td>
                            <span style={{ fontSize:10.5, fontWeight:800,
                              color:T.teal }}>
                              {okr.code}
                            </span>
                          </td>
                          <td style={{ fontSize:12, fontWeight:600,
                            color:T.navy, maxWidth:280 }}>
                            {okr.objective}
                          </td>
                          <td style={{ textAlign:"center", fontSize:12,
                            fontWeight:700, color:T.blue }}>
                            {okr.keyResults.length}
                          </td>
                          <td>
                            <span style={{ fontSize:10.5, color:T.tL }}>
                              {okr.period}
                            </span>
                          </td>
                          <td><StatusBadge status={okr.status}/></td>
                          <td style={{ minWidth:140 }}>
                            <Bar value={okr.progress} height={6}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedOKR && (
        <OKRDetailModal
          okr={selectedOKR}
          perspective={selectedPersp}
          onClose={() => setSelectedOKR(null)}
          onEdit={o => { setEditOKR(o); setSelectedOKR(null); }}
          onUpdateKR={updateKR}
          onAddKR={addKR}
        />
      )}

      {(editOKR || showAdd) && (
        <OKRFormModal
          okr={editOKR}
          perspectives={perspectives}
          objectives={strategicObjectives}
          users={users}
          onSave={handleSave}
          onClose={() => { setEditOKR(null); setShowAdd(false); }}
        />
      )}

      {showConfirm && (
        <Modal title="🗑️ Eliminar OKR" onClose={() => setShowConfirm(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowConfirm(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={confirmDelete}>Eliminar</Btn>
            </>
          }>
          <AlertBox type="err">
            Esta acción eliminará el OKR y todos sus Key Results permanentemente.
          </AlertBox>
        </Modal>
      )}
    </div>
  );
});

export default OKR;
```

---

✅ **OKR.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    └── OKR.jsx    ← nueva
