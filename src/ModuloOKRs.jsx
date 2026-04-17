import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useStore } from './store.js';
import { okrService, notificationService } from './services.js';
import { shallow } from 'zustand/shallow';
import * as XLSX from 'xlsx';
import OKRGenerator from './OKRGenerator.jsx';
import { AddBtn, TabBar, EmptyState, STATUS_COLORS, STATUS_LABELS } from './SharedUI.jsx';

export default function ModuloOKRs({onModal,onEdit, onDelete}){
  // Using a single selector with `shallow` comparison is more performant
  // than multiple individual selectors for object/array slices. But creating a new object
  // in the selector can cause infinite loops. Using atomic selectors is safer.
  const okrs = useStore(state => state.okrs);
  const objectives = useStore(state => state.objectives);
  const perspectives = useStore(state => state.perspectives);
  const profile = useStore.use.profile();
  const can = useStore.use.can();
  const [tab,setTab]=useState("list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ objective: '', description: '', owner: '', dueDate: '', progress: 0, status: 'active' });
  const [creating, setCreating] = useState(false);

  const handleCreateOKR = async (e) => {
    e.preventDefault();
    if (!createForm.objective.trim()) return notificationService.error('El objetivo es requerido.');
    setCreating(true);
    try {
      const { data, error } = await (await import('./supabase.js')).supabase
        .from('okrs')
        .insert({
          objective: createForm.objective,
          title: createForm.objective,       // compatibilidad con filas que usan title
          description: createForm.description,
          owner: createForm.owner,
          due_date: createForm.dueDate || null,
          progress: parseInt(createForm.progress) || 0,
          status: createForm.status,
          organization_id: profile?.organization_id,
        })
        .select()
        .single();
      if (error) throw error;
      notificationService.success('✅ OKR creado correctamente.');
      setShowCreateModal(false);
      setCreateForm({ objective: '', description: '', owner: '', dueDate: '', progress: 0, status: 'active' });
      // Recargar OKRs en el store
      const { okrService } = await import('./services.js');
      const newOKRs = await okrService.getAll(profile?.organization_id);
      useStore.getState().setOKRs(newOKRs || []);
    } catch (err) { notificationService.error('Error: ' + err.message); }
    finally { setCreating(false); }
  };

  const [filterDept, setFilterDept] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterPersp, setFilterPersp] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const matrixTableRef = useRef(null);
  const [collapsedObjs, setCollapsedObjs] = useState({});
  const [collapsedDepts, setCollapsedDepts] = useState({});
  const [editingDept, setEditingDept] = useState(null);

  const toggleDept = useCallback((dept) => {
    setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  }, []);

  const renameDept = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) { setEditingDept(null); return; }
    const itemsToUpdate = (okrs || []).filter(o => (o.department || "🏢 Generales / Sin Área") === oldName);
    try {
      await Promise.all(itemsToUpdate.map(o => okrService.update(o.id, { department: newName })));
    } catch(e) { notificationService.error("Error al renombrar: " + e.message); }
    setEditingDept(null);
  };

  const toggleObj = useCallback((id) => {
    setCollapsedObjs(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  async function handleToggleKR(okr, idx) {
    const newKrs = [...(okr.krs || [])];
    const currentKr = newKrs[idx];

    // Toggle completion status, converting string to object if needed
    if (typeof currentKr === 'string') {
      newKrs[idx] = { title: currentKr, completed: true };
    } else {
      newKrs[idx] = { ...currentKr, completed: !currentKr.completed };
    }

    // Recalculate progress based on KRs
    const completedCount = newKrs.reduce((count, kr) => count + (kr?.completed ? 1 : 0), 0);
    const newProgress = newKrs.length > 0 ? Math.round((completedCount / newKrs.length) * 100) : 0;
    
    // Determine new status based on progress
    let newStatus = okr.status;
    if (newProgress === 100) newStatus = "completed";
    else if (okr.status === "completed" && newProgress < 100) newStatus = "on_track";

    try {
      await okrService.update(okr.id, { krs: newKrs, progress: newProgress, status: newStatus });
    } catch(e) { notificationService.error("Error al actualizar KR: " + e.message); }
  }

  var months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var criteria = ["Rendimiento ideal", "Rendimiento bueno", "Rendimiento regular", "Bajo rendimiento"];
  var criteriaColors = ["var(--green)", "var(--teal)", "var(--gold)", "var(--red)"];
  var criteriaIcons = ["🟢", "🔵", "🟡", "🔴"];

  const exportToExcel = () => {
    const aoa = []; const merges = [];
    const r0 = ["Objetivos Estratégicos / Criterios de Éxito"];
    for(let i=0; i<4; i++) {
      r0.push(`TRIMESTRE ${i+1}`);
      for(let j=0; j<11; j++) r0.push("");
      merges.push({ s: { r: 0, c: 1 + i*12 }, e: { r: 0, c: 1 + i*12 + 11 } });
    }
    aoa.push(r0);
    const r1 = [""];
    months.forEach((m, idx) => {
      r1.push(m, "", "", "");
      const startCol = 1 + idx*4;
      merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: startCol + 3 } });
    });
    aoa.push(r1);
    const r2 = [""];
    for(let i=0; i<48; i++) r2.push(`S${(i%4)+1}`);
    aoa.push(r2);
    let currentRow = 3;

    if (!objectives || objectives.length === 0) {
      aoa.push(["No hay Objetivos Estratégicos para generar la matriz."]);
    } else {
      objectives.forEach(obj => {
        const objOkrs = (okrs||[]).filter(o => o.objective_id === obj.id);
        if(objOkrs.length === 0) return;
        const objProgress = Math.round(objOkrs.reduce((acc, o) => acc + (o.progress || 0), 0) / objOkrs.length) || 0;
        aoa.push([`🎯 ${obj.code || '?'} - ${obj.name} (Score Global: ${objProgress}%)`]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 48 } });
        currentRow++;
        objOkrs.forEach((okr, oIdx) => {
          aoa.push([`   ${oIdx + 1}. ${okr.objective}  |  Avance: ${okr.progress}%  |  Dueño: ${okr.owner || 'N/A'}  |  Confianza: ${okr.confidence_level||8}/10`]);
          merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 48 } });
          currentRow++;
          criteria.forEach((crit, cIdx) => {
            const rowData = [`      ${crit}`];
            for(let i=0; i<48; i++) {
              let isFilled = false;
              if (okr.progress > 0) {
                const weekThreshold = Math.round((okr.progress / 100) * 48);
                if (i < weekThreshold && cIdx === (okr.progress >= 80 ? 0 : okr.progress >= 50 ? 1 : okr.progress >= 25 ? 2 : 3)) isFilled = true;
              }
              rowData.push(isFilled ? "██" : "");
            }
            aoa.push(rowData);
            currentRow++;
          });
        });
      });
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 85 }, ...Array(48).fill({ wch: 4 })]; 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz Anual");
    XLSX.writeFile(wb, "Matriz_Anual_OKRs.xlsx");
  };

  var currentMonth = new Date().getMonth();
  var currentWeek = currentMonth * 4 + Math.min(3, Math.floor(new Date().getDate() / 7));

  const depts = useMemo(() => [...new Set((okrs||[]).map(function(o){ return o.department || "🏢 Generales / Sin Área"; }))].sort(), [okrs]);
  const owners = useMemo(() => [...new Set((okrs||[]).map(function(o){ return o.owner || "Sin asignar"; }))].sort(), [okrs]);
  const { usedPerspIds, hasUnlinked, perspectivesList } = useMemo(() => {
    const used = new Set();
    let unlinked = false;
    (okrs||[]).forEach(function(okr){
      var parentObj = (objectives || []).find(function(o){ return o.id === okr.objective_id; });
      if(parentObj && parentObj.perspective_id) used.add(parentObj.perspective_id);
      else unlinked = true;
    });
    const pList = (perspectives || [{id: 1, name: "Financiera"}, {id: 2, name: "Clientes"}, {id: 3, name: "Procesos Internos"}, {id: 4, name: "Aprendizaje y Crecimiento"}]).filter(function(p){ return used.has(p.id); });
    return { usedPerspIds: used, hasUnlinked: unlinked, perspectivesList: pList };
  }, [okrs, objectives, perspectives]);

  const filteredOkrs = useMemo(() => {
    return (okrs || []).filter(function (okr) {
      const matchDept = !filterDept || (okr.department || "🏢 Generales / Sin Área") === filterDept;
      const matchOwner = !filterOwner || (okr.owner || "Sin asignar") === filterOwner;
      const parentObj = (objectives || []).find(o => String(o.id) === String(okr.objective_id));
      const perspId = parentObj ? parentObj.perspective_id : null;
      const matchPersp = !filterPersp || (filterPersp === "none" ? perspId === null : String(perspId) === String(filterPersp));
      const matchSearch = !searchQuery || (okr.objective || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchOwner && matchPersp && matchSearch;
    });
  }, [okrs, objectives, filterDept, filterOwner, filterPersp, searchQuery]);

  return(
    <div>
      <style>{`
        @keyframes matrix-shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .matrix-bar-anim {
          background-size: 200% auto !important;
          animation: matrix-shimmer 3s linear infinite;
        }
      `}</style>
      <div className="page-header"><div><div className="page-title">🎯 OKRs</div><div className="page-subtitle">{(okrs||[]).length} objetivos registrados</div></div></div>
      <TabBar tabs={[{id:"list",icon:"🎯",label:"Lista OKRs"},{id:"matrix",icon:"📅",label:"Matriz Anual (52 Semanas)"},{id:"gen",icon:"✨",label:"Generar con IA"}]} active={tab} onChange={setTab} rightContent={tab==="list" ? (can('create', 'okrs') ? <AddBtn onClick={function(){onModal("okr");}} label="Nuevo OKR"/> : null) : tab==="matrix" ? <div style={{display:"flex", alignItems:"center", gap: 16}}><span style={{fontSize:11, color:"var(--green)", fontWeight:600, display:"flex", alignItems:"center", gap:6}}><span style={{display:"inline-block", width:6, height:6, borderRadius:"50%", background:"var(--green)", animation:"pulse 2s infinite"}}/> Sincronizado</span><button className="sp-btn" onClick={exportToExcel} style={{background:"var(--green)",color:"#fff",border:"none"}}>📥 Excel</button></div> : null}/>
      <div className="fade-up">
        {tab==="list"&&((okrs||[]).length===0?
          <EmptyState icon="🎯" title="Sin OKRs registrados" desc="Crea tus primeros objetivos estrategicos" action={can('create', 'okrs') ? <AddBtn onClick={function(){onModal("okr");}} label="Crear OKR"/> : null}/>:
          <div>
            <div style={{display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", background:"var(--bg2)", padding:16, borderRadius:12, border:"1px solid var(--border)"}}>
              <div style={{flex:1, minWidth:200}}><label className="sp-label">Buscar OKR</label><div style={{position: "relative"}}><span style={{position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text3)"}}>🔍</span><input className="sp-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nombre..." style={{paddingLeft: 36}} /></div></div>
              <div style={{flex:1, minWidth:150}}><label className="sp-label">Filtrar por Área / Dirección</label><select className="sp-input" value={filterDept} onChange={function(e){setFilterDept(e.target.value);}}><option value="">Todas las áreas</option>{depts.map(function(d){ return <option key={d} value={d}>{d}</option>; })}</select></div>
              <div style={{flex:1, minWidth:150}}><label className="sp-label">Filtrar por Responsable</label><select className="sp-input" value={filterOwner} onChange={function(e){setFilterOwner(e.target.value);}}><option value="">Todos los responsables</option>{owners.map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select></div>
              <div style={{flex:1, minWidth:150}}><label className="sp-label">Filtrar por Perspectiva</label><select className="sp-input" value={filterPersp} onChange={function(e){setFilterPersp(e.target.value);}}><option value="">Todas las perspectivas</option>{perspectivesList.map(function(p){ return <option key={p.id} value={p.id}>{p.name}</option>; })}{hasUnlinked && <option value="none">Independientes (Sin mapa)</option>}</select></div>
              {(filterDept !== "" || filterOwner !== "" || filterPersp !== "" || searchQuery !== "") && (
                <div style={{display:"flex", alignItems:"flex-end"}}><button className="sp-btn" onClick={function(){setFilterDept("");setFilterOwner("");setFilterPersp("");setSearchQuery("");}} style={{background:"var(--bg3)", color:"var(--text2)", border:"1px solid var(--border)", height: 38}}>Limpiar Filtros</button></div>
              )}
            </div>
            {filteredOkrs.length === 0 ? (
              <div style={{textAlign:"center", padding:40, color:"var(--text3)", background:"var(--bg2)", borderRadius:12, border:"1px dashed var(--border)"}}>No se encontraron resultados para los filtros seleccionados.</div>
            ) : (
            <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {Object.entries(filteredOkrs.reduce(function(acc,okr){
              var dept=okr.department||"🏢 Generales / Sin Área";
              if(!acc[dept])acc[dept]=[]; acc[dept].push(okr); return acc;
            },{})).map(function([dept,okrs]){
              return(
                <div key={dept} style={{marginBottom: 8}}>
                  <div onClick={(e) => { if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') toggleDept(dept); }} className="sp-card-hover" style={{padding: "16px 24px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsedDepts[dept] ? 0 : 16}}>
                    <div style={{display: "flex", alignItems: "center", gap: 12}}>
                      <span style={{fontSize: 22}}>📁</span> 
                      {editingDept === dept ? (
                        <input autoFocus defaultValue={dept === "🏢 Generales / Sin Área" ? "" : dept} onBlur={e => renameDept(dept, e.target.value)} onKeyDown={e => { if(e.key === 'Enter') e.target.blur(); if(e.key === 'Escape') setEditingDept(null); }} onClick={e => e.stopPropagation()} className="sp-input" style={{ width: 250, padding: '6px 12px', fontSize: 15, fontWeight: 800, margin: 0 }} />
                      ) : (
                        <h4 style={{fontSize:16, fontWeight: 800, color:"var(--text)",margin:0,display:"flex",alignItems:"center",gap:8, letterSpacing: '-0.3px'}}>
                          {dept} <button onClick={(e) => { e.stopPropagation(); setEditingDept(dept); }} className="icon-btn" style={{width: 24, height: 24, fontSize: 12, border: 'none', background: 'transparent', opacity: 0.5}} title="Renombrar Carpeta">✏️</button>
                        </h4>
                      )}
                      <span style={{fontSize:12,color:"var(--text2)",fontWeight:700, background: "var(--bg3)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 99}}>{okrs.length} OKRs</span>
                    </div>
                    <span style={{transform: collapsedDepts[dept] ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)", fontSize: 14, color: "var(--text3)", fontWeight: 800}}>▼</span>
                  </div>
                  {!collapsedDepts[dept] && (
                  <div className="scale-in" style={{display:"flex",flexDirection:"column",gap:12,paddingLeft:28,borderLeft:"2px dashed var(--border)", marginLeft: 28, marginBottom: 32}}>
                    {okrs.map(function(okr){
                      var pct=okr.progress||0;var sc=STATUS_COLORS[okr.status]||"var(--text3)";
                      var parentObj = (objectives || []).find(o => String(o.id) === String(okr.objective_id));
                      var progColor = pct <= 30 ? "var(--red)" : pct <= 70 ? "var(--gold)" : "var(--green)";
                      const hasKrs = okr.krs && okr.krs.length > 0;
                      return(
                        <div key={okr.id} className="sp-card sp-card-hover scale-in" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                          <div style={{position:'absolute', top:0, left:0, width:'100%', height:3, background:progColor}}/>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                            <div style={{flex:1,marginRight:12}}>
                              <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:10,lineHeight:1.4}}>{okr.objective}</div>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                <span className="sp-badge" style={{background:(sc||"var(--text3)")+"20",color:sc}}>{STATUS_LABELS[okr.status]||okr.status}</span>
                                {okr.owner&&<span style={{fontSize:12,color:"var(--text3)"}}>👤 {okr.owner}</span>}
                                <span style={{fontSize:12,color:"var(--text3)"}}>📅 {okr.period}</span>
                                {parentObj && <span style={{fontSize:11,color:"var(--primary)",background:"var(--primary-light)",padding:"4px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",fontWeight:700}}>🔗 {parentObj.code || '?'} - {parentObj.name}</span>}
                                <span className="sp-badge" style={{background:"var(--bg3)",color:"var(--text2)",border:"1px solid var(--border)",padding:"4px 10px"}} title="Nivel de confianza en alcanzar la meta">🔋 Confianza: {okr.confidence_level||8}/10</span>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{display:"flex",alignItems:"baseline",justifyContent:"flex-end"}}>
                                  <input type="number" disabled={!can('update', 'okrs') || hasKrs} min="0" max="100" defaultValue={pct} onBlur={async function(e){var v=Number(e.target.value);if(v!==pct){var newStatus=okr.status;if(v===100)newStatus="completed";else if(okr.status==="completed"&&v<100)newStatus="on_track";try{await okrService.update(okr.id,{progress:v,status:newStatus});}catch(err){notificationService.error(err.message);}}}} onKeyDown={function(e){if(e.key==="Enter")e.target.blur();}} style={{width:54,fontSize:20,fontWeight:800,color:sc,background:"transparent",border:"none",borderBottom:"1px dashed transparent",textAlign:"right",outline:"none",padding:0,cursor:can('update', 'okrs') && !hasKrs ? "text" : "not-allowed",opacity:can('update', 'okrs') ? 1 : 0.6}} onMouseEnter={function(e){if(can('update', 'okrs') && !hasKrs) e.target.style.borderBottom="1px dashed "+sc;}} onMouseLeave={function(e){e.target.style.borderBottom="1px dashed transparent";}} title={hasKrs ? "El progreso se calcula desde los KRs" : "Editar progreso manual"}/>
                                  <span style={{fontSize:20,fontWeight:800,color:sc,lineHeight:1}}>%</span>
                                </div>
                                <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>progreso</div>
                              </div>
                              {can('update', 'okrs') && <button className="icon-btn" onClick={function(){if(onEdit)onEdit(okr);}} style={{width: 28, height: 28, fontSize: 13, background: "transparent", border: "1px solid var(--border)", color: "var(--text3)"}} title="Editar OKR">✏️</button>}
                              {can('delete', 'okrs') && <button className="delete-btn" onClick={() => onDelete(okr.id)}>🗑</button>}
                            </div>
                          </div>
                          <div className="progress-bar"><div className="progress-fill" style={{width:pct+"%",background:progColor}}/></div>
                          {okr.krs && okr.krs.length > 0 && (
                            <div style={{marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)"}}>
                              <div style={{fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5}}>Resultados Clave (KRs)</div>
                              <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                                {okr.krs.map(function(kr, idx){ 
                                  var isCompleted = typeof kr === 'object' && kr.completed;
                                  var title = typeof kr === 'object' ? kr.title : kr;
                                  var krOwner = typeof kr === 'object' && kr.owner ? kr.owner : null;
                                  var krDeadline = typeof kr === 'object' && kr.deadline ? kr.deadline : null;
                                  return (
                                    <label key={idx} style={{display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12, color: isCompleted ? "var(--text3)" : "var(--text2)", transition: "all 0.2s"}}>
                                      <input type="checkbox" disabled={!can('update', 'okrs')} checked={isCompleted} onChange={function() { handleToggleKR(okr, idx); }} style={{marginTop: 2, accentColor: "var(--primary)", cursor: can('update', 'okrs') ? "pointer" : "not-allowed"}} />
                                      <span style={{textDecoration: isCompleted ? "line-through" : "none", lineHeight: 1.4}}>{title} {krOwner && <span style={{color: "var(--primary)", fontWeight: 600, marginLeft: 6}}>👤 {krOwner}</span>} {krDeadline && <span style={{color: "var(--gold)", fontWeight: 600, marginLeft: 6}}>⏰ {krDeadline}</span>}</span>
                                    </label>
                                  ); 
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
          </div>
        )}
        {tab==="matrix"&&(
          <div className="sp-card" style={{overflowX: "auto", padding: 0, border: "1px solid var(--border)", position: "relative"}}>
            <table className="matrix-table" ref={matrixTableRef} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>
                  <th rowSpan="3" className="sticky-col" style={{ width: 380, minWidth: 380, textAlign: 'left', padding: '16px 20px', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', zIndex: 30, background: 'var(--bg3)' }}>Objetivos Estratégicos / Criterios de Éxito</th>
                  <th colSpan="12" style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)' }}>TRIMESTRE 1</th>
                  <th colSpan="12" style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)' }}>TRIMESTRE 2</th>
                  <th colSpan="12" style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)' }}>TRIMESTRE 3</th>
                  <th colSpan="12" style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)' }}>TRIMESTRE 4</th>
                </tr>
                <tr style={{ background: 'var(--bg2)', color: 'var(--text2)', fontSize: 11 }}>
                  {months.map((m, i) => <th key={i} colSpan="4" style={{ padding: '6px', borderBottom: '1px solid var(--border)', borderRight: i % 3 === 2 ? '2px solid var(--border)' : '1px solid var(--border)' }}>{m}</th>)}
                </tr>
                <tr style={{ background: 'var(--bg)', color: 'var(--text3)', fontSize: 10, fontWeight: 600 }}>
                  {Array.from({ length: 48 }).map((_, i) => <th key={i} style={{ padding: '6px 2px', borderBottom: '2px solid var(--border)', borderRight: i % 4 === 3 ? (i % 12 === 11 ? '2px solid var(--border)' : '1px solid var(--border)') : '1px dashed var(--border)', width: 26, minWidth: 26 }}>S{(i % 4) + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {(!objectives || objectives.length === 0) ? (
                  <tr><td colSpan="49" style={{ padding: 40, color: 'var(--text3)' }}>No hay Objetivos Estratégicos para generar la matriz.</td></tr>
                ) : (
                  objectives.map(obj => {
                    const objOkrs = (okrs || []).filter(o => o.objective_id === obj.id);
                    if (objOkrs.length === 0) return null;
                    const objProgress = Math.round(objOkrs.reduce((acc, o) => acc + (o.progress || 0), 0) / objOkrs.length);
                    return (
                      <React.Fragment key={`obj-${obj.id}`}>
                        <tr style={{ background: 'var(--bg2)', borderTop: '2px solid var(--primary)' }}>
                          <td className="sticky-obj" colSpan="49" style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid var(--border)', borderLeft: '4px solid var(--primary)', background: 'var(--bg2)' }}>
                            <span style={{ fontSize: 14 }}>🎯 {obj.code || '?'} - {obj.name}</span>
                            <span style={{ float: 'right', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>Score Global: {objProgress}%</span>
                          </td>
                        </tr>
                        {objOkrs.map((okr, oIdx) => (
                          <React.Fragment key={`okr-${okr.id}`}>
                            <tr style={{ background: 'var(--bg)' }}>
                              <td colSpan="49" style={{ textAlign: 'left', padding: '12px 20px 12px 36px', fontWeight: 700, color: 'var(--text2)', borderBottom: '1px dashed var(--border)', background: 'var(--bg)' }}>
                                <span style={{ color: 'var(--text)' }}>{oIdx + 1}. {okr.objective}</span>
                                <div style={{ float: 'right', display: 'flex', gap: 8 }}>
                                  <span className="sp-badge" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Avance: {okr.progress}%</span>
                                  <span className="sp-badge" style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>👤 {okr.owner || 'N/A'}</span>
                                  <span className="sp-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}>🔋 Confianza: {okr.confidence_level || 8}/10</span>
                                </div>
                              </td>
                            </tr>
                            {criteria.map((crit, cIdx) => (
                              <tr key={`crit-${okr.id}-${cIdx}`}>
                                <td className="sticky-col" style={{ textAlign: 'left', padding: '6px 20px 6px 52px', color: criteriaColors[cIdx], borderBottom: cIdx === 3 ? '1px solid var(--border)' : '1px dashed var(--border)', borderRight: '2px solid var(--border)', fontSize: 11, fontWeight: 'bold', background: 'var(--bg)' }}>{criteriaIcons[cIdx]} {crit}</td>
                                {Array.from({ length: 48 }).map((_, wIdx) => {
                                  let isFilled = false;
                                  if (okr.progress > 0) {
                                    const weekThreshold = Math.round((okr.progress / 100) * 48);
                                    if (wIdx < weekThreshold && cIdx === (okr.progress >= 80 ? 0 : okr.progress >= 50 ? 1 : okr.progress >= 25 ? 2 : 3)) isFilled = true;
                                  }
                                  return (
                                    <td key={wIdx} style={{ padding: '3px 2px', borderBottom: cIdx === 3 ? '1px solid var(--border)' : '1px dashed var(--border)', borderRight: wIdx % 4 === 3 ? (wIdx % 12 === 11 ? '2px solid var(--border)' : '1px solid var(--border)') : '1px dashed var(--border)' }}>
                                      {isFilled && <div className="matrix-bar-anim" style={{ background: `linear-gradient(90deg, ${criteriaColors[cIdx]}, ${criteriaColors[cIdx]}60 50%, ${criteriaColors[cIdx]})`, height: 12, width: '100%', borderRadius: 4, boxShadow: `0 1px 3px ${criteriaColors[cIdx]}40` }} />}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab==="gen"&&<OKRGenerator />}
      </div>
    
      {/* Modal Crear OKR */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="sp-card" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>🎯 Nuevo OKR</h3>
            <form onSubmit={handleCreateOKR} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Objetivo *</label>
                <input className="sp-input" required placeholder="Ej: Aumentar ingresos en un 30% este trimestre" value={createForm.objective} onChange={e => setCreateForm(f => ({...f, objective: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Descripción</label>
                <textarea className="sp-input" placeholder="Contexto del objetivo..." value={createForm.description} onChange={e => setCreateForm(f => ({...f, description: e.target.value}))} rows={2} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Responsable</label>
                  <input className="sp-input" placeholder="Nombre del dueño" value={createForm.owner} onChange={e => setCreateForm(f => ({...f, owner: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha Límite</label>
                  <input className="sp-input" type="date" value={createForm.dueDate} onChange={e => setCreateForm(f => ({...f, dueDate: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Avance inicial (%)</label>
                  <input className="sp-input" type="number" min="0" max="100" value={createForm.progress} onChange={e => setCreateForm(f => ({...f, progress: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Estado</label>
                  <select className="sp-input" value={createForm.status} onChange={e => setCreateForm(f => ({...f, status: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}>
                    <option value="active">En Curso</option>
                    <option value="at_risk">En Riesgo</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={creating} className="sp-btn sp-btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  {creating ? 'Guardando...' : '✅ Crear OKR'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="sp-btn" style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  );
}
