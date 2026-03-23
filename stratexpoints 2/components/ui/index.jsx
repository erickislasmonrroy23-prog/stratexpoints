// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — UI Primitivos
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, memo } from "react";
import { color, calc, str, fmt } from "../../utils/helpers.js";

// ── DESIGN TOKENS ─────────────────────────────────────────────
export const T = {
  navy:   "#0B1F3A", navyL:  "#1D3D6B",
  teal:   "#0EA5A0", tealL:  "#0d9488",
  gold:   "#C9A84C", blue:   "#1558A8",
  violet: "#7c3aed", amber:  "#92400e",
  red:    "#dc2626", green:  "#059669",
  bg:     "#f0f4f8", bdr:    "#dde3ec",
  txt:    "#1a2332", tM:     "#4a5568",
  tL:     "#8896a8", white:  "#ffffff",
  card:   "#ffffff",
};

// ── GLOBAL CSS ────────────────────────────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy:#0B1F3A; --navyL:#1D3D6B; --teal:#0EA5A0;
    --gold:#C9A84C; --blue:#1558A8;  --violet:#7c3aed;
    --red:#dc2626;  --green:#059669; --amber:#92400e;
    --bg:#f0f4f8;   --bdr:#dde3ec;   --txt:#1a2332;
    --tM:#4a5568;   --tL:#8896a8;    --white:#ffffff;
    --font-display:'Syne',system-ui,sans-serif;
    --font-body:'DM Sans',system-ui,sans-serif;
    --radius:10px; --shadow:0 2px 12px rgba(10,22,40,.07);
    --shadow-lg:0 8px 32px rgba(10,22,40,.12);
    --transition:.18s ease;
  }
  html { font-size: 14px; }
  body {
    font-family: var(--font-body);
    color: var(--txt);
    background: var(--bg);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  h1,h2,h3,h4 { font-family: var(--font-display); line-height: 1.2; }
  button { font-family: var(--font-body); cursor: pointer; }
  input, textarea, select { font-family: var(--font-body); }
  a { color: var(--teal); text-decoration: none; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 10px; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scaleIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  /* ── LAYOUT ── */
  .sp-shell    { display:flex; min-height:100vh; background:var(--bg); }
  .sp-main     { flex:1; display:flex; flex-direction:column; min-width:0; }
  .sp-content  { flex:1; padding:20px 24px; overflow-y:auto; }
  .sp-page     { animation: fadeIn .22s ease; }

  /* ── CARD ── */
  .sp-card {
    background:var(--white); border-radius:var(--radius);
    border:1px solid var(--bdr); box-shadow:var(--shadow);
  }
  .sp-card-hover { transition:transform var(--transition),box-shadow var(--transition); }
  .sp-card-hover:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }

  /* ── BUTTON ── */
  .sp-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:5px;
    padding:7px 16px; border-radius:8px; font-size:12.5px;
    font-weight:700; border:none; transition:all var(--transition);
    white-space:nowrap; font-family:var(--font-body);
  }
  .sp-btn:disabled { opacity:.55; cursor:not-allowed; }
  .sp-btn:not(:disabled):hover  { filter:brightness(1.08); }
  .sp-btn:not(:disabled):active { transform:scale(.97); }
  .sp-btn-primary   { background:var(--teal);   color:#fff; }
  .sp-btn-secondary { background:transparent; color:var(--teal); border:1.5px solid var(--teal); }
  .sp-btn-dark      { background:var(--navy);   color:#fff; }
  .sp-btn-gold      { background:var(--gold);   color:#fff; }
  .sp-btn-danger    { background:var(--red);    color:#fff; }
  .sp-btn-ghost     { background:transparent; color:var(--tM); border:1px solid var(--bdr); }
  .sp-btn-sm        { padding:4px 10px; font-size:11px; border-radius:6px; }
  .sp-btn-lg        { padding:10px 22px; font-size:14px; border-radius:10px; }
  .sp-btn-icon      { padding:7px; border-radius:8px; }
  .sp-btn-full      { width:100%; }

  /* ── INPUT ── */
  .sp-input, .sp-select, .sp-textarea {
    width:100%; padding:8px 12px; border-radius:8px;
    border:1px solid var(--bdr); font-size:12.5px;
    color:var(--txt); background:var(--white);
    transition:border-color var(--transition),box-shadow var(--transition);
  }
  .sp-input:focus, .sp-select:focus, .sp-textarea:focus {
    outline:none; border-color:var(--teal);
    box-shadow:0 0 0 3px rgba(14,165,160,.15);
  }
  .sp-input-error  { border-color:var(--red) !important; }
  .sp-input-sm     { padding:5px 9px; font-size:11.5px; }
  .sp-textarea     { resize:vertical; min-height:80px; }
  .sp-label        { display:block; font-size:11px; font-weight:700; color:var(--tM); margin-bottom:5px; letter-spacing:.04em; }
  .sp-error-msg    { font-size:10.5px; color:var(--red); margin-top:3px; }
  .sp-field        { margin-bottom:14px; }

  /* ── BADGE / CHIP ── */
  .sp-badge {
    display:inline-flex; align-items:center; gap:3px;
    padding:2px 8px; border-radius:20px;
    font-size:10px; font-weight:700; border:1px solid transparent;
  }
  .sp-badge-green  { background:#d1fae5; color:#065f46; border-color:#6ee7b7; }
  .sp-badge-yellow { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
  .sp-badge-red    { background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
  .sp-badge-blue   { background:#dbeafe; color:#1e40af; border-color:#93c5fd; }
  .sp-badge-purple { background:#ede9fe; color:#5b21b6; border-color:#c4b5fd; }
  .sp-badge-gray   { background:#f3f4f6; color:#374151; border-color:#d1d5db; }
  .sp-badge-teal   { background:rgba(14,165,160,.12); color:var(--teal); border-color:rgba(14,165,160,.3); }
  .sp-badge-navy   { background:var(--navy); color:#fff; border-color:var(--navy); }

  /* ── TABLE ── */
  .sp-table { width:100%; border-collapse:collapse; }
  .sp-table th {
    background:var(--navy); color:#fff; padding:8px 11px;
    text-align:left; font-size:10.5px; font-weight:700;
    letter-spacing:.05em;
  }
  .sp-table th:first-child { border-radius:8px 0 0 0; }
  .sp-table th:last-child  { border-radius:0 8px 0 0; }
  .sp-table td {
    padding:9px 11px; border-bottom:1px solid var(--bdr);
    font-size:12px; color:var(--txt);
  }
  .sp-table tr:hover td    { background:#f8fafc; }
  .sp-table tr:last-child td { border-bottom:none; }

  /* ── PROGRESS BAR ── */
  .sp-bar-wrap  { display:flex; align-items:center; gap:7px; }
  .sp-bar-track { flex:1; background:#e6ecf5; border-radius:99px; overflow:hidden; }
  .sp-bar-fill  { height:100%; border-radius:99px; transition:width .5s ease; }
  .sp-bar-pct   { font-size:10px; font-weight:800; min-width:30px; text-align:right; }

  /* ── SKELETON ── */
  .sp-skeleton {
    background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);
    background-size:200% 100%;
    animation:shimmer 1.4s infinite;
    border-radius:6px;
  }

  /* ── MODAL ── */
  .sp-backdrop {
    position:fixed; inset:0; background:rgba(11,31,58,.6);
    display:flex; align-items:center; justify-content:center;
    z-index:9999; padding:20px;
  }
  .sp-modal {
    background:var(--white); border-radius:16px;
    width:100%; max-height:90vh; overflow:auto;
    box-shadow:0 24px 80px rgba(0,0,0,.28);
    animation:scaleIn .18s ease;
  }
  .sp-modal-header {
    display:flex; justify-content:space-between; align-items:center;
    padding:14px 20px; border-bottom:1px solid var(--bdr);
    position:sticky; top:0; background:var(--white);
    border-radius:16px 16px 0 0; z-index:1;
  }
  .sp-modal-body   { padding:20px; }
  .sp-modal-footer {
    padding:14px 20px; border-top:1px solid var(--bdr);
    display:flex; justify-content:flex-end; gap:8px;
    position:sticky; bottom:0; background:var(--white);
    border-radius:0 0 16px 16px;
  }

  /* ── TABS ── */
  .sp-tabs      { display:flex; gap:2px; border-bottom:2px solid var(--bdr); margin-bottom:18px; }
  .sp-tab       { padding:8px 14px; font-size:12px; font-weight:600; color:var(--tM); background:none; border:none; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all var(--transition); }
  .sp-tab:hover { color:var(--teal); }
  .sp-tab.active{ color:var(--teal); border-bottom-color:var(--teal); font-weight:800; }

  /* ── ALERT ── */
  .sp-alert      { padding:10px 14px; border-radius:8px; font-size:12px; display:flex; gap:8px; align-items:flex-start; border:1px solid transparent; }
  .sp-alert-info { background:#eff6ff; color:#1e40af; border-color:#bfdbfe; }
  .sp-alert-warn { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
  .sp-alert-err  { background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
  .sp-alert-ok   { background:#d1fae5; color:#065f46; border-color:#6ee7b7; }

  /* ── TOOLTIP ── */
  .sp-tooltip-wrap { position:relative; display:inline-flex; }
  .sp-tooltip {
    position:absolute; bottom:calc(100% + 6px); left:50%;
    transform:translateX(-50%); background:var(--navy); color:#fff;
    padding:5px 9px; border-radius:6px; font-size:11px; white-space:nowrap;
    pointer-events:none; opacity:0; transition:opacity .15s;
    z-index:1000;
  }
  .sp-tooltip-wrap:hover .sp-tooltip { opacity:1; }

  /* ── SECTION HEADER ── */
  .sp-section-title {
    font-size:10px; font-weight:800; letter-spacing:.1em;
    color:var(--teal); text-transform:uppercase; display:block; margin-bottom:8px;
  }
  .sp-page-title { font-size:20px; font-weight:800; color:var(--navy); margin:0 0 4px; }
  .sp-page-sub   { font-size:12px; color:var(--tM); margin:0 0 20px; }

  /* ── GRID UTILS ── */
  .sp-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  .sp-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .sp-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }

  @media (max-width:1024px) {
    .sp-grid-4 { grid-template-columns:repeat(2,1fr); }
    .sp-grid-3 { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px) {
    .sp-grid-4, .sp-grid-3, .sp-grid-2 { grid-template-columns:1fr; }
    .sp-content { padding:14px; }
    .hide-sm { display:none !important; }
  }

  /* ── DONUT ── */
  .sp-donut { display:inline-flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; }
`;

// ══════════════════════════════════════════════════════════════
// COMPONENTES
// ══════════════════════════════════════════════════════════════

// ── SPINNER ───────────────────────────────────────────────────
export const Spinner = memo(({ size = 14, dark = false, color: c }) => (
  <span style={{
    display:"inline-block", width:size, height:size,
    border:`2px solid ${c || (dark ? "rgba(11,31,58,.2)" : "rgba(255,255,255,.35)")}`,
    borderTopColor: c || (dark ? T.navy : "#fff"),
    borderRadius:"50%", animation:"spin .75s linear infinite", flexShrink:0,
  }}/>
));

// ── BUTTON ────────────────────────────────────────────────────
export const Btn = memo(({
  children, onClick, variant = "primary",
  disabled, size = "", full = false,
  icon = false, title, sx = {}, type = "button"
}) => (
  <button
    type={type} onClick={onClick} disabled={disabled} title={title}
    aria-disabled={disabled}
    className={[
      "sp-btn",
      `sp-btn-${variant}`,
      size && `sp-btn-${size}`,
      full && "sp-btn-full",
      icon && "sp-btn-icon",
    ].filter(Boolean).join(" ")}
    style={sx}
  >
    {children}
  </button>
));

// ── CARD ──────────────────────────────────────────────────────
export const Card = memo(({ children, sx = {}, hover = false, onClick, className = "" }) => (
  <div
    className={`sp-card ${hover ? "sp-card-hover" : ""} ${className}`}
    style={{ ...(onClick ? { cursor:"pointer" } : {}), ...sx }}
    onClick={onClick}
  >
    {children}
  </div>
));

// ── BADGE ─────────────────────────────────────────────────────
export const Badge = memo(({ children, variant = "gray", sx = {} }) => (
  <span className={`sp-badge sp-badge-${variant}`} style={sx}>{children}</span>
));

// ── STATUS BADGE ──────────────────────────────────────────────
export const StatusBadge = memo(({ status }) => {
  const map = {
    on_track:    { v:"green",  l:"En curso",    i:"✅" },
    at_risk:     { v:"yellow", l:"En riesgo",   i:"⚠️" },
    completed:   { v:"blue",   l:"Completado",  i:"🏆" },
    not_started: { v:"gray",   l:"Sin iniciar", i:"⭕" },
    critical:    { v:"red",    l:"Crítico",     i:"🚨" },
    ahead:       { v:"teal",   l:"Adelantado",  i:"🚀" },
  };
  const m = map[status] || map.not_started;
  return <Badge variant={m.v}>{m.i} {m.l}</Badge>;
});

// ── TRAFFIC LIGHT ─────────────────────────────────────────────
export const TrafficLight = memo(({ value, target, inverse = false, showLabel = false }) => {
  const key = color.trafficLightKey(value, target, inverse);
  const cfg = { green:{ c:"#059669",bg:"#d1fae5",l:"Meta" }, yellow:{ c:"#d97706",bg:"#fef3c7",l:"Riesgo" }, red:{ c:"#dc2626",bg:"#fee2e2",l:"Crítico" } };
  const m   = cfg[key];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, background:m.bg, color:m.c, fontSize:10, fontWeight:700 }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:m.c, display:"inline-block" }}/>
      {showLabel && m.l}
    </span>
  );
});

// ── PROGRESS BAR ──────────────────────────────────────────────
export const Bar = memo(({ value, height = 7, barColor, showPct = true }) => {
  const pct = calc.clamp(Math.round(value), 0, 100);
  const c   = barColor || color.progressBar(pct);
  return (
    <div className="sp-bar-wrap">
      <div className="sp-bar-track" style={{ height }}>
        <div className="sp-bar-fill" style={{ width:`${pct}%`, background:c, height }}/>
      </div>
      {showPct && <span className="sp-bar-pct" style={{ color:c }}>{pct}%</span>}
    </div>
  );
});

// ── AVATAR ────────────────────────────────────────────────────
export const Avatar = memo(({ name = "", size = 32, sx = {} }) => {
  const bg      = color.avatar(name);
  const initials= str.initials(name);
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", background:bg,
      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size * .38, fontWeight:700, flexShrink:0, ...sx
    }}>
      {initials}
    </div>
  );
});

// ── MODAL ─────────────────────────────────────────────────────
export const Modal = memo(({ title, children, onClose, maxWidth = 660, footer }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="sp-backdrop" role="dialog" aria-modal="true" aria-label={title}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal" style={{ maxWidth }}>
        <div className="sp-modal-header">
          <span style={{ fontWeight:800, fontSize:14.5, color:T.navy, fontFamily:"var(--font-display)" }}>{title}</span>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:T.tM, lineHeight:1, padding:"2px 6px" }}>×</button>
        </div>
        <div className="sp-modal-body">{children}</div>
        {footer && <div className="sp-modal-footer">{footer}</div>}
      </div>
    </div>
  );
});

// ── INPUT ─────────────────────────────────────────────────────
export const Input = memo(({ label, error, sx = {}, className = "", ...props }) => (
  <div className="sp-field" style={sx}>
    {label && <label className="sp-label">{label}</label>}
    <input className={`sp-input ${error ? "sp-input-error" : ""} ${className}`} {...props}/>
    {error && <div className="sp-error-msg">{error}</div>}
  </div>
));

export const Select = memo(({ label, error, options = [], sx = {}, ...props }) => (
  <div className="sp-field" style={sx}>
    {label && <label className="sp-label">{label}</label>}
    <select className={`sp-select ${error ? "sp-input-error" : ""}`} {...props}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <div className="sp-error-msg">{error}</div>}
  </div>
));

export const Textarea = memo(({ label, error, sx = {}, ...props }) => (
  <div className="sp-field" style={sx}>
    {label && <label className="sp-label">{label}</label>}
    <textarea className={`sp-textarea ${error ? "sp-input-error" : ""}`} {...props}/>
    {error && <div className="sp-error-msg">{error}</div>}
  </div>
));

// ── TOOLTIP ───────────────────────────────────────────────────
export const Tooltip = memo(({ children, text }) => (
  <div className="sp-tooltip-wrap">
    {children}
    <div className="sp-tooltip">{text}</div>
  </div>
));

// ── TABS ──────────────────────────────────────────────────────
export const Tabs = memo(({ tabs = [], active, onChange }) => (
  <div className="sp-tabs" role="tablist">
    {tabs.map(t => (
      <button
        key={t.id} role="tab"
        className={`sp-tab ${active === t.id ? "active" : ""}`}
        onClick={() => onChange(t.id)}
        aria-selected={active === t.id}
      >
        {t.icon && <span style={{ marginRight:4 }}>{t.icon}</span>}
        {t.label}
      </button>
    ))}
  </div>
));

// ── ALERT BOX ─────────────────────────────────────────────────
export const AlertBox = memo(({ type = "info", children }) => {
  const icons = { info:"ℹ️", warn:"⚠️", err:"❌", ok:"✅" };
  return (
    <div className={`sp-alert sp-alert-${type}`}>
      <span>{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
});

// ── EMPTY STATE ───────────────────────────────────────────────
export const EmptyState = memo(({ icon = "📭", title, description, action }) => (
  <div style={{ textAlign:"center", padding:"40px 20px" }}>
    <div style={{ fontSize:44, marginBottom:10 }}>{icon}</div>
    <div style={{ fontWeight:700, color:T.tM, fontSize:14, marginBottom:4 }}>{title}</div>
    {description && <div style={{ fontSize:12, color:T.tL, marginBottom:14 }}>{description}</div>}
    {action}
  </div>
));

// ── SECTION HEADER ────────────────────────────────────────────
export const SectionHeader = memo(({ title, subtitle, action }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
    <div>
      <h2 className="sp-page-title">{title}</h2>
      {subtitle && <p className="sp-page-sub">{subtitle}</p>}
    </div>
    {action && <div style={{ flexShrink:0 }}>{action}</div>}
  </div>
));

// ── STAT CARD ─────────────────────────────────────────────────
export const StatCard = memo(({ label, value, sub, icon, color: c = T.teal, onClick }) => (
  <Card hover={!!onClick} onClick={onClick} sx={{ padding:"15px 17px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:T.tL, letterSpacing:".08em", marginBottom:5, textTransform:"uppercase" }}>{label}</div>
        <div style={{ fontSize:26, fontWeight:900, color:c, lineHeight:1, fontFamily:"var(--font-display)" }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:T.tM, marginTop:4 }}>{sub}</div>}
      </div>
      {icon && <span style={{ fontSize:22, opacity:.8 }}>{icon}</span>}
    </div>
  </Card>
));

// ── DONUT CHART ───────────────────────────────────────────────
export const Donut = memo(({ percent, size = 70, strokeWidth = 8, label, sub, onClick, barColor }) => {
  const R   = (size - strokeWidth) / 2;
  const CV  = size / 2;
  const ci  = 2 * Math.PI * R;
  const c   = barColor || color.progressBar(percent);
  return (
    <div className="sp-donut" onClick={onClick}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${label}: ${percent}%`}>
        <circle cx={CV} cy={CV} r={R} fill="none" stroke="#e6ecf5" strokeWidth={strokeWidth}/>
        <circle cx={CV} cy={CV} r={R} fill="none" stroke={c} strokeWidth={strokeWidth}
          strokeDasharray={`${ci * percent / 100} ${ci}`}
          strokeDashoffset={ci * .25} strokeLinecap="round"
          style={{ transition:"stroke-dasharray .5s ease" }}/>
        <text x={CV} y={CV} textAnchor="middle" dominantBaseline="middle"
          fill={c} fontSize={size * .18} fontWeight={900}>{percent}%</text>
      </svg>
      {label && <div style={{ fontSize:10, fontWeight:700, color:T.txt, textAlign:"center" }}>{label}</div>}
      {sub   && <div style={{ fontSize:9,  color:T.tL, textAlign:"center" }}>{sub}</div>}
    </div>
  );
});

// ── SKELETON ──────────────────────────────────────────────────
export const Skeleton = memo(({ width = "100%", height = 16, sx = {} }) => (
  <div className="sp-skeleton" style={{ width, height, ...sx }}/>
));

// ── CONFIRM DIALOG ────────────────────────────────────────────
export const ConfirmDialog = memo(({ title, message, onConfirm, onCancel, danger = false }) => (
  <Modal title={title} onClose={onCancel}
    footer={
      <>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm}>Confirmar</Btn>
      </>
    }>
    <p style={{ fontSize:13, color:T.tM, lineHeight:1.6 }}>{message}</p>
  </Modal>
));

// ── TREND ICON ────────────────────────────────────────────────
export const TrendIcon = memo(({ trend, value }) => {
  const map = {
    up:   { icon:"↑", color:T.green },
    down: { icon:"↓", color:T.red   },
    flat: { icon:"→", color:T.tM    },
  };
  const m = map[trend] || map.flat;
  return (
    <span style={{ color:m.color, fontWeight:800, fontSize:11 }}>
      {m.icon} {value != null ? Math.abs(value) : ""}
    </span>
  );
});

// ── PERIOD BADGE ──────────────────────────────────────────────
export const PeriodBadge = memo(({ period }) => (
  <Badge variant="teal" sx={{ fontSize:10 }}>📅 {period}</Badge>
));

// ── LOGO ──────────────────────────────────────────────────────
export const Logo = memo(({ size = 26, showText = true }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <polygon points="16,1 22,7 16,13 10,7"  fill={T.teal}/>
      <polygon points="7,11 13,17 7,23 1,17"  fill={T.blue}/>
      <polygon points="25,11 31,17 25,23 19,17" fill={T.gold}/>
      <polygon points="16,20 23,27 16,34 9,27" fill={T.navy}/>
      <line x1="16" y1="13" x2="9"  y2="15.5" stroke={T.teal} strokeWidth="1.5" opacity=".5"/>
      <line x1="16" y1="13" x2="23" y2="15.5" stroke={T.teal} strokeWidth="1.5" opacity=".5"/>
    </svg>
    {showText && (
      <div>
        <div style={{ fontSize:size*.52, fontWeight:900, letterSpacing:"-.5px", color:T.navy, lineHeight:1.1, fontFamily:"var(--font-display)" }}>
          <span>Strat</span><span style={{ color:T.teal }}>ex</span><span>Points</span>
        </div>
        <div style={{ fontSize:size*.22, letterSpacing:"1.5px", color:T.blue, fontWeight:700, lineHeight:1, textTransform:"uppercase" }}>
          Execution Platform
        </div>
      </div>
    )}
  </div>
));
