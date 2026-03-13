// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Layout: Sidebar + Header + Shell
// ══════════════════════════════════════════════════════════════

import { useState, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Logo, Btn, Avatar, Badge } from "../ui/index.jsx";
import { T } from "../ui/index.jsx";
import { str } from "../../utils/helpers.js";

// ── NAVEGACIÓN ────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    group: "Principal",
    items: [
      { id:"dashboard",   icon:"🏠", label:"Dashboard",         short:"Inicio"   },
      { id:"executive",   icon:"👔", label:"Panel Ejecutivo",   short:"Ejecutivo"},
    ]
  },
  {
    group: "Estrategia",
    items: [
      { id:"bsc",         icon:"🗺️", label:"Mapa BSC",          short:"BSC"      },
      { id:"strategymap", icon:"🔗", label:"Mapa Estratégico",  short:"Mapa"     },
      { id:"hoshin",      icon:"🔷", label:"Hoshin X-Matrix",   short:"Hoshin"   },
      { id:"okr",         icon:"🎯", label:"OKR Manager",       short:"OKRs"     },
    ]
  },
  {
    group: "Analytics",
    items: [
      { id:"kpi",         icon:"📊", label:"KPI Analytics",     short:"KPIs"     },
      { id:"bowling",     icon:"🎳", label:"Bowling Chart",     short:"Bowling"  },
      { id:"radar",       icon:"🕸️", label:"Radar Estratégico", short:"Radar"    },
      { id:"benchmark",   icon:"📈", label:"Benchmark",         short:"Bench"    },
      { id:"prediction",  icon:"🔮", label:"Predicción IA",     short:"Pred."    },
    ]
  },
  {
    group: "Operaciones",
    items: [
      { id:"initiatives", icon:"🚀", label:"Iniciativas",       short:"Inic."    },
      { id:"alerts",      icon:"🔔", label:"Alertas",           short:"Alertas"  },
      { id:"simulator",   icon:"⚡", label:"Simulador",         short:"Simul."   },
    ]
  },
  {
    group: "IA",
    items: [
      { id:"ai",          icon:"🤖", label:"IA Estratégica",    short:"IA"       },
      { id:"docs",        icon:"📄", label:"Analizador Docs",   short:"Docs"     },
      { id:"chat",        icon:"💬", label:"Asistente Chat",    short:"Chat"     },
    ]
  },
  {
    group: "Sistema",
    items: [
      { id:"users",       icon:"👥", label:"Usuarios",          short:"Users"    },
      { id:"export",      icon:"📤", label:"Exportar",          short:"Export"   },
    ]
  },
];

// ── SIDEBAR ───────────────────────────────────────────────────
const Sidebar = memo(({ activeModule, onNavigate, open }) => {
  const { notifications, alerts } = useApp();
  const unread = alerts.filter(a => !a.read).length;

  return (
    <aside style={{
      width:        open ? 220 : 62,
      minHeight:    "100vh",
      background:   T.navy,
      display:      "flex",
      flexDirection:"column",
      transition:   "width .25s ease",
      overflow:     "hidden",
      flexShrink:   0,
      position:     "sticky",
      top:          0,
      zIndex:       50,
    }}>
      {/* Logo */}
      <div style={{
        padding:       open ? "16px 16px 12px" : "16px 10px 12px",
        borderBottom:  "1px solid rgba(255,255,255,.07)",
        display:       "flex",
        alignItems:    "center",
        justifyContent:open ? "flex-start" : "center",
        minHeight:     60,
      }}>
        <Logo size={22} showText={open}/>
      </div>

      {/* Nav Groups */}
      <nav style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"8px 0",
        scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {NAV_ITEMS.map(group => (
          <div key={group.group} style={{ marginBottom:4 }}>
            {/* Group label */}
            {open && (
              <div style={{
                fontSize:9, fontWeight:800, letterSpacing:".12em",
                color:"rgba(255,255,255,.3)", padding:"8px 16px 3px",
                textTransform:"uppercase",
              }}>
                {group.group}
              </div>
            )}
            {!open && <div style={{ height:8 }}/>}

            {group.items.map(item => {
              const isActive = activeModule === item.id;
              const hasAlert = item.id === "alerts" && unread > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    width:          "100%",
                    display:        "flex",
                    alignItems:     "center",
                    gap:            open ? 9 : 0,
                    justifyContent: open ? "flex-start" : "center",
                    padding:        open ? "7px 14px 7px 16px" : "9px",
                    background:     isActive
                      ? "rgba(14,165,160,.18)"
                      : "transparent",
                    border:         "none",
                    borderLeft:     isActive
                      ? `3px solid ${T.teal}`
                      : "3px solid transparent",
                    borderRadius:   0,
                    color:          isActive ? T.teal : "rgba(255,255,255,.55)",
                    cursor:         "pointer",
                    transition:     "all .15s",
                    fontSize:       open ? 12 : 18,
                    fontWeight:     isActive ? 700 : 500,
                    whiteSpace:     "nowrap",
                    position:       "relative",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.05)";
                    e.currentTarget.style.color = isActive ? T.teal : "#fff";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isActive ? T.teal : "rgba(255,255,255,.55)";
                  }}
                >
                  <span style={{ fontSize: open ? 14 : 18, flexShrink:0 }}>{item.icon}</span>
                  {open && (
                    <span style={{ flex:1, textAlign:"left" }}>{item.label}</span>
                  )}
                  {open && hasAlert && (
                    <span style={{
                      background: T.red, color:"#fff",
                      borderRadius:20, fontSize:9, fontWeight:800,
                      padding:"1px 6px", minWidth:18, textAlign:"center",
                    }}>
                      {unread}
                    </span>
                  )}
                  {!open && hasAlert && (
                    <span style={{
                      position:"absolute", top:6, right:6,
                      width:8, height:8, borderRadius:"50%",
                      background:T.red, border:`2px solid ${T.navy}`,
                    }}/>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User at bottom */}
      <div style={{
        padding:      open ? "12px 14px" : "12px 10px",
        borderTop:    "1px solid rgba(255,255,255,.07)",
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        justifyContent: open ? "flex-start" : "center",
      }}>
        <Avatar name="Dr. Alejandro Ríos" size={30}/>
        {open && (
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.9)",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              Dr. Alejandro Ríos
            </div>
            <div style={{ fontSize:9.5, color:"rgba(255,255,255,.35)" }}>Admin</div>
          </div>
        )}
      </div>
    </aside>
  );
});

// ── HEADER ────────────────────────────────────────────────────
const Header = memo(({ activeModule, onToggleSidebar, onNavigate }) => {
  const { alerts, markAlertRead, markAllRead, organization } = useApp();
  const [showAlerts,   setShowAlerts]   = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const unread = alerts.filter(a => !a.read).length;

  const moduleLabel = NAV_ITEMS
    .flatMap(g => g.items)
    .find(i => i.id === activeModule)?.label || "Dashboard";

  const severityColor = {
    critical: T.red,
    warning:  "#d97706",
    info:     T.blue,
  };

  return (
    <header style={{
      height:       54,
      background:   T.white,
      borderBottom: `1px solid ${T.bdr}`,
      display:      "flex",
      alignItems:   "center",
      padding:      "0 20px",
      gap:          12,
      position:     "sticky",
      top:          0,
      zIndex:       40,
      boxShadow:    "0 1px 8px rgba(0,0,0,.05)",
    }}>

      {/* Toggle sidebar */}
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        style={{ background:"none", border:"none", cursor:"pointer",
          color:T.tM, fontSize:18, padding:"4px 6px", borderRadius:6,
          display:"flex", alignItems:"center" }}
      >
        ☰
      </button>

      {/* Breadcrumb */}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:T.tL, marginBottom:1 }}>
          {organization.name}
        </div>
        <div style={{ fontSize:13.5, fontWeight:700, color:T.navy,
          fontFamily:"var(--font-display)" }}>
          {moduleLabel}
        </div>
      </div>

      {/* Search hint */}
      <div className="hide-sm" style={{
        display:      "flex",
        alignItems:   "center",
        gap:          7,
        padding:      "6px 12px",
        background:   T.bg,
        border:       `1px solid ${T.bdr}`,
        borderRadius: 8,
        fontSize:     11.5,
        color:        T.tL,
        cursor:       "pointer",
        minWidth:     180,
      }}>
        🔍 <span>Buscar módulo...</span>
        <span style={{ marginLeft:"auto", fontSize:10, background:T.bdr,
          padding:"1px 5px", borderRadius:4 }}>⌘K</span>
      </div>

      {/* Period badge */}
      <div className="hide-sm" style={{
        padding:    "4px 10px",
        background: `rgba(201,168,76,.12)`,
        border:     `1px solid rgba(201,168,76,.3)`,
        borderRadius:20,
        fontSize:   10,
        fontWeight: 700,
        color:      "#92400e",
        display:    "flex",
        alignItems: "center",
        gap:        5,
      }}>
        <span style={{ width:6, height:6, borderRadius:"50%",
          background:T.gold, display:"inline-block" }}/>
        {organization.period}
      </div>

      {/* Alerts bell */}
      <div style={{ position:"relative" }}>
        <button
          onClick={() => { setShowAlerts(p => !p); setShowProfile(false); }}
          aria-label={`${unread} alertas sin leer`}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tM, fontSize:18, padding:"4px 6px", borderRadius:6,
            position:"relative", display:"flex", alignItems:"center" }}
        >
          🔔
          {unread > 0 && (
            <span style={{
              position:"absolute", top:0, right:0,
              background:T.red, color:"#fff",
              width:16, height:16, borderRadius:"50%",
              fontSize:9, fontWeight:800, display:"flex",
              alignItems:"center", justifyContent:"center",
              border:`2px solid ${T.white}`,
            }}>{unread}</span>
          )}
        </button>

        {/* Alerts Dropdown */}
        {showAlerts && (
          <div style={{
            position:   "absolute", top:"calc(100% + 8px)", right:0,
            background: T.white, borderRadius:12, width:340,
            boxShadow:  "0 8px 32px rgba(0,0,0,.15)",
            border:     `1px solid ${T.bdr}`,
            zIndex:     1000, overflow:"hidden",
            animation:  "scaleIn .15s ease",
          }}>
            <div style={{
              padding:      "12px 16px",
              borderBottom: `1px solid ${T.bdr}`,
              display:      "flex",
              justifyContent:"space-between",
              alignItems:   "center",
            }}>
              <span style={{ fontWeight:800, fontSize:13, color:T.navy }}>
                🔔 Alertas {unread > 0 && <Badge variant="red">{unread}</Badge>}
              </span>
              {unread > 0 && (
                <button onClick={markAllRead}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    fontSize:11, color:T.teal, fontWeight:700 }}>
                  Marcar todas leídas
                </button>
              )}
            </div>

            <div style={{ maxHeight:320, overflowY:"auto" }}>
              {alerts.length === 0 ? (
                <div style={{ padding:"24px 16px", textAlign:"center",
                  color:T.tL, fontSize:12 }}>Sin alertas</div>
              ) : (
                alerts.slice(0, 8).map(al => (
                  <div key={al.id}
                    onClick={() => markAlertRead(al.id)}
                    style={{
                      padding:    "10px 16px",
                      borderBottom:`1px solid ${T.bdr}`,
                      background: al.read ? T.white : `${T.teal}06`,
                      cursor:     "pointer",
                      transition: "background .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background= al.read ? T.white : `${T.teal}06`}
                  >
                    <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>
                        {al.severity==="critical"?"🚨":al.severity==="warning"?"⚠️":"ℹ️"}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight: al.read ? 600 : 800,
                          color: al.read ? T.tM : T.navy,
                          display:"flex", justifyContent:"space-between" }}>
                          <span>{al.title}</span>
                          {!al.read && (
                            <span style={{ width:7, height:7, borderRadius:"50%",
                              background:T.teal, display:"inline-block", flexShrink:0, marginTop:3 }}/>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:T.tL, marginTop:2,
                          lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis",
                          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                          {al.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.bdr}` }}>
              <button onClick={() => { onNavigate("alerts"); setShowAlerts(false); }}
                style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:11.5, color:T.teal, fontWeight:700, width:"100%", textAlign:"center" }}>
                Ver todas las alertas →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div style={{ position:"relative" }}>
        <button
          onClick={() => { setShowProfile(p => !p); setShowAlerts(false); }}
          style={{ background:"none", border:"none", cursor:"pointer", padding:2,
            borderRadius:"50%", display:"flex", alignItems:"center" }}
          aria-label="Perfil de usuario"
        >
          <Avatar name="Dr. Alejandro Ríos" size={30}/>
        </button>

        {showProfile && (
          <div style={{
            position:   "absolute", top:"calc(100% + 8px)", right:0,
            background: T.white, borderRadius:12, width:220,
            boxShadow:  "0 8px 32px rgba(0,0,0,.15)",
            border:     `1px solid ${T.bdr}`,
            zIndex:     1000, overflow:"hidden",
            animation:  "scaleIn .15s ease",
          }}>
            <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.bdr}` }}>
              <div style={{ fontWeight:800, fontSize:13, color:T.navy }}>
                Dr. Alejandro Ríos
              </div>
              <div style={{ fontSize:11, color:T.tL }}>a.rios@puntamedica.mx</div>
              <Badge variant="teal" sx={{ marginTop:5 }}>Admin</Badge>
            </div>
            {[
              { icon:"👤", label:"Mi perfil"     },
              { icon:"⚙️", label:"Configuración" },
              { icon:"🔒", label:"Seguridad"     },
            ].map(item => (
              <button key={item.label}
                style={{ width:"100%", padding:"9px 16px", background:"none",
                  border:"none", cursor:"pointer", display:"flex", alignItems:"center",
                  gap:9, fontSize:12.5, color:T.tM, textAlign:"left",
                  transition:"background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background=T.bg}
                onMouseLeave={e => e.currentTarget.style.background="none"}
              >
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
            <div style={{ borderTop:`1px solid ${T.bdr}`, padding:"6px 0" }}>
              <button
                style={{ width:"100%", padding:"9px 16px", background:"none",
                  border:"none", cursor:"pointer", display:"flex", alignItems:"center",
                  gap:9, fontSize:12.5, color:T.red, textAlign:"left" }}
                onMouseEnter={e => e.currentTarget.style.background="#fef2f2"}
                onMouseLeave={e => e.currentTarget.style.background="none"}
              >
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
});

// ── SHELL ─────────────────────────────────────────────────────
export const Shell = memo(({ children, activeModule, onNavigate }) => {
  const { sidebarOpen, toggleSidebar } = useApp();

  return (
    <div className="sp-shell">
      <Sidebar
        activeModule={activeModule}
        onNavigate={onNavigate}
        open={sidebarOpen}
      />
      <div className="sp-main">
        <Header
          activeModule={activeModule}
          onToggleSidebar={toggleSidebar}
          onNavigate={onNavigate}
        />
        <main className="sp-content">
          {children}
        </main>
      </div>
    </div>
  );
});

export { Sidebar, Header, NAV_ITEMS };
export default Shell;
```

---

✅ **Carpeta 6 lista.**

Estructura actualizada:
```
stratexpoints/
├── components/
│   ├── layout/
│   │   └── index.jsx    ← nueva
│   └── ui/
│       └── index.jsx
├── context/
├── data/
├── utils/
├── App.jsx ...
