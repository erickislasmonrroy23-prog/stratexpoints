// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — IA Estratégica
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Bar, SectionHeader,
  StatCard, AlertBox, Tabs, Spinner, T,
} from "../ui/index.jsx";
import { SpBarChart, SpRadarChart } from "../charts/index.jsx";
import { color, calc, fmt, aiService } from "../../utils/helpers.js";

// ── PROMPT TEMPLATES ──────────────────────────────────────────
const PROMPT_TEMPLATES = [
  {
    id:"diagnostic",
    icon:"🏥",
    label:"Diagnóstico Estratégico",
    description:"Análisis completo del estado actual del BSC y OKRs",
    color:T.teal,
    buildPrompt:(ctx) => `Eres un consultor experto en gestión estratégica hospitalaria.
Analiza el siguiente estado estratégico de ${ctx.org}:

PERÍODO: ${ctx.period}
AVANCE GLOBAL OKR: ${ctx.okrAvg}%
KPIs EN ROJO: ${ctx.redKPIs} de ${ctx.totalKPIs}
KPIs EN AMARILLO: ${ctx.yellowKPIs} de ${ctx.totalKPIs}
INICIATIVAS ACTIVAS: ${ctx.activeInits}
INICIATIVAS VENCIDAS: ${ctx.overdueInits}

OKRs principales:
${ctx.okrList}

KPIs críticos:
${ctx.criticalKPIs}

Proporciona un diagnóstico ejecutivo con:
1. Estado general (semáforo: Verde/Amarillo/Rojo)
2. Fortalezas identificadas (3 puntos)
3. Áreas de mejora urgente (3 puntos)
4. Recomendaciones estratégicas (4 puntos)
5. Próximos pasos sugeridos

Formato JSON: {status, statusReason, strengths[], improvements[], recommendations[], nextSteps[]}`,
  },
  {
    id:"okr_suggestions",
    icon:"🎯",
    label:"Sugerir OKRs",
    description:"Genera OKRs SMART alineados a los objetivos del BSC",
    color:T.blue,
    buildPrompt:(ctx) => `Eres experto en OKR para organizaciones de salud.
Genera 3 OKRs SMART para ${ctx.org} - ${ctx.period}.

Perspectivas BSC actuales: ${ctx.perspectives}
Objetivos estratégicos existentes: ${ctx.objectives}
Avance actual: ${ctx.okrAvg}%

Para cada OKR incluye:
- Código (OKR-XX)
- Objetivo ambicioso pero alcanzable
- 3 Key Results medibles con meta numérica
- Perspectiva BSC vinculada
- Período sugerido

Formato JSON: {okrs: [{code, objective, perspectiveId, period, keyResults:[{title,target,unit}]}]}`,
  },
  {
    id:"kpi_analysis",
    icon:"📊",
    label:"Analizar KPIs Críticos",
    description:"Causa raíz y plan de acción para KPIs en rojo",
    color:T.red,
    buildPrompt:(ctx) => `Analiza los KPIs en zona crítica (semáforo rojo) de ${ctx.org}:

${ctx.criticalKPIs}

Para cada KPI proporciona:
1. Posibles causas raíz (3-4 causas)
2. Impacto en el BSC y en pacientes
3. Plan de acción inmediata (30 días)
4. Indicadores de recuperación

Formato JSON: {analyses: [{kpiName, causes[], impact, actionPlan[], recoveryIndicators[]}]}`,
  },
  {
    id:"initiative_prioritization",
    icon:"🚀",
    label:"Priorizar Iniciativas",
    description:"Ranking de iniciativas por impacto estratégico y viabilidad",
    color:T.violet,
    buildPrompt:(ctx) => `Prioriza las siguientes iniciativas estratégicas de ${ctx.org}:

${ctx.initiativesList}

Evalúa cada iniciativa según:
- Impacto estratégico (1-10)
- Viabilidad (1-10)
- Urgencia (1-10)
- Alineación con OKRs actuales (1-10)

Proporciona ranking final con justificación.
Formato JSON: {rankings: [{title, scores:{impact,viability,urgency,alignment}, total, priority:"high|medium|low", justification}]}`,
  },
  {
    id:"executive_report",
    icon:"👔",
    label:"Informe Ejecutivo",
    description:"Genera un informe ejecutivo listo para presentar al board",
    color:T.gold,
    buildPrompt:(ctx) => `Genera un informe ejecutivo de gestión estratégica para ${ctx.org}.

Datos clave:
- Período: ${ctx.period}
- IEG (Índice de Ejecución Global): ${ctx.okrAvg}%
- OKRs en curso: ${ctx.onTrackOKRs} | En riesgo: ${ctx.atRiskOKRs}
- Presupuesto ejecutado: ${ctx.budgetPct}%
- KPIs en meta: ${ctx.greenKPIs} de ${ctx.totalKPIs}

Formato del informe (Markdown):
1. Resumen ejecutivo (2 párrafos)
2. Logros del período
3. Desafíos y riesgos
4. Proyección próximo período
5. Decisiones requeridas del board

Formato JSON: {executiveSummary, achievements[], challenges[], projection, boardDecisions[]}`,
  },
  {
    id:"benchmarking_advice",
    icon:"📈",
    label:"Estrategia de Benchmark",
    description:"Recomendaciones para cerrar brechas vs la industria",
    color:"#7c3aed",
    buildPrompt:(ctx) => `Analiza las brechas de benchmark de ${ctx.org} vs la industria hospitalaria:

Métricas donde estamos por debajo del promedio:
${ctx.belowIndustry}

Métricas donde superamos a la industria:
${ctx.aboveIndustry}

Proporciona:
1. Estrategia para cerrar las 3 brechas más críticas
2. Mejores prácticas del sector
3. Quick wins (acciones de impacto inmediato)
4. Inversiones recomendadas

Formato JSON: {gapStrategies[], bestPractices[], quickWins[], investments[]}`,
  },
];

// ── RESULT RENDERER ───────────────────────────────────────────
const ResultRenderer = memo(({ result, templateId }) => {
  if (!result) return null;

  const renderList = (items, color = T.teal, icon = "•") => (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display:"flex", gap:8, padding:"7px 10px",
          background:`${color}08`, borderRadius:7,
          border:`1px solid ${color}20` }}>
          <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
          <span style={{ fontSize:12, color:T.navy, lineHeight:1.5 }}>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </span>
        </div>
      ))}
    </div>
  );

  // Diagnostic
  if (templateId === "diagnostic") {
    const statusCfg = {
      Verde:    { c:T.green,  bg:"#d1fae5", border:"#6ee7b7", icon:"✅" },
      Amarillo: { c:"#d97706",bg:"#fef3c7", border:"#fcd34d", icon:"⚠️" },
      Rojo:     { c:T.red,    bg:"#fee2e2", border:"#fca5a5", icon:"🚨" },
    };
    const sc = statusCfg[result.status] || statusCfg.Amarillo;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ padding:"12px 16px", background:sc.bg,
          borderRadius:10, border:`1px solid ${sc.border}`,
          display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:24 }}>{sc.icon}</span>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:sc.c }}>
              Estado: {result.status}
            </div>
            <div style={{ fontSize:11.5, color:sc.c, opacity:.85,
              marginTop:2 }}>{result.statusReason}</div>
          </div>
        </div>
        {[
          { label:"💪 Fortalezas",        items:result.strengths,       c:T.green  },
          { label:"⚠️ Áreas de Mejora",   items:result.improvements,    c:"#d97706"},
          { label:"💡 Recomendaciones",   items:result.recommendations, c:T.teal   },
          { label:"🚀 Próximos Pasos",    items:result.nextSteps,       c:T.blue   },
        ].map((section, i) => section.items?.length > 0 && (
          <div key={i}>
            <div style={{ fontSize:10, fontWeight:800, color:section.c,
              letterSpacing:".08em", marginBottom:8 }}>
              {section.label}
            </div>
            {renderList(section.items, section.c,
              i===0?"✅":i===1?"⚠️":i===2?"💡":"🚀")}
          </div>
        ))}
      </div>
    );
  }

  // OKR suggestions
  if (templateId === "okr_suggestions" && result.okrs) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {result.okrs.map((okr, i) => (
          <Card key={i} sx={{ padding:"14px 16px",
            border:`1.5px solid ${T.teal}30` }}>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:10, fontWeight:800, padding:"2px 9px",
                borderRadius:20, background:`${T.teal}15`, color:T.teal }}>
                {okr.code}
              </span>
              <span style={{ fontSize:10, color:T.tL }}>
                📅 {okr.period}
              </span>
            </div>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:10, lineHeight:1.35,
              fontFamily:"var(--font-display)" }}>
              {okr.objective}
            </div>
            <div style={{ fontSize:10, fontWeight:800, color:T.teal,
              letterSpacing:".08em", marginBottom:6 }}>KEY RESULTS</div>
            {(okr.keyResults || []).map((kr, ki) => (
              <div key={ki} style={{ display:"flex", gap:8,
                padding:"6px 10px", background:T.bg, borderRadius:7,
                marginBottom:4, alignItems:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:T.teal,
                  flexShrink:0 }}>KR{ki+1}</span>
                <span style={{ fontSize:11.5, color:T.navy, flex:1 }}>
                  {kr.title}
                </span>
                <span style={{ fontSize:11, fontWeight:800, color:T.blue,
                  flexShrink:0 }}>
                  Meta: {kr.target}{kr.unit}
                </span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  // KPI Analysis
  if (templateId === "kpi_analysis" && result.analyses) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {result.analyses.map((analysis, i) => (
          <Card key={i} sx={{ padding:"14px 16px",
            border:`1.5px solid ${T.red}25` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:10, fontFamily:"var(--font-display)" }}>
              📊 {analysis.kpiName}
            </div>
            {[
              { label:"🔍 Causas Raíz",          items:analysis.causes,             c:T.red    },
              { label:"💥 Impacto",               items:[analysis.impact].filter(Boolean), c:"#d97706"},
              { label:"⚡ Plan de Acción (30d)",  items:analysis.actionPlan,        c:T.teal   },
              { label:"📈 Indicadores Recovery",  items:analysis.recoveryIndicators, c:T.green  },
            ].map((s, si) => s.items?.length > 0 && (
              <div key={si} style={{ marginBottom:8 }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:s.c,
                  letterSpacing:".08em", marginBottom:5 }}>{s.label}</div>
                {renderList(s.items, s.c)}
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  // Initiative prioritization
  if (templateId === "initiative_prioritization" && result.rankings) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {result.rankings.map((item, i) => {
          const priorityC = item.priority === "high" ? T.red
            : item.priority === "medium" ? "#d97706" : T.green;
          return (
            <Card key={i} sx={{ padding:"13px 15px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", marginBottom:8 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:18, fontWeight:900, color:T.teal,
                    fontFamily:"var(--font-display)",
                    minWidth:28 }}>#{i+1}</span>
                  <div style={{ fontSize:12.5, fontWeight:800, color:T.navy }}>
                    {item.title}
                  </div>
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:"2px 9px",
                  borderRadius:20, flexShrink:0,
                  background:`${priorityC}15`, color:priorityC }}>
                  {item.priority === "high" ? "Alta"
                   : item.priority === "medium" ? "Media" : "Baja"}
                </span>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8,
                flexWrap:"wrap" }}>
                {Object.entries(item.scores || {}).map(([k, v]) => (
                  <div key={k} style={{ padding:"3px 9px",
                    background:T.bg, borderRadius:20,
                    border:`1px solid ${T.bdr}`,
                    fontSize:10, color:T.tM }}>
                    {k}: <strong style={{ color:T.navy }}>{v}/10</strong>
                  </div>
                ))}
                <div style={{ padding:"3px 9px",
                  background:`${T.teal}15`, borderRadius:20,
                  border:`1px solid ${T.teal}30`,
                  fontSize:10, fontWeight:800, color:T.teal }}>
                  Total: {item.total}/40
                </div>
              </div>
              <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.5 }}>
                {item.justification}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // Executive report
  if (templateId === "executive_report") {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {result.executiveSummary && (
          <div style={{ padding:"14px 16px", background:`${T.navy}08`,
            borderRadius:10, border:`1px solid ${T.navy}15` }}>
            <div style={{ fontSize:10, fontWeight:800, color:T.teal,
              letterSpacing:".08em", marginBottom:7 }}>
              RESUMEN EJECUTIVO
            </div>
            <div style={{ fontSize:13, color:T.navy, lineHeight:1.7,
              fontWeight:500 }}>
              {result.executiveSummary}
            </div>
          </div>
        )}
        {[
          { label:"🏆 Logros del Período",        items:result.achievements,    c:T.green  },
          { label:"⚠️ Desafíos y Riesgos",        items:result.challenges,      c:"#d97706"},
          { label:"🔮 Proyección",                 items:[result.projection].filter(Boolean), c:T.blue},
          { label:"📋 Decisiones del Board",       items:result.boardDecisions,  c:T.navy   },
        ].map((s, i) => s.items?.length > 0 && (
          <div key={i}>
            <div style={{ fontSize:10, fontWeight:800, color:s.c,
              letterSpacing:".08em", marginBottom:8 }}>{s.label}</div>
            {renderList(s.items, s.c)}
          </div>
        ))}
      </div>
    );
  }

  // Generic / Benchmarking
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {Object.entries(result).map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        return (
          <div key={key}>
            <div style={{ fontSize:10, fontWeight:800, color:T.teal,
              letterSpacing:".08em", marginBottom:6, textTransform:"uppercase" }}>
              {key.replace(/([A-Z])/g," $1").trim()}
            </div>
            {Array.isArray(value)
              ? renderList(value)
              : (
                <div style={{ fontSize:12.5, color:T.navy, lineHeight:1.6,
                  padding:"10px 14px", background:T.bg, borderRadius:9 }}>
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </div>
              )
            }
          </div>
        );
      })}
    </div>
  );
});

// ── TEMPLATE CARD ─────────────────────────────────────────────
const TemplateCard = memo(({ template, onRun, loading }) => (
  <Card hover sx={{ padding:"15px 17px",
    border:`1.5px solid ${template.color}25` }}>
    <div style={{ display:"flex", gap:10, alignItems:"flex-start",
      marginBottom:10 }}>
      <span style={{ fontSize:24 }}>{template.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:800, color:T.navy,
          fontFamily:"var(--font-display)", marginBottom:3 }}>
          {template.label}
        </div>
        <div style={{ fontSize:11, color:T.tL, lineHeight:1.4 }}>
          {template.description}
        </div>
      </div>
    </div>
    <Btn variant="primary" full onClick={() => onRun(template)}
      disabled={loading} sx={{ background:template.color }}>
      {loading ? <Spinner size={12}/> : "🤖"} Ejecutar
    </Btn>
  </Card>
));

// ── HISTORY ITEM ──────────────────────────────────────────────
const HistoryItem = memo(({ item, onRestore, onDelete }) => (
  <div style={{ padding:"11px 14px", background:T.white,
    borderRadius:9, border:`1px solid ${T.bdr}`,
    marginBottom:7 }}>
    <div style={{ display:"flex", justifyContent:"space-between",
      alignItems:"flex-start", marginBottom:5 }}>
      <div style={{ display:"flex", gap:7, alignItems:"center" }}>
        <span style={{ fontSize:16 }}>{item.icon}</span>
        <span style={{ fontSize:12, fontWeight:800, color:T.navy }}>
          {item.label}
        </span>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <Btn variant="secondary" size="sm" onClick={() => onRestore(item)}>
          Ver resultado
        </Btn>
        <button onClick={() => onDelete(item.id)}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tL, fontSize:14, padding:"2px 4px" }}>🗑️</button>
      </div>
    </div>
    <div style={{ fontSize:10.5, color:T.tL }}>
      {fmt.date(item.runAt)} · {item.tokensUsed || "—"} tokens
    </div>
  </div>
));

// ── MAIN AI MODULE ────────────────────────────────────────────
const AI = memo(({ onNavigate }) => {
  const { kpis, okrs, initiatives, perspectives,
          strategicObjectives, benchmarkData, organization } = useApp();

  const [tab,      setTab]      = useState("templates");
  const [loading,  setLoading]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [history,  setHistory]  = useState([]);
  const [error,    setError]    = useState(null);

  // Build context
  const buildContext = useCallback(() => {
    const redKPIs    = kpis.filter(k => k.trafficLight === "red").length;
    const yellowKPIs = kpis.filter(k => k.trafficLight === "yellow").length;
    const greenKPIs  = kpis.filter(k => k.trafficLight === "green").length;
    const okrAvg     = calc.avgProgress(okrs);
    const activeInits  = initiatives.filter(i => i.status === "in_progress").length;
    const overdueInits = initiatives.filter(i =>
      calc.daysRemaining(i.endDate) < 0 && i.status !== "completed").length;
    const budgetPct = initiatives.length
      ? Math.round(initiatives.reduce((s,i) => s+(i.spent||0), 0) /
          Math.max(1, initiatives.reduce((s,i) => s+(i.budget||0), 0)) * 100) : 0;

    return {
      org:          organization?.name || "Hospital Punta Médica",
      period:       organization?.period || "Q1-Q2 2025",
      okrAvg,
      totalKPIs:    kpis.length,
      redKPIs, yellowKPIs, greenKPIs,
      activeInits, overdueInits, budgetPct,
      onTrackOKRs:  okrs.filter(o => o.status === "on_track").length,
      atRiskOKRs:   okrs.filter(o => o.status === "at_risk").length,
      perspectives: perspectives.map(p => p.label).join(", "),
      objectives:   strategicObjectives.slice(0, 6).map(o => o.title).join("; "),
      okrList:      okrs.map(o => `${o.code}: ${o.objective} (${o.progress}%)`).join("\n"),
      criticalKPIs: kpis.filter(k => k.trafficLight === "red")
        .map(k => `${k.name}: ${k.value}${k.unit} (meta: ${k.target}${k.unit})`).join("\n"),
      initiativesList: initiatives.slice(0,8)
        .map(i => `${i.title} | ${i.status} | ${i.progress}% | Budget: ${fmt.currency(i.budget)}`).join("\n"),
      belowIndustry: (benchmarkData || [])
        .filter(m => m.company < m.industry)
        .map(m => `${m.metric}: ${m.company} vs industria ${m.industry}${m.unit}`).join("\n"),
      aboveIndustry: (benchmarkData || [])
        .filter(m => m.company >= m.industry)
        .map(m => `${m.metric}: ${m.company}${m.unit}`).join("\n"),
    };
  }, [kpis, okrs, initiatives, perspectives, strategicObjectives,
      benchmarkData, organization]);

  const runTemplate = useCallback(async (template) => {
    setLoading(template.id);
    setError(null);
    setResult(null);
    setActiveTemplate(template);

    try {
      const ctx    = buildContext();
      const prompt = template.buildPrompt(ctx);
      const res    = await aiService.callJSON(prompt);
      setResult(res);
      setHistory(p => [{
        id:        Date.now().toString(),
        ...template,
        result:    res,
        runAt:     new Date().toISOString(),
        tokensUsed:Math.round(prompt.length / 4),
      }, ...p.slice(0, 19)]);
    } catch (e) {
      setError("Error al conectar con la IA. Verifica tu clave API en .env.local (VITE_ANTHROPIC_KEY).");
    }
    setLoading(null);
  }, [buildContext]);

  const TABS = [
    { id:"templates", label:"🤖 Plantillas IA"  },
    { id:"result",    label:"📄 Resultado"       },
    { id:"history",   label:"🕐 Historial"       },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="🤖 IA Estratégica"
        subtitle="Análisis inteligente con Claude · Diagnósticos, OKRs, KPIs y reportes"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="secondary" onClick={() => onNavigate("chat")}>
              💬 Asistente Chat
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("docs")}>
              📄 Analizar Docs
            </Btn>
          </div>
        }
      />

      {/* Stats */}
      <div className="sp-grid-4" style={{ marginBottom:20 }}>
        <StatCard label="Plantillas IA" value={PROMPT_TEMPLATES.length}
          sub="Disponibles" icon="🤖" color={T.navy}/>
        <StatCard label="Análisis Realizados" value={history.length}
          sub="Esta sesión" icon="📊" color={T.teal}/>
        <StatCard label="KPIs Críticos" value={kpis.filter(k=>k.trafficLight==="red").length}
          sub="Listos para análisis" icon="🚨" color={T.red}/>
        <StatCard label="Avance OKR" value={`${calc.avgProgress(okrs)}%`}
          sub="Contexto actual" icon="🎯" color={color.progressBar(calc.avgProgress(okrs))}/>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* ── TEMPLATES TAB ── */}
      {tab === "templates" && (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <AlertBox type="info" sx={{ marginBottom:16 }}>
            Cada plantilla utiliza el contexto actual de tus KPIs, OKRs e iniciativas.
            Asegúrate de tener configurada la variable <strong>VITE_ANTHROPIC_KEY</strong> en tu archivo .env.local
          </AlertBox>
          <div className="sp-grid-3" style={{ gap:12 }}>
            {PROMPT_TEMPLATES.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                loading={loading === template.id}
                onRun={(t) => { runTemplate(t); setTab("result"); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── RESULT TAB ── */}
      {tab === "result" && (
        <div>
          {loading && (
            <Card sx={{ padding:"32px", textAlign:"center" }}>
              <Spinner size={32} dark/>
              <div style={{ fontSize:13, fontWeight:700, color:T.navy,
                marginTop:14 }}>
                Analizando con Claude IA…
              </div>
              <div style={{ fontSize:11, color:T.tL, marginTop:6 }}>
                {activeTemplate?.label} · Esto puede tomar unos segundos
              </div>
            </Card>
          )}

          {error && !loading && (
            <AlertBox type="err">{error}</AlertBox>
          )}

          {result && !loading && activeTemplate && (
            <div>
              {/* Result header */}
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", gap:9, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>{activeTemplate.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:T.navy,
                      fontFamily:"var(--font-display)" }}>
                      {activeTemplate.label}
                    </div>
                    <div style={{ fontSize:11, color:T.tL }}>
                      Generado por Claude IA ·{" "}
                      {new Date().toLocaleString("es-MX")}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn variant="ghost" size="sm"
                    onClick={() => setTab("templates")}>
                    ← Volver
                  </Btn>
                  <Btn variant="secondary" size="sm"
                    onClick={() => runTemplate(activeTemplate)}>
                    🔄 Regenerar
                  </Btn>
                </div>
              </div>

              <Card sx={{ padding:"18px 20px" }}>
                <ResultRenderer
                  result={result}
                  templateId={activeTemplate.id}
                />
              </Card>
            </div>
          )}

          {!result && !loading && !error && (
            <div style={{ padding:"40px", textAlign:"center",
              background:T.bg, borderRadius:12 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.tM,
                marginBottom:6 }}>
                Sin resultados aún
              </div>
              <div style={{ fontSize:12, color:T.tL, marginBottom:16 }}>
                Selecciona una plantilla en la pestaña "Plantillas IA"
                para comenzar el análisis
              </div>
              <Btn variant="primary" onClick={() => setTab("templates")}>
                🤖 Ir a Plantillas
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center",
              background:T.bg, borderRadius:12 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🕐</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.tM }}>
                Sin historial aún
              </div>
              <div style={{ fontSize:11.5, color:T.tL }}>
                Los análisis ejecutados aparecerán aquí
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:700, color:T.tM }}>
                  {history.length} análisis realizados esta sesión
                </span>
                <Btn variant="ghost" size="sm"
                  onClick={() => setHistory([])}>
                  🗑️ Limpiar historial
                </Btn>
              </div>
              {history.map(item => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onRestore={(it) => {
                    setResult(it.result);
                    setActiveTemplate(it);
                    setTab("result");
                  }}
                  onDelete={(id) => setHistory(p => p.filter(h => h.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AI;
