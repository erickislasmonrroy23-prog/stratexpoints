// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — App.jsx · Router Principal
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, Suspense, lazy, memo, Component } from "react";
import { AppProvider } from "./context/AppContext.jsx";
import Shell from "./components/layout/index.jsx";
import { GLOBAL_CSS, T, Spinner } from "./components/ui/index.jsx";

// ── LAZY IMPORTS ──────────────────────────────────────────────
const Dashboard   = lazy(() => import("./components/modules/Dashboard.jsx"));
const BSC         = lazy(() => import("./components/modules/BSC.jsx"));
const StrategyMap = lazy(() => import("./components/modules/StrategyMap.jsx"));
const Hoshin      = lazy(() => import("./components/modules/Hoshin.jsx"));
const OKR         = lazy(() => import("./components/modules/OKR.jsx"));
const KPI         = lazy(() => import("./components/modules/KPI.jsx"));
const Bowling     = lazy(() => import("./components/modules/Bowling.jsx"));
const Radar       = lazy(() => import("./components/modules/Radar.jsx"));
const Benchmark   = lazy(() => import("./components/modules/Benchmark.jsx"));
const Prediction  = lazy(() => import("./components/modules/Prediction.jsx"));
const Initiatives = lazy(() => import("./components/modules/Initiatives.jsx"));
const Alerts      = lazy(() => import("./components/modules/Alerts.jsx"));
const Simulator   = lazy(() => import("./components/modules/Simulator.jsx"));
const AI          = lazy(() => import("./components/modules/AI.jsx"));
const DocReader   = lazy(() => import("./components/modules/DocReader.jsx"));
const Chat        = lazy(() => import("./components/modules/Chat.jsx"));
const Users       = lazy(() => import("./components/modules/Users.jsx"));
const Export      = lazy(() => import("./components/modules/Export.jsx"));

// ── MODULE MAP ────────────────────────────────────────────────
const MODULE_MAP = {
  dashboard:   Dashboard,
  bsc:         BSC,
  strategymap: StrategyMap,
  hoshin:      Hoshin,
  okr:         OKR,
  kpi:         KPI,
  bowling:     Bowling,
  radar:       Radar,
  benchmark:   Benchmark,
  prediction:  Prediction,
  initiatives: Initiatives,
  alerts:      Alerts,
  simulator:   Simulator,
  ai:          AI,
  docs:        DocReader,
  chat:        Chat,
  users:       Users,
  export:      Export,
};

const PAGE_TITLES = {
  dashboard:   "Dashboard",
  bsc:         "Mapa BSC",
  strategymap: "Mapa Estratégico",
  hoshin:      "Hoshin X-Matrix",
  okr:         "OKR Manager",
  kpi:         "KPI Analytics",
  bowling:     "Bowling Chart",
  radar:       "Radar Estratégico",
  benchmark:   "Benchmark",
  prediction:  "Predicción IA",
  initiatives: "Iniciativas",
  alerts:      "Alertas",
  simulator:   "Simulador",
  ai:          "IA Estratégica",
  docs:        "Analizador Docs",
  chat:        "Asistente Chat",
  users:       "Usuarios",
  export:      "Exportar",
};

// ── LOADING ───────────────────────────────────────────────────
const PageLoader = memo(() => (
  <div style={{
    display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center",
    height:"60vh", gap:16,
  }}>
    <div style={{
      width:56, height:56, borderRadius:"50%",
      background:`linear-gradient(135deg,${T.teal},${T.navy})`,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <Spinner size={24} dark={false}/>
    </div>
    <div style={{ fontSize:13, fontWeight:700, color:T.tM }}>
      Cargando módulo…
    </div>
  </div>
));

// ── ERROR BOUNDARY ────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error) { return { hasError:true, error }; }
  componentDidCatch(error, info) { console.error("StratexPoints Error:", error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding:"40px 24px", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:800, color:T.navy, marginBottom:8 }}>
          Error al cargar el módulo
        </div>
        <div style={{ fontSize:12, color:T.tM, marginBottom:16,
          padding:"10px 14px", background:"#fee2e2", borderRadius:9,
          maxWidth:400, margin:"0 auto 16px" }}>
          {this.state.error?.message || "Error desconocido"}
        </div>
        <button onClick={() => this.setState({ hasError:false, error:null })}
          style={{ padding:"8px 20px", borderRadius:9, background:T.teal,
            color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>
          🔄 Reintentar
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── INJECT GLOBAL CSS ─────────────────────────────────────────
const useGlobalStyles = () => {
  useEffect(() => {
    const existing = document.getElementById("stratex-global-css");
    if (existing) return;
    const style = document.createElement("style");
    style.id = "stratex-global-css";
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => { document.getElementById("stratex-global-css")?.remove(); };
  }, []);
};

// ── APP CONTENT ───────────────────────────────────────────────
const AppContent = memo(() => {
  const [activeModule, setActiveModule] = useState("dashboard");
  useGlobalStyles();

  useEffect(() => {
    document.title = `${PAGE_TITLES[activeModule] || "StratexPoints"} · StratexPoints`;
  }, [activeModule]);

  useEffect(() => {
    const el = document.querySelector(".sp-content");
    if (el) el.scrollTop = 0;
  }, [activeModule]);

  const ActiveModule = MODULE_MAP[activeModule] || Dashboard;

  return (
    <Shell activeModule={activeModule} onNavigate={setActiveModule}>
      <div className="sp-page">
        <ErrorBoundary key={activeModule}>
          <Suspense fallback={<PageLoader/>}>
            <ActiveModule onNavigate={setActiveModule}/>
          </Suspense>
        </ErrorBoundary>
      </div>
    </Shell>
  );
});

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}
