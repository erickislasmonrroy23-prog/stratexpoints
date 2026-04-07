import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';
import { shallow } from 'zustand/shallow';
import { initiativeService, notificationService } from './services.js';
import Simulator from './Simulator.jsx';
import { AddBtn, TabBar, EmptyState, SC, SL } from './SharedUI.jsx';

export default function ModuloIniciativas({onModal, onDelete}){
  const initiatives = useStore(state => state.initiatives);
  const profile = useStore.use.profile();
  const can = useStore.use.can();
  const [tab,setTab]=useState("list");
  
  const COLS = useMemo(() => [{id:"not_started",label:"Sin Iniciar",color:"var(--text3)"},{id:"in_progress",label:"En Progreso",color:"var(--teal)"},{id:"completed",label:"Completado",color:"var(--green)"}], []);

  const handleDrop = useCallback(async (e, newStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("initiative_id");
    if (!can('update', 'initiatives')) return notificationService.error("No tienes permiso para mover iniciativas.");
    if (!id) return;
    try {
      await initiativeService.update(id, { status: newStatus });
    } catch (err) { notificationService.error("Error al mover iniciativa: " + err.message); }
  }, [can]);

  const groupedInitiatives = useMemo(() => {
    return (initiatives || []).reduce((acc, i) => {
      if (i.status === "in_progress" || i.status === "at_risk" || i.status === "on_hold") {
        acc.in_progress.push(i);
      } else if (i.status === "completed") {
        acc.completed.push(i);
      } else {
        acc.not_started.push(i);
      }
      return acc;
    }, { not_started: [], in_progress: [], completed: [] });
  }, [initiatives]);

  return(
    <div>
      <div className="page-header"><div><div className="page-title">🚀 Iniciativas</div><div className="page-subtitle">{(initiatives||[]).length} iniciativas registradas</div></div></div>
      <TabBar tabs={[{id:"list",icon:"🚀",label:"Lista"},{id:"kanban",icon:"📋",label:"Kanban"},{id:"simulator",icon:"🎮",label:"Simulador"}]} active={tab} onChange={setTab} rightContent={tab!=="simulator" && can('create', 'initiatives') && <AddBtn onClick={function(){onModal("initiative");}} label="Nueva" color="var(--violet)"/>}/>
      <div className="fade-up">
        {tab==="list"&&((initiatives||[]).length===0?
          <EmptyState icon="🚀" title="Sin iniciativas" desc="Crea iniciativas estrategicas" action={can('create', 'initiatives') ? <AddBtn onClick={function(){onModal("initiative");}} label="Crear Iniciativa" color="var(--violet)"/> : null}/>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(initiatives||[]).map(function(ini){
              var sc=SC[ini.status]||"var(--text3)";
              return(
                <div key={ini.id} className="sp-card" style={{padding:16,borderLeft:"3px solid "+sc}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{flex:1,marginRight:12}}><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:8}}>{ini.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span className="sp-badge" style={{background:(sc||"var(--text3)")+"20",color:sc}}>{SL[ini.status]||ini.status}</span>{ini.owner&&<span style={{fontSize:12,color:"var(--text3)"}}>👤 {ini.owner}</span>}{ini.end_date&&<span style={{fontSize:12,color:"var(--text3)"}}>🏁 {ini.end_date}</span>}</div></div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <div style={{textAlign:"right"}}><div style={{display:"flex",alignItems:"center",justifyContent:"flex-end"}}><input type="number" disabled={!can('update', 'initiatives')} min="0" max="100" defaultValue={ini.progress||0} onBlur={async function(e){var v=Math.min(100,Math.max(0,Number(e.target.value)));e.target.value=v;if(v!==(ini.progress||0)){var newStatus=ini.status;if(v===100)newStatus="completed";else if(ini.status==="completed"&&v<100)newStatus="in_progress";try{await initiativeService.update(ini.id,{progress:v,status:newStatus});}catch(err){notificationService.error(err.message);}}}} onKeyDown={function(e){if(e.key==="Enter")e.target.blur();}} style={{width:54,fontSize:20,fontWeight:800,color:sc,background:"transparent",border:"none",borderBottom:"1px dashed transparent",textAlign:"right",outline:"none",padding:0,cursor: can('update', 'initiatives') ? "text" : "not-allowed", opacity: can('update', 'initiatives') ? 1 : 0.6}}/><span style={{fontSize:20,fontWeight:800,color:sc,lineHeight:1}}>%</span></div><div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>avance</div></div>
                      {can('delete', 'initiatives') && <button className="delete-btn" onClick={() => onDelete(ini.id)}>🗑</button>}
                    </div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:(ini.progress||0)+"%",background:"var(--violet)"}}/></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="kanban"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {COLS.map(function(col){
              const items = groupedInitiatives[col.id] || [];
              return(
                <div key={col.id} style={{background:"var(--bg)",borderRadius:16,padding:16,border:"1px solid var(--border)",minHeight:400,display:"flex",flexDirection:"column",boxShadow:"inset 0 2px 4px rgba(0,0,0,0.02)"}} onDragOver={function(e){e.preventDefault();}} onDrop={function(e){handleDrop(e,col.id);}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,paddingBottom:12,borderBottom:"1px dashed var(--border)"}}><div style={{width:10,height:10,borderRadius:"50%",background:col.color,boxShadow:`0 0 8px ${col.color}80`}}/><div style={{fontSize:13,fontWeight:800,color:"var(--text)",letterSpacing:"0.5px"}}>{col.label}</div><span style={{fontSize:11,fontWeight:800,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:99,padding:"2px 8px",color:"var(--text3)",marginLeft:"auto"}}>{items.length}</span></div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {items.map(function(ini){
                      return(
                        <div key={ini.id} className="sp-card sp-card-hover" style={{padding:12,cursor: can('update', 'initiatives') ? "grab" : "default"}} draggable={can('update', 'initiatives')} onDragStart={function(e){e.dataTransfer.setData("initiative_id",ini.id);}}><div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:6,lineHeight:1.3}}>{ini.title}</div>{ini.owner&&<div style={{fontSize:11,color:"var(--text3)",marginBottom:6}}>👤 {ini.owner}</div>}<div className="progress-bar" style={{height:3}}><div className="progress-fill" style={{width:(ini.progress||0)+"%",background:col.color}}/></div><div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginTop:4,fontSize:10,color:"var(--text3)"}}><input type="number" disabled={!can('update', 'initiatives')} min="0" max="100" defaultValue={ini.progress||0} onBlur={async function(e){var v=Math.min(100,Math.max(0,Number(e.target.value)));e.target.value=v;if(v!==(ini.progress||0)){var newStatus=ini.status;if(v===100)newStatus="completed";else if(ini.status==="completed"&&v<100)newStatus="in_progress";try{await initiativeService.update(ini.id,{progress:v,status:newStatus});}catch(err){notificationService.error(err.message);}}}} onKeyDown={function(e){if(e.key==="Enter")e.target.blur();}} style={{width:30,fontSize:10,fontWeight:700,color:"var(--text3)",background:"transparent",border:"none",borderBottom:"1px dashed transparent",textAlign:"right",outline:"none",padding:0,cursor: can('update', 'initiatives') ? "text" : "not-allowed", opacity: can('update', 'initiatives') ? 1 : 0.6}}/><span>%</span></div></div>
                      );
                    })}
                    {items.length===0&&<div style={{textAlign:"center",padding:16,fontSize:11,color:"var(--text3)"}}>Sin iniciativas</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="simulator"&&<Simulator />}
      </div>
    </div>
  );
}