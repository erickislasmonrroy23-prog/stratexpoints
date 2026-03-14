// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Predicción IA
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Bar, SectionHeader, StatCard,
  AlertBox, Tabs, Badge, Spinner, T,
} from "../ui/index.jsx";
import {
  PredictionChart, SpLineChart, SpAreaChart,
  SpBarChart, GaugeChart,
} from "../charts/index.jsx";
import { color, calc, fmt, ml, aiService } from "../../utils/helpers.js";
import { MONTHS } from "../../data/mockData.js";

// ── CONSTANTES ────────────────────────────────────────────────
const FORECAST_MONTHS = 3;
const CONFIDENCE_LEVELS = [
  { value:0.90, label:"90% — Alta confianza"   },
  { value:0.85, label:"85% — Media confianza"  },
  { value:0.75, label:"75% — Baja confianza"   },
];

// ── PREDICTION ENGINE ─────────────────────────────────────────
const buildPrediction = (history, target, inverse = false) => {
  const valid = history.filter(v => v != null);
  if (valid.length < 2) return null;

  const { slope, intercept, r2 } = ml.linearRegression(valid);
  const trend  = ml.trend(valid);
  const ema    = ml.ema(valid, 3);

  // Forecast next N months
  const predictions = Array.from({ length: FORECAST_MONTHS }, (_, i) => {
    const x    = valid.length + i;
    const pred = Math.round(slope * x + intercept);
    return Math.min(100, Math.max(0, pred));
  });

  // Anomalies in historical
  const anomalies = valid.map((v, i) => ({
    index: i,
    value: v,
    isAnomaly: ml.isAnomaly(v, valid),
  })).filter(a => a.isAnomaly);

  // Confidence based on R²
  const confidence = Math.round(Math.min(95, Math.max(50, r2 * 100)));

  // Will it reach target?
  const lastPred    = predictions[predictions.length - 1];
  const willReach   = inverse ? lastPred <= target : lastPred >= target;
  const monthsToTarget = predictions.findIndex(p =>
    inverse ? p <= target : p >= target
  );

  return {
    predictions,
    trend,
    r2: Math.round(r2 * 100) / 100,
    confidence,
    anomalies,
    slope: Math.round(slope * 100) / 100,
    ema: Math.round(ema * 10) / 10,
    willReach,
    monthsToTarget: monthsToTarget === -1 ? null : monthsToTarget + 1,
  };
};

// ── KPI PREDICTION CARD ───────────────────────────────────────
const KPIPredictionCard = memo(({ kpi, history, onSelect, selected }) => {
  const valid = (history[kpi.id] || []).filter(v => v != null);
  const pred  = useMemo(() => buildPrediction(valid, kpi.target, kpi.inverse),
    [valid, kpi.target, kpi.inverse]);

  if (!pred) return null;

  const isSelected = selected === kpi.id;
  const tl         = color.trafficLight(kpi.value, kpi.target, kpi.inverse);
  const trendColor = { up:T.green, down:T.red, flat:T.tM };
  const trendIcon  = { up:"↑", down:"↓", flat:"→" };

  return (
    <div
      onClick={() => onSelect(isSelected ? null : kpi.id)}
      style={{
        padding:      "13px 15px",
        borderRadius: 10,
        background:   isSelected ? `${T.teal}08` : T.white,
        border:       `1.5px solid ${isSelected ? T.teal : T.bdr}`,
        cursor:       "pointer",
        transition:   "all .18s",
        boxShadow:    isSelected ? `0 4px 16px ${T.teal}25` : "none",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = T.teal;
          e.currentTarget.style.background  = `${T.teal}04`;
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = T.bdr;
          e.currentTarget.style.background  = T.white;
        }
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.navy,
            lineHeight:1.3, marginBottom:4 }}>
            {kpi.name}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:9, fontWeight:800, padding:"1px 7px",
              borderRadius:20, background:`${tl.color}18`, color:tl.color }}>
              {fmt.number(kpi.value, 1)}{kpi.unit}
            </span>
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px",
              borderRadius:20, background:T.bg, color:T.tM,
              border:`1px solid ${T.bdr}` }}>
              Meta: {kpi.target}{kpi.unit}
            </span>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
          <div style={{ fontSize:9.5, color:T.tL, marginBottom:2 }}>
            Pronóstico 3M
          </div>
          <div style={{ fontSize:18, fontWeight:900,
            color:color.progressBar(pred.predictions[FORECAST_MONTHS-1]),
            fontFamily:"var(--font-display)", lineHeight:1 }}>
            {pred.predictions[FORECAST_MONTHS-1]}{kpi.unit}
          </div>
        </div>
      </div>

      {/* Trend + confidence */}
      <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, fontWeight:800,
          color:trendColor[pred.trend] }}>
          {trendIcon[pred.trend]} {pred.trend === "up" ? "Tendencia ↑"
            : pred.trend === "down" ? "Tendencia ↓" : "Estable"}
        </span>
        <span style={{ fontSize:10, color:T.tL }}>
          Confianza: <strong style={{ color:T.navy }}>{pred.confidence}%</strong>
        </span>
        {pred.anomalies.length > 0 && (
          <span style={{ fontSize:10, color:"#d97706", fontWeight:700 }}>
            ⚠️ {pred.anomalies.length} anomalía{pred.anomalies.length>1?"s":""}
          </span>
        )}
      </div>

      {/* Will reach target */}
      <div style={{
        padding:      "5px 9px",
        borderRadius: 7,
        background:   pred.willReach ? "#d1fae5" : "#fee2e2",
        border:       `1px solid ${pred.willReach ? "#6ee7b7" : "#fca5a5"}`,
        fontSize:     10.5,
        fontWeight:   700,
        color:        pred.willReach ? "#065f46" : "#b91c1c",
        display:      "flex",
        alignItems:   "center",
        gap:          5,
      }}>
        {pred.willReach
          ? `✅ Alcanzará meta en ${pred.monthsToTarget || FORECAST_MONTHS} mes${(pred.monthsToTarget||FORECAST_MONTHS)>1?"es":""}`
          : `🚨 No alcanzará meta en ${FORECAST_MONTHS} meses`
        }
      </div>
    </div>
  );
});

// ── PREDICTION DETAIL ─────────────────────────────────────────
const PredictionDetail = memo(({ kpi, history, prediction, onClose }) => {
  const valid   = (history[kpi.id] || []).filter(v => v != null);
  const histLen = valid.length;
  const xLabels = MONTHS.slice(0, histLen + FORECAST_MONTHS);
  const tl      = color.trafficLight(kpi.value, kpi.target, kpi.inverse);

  return (
    <Card sx={{ padding:"16px 18px", border:`2px solid ${T.teal}`,
      marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)" }}>
            🔮 {kpi.name}
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
            Pronóstico basado en regresión lineal · {histLen} meses de historial
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tM, fontSize:20, lineHeight:1, padding:"2px 6px" }}>×</button>
      </div>

      {/* Metrics grid */}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:10, marginBottom:16 }}>
        {[
          { label:"Valor Actual",  value:`${kpi.value}${kpi.unit}`,          c:tl.color  },
          { label:"Pronóstico 1M", value:`${prediction.predictions[0]}${kpi.unit}`,     c:T.blue    },
          { label:"Pronóstico 2M", value:`${prediction.predictions[1]}${kpi.unit}`,     c:T.violet  },
          { label:"Pronóstico 3M", value:`${prediction.predictions[2]}${kpi.unit}`,     c:T.navy    },
          { label:"Pendiente",     value:`${prediction.slope > 0 ? "+" : ""}${prediction.slope}`, c:prediction.slope>0?T.green:T.red },
          { label:"EMA (3M)",      value:`${prediction.ema}${kpi.unit}`,     c:T.teal    },
          { label:"R² Ajuste",     value:`${prediction.r2}`,                 c:T.gold    },
          { label:"Confianza",     value:`${prediction.confidence}%`,        c:color.progressBar(prediction.confidence) },
        ].map((m, i) => (
          <div key={i} style={{ padding:"9px 12px", background:T.bg,
            borderRadius:9, border:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
              letterSpacing:".06em", marginBottom:3 }}>
              {m.label}
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:m.c,
              fontFamily:"var(--font-display)", lineHeight:1 }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Prediction chart */}
      <PredictionChart
        historical={valid}
        predictions={prediction.predictions}
        xLabels={xLabels}
        title="Histórico + Pronóstico"
        subtitle={`Línea sólida = real · Línea punteada = pronóstico IA`}
        height={240}
        unit={kpi.unit}
        confidence={prediction.confidence}
      />

      {/* Anomalies */}
      {prediction.anomalies.length > 0 && (
        <AlertBox type="warn" sx={{ marginTop:12 }}>
          <strong>Anomalías detectadas:</strong>{" "}
          {prediction.anomalies.map(a =>
            `${MONTHS[a.index] || `M${a.index+1}`}: ${a.value}${kpi.unit}`
          ).join(" · ")}
        </AlertBox>
      )}

      {/* Target assessment */}
      <div style={{ marginTop:12, padding:"12px 14px",
        background: prediction.willReach ? "#d1fae5" : "#fee2e2",
        borderRadius:9,
        border: `1px solid ${prediction.willReach ? "#6ee7b7" : "#fca5a5"}` }}>
        <div style={{ fontSize:12, fontWeight:800,
          color: prediction.willReach ? "#065f46" : "#b91c1c",
          marginBottom:4 }}>
          {prediction.willReach
            ? `✅ Proyección favorable — Meta alcanzable`
            : `🚨 Proyección desfavorable — Se requiere intervención`}
        </div>
        <div style={{ fontSize:11, color:T.tM, lineHeight:1.5 }}>
          {prediction.willReach
            ? `Con la tendencia actual, el KPI alcanzará la meta de ${kpi.target}${kpi.unit} en los próximos ${prediction.monthsToTarget || FORECAST_MONTHS} mes(es).`
            : `El modelo proyecta que el KPI no alcanzará la meta de ${kpi.target}${kpi.unit} en ${FORECAST_MONTHS} meses. Se recomienda revisar las iniciativas vinculadas.`
          }
        </div>
      </div>
    </Card>
  );
});

// ── AI DIAGNOSTIC PANEL ───────────────────────────────────────
const AIDiagnostic = memo(({ kpis, okrs, predictions }) => {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const atRisk = kpis.filter(k => k.trafficLight === "red" || k.trafficLight === "yellow");
  const willMiss = Object.entries(predictions)
    .filter(([id, p]) => p && !p.willReach)
    .map(([id]) => kpis.find(k => k.id === id))
    .filter(Boolean);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const context = {
        atRiskKPIs:    atRisk.map(k => `${k.name}: ${k.value}${k.unit} (meta: ${k.target}${k.unit})`),
        willMissKPIs:  willMiss.map(k => k.name),
        okrProgress:   Math.round(okrs.reduce((s,o) => s+o.progress, 0) / (okrs.length||1)),
        period:        "Q1-Q2 2025",
        organization:  "Hospital Punta Médica",
      };
      const res = await aiService.executiveDiagnostic(context);
      setResult(res);
    } catch {
      setError("No se pudo conectar con la IA. Verifica la clave API en .env.local");
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
            🤖 Diagnóstico Predictivo IA
          </div>
          <div style={{ fontSize:11, color:T.tL, marginTop:2 }}>
            Análisis inteligente basado en tendencias y proyecciones
          </div>
        </div>
        <Btn variant="gold" onClick={run} disabled={loading}>
          {loading ? <Spinner size={12}/> : "🤖"} Ejecutar Análisis
        </Btn>
      </div>

      {/* Context summary */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <div style={{ padding:"7px 12px", background:"#fee2e2", borderRadius:8,
          border:"1px solid #fca5a5", fontSize:11.5, fontWeight:700,
          color:"#b91c1c" }}>
          🚨 {atRisk.length} KPIs en riesgo
        </div>
        <div style={{ padding:"7px 12px", background:"#fef3c7", borderRadius:8,
          border:"1px solid #fcd34d", fontSize:11.5, fontWeight:700,
          color:"#92400e" }}>
          ⚠️ {willMiss.length} KPIs no alcanzarán meta
        </div>
        <div style={{ padding:"7px 12px", background:"#d1fae5", borderRadius:8,
          border:"1px solid #6ee7b7", fontSize:11.5, fontWeight:700,
          color:"#065f46" }}>
          ✅ {kpis.length - atRisk.length} KPIs saludables
        </div>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10,
          padding:"16px", background:T.bg, borderRadius:9 }}>
          <Spinner size={16} dark/>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
              Analizando tendencias con IA…
            </div>
            <div style={{ fontSize:10.5, color:T.tL }}>
              Procesando {kpis.length} KPIs y {okrs.length} OKRs
            </div>
          </div>
        </div>
      )}

      {error && <AlertBox type="warn">{error}</AlertBox>}

      {result && !loading && (
        <div style={{ animation:"fadeIn .3s ease" }}>
          {/* Executive summary */}
          {result.executiveSummary && (
            <div style={{ padding:"12px 14px", background:`${T.navy}08`,
              borderRadius:9, border:`1px solid ${T.navy}15`,
              marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.teal,
                letterSpacing:".08em", marginBottom:6 }}>
                RESUMEN EJECUTIVO
              </div>
              <div style={{ fontSize:12.5, color:T.navy, lineHeight:1.6,
                fontWeight:600 }}>
                {result.executiveSummary}
              </div>
            </div>
          )}

          {/* Risks */}
          {result.risks?.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.red,
                letterSpacing:".08em", marginBottom:8 }}>
                🚨 RIESGOS IDENTIFICADOS
              </div>
              {result.risks.map((risk, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:7,
                  padding:"8px 10px", background:"#fff5f5",
                  borderRadius:7, border:"1px solid #fca5a5" }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>⚠️</span>
                  <span style={{ fontSize:12, color:T.navy, lineHeight:1.4 }}>
                    {risk}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.teal,
                letterSpacing:".08em", marginBottom:8 }}>
                💡 RECOMENDACIONES
              </div>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:7,
                  padding:"8px 10px", background:`${T.teal}08`,
                  borderRadius:7, border:`1px solid ${T.teal}25` }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>✅</span>
                  <span style={{ fontSize:12, color:T.navy, lineHeight:1.4 }}>
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Forecast narrative */}
          {result.forecastNarrative && (
            <div style={{ padding:"10px 14px", background:`${T.gold}10`,
              borderRadius:9, border:`1px solid ${T.gold}30` }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#92400e",
                letterSpacing:".08em", marginBottom:5 }}>
                🔮 PRONÓSTICO NARRATIVO
              </div>
              <div style={{ fontSize:12, color:T.navy, lineHeight:1.6 }}>
                {result.forecastNarrative}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ padding:"24px", textAlign:"center",
          background:T.bg, borderRadius:9 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔮</div>
          <div style={{ fontSize:12, fontWeight:700, color:T.tM,
            marginBottom:4 }}>
            Listo para analizar
          </div>
          <div style={{ fontSize:11, color:T.tL }}>
            Haz clic en "Ejecutar Análisis" para obtener el diagnóstico predictivo
            basado en los datos actuales de KPIs y OKRs.
          </div>
        </div>
      )}
    </Card>
  );
});

// ── SCENARIO SIMULATOR ────────────────────────────────────────
const ScenarioPanel = memo(({ kpis, history }) => {
  const [kpiId,      setKpiId]      = useState(kpis[0]?.id || "");
  const [growthRate, setGrowthRate] = useState(5);
  const [months,     setMonths]     = useState(6);

  const kpi   = kpis.find(k => k.id === kpiId);
  const valid = (history[kpiId] || []).filter(v => v != null);

  const scenarioData = useMemo(() => {
    if (!kpi || !valid.length) return [];
    const base = valid[valid.length - 1];
    return Array.from({ length: months }, (_, i) => ({
      name:       `+${i+1}M`,
      Optimista:  Math.min(100, Math.round(base * Math.pow(1 + growthRate/100, i+1))),
      Base:       Math.min(100, Math.round(base * Math.pow(1 + (growthRate*.6)/100, i+1))),
      Pesimista:  Math.min(100, Math.round(base * Math.pow(1 + (growthRate*.2)/100, i+1))),
      Meta:       kpi.target,
    }));
  }, [kpi, valid, growthRate, months]);

  return (
    <Card sx={{ padding:"16px 18px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:14,
        fontFamily:"var(--font-display)" }}>
        ⚡ Escenarios de Proyección
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:12, marginBottom:16,
        flexWrap:"wrap", alignItems:"flex-end" }}>
        <div className="sp-field" style={{ flex:2, minWidth:180 }}>
          <label className="sp-label">KPI</label>
          <select value={kpiId} onChange={e => setKpiId(e.target.value)}
            className="sp-select">
            {kpis.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
        <div className="sp-field" style={{ flex:1, minWidth:120 }}>
          <label className="sp-label">
            Tasa de crecimiento: {growthRate}%/mes
          </label>
          <input type="range" min={-10} max={20} step={1}
            value={growthRate}
            onChange={e => setGrowthRate(Number(e.target.value))}
            style={{ width:"100%", accentColor:T.teal }}/>
        </div>
        <div className="sp-field" style={{ flex:1, minWidth:100 }}>
          <label className="sp-label">Horizonte: {months} meses</label>
          <input type="range" min={1} max={12} step={1}
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            style={{ width:"100%", accentColor:T.teal }}/>
        </div>
      </div>

      {kpi && scenarioData.length > 0 ? (
        <>
          <SpAreaChart
            data={scenarioData}
            height={220}
            xKey="name"
            areas={[
              { key:"Optimista", color:T.green,  label:"Optimista"  },
              { key:"Base",      color:T.teal,   label:"Base"       },
              { key:"Pesimista", color:"#d97706",label:"Pesimista"  },
            ]}
          />

          {/* Scenario outcomes */}
          <div style={{ display:"flex", gap:10, marginTop:14,
            flexWrap:"wrap" }}>
            {[
              { key:"Optimista", c:T.green,  bg:"#d1fae5", tc:"#065f46" },
              { key:"Base",      c:T.teal,   bg:`${T.teal}12`, tc:T.teal },
              { key:"Pesimista", c:"#d97706",bg:"#fef3c7", tc:"#92400e" },
            ].map(s => {
              const finalVal = scenarioData[scenarioData.length-1]?.[s.key];
              const reachTarget = kpi.inverse
                ? finalVal <= kpi.target
                : finalVal >= kpi.target;
              return (
                <div key={s.key} style={{ flex:1, minWidth:120,
                  padding:"10px 12px", background:s.bg,
                  borderRadius:9, border:`1px solid ${s.c}30` }}>
                  <div style={{ fontSize:10.5, fontWeight:800,
                    color:s.tc, marginBottom:4 }}>{s.key}</div>
                  <div style={{ fontSize:20, fontWeight:900,
                    color:s.c, fontFamily:"var(--font-display)",
                    lineHeight:1 }}>
                    {finalVal}{kpi.unit}
                  </div>
                  <div style={{ fontSize:9.5, color:s.tc,
                    marginTop:4, fontWeight:700 }}>
                    {reachTarget ? "✅ Alcanza meta" : "❌ No alcanza"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ padding:"24px", textAlign:"center",
          background:T.bg, borderRadius:9, color:T.tL, fontSize:12 }}>
          Sin datos históricos para este KPI
        </div>
      )}
    </Card>
  );
});

// ── SUMMARY STATS ─────────────────────────────────────────────
const PredictionStats = memo(({ kpis, allPredictions }) => {
  const total     = Object.values(allPredictions).filter(Boolean).length;
  const willReach = Object.values(allPredictions).filter(p => p?.willReach).length;
  const upTrend   = Object.values(allPredictions).filter(p => p?.trend === "up").length;
  const anomCount = Object.values(allPredictions)
    .reduce((s,p) => s + (p?.anomalies?.length || 0), 0);

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="KPIs Analizados" value={total}
        sub="Con historial suficiente" icon="🔮" color={T.navy}/>
      <StatCard label="Alcanzarán Meta" value={willReach}
        sub={`${total?Math.round(willReach/total*100):0}% del total`}
        icon="✅" color={T.green}/>
      <StatCard label="Tendencia Positiva" value={upTrend}
        sub="Indicadores al alza" icon="↑" color={T.teal}/>
      <StatCard label="Anomalías" value={anomCount}
        sub="Datos atípicos detectados" icon="⚠️"
        color={anomCount > 0 ? "#d97706" : T.green}/>
    </div>
  );
});

// ── MAIN PREDICTION ───────────────────────────────────────────
const Prediction = memo(({ onNavigate }) => {
  const { kpis, okrs, kpiHistory, kpiPredictions } = useApp();

  const [tab,      setTab]      = useState("forecast");
  const [selected, setSelected] = useState(null);

  // Build all predictions
  const allPredictions = useMemo(() => {
    const result = {};
    kpis.forEach(kpi => {
      const hist  = (kpiHistory[kpi.id] || []).filter(v => v != null);
      result[kpi.id] = buildPrediction(hist, kpi.target, kpi.inverse);
    });
    return result;
  }, [kpis, kpiHistory]);

  // KPIs with enough history
  const kpisWithHistory = useMemo(() =>
    kpis.filter(k => (kpiHistory[k.id] || []).filter(v=>v!=null).length >= 2),
  [kpis, kpiHistory]);

  const selectedKPI  = kpis.find(k => k.id === selected);
  const selectedPred = allPredictions[selected];

  const TABS = [
    { id:"forecast",  label:"🔮 Pronósticos"    },
    { id:"scenarios", label:"⚡ Escenarios"      },
    { id:"ai",        label:"🤖 Diagnóstico IA"  },
    { id:"overview",  label:"📊 Resumen"         },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🔮 Predicción IA"
        subtitle="Pronóstico de KPIs con regresión lineal y análisis de tendencias"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("kpi")}>
              📊 Ver KPIs
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("simulator")}>
              ⚡ Simulador
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <PredictionStats kpis={kpis} allPredictions={allPredictions}/>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── FORECAST TAB ── */}
      {tab === "forecast" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Prediction detail */}
          {selectedKPI && selectedPred && (
            <PredictionDetail
              kpi={selectedKPI}
              history={kpiHistory}
              prediction={selectedPred}
              onClose={() => setSelected(null)}
            />
          )}

          {/* KPI cards grid */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.tM }}>
                {kpisWithHistory.length} KPIs con historial suficiente
                · Haz clic para ver detalle
              </div>
              {selected && (
                <Btn variant="ghost" size="sm"
                  onClick={() => setSelected(null)}>
                  ✕ Cerrar detalle
                </Btn>
              )}
            </div>
            <div className="sp-grid-3">
              {kpisWithHistory.map(kpi => (
                <KPIPredictionCard
                  key={kpi.id}
                  kpi={kpi}
                  history={kpiHistory}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>

          {/* No history warning */}
          {kpis.length > kpisWithHistory.length && (
            <AlertBox type="info">
              {kpis.length - kpisWithHistory.length} KPIs no tienen suficientes datos
              históricos para generar pronósticos. Ingresa valores en el Bowling Chart
              para activar sus predicciones.
            </AlertBox>
          )}
        </div>
      )}

      {/* ── SCENARIOS TAB ── */}
      {tab === "scenarios" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <AlertBox type="info">
            Ajusta la tasa de crecimiento y el horizonte temporal para explorar
            diferentes escenarios (optimista, base y pesimista) para cada KPI.
          </AlertBox>
          <ScenarioPanel kpis={kpisWithHistory} history={kpiHistory}/>
        </div>
      )}

      {/* ── AI TAB ── */}
      {tab === "ai" && (
        <AIDiagnostic
          kpis={kpis}
          okrs={okrs}
          predictions={allPredictions}
        />
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Will/won't reach target */}
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.green,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                ✅ Alcanzarán Meta (3M)
              </div>
              {kpisWithHistory
                .filter(k => allPredictions[k.id]?.willReach)
                .map(k => {
                  const p   = allPredictions[k.id];
                  const tl  = color.trafficLight(k.value, k.target, k.inverse);
                  return (
                    <div key={k.id} style={{ display:"flex",
                      justifyContent:"space-between", alignItems:"center",
                      marginBottom:8, padding:"7px 10px",
                      background:"#d1fae5", borderRadius:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:700,
                          color:"#065f46", overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {k.name}
                        </div>
                        <div style={{ fontSize:10, color:"#059669" }}>
                          Pronóstico: {p?.predictions[2]}{k.unit}
                          {p?.monthsToTarget &&
                            ` · Meta en ~${p.monthsToTarget}M`}
                        </div>
                      </div>
                      <span style={{ fontSize:18, marginLeft:8 }}>✅</span>
                    </div>
                  );
                })}
              {kpisWithHistory.filter(k => allPredictions[k.id]?.willReach).length === 0 && (
                <div style={{ fontSize:12, color:T.tL, padding:"12px 0" }}>
                  Sin KPIs proyectados a alcanzar meta
                </div>
              )}
            </Card>

            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.red,
                marginBottom:12, fontFamily:"var(--font-display)" }}>
                🚨 No Alcanzarán Meta (3M)
              </div>
              {kpisWithHistory
                .filter(k => !allPredictions[k.id]?.willReach)
                .map(k => {
                  const p  = allPredictions[k.id];
                  const gap = Math.abs((p?.predictions[2] || k.value) - k.target);
                  return (
                    <div key={k.id} style={{ display:"flex",
                      justifyContent:"space-between", alignItems:"center",
                      marginBottom:8, padding:"7px 10px",
                      background:"#fee2e2", borderRadius:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:700,
                          color:"#b91c1c", overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {k.name}
                        </div>
                        <div style={{ fontSize:10, color:"#dc2626" }}>
                          Brecha proyectada: {gap}{k.unit}
                        </div>
                      </div>
                      <span style={{ fontSize:18, marginLeft:8 }}>🚨</span>
                    </div>
                  );
                })}
              {kpisWithHistory.filter(k => !allPredictions[k.id]?.willReach).length === 0 && (
                <div style={{ fontSize:12, color:T.tL, padding:"12px 0" }}>
                  ¡Todos los KPIs proyectados a alcanzar meta! ✅
                </div>
              )}
            </Card>
          </div>

          {/* Trend overview */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={kpisWithHistory.slice(0, 10).map(k => ({
                name:      k.name.substring(0, 18),
                Actual:    k.value,
                "3M":      allPredictions[k.id]?.predictions?.[2] || k.value,
                Meta:      k.target,
              }))}
              title="Actual vs Pronóstico 3M vs Meta"
              subtitle="Comparativa de valores actuales y proyectados"
              height={280}
              xKey="name"
              bars={[
                { key:"Actual", color:`${T.teal}80`, label:"Valor Actual" },
                { key:"3M",     color:T.teal,        label:"Pronóstico 3M"},
                { key:"Meta",   color:`${T.gold}88`, label:"Meta"         },
              ]}
            />
          </Card>

          {/* Model quality */}
          <Card sx={{ padding:"16px 18px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:14, fontFamily:"var(--font-display)" }}>
              📐 Calidad del Modelo (R²)
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {kpisWithHistory.map(k => {
                const p   = allPredictions[k.id];
                if (!p) return null;
                const r2c = p.r2 >= 0.8 ? T.green : p.r2 >= 0.5 ? "#d97706" : T.red;
                return (
                  <div key={k.id} style={{ display:"flex",
                    alignItems:"center", gap:10 }}>
                    <div style={{ fontSize:11.5, fontWeight:700,
                      color:T.navy, flex:1, minWidth:0,
                      overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }}>
                      {k.name}
                    </div>
                    <div style={{ width:160, flexShrink:0 }}>
                      <div style={{ height:6, background:"#e6ecf5",
                        borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%",
                          width:`${p.r2 * 100}%`,
                          background:r2c, borderRadius:99 }}/>
                      </div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:800,
                      color:r2c, minWidth:36, textAlign:"right" }}>
                      {p.r2}
                    </div>
                    <div style={{ fontSize:10, color:T.tL, minWidth:60 }}>
                      {p.r2 >= 0.8 ? "✅ Alto"
                        : p.r2 >= 0.5 ? "⚠️ Medio" : "🚨 Bajo"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12, fontSize:10.5, color:T.tL,
              lineHeight:1.6, padding:"8px 12px",
              background:T.bg, borderRadius:8 }}>
              <strong>R²</strong> mide qué tan bien el modelo lineal explica los datos.
              R² ≥ 0.8 = modelo confiable · 0.5–0.8 = aceptable · &lt; 0.5 = baja predictibilidad.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
});

export default Prediction;
```

---

✅ **Prediction.jsx lista.**
```
stratexpoints/
└── components/modules/
    ├── Dashboard.jsx
    ├── BSC.jsx
    ├── OKR.jsx
    ├── KPI.jsx
    ├── Bowling.jsx
    ├── StrategyMap.jsx
    ├── Hoshin.jsx
    ├── Radar.jsx
    ├── Benchmark.jsx
    └── Prediction.jsx    ← nueva
