import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';
import { initiativeService, notificationService } from './services.js';
import Simulator from './Simulator.jsx';
import { AddBtn, TabBar, EmptyState, STATUS_COLORS, STATUS_LABELS } from './SharedUI.jsx';

export default function ModuloIniciativas({onModal, onDelete}){
  const { t } = useTranslation();
  const initiatives = useStore(state => state.initiatives);
  const profile = useStore.use.profile();
  const can = useStore.use.can();
  const [tab,setTab]=useState("list");
  const [showInitModal, setShowInitModal] = useState(false);
  const [initForm, setInitForm] = useState({ name: '', description: '', phase: 'planning', owner: '', start_date: '', end_date: '', budget: '', status: 'active' });
  const [savingInit, setSavingInit] = useState(false);

  const handleCreateInit = async (e) => {
    e.preventDefault();
    if (!initForm.name.trim()) return notificationService.error('El nombre es requerido.');
    setSavingInit(true);
    try {
      const { supabase } = await import('./supabase.js');
      const { error } = await supabase.from('initiatives').insert({
        name: initForm.name,
        description: initForm.description,
        phase: initForm.phase,
        owner: initForm.owner,
        start_date: initForm.start_date || null,
        end_date: initForm.end_date || null,
        budget: parseFloat(initForm.budget) || 0,
        status: initForm.status,
        organization_id: profile?.organization_id,
      });
      if (error) throw error;
      notificationService.success('✅ Iniciativa creada correctamente.');
      setShowInitModal(false);
      setInitForm({ name: '', description: '', phase: 'planning', owner: '', start_date: '', end_date: '', budget: '', status: 'active' });
      // Recargar iniciativas en el store desde Supabase
      const { initiativeService: svc } = await import('./services.js');
      const orgId = profile?.organization_id;
      if (orgId) {
        const newInits = await svc.getAll(orgId);
        useStore.getState().setInitiatives(newInits || []);
      }
    } catch (err) { notificationService.error('Error: ' + err.message); }
    finally { setSavingInit(false); }
  };

  
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
      <div className="page-header"><div><div className="page-title">🚀 {t('initiatives.title', 'Iniciativas')}</div><div className="page-subtitle">{(initiatives||[]).length} {t('initiatives.title', 'iniciativas')} registradas</div></div></div>
      <TabBar tabs={[{id:"list",icon:"🚀",label:t('initiatives.title','Iniciativas')+" — Lista"},{id:"kanban",icon:"📋",label:"Kanban"},{id:"simulator",icon:"🎮",label:"Simulador"}]} active={tab} onChange={setTab} rightContent={tab!=="simulator" && can('create', 'initiatives') && <AddBtn onClick={function(){onModal("initiative");}} label="Nueva" color="var(--violet)"/>}/>
      <div className="fade-up">
        {tab==="list"&&((initiatives||[]).length===0?
          <EmptyState icon="🚀" title="Sin iniciativas" desc="Crea iniciativas estrategicas" action={can('create', 'initiatives') ? <AddBtn onClick={function(){onModal("initiative");}} label="Crear Iniciativa" color="var(--violet)"/> : null}/>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(initiatives||[]).map(function(ini){
              var sc=STATUS_COLORS[ini.status]||"var(--text3)";
              return(
                <div key={ini.id} className="sp-card" style={{padding:16,borderLeft:"3px solid "+sc}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{flex:1,marginRight:12}}><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:8}}>{ini.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span className="sp-badge" style={{background:(sc||"var(--text3)")+"20",color:sc}}>{STATUS_LABELS[ini.status]||ini.status}</span>{ini.owner&&<span style={{fontSize:12,color:"var(--text3)"}}>👤 {ini.owner}</span>}{ini.end_date&&<span style={{fontSize:12,color:"var(--text3)"}}>🏁 {ini.end_date}</span>}</div></div>
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
    
      {showInitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="sp-card" style={{ width: '100%', maxWidth: 560, padding: 32, borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>🚀 Nueva Iniciativa</h3>
            <form onSubmit={handleCreateInit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Nombre *</label>
                <input className="sp-input" required placeholder="Ej: Implementar CRM en área comercial" value={initForm.name} onChange={e => setInitForm(f => ({...f, name: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Descripción</label>
                <textarea className="sp-input" placeholder="Contexto y objetivos de la iniciativa..." value={initForm.description} onChange={e => setInitForm(f => ({...f, description: e.target.value}))} rows={2} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fase</label>
                  <select className="sp-input" value={initForm.phase} onChange={e => setInitForm(f => ({...f, phase: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}>
                    <option value="planning">Planeación</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="review">Revisión</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Responsable</label>
                  <input className="sp-input" placeholder="Nombre del líder" value={initForm.owner} onChange={e => setInitForm(f => ({...f, owner: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha Inicio</label>
                  <input className="sp-input" type="date" value={initForm.start_date} onChange={e => setInitForm(f => ({...f, start_date: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha Fin</label>
                  <input className="sp-input" type="date" value={initForm.end_date} onChange={e => setInitForm(f => ({...f, end_date: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Presupuesto (MXN)</label>
                <input className="sp-input" type="number" step="any" min="0" placeholder="0.00" value={initForm.budget} onChange={e => setInitForm(f => ({...f, budget: e.target.value}))} style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={savingInit} className="sp-btn sp-btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  {savingInit ? 'Guardando...' : '✅ Crear Iniciativa'}
                </button>
                <button type="button" onClick={() => setShowInitModal(false)} className="sp-btn" style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 14 }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  );
}
