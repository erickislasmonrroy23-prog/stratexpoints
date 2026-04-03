import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { supabase } from "./supabase.js";
import { initTheme, setTheme } from "./theme.js";
import * as XLSX from "xlsx";
import Login from "./Login.jsx";
import { useTranslation } from "react-i18next";
import { perspectiveService, okrService, kpiService, initiativeService, alertService, objectivesService, autoAlertService, notificationService } from "./services.js";
import { OKRForm, KPIForm, InitiativeForm, Modal } from "./forms.jsx";
import { SC, SL, AddBtn, TabBar, EmptyState, ConfirmationModal } from "./SharedUI.jsx";
import NotificationCenter from "./NotificationCenter.jsx";
import SuperAdmin from "./SuperAdmin.jsx";
import CommandCenter from "./CommandCenter.jsx";
import Dashboard from "./Dashboard.jsx";
import AIInsights from "./AIInsights.jsx";
import ExecutivePanel from "./ExecutivePanel.jsx";
import Chat from "./Chat.jsx";
import Prediction from "./Prediction.jsx";
import OKRGenerator from "./OKRGenerator.jsx";
import Benchmark from "./Benchmark.jsx";
import StrategicEngine from "./StrategicEngine.jsx";
import StrategicBus from "./StrategicBus.jsx";
import IntelligentCore from "./IntelligentCore.jsx";
import { useStore } from "./store.js";
import { shallow } from 'zustand/shallow';
import { deepEqual } from 'fast-equals';

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

const ModuleSkeleton = () => (
  <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
    <div style={{ height: 40, background: "var(--bg3)", borderRadius: 8, width: "30%" }}></div>
    <div style={{ height: 400, background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}></div>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Error aislando módulo:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--red)' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>⚠️ Error renderizando el módulo</h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Reintentar</button>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 16 }}>💡 También puedes usar el menú lateral para navegar a otro módulo sin perder tu sesión.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{position:"relative"}}>
        <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🎯</div>
        <div style={{position:"absolute",inset:-5,borderRadius:22,border:"2.5px solid transparent",borderTopColor:"var(--primary)",animation:"spin 1s linear infinite"}}/>
      </div>
      <div style={{fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:"-.3px"}}>Xtratia</div>
      <div style={{fontSize:13,color:"var(--text3)",fontWeight:500,animation:"pulse 1.5s ease infinite"}}>Cargando plataforma...</div>
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
          catch(e) { notificationService.error("Error al crear objetivo: " + e.message); }
        }} onDeleteObjective={onDeleteObjective} onUpdateObjective={async function(id, form){
          try { 
            await objectivesService.update(id, form); 
          } catch(e) { 
            if (e.message?.includes('schema cache') || e.message?.includes('Could not find')) {
              notificationService.error("Acción requerida en BD: Agrega la columna 'theme' (tipo text) en la tabla 'objectives'.");
            } else {
              notificationService.error("Error al actualizar: " + e.message);
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
    catch(e) { console.error(e); }
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

    // 3. Si hay un perfil, actualiza el estado y la BD en segundo plano.
    if (realProfile?.id) {
      // Actualiza el estado local de forma optimista.
      setAuth(user, { ...realProfile, preferred_language: newLang });

      // Persiste el cambio en la base de datos de forma asíncrona.
      try {
        const { error } = await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', realProfile.id);
        if (error) throw error; // El error se registrará en la consola.
      } catch (dbError) {
        console.error("Error al guardar preferencia de idioma:", dbError);
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

// MainApp es un componente muy grande que maneja gran parte de la lógica de la aplicación.
// Para mejorar la mantenibilidad y seguir los principios de Clean Code, se podría refactorizar
// extrayendo lógica a hooks personalizados (ej. useModals, usePaymentStatus, useRealtime)
// y componentes más pequeños.
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

  const clearImpersonation = useStore.use.clearImpersonation();
  const setAuth = useStore(state => state.setAuth);
  const profile = impersonatedProfile || realProfile;

  // DEBUG: Revisa la consola del navegador para ver el perfil de usuario que la app está recibiendo.
  // Si eres Super Admin, 'is_super_admin' debe ser 'true' aquí.
  console.log("Perfil de usuario actual (realProfile):", realProfile);

  const setupSubscriptions = useStore.use.setupSubscriptions();
  const can = useStore.use.can();
  const unsubscribeRealtime = useStore.use.unsubscribeRealtime();
  const requestPushNotifications = useStore.use.requestPushNotifications();
  // La visibilidad del botón depende SOLO del rol en la base de datos (is_super_admin o Admin).
  const canTrySuperAdmin = !impersonatedProfile && (realProfile?.is_super_admin || realProfile?.role === 'Admin');

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
            } catch (e) { notificationService.error("Error al eliminar: " + e.message); }
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
            } catch (e) { notificationService.error("Error al eliminar OKR: " + e.message); }
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
            } catch (e) { notificationService.error("Error al eliminar iniciativa: " + e.message); }
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
            } catch (e) { notificationService.error("Error al eliminar KPI: " + e.message); }
            closeConfirmationModal();
        },
    });
  };

  useEffect(function(){
    loadAllData();
    setupSubscriptions(); // Iniciamos la conexión por WebSockets

    // Solicitar permiso de notificaciones si no se ha hecho antes
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => requestPushNotifications(), 5000); // Esperar 5s para no ser intrusivo
    }
    
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

  async function handleSaveOKR(form){
    if (!checkPaymentStatus()) return;
    try {
      const payload = { ...form }; // Create a mutable copy
      if (!payload.objective_id || payload.objective_id === "") {
        payload.objective_id = null; // Explicitly set to null for unlinking
      }
      if (payload.id) {
        const id = payload.id;
        delete payload.id; // No enviamos el ID en el cuerpo a Supabase
        await okrService.update(id, payload);
        notificationService.success("OKR actualizado exitosamente.");
      } else {
        await okrService.create(payload);
        notificationService.success("OKR creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar OKR: " + e.message); }
  }

  async function handleSaveKPI(form){
    if (!checkPaymentStatus()) return;
    try {
      const payload = { ...form };
      if (payload.id) {
        const id = payload.id;
        delete payload.id;
        await kpiService.update(id, payload);
        notificationService.success("KPI actualizado exitosamente.");
      } else {
        await kpiService.create(payload);
        notificationService.success("KPI creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar KPI: " + e.message); }
  }

  async function handleSaveInitiative(form){
    if (!checkPaymentStatus()) return;
    try {
      await initiativeService.create(form);
      setModal(null);
      notificationService.success("Iniciativa creada exitosamente.");
    } catch(e) { notificationService.error("Error al guardar Iniciativa: " + e.message); }
  }

  // LÓGICA DE GOBERNANZA Y AISLAMIENTO DE DATOS (RBAC)
  // La vista global se determina por el rol del usuario, no por su email.
  const isGlobalView = can('read', 'all_organizations'); // Asumiendo un permiso para vistas globales
  
  var todayObj = new Date();
  var currentMonthStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}`;
  var org=profile&&profile.organizations;
  var isPaidThisMonth = org?.modules?.lastPaymentMonth === currentMonthStr;
  var isInGracePeriod = !isPaidThisMonth && todayObj.getDate() <= 10;
  var isBlocked = !isGlobalView && !isPaidThisMonth && todayObj.getDate() > 10;

  var unreadAlerts=(alerts || []).filter(function(a){return !a.is_read;}).length;
  var criticalToasts=(alerts || []).filter(function(a){return a.severity==="critical"&&!a.is_read&&!dismissedToasts.includes(a.id);});
  var orgName=org&&org.name||"Mi Organizacion";

  const toggleZenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
      setSidebarCollapsed(true);
      setZenMode(true);
    } else {
      document.exitFullscreen();
      setZenMode(false);
    }
  };

  // Protector de escritura (Modo Solo Lectura por falta de pago)
  function checkPaymentStatus() {
    if (isBlocked) {
      notificationService.error("⛔ Acción Bloqueada: Periodo de gracia expirado. Sistema en Modo Solo Lectura.");
      return false;
    }
    return true;
  }

  var NAV_GROUPS = [
    {
      title: t('nav.main', 'Principal'),
      items: [
        {id:"home",       icon:"🏠", label: t('nav.home', 'Command Center')},
        {id:"centro",     icon:"⚡", label: t('nav.strategic_center', 'Centro Estratégico')}
      ]
    },
    {
      title: t('nav.execution', 'Ejecución'),
      items: [
        {id:"estrategia", icon:"🗺️", label: t('nav.strategy_map', 'Mapa Estratégico')},
        {id:"okrs",       icon:"🎯", label: t('nav.okrs', 'OKRs')},
        {id:"kpis",       icon:"📊", label: t('nav.kpis', 'KPIs')},
        {id:"iniciativas",icon:"🚀", label: t('nav.initiatives', 'Iniciativas')}
      ]
    },
    {
      title: t('nav.intelligence', 'Inteligencia'),
      items: [
        {id:"ia",         icon:"🤖", label: t('nav.ai_intel', 'Inteligencia IA')},
        {id:"analitica",  icon:"📈", label: t('nav.analytics', 'Analítica 360')}
      ]
    },
    {
      title: t('nav.operations', 'Operaciones'),
      items: [
        {id:"reportes",   icon:"📤", label: t('nav.reports', 'Reportes')},
        {id:"alertas",    icon:"🔔", label: t('nav.alerts', 'Alertas')}
      ]
    }
  ];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        .hide-on-mobile-small { display: inline; }
        @media (max-width: 1100px) { .hide-on-mobile-small { display: none; } }
      `}</style>

      <div style={{height:54,background:"var(--bg2)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="icon-btn" onClick={function(){setSidebarCollapsed(!sidebarCollapsed);}}>{sidebarCollapsed?"☰":"←"}</button>
          <div className="tour-step-logo" style={{display:"flex",alignItems:"center",gap:8,padding:"0 4px"}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,var(--primary),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff"}}>X</div>
            <span style={{fontSize:15,fontWeight:800,color:"var(--text)",letterSpacing:"-.3px"}}>Xtratia</span>
          </div>
          <div style={{width:1,height:16,background:"var(--border)"}}/>
          <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>{orgName}</span>
          <button className="tour-step-search" onClick={function(){setCmdOpen(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg3)",cursor:"pointer",color:"var(--text3)",fontSize:12,fontFamily:"'Plus Jakarta Sans',sans-serif",marginLeft:4}}>
            <span>🔍</span><span>Buscar...</span>
            <kbd style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"var(--bg2)",border:"1px solid var(--border)",color:"var(--text3)"}}>⌘K</kbd>
          </button>
        </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button className="icon-btn" onClick={toggleZenMode} title="Modo Presentación (Pantalla Completa)">{zenMode ? '↙️' : '↗️'}</button>
          {unreadAlerts>0&&<button onClick={function(){setActiveModule("alertas");}} className="header-action" style={{color:"var(--red)",borderColor:"rgba(239,68,68,.3)"}}>🔔<span style={{fontWeight:700}}>{unreadAlerts}</span></button>}
          {org&&org.logo_url&&<img src={org.logo_url} alt="logo" style={{height:26,width:"auto",objectFit:"contain",borderRadius:6,border:"1px solid var(--border)",padding:2,background:"var(--bg2)"}}/>}
          <ThemeToggle theme={theme} onToggle={toggleTheme}/>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:8,background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <Avatar name={profile&&profile.full_name}/>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{profile&&profile.full_name||"Usuario"}</span>
            <span className="sp-badge" style={{background:"var(--primary-light)",color:"var(--primary)",padding:"2px 7px",fontSize:10}}>{profile?.is_super_admin ? "Super Admin" : (profile&&profile.role||"viewer")}</span>
          </div>
          {/* El acceso al panel de Super Admin se controla con el sistema de permisos `can()` */}
          {/* Esto centraliza la lógica de autorización y elimina la duplicación de roles. */}
          {canTrySuperAdmin && <button className="header-action" onClick={onSuperAdmin} style={{color:"var(--gold)",borderColor:"rgba(245,158,11,.3)"}}>⚡ Admin</button>}
          <LanguageSwitcher />
          <button className="header-action" onClick={onLogout} style={{background: 'var(--bg3)'}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div className="tour-step-nav" style={{width:sidebarCollapsed?0:240,minWidth:sidebarCollapsed?0:240,background:"var(--bg2)",borderRight:"1px solid var(--border)",overflowY:"auto",overflowX:"hidden",transition:"all .25s ease",position:"sticky",top:54,height:"calc(100vh - 54px)",flexShrink:0}}>
          {!sidebarCollapsed&&(
            <div style={{padding:"20px 12px"}}>
              {NAV_GROUPS.map(function(group, gIdx){
                return(
                  <div key={gIdx} style={{marginBottom: 20}}>
                    <div style={{fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 16}}>{group.title}</div>
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
                <div style={{fontSize:12,fontWeight:800,color:"var(--text)",letterSpacing:"0.5px"}}>XTRATIA v3.0</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Enterprise OS</div>
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
        {isBlocked && (
          <div className="fade-up" style={{ background: 'var(--red)', color: '#fff', padding: '16px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 16px rgba(220,38,38,0.3)' }}>
            <div style={{ fontSize: 32 }}>💳</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Suscripción Suspendida (Pago Pendiente)</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>El periodo de gracia de 10 días ha finalizado. El sistema ha sido limitado a <strong>Modo Solo Lectura</strong>. Comuníquese con soporte para reactivar la cuenta.</div>
            </div>
          </div>
        )}
        {!isPaidThisMonth && isInGracePeriod && !isGlobalView && (
          <div className="fade-up" style={{ background: 'var(--gold)', color: '#fff', padding: '16px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 16px rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Factura Mensual Pendiente (Periodo de Gracia)</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Recuerda que tienes hasta el día 10 de este mes para confirmar el pago. Después de esta fecha, la plataforma pasará a solo lectura.</div>
            </div>
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
              <button onClick={() => loadAllData(profile?.organization_id)} className="sp-btn" style={{ background: '#fff', color: 'var(--red)', border: 'none', padding: '8px 16px', fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
              {activeModule==="okrs"&&<ModuloOKRs onModal={function(m){setEditingItem(null);setModal(m);}} onEdit={function(item){setEditingItem(item);setModal("okr");}} onDelete={handleDeleteOKR} />}
              {activeModule==="kpis"&&<ModuloKPIs onModal={function(m){setEditingItem(null);setModal(m);}} onEdit={function(item){setEditingItem(item);setModal("kpi");}} onDelete={handleDeleteKPI} onCreateOkrFromKpi={function(kpi){
                setEditingItem({ objective: `Optimizar indicador: ${kpi.name}`, status: 'not_started', progress: 0, period: 'Q1 2024', department: '', owner: kpi.owner || '', confidence_level: 8, krs: [{title: `Llevar ${kpi.name} de ${kpi.value||0}${kpi.unit} a la meta de ${kpi.target}${kpi.unit}`, owner: kpi.owner || '', completed: false, deadline: ''}] });
                setModal("okr");
              }}/>}
              {activeModule==="iniciativas"&&<ModuloIniciativas onModal={setModal} onDelete={handleDeleteInitiative} />}
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

      <NotificationCenter />
    </div>
  );
}

export default function App(){
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [superAdminActive, setSuperAdminActive] = useState(false); // Renamed to avoid confusion with the component name
  const [showSuperAdminCodeModal, setShowSuperAdminCodeModal] = useState(false);
  const [superAdminCodeInput, setSuperAdminCodeInput] = useState('');
  // Se leen los datos de autenticación directamente del store de Zustand como única fuente de verdad.
  // **OPTIMIZACIÓN CRÍTICA**: Se refactoriza a selectores atómicos para prevenir el bucle infinito de re-renderizados
  // ("Maximum update depth exceeded") causado por la creación de nuevos objetos en el selector.
  const user = useStore(state => state.user);
  const profile = useStore(state => state.profile);
  const setAuth = useStore(state => state.setAuth);
  const SUPER_ADMIN_SECRET_CODE = import.meta.env.VITE_SUPER_ADMIN_SECRET_CODE || null;

  useEffect(function(){
    initTheme();
    supabase.auth.getSession().then(function(res){
      var session=res.data.session;
      if(session&&session.user){loadProfile(session.user);}
      else setLoading(false);
    });
    var sub=supabase.auth.onAuthStateChange(function(_event,session){
      if(session&&session.user){loadProfile(session.user);}
      else{setLoading(false);setAuth(null,null);}
    });
    return () => sub.data.subscription.unsubscribe();
  },[setAuth]); // Se elimina `i18n` de las dependencias para romper el bucle de re-renderizado.

  async function loadProfile(currentUser){
    try{
      var res=await supabase.from("profiles")
        .select("*, organizations(*)")
        .eq("id",currentUser.id).maybeSingle();
      
      // **MEJORA DE ROBUSTEZ**: Si un usuario está autenticado pero no tiene un perfil en la BD,
      // es un estado de error crítico. Lo notificamos y lo deslogueamos para evitar inconsistencias.
      if (!res.data) {
        console.error(`CRITICAL: No profile found for authenticated user ID: ${currentUser.id}. Check RLS policies and data integrity in 'profiles' table.`);
        notificationService.error("Error de cuenta: No se pudo cargar tu perfil. Contacta a soporte.");
        // Desloguear al usuario para prevenir que la app quede en un estado roto.
        await supabase.auth.signOut();
        setAuth(null, null);
        setLoading(false);
        return; // Detener la ejecución
      }

      const profileData = res.data;

      // Sincronización inicial del idioma al cargar el perfil
      const initialLang = profileData?.preferred_language || profileData?.organizations?.language;
      if (initialLang && !i18n.language.startsWith(initialLang.substring(0, 2))) {
          i18n.changeLanguage(initialLang);
      }

      setAuth(currentUser, profileData);
    } catch(e) {
      console.error("Error cargando el perfil:",e);
      notificationService.error(`Error de red al cargar perfil: ${e.message}`);
    } finally { setLoading(false); }
  }

  async function handleLogout(){
    await supabase.auth.signOut();
    setAuth(null, null);
    setSuperAdminActive(false); // Clear super admin status on logout
  }

  const activateSuperAdminMode = () => {
    const isGlobalSuperAdmin = useStore.getState().can('access', 'super_admin_panel');
    // Check if already Super Admin via DB flag or hardcoded email
    if (isGlobalSuperAdmin) {
      setSuperAdminActive(true);
      notificationService.success("Acceso directo a Super Administrador.");
    } else {
      setShowSuperAdminCodeModal(true);
    }
  };

  const handleSuperAdminCodeSubmit = () => {
    if (SUPER_ADMIN_SECRET_CODE && superAdminCodeInput === SUPER_ADMIN_SECRET_CODE) {
      setSuperAdminActive(true);
      notificationService.success("Modo Super Administrador activado.");
    } else {
      notificationService.error("Código incorrecto o no configurado.");
    }
    setShowSuperAdminCodeModal(false);
    setSuperAdminCodeInput('');
  };

  if (loading) return <LoadingScreen />;
  // **MEJORA DE ROBUSTEZ**: No renderizar la app principal si el usuario está logueado
  // pero su perfil no se pudo cargar. Esto previene todos los errores de 'null' posteriores.
  if (!user || !profile) return <Login onLogin={(u, p) => setAuth(u, p)} />;

  // If superAdminActive is true, render SuperAdmin component
  if (superAdminActive) return <SuperAdmin user={user} profile={profile} onBack={() => setSuperAdminActive(false)} isCodeActivated={true} />;

  // Otherwise, render MainApp and the potential code input modal
  return (
    <>
      <MainApp onLogout={handleLogout} onSuperAdmin={activateSuperAdminMode} />
      {showSuperAdminCodeModal && (
        <Modal onClose={() => setShowSuperAdminCodeModal(false)}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
            <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>Activar Modo Super Administrador</h3>
            <button onClick={() => setShowSuperAdminCodeModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Ingresa el código secreto para activar el modo Super Administrador.</p>
            <input
              type="password"
              className="sp-input"
              value={superAdminCodeInput}
              onChange={(e) => setSuperAdminCodeInput(e.target.value)}
              placeholder="Código Secreto"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSuperAdminCodeSubmit(); }}
            />
            <button className="sp-btn" onClick={handleSuperAdminCodeSubmit} style={{ background: 'var(--violet)', color: 'white', justifyContent: 'center' }}>
              Activar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
