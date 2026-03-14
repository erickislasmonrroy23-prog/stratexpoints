// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — App.jsx · Router Principal
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, Suspense, lazy, memo } from "react";
import { AppProvider } from "./context/AppContext.jsx";
import Shell from "./components/layout/index.jsx";
import { GLOBAL_CSS } from "./components/ui/index.jsx";
import { T } from "./components/ui/index.jsx";
import { Spinner } from "./components/ui/index.jsx";

// ── LAZY IMPORTS ──────────────────────────────────────────────
const Dashboard   = lazy(() => import("./components/modules/Dashboard.jsx"));
const Executive   = lazy(() => import("./components/modules/Executive.jsx"));
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
  executive:   Executive,
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

// ── PAGE TITLES ───────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:   "Dashboard",
  executive:   "Panel Ejecutivo",
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

// ── LOADING FALLBACK ──────────────────────────────────────────
const PageLoader = memo(() => (
  <div style={{
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    height:         "60vh",
    gap:            16,
  }}>
    <div style={{
      width:      56,
      height:     56,
      borderRadius:"50%",
      background: `linear-gradient(135deg,${T.teal},${T.navy})`,
      display:    "flex",
      alignItems: "center",
      justifyContent:"center",
    }}>
      <Spinner size={24} dark={false}/>
    </div>
    <div style={{ fontSize:13, fontWeight:700, color:T.tM }}>
      Cargando módulo…
    </div>
  </div>
));

// ── ERROR BOUNDARY ────────────────────────────────────────────
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError:false, error:null };
  }

  static getDerivedStateFromError(error) {
    return { hasError:true, error };
  }

  componentDidCatch(error, info) {
    console.error("StratexPoints Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding:"40px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
          <div style={{ fontSize:16, fontWeight:800, color:T.navy,
            marginBottom:8, fontFamily:"var(--font-display)" }}>
            Error al cargar el módulo
          </div>
          <div style={{ fontSize:12, color:T.tM, marginBottom:16,
            maxWidth:400, margin:"0 auto 16px",
            padding:"10px 14px", background:"#fee2e2",
            borderRadius:9 }}>
            {this.state.error?.message || "Error desconocido"}
          </div>
          <button
            onClick={() => this.setState({ hasError:false, error:null })}
            style={{
              padding:      "8px 20px",
              borderRadius: 9,
              background:   T.teal,
              color:        "#fff",
              border:       "none",
              cursor:       "pointer",
              fontWeight:   700,
              fontSize:     13,
            }}>
            🔄 Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
const useKeyboardShortcuts = (navigate) => {
  useEffect(() => {
    const handler = (e) => {
      // ⌘K / Ctrl+K — command palette hint
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Future: open command palette
      }
      // ⌘1–9 quick nav
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const modules = [
          "dashboard","okr","kpi","bsc","initiatives",
          "alerts","simulator","ai","executive",
        ];
        const idx = parseInt(e.key) - 1;
        if (modules[idx]) navigate(modules[idx]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
};

// ── SCROLL TO TOP ON NAVIGATE ─────────────────────────────────
const useScrollToTop = (module) => {
  useEffect(() => {
    const main = document.querySelector(".sp-content");
    if (main) main.scrollTop = 0;
  }, [module]);
};

// ── INJECT GLOBAL CSS ─────────────────────────────────────────
const useGlobalStyles = () => {
  useEffect(() => {
    const existing = document.getElementById("stratex-global-css");
    if (existing) return;
    const style       = document.createElement("style");
    style.id          = "stratex-global-css";
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("stratex-global-css");
      if (el) el.remove();
    };
  }, []);
};

// ── APP CONTENT ───────────────────────────────────────────────
const AppContent = memo(() => {
  const [activeModule, setActiveModule] = useState("dashboard");

  // Hooks
  useGlobalStyles();
  useKeyboardShortcuts(setActiveModule);
  useScrollToTop(activeModule);

  // Update document title
  useEffect(() => {
    document.title = `${PAGE_TITLES[activeModule] || "StratexPoints"} · StratexPoints`;
  }, [activeModule]);

  // Resolve active component
  const ActiveModule = MODULE_MAP[activeModule] || Dashboard;

  return (
    <Shell
      activeModule={activeModule}
      onNavigate={setActiveModule}
    >
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

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}
```

---

## ✅ ¡PLATAFORMA COMPLETA!
```
stratexpoints/                          ESTADO
├── App.jsx                             ✅ nuevo
├── main.jsx                            ✅ existente
├── index.html                          ✅ entregado
├── package.json                        ✅ entregado
├── vite.config.js                      ✅ entregado
├── context/
│   └── AppContext.jsx                  ✅ entregado
├── data/
│   └── mockData.js                     ✅ entregado
├── utils/
│   └── helpers.js                      ✅ entregado
└── components/
    ├── ui/index.jsx                    ✅ entregado
    ├── layout/index.jsx                ✅ entregado
    ├── charts/index.jsx                ✅ entregado
    └── modules/
        ├── Dashboard.jsx               ✅
        ├── Executive.jsx               ✅
        ├── BSC.jsx                     ✅
        ├── StrategyMap.jsx             ✅
        ├── Hoshin.jsx                  ✅
        ├── OKR.jsx                     ✅
        ├── KPI.jsx                     ✅
        ├── Bowling.jsx                 ✅
        ├── Radar.jsx                   ✅
        ├── Benchmark.jsx               ✅
        ├── Prediction.jsx              ✅
        ├── Initiatives.jsx             ✅
        ├── Alerts.jsx                  ✅
        ├── Simulator.jsx               ✅
        ├── AI.jsx                      ✅
        ├── DocReader.jsx               ✅
        ├── Chat.jsx                    ✅
        ├── Users.jsx                   ✅
        └── Export.jsx                  ✅
