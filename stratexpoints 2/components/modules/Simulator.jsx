// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Simulador de Escenarios Estratégicos
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Bar, SectionHeader,
  StatCard, AlertBox, Tabs, T, Spinner,
} from "../ui/index.jsx";
import {
  SpRadarChart, SpBarChart, SpAreaChart,
  SpLineChart, GaugeChart,
} from "../charts/index.jsx";
import { color, calc, fmt, simulator, aiService } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const PRESET_SCENARIOS = [
  {
    id:          "optimistic",
    label:       "🚀 Optimista",
    description: "Crecimiento sostenido, inversión completa ejecutada",
    color:       T.green,
    multipliers: { admissions:1.15, satisfaction:1.08, budget:0.95, staff:1.10 },
  },
  {
    id:          "base",
    label:       "📊 Base",
    description: "Continuación de tendencias actuales sin cambios",
    color:       T.teal,
    multipliers: { admissions:1.05, satisfaction:1.02, budget:1.00, staff:1.02 },
  },
  {
    id:          "conservative",
    label:       "⚠️ Conservador",
    description: "Restricciones presupuestarias, crecimiento moderado",
    color:       "#d97706",
    multipliers: { admissions:0.98, satisfaction:0.97, budget:1.10, staff:0.95 },
  },
  {
    id:          "crisis",
    label:       "🚨 Crisis",
    description: "Pérdida de personal clave, recorte presupuestal severo",
    color:       T.red,
    multipliers: { admissions:0.85, satisfaction:0.88, budget:1.25, staff:0.80 },
  },
];

// ── SLIDER CONTROL ────────────────────────────────────────────
const SliderControl = memo(({ label, value, min, max, step = 1, unit = "",
  onChange, color: c = T.teal, description }) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:5 }}>
        <div>
          <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>
            {label}
          </span>
          {description && (
            <div style={{ fontSize:10.5, color:T.tL, marginTop:1 }}>
              {description}
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <input
            type="number"
            value={value}
            min={min} max={max} step={step}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width:64, padding:"3px 7px", borderRadius:6, fontSize:12,
              fontWeight:800, border:`1.5px solid ${c}`, textAlign:"center",
              color:c, fontFamily:"var(--font-display)" }}
          />
          <span style={{ fontSize:11, color:T.tM, minWidth:24 }}>{unit}</span>
        </div>
      </div>
      <div style={{ position:"relative", height:8, background:"#e6ecf5",
        borderRadius:99 }}>
        <div style={{ position:"absolute", top:0, left:0,
          width:`${pct}%`, height:"100%",
          background:`linear-gradient(90deg,${c}80,${c})`,
          borderRadius:99, transition:"width .2s" }}/>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position:  "absolute", top:-4, left:0,
            width:     "100%", opacity:0, height:16,
            cursor:    "pointer", zIndex:1,
          }}
        />
        <div style={{
          position:   "absolute",
          top:        "50%",
          left:       `${pct}%`,
          transform:  "translate(-50%,-50%)",
          width:      16, height:16,
          borderRadius:"50%",
          background: c,
          border:     `2px solid ${T.white}`,
          boxShadow:  `0 2px 6px ${c}60`,
          transition: "left .2s",
          pointerEvents:"none",
        }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between",
        marginTop:3 }}>
        <span style={{ fontSize:9.5, color:T.tL }}>{min}{unit}</span>
        <span style={{ fontSize:9.5, color:T.tL }}>{max}{unit}</span>
      </div>
    </div>
  );
});

// ── KPI IMPACT ROW ────────────────────────────────────────────
const KPIImpactRow = memo(({ kpi, baseline, simulated }) => {
  const delta   = simulated - baseline;
  const pct     = baseline ? Math.round(delta / baseline * 100) : 0;
  const tl      = color.trafficLight(simulated, kpi.target, kpi.inverse);
  const tlBase  = color.trafficLight(baseline,  kpi.target, kpi.inverse);
  const improved = kpi.inverse ? simulated < baseline : simulated > baseline;

  return (
    <tr>
      <td style={{ padding:"9px 12px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
          {kpi.name}
        </div>
        <div style={{ fontSize:10, color:T.tL }}>{kpi.unit}</div>
      </td>
      <td style={{ textAlign:"center", padding:"9px 8px" }}>
        <span style={{ fontSize:14, fontWeight:900,
          color:tlBase.color, fontFamily:"var(--font-display)" }}>
          {fmt.number(baseline, 1)}
        </span>
      </td>
      <td style={{ textAlign:"center", padding:"9px 8px" }}>
        <span style={{ fontSize:14, fontWeight:900,
          color:tl.color, fontFamily:"var(--font-display)" }}>
          {fmt.number(simulated, 1)}
        </span>
      </td>
      <td style={{ textAlign:"center", padding:"9px 8px" }}>
        <span style={{ fontSize:13, fontWeight:800,
          color:improved ? T.green : T.red }}>
          {delta >= 0 ? "+" : ""}{fmt.number(delta, 1)}
          <span style={{ fontSize:9.5, marginLeft:3 }}>
            ({pct >= 0 ? "+" : ""}{pct}%)
          </span>
        </span>
      </td>
      <td style={{ padding:"9px 8px", minWidth:120 }}>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <Bar value={calc.progress(simulated, kpi.target, kpi.inverse)}
              height={5} barColor={tl.color}/>
          </div>
          <div style={{ width:8, height:8, borderRadius:"50%",
            background:tl.color, flexShrink:0 }}/>
        </div>
      </td>
      <td style={{ textAlign:"center", padding:"9px 8px" }}>
        <span style={{ fontSize:14 }}>
          {improved ? "✅" : baseline === simulated ? "→" : "⚠️"}
        </span>
      </td>
    </tr>
  );
});

// ── SCENARIO PRESET CARD ──────────────────────────────────────
const ScenarioPresetCard = memo(({ scenario, active, onSelect }) => (
  <div
    onClick={() => onSelect(scenario.id)}
    style={{
      padding:      "13px 15px",
      borderRadius: 10,
      background:   active ? `${scenario.color}12` : T.white,
      border:       `2px solid ${active ? scenario.color : T.bdr}`,
      cursor:       "pointer",
      transition:   "all .18s",
      boxShadow:    active ? `0 4px 16px ${scenario.color}25` : "none",
    }}
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.borderColor = scenario.color;
        e.currentTarget.style.background  = `${scenario.color}06`;
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.borderColor = T.bdr;
        e.currentTarget.style.background  = T.white;
      }
    }}
  >
    <div style={{ fontSize:14, fontWeight:800, color:scenario.color,
      marginBottom:4, fontFamily:"var(--font-display)" }}>
      {scenario.label}
    </div>
    <div style={{ fontSize:11, color:T.tL, lineHeight:1.4 }}>
      {scenario.description}
    </div>
    {active && (
      <div style={{ marginTop:7, fontSize:10, fontWeight:800,
        color:scenario.color, display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ width:7, height:7, borderRadius:"50%",
          background:scenario.color, display:"inline-block" }}/>
        Escenario activo
      </div>
    )}
  </div>
));

// ── IEG GAUGE ─────────────────────────────────────────────────
const IEGCompare = memo(({ baselineIEG, simulatedIEG, scenarioColor }) => {
  const delta = ((simulatedIEG - baselineIEG) / baselineIEG * 100).toFixed(1);

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        Índice de Ejecución Global (IEG)
      </div>
      <div style={{ display:"flex", gap:20, justifyContent:"center",
        flexWrap:"wrap" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.tL,
            letterSpacing:".08em", marginBottom:8 }}>ACTUAL</div>
          <GaugeChart value={Math.round(baselineIEG)} max={100}
            label="Baseline" size={110}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:6 }}>
          <div style={{ fontSize:24, color:T.tM }}>→</div>
          <div style={{ padding:"5px 12px", borderRadius:20,
            background: parseFloat(delta) >= 0
              ? "#d1fae5" : "#fee2e2",
            color: parseFloat(delta) >= 0 ? "#065f46" : "#b91c1c",
            fontSize:12, fontWeight:900,
            fontFamily:"var(--font-display)" }}>
            {parseFloat(delta) >= 0 ? "+" : ""}{delta}%
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, fontWeight:800,
            color:scenarioColor, letterSpacing:".08em", marginBottom:8 }}>
            SIMULADO
          </div>
          <GaugeChart value={Math.round(simulatedIEG)} max={100}
            label="Simulado" size={110}
            barColor={scenarioColor}/>
        </div>
      </div>
    </Card>
  );
});

// ── RADAR COMPARISON ──────────────────────────────────────────
const RadarComparison = memo(({ kpis, simulated, scenarioLabel }) => {
  const data = kpis.slice(0, 7).map(kpi => ({
    dimension:  kpi.name.substring(0, 18),
    Actual:     calc.progress(kpi.value,           kpi.target, kpi.inverse),
    Simulado:   calc.progress(simulated[kpi.id] ?? kpi.value,
                              kpi.target, kpi.inverse),
  }));

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <SpRadarChart
        data={data}
        title="Comparativa de Progreso"
        subtitle={`Actual vs ${scenarioLabel}`}
        height={300}
        angleKey="dimension"
        series={[
          { key:"Actual",   label:"Actual",    color:T.tL,   fillOpacity:0.1 },
          { key:"Simulado", label:"Simulado",  color:T.teal, fillOpacity:0.2 },
        ]}
      />
    </Card>
  );
});

// ── WHAT-IF PANEL ─────────────────────────────────────────────
const WhatIfPanel = memo(({ kpis, params, onParamChange }) => {
  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:4,
        fontFamily:"var(--font-display)" }}>
        ⚡ Variables de Simulación
      </div>
      <div style={{ fontSize:11, color:T.tL, marginBottom:16 }}>
        Ajusta los parámetros para ver el impacto en tiempo real
      </div>

      <SliderControl
        label="Admisiones Mensuales"
        description="Pacientes atendidos por mes"
        value={params.admissions}
        min={200} max={600} step={10} unit=" pac"
        onChange={v => onParamChange("admissions", v)}
        color={T.teal}
      />
      <SliderControl
        label="Presupuesto Operativo"
        description="Variación respecto al presupuesto base"
        value={params.budgetChange}
        min={-30} max={30} step={1} unit="%"
        onChange={v => onParamChange("budgetChange", v)}
        color={params.budgetChange >= 0 ? T.green : T.red}
      />
      <SliderControl
        label="Personal Certificado"
        description="% del equipo con certificaciones actualizadas"
        value={params.staffCert}
        min={40} max={100} step={1} unit="%"
        onChange={v => onParamChange("staffCert", v)}
        color={T.blue}
      />
      <SliderControl
        label="Tasa de Satisfacción"
        description="NPS objetivo de pacientes"
        value={params.satisfaction}
        min={50} max={100} step={1} unit="%"
        onChange={v => onParamChange("satisfaction", v)}
        color={T.violet}
      />
      <SliderControl
        label="Ocupación de Camas"
        description="% de ocupación hospitalaria"
        value={params.occupancy}
        min={50} max={100} step={1} unit="%"
        onChange={v => onParamChange("occupancy", v)}
        color={T.gold}
      />
      <SliderControl
        label="Reducción de Tiempos de Espera"
        description="Mejora en minutos vs línea base"
        value={params.waitTimeReduction}
        min={0} max={60} step={5} unit=" min"
        onChange={v => onParamChange("waitTimeReduction", v)}
        color={T.green}
      />
    </Card>
  );
});

// ── SIMULATION ENGINE ─────────────────────────────────────────
const applySimulation = (kpis, params, preset) => {
  const mult = preset
    ? PRESET_SCENARIOS.find(s => s.id === preset)?.multipliers || {}
    : {};

  return kpis.reduce((acc, kpi) => {
    let simVal = kpi.value;

    // Apply parameter effects
    if (kpi.id === "kpi1" || kpi.name.toLowerCase().includes("admisión")) {
      simVal = Math.round(params.admissions * (mult.admissions || 1));
    } else if (kpi.id === "kpi5" || kpi.name.toLowerCase().includes("satisfac")) {
      simVal = Math.round(params.satisfaction * (mult.satisfaction || 1));
    } else if (kpi.id === "kpi13" || kpi.name.toLowerCase().includes("certif")) {
      simVal = Math.round(params.staffCert * (mult.staff || 1));
    } else if (kpi.id === "kpi3" || kpi.name.toLowerCase().includes("ocupac")) {
      simVal = Math.round(params.occupancy * (mult.admissions || 1));
    } else if (kpi.name.toLowerCase().includes("espera")) {
      simVal = Math.max(0, Math.round(kpi.value - params.waitTimeReduction));
    } else {
      // Generic: apply budget change impact
      const budgetEffect = 1 + (params.budgetChange / 100) * 0.3;
      simVal = Math.round(kpi.value * budgetEffect * (mult.admissions || 1));
    }

    // Clamp to reasonable bounds
    simVal = Math.max(0, Math.min(kpi.inverse ? kpi.value * 2 : 200, simVal));
    acc[kpi.id] = simVal;
    return acc;
  }, {});
};

// ── SUMMARY STATS ─────────────────────────────────────────────
const SimulatorStats = memo(({ kpis, simulated }) => {
  const improved = kpis.filter(k => {
    const s = simulated[k.id] ?? k.value;
    return k.inverse ? s < k.value : s > k.value;
  }).length;

  const willReach = kpis.filter(k => {
    const s   = simulated[k.id] ?? k.value;
    const pct = calc.progress(s, k.target, k.inverse);
    return pct >= 100;
  }).length;

  const avgProgress = kpis.length
    ? Math.round(kpis.reduce((sum, k) => {
        const s = simulated[k.id] ?? k.value;
        return sum + calc.progress(s, k.target, k.inverse);
      }, 0) / kpis.length)
    : 0;

  const baseAvg = kpis.length
    ? Math.round(kpis.reduce((sum, k) =>
        sum + calc.progress(k.value, k.target, k.inverse), 0) / kpis.length)
    : 0;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="KPIs Simulados" value={kpis.length}
        sub="En análisis" icon="⚡" color={T.navy}/>
      <StatCard label="Mejoran" value={improved}
        sub="Respecto al actual" icon="✅" color={T.green}/>
      <StatCard label="Alcanzarán Meta" value={willReach}
        sub="Con este escenario" icon="🎯" color={T.teal}/>
      <StatCard label="Avance Simulado" value={`${avgProgress}%`}
        sub={`vs ${baseAvg}% actual`} icon="📊"
        color={color.progressBar(avgProgress)}/>
    </div>
  );
});

// ── AI SCENARIO ANALYSIS ──────────────────────────────────────
const AIScenarioAnalysis = memo(({ kpis, params, simulated, scenarioId }) => {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const scenario = PRESET_SCENARIOS.find(s => s.id === scenarioId);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const improved = kpis.filter(k => {
        const s = simulated[k.id] ?? k.value;
        return k.inverse ? s < k.value : s > k.value;
      }).map(k => k.name);

      const worsened = kpis.filter(k => {
        const s = simulated[k.id] ?? k.value;
        return k.inverse ? s > k.value : s < k.value;
      }).map(k => k.name);

      const prompt = `Analiza este escenario estratégico para Hospital Punta Médica:

Escenario: ${scenario?.label || "Personalizado"}
Descripción: ${scenario?.description || "Parámetros personalizados"}

Parámetros configurados:
- Admisiones: ${params.admissions} pacientes/mes
- Satisfacción objetivo: ${params.satisfaction}%
- Personal certificado: ${params.staffCert}%
- Ocupación camas: ${params.occupancy}%
- Cambio presupuestal: ${params.budgetChange > 0 ? "+" : ""}${params.budgetChange}%
- Reducción tiempos espera: ${params.waitTimeReduction} min

KPIs que mejorarían: ${improved.slice(0, 5).join(", ")}
KPIs que empeorarían: ${worsened.slice(0, 5).join(", ")}

Proporciona:
1. Evaluación del escenario (2-3 oraciones)
2. Principales riesgos (3 puntos)
3. Acciones recomendadas (3 puntos)
4. Viabilidad: Alta / Media / Baja y por qué

Responde en español, formato JSON con campos: evaluation, risks (array), actions (array), viability, viabilityReason`;

      const res = await aiService.callJSON(prompt);
      setResult(res);
    } catch {
      setError("No se pudo conectar con la IA. Verifica la clave API.");
    }
    setLoading(false);
  };

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)" }}>
            🤖 Análisis IA del Escenario
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
            Evaluación inteligente de viabilidad e impacto
          </div>
        </div>
        <Btn variant="gold" onClick={run} disabled={loading}>
          {loading ? <Spinner size={12}/> : "🤖"} Analizar
        </Btn>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10,
          padding:"16px", background:T.bg, borderRadius:9 }}>
          <Spinner size={16} dark/>
          <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
            Evaluando escenario con IA…
          </div>
        </div>
      )}

      {error && <AlertBox type="warn">{error}</AlertBox>}

      {result && !loading && (
        <div style={{ animation:"fadeIn .3s ease" }}>
          {/* Evaluation */}
          {result.evaluation && (
            <div style={{ padding:"11px 14px", background:`${T.navy}08`,
              borderRadius:9, border:`1px solid ${T.navy}15`,
              marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.teal,
                letterSpacing:".08em", marginBottom:5 }}>
                EVALUACIÓN GENERAL
              </div>
              <div style={{ fontSize:12.5, color:T.navy, lineHeight:1.6 }}>
                {result.evaluation}
              </div>
            </div>
          )}

          {/* Viability */}
          {result.viability && (
            <div style={{ padding:"10px 14px",
              background: result.viability === "Alta" ? "#d1fae5"
                        : result.viability === "Media"? "#fef3c7" : "#fee2e2",
              borderRadius:9, marginBottom:12,
              border:`1px solid ${
                result.viability === "Alta" ? "#6ee7b7"
                : result.viability === "Media"? "#fcd34d" : "#fca5a5"}` }}>
              <div style={{ fontSize:10, fontWeight:800,
                color: result.viability === "Alta" ? "#065f46"
                     : result.viability === "Media"? "#92400e" : "#b91c1c",
                letterSpacing:".08em", marginBottom:4 }}>
                VIABILIDAD: {result.viability.toUpperCase()}
              </div>
              <div style={{ fontSize:11.5, color:T.navy, lineHeight:1.5 }}>
                {result.viabilityReason}
              </div>
            </div>
          )}

          <div className="sp-grid-2" style={{ gap:12 }}>
            {/* Risks */}
            {result.risks?.length > 0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:T.red,
                  letterSpacing:".08em", marginBottom:8 }}>
                  🚨 RIESGOS
                </div>
                {result.risks.map((r, i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:6,
                    padding:"7px 10px", background:"#fff5f5",
                    borderRadius:7, border:"1px solid #fca5a5" }}>
                    <span style={{ fontSize:11, color:"#b91c1c",
                      fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                    <span style={{ fontSize:11, color:T.navy,
                      lineHeight:1.4 }}>{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {result.actions?.length > 0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:T.teal,
                  letterSpacing:".08em", marginBottom:8 }}>
                  💡 ACCIONES
                </div>
                {result.actions.map((a, i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:6,
                    padding:"7px 10px", background:`${T.teal}08`,
                    borderRadius:7, border:`1px solid ${T.teal}25` }}>
                    <span style={{ fontSize:11, color:T.teal,
                      fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                    <span style={{ fontSize:11, color:T.navy,
                      lineHeight:1.4 }}>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ padding:"20px", textAlign:"center",
          background:T.bg, borderRadius:9 }}>
          <div style={{ fontSize:28, marginBottom:6 }}>🤖</div>
          <div style={{ fontSize:11.5, color:T.tL }}>
            Configura el escenario y haz clic en "Analizar" para obtener
            la evaluación de viabilidad e impacto con IA.
          </div>
        </div>
      )}
    </Card>
  );
});

// ── MAIN SIMULATOR ────────────────────────────────────────────
const Simulator = memo(({ onNavigate }) => {
  const { kpis, okrs, simulatorScenarios, setSimulation } = useApp();

  const [tab,       setTab]       = useState("whatif");
  const [preset,    setPreset]    = useState("base");
  const [params,    setParams]    = useState({
    admissions:        350,
    budgetChange:      0,
    staffCert:         72,
    satisfaction:      82,
    occupancy:         78,
    waitTimeReduction: 10,
  });
  const [saved,    setSaved]      = useState([]);
  const [showSave, setShowSave]   = useState(false);
  const [saveName, setSaveName]   = useState("");

  // Apply preset when changed
  useEffect(() => {
    const p = PRESET_SCENARIOS.find(s => s.id === preset);
    if (!p) return;
    setParams(prev => ({
      admissions:        Math.round(350 * p.multipliers.admissions),
      budgetChange:      Math.round((p.multipliers.budget - 1) * 100),
      staffCert:         Math.round(72  * p.multipliers.staff),
      satisfaction:      Math.round(82  * p.multipliers.satisfaction),
      occupancy:         Math.round(78  * p.multipliers.admissions),
      waitTimeReduction: prev.waitTimeReduction,
    }));
  }, [preset]);

  const handleParamChange = useCallback((key, value) => {
    setParams(p => ({ ...p, [key]:value }));
    setPreset("custom");
  }, []);

  // Run simulation
  const simulated = useMemo(() =>
    applySimulation(kpis, params, preset),
  [kpis, params, preset]);

  // IEG comparison
  const baselineIEG = useMemo(() =>
    calc.avgProgress(kpis.map(k => ({
      progress: calc.progress(k.value, k.target, k.inverse),
    }))),
  [kpis]);

  const simulatedIEG = useMemo(() =>
    calc.avgProgress(kpis.map(k => ({
      progress: calc.progress(simulated[k.id] ?? k.value, k.target, k.inverse),
    }))),
  [kpis, simulated]);

  const scenarioCfg = PRESET_SCENARIOS.find(s => s.id === preset) || PRESET_SCENARIOS[1];

  const handleSave = () => {
    if (!saveName.trim()) return;
    const scenario = {
      id:        Date.now().toString(),
      name:      saveName,
      preset,
      params:    { ...params },
      simulated: { ...simulated },
      savedAt:   new Date().toISOString(),
      ieg:       simulatedIEG,
    };
    setSaved(p => [...p, scenario]);
    setSaveName("");
    setShowSave(false);
  };

  const TABS = [
    { id:"whatif",  label:"⚡ What-If"        },
    { id:"compare", label:"⚖️ Comparativa"    },
    { id:"saved",   label:"💾 Guardados"      },
    { id:"ai",      label:"🤖 Análisis IA"    },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="⚡ Simulador Estratégico"
        subtitle="Análisis what-if · Impacto de decisiones en KPIs y OKRs"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" onClick={() => setShowSave(true)}>
              💾 Guardar Escenario
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("prediction")}>
              🔮 Predicciones
            </Btn>
          </div>
        }
      />

      {/* Simulator stats */}
      <SimulatorStats kpis={kpis} simulated={simulated}/>

      {/* Preset scenarios */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:800, color:T.tM,
          letterSpacing:".08em", marginBottom:10 }}>
          ESCENARIOS PREDEFINIDOS
        </div>
        <div className="sp-grid-4">
          {PRESET_SCENARIOS.map(s => (
            <ScenarioPresetCard
              key={s.id}
              scenario={s}
              active={preset === s.id}
              onSelect={setPreset}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── WHAT-IF TAB ── */}
      {tab === "whatif" && (
        <div className="sp-grid-2" style={{ gap:16 }}>
          {/* Sliders */}
          <WhatIfPanel params={params} kpis={kpis}
            onParamChange={handleParamChange}/>

          {/* Live impact */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* IEG compare */}
            <IEGCompare
              baselineIEG={baselineIEG}
              simulatedIEG={simulatedIEG}
              scenarioColor={scenarioCfg.color}
            />

            {/* Top movers */}
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                📈 Mayor Impacto
              </div>
              {kpis
                .map(k => ({
                  kpi:   k,
                  delta: Math.abs((simulated[k.id] ?? k.value) - k.value),
                  sim:   simulated[k.id] ?? k.value,
                }))
                .sort((a, b) => b.delta - a.delta)
                .slice(0, 5)
                .map(({ kpi, delta, sim }) => {
                  const improved = kpi.inverse
                    ? sim < kpi.value : sim > kpi.value;
                  const tl = color.trafficLight(sim, kpi.target, kpi.inverse);
                  return (
                    <div key={kpi.id} style={{ display:"flex",
                      justifyContent:"space-between", alignItems:"center",
                      marginBottom:9, padding:"7px 10px",
                      background:T.bg, borderRadius:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:700,
                          color:T.navy, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {kpi.name}
                        </div>
                        <div style={{ fontSize:10, color:T.tL }}>
                          {kpi.value} → {sim}{kpi.unit}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center",
                        gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:900,
                          color:improved ? T.green : T.red }}>
                          {improved ? "+" : "-"}{delta}{kpi.unit}
                        </span>
                        <div style={{ width:8, height:8, borderRadius:"50%",
                          background:tl.color }}/>
                      </div>
                    </div>
                  );
                })
              }
            </Card>
          </div>
        </div>
      )}

      {/* ── COMPARE TAB ── */}
      {tab === "compare" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* KPI Impact table */}
          <Card>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdr}` }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                fontFamily:"var(--font-display)" }}>
                📊 Impacto por KPI — Actual vs Simulado
              </div>
              <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
                Escenario: {scenarioCfg.label}
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th style={{ textAlign:"center" }}>Actual</th>
                    <th style={{ textAlign:"center" }}>Simulado</th>
                    <th style={{ textAlign:"center" }}>Delta</th>
                    <th>Progreso vs Meta</th>
                    <th style={{ textAlign:"center" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map(kpi => (
                    <KPIImpactRow
                      key={kpi.id}
                      kpi={kpi}
                      baseline={kpi.value}
                      simulated={simulated[kpi.id] ?? kpi.value}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Radar comparison */}
          <RadarComparison
            kpis={kpis}
            simulated={simulated}
            scenarioLabel={scenarioCfg.label}
          />

          {/* Bar comparison */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={kpis.slice(0, 8).map(k => ({
                name:     k.name.substring(0, 16),
                Actual:   calc.progress(k.value, k.target, k.inverse),
                Simulado: calc.progress(
                  simulated[k.id] ?? k.value, k.target, k.inverse),
                Meta:     100,
              }))}
              title="Progreso vs Meta — Actual vs Simulado"
              height={280}
              xKey="name"
              bars={[
                { key:"Actual",   color:`${T.tL}88`,         label:"Actual"   },
                { key:"Simulado", color:scenarioCfg.color,   label:"Simulado" },
                { key:"Meta",     color:`${T.gold}55`,        label:"Meta"     },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ── SAVED TAB ── */}
      {tab === "saved" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {saved.length === 0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center",
              background:T.bg, borderRadius:12 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>💾</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.tM,
                marginBottom:4 }}>
                Sin escenarios guardados
              </div>
              <div style={{ fontSize:11.5, color:T.tL, marginBottom:16 }}>
                Configura un escenario y haz clic en "Guardar Escenario"
              </div>
              <Btn variant="primary" onClick={() => setShowSave(true)}>
                💾 Guardar escenario actual
              </Btn>
            </div>
          ) : (
            saved.map(sc => {
              const pCfg = PRESET_SCENARIOS.find(p => p.id === sc.preset)
                || PRESET_SCENARIOS[1];
              return (
                <Card key={sc.id} sx={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                        fontFamily:"var(--font-display)" }}>
                        {sc.name}
                      </div>
                      <div style={{ fontSize:10.5, color:T.tL, marginTop:2 }}>
                        {pCfg.label} · Guardado: {fmt.date(sc.savedAt)}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:18, fontWeight:900,
                          color:color.progressBar(sc.ieg),
                          fontFamily:"var(--font-display)" }}>
                          {Math.round(sc.ieg)}%
                        </div>
                        <div style={{ fontSize:9.5, color:T.tL }}>IEG</div>
                      </div>
                      <Btn variant="secondary" size="sm"
                        onClick={() => {
                          setParams(sc.params);
                          setPreset(sc.preset);
                          setTab("whatif");
                        }}>
                        Cargar
                      </Btn>
                      <button
                        onClick={() => setSaved(p => p.filter(s => s.id !== sc.id))}
                        style={{ background:"none", border:"none",
                          cursor:"pointer", color:T.tL, fontSize:15 }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {Object.entries(sc.params).map(([k, v]) => (
                      <span key={k} style={{ fontSize:10.5, color:T.tM,
                        padding:"2px 8px", borderRadius:20,
                        background:T.bg, border:`1px solid ${T.bdr}` }}>
                        {k}: <strong>{v}</strong>
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── AI TAB ── */}
      {tab === "ai" && (
        <AIScenarioAnalysis
          kpis={kpis}
          params={params}
          simulated={simulated}
          scenarioId={preset}
        />
      )}

      {/* Save modal */}
      {showSave && (
        <Modal title="💾 Guardar Escenario"
          onClose={() => setShowSave(false)}
          maxWidth={420}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowSave(false)}>
                Cancelar
              </Btn>
              <Btn variant="primary" onClick={handleSave}
                disabled={!saveName.trim()}>
                Guardar
              </Btn>
            </>
          }>
          <div style={{ marginBottom:14 }}>
            <label className="sp-label">Nombre del Escenario</label>
            <input
              className="sp-input"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Ej: Escenario Q2 con inversión adicional"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>
          <div style={{ padding:"10px 12px", background:T.bg,
            borderRadius:8, border:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:10, fontWeight:800, color:T.tL,
              marginBottom:5 }}>RESUMEN</div>
            <div style={{ fontSize:11.5, color:T.navy }}>
              Escenario: <strong>{scenarioCfg.label}</strong>
            </div>
            <div style={{ fontSize:11, color:T.tL, marginTop:3 }}>
              IEG simulado: <strong style={{ color:color.progressBar(simulatedIEG) }}>
                {Math.round(simulatedIEG)}%
              </strong>
            </div>
          </div>
        </Modal>
      )}

      {/* Tips */}
      <div style={{ marginTop:14, padding:"10px 14px",
        background:`${T.teal}08`, borderRadius:9,
        border:`1px solid ${T.teal}25`,
        display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
          <strong>Simulador:</strong> Selecciona un escenario predefinido o
          ajusta los sliders para crear tu propio what-if. Los resultados se
          calculan en tiempo real. Guarda los escenarios que más te interesen
          para comparar después con el análisis IA.
        </div>
      </div>
    </div>
  );
});

export default Simulator;
