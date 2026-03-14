// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Mapa Estratégico (Strategy Map)
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Badge, Bar, SectionHeader,
  StatCard, AlertBox, Tabs, T,
} from "../ui/index.jsx";
import { color, calc } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const NODE_W  = 170;
const NODE_H  = 72;
const PAD_X   = 40;
const PAD_Y   = 30;
const GAP_X   = 24;
const GAP_Y   = 110;

// ── LAYOUT ENGINE ─────────────────────────────────────────────
const buildLayout = (objectives, perspectives) => {
  const nodes = [];
  perspectives.forEach((persp, pi) => {
    const objs = objectives.filter(o => o.perspectiveId === persp.id);
    objs.forEach((obj, oi) => {
      const col = oi;
      const row = pi;
      nodes.push({
        id:            obj.id,
        label:         obj.title,
        code:          obj.code,
        progress:      obj.progress,
        status:        obj.status,
        perspectiveId: obj.perspectiveId,
        x:             PAD_X + col * (NODE_W + GAP_X),
        y:             PAD_Y + row * (NODE_H + GAP_Y),
        color:         persp.color,
        bg:            persp.bg,
        border:        persp.border,
        perspLabel:    persp.label,
        perspIcon:     persp.icon,
      });
    });
  });
  return nodes;
};

// ── SVG CANVAS DIMENSIONS ─────────────────────────────────────
const getCanvasSize = (nodes) => {
  if (!nodes.length) return { w:800, h:600 };
  const maxX = Math.max(...nodes.map(n => n.x + NODE_W)) + PAD_X;
  const maxY = Math.max(...nodes.map(n => n.y + NODE_H)) + PAD_Y;
  return { w: Math.max(maxX, 800), h: Math.max(maxY, 500) };
};

// ── EDGE (connection line) ────────────────────────────────────
const Edge = memo(({ from, to, nodes, selected }) => {
  const src = nodes.find(n => n.id === from);
  const dst = nodes.find(n => n.id === to);
  if (!src || !dst) return null;

  const x1 = src.x + NODE_W / 2;
  const y1 = src.y + NODE_H;
  const x2 = dst.x + NODE_W / 2;
  const y2 = dst.y;
  const cy1 = y1 + (y2 - y1) * 0.5;
  const cy2 = y2 - (y2 - y1) * 0.4;

  const isHighlighted = selected === from || selected === to;

  return (
    <g>
      <defs>
        <marker id={`arrow-${from}-${to}`} markerWidth="8" markerHeight="8"
          refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z"
            fill={isHighlighted ? src.color : "#b0bec5"}
            opacity={isHighlighted ? 1 : 0.6}/>
        </marker>
      </defs>
      <path
        d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
        fill="none"
        stroke={isHighlighted ? src.color : "#b0bec5"}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeDasharray={isHighlighted ? "none" : "5 3"}
        opacity={isHighlighted ? 1 : 0.5}
        markerEnd={`url(#arrow-${from}-${to})`}
        style={{ transition:"all .2s" }}
      />
    </g>
  );
});

// ── NODE ──────────────────────────────────────────────────────
const Node = memo(({ node, selected, onSelect }) => {
  const isSelected = selected === node.id;
  const tl         = color.trafficLight(node.progress, 100);
  const pct        = node.progress;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      style={{ cursor:"pointer" }}
      onClick={() => onSelect(node.id === selected ? null : node.id)}
    >
      {/* Shadow */}
      {isSelected && (
        <rect x={-3} y={-3} width={NODE_W+6} height={NODE_H+6}
          rx={13} fill={node.color} opacity={0.2}/>
      )}

      {/* Card background */}
      <rect x={0} y={0} width={NODE_W} height={NODE_H}
        rx={10}
        fill={isSelected ? node.bg : "#fff"}
        stroke={isSelected ? node.color : node.border}
        strokeWidth={isSelected ? 2.5 : 1.5}
        style={{ filter: isSelected
          ? `drop-shadow(0 4px 12px ${node.color}40)`
          : "drop-shadow(0 2px 6px rgba(0,0,0,.07))",
          transition:"all .2s",
        }}
      />

      {/* Left accent bar */}
      <rect x={0} y={0} width={5} height={NODE_H} rx={10}
        fill={node.color} opacity={0.7}/>
      <rect x={0} y={10} width={5} height={NODE_H-20}
        fill={node.color}/>

      {/* Code badge */}
      <rect x={12} y={8} width={36} height={15} rx={7}
        fill={`${node.color}20`}/>
      <text x={30} y={19} textAnchor="middle"
        fontSize={8.5} fontWeight={800} fill={node.color}>
        {node.code}
      </text>

      {/* Traffic light dot */}
      <circle cx={NODE_W - 12} cy={12} r={5}
        fill={tl.color}
        style={{ filter:`drop-shadow(0 0 3px ${tl.color}80)` }}/>

      {/* Label */}
      <foreignObject x={12} y={26} width={NODE_W - 24} height={34}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          fontSize:     10.5,
          fontWeight:   700,
          color:        T.navy,
          lineHeight:   1.35,
          overflow:     "hidden",
          display:      "-webkit-box",
          WebkitLineClamp:2,
          WebkitBoxOrient:"vertical",
          fontFamily:   "DM Sans, system-ui, sans-serif",
        }}>
          {node.label}
        </div>
      </foreignObject>

      {/* Progress bar */}
      <rect x={12} y={NODE_H - 12} width={NODE_W - 24} height={5}
        rx={3} fill="#e6ecf5"/>
      <rect x={12} y={NODE_H - 12}
        width={(NODE_W - 24) * pct / 100} height={5}
        rx={3} fill={tl.color}
        style={{ transition:"width .4s ease" }}/>
      <text x={NODE_W - 14} y={NODE_H - 8}
        textAnchor="end" fontSize={8} fontWeight={800} fill={tl.color}>
        {pct}%
      </text>
    </g>
  );
});

// ── PERSPECTIVE LANE ──────────────────────────────────────────
const PerspectiveLane = memo(({ perspective, objectives, canvasW, yPos }) => {
  const count = objectives.filter(o => o.perspectiveId === perspective.id).length;

  return (
    <g>
      {/* Lane background */}
      <rect
        x={0} y={yPos - PAD_Y / 2}
        width={canvasW}
        height={NODE_H + GAP_Y}
        fill={perspective.bg}
        opacity={0.35}
      />
      {/* Left label */}
      <rect x={0} y={yPos - PAD_Y / 2}
        width={6} height={NODE_H + GAP_Y}
        fill={perspective.color} opacity={0.7}/>

      <text
        x={canvasW - 12}
        y={yPos + NODE_H / 2 + 5}
        textAnchor="end"
        fontSize={10}
        fontWeight={800}
        fill={perspective.color}
        opacity={0.7}
        letterSpacing="0.05em"
      >
        {perspective.icon} {perspective.label.toUpperCase()}
      </text>
    </g>
  );
});

// ── NODE DETAIL PANEL ─────────────────────────────────────────
const NodePanel = memo(({ nodeId, nodes, objectives, okrs, onClose }) => {
  const node = nodes.find(n => n.id === nodeId);
  const obj  = objectives.find(o => o.id === nodeId);
  if (!node || !obj) return null;

  const relOKRs = okrs.filter(o => o.objectiveId === nodeId);
  const tl      = color.trafficLight(node.progress, 100);

  return (
    <div style={{
      position:     "absolute",
      top:          16,
      right:        16,
      width:        270,
      background:   T.white,
      borderRadius: 14,
      border:       `2px solid ${node.color}`,
      boxShadow:    `0 8px 32px ${node.color}30`,
      zIndex:       10,
      animation:    "scaleIn .18s ease",
      overflow:     "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:    "12px 14px",
        background: node.bg,
        borderBottom:`1px solid ${node.border}`,
        display:    "flex",
        justifyContent:"space-between",
        alignItems: "center",
      }}>
        <div>
          <span style={{ fontSize:9, fontWeight:800, color:node.color,
            letterSpacing:".08em" }}>
            {node.perspIcon} {node.perspLabel.toUpperCase()} · {node.code}
          </span>
          <div style={{ fontSize:12.5, fontWeight:800, color:T.navy,
            lineHeight:1.3, marginTop:3 }}>
            {node.label}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tM, fontSize:18, lineHeight:1, padding:"2px 5px" }}>×</button>
      </div>

      {/* Progress */}
      <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.bdr}` }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:T.tM }}>Progreso</span>
          <span style={{ fontSize:16, fontWeight:900, color:tl.color,
            fontFamily:"var(--font-display)" }}>
            {node.progress}%
          </span>
        </div>
        <div style={{ height:8, background:"#e6ecf5", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${node.progress}%`,
            background:tl.color, borderRadius:99,
            transition:"width .5s ease",
          }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
          <span style={{ fontSize:9.5, color:T.tL }}>📅 {obj.period}</span>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:7, height:7, borderRadius:"50%",
              background:tl.color }}/>
            <span style={{ fontSize:9.5, color:tl.color, fontWeight:700 }}>
              {obj.status === "on_track" ? "En curso" :
               obj.status === "at_risk"  ? "En riesgo" :
               obj.status === "completed"? "Completado" : "Sin iniciar"}
            </span>
          </div>
        </div>
      </div>

      {/* OKRs */}
      {relOKRs.length > 0 && (
        <div style={{ padding:"10px 14px" }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:7 }}>
            OKRs VINCULADOS ({relOKRs.length})
          </div>
          {relOKRs.map(okr => (
            <div key={okr.id} style={{ marginBottom:7 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:T.navy,
                marginBottom:3, lineHeight:1.3 }}>
                {okr.code}: {okr.objective.substring(0, 50)}
                {okr.objective.length > 50 ? "…" : ""}
              </div>
              <div style={{ height:5, background:"#e6ecf5", borderRadius:99,
                overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${okr.progress}%`,
                  background:color.progressBar(okr.progress), borderRadius:99 }}/>
              </div>
              <div style={{ fontSize:9.5, color:T.tL, marginTop:2,
                textAlign:"right" }}>
                {okr.progress}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ── MAP CONTROLS ──────────────────────────────────────────────
const MapControls = memo(({ zoom, onZoom, onReset, showEdges, onToggleEdges }) => (
  <div style={{
    position:  "absolute",
    bottom:    16,
    left:      16,
    display:   "flex",
    gap:       6,
    zIndex:    10,
    flexWrap:  "wrap",
  }}>
    <button onClick={() => onZoom(0.1)}
      style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.bdr}`,
        background:T.white, cursor:"pointer", fontSize:16, fontWeight:700,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      +
    </button>
    <button onClick={() => onZoom(-0.1)}
      style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.bdr}`,
        background:T.white, cursor:"pointer", fontSize:16, fontWeight:700,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      −
    </button>
    <button onClick={onReset}
      style={{ padding:"0 10px", height:32, borderRadius:8, border:`1px solid ${T.bdr}`,
        background:T.white, cursor:"pointer", fontSize:11, fontWeight:700,
        color:T.tM, boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      ↺ Reset
    </button>
    <button onClick={onToggleEdges}
      style={{ padding:"0 10px", height:32, borderRadius:8,
        border:`1px solid ${showEdges ? T.teal : T.bdr}`,
        background: showEdges ? `${T.teal}15` : T.white,
        cursor:"pointer", fontSize:11, fontWeight:700,
        color: showEdges ? T.teal : T.tM,
        boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      {showEdges ? "🔗 Conexiones ON" : "🔗 Conexiones OFF"}
    </button>
    <div style={{ padding:"0 10px", height:32, borderRadius:8,
      border:`1px solid ${T.bdr}`, background:T.white,
      display:"flex", alignItems:"center",
      fontSize:11, fontWeight:700, color:T.tM,
      boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      🔍 {Math.round(zoom * 100)}%
    </div>
  </div>
));

// ── LEGEND ────────────────────────────────────────────────────
const MapLegend = memo(({ perspectives }) => (
  <div style={{
    position:   "absolute",
    top:        16,
    left:       16,
    background: "rgba(255,255,255,.92)",
    borderRadius:10,
    border:     `1px solid ${T.bdr}`,
    padding:    "10px 14px",
    zIndex:     10,
    backdropFilter:"blur(8px)",
  }}>
    <div style={{ fontSize:9.5, fontWeight:800, color:T.tL,
      letterSpacing:".08em", marginBottom:7 }}>
      PERSPECTIVAS
    </div>
    {perspectives.map(p => (
      <div key={p.id} style={{ display:"flex", alignItems:"center",
        gap:7, marginBottom:5 }}>
        <div style={{ width:10, height:10, borderRadius:3,
          background:p.color }}/>
        <span style={{ fontSize:10.5, fontWeight:700, color:p.color }}>
          {p.icon} {p.label}
        </span>
      </div>
    ))}
    <div style={{ borderTop:`1px solid ${T.bdr}`, paddingTop:7, marginTop:5 }}>
      <div style={{ fontSize:9.5, fontWeight:800, color:T.tL,
        letterSpacing:".08em", marginBottom:5 }}>SEMÁFORO</div>
      {[
        { c:T.green,  l:"En Meta"   },
        { c:"#d97706",l:"En Riesgo" },
        { c:T.red,    l:"Crítico"   },
      ].map(s => (
        <div key={s.l} style={{ display:"flex", alignItems:"center",
          gap:6, marginBottom:3 }}>
          <div style={{ width:8, height:8, borderRadius:"50%",
            background:s.c, boxShadow:`0 0 4px ${s.c}60` }}/>
          <span style={{ fontSize:10, color:T.tM }}>{s.l}</span>
        </div>
      ))}
    </div>
  </div>
));

// ── SVG MAP ───────────────────────────────────────────────────
const SVGMap = memo(({
  nodes, edges, perspectives, objectives, okrs,
  zoom, pan, selected, onSelect,
  showEdges, isDragging, onMouseDown, onMouseMove, onMouseUp,
}) => {
  const { w, h } = getCanvasSize(nodes);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden" }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`${-pan.x/zoom} ${-pan.y/zoom} ${w/zoom} ${h/zoom}`}
        style={{
          cursor:    isDragging ? "grabbing" : "grab",
          background:"#f8fafc",
          userSelect:"none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Perspective lanes */}
        {perspectives.map((p, pi) => (
          <PerspectiveLane
            key={p.id}
            perspective={p}
            objectives={objectives}
            canvasW={w}
            yPos={PAD_Y + pi * (NODE_H + GAP_Y)}
          />
        ))}

        {/* Grid dots */}
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#dde3ec" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#dots)" opacity="0.5"/>

        {/* Edges */}
        {showEdges && edges.map((e, i) => (
          <Edge
            key={i}
            from={e.from}
            to={e.to}
            nodes={nodes}
            selected={selected}
          />
        ))}

        {/* Nodes */}
        {nodes.map(node => (
          <Node
            key={node.id}
            node={node}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </svg>

      {/* Node detail panel */}
      {selected && (
        <NodePanel
          nodeId={selected}
          nodes={nodes}
          objectives={objectives}
          okrs={okrs}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  );
});

// ── STATS ROW ─────────────────────────────────────────────────
const StrategyStats = memo(({ objectives, perspectives }) => {
  const total   = objectives.length;
  const avgProg = calc.avgProgress(objectives);
  const onTrack = objectives.filter(o => o.status === "on_track").length;
  const completed = objectives.filter(o => o.status === "completed").length;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Objetivos"   value={total}    sub="En el mapa"        icon="🗺️" color={T.navy}/>
      <StatCard label="En Curso"    value={onTrack}  sub="Ejecutándose"      icon="✅" color={T.green}/>
      <StatCard label="Completados" value={completed} sub="Logrados"         icon="🏆" color={T.blue}/>
      <StatCard label="Avance BSC"  value={`${avgProg}%`} sub="Promedio global" icon="📊"
        color={color.progressBar(avgProg)}/>
    </div>
  );
});

// ── MAIN STRATEGY MAP ─────────────────────────────────────────
const StrategyMap = memo(({ onNavigate }) => {
  const { strategicObjectives, perspectives, okrs,
          strategyMapEdges } = useApp();

  const [zoom,       setZoom]       = useState(1);
  const [pan,        setPan]        = useState({ x:0, y:0 });
  const [dragging,   setDragging]   = useState(false);
  const [dragStart,  setDragStart]  = useState({ x:0, y:0 });
  const [selected,   setSelected]   = useState(null);
  const [showEdges,  setShowEdges]  = useState(true);
  const [tab,        setTab]        = useState("map");
  const containerRef = useRef();

  // Build layout
  const nodes = useMemo(() =>
    buildLayout(strategicObjectives, perspectives),
  [strategicObjectives, perspectives]);

  // Default edges from mockData or build cause-effect
  const edges = useMemo(() => {
    if (strategyMapEdges?.length) return strategyMapEdges;
    // Auto-build: connect each obj to the one in the perspective above
    const result = [];
    perspectives.forEach((p, pi) => {
      if (pi === 0) return;
      const above = perspectives[pi - 1];
      const fromObjs = strategicObjectives.filter(o => o.perspectiveId === p.id);
      const toObjs   = strategicObjectives.filter(o => o.perspectiveId === above.id);
      fromObjs.forEach((fo, fi) => {
        const target = toObjs[fi % toObjs.length];
        if (target) result.push({ from:fo.id, to:target.id });
      });
    });
    return result;
  }, [strategyMapEdges, perspectives, strategicObjectives]);

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === "svg" || e.target.tagName === "rect") {
      setDragging(true);
      setDragStart({ x:e.clientX - pan.x, y:e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setPan({ x:e.clientX - dragStart.x, y:e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleZoom = useCallback((delta) => {
    setZoom(z => Math.min(2, Math.max(0.4, z + delta)));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1); setPan({ x:0, y:0 }); setSelected(null);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? 0.08 : -0.08);
    };
    el.addEventListener("wheel", handler, { passive:false });
    return () => el.removeEventListener("wheel", handler);
  }, [handleZoom]);

  const TABS = [
    { id:"map",      label:"🗺️ Mapa Interactivo" },
    { id:"list",     label:"📋 Lista de Objetivos" },
    { id:"matrix",   label:"🔗 Matriz Causa-Efecto" },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🔗 Mapa Estratégico"
        subtitle="Relaciones causa-efecto entre perspectivas BSC"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("bsc")}>
              🗺️ Ver BSC
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("hoshin")}>
              🔷 Ver Hoshin
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <StrategyStats objectives={strategicObjectives} perspectives={perspectives}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── MAP TAB ── */}
      {tab === "map" && (
        <Card sx={{ height:560, position:"relative", overflow:"hidden", padding:0 }}>
          <div ref={containerRef} style={{ width:"100%", height:"100%" }}>
            <SVGMap
              nodes={nodes}
              edges={edges}
              perspectives={perspectives}
              objectives={strategicObjectives}
              okrs={okrs}
              zoom={zoom}
              pan={pan}
              selected={selected}
              onSelect={setSelected}
              showEdges={showEdges}
              isDragging={dragging}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
            <MapLegend perspectives={perspectives}/>
            <MapControls
              zoom={zoom}
              onZoom={handleZoom}
              onReset={handleReset}
              showEdges={showEdges}
              onToggleEdges={() => setShowEdges(p => !p)}
            />
          </div>
        </Card>
      )}

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {perspectives.map(persp => {
            const objs = strategicObjectives.filter(o => o.perspectiveId === persp.id);
            if (!objs.length) return null;
            return (
              <div key={persp.id}>
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  marginBottom:10, paddingBottom:8,
                  borderBottom:`2px solid ${persp.border}` }}>
                  <span style={{ fontSize:18 }}>{persp.icon}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:persp.color,
                    fontFamily:"var(--font-display)" }}>
                    {persp.label}
                  </span>
                  <span style={{ fontSize:11, color:T.tL }}>
                    {objs.length} objetivos · {calc.avgProgress(objs)}% promedio
                  </span>
                </div>
                <div style={{ display:"grid",
                  gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                  gap:10 }}>
                  {objs.map(obj => {
                    const tl    = color.trafficLight(obj.progress, 100);
                    const relOKRs = okrs.filter(o => o.objectiveId === obj.id);
                    return (
                      <div key={obj.id} style={{
                        padding:    "13px 14px",
                        background: persp.bg,
                        border:     `1.5px solid ${persp.border}`,
                        borderRadius:10,
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:8 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <span style={{ fontSize:9.5, fontWeight:800,
                              padding:"2px 8px", borderRadius:20,
                              background:`${persp.color}20`, color:persp.color,
                              display:"inline-block", marginBottom:5 }}>
                              {obj.code}
                            </span>
                            <div style={{ fontSize:12, fontWeight:700,
                              color:T.navy, lineHeight:1.35 }}>
                              {obj.title}
                            </div>
                          </div>
                          <div style={{ width:10, height:10, borderRadius:"50%",
                            background:tl.color, flexShrink:0, marginLeft:8, marginTop:2,
                            boxShadow:`0 0 5px ${tl.color}60` }}/>
                        </div>
                        <div style={{ height:6, background:"#e6ecf5",
                          borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                          <div style={{ height:"100%", width:`${obj.progress}%`,
                            background:tl.color, borderRadius:99 }}/>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center" }}>
                          <span style={{ fontSize:10, color:T.tL }}>
                            {relOKRs.length} OKRs vinculados
                          </span>
                          <span style={{ fontSize:11, fontWeight:800, color:tl.color }}>
                            {obj.progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MATRIX TAB ── */}
      {tab === "matrix" && (
        <Card>
          <div style={{ overflowX:"auto" }}>
            <table className="sp-table" style={{ minWidth:700 }}>
              <thead>
                <tr>
                  <th>Origen</th>
                  <th>Perspectiva</th>
                  <th>Contribuye a →</th>
                  <th>Perspectiva Destino</th>
                  <th>Tipo Relación</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((edge, i) => {
                  const srcObj  = strategicObjectives.find(o => o.id === edge.from);
                  const dstObj  = strategicObjectives.find(o => o.id === edge.to);
                  const srcPersp = perspectives.find(p => p.id === srcObj?.perspectiveId);
                  const dstPersp = perspectives.find(p => p.id === dstObj?.perspectiveId);
                  if (!srcObj || !dstObj) return null;
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                          {srcObj.code}: {srcObj.title.substring(0,35)}…
                        </div>
                        <div style={{ height:4, width:80, background:"#e6ecf5",
                          borderRadius:99, overflow:"hidden", marginTop:4 }}>
                          <div style={{ height:"100%", width:`${srcObj.progress}%`,
                            background:color.progressBar(srcObj.progress), borderRadius:99 }}/>
                        </div>
                      </td>
                      <td>
                        {srcPersp && (
                          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20,
                            background:srcPersp.bg, color:srcPersp.color, fontWeight:700 }}>
                            {srcPersp.icon} {srcPersp.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                          {dstObj.code}: {dstObj.title.substring(0,35)}…
                        </div>
                      </td>
                      <td>
                        {dstPersp && (
                          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20,
                            background:dstPersp.bg, color:dstPersp.color, fontWeight:700 }}>
                            {dstPersp.icon} {dstPersp.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20,
                          background:`${T.teal}15`, color:T.teal, fontWeight:700 }}>
                          🔗 Causa-Efecto
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tips */}
      <div style={{ marginTop:12, padding:"10px 14px", background:`${T.teal}08`,
        borderRadius:9, border:`1px solid ${T.teal}25`,
        display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
          <strong>Mapa Estratégico:</strong> Arrastra el canvas para navegar ·
          Usa la rueda del mouse o los botones +/− para hacer zoom ·
          Haz clic en un nodo para ver sus detalles y OKRs vinculados ·
          Activa/desactiva las conexiones con el botón 🔗
        </div>
      </div>
    </div>
  );
});

export default StrategyMap;
```

---

✅ **StrategyMap.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    ├── KPI.jsx
    ├── Bowling.jsx
    └── StrategyMap.jsx    ← nueva
