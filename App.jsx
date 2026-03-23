import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { initTheme, setTheme } from "./theme.js";
import Login from "./components/modules/Login.jsx";
import { perspectiveService, okrService, kpiService, initiativeService, alertService, objectivesService, autoAlertService } from "./services.js";
import { OKRForm, KPIForm, InitiativeForm, Modal } from "./forms.jsx";
import SuperAdmin from "./SuperAdmin.jsx";
import CommandCenter from "./CommandCenter.jsx";
import Dashboard from "./Dashboard.jsx";
import BSC from "./BSC.jsx";
import AIInsights from "./AIInsights.jsx";
import ExecutivePanel from "./ExecutivePanel.jsx";
import BowlingChart from "./BowlingChart.jsx";
import Simulator from "./Simulator.jsx";
import Chat from "./Chat.jsx";
import StrategyMap from "./StrategyMap.jsx";
import Prediction from "./Prediction.jsx";
import Export from "./Export.jsx";
import DocAnalyzer from "./DocAnalyzer.jsx";
import OKRGenerator from "./OKRGenerator.jsx";
import Benchmark from "./Benchmark.jsx";
import RadarStrategic from "./RadarStrategic.jsx";
import PowerPoint from "./PowerPoint.jsx";
import StrategicEngine from "./StrategicEngine.jsx";
import StrategicBus from "./StrategicBus.jsx";
import IntelligentCore from "./IntelligentCore.jsx";

const SC={on_track:"var(--green)",at_risk:"var(--gold)",completed:"var(--primary)",not_started:"var(--text3)",in_progress:"var(--teal)",on_hold:"var(--gold)",cancelled:"var(--red)"};
const SL={on_track:"En curso",at_risk:"En riesgo",completed:"Completado",not_started:"Sin iniciar",in_progress:"En progreso",on_hold:"En pausa",cancelled:"Cancelado"};

function LoadingScreen(){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{position:"relative"}}>
        <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🎯</div>
        <div style={{position:"absolute",inset:-5,borderRadius:22,border:"2.5px solid transparent",borderTopColor:"var(--primary)",animation:"spin 1s linear infinite"}}/>
      </div>
      <div style={{fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:"-.3px"}}>StratexPoints</div>
      <div style={{fontSize:13,color:"var(--text3)",fontWeight:500,animation:"pulse 1.5s ease infinite"}}>Cargando plataforma...</div>
    </div>
  );
}

function AddBtn({onClick,color,label}){
  return <button className="sp-btn" onClick={onClick} style={{background:color||"var(--primary)",color:"#fff",border:"none"}}><span>+</span>{label}</button>;
}

function ThemeToggle({theme,onToggle}){
  return <button onClick={onToggle} style={{width:36,height:36,borderRadius:9,border:"1px solid var(--border)",background:"var(--bg3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{theme==="dark"?"☀️":"🌙"}</button>;
}

function Avatar({name}){
  return <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700}}>{(name||"U")[0].toUpperCase()}</div>;
}

function TabBar({tabs,active,onChange,rightContent}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)",marginBottom:20}}>
      <div style={{display:"flex",gap:0}}>
        {tabs.map(function(t){
          var isActive=active===t.id;
          return(
            <button key={t.id} onClick={function(){onChange(t.id);}} style={{padding:"10px 18px",border:"none",borderBottom:"2px solid "+(isActive?"var(--primary)":"transparent"),background:"transparent",color:isActive?"var(--primary)":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:isActive?700:500,fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"all .15s",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      {rightContent&&<div style={{paddingBottom:8}}>{rightContent}</div>}
    </div>
  );
}

function EmptyState({icon,title,desc,action}){
  return(
    <div className="sp-card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{desc}</div>
        {action}
      </div>
    </div>
  );
}

function CentroEstrategico({data,profile,onDataRefresh}){
  const [tab,setTab]=useState("engine");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">⚡ Centro Estrategico</div><div className="page-subtitle">Motor IA + Bus de comunicacion + Nucleo inteligente</div></div></div>
      <TabBar tabs={[{id:"engine",icon:"⚡",label:"Motor IA"},{id:"bus",icon:"🔗",label:"Bus Estrategico"},{id:"core",icon:"🧠",label:"Nucleo Inteligente"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="engine"&&<StrategicEngine data={data} profile={profile} onDataRefresh={onDataRefresh}/>}
        {tab==="bus"&&<StrategicBus data={data} profile={profile} onDataRefresh={onDataRefresh}/>}
        {tab==="core"&&<IntelligentCore data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloEstrategia({data,onRefresh}){
  const [tab,setTab]=useState("bsc");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🗺️ Estrategia</div><div className="page-subtitle">Balanced Scorecard + Mapa Estrategico Visual</div></div></div>
      <TabBar tabs={[{id:"bsc",icon:"🗺️",label:"BSC"},{id:"map",icon:"🔗",label:"Mapa Visual"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="bsc"&&<BSC data={data} onCreateObjective={async function(form){await objectivesService.create(form);onRefresh();}} onDeleteObjective={async function(id){if(!confirm("Eliminar?"))return;await objectivesService.delete(id);onRefresh();}}/>}
        {tab==="map"&&<StrategyMap data={data}/>}
      </div>
    </div>
  );
}

function ModuloOKRs({data,profile,onRefresh,onModal}){
  const [tab,setTab]=useState("list");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🎯 OKRs</div><div className="page-subtitle">{(data.okrs||[]).length} objetivos registrados</div></div></div>
      <TabBar tabs={[{id:"list",icon:"🎯",label:"Lista OKRs"},{id:"gen",icon:"✨",label:"Generar con IA"}]} active={tab} onChange={setTab} rightContent={tab==="list"&&<AddBtn onClick={function(){onModal("okr");}} label="Nuevo OKR"/>}/>
      <div className="fade-up">
        {tab==="list"&&((data.okrs||[]).length===0?
          <EmptyState icon="🎯" title="Sin OKRs registrados" desc="Crea tus primeros objetivos estrategicos" action={<AddBtn onClick={function(){onModal("okr");}} label="Crear OKR"/>}/>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(data.okrs||[]).map(function(okr){
              var pct=okr.progress||0;var sc=SC[okr.status]||"var(--text3)";
              return(
                <div key={okr.id} className="sp-card" style={{padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{flex:1,marginRight:12}}>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:8,lineHeight:1.4}}>{okr.objective}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span className="sp-badge" style={{background:sc+"20",color:sc}}>{SL[okr.status]||okr.status}</span>
                        <span style={{fontSize:12,color:"var(--text3)"}}>📅 {okr.period}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:sc,lineHeight:1}}>{pct}%</div><div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>progreso</div></div>
                      <button className="delete-btn" onClick={async function(){if(!confirm("Eliminar?"))return;await okrService.delete(okr.id);onRefresh();}}>🗑</button>
                    </div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:pct+"%",background:"linear-gradient(90deg,var(--primary),var(--teal))"}}/></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="gen"&&<OKRGenerator data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloKPIs({data,profile,onRefresh,onModal}){
  const [tab,setTab]=useState("list");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">📊 KPIs</div><div className="page-subtitle">{(data.kpis||[]).length} indicadores activos</div></div></div>
      <TabBar tabs={[{id:"list",icon:"📊",label:"Indicadores"},{id:"bowling",icon:"🎳",label:"Bowling KPI"},{id:"prediction",icon:"📈",label:"Prediccion"}]} active={tab} onChange={setTab} rightContent={tab==="list"&&<AddBtn onClick={function(){onModal("kpi");}} label="Nuevo KPI" color="var(--teal)"/>}/>
      <div className="fade-up">
        {tab==="list"&&((data.kpis||[]).length===0?
          <EmptyState icon="📊" title="Sin KPIs registrados" desc="Agrega indicadores clave de desempeno" action={<AddBtn onClick={function(){onModal("kpi");}} label="Crear KPI" color="var(--teal)"/>}/>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
            {(data.kpis||[]).map(function(kpi){
              var pct=kpi.target?Math.round((kpi.value||0)/kpi.target*100):0;
              var c=pct>=95?"var(--green)":pct>=80?"var(--gold)":"var(--red)";
              return(
                <div key={kpi.id} className="sp-card sp-card-hover" style={{padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",flex:1,lineHeight:1.4}}>{kpi.name}</div>
                    <button className="delete-btn" onClick={async function(){if(!confirm("Eliminar?"))return;await kpiService.delete(kpi.id);onRefresh();}} style={{flexShrink:0,marginLeft:8}}>×</button>
                  </div>
                  <div style={{marginBottom:12}}><span style={{fontSize:30,fontWeight:800,color:c,lineHeight:1}}>{kpi.value||0}</span><span style={{fontSize:13,color:"var(--text3)",marginLeft:3}}>{kpi.unit}</span></div>
                  <div className="progress-bar" style={{marginBottom:8}}><div className="progress-fill" style={{width:Math.min(100,pct)+"%",background:c}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"var(--text3)"}}>Meta: {kpi.target}{kpi.unit}</span><span style={{fontSize:12,fontWeight:700,color:c}}>{pct}%</span></div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="bowling"&&<BowlingChart data={data} profile={profile}/>}
        {tab==="prediction"&&<Prediction data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloIniciativas({data,profile,onRefresh,onModal}){
  const [tab,setTab]=useState("list");
  var COLS=[{id:"not_started",label:"Sin Iniciar",color:"var(--text3)"},{id:"in_progress",label:"En Progreso",color:"var(--teal)"},{id:"completed",label:"Completado",color:"var(--green)"}];
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🚀 Iniciativas</div><div className="page-subtitle">{(data.initiatives||[]).length} iniciativas registradas</div></div></div>
      <TabBar tabs={[{id:"list",icon:"🚀",label:"Lista"},{id:"kanban",icon:"📋",label:"Kanban"},{id:"simulator",icon:"🎮",label:"Simulador"}]} active={tab} onChange={setTab} rightContent={tab!=="simulator"&&<AddBtn onClick={function(){onModal("initiative");}} label="Nueva" color="var(--violet)"/>}/>
      <div className="fade-up">
        {tab==="list"&&((data.initiatives||[]).length===0?
          <EmptyState icon="🚀" title="Sin iniciativas" desc="Crea iniciativas estrategicas" action={<AddBtn onClick={function(){onModal("initiative");}} label="Crear Iniciativa" color="var(--violet)"/>}/>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(data.initiatives||[]).map(function(ini){
              var sc=SC[ini.status]||"var(--text3)";
              return(
                <div key={ini.id} className="sp-card" style={{padding:16,borderLeft:"3px solid "+sc}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{flex:1,marginRight:12}}>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:8}}>{ini.title}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span className="sp-badge" style={{background:sc+"20",color:sc}}>{SL[ini.status]||ini.status}</span>
                        {ini.owner&&<span style={{fontSize:12,color:"var(--text3)"}}>👤 {ini.owner}</span>}
                        {ini.end_date&&<span style={{fontSize:12,color:"var(--text3)"}}>🏁 {ini.end_date}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:sc,lineHeight:1}}>{ini.progress||0}%</div><div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>avance</div></div>
                      <button className="delete-btn" onClick={async function(){if(!confirm("Eliminar?"))return;await initiativeService.delete(ini.id);onRefresh();}}>🗑</button>
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
              var items=(data.initiatives||[]).filter(function(i){
                if(col.id==="in_progress")return i.status==="in_progress"||i.status==="at_risk"||i.status==="on_hold";
                return i.status===col.id;
              });
              return(
                <div key={col.id} style={{background:"var(--bg3)",borderRadius:12,padding:14,border:"1px solid var(--border)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:col.color}}/>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--text2)"}}>{col.label}</div>
                    <span style={{fontSize:10,fontWeight:700,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:99,padding:"1px 7px",color:"var(--text3)",marginLeft:"auto"}}>{items.length}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {items.map(function(ini){
                      return(
                        <div key={ini.id} className="sp-card" style={{padding:12}}>
                          <div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:6,lineHeight:1.3}}>{ini.title}</div>
                          {ini.owner&&<div style={{fontSize:11,color:"var(--text3)",marginBottom:6}}>👤 {ini.owner}</div>}
                          <div className="progress-bar" style={{height:3}}><div className="progress-fill" style={{width:(ini.progress||0)+"%",background:col.color}}/></div>
                          <div style={{fontSize:10,color:"var(--text3)",marginTop:4,textAlign:"right"}}>{ini.progress||0}%</div>
                        </div>
                      );
                    })}
                    {items.length===0&&<div style={{textAlign:"center",padding:16,fontSize:11,color:"var(--text3)"}}>Sin iniciativas</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="simulator"&&<Simulator data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloIA({data,profile}){
  const [tab,setTab]=useState("chat");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🤖 Inteligencia IA</div><div className="page-subtitle">Chat + IA Estrategica + Analisis de Documentos</div></div></div>
      <TabBar tabs={[{id:"chat",icon:"💬",label:"Chat IA"},{id:"ai",icon:"🤖",label:"IA Estrategica"},{id:"docs",icon:"📂",label:"Analizar Docs"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="chat"&&<Chat data={data} profile={profile}/>}
        {tab==="ai"&&<AIInsights data={data} profile={profile}/>}
        {tab==="docs"&&<DocAnalyzer profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloAnalitica({data,profile,onNavigate}){
  const [tab,setTab]=useState("dashboard");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">📈 Analitica</div><div className="page-subtitle">Dashboard + Panel Ejecutivo + Radar + Benchmark</div></div></div>
      <TabBar tabs={[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"executive",icon:"👔",label:"Panel Ejecutivo"},{id:"radar",icon:"📡",label:"Radar 360"},{id:"benchmark",icon:"🏆",label:"Benchmark"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="dashboard"&&<Dashboard data={data} profile={profile} onNavigate={onNavigate}/>}
        {tab==="executive"&&<ExecutivePanel data={data} profile={profile}/>}
        {tab==="radar"&&<RadarStrategic data={data} profile={profile}/>}
        {tab==="benchmark"&&<Benchmark data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloReportes({data,profile}){
  const [tab,setTab]=useState("export");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">📤 Reportes</div><div className="page-subtitle">PDF + Excel + Word + PowerPoint profesionales</div></div></div>
      <TabBar tabs={[{id:"export",icon:"📤",label:"PDF / Excel / Word"},{id:"ppt",icon:"📊",label:"PowerPoint"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="export"&&<Export data={data} profile={profile}/>}
        {tab==="ppt"&&<PowerPoint data={data} profile={profile}/>}
      </div>
    </div>
  );
}

function ModuloAlertas({data}){
  var unread=data.alerts.filter(function(a){return !a.is_read;});
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🔔 Centro de Alertas</div><div className="page-subtitle">{unread.length} sin leer de {data.alerts.length} totales</div></div></div>
      {data.alerts.length===0?
        <EmptyState icon="🔔" title="Sin alertas activas" desc="Todo esta funcionando correctamente"/>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {data.alerts.map(function(al){
            var sc=al.severity==="critical"?"var(--red)":al.severity==="warning"?"var(--gold)":"var(--teal)";
            return(
              <div key={al.id} className="sp-card" style={{padding:16,borderLeft:"3px solid "+sc}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>{al.title}</div><div style={{fontSize:12,color:"var(--text3)",lineHeight:1.5}}>{al.message}</div></div>
                  <span className="sp-badge" style={{background:sc+"18",color:sc,flexShrink:0,marginLeft:12}}>{al.severity==="critical"?"🚨 Critico":al.severity==="warning"?"⚠️ Advertencia":"ℹ️ Info"}</span>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function CommandPalette({onNavigate,onClose,data}){
  const [query,setQuery]=useState("");
  var ACTIONS=[
    {icon:"🏠",label:"Inicio — Command Center",module:"home"},
    {icon:"⚡",label:"Centro Estrategico — Motor + Bus + Nucleo",module:"centro"},
    {icon:"🗺️",label:"Estrategia — BSC y Mapa Visual",module:"estrategia"},
    {icon:"🎯",label:"OKRs — Lista y Generador IA",module:"okrs"},
    {icon:"📊",label:"KPIs — Indicadores + Bowling + Prediccion",module:"kpis"},
    {icon:"🚀",label:"Iniciativas — Lista + Kanban + Simulador",module:"iniciativas"},
    {icon:"🤖",label:"Inteligencia IA — Chat + IA + Docs",module:"ia"},
    {icon:"📈",label:"Analitica — Dashboard + Radar + Benchmark",module:"analitica"},
    {icon:"📤",label:"Reportes — PDF + Excel + Word + PPT",module:"reportes"},
    {icon:"🔔",label:"Alertas — Centro de alertas",module:"alertas"},
  ];
  var filtered=query.trim()===""?ACTIONS:ACTIONS.filter(function(a){return a.label.toLowerCase().includes(query.toLowerCase());});
  useEffect(function(){
    function handleKey(e){if(e.key==="Escape")onClose();}
    window.addEventListener("keydown",handleKey);
    return function(){window.removeEventListener("keydown",handleKey);};
  },[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:9999,paddingTop:120}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:540,background:"var(--bg2)",borderRadius:16,border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:16,color:"var(--text3)"}}>🔍</span>
          <input autoFocus value={query} onChange={function(e){setQuery(e.target.value);}} placeholder="Buscar modulos y acciones..." style={{flex:1,border:"none",background:"transparent",fontSize:14,color:"var(--text)",outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500}}/>
          <kbd style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--text3)"}}>ESC</kbd>
        </div>
        <div style={{maxHeight:360,overflowY:"auto",padding:6}}>
          {filtered.map(function(a,i){
            return(
              <button key={i} onClick={function(){onNavigate(a.module);onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:9,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",fontFamily:"'Plus Jakarta Sans',sans-serif",transition:"all .1s"}} onMouseEnter={function(e){e.currentTarget.style.background="var(--primary-light)";}} onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                <span style={{fontSize:18,width:28,textAlign:"center",flexShrink:0}}>{a.icon}</span>
                <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{a.label}</span>
              </button>
            );
          })}
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--text3)",fontSize:13}}>Sin resultados para "{query}"</div>}
        </div>
        <div style={{padding:"10px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:16}}>
          <span style={{fontSize:11,color:"var(--text3)"}}>↵ Seleccionar</span>
          <span style={{fontSize:11,color:"var(--text3)"}}>ESC Cerrar</span>
        </div>
      </div>
    </div>
  );
}

function MainApp({user,profile,onLogout,onSuperAdmin}){
  const [data,setData]=useState({okrs:[],kpis:[],initiatives:[],alerts:[],objectives:[],perspectives:[]});
  const [loading,setLoading]=useState(true);
  const [activeModule,setActiveModule]=useState("home");
  const [modal,setModal]=useState(null);
  const [theme,setThemeState]=useState(function(){return localStorage.getItem("sp-theme")||"light";});
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [cmdOpen,setCmdOpen]=useState(false);

  useEffect(function(){
    loadAllData();
    function handleCmd(e){if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(true);}}
    window.addEventListener("keydown",handleCmd);
    return function(){window.removeEventListener("keydown",handleCmd);};
  },[]);

  function toggleTheme(){var next=theme==="dark"?"light":"dark";setTheme(next);setThemeState(next);}

  async function loadAllData(){
    setLoading(true);
    try{
      var perspectives=await perspectiveService.getAll();
      if(perspectives.length===0)perspectives=await perspectiveService.initDefaults(profile&&profile.organization_id);
      var okrs=await okrService.getAll();
      var kpis=await kpiService.getAll();
      var initiatives=await initiativeService.getAll();
      var alerts=await alertService.getAll();
      var objectives=await objectivesService.getAll();
      setData({okrs,kpis,initiatives,alerts,objectives,perspectives});
      if(profile&&profile.organization_id)await autoAlertService.checkKPIs(profile.organization_id);
    }catch(e){console.error("Error:",e);}
    setLoading(false);
  }

  async function handleSaveOKR(form){await okrService.create(form);await loadAllData();setModal(null);}
  async function handleSaveKPI(form){await kpiService.create(form);await loadAllData();setModal(null);}
  async function handleSaveInitiative(form){await initiativeService.create(form);await loadAllData();setModal(null);}

  var unreadAlerts=data.alerts.filter(function(a){return !a.is_read;}).length;
  var org=profile&&profile.organizations;
  var orgName=org&&org.name||"Mi Organizacion";

  var NAV=[
    {id:"home",       icon:"🏠", label:"Inicio"},
    {id:"centro",     icon:"⚡", label:"Centro Estrategico"},
    {id:"estrategia", icon:"🗺️", label:"Estrategia"},
    {id:"okrs",       icon:"🎯", label:"OKRs"},
    {id:"kpis",       icon:"📊", label:"KPIs"},
    {id:"iniciativas",icon:"🚀", label:"Iniciativas"},
    {id:"ia",         icon:"🤖", label:"Inteligencia IA"},
    {id:"analitica",  icon:"📈", label:"Analitica"},
    {id:"reportes",   icon:"📤", label:"Reportes"},
    {id:"alertas",    icon:"🔔", label:"Alertas"},
  ];
  var DIVIDERS=[1,5,8];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .module-wrap{animation:fadeUp .25s ease forwards;}
        .fade-up{animation:fadeUp .25s ease forwards;}
        .delete-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text3);transition:all .15s;}
        .delete-btn:hover{background:var(--red-light);border-color:var(--red);color:var(--red);}
        .icon-btn{width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;color:var(--text2);}
        .icon-btn:hover{background:var(--border);color:var(--text);}
        .header-action{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;font-size:12px;cursor:pointer;transition:all .15s;border:1px solid var(--border);background:transparent;color:var(--text2);}
        .header-action:hover{background:var(--bg3);color:var(--text);}
        .sp-card{background:var(--bg2);border-radius:12px;border:1px solid var(--border);box-shadow:var(--shadow);}
        .sp-card-hover{transition:all .2s;}
        .sp-card-hover:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
        .stat-card{background:var(--bg2);border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);padding:20px;transition:all .2s;}
        .stat-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
        .progress-bar{height:5px;background:var(--border);border-radius:99px;overflow:hidden;}
        .progress-fill{height:100%;border-radius:99px;transition:width .5s ease;}
        .page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
        .page-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-.3px;}
        .page-subtitle{font-size:13px;color:var(--text3);margin-top:3px;font-weight:500;}
        .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 32px;text-align:center;}
        .empty-state-icon{font-size:48px;margin-bottom:16px;}
        .empty-state-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;}
        .empty-state-desc{font-size:13px;color:var(--text3);margin-bottom:24px;line-height:1.6;}
        .sp-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;}
        .sp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;border:none;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;}
        .sp-btn:hover{filter:brightness(1.06);transform:translateY(-1px);}
        .sp-input{width:100%;padding:9px 13px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;outline:none;transition:border-color .2s;font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box;}
        .sp-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,111,255,.1);}
        .sp-label{display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;}
        .nav-item{width:100%;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:8px;border:none;background:transparent;color:var(--text2);cursor:pointer;font-size:13px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s;text-align:left;margin-bottom:1px;}
        .nav-item:hover{background:var(--bg3);color:var(--text);}
        .nav-item.active{background:var(--primary-light);color:var(--primary);font-weight:700;}
      `}</style>

      <div style={{height:54,background:"var(--bg2)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="icon-btn" onClick={function(){setSidebarCollapsed(!sidebarCollapsed);}}>{sidebarCollapsed?"☰":"←"}</button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🎯</div>
            <span style={{fontSize:15,fontWeight:800,color:"var(--text)",letterSpacing:"-.3px"}}>StratexPoints</span>
          </div>
          <div style={{width:1,height:16,background:"var(--border)"}}/>
          <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>{orgName}</span>
          <button onClick={function(){setCmdOpen(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg3)",cursor:"pointer",color:"var(--text3)",fontSize:12,fontFamily:"'Plus Jakarta Sans',sans-serif",marginLeft:4}}>
            <span>🔍</span><span>Buscar...</span>
            <kbd style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--bg2)",border:"1px solid var(--border)",color:"var(--text3)"}}>⌘K</kbd>
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {unreadAlerts>0&&<button onClick={function(){setActiveModule("alertas");}} className="header-action" style={{color:"var(--red)",borderColor:"rgba(239,68,68,.3)"}}>🔔<span style={{fontWeight:700}}>{unreadAlerts}</span></button>}
          {org&&org.logo_url&&<img src={org.logo_url} alt="logo" style={{height:26,width:"auto",objectFit:"contain",borderRadius:6,border:"1px solid var(--border)",padding:2,background:"var(--bg2)"}}/>}
          <ThemeToggle theme={theme} onToggle={toggleTheme}/>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:8,background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <Avatar name={profile&&profile.full_name}/>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{profile&&profile.full_name||"Usuario"}</span>
            <span className="sp-badge" style={{background:"var(--primary-light)",color:"var(--primary)",padding:"2px 7px",fontSize:10}}>{profile&&profile.role||"viewer"}</span>
          </div>
          {profile&&profile.role==="admin"&&<button className="header-action" onClick={onSuperAdmin} style={{color:"var(--gold)",borderColor:"rgba(245,158,11,.3)"}}>⚡ Admin</button>}
          <button className="header-action" onClick={onLogout}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:sidebarCollapsed?0:200,minWidth:sidebarCollapsed?0:200,background:"var(--bg2)",borderRight:"1px solid var(--border)",overflowY:"auto",overflowX:"hidden",transition:"all .25s ease",position:"sticky",top:54,height:"calc(100vh - 54px)",flexShrink:0}}>
          {!sidebarCollapsed&&(
            <div style={{padding:"10px 8px 16px"}}>
              {NAV.map(function(m,i){
                var isActive=activeModule===m.id;
                return(
                  <div key={m.id}>
                    {DIVIDERS.indexOf(i)!==-1&&<div style={{height:1,background:"var(--border)",margin:"6px 0"}}/>}
                    <button className={"nav-item"+(isActive?" active":"")} onClick={function(){setActiveModule(m.id);}}>
                      <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>{m.icon}</span>
                      <span style={{flex:1}}>{m.label}</span>
                      {m.id==="alertas"&&unreadAlerts>0&&<span style={{fontSize:10,fontWeight:700,background:"var(--red)",color:"#fff",borderRadius:99,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{unreadAlerts}</span>}
                    </button>
                  </div>
                );
              })}
              <div style={{padding:"16px 12px 4px",marginTop:8,borderTop:"1px solid var(--border)"}}>
                <div style={{fontSize:11,fontWeight:600,color:"var(--text3)"}}>StratexPoints v2.0</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>AI Strategic Intelligence</div>
              </div>
            </div>
          )}
        </div>

        <div style={{flex:1,padding:24,overflowY:"auto",minWidth:0}}>
          {loading?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:80,gap:14}}>
              <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid var(--border)",borderTopColor:"var(--primary)",animation:"spin 1s linear infinite"}}/>
              <div style={{fontSize:13,color:"var(--text3)",fontWeight:500}}>Cargando datos estrategicos...</div>
            </div>
          ):(
            <div className="module-wrap">
              {activeModule==="home"&&<CommandCenter data={data} profile={profile} onNavigate={setActiveModule}/>}
              {activeModule==="centro"&&<CentroEstrategico data={data} profile={profile} onDataRefresh={loadAllData}/>}
              {activeModule==="estrategia"&&<ModuloEstrategia data={data} onRefresh={loadAllData}/>}
              {activeModule==="okrs"&&<ModuloOKRs data={data} profile={profile} onRefresh={loadAllData} onModal={setModal}/>}
              {activeModule==="kpis"&&<ModuloKPIs data={data} profile={profile} onRefresh={loadAllData} onModal={setModal}/>}
              {activeModule==="iniciativas"&&<ModuloIniciativas data={data} profile={profile} onRefresh={loadAllData} onModal={setModal}/>}
              {activeModule==="ia"&&<ModuloIA data={data} profile={profile}/>}
              {activeModule==="analitica"&&<ModuloAnalitica data={data} profile={profile} onNavigate={setActiveModule}/>}
              {activeModule==="reportes"&&<ModuloReportes data={data} profile={profile}/>}
              {activeModule==="alertas"&&<ModuloAlertas data={data}/>}
            </div>
          )}
        </div>
      </div>

      {cmdOpen&&<CommandPalette onNavigate={setActiveModule} onClose={function(){setCmdOpen(false);}} data={data}/>}
      {modal==="okr"&&<Modal onClose={function(){setModal(null);}}><OKRForm onSave={handleSaveOKR} onCancel={function(){setModal(null);}}/></Modal>}
      {modal==="kpi"&&<Modal onClose={function(){setModal(null);}}><KPIForm onSave={handleSaveKPI} onCancel={function(){setModal(null);}}/></Modal>}
      {modal==="initiative"&&<Modal onClose={function(){setModal(null);}}><InitiativeForm onSave={handleSaveInitiative} onCancel={function(){setModal(null);}}/></Modal>}
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [superAdmin,setSuperAdmin]=useState(false);

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(function(res){
      var session=res.data.session;
      if(session&&session.user){setUser(session.user);loadProfile(session.user.id);}
      else setLoading(false);
    });
    var sub=supabase.auth.onAuthStateChange(function(_event,session){
      if(session&&session.user){setUser(session.user);loadProfile(session.user.id);}
      else{setUser(null);setProfile(null);setLoading(false);}
    });
    return function(){sub.data.subscription.unsubscribe();};
  },[]);

  async function loadProfile(userId){
    try{
      var res=await supabase.from("profiles").select("*, organizations(*)").eq("id",userId).single();
      setProfile(res.data);
    }catch(e){console.error("Error perfil:",e);}
    setLoading(false);
  }

  function handleLogin(u,p){setUser(u);setProfile(p);}
  async function handleLogout(){await supabase.auth.signOut();setUser(null);setProfile(null);}

  if(loading)return <LoadingScreen/>;
  if(!user)return <Login onLogin={handleLogin}/>;
  if(superAdmin)return <SuperAdmin onBack={function(){setSuperAdmin(false);}}/>;
  return <MainApp user={user} profile={profile} onLogout={handleLogout} onSuperAdmin={function(){setSuperAdmin(true);}}/>;
}
