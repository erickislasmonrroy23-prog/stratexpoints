// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Utilidades y Helpers
// ══════════════════════════════════════════════════════════════

import { STATUS_CONFIG, TRAFFIC_LIGHT } from "../data/mockData.js";

// ── FORMATO ───────────────────────────────────────────────────
export const fmt = {
  percent:  (v, decimals = 1) => `${parseFloat(v).toFixed(decimals)}%`,
  currency: (v, symbol = "$") => `${symbol}${Number(v).toLocaleString("es-MX")}`,
  number:   (v, decimals = 0) => Number(v).toLocaleString("es-MX", { minimumFractionDigits: decimals }),
  date:     (d) => new Date(d).toLocaleDateString("es-MX", { year:"numeric", month:"short", day:"numeric" }),
  dateShort:(d) => new Date(d).toLocaleDateString("es-MX", { month:"short", day:"numeric" }),
  fileSize: (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${(b/1024).toFixed(0)} KB` : `${b} B`,
  duration: (days) => days >= 30 ? `${Math.round(days/30)} meses` : `${days} días`,
};

// ── CÁLCULOS ──────────────────────────────────────────────────
export const calc = {
  clamp: (v, min, max) => Math.min(max, Math.max(min, v)),

  progress: (current, target, inverse = false) => {
    if (!target) return 0;
    const raw = inverse
      ? ((target - current) / target) * 100
      : (current / target) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  },

  avgProgress: (items, field = "progress") => {
    if (!items?.length) return 0;
    return Math.round(items.reduce((s, i) => s + (i[field] || 0), 0) / items.length);
  },

  globalIndex: (avgProgress, periodElapsed) => {
    if (!periodElapsed) return 0;
    return (avgProgress / periodElapsed).toFixed(2);
  },

  daysRemaining: (endDate) => {
    const diff = new Date(endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  daysElapsed: (startDate) => {
    const diff = new Date() - new Date(startDate);
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  periodProgress: (startDate, endDate) => {
    const total   = new Date(endDate)   - new Date(startDate);
    const elapsed = new Date()          - new Date(startDate);
    return calc.clamp(Math.round((elapsed / total) * 100), 0, 100);
  },

  budgetHealth: (spent, budget) => {
    if (!budget) return "green";
    const pct = (spent / budget) * 100;
    return pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
  },
};

// ── SEMÁFORO / COLORES ────────────────────────────────────────
export const color = {
  trafficLight: (value, target, inverse = false) => {
    const pct = calc.progress(value, target, inverse);
    if (pct >= 90) return TRAFFIC_LIGHT.green;
    if (pct >= 60) return TRAFFIC_LIGHT.yellow;
    return TRAFFIC_LIGHT.red;
  },

  trafficLightKey: (value, target, inverse = false) => {
    const pct = calc.progress(value, target, inverse);
    if (pct >= 90) return "green";
    if (pct >= 60) return "yellow";
    return "red";
  },

  status: (key) => STATUS_CONFIG[key] || STATUS_CONFIG.not_started,

  progressBar: (pct) => {
    if (pct >= 75) return "#059669";
    if (pct >= 45) return "#d97706";
    return "#dc2626";
  },

  bowling: (value, target, base, inverse = false) => {
    if (value == null) return { bg: "transparent", text: "#9ca3af" };
    const pct = inverse
      ? calc.progress(target - value, target - base)
      : calc.progress(value - base,   target - base);
    if (pct >= 100) return { bg:"#065f46", text:"#d1fae5" };
    if (pct >= 70)  return { bg:"#16a34a", text:"#dcfce7" };
    if (pct >= 40)  return { bg:"#ca8a04", text:"#fef9c3" };
    return              { bg:"#dc2626", text:"#fee2e2"  };
  },

  perspective: (id) => {
    const map = {
      fin:"#059669", cli:"#1d4ed8", pro:"#7c3aed", apr:"#dc2626"
    };
    return map[id] || "#6b7280";
  },

  avatar: (name = "") => {
    const colors = [
      "#0ea5e9","#8b5cf6","#ec4899","#f59e0b",
      "#10b981","#3b82f6","#ef4444","#14b8a6"
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  },
};

// ── PREDICCIÓN ML SIMPLE ─────────────────────────────────────
export const ml = {
  /**
   * Regresión lineal simple por mínimos cuadrados
   * Retorna { slope, intercept, r2 }
   */
  linearRegression: (values) => {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };

    const x = values.map((_, i) => i);
    const sumX  = x.reduce((a, b) => a + b, 0);
    const sumY  = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * values[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

    const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R² (coeficiente de determinación)
    const yMean  = sumY / n;
    const ssTot  = values.reduce((s, y) => s + (y - yMean) ** 2, 0);
    const ssRes  = values.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
    const r2     = ssTot ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
  },

  /**
   * Genera N puntos de predicción futuros
   */
  predict: (historicalValues, periods = 6) => {
    const clean = historicalValues.filter(v => v != null);
    if (!clean.length) return Array(periods).fill(null);

    const { slope, intercept, r2 } = ml.linearRegression(clean);
    const n = clean.length;

    const predictions = Array.from({ length: periods }, (_, i) => {
      const val = slope * (n + i) + intercept;
      return Math.round(val * 100) / 100;
    });

    return { predictions, confidence: Math.round(r2 * 100), slope };
  },

  /**
   * Suavizado exponencial (EMA)
   */
  ema: (values, alpha = 0.3) => {
    if (!values.length) return [];
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result.map(v => Math.round(v * 100) / 100);
  },

  /**
   * Detección de tendencia
   */
  trend: (values) => {
    if (values.length < 2) return "flat";
    const { slope } = ml.linearRegression(values.filter(v => v != null));
    if (slope >  0.5) return "up";
    if (slope < -0.5) return "down";
    return "flat";
  },

  /**
   * Anomalía simple: valor fuera de 2 desviaciones estándar
   */
  isAnomaly: (values, newValue) => {
    if (values.length < 3) return false;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    return Math.abs(newValue - mean) > 2 * std;
  },
};

// ── SIMULADOR ─────────────────────────────────────────────────
export const simulator = {
  /**
   * Aplica impactos de un escenario a los KPIs base
   */
  applyScenario: (baseKPIs, scenario) => {
    if (!scenario) return baseKPIs;
    return baseKPIs.map(kpi => {
      const impact = scenario.impacts;
      let newValue = kpi.value;

      if (kpi.id === "kpi1" && impact.admissions)
        newValue = kpi.value * (1 + impact.admissions / 100);
      if (kpi.id === "kpi5" && impact.nps)
        newValue = kpi.value + impact.nps;
      if (kpi.id === "kpi2" && impact.revenue)
        newValue = kpi.value * (1 + impact.revenue / 100);
      if (kpi.id === "kpi3" && impact.ebitda)
        newValue = kpi.value + impact.ebitda;

      return { ...kpi, simulatedValue: Math.round(newValue * 10) / 10 };
    });
  },

  /**
   * Calcula el IEG (Índice de Ejecución Global)
   */
  calculateIEG: (avgProgress, periodElapsed) => {
    if (!periodElapsed) return { score: 0, status: "critical" };
    const ieg = avgProgress / periodElapsed;
    return {
      score:  Math.round(ieg * 100) / 100,
      status: ieg >= 1.0 ? "ahead" : ieg >= 0.8 ? "on_track" : ieg >= 0.6 ? "at_risk" : "critical",
      label:  ieg >= 1.0 ? "Adelantado" : ieg >= 0.8 ? "En ritmo" : ieg >= 0.6 ? "En riesgo" : "Rezago crítico",
    };
  },
};

// ── EXPORTACIÓN ───────────────────────────────────────────────
export const exporter = {
  /**
   * Descarga un string como archivo CSV
   */
  downloadCSV: (csvString, filename = "export.csv") => {
    const blob = new Blob(["\uFEFF" + csvString], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Genera CSV de OKRs
   */
  okrsToCSV: (okrs, users) => {
    const getUser = (id) => users.find(u => u.id === id)?.name || id;
    let csv = "CÓDIGO,OBJETIVO,RESPONSABLE,PROGRESO,ESTADO\n";
    okrs.forEach(o => {
      csv += `"${o.code}","${o.objective}","${getUser(o.owner)}","${o.progress}%","${STATUS_CONFIG[o.status]?.label}"\n`;
      csv += `"","── KEY RESULTS ──","","",""\n`;
      o.keyResults.forEach(kr =>
        csv += `"","${kr.text}","","${kr.current}/${kr.target} ${kr.unit}","${kr.progress}%"\n`
      );
      csv += `"","","","",""\n`;
    });
    return csv;
  },

  /**
   * Genera CSV de KPIs
   */
  kpisToCSV: (kpis) => {
    let csv = "NOMBRE,VALOR ACTUAL,META,UNIDAD,SEMÁFORO,FRECUENCIA\n";
    kpis.forEach(k =>
      csv += `"${k.name}","${k.value}","${k.target}","${k.unit}","${k.trafficLight}","${k.frequency}"\n`
    );
    return csv;
  },

  /**
   * Abre ventana de impresión PDF
   */
  printPDF: (htmlContent, title = "StratexPoints Report") => {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family: Arial, sans-serif; color: #1a2332; padding: 28px; font-size: 12px; }
        h1 { font-size: 20px; color: #0B1F3A; margin-bottom: 6px; }
        h2 { font-size: 14px; color: #0EA5A0; margin: 18px 0 7px; border-bottom: 2px solid #0EA5A0; padding-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        th { background: #0B1F3A; color: #fff; padding: 6px 9px; text-align: left; font-size: 10px; }
        td { padding: 5px 9px; border-bottom: 1px solid #dde3ec; font-size: 11px; }
        tr:nth-child(even) td { background: #f7f9fc; }
        .badge { padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 700; }
        .green  { background: #d1fae5; color: #065f46; }
        .yellow { background: #fef3c7; color: #92400e; }
        .red    { background: #fee2e2; color: #c0392b; }
        .header { background: #0B1F3A; color: #fff; padding: 14px 22px; margin: -28px -28px 20px; }
        .logo   { font-size: 20px; font-weight: 900; }
        .teal   { color: #0EA5A0; }
        .meta   { font-size: 10px; color: #8896a8; margin-bottom: 18px; }
        @media print { body { padding: 0; } .header { margin: 0 0 18px; } }
      </style>
      </head><body>
      <div class="header">
        <div class="logo">Strat<span class="teal">ex</span>Points</div>
        <div style="font-size:10px;color:#94a3b8;letter-spacing:2px;margin-top:2px">EXECUTION PLATFORM</div>
      </div>
      <div class="meta">${title} · ${new Date().toLocaleDateString("es-MX", { year:"numeric", month:"long", day:"numeric" })} · v2.0</div>
      ${htmlContent}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 600);
  },
};

// ── IA / API ──────────────────────────────────────────────────
export const aiService = {
  /**
   * Llama a la API de Anthropic
   * En producción reemplazar con tu propio backend /api/ai
   */
  call: async (prompt, system = "Experto estratégico. Responde en español.", maxTokens = 1200) => {
    const key = import.meta.env.VITE_ANTHROPIC_KEY;
    if (!key) throw new Error("VITE_ANTHROPIC_KEY no configurada en .env.local");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.content?.find(b => b.type === "text")?.text ?? "";
  },

  /**
   * Llama y parsea JSON
   */
  callJSON: async (prompt, system, maxTokens) => {
    const text  = await aiService.call(prompt, system, maxTokens);
