import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';
import { kpiService, notificationService } from './services.js';
import BowlingChart from './BowlingChart.jsx';
import Prediction from './Prediction.jsx';
import { AddBtn, TabBar, EmptyState } from './SharedUI.jsx';

export default function ModuloKPIs({onModal,onEdit,onCreateOkrFromKpi, onDelete}){
  const kpis = useStore(state => state.kpis);
  const profile = useStore.use.profile();
  const can = useStore.use.can();
  const [tab,setTab]=useState("list");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [collapsedDepts, setCollapsedDepts] = useState({});
  const [editingDept, setEditingDept] = useState(null);

  const toggleDept = useCallback((dept) => {
    setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  }, []);

  const renameDept = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) { setEditingDept(null); return; }
    const itemsToUpdate = (kpis || []).filter(o => (o.department || "🏢 Generales / Sin Área") === oldName);
    try {
      await Promise.all(itemsToUpdate.map(o => kpiService.update(o.id, { department: newName })));
    } catch(e) { notificationService.error("Error al renombrar: " + e.message); }
    setEditingDept(null);
  };

  const depts = useMemo(() => [...new Set((kpis||[]).map(function(o){ return o.department || "🏢 Generales / Sin Área"; }))].sort(), [kpis]);
  const owners = useMemo(() => [...new Set((kpis||[]).map(function(o){ return o.owner || "Sin asignar"; }))].sort(), [kpis]);
  
  const filteredKpis = useMemo(() => {
    return (kpis || []).filter(function(kpi) {
      const matchDept = !filterDept || (kpi.department || "🏢 Generales / Sin Área") === filterDept;
      const matchOwner = !filterOwner || (kpi.owner || "Sin asignar") === filterOwner;
      return matchDept && matchOwner;
    });
  }, [kpis, filterDept, filterOwner]);

  return(
    <div>
      <div className="page-header"><div><div className="page-title">📊 KPIs</div><div className="page-subtitle">{(kpis||[]).length} indicadores activos</div></div></div>
      <TabBar tabs={[{id:"list",icon:"📊",label:"Indicadores"},{id:"bowling",icon:"🎳",label:"Bowling KPI"},{id:"prediction",icon:"📈",label:"Prediccion"}]} active={tab} onChange={setTab} rightContent={tab==="list" && can('create', 'kpis') ? <AddBtn onClick={function(){onModal("kpi");}} label="Nuevo KPI" color="var(--teal)"/> : null}/>
      <div className="fade-up">
        {tab==="list"&&((kpis||[]).length===0?
          <EmptyState icon="📊" title="Sin KPIs registrados" desc="Agrega indicadores clave de desempeno" action={can('create', 'kpis') ? <AddBtn onClick={function(){onModal("kpi");}} label="Crear KPI" color="var(--teal)"/> : null}/>:
          <div>
            <div style={{display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", background:"var(--bg2)", padding:16, borderRadius:12, border:"1px solid var(--border)"}}>
              <div style={{flex:1, minWidth:150, maxWidth: 300}}><label className="sp-label">Filtrar por Responsable</label><select className="sp-input" value={filterOwner} onChange={function(e){setFilterOwner(e.target.value);}}><option value="">Todos los responsables</option>{owners.map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select></div>
              <div style={{flex:1, minWidth:150, maxWidth: 300}}><label className="sp-label">Filtrar por Área</label><select className="sp-input" value={filterDept} onChange={function(e){setFilterDept(e.target.value);}}><option value="">Todas las áreas</option>{depts.map(function(d){ return <option key={d} value={d}>{d}</option>; })}</select></div>
              {(filterOwner !== "" || filterDept !== "") && (<div style={{display:"flex", alignItems:"flex-end"}}><button className="sp-btn" onClick={function(){setFilterOwner("");setFilterDept("");}} style={{background:"var(--bg3)", color:"var(--text2)", border:"1px solid var(--border)", height: 38}}>Limpiar</button></div>)}
            </div>
            {filteredKpis.length === 0 ? (
              <div style={{textAlign:"center", padding:40, color:"var(--text3)", background:"var(--bg2)", borderRadius:12, border:"1px dashed var(--border)"}}>No se encontraron resultados para los filtros seleccionados.</div>
            ) : (
            <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {Object.entries(filteredKpis.reduce(function(acc,kpi){
              var dept=kpi.department||"🏢 Generales / Sin Área"; if(!acc[dept])acc[dept]=[]; acc[dept].push(kpi); return acc;
            },{})).map(function([dept,kpis]){
              return(
                <div key={dept} style={{marginBottom: 8}}>
                  <div onClick={(e) => { if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') toggleDept(dept); }} className="sp-card-hover" style={{padding: "16px 24px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsedDepts[dept] ? 0 : 16}}>
                    <div style={{display: "flex", alignItems: "center", gap: 12}}>
                      <span style={{fontSize: 22}}>📁</span> 
                      {editingDept === dept ? (
                        <input autoFocus defaultValue={dept === "🏢 Generales / Sin Área" ? "" : dept} onBlur={e => renameDept(dept, e.target.value)} onKeyDown={e => { if(e.key === 'Enter') e.target.blur(); if(e.key === 'Escape') setEditingDept(null); }} onClick={e => e.stopPropagation()} className="sp-input" style={{ width: 250, padding: '6px 12px', fontSize: 15, fontWeight: 800, margin: 0 }} />
                      ) : (
                        <h4 style={{fontSize:16, fontWeight: 800, color:"var(--text)",margin:0,display:"flex",alignItems:"center",gap:8}}>{dept} {can('update', 'kpis') && <button onClick={(e) => { e.stopPropagation(); setEditingDept(dept); }} className="icon-btn" style={{width: 24, height: 24, fontSize: 12, border: 'none', background: 'transparent', opacity: 0.5}}>✏️</button>}</h4>
                      )}
                      <span style={{fontSize:12,color:"var(--text2)",fontWeight:700, background: "var(--bg3)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 99}}>{kpis.length} KPIs</span>
                    </div>
                    <span style={{transform: collapsedDepts[dept] ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)", fontSize: 14, color: "var(--text3)", fontWeight: 800}}>▼</span>
                  </div>
                  {!collapsedDepts[dept] && (
                  <div className="scale-in" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,paddingLeft:28,borderLeft:"2px dashed var(--border)", marginLeft: 28, marginBottom: 32}}>
                    {kpis.map(function(kpi){
                      var pct=kpi.target?Math.round((kpi.value||0)/kpi.target*100):0; var c=pct>=95?"var(--green)":pct>=80?"var(--gold)":"var(--red)"; var isCritical = pct < 80;
                      return(
                        <div key={kpi.id} className="sp-card sp-card-hover" style={{padding:20, display: "flex", flexDirection: "column"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:6,lineHeight:1.3}}>{kpi.name}</div>
                              {kpi.owner && <span style={{fontSize:11,color:"var(--text3)",background:"var(--bg3)",padding:"3px 8px",borderRadius:4,border:"1px solid var(--border)"}}>👤 {kpi.owner}</span>}
                            </div>
                            <div style={{display: "flex", gap: 6}}>
                              {can('update', 'kpis') && <button className="icon-btn" onClick={function(){if(onEdit)onEdit(kpi);}} style={{width: 28, height: 28, fontSize: 13, background: "transparent", border: "1px solid var(--border)", color: "var(--text3)"}}>✏️</button>}
                              {can('delete', 'kpis') && <button className="delete-btn" onClick={() => onDelete(kpi.id)}>🗑</button>}
                          </div>
                          <div style={{marginBottom:16, display: "flex", alignItems: "flex-end", gap: 8}}>
                            <div style={{display:"flex",alignItems:"baseline"}}><input type="number" disabled={!can('update', 'kpis')} defaultValue={kpi.value||0} onBlur={async function(e){var v=Number(e.target.value);if(v!==(kpi.value||0)){try{await kpiService.update(kpi.id,{value:v});}catch(err){notificationService.error(err.message);}}}} onKeyDown={function(e){if(e.key==="Enter")e.target.blur();}} style={{width:70,fontSize:32,fontWeight:800,color:c,background:"transparent",border:"none",borderBottom:"1px dashed transparent",outline:"none",padding:0,cursor:can('update', 'kpis') ? "text" : "not-allowed",lineHeight:1,opacity:can('update', 'kpis') ? 1 : 0.6}}/><span style={{fontSize:16,color:"var(--text3)",marginLeft:2,fontWeight:700}}>{kpi.unit}</span></div><span style={{fontSize:11,color:"var(--text3)",marginBottom:4}}>Actual</span>
                          </div>
                          <div className="progress-bar" style={{marginBottom:10, height: 6}}><div className="progress-fill" style={{width:Math.min(100,pct)+"%",background:c}}/></div>
                          <div style={{display:"flex",justifyContent:"space-between", fontSize:12}}><span style={{color:"var(--text2)", fontWeight:600}}>Meta: {kpi.target}{kpi.unit}</span><span style={{fontWeight:800,color:c}}>{pct}%</span></div>
                          {isCritical && can('create', 'okrs') && (<div style={{marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)"}}><div style={{fontSize: 11, color: "var(--red)", marginBottom: 8, fontWeight: 700}}>⚠️ Desviación detectada</div><button className="sp-btn" onClick={function(){if(onCreateOkrFromKpi)onCreateOkrFromKpi(kpi);}} style={{background: "var(--red-light)", color: "var(--red)", border: "1px solid rgba(220,38,38,0.3)", width: "100%", justifyContent: "center", fontSize: 12}}>⚡ Crear OKR de Mejora</button></div>)}
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
        {tab==="bowling"&&<BowlingChart />}
        {tab==="prediction"&&<Prediction />}
      </div>
    </div>
  );
}