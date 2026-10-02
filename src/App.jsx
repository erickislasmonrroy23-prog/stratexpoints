import logger from './utils/logger.js';
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { supabase } from "./supabase.js";
import { initTheme, setTheme } from "./theme.js";
import LoginIntegrated, { needsSecondFactor, NewPasswordScreen } from "./components/Auth/LoginIntegrated.jsx";
import ChangePassword from "./ChangePassword.jsx";
import { useTranslation } from "react-i18next";
import { perspectiveService, okrService, kpiService, initiativeService, alertService, objectivesService, autoAlertService, notificationService, setNotifyFn, setPerfilActivoResolver } from "./services.js";
import { OKRForm, KPIForm, InitiativeForm, Modal } from "./forms.jsx";
import { AddBtn, TabBar, EmptyState, ConfirmationModal } from "./SharedUI.jsx";
import toast, { Toaster } from "react-hot-toast";
import AdminPanel from "./AdminPanel.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { BRAND } from "./brand.js";
import { rolDe, ROL_ETIQUETA } from "./roles.js";
import CommandCenter from "./CommandCenter.jsx";
import Dashboard from "./Dashboard.jsx";
import AIInsights from "./AIInsights.jsx";
import ExecutivePanel from "./ExecutivePanel.jsx";
import Chat from "./Chat.jsx";
import Benchmark from "./Benchmark.jsx";
import StrategicEngine from "./StrategicEngine.jsx";
import StrategicBus from "./StrategicBus.jsx";
import IntelligentCore from "./IntelligentCore.jsx";
import { useStore } from "./store.js";

// Registrar bridge de notificaciones (evita importación circular con store)
// Dual bridge: guarda en store (historial) + muestra toast visual inmediatamente
// La capa de datos consulta el perfil activo para mensajes de permiso claros
setPerfilActivoResolver(() => { const st = useStore.getState(); return st.impersonatedProfile || st.profile; });

setNotifyFn((notif) => {
  useStore.getState().addNotification(notif);
  const msg = notif.message || '';
  const opts = { duration: 4000, style: { fontFamily: "var(--font-body)", fontSize: 13, maxWidth: 400 } };
  if (notif.type === 'success') toast.success(msg, opts);
  else if (notif.type === 'error')   toast.error(msg, { ...opts, duration: 6000 });
  else if (notif.type === 'warning') toast(msg, { ...opts, icon: '⚠️' });
  else toast(msg, opts);
});

// Lazy loaded heavy modules para optimizar el bundle (Performance)
const BowlingChart = lazy(() => import("./BowlingChart.jsx"));
const Simulator = lazy(() => import("./Simulator.jsx"));
const StrategyMap = lazy(() => import("./StrategyMap.jsx"));
const Export = lazy(() => import("./Export.jsx"));
const DocAnalyzer = lazy(() => import("./DocAnalyzer.jsx"));
const RadarStrategic = lazy(() => import("./RadarStrategic.jsx"));
const PowerPoint = lazy(() => import("./PowerPoint.jsx"));
const ModuloOKRs = lazy(() => import("./ModuloOKRs.jsx"));
const ModuloKPIs = lazy(() => import("./ModuloKPIs.jsx"));
const ModuloIniciativas = lazy(() => import("./ModuloIniciativas.jsx"));
const ModuloRiesgos = lazy(() => import("./ModuloRiesgos.jsx"));
const ModuloExpedientes = lazy(() => import("./ModuloExpedientes.jsx"));
import { activarExpediente } from "./ModuloExpedientes.jsx";

const ModuleSkeleton = () => (
  <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
    <div style={{ height: 40, background: "var(--bg3)", borderRadius: 8, width: "30%" }}></div>
    <div style={{ height: 400, background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}></div>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }
  static getDerivedStateFromError(error) {
    // Detectar error de chunk caducado (deploy nuevo con hash diferente)
    const isChunkError =
      error?.name === 'TypeError' &&
      (error?.message?.includes('Failed to fetch dynamically imported') ||
       error?.message?.includes('Importing a module script failed') ||
       error?.message?.includes('error loading dynamically imported module'));
    return { hasError: true, error, isChunkError };
  }
  componentDidCatch(error) {
    // Auto-recarga silenciosa si es error de chunk caducado
    if (
      error?.message?.includes('Failed to fetch dynamically imported') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module')
    ) {
      // Solo recargar una vez para evitar bucle infinito
      const reloadedKey = 'xtratia-chunk-reload';
      if (!sessionStorage.getItem(reloadedKey)) {
        sessionStorage.setItem(reloadedKey, '1');
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--gold)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
            <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>Nueva versión disponible</h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>Se detectó una actualización de la aplicación. Recargando...</p>
            <button onClick={() => window.location.reload()} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff' }}>Recargar ahora</button>
          </div>
        );
      }
      return (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--red)' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>⚠️ Error en el módulo</h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>{this.state.error?.message}</p>
          <button onClick={() => { sessionStorage.removeItem('xtratia-chunk-reload'); this.setState({ hasError: false, error: null }); }} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18}}>
      <BrandLogo size={56} variant="mark" />
      <div className="brand-display" style={{fontSize:22,color:"var(--text)"}}>{BRAND.name}</div>
      <div style={{width:120,height:2,background:"var(--border)",borderRadius:2,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",inset:0,width:"40%",background:"var(--accent)",animation:"pulse 1.2s ease infinite"}}/>
      </div>
    </div>
  );
}

function ThemeToggle({theme,onToggle}){
  return <button onClick={onToggle} style={{width:36,height:36,borderRadius:9,border:"1px solid var(--border)",background:"var(--bg3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{theme==="dark"?"☀️":"🌙"}</button>;
}

function CentroEstrategico(){
  const [tab,setTab]=useState("engine");
  // data, profile y onDataRefresh se eliminaron porque los hijos ya consumen del store. 
  // Si se llegaran a necesitar en este nivel, se usarían los selectores.
  return(
    <div>
      <div className="page-header"><div><div className="page-title">⚡ Centro Estrategico</div><div className="page-subtitle">Motor IA + Bus de comunicacion + Nucleo inteligente</div></div></div>
      <TabBar tabs={[{id:"engine",icon:"⚡",label:"Motor IA"},{id:"bus",icon:"🔗",label:"Bus Estrategico"},{id:"core",icon:"🧠",label:"Nucleo Inteligente"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="engine"&&<StrategicEngine />}
        {tab==="bus"&&<StrategicBus />}
        {tab==="core"&&<IntelligentCore />}
      </div>
    </div>
  );
}

function ModuloEstrategia({ onDeleteObjective }){
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🗺️ Mapa Estratégico</div><div className="page-subtitle">Diseño visual de Causa y Efecto (Balanced Scorecard)</div></div></div>
      <div className="fade-up">
        <StrategyMap onCreateObjective={async function(form){
          try { await objectivesService.create(form); }
          catch(e) { notificationService.error("Error al crear objetivo: " + e?.message); }
        }} onDeleteObjective={onDeleteObjective} onUpdateObjective={async function(id, form){
          try { 
            await objectivesService.update(id, form); 
          } catch(e) { 
            if (e?.message?.includes('schema cache') || e?.message?.includes('Could not find')) {
              notificationService.error("Acción requerida en BD: Agrega la columna 'theme' (tipo text) en la tabla 'objectives'.");
            } else {
              notificationService.error("Error al actualizar: " + e?.message);
            }
          }
        }}/>
      </div>
    </div>
  );
}

function ModuloIA(){
  const [tab,setTab]=useState("chat");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">🤖 Inteligencia IA</div><div className="page-subtitle">Chat + IA Estrategica + Analisis de Documentos</div></div></div>
      <TabBar tabs={[{id:"chat",icon:"💬",label:"Chat IA"},{id:"ai",icon:"🤖",label:"IA Estrategica"},{id:"docs",icon:"📂",label:"Analizar Docs"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="chat"&&<Chat />}
        {tab==="ai"&&<AIInsights />}
        {tab==="docs"&&<DocAnalyzer />}
      </div>
    </div>
  );
}

function ModuloAnalitica(){
  const [tab,setTab]=useState("dashboard");
  const onNavigate = useStore.use.setActiveModule();
  return(
    <div>
      <div className="page-header"><div><div className="page-title">📈 Analitica</div><div className="page-subtitle">Dashboard + Panel Ejecutivo + Radar + Benchmark</div></div></div>
      <TabBar tabs={[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"executive",icon:"👔",label:"Panel Ejecutivo"},{id:"radar",icon:"📡",label:"Radar 360"},{id:"benchmark",icon:"🏆",label:"Benchmark"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="dashboard"&&<Dashboard onNavigate={onNavigate}/>}
        {tab==="executive"&&<ExecutivePanel />}
        {tab==="radar"&&<RadarStrategic />}
        {tab==="benchmark"&&<Benchmark />}
      </div>
    </div>
  );
}

function ModuloReportes(){
  const [tab,setTab]=useState("export");
  return(
    <div>
      <div className="page-header"><div><div className="page-title">📤 Reportes</div><div className="page-subtitle">PDF + Excel + Word + PowerPoint profesionales</div></div></div>
      <TabBar tabs={[{id:"export",icon:"📤",label:"PDF / Excel / Word"},{id:"ppt",icon:"📊",label:"PowerPoint"}]} active={tab} onChange={setTab}/>
      <div className="fade-up">
        {tab==="export"&&<Export />}
        {tab==="ppt"&&<PowerPoint />}
      </div>
    </div>
  );
}

function Avatar({name}){
  return <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700}}>{(name||"U")[0].toUpperCase()}</div>;
}

function ModuloAlertas(){
  // Seleccionamos los datos crudos del store
  const staticAlerts = useStore(state => state.alerts);
  const okrs = useStore(state => state.okrs);
  
  // Replicamos la lógica de 'enhancedData' para crear alertas dinámicas, memoizado para rendimiento
  const alerts = React.useMemo(() => {
    const dynamicAlerts = (okrs || []).reduce((acc, okr) => {
      if (okr.status === "at_risk") acc.push({ id: `dyn-risk-${okr.id}`, title: `Riesgo Crítico: ${okr.objective}`, message: `Responsable: ${okr.owner || "Sin asignar"}`, severity: "critical", is_read: false }); return acc;
    }, []);
    return [...dynamicAlerts, ...(staticAlerts || [])].sort((a, b) => a.is_read - b.is_read);
  }, [okrs, staticAlerts]);
  
  const unread = alerts.filter(a => !a.is_read);

  const handleMarkAsRead = async (al) => {
    if (String(al.id).startsWith('dyn-')) {
      notificationService.info("Esta es una alerta dinámica en tiempo real. Se resolverá automáticamente al mejorar el indicador.");
      return;
    }
    try { await alertService.update(al.id, { is_read: true }); }
    catch(e) { logger.error(e); }
  };

  return(
    <div>
      <div className="page-header"><div><div className="page-title">🔔 Centro de Alertas</div><div className="page-subtitle">{unread.length} sin leer de {alerts.length} totales</div></div></div>
      {(alerts.length === 0) ?
        <EmptyState icon="🔔" title="Sin alertas activas" desc="Todo esta funcionando correctamente"/>:
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {alerts.map(function(al){
            var sc=al.severity==="critical"?"var(--red)":al.severity==="warning"?"var(--gold)":"var(--teal)";
            return(
              <div key={al.id} className="sp-card sp-card-hover scale-in" style={{padding:20, borderLeft:`4px solid ${sc}`, background: al.is_read ? 'var(--bg)' : 'var(--bg2)', opacity: al.is_read ? 0.6 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: 16}}>
                <div style={{width: 44, height: 44, borderRadius: 14, background: `${sc}15`, color: sc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: `inset 0 0 0 1px ${sc}30`}}>
                  {al.severity === "critical" ? "🚨" : al.severity === "warning" ? "⚠️" : "ℹ️"}
                </div>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                    <div style={{fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px'}}>{al.title}</div>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                      <span className="sp-badge" style={{background: `${sc}15`, color: sc, border: `1px solid ${sc}40`, padding: '4px 12px', borderRadius: 99}}>{al.severity === "critical" ? "Prioridad Alta" : al.severity === "warning" ? "Atención" : "Informativo"}</span>
                      {al.is_read && <span className="sp-badge" style={{background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 99}}>Leída</span>}
                    </div>
                  </div>
                  <div style={{fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: !al.is_read ? 16 : 0}}>{al.message}</div>
                  {!al.is_read && (
                    <button onClick={() => handleMarkAsRead(al)} className="sp-btn" style={{padding: "8px 20px", fontSize: 12, fontWeight: 700, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 99, transition: 'all 0.2s'}} onMouseEnter={e => {e.currentTarget.style.borderColor=sc; e.currentTarget.style.color=sc;}} onMouseLeave={e => {e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text)';}}>
                      ✔ Marcar como resuelta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  // Selectors for Zustand store
  const realProfile = useStore(state => state.profile);
  const user = useStore(state => state.user);
  const setAuth = useStore(state => state.setAuth);

  const handleLangChange = async (newLang) => {
    // 1. Evita procesar si el idioma ya es el seleccionado.
    if (i18n.language.startsWith(newLang.substring(0, 2))) {
      return;
    }

    // 2. Cambia el idioma de la UI directamente para una respuesta instantánea.
    i18n.changeLanguage(newLang);
    localStorage.setItem('xtratia-lang', newLang);

    // 3. Si hay un perfil, actualiza el estado y la BD en segundo plano.
    if (realProfile?.id) {
      // Actualiza el estado local de forma optimista.
      setAuth(user, { ...realProfile, preferred_language: newLang });

      // Persiste el cambio en la base de datos de forma asíncrona.
      try {
        const { error } = await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', realProfile.id);
        if (error) throw error; // El error se registrará en la consola.
      } catch (dbError) {
        logger.error("Error al guardar preferencia de idioma:", dbError);
        notificationService.error(`No se pudo guardar el idioma: ${dbError.message}`);
      }
    }
  };

  const buttonStyle = (lang) => ({
    background: i18n.language.startsWith(lang) ? 'var(--bg)' : 'transparent',
    color: i18n.language.startsWith(lang) ? 'var(--text)' : 'var(--text3)',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg3)', borderRadius: 9, border: '1px solid var(--border)', padding: 4 }}>
      <button onClick={() => handleLangChange('es-MX')} style={buttonStyle('es')} title="Cambiar a Español">🇲🇽 <span className="hide-on-mobile-small">Español</span></button>
      <button onClick={() => handleLangChange('en-US')} style={buttonStyle('en')} title="Switch to English">🇺🇸 <span className="hide-on-mobile-small">English</span></button>
    </div>
  );
}

function CommandPalette({onNavigate,onClose,data}){
  const [query,setQuery]=useState("");
  var ACTIONS=[
    {icon:"🏠",label:"Inicio — Command Center",module:"home"},
    {icon:"⚡",label:"Centro Estrategico — Motor + Bus + Nucleo",module:"centro"},
    {icon:"🗺️",label:"Mapa Estratégico — BSC y Visión 360",module:"estrategia"},
    {icon:"🎯",label:"OKRs — Lista y Generador IA",module:"okrs"},
    {icon:"📊",label:"KPIs — Indicadores + Bowling + Prediccion",module:"kpis"},
    {icon:"🚀",label:"Iniciativas — Lista + Kanban + Simulador",module:"iniciativas"},
    {icon:"🗂️",label:"Expedientes — Portafolio de clientes",module:"expedientes"},
    {icon:"🛡️",label:"Riesgos y controles — Mapa de calor, controles y planes de acción",module:"riesgos"},
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
  },[onClose]); // onClose was missing as a dependency
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:9999,paddingTop:120}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:540,background:"var(--bg2)",borderRadius:16,border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:16,color:"var(--text3)"}}>🔍</span>
          <input autoFocus value={query} onChange={function(e){setQuery(e.target.value);}} placeholder="Buscar modulos y acciones..." style={{flex:1,border:"none",background:"transparent",fontSize:14,color:"var(--text)",outline:"none",fontFamily:"var(--font-body)",fontWeight:500}}/>
          <kbd style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--text3)"}}>ESC</kbd>
        </div>
        <div style={{maxHeight:360,overflowY:"auto",padding:6}}>
          {filtered.map(function(a,i){
            return(
              <button key={i} onClick={function(){onNavigate(a.module);onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:9,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",fontFamily:"var(--font-body)",transition:"all .1s"}} onMouseEnter={function(e){e.currentTarget.style.background="var(--primary-light)";}} onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
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

// MainApp es un componente muy grande que maneja gran parte de la lógica de la aplicación.
// Para mejorar la mantenibilidad y seguir los principios de Clean Code, se podría refactorizar
// extrayendo lógica a hooks personalizados (ej. useModals, usePaymentStatus, useRealtime)
// y componentes más pequeños.
function SelectorExpediente({ onAdministrar }) {
  const actual = useStore(function(s){ return s.currentClient; });
  const clientes = useStore(function(s){ return s.clients; }) || [];
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(function(){
    function fuera(e){ if (ref.current && !ref.current.contains(e.target)) setAbierto(false); }
    document.addEventListener("mousedown", fuera);
    return function(){ document.removeEventListener("mousedown", fuera); };
  }, []);
  if (!actual) return null;
  var activos = clientes.filter(function(c){ return c.status !== "cerrado"; });
  var Punto = function(p){ return p.c.logo_url
    ? <img src={p.c.logo_url} alt="" style={{width:20,height:20,borderRadius:6,objectFit:"contain",background:"#fff"}}/>
    : <span style={{width:20,height:20,borderRadius:6,background:p.c.color,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{(p.c.name||"?").charAt(0).toUpperCase()}</span>; };
  return (
    <div ref={ref} style={{position:"relative",marginLeft:8}}>
      <button className="header-action" onClick={function(){ setAbierto(!abierto); }} aria-haspopup="listbox" aria-expanded={abierto}
        title="Cambiar de expediente" style={{gap:8,paddingLeft:8,maxWidth:260}}>
        <Punto c={actual}/>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{actual.name}</span>
        <span style={{fontSize:10,color:"var(--text3)"}}>▾</span>
      </button>
      {abierto && (
        <div className="sp-card" role="listbox" style={{position:"absolute",top:"calc(100% + 8px)",left:0,width:300,padding:6,zIndex:300,boxShadow:"var(--shadow-lg)",maxHeight:380,overflowY:"auto"}}>
          <div style={{fontSize:11,color:"var(--text3)",padding:"6px 10px"}}>Expedientes</div>
          {activos.map(function(c){
            var sel = c.id === actual.id;
            return (
              <button key={c.id} role="option" aria-selected={sel} onClick={function(){ setAbierto(false); if(!sel) activarExpediente(c.id); }}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,border:"none",cursor:"pointer",
                  background:sel?"var(--primary)":"transparent",color:sel?"#fff":"var(--text)",textAlign:"left",fontSize:14}}>
                <Punto c={c}/>
                <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                {c.is_internal && <span style={{fontSize:10,opacity:.7}}>Interno</span>}
              </button>
            );
          })}
          <div style={{borderTop:"1px solid var(--border)",margin:"6px 0"}}/>
          <button onClick={function(){ setAbierto(false); onAdministrar(); }}
            style={{width:"100%",padding:"8px 10px",borderRadius:10,border:"none",cursor:"pointer",background:"transparent",color:"var(--primary)",textAlign:"left",fontSize:14}}>
            Administrar expedientes…
          </button>
        </div>
      )}
    </div>
  );
}

function MainApp({ onLogout, onSuperAdmin }){

  // Consumimos el estado global, selectores y manejadores de Zustand
  const loadingData = useStore.use.loadingData();
  const activeModule = useStore.use.activeModule();
  const loadAllData = useStore.use.loadAllData();
  const setActiveModule = useStore.use.setActiveModule();
  const globalError = useStore.use.globalError();
  const clearError = useStore.use.clearError();
  // **OPTIMIZACIÓN CRÍTICA**: Se agrupan todos los selectores de estado que devuelven
  // objetos o arrays en una sola llamada a `useStore` con el comparador `shallow`.
  // Se refactoriza a selectores atómicos para prevenir el bucle infinito de re-renderizados
  // ("Maximum update depth exceeded") causado por la creación de nuevos objetos en el selector.
  const alerts = useStore(state => state.alerts);
  const objectives = useStore(state => state.objectives);
  const realProfile = useStore(state => state.profile);
  const user = useStore(state => state.user);
  const impersonatedProfile = useStore(state => state.impersonatedProfile);
  const currentOrganization = useStore(state => state.currentOrganization);

  const clearImpersonation = useStore.use.clearImpersonation();
  const setAuth = useStore(state => state.setAuth);
  const profile = impersonatedProfile || realProfile;

  const setupSubscriptions = useStore.use.setupSubscriptions();
  const can = useStore.use.can();
  const rolActivo = rolDe(profile);
  const soloConsulta = rolActivo === 'viewer';
  useEffect(() => {
    document.documentElement.setAttribute('data-rol', rolActivo || 'viewer');
    return () => document.documentElement.removeAttribute('data-rol');
  }, [rolActivo]);
  const unsubscribeRealtime = useStore.use.unsubscribeRealtime();
  const requestPushNotifications = useStore.use.requestPushNotifications();
  // La visibilidad del botón depende SOLO del rol en la base de datos (is_super_admin o Admin).
  const canTrySuperAdmin = !impersonatedProfile && (realProfile?.is_super_admin || ['admin','Admin','super_admin'].includes(realProfile?.role));

  const { t, i18n } = useTranslation();
  const [modal,setModal]=useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [theme,setThemeState]=useState(function(){return localStorage.getItem("sp-theme")||"light";});
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [cmdOpen,setCmdOpen]=useState(false);
  const [dismissedToasts,setDismissedToasts]=useState([]);
  const [zenMode, setZenMode] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const openConfirmationModal = ({ title, message, onConfirm }) => {
    setConfirmationModal({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: null });
  };

  const handleDeleteObjective = (id) => {
    openConfirmationModal({
        title: 'Confirmar Eliminación de Objetivo',
        message: '¿Estás seguro de que deseas eliminar este objetivo estratégico? Todos los OKRs vinculados quedarán huérfanos. Esta acción no se puede deshacer.',
        onConfirm: async () => {
            try {
                await objectivesService.delete(id);
                notificationService.success("Objetivo eliminado correctamente.");
            } catch (e) { notificationService.error("Error al eliminar: " + e?.message); }
            closeConfirmationModal();
        },
    });
  };

  const handleDeleteOKR = (id) => {
    openConfirmationModal({
        title: 'Confirmar Eliminación de OKR',
        message: '¿Estás seguro de que deseas eliminar este OKR? Esta acción no se puede deshacer.',
        onConfirm: async () => {
            try {
                await okrService.delete(id);
                notificationService.success("OKR eliminado correctamente.");
            } catch (e) { notificationService.error("Error al eliminar OKR: " + e?.message); }
            closeConfirmationModal();
        },
    });
  };

  const handleDeleteInitiative = (id) => {
    openConfirmationModal({
        title: 'Confirmar Eliminación de Iniciativa',
        message: '¿Estás seguro de que deseas eliminar esta iniciativa? Esta acción no se puede deshacer.',
        onConfirm: async () => {
            try {
                await initiativeService.delete(id);
                notificationService.success("Iniciativa eliminada correctamente.");
            } catch (e) { notificationService.error("Error al eliminar iniciativa: " + e?.message); }
            closeConfirmationModal();
        },
    });
  };

  const handleDeleteKPI = (id) => {
    openConfirmationModal({
        title: 'Confirmar Eliminación de KPI',
        message: '¿Estás seguro de que deseas eliminar este Indicador Clave de Desempeño? Esta acción no se puede deshacer.',
        onConfirm: async () => {
            try {
                await kpiService.delete(id);
                notificationService.success("KPI eliminado correctamente.");
            } catch (e) { notificationService.error("Error al eliminar KPI: " + e?.message); }
            closeConfirmationModal();
        },
    });
  };

  useEffect(function(){
    loadAllData();
    setupSubscriptions(); // Iniciamos la conexión por WebSockets

    // Push notifications deshabilitadas: columna push_subscription no existe en profiles
    // TODO: habilitar cuando se agregue la columna a la BD
    
    function handleCmd(e){if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(true);}}
    window.addEventListener("keydown",handleCmd);
    return function(){
      window.removeEventListener("keydown",handleCmd);
      unsubscribeRealtime(); // Limpiamos la conexión al desmontar
    };
  },[]);

  function toggleTheme(){
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); // This is the imported function from theme.js
    setThemeState(next);
    localStorage.setItem("sp-theme", next);
  }

  // Helper centralizado: resuelve el orgId desde el store (currentOrganization es la fuente canónica)
  function getActiveOrgId() {
    const state = useStore.getState();
    return state.currentOrganization?.id
      || state.profile?.organizations?.id
      || state.profile?.organizations?.[0]?.id;
  }

  async function handleSaveOKR(form){
    try {
      const payload = { ...form };
      if (!payload.objective_id || payload.objective_id === "") payload.objective_id = null;
      if (payload.id) {
        const id = payload.id;
        delete payload.id;
        await okrService.update(id, payload);
        notificationService.success("OKR actualizado exitosamente.");
      } else {
        if (!payload.organization_id) payload.organization_id = getActiveOrgId();
        await okrService.create(payload);
        notificationService.success("OKR creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar OKR: " + e?.message); }
  }

  async function handleSaveKPI(form){
    try {
      const payload = { ...form };
      if (payload.id) {
        const id = payload.id;
        delete payload.id;
        await kpiService.update(id, payload);
        notificationService.success("KPI actualizado exitosamente.");
      } else {
        if (!payload.organization_id) payload.organization_id = getActiveOrgId();
        await kpiService.create(payload);
        notificationService.success("KPI creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar KPI: " + e?.message); }
  }

  async function handleSaveInitiative(form){
    try {
      const payload = { ...form };
      if (!payload.organization_id) payload.organization_id = getActiveOrgId();
      await initiativeService.create(payload);
      setModal(null);
      notificationService.success("Iniciativa creada exitosamente.");
    } catch(e) { notificationService.error("Error al guardar Iniciativa: " + e?.message); }
  }

  // currentOrganization es la fuente de verdad; profile.organizations es el fallback del join
  var org = currentOrganization || (profile && profile.organizations && !Array.isArray(profile.organizations) ? profile.organizations : profile?.organizations?.[0]) || null;

  var unreadAlerts=(alerts || []).filter(function(a){return !a.is_read;}).length;
  var criticalToasts=(alerts || []).filter(function(a){return a.severity==="critical"&&!a.is_read&&!dismissedToasts.includes(a.id);});
  var orgName=BRAND.name;

  const toggleZenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => logger.log(e));
      setSidebarCollapsed(true);
      setZenMode(true);
    } else {
      document.exitFullscreen();
      setZenMode(false);
    }
  };

  var NAV_GROUPS = [
    { title: 'Inicio', items: [
        {id:"expedientes",icon:"🗂️", label: 'Expedientes'},
        {id:"home",       icon:"🏠", label: 'Tablero de mando'},
        {id:"centro",     icon:"⚡", label: 'Centro estratégico'} ] },
    { title: 'Planear', items: [
        {id:"estrategia", icon:"🗺️", label: 'Mapa estratégico'},
        {id:"okrs",       icon:"🎯", label: 'OKRs'} ] },
    { title: 'Ejecutar', items: [
        {id:"iniciativas",icon:"🚀", label: 'Iniciativas'} ] },
    { title: 'Medir', items: [
        {id:"kpis",       icon:"📊", label: 'KPIs'},
        {id:"analitica",  icon:"📈", label: 'Analítica 360'} ] },
    { title: 'Controlar', items: [
        {id:"riesgos",    icon:"🛡️", label: 'Riesgos y controles'},
        {id:"alertas",    icon:"🔔", label: 'Alertas'} ] },
    { title: 'Reportar', items: [
        {id:"reportes",   icon:"📤", label: 'Reportes'},
        {id:"ia",         icon:"🤖", label: 'Inteligencia IA'} ] }
  ];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",fontFamily:"var(--font-body)",display:"flex",flexDirection:"column"}}>
      <style>{`
        .hide-on-mobile-small { display: inline; }
        @media (max-width: 1100px) { .hide-on-mobile-small { display: none; } }
      `}</style>

      <div className="barra-superior" style={{height:54,background:"var(--bg2)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="icon-btn" onClick={function(){setSidebarCollapsed(!sidebarCollapsed);}}>{sidebarCollapsed?"☰":"←"}</button>
          <div className="tour-step-logo" style={{display:"flex",alignItems:"center",padding:"0 4px"}}>
            <BrandLogo size={30} />
          </div>
          <SelectorExpediente onAdministrar={function(){ setActiveModule("expedientes"); }} />
          <button className="tour-step-search" onClick={function(){setCmdOpen(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg3)",cursor:"pointer",color:"var(--text3)",fontSize:12,fontFamily:"var(--font-body)",marginLeft:4}}>
            <span>🔍</span><span>Buscar...</span>
            <kbd style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--bg2)",border:"1px solid var(--border)",color:"var(--text3)"}}>⌘K</kbd>
          </button>
        </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button className="icon-btn" onClick={toggleZenMode} title="Modo Presentación (Pantalla Completa)">{zenMode ? '↙️' : '↗️'}</button>
          {unreadAlerts>0&&<button onClick={function(){setActiveModule("alertas");}} className="header-action" style={{color:"var(--red)",borderColor:"rgba(239,68,68,.3)"}}>🔔<span style={{fontWeight:700}}>{unreadAlerts}</span></button>}
                    <ThemeToggle theme={theme} onToggle={toggleTheme}/>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:8,background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <Avatar name={profile&&profile.full_name}/>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{profile&&profile.full_name||"Usuario"}</span>
            <span className="sp-badge" style={{background:"var(--primary-light)",color:"var(--primary)",padding:"2px 7px",fontSize:10}}>{ROL_ETIQUETA[rolActivo] || "Lector"}</span>
          </div>
          {soloConsulta && (
            <span className="sp-badge" title="Tu rol permite consultar la información, no modificarla"
              style={{background:"var(--gold-light)",color:"var(--gold)",padding:"4px 10px",fontSize:11,fontWeight:600,border:"1px solid var(--gold)"}}>
              👁️ Modo consulta
            </span>
          )}
          {/* El acceso al panel de Super Admin se controla con el sistema de permisos `can()` */}
          {/* Esto centraliza la lógica de autorización y elimina la duplicación de roles. */}
          {canTrySuperAdmin && <button className="header-action" onClick={onSuperAdmin} title="Usuarios, identidad y seguridad">⚙️ Administración</button>}
          <LanguageSwitcher />
          <button className="header-action" onClick={onLogout}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div className="tour-step-nav menu-lateral" style={{width:sidebarCollapsed?0:240,minWidth:sidebarCollapsed?0:240,background:"var(--bg2)",borderRight:"1px solid var(--border)",overflowY:"auto",overflowX:"hidden",transition:"all .25s ease",position:"sticky",top:54,height:"calc(100vh - 54px)",flexShrink:0}}>
          {!sidebarCollapsed&&(
            <div style={{padding:"20px 12px"}}>
              {NAV_GROUPS.map(function(group, gIdx){
                return(
                  <div key={gIdx} style={{marginBottom: 16}}>
                    <div style={{fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, paddingLeft: 12, letterSpacing: '0.01em'}}>{group.title}</div>
                    {group.items.map(function(m){
                      var isActive=activeModule===m.id;
                      return(
                        <button key={m.id} className={"nav-item"+(isActive?" active":"")} onClick={function(){setActiveModule(m.id);}}>
                          <span style={{fontSize:16,width:24,textAlign:"center",flexShrink:0}}>{m.icon}</span>
                          <span style={{flex:1}}>{m.label}</span>
                          {m.id==="alertas"&&unreadAlerts>0&&<span style={{fontSize:10,fontWeight:700,background:"var(--red)",color:"#fff",borderRadius:99,padding:"2px 8px",minWidth:20,textAlign:"center"}}>{unreadAlerts}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div style={{padding:"16px 16px 4px",marginTop:8,borderTop:"1px dashed var(--border)"}}>
                <div className="brand-display" style={{fontSize:14,color:"var(--text)"}}>{BRAND.name}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Uso interno · confidencial</div>
              </div>
            </div>
          )}
        </div>

        <div style={{flex:1,padding:24,overflowY:"auto",minWidth:0}}>
        {impersonatedProfile && (
          <div className="fade-up" style={{ background: 'var(--violet)', color: '#fff', padding: '16px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 32 }}>🕵️‍♂️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Modo Impersonación Activo</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Estás viendo y operando la plataforma exactamente como la ve <strong>{impersonatedProfile.full_name}</strong> ({impersonatedProfile.role}).</div>
              </div>
            </div>
            <button onClick={clearImpersonation} className="sp-btn" style={{ background: '#fff', color: 'var(--violet)', border: 'none', padding: '8px 16px', fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Salir de Impersonación
            </button>
          </div>
        )}
        {globalError && (
          <div className="fade-up" style={{ background: 'var(--red)', color: '#fff', padding: '16px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 16px rgba(220,38,38,0.3)', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Problema de Conexión o Sincronización</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{globalError}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button onClick={() => loadAllData()} className="sp-btn" style={{ background: '#fff', color: 'var(--red)', border: 'none', padding: '8px 16px', fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                🔄 Reintentar
              </button>
              <button onClick={clearError} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 24, opacity: 0.7, padding: 0, lineHeight: 1 }} title="Ocultar advertencia" onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.7}>×</button>
            </div>
          </div>
        )}
          {loadingData?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:80,gap:14}}>
              <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid var(--border)",borderTopColor:"var(--primary)",animation:"spin 1s linear infinite"}}/>
              <div style={{fontSize:13,color:"var(--text3)",fontWeight:500}}>Cargando datos estrategicos...</div>
            </div>
          ):(
          <div className="module-wrap">
    <ErrorBoundary key={activeModule}>
      <Suspense fallback={<ModuleSkeleton />}>
              {activeModule==="home"&&<CommandCenter />}
              {activeModule==="centro"&&<CentroEstrategico />}
              {activeModule==="estrategia"&&<ModuloEstrategia onDeleteObjective={handleDeleteObjective} />}
              {activeModule==="okrs"&&<ModuloOKRs onModal={function(m){if(!can("create","okrs"))return;setEditingItem(null);setModal(m);}} onEdit={function(item){if(!can("update","okrs"))return;setEditingItem(item);setModal("okr");}} onDelete={handleDeleteOKR} />}
              {activeModule==="kpis"&&<ModuloKPIs onModal={function(m){if(!can("create","kpis"))return;setEditingItem(null);setModal(m);}} onEdit={function(item){if(!can("update","kpis"))return;setEditingItem(item);setModal("kpi");}} onDelete={handleDeleteKPI} onCreateOkrFromKpi={function(kpi){
                setEditingItem({ objective: `Optimizar indicador: ${kpi.name}`, status: 'not_started', progress: 0, period: 'Q' + (Math.floor(new Date().getMonth() / 3) + 1) + '-' + new Date().getFullYear(), department: '', owner: kpi.owner || '', confidence_level: 8, krs: [{title: `Llevar ${kpi.name} de ${kpi.value||0}${kpi.unit} a la meta de ${kpi.target}${kpi.unit}`, owner: kpi.owner || '', completed: false, deadline: ''}] });
                setModal("okr");
              }}/>}
              {activeModule==="riesgos"&&<ModuloRiesgos />}
              {activeModule==="expedientes"&&<ModuloExpedientes />}
              {activeModule==="iniciativas"&&<ModuloIniciativas onModal={function(m){if(!can("create","initiatives"))return;setModal(m);}} onDelete={handleDeleteInitiative} />}
              {activeModule==="ia"&&<ModuloIA />}
              {activeModule==="analitica"&&<ModuloAnalitica />}
              {activeModule==="reportes"&&<ModuloReportes />}
              {activeModule==="alertas"&&<ModuloAlertas />}
      </Suspense>
    </ErrorBoundary>
          </div>
          )}
        </div>
      </div>

      {cmdOpen&&<CommandPalette onNavigate={setActiveModule} onClose={function(){setCmdOpen(false);}} />}
      {modal==="okr"&&<Modal onClose={function(){setModal(null);setEditingItem(null);}}><OKRForm onSave={handleSaveOKR} onCancel={function(){setModal(null);setEditingItem(null);}} objectives={objectives || []} initialData={editingItem}/></Modal>}
      {modal==="kpi"&&<Modal onClose={function(){setModal(null);setEditingItem(null);}}><KPIForm onSave={handleSaveKPI} onCancel={function(){setModal(null);setEditingItem(null);}} initialData={editingItem}/></Modal>}
      {modal==="initiative"&&<Modal onClose={function(){setModal(null);}}><InitiativeForm onSave={handleSaveInitiative} onCancel={function(){setModal(null);}}/></Modal>}

      <ConfirmationModal 
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />

      {/* Toast notifications — posición bottom-right, 4s auto-dismiss */}
      <Toaster
        position="bottom-right"
        gutter={8}
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </div>
  );
}

export default function App(){
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [superAdminActive, setSuperAdminActive] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Se leen los datos de autenticación directamente del store de Zustand como única fuente de verdad.
  // **OPTIMIZACIÓN CRÍTICA**: Se refactoriza a selectores atómicos para prevenir el bucle infinito de re-renderizados
  // ("Maximum update depth exceeded") causado por la creación de nuevos objetos en el selector.
  const user = useStore(state => state.user);
  const profile = useStore(state => state.profile);
  const setAuth = useStore(state => state.setAuth);
  const passwordRotationDue = useStore(state => state.passwordRotationDue);

  const profileLoadingRef = useRef(false);

  useEffect(function(){
    initTheme();

    // Suscribirse PRIMERO para no perdernos el evento PASSWORD_RECOVERY
    var sub = supabase.auth.onAuthStateChange(function(event, session){
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setLoading(false);
        return;
      }
      if (event === 'USER_UPDATED') {
        // Cambio de contraseña o datos: la sesión sigue activa, no se expulsa al usuario
        return;
      }
      if (event === 'SIGNED_OUT') {
        setMfaPending(false);
        setRecoveryMode(false);
        setAuth(null, null);
        setLoading(false);
        profileLoadingRef.current = false;
        return;
      }
      if (session && session.user && !profileLoadingRef.current) {
        profileLoadingRef.current = true;
        loadProfile(session.user).finally(() => { profileLoadingRef.current = false; });
      } else if (!session) {
        setLoading(false);
        setAuth(null, null);
      }
    });

    // Luego verificar si ya hay sesión activa (solo si onAuthStateChange no lo tomó)
    supabase.auth.getSession().then(function(res){
      var session = res.data.session;
      if (session && session.user && !profileLoadingRef.current) {
        profileLoadingRef.current = true;
        loadProfile(session.user).finally(() => { profileLoadingRef.current = false; });
      } else if (!session) {
        setLoading(false);
      }
    });

    return () => sub.data.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]); // Solo al montar — setAuth es estable desde el store

  async function loadProfile(currentUser){
    try{
      // Candado de verificación en dos pasos: sin el código no se carga el perfil
      if (await needsSecondFactor()) {
        setMfaPending(true);
        setLoading(false);
        return;
      }
      setMfaPending(false);
      // ========================================
      // MEJORADO: Incluir organization_roles JSONB para soporte multi-tenant
      // Si la columna no existe en la BD, Supabase ignorará silenciosamente
      // ========================================
      var res=await supabase.from("profiles")
        .select("*")
        .eq("id",currentUser.id).maybeSingle();
      // Instancia única: la "organización" es la configuración institucional (instance_settings)
      var inst = await supabase.from("instance_settings").select("*").eq("id",1).maybeSingle();
      
      // **MEJORA DE ROBUSTEZ**: Si un usuario está autenticado pero no tiene un perfil en la BD,
      // es un estado de error crítico. Lo notificamos y lo deslogueamos para evitar inconsistencias.
      if (!res.data) {
        logger.error(`CRITICAL: No profile found for authenticated user ID: ${currentUser.id}. Check RLS policies and data integrity in 'profiles' table.`);
        notificationService.error("Error de cuenta: No se pudo cargar tu perfil. Contacta a soporte.");
        // Desloguear al usuario para prevenir que la app quede en un estado roto.
        await supabase.auth.signOut();
        setAuth(null, null);
        setLoading(false);
        return; // Detener la ejecución
      }

      const profileData = { ...res.data, organizations: inst.data || { id: 1, name: BRAND.legalName } };

      // Sincronización inicial del idioma al cargar el perfil
      const initialLang = profileData?.preferred_language;
      if (initialLang && !i18n.language.startsWith(initialLang.substring(0, 2))) {
          i18n.changeLanguage(initialLang);
      }

      // Expedientes: catálogo y expediente activo (la base filtra todos los datos por este expediente)
      const cl = await supabase.from("clients").select("*").order("is_internal", { ascending: false }).order("name");
      const listaClientes = cl.data || [];
      const actual = listaClientes.find(c => c.id === profileData.current_client_id) || listaClientes.find(c => c.is_internal) || null;
      useStore.setState({ clients: listaClientes, currentClient: actual });

      setAuth(currentUser, profileData);
    } catch(e) {
      logger.error("Error cargando el perfil:",e);
      notificationService.error(`Error de red al cargar perfil: ${e?.message}`);
    } finally { setLoading(false); }
  }

  async function handleLogout(){
    try {
      logger.info('User logout initiated', { timestamp: new Date().toISOString() });

      // Cierre de sesión completo
      // ============================================

      // 1. Stop WebSocket realtime subscriptions
      try {
        const unsubscribeRealtime = useStore.getState().unsubscribeRealtime;
        if (unsubscribeRealtime) unsubscribeRealtime();
        logger.info('Realtime subscriptions stopped');
      } catch (e) {
        logger.warn('Failed to stop realtime subscriptions:', e);
      }

      // 2. Clear notification queue via store action
      try {
        const store = useStore.getState();
        if (store.notifications?.length) {
          store.notifications.forEach(n => store.removeNotification?.(n.id));
        }
        logger.info('Notifications cleared');
      } catch (e) {
        logger.warn('Failed to clear notifications:', e);
      }

      // 3. Clear localStorage comprehensively (JWT monitoring cleanup)
      const cacheKeysToClean = [
        'sp-theme',
        'sp-user-session',
        'sp-auth-token',
        'sp-notifications',
        'sp-preferences',
        'xtratia-chunk-reload',
        'cyc-theme',
        'xtratia-lang',
        'user-id',
        'organization-id',
        'auth-timestamp',
        'jwt-token'
      ];
      cacheKeysToClean.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          logger.warn(`Failed to remove localStorage key: ${key}`, e);
        }
      });
      logger.info('localStorage cleared');

      // 4. Clear sessionStorage entirely
      try {
        sessionStorage.clear();
        logger.info('sessionStorage cleared');
      } catch (e) {
        logger.warn('Failed to clear sessionStorage:', e);
      }

      // 5. Clear cookies (Supabase auth tokens, etc)
      try {
        // Clear Supabase-related cookies
        const cookieNames = [
          'sb-auth-token',
          'sb-refresh-token',
          'sb-access-token',
          'authentication'
        ];
        cookieNames.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        });
        logger.info('Cookies cleared');
      } catch (e) {
        logger.warn('Failed to clear cookies:', e);
      }

      // 6. Invalidate JWT tokens via Supabase signOut (server-side invalidation)
      try {
        await supabase.auth.signOut();
        logger.info('JWT tokens invalidated via Supabase signOut');
      } catch (e) {
        logger.warn('Supabase signOut error:', e);
        // Continue even if Supabase signOut fails
      }

      // 7. Reset Zustand store state completely
      try {
        setAuth(null, null);
        setSuperAdminActive(false);

        // Reset any other store state
        const store = useStore.getState();
        if (store.clearAllData) {
          store.clearAllData();
        }
        logger.info('Store state reset');
      } catch (e) {
        logger.warn('Failed to reset store:', e);
      }

      // 8. UI state (modal/sidebar) is reset automatically when profile becomes null
      // and MainApp unmounts — no local state refs needed here.

      // 9. Clear any cached data in memory
      try {
        if (window.___xtratia_cache___) {
          delete window.___xtratia_cache__;
        }
        logger.info('Memory cache cleared');
      } catch (e) {
        logger.warn('Failed to clear memory cache:', e);
      }

      // 10. Reset theme to default
      try {
        localStorage.removeItem('sp-theme');
        logger.info('Theme reset to default');
      } catch (e) {
        logger.warn('Failed to reset theme:', e);
      }

      // Show success notification
      notificationService.success('Sesión cerrada correctamente. Has sido desconectado de forma segura.');
      logger.info('User logout completed successfully');

      // Automatic redirect to login via profile state change
    } catch (error) {
      logger.error('Error during logout:', error);

      // Force logout even if errors occurred (fail-safe)
      try {
        setAuth(null, null);
        setSuperAdminActive(false);
      } catch (e) {
        logger.error('Failed to force logout state:', e);
      }

      notificationService.error('Error al cerrar sesión. Intenta de nuevo o recarga la página.');
    }
  }

  const isAdmin = !!(profile?.is_super_admin || ['admin','Admin','super_admin'].includes(profile?.role));
  const activateSuperAdminMode = () => {
    if (isAdmin) setSuperAdminActive(true);
    else notificationService.error("Solo un administrador puede abrir este panel.");
  };

  if (recoveryMode) {
    return (
      <NewPasswordScreen
        onDone={async () => {
          setRecoveryMode(false);
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) { setLoading(true); await loadProfile(data.session.user); }
        }}
      />
    );
  }
  if (loading) return <LoadingScreen />;
  // **MEJORA DE ROBUSTEZ**: No renderizar la app principal hasta que el perfil esté cargado.
  // Usamos `profile` como única fuente de verdad (se carga junto con `user` en setAuth).
  if (!profile || mfaPending) {
    return (
      <LoginIntegrated
        key={mfaPending ? 'mfa' : 'login'}
        mfaPending={mfaPending}
        onVerified={async () => {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) { setLoading(true); await loadProfile(data.session.user); }
        }}
      />
    );
  }

  if (profile && !isAdmin && !useStore.getState().currentClient) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24}}>
        <div className="sp-card" style={{maxWidth:440,padding:32,textAlign:"center"}}>
          <BrandLogo size={40} variant="mark" />
          <h1 className="page-title" style={{fontSize:24,marginTop:16}}>Sin expedientes asignados</h1>
          <p className="page-subtitle" style={{marginBottom:20}}>Tu cuenta está activa, pero aún no tienes acceso a ninguna empresa. Pide al administrador de Cabrera &amp; Consultores que te asigne tus expedientes.</p>
          <button className="sp-btn" onClick={handleLogout} style={{background:"var(--primary)",color:"#fff"}}>Cerrar sesión</button>
        </div>
      </div>
    );
  }
  if (superAdminActive && isAdmin) {
    return <AdminPanel profile={profile} onBack={() => setSuperAdminActive(false)} />;
  }


  if (passwordRotationDue && profile?.password_rotation_due === true) {
    return <ChangePassword />;
  }

  // Otherwise, render MainApp and the potential code input modal
  return (
    <>
      {/* Banner global: clave de IA Gemini no configurada */}
      {isAdmin && !import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_CLAUDE_API_KEY && !import.meta.env.VITE_GROQ_API_KEY && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99998, background: '#92400e', color: '#fef3c7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
          <span>⚠️</span>
          <span>La IA está desactivada: falta configurar una clave (Gemini, Claude o Groq) en Vercel → Settings → Environment Variables.</span>
        </div>
      )}
      {/* Cualquier usuario autenticado puede acceder — el if (!profile) de arriba ya protege */}
      <MainApp onLogout={handleLogout} onSuperAdmin={activateSuperAdminMode} />
    </>
  );
}
