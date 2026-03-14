// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Analizador de Documentos IA
// ══════════════════════════════════════════════════════════════

import { useState, useRef, memo, useCallback } from "react";
import {
  Card, Btn, Bar, SectionHeader, AlertBox,
  Spinner, T,
} from "../ui/index.jsx";
import { aiService } from "../../utils/helpers.js";

// ── ANALYSIS TYPES ────────────────────────────────────────────
const ANALYSIS_TYPES = [
  {
    id:"summary",
    icon:"📋",
    label:"Resumen Ejecutivo",
    description:"Extrae los puntos clave y conclusiones principales",
    prompt:(text) => `Analiza el siguiente documento y proporciona:
1. Resumen ejecutivo (3-4 párrafos)
2. Puntos clave (5-7 bullets)
3. Conclusiones principales
4. Relevancia para gestión estratégica hospitalaria

Documento:
${text.substring(0, 4000)}

Formato JSON: {executiveSummary, keyPoints[], conclusions[], strategicRelevance}`,
  },
  {
    id:"kpi_extraction",
    icon:"📊",
    label:"Extraer KPIs",
    description:"Identifica métricas e indicadores mencionados",
    prompt:(text) => `Analiza el documento e identifica todos los KPIs, métricas e indicadores mencionados:

Documento:
${text.substring(0, 4000)}

Para cada indicador extrae:
- Nombre del indicador
- Valor mencionado
- Unidad de medida
- Contexto/objetivo
- Si es aplicable a un hospital

Formato JSON: {kpis: [{name, value, unit, context, applicable}], summary}`,
  },
  {
    id:"okr_extraction",
    icon:"🎯",
    label:"Extraer OKRs",
    description:"Identifica objetivos y resultados clave en el documento",
    prompt:(text) => `Analiza el documento e identifica objetivos estratégicos y resultados clave:

Documento:
${text.substring(0, 4000)}

Extrae posibles OKRs con su estructura:
- Objetivo (qué se quiere lograr)
- Key Results (cómo se medirá)
- Período implícito
- Perspectiva BSC sugerida

Formato JSON: {okrs: [{objective, keyResults:[{title,target,unit}], period, perspective}], insights}`,
  },
  {
    id:"risk_analysis",
    icon:"⚠️",
    label:"Análisis de Riesgos",
    description:"Identifica riesgos y áreas de atención mencionados",
    prompt:(text) => `Analiza el documento e identifica riesgos y áreas de atención:

Documento:
${text.substring(0, 4000)}

Para cada riesgo identifica:
- Descripción del riesgo
- Severidad (Alta/Media/Baja)
- Área afectada
- Mitigación sugerida

Formato JSON: {risks: [{description, severity, area, mitigation}], overallRiskLevel, recommendations[]}`,
  },
  {
    id:"action_plan",
    icon:"🚀",
    label:"Plan de Acción",
    description:"Genera un plan de acción basado en el contenido",
    prompt:(text) => `Basándote en el siguiente documento, genera un plan de acción estratégico:

Documento:
${text.substring(0, 4000)}

El plan debe incluir:
1. Acciones inmediatas (0-30 días)
2. Acciones a mediano plazo (31-90 días)
3. Acciones a largo plazo (91-365 días)
4. Responsables sugeridos
5. Recursos necesarios

Formato JSON: {immediate[], midTerm[], longTerm[], resources[], successMetrics[]}`,
  },
];

// ── DROPZONE ──────────────────────────────────────────────────
const Dropzone = memo(({ onFile, loading }) => {
  const inputRef  = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border:       `2px dashed ${dragging ? T.teal : T.bdr}`,
        borderRadius: 14,
        padding:      "40px 24px",
        textAlign:    "center",
        cursor:       loading ? "not-allowed" : "pointer",
        background:   dragging ? `${T.teal}08` : T.bg,
        transition:   "all .2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.pdf"
        onChange={handleChange}
        style={{ display:"none" }}
      />
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column",
          alignItems:"center", gap:10 }}>
          <Spinner size={28} dark/>
          <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>
            Procesando documento…
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.navy,
            marginBottom:6 }}>
            {dragging ? "Suelta el archivo aquí" : "Arrastra un archivo o haz clic"}
          </div>
          <div style={{ fontSize:11.5, color:T.tL }}>
            Formatos soportados: .txt, .md, .csv, .json, .pdf (texto)
          </div>
        </>
      )}
    </div>
  );
});

// ── DOC RESULT RENDERER ───────────────────────────────────────
const DocResultRenderer = memo(({ result, analysisType }) => {
  if (!result) return null;
  const type = ANALYSIS_TYPES.find(t => t.id === analysisType);

  const renderSection = (label, items, c = T.teal, icon = "•") => {
    if (!items || (Array.isArray(items) && !items.length)) return null;
    const arr = Array.isArray(items) ? items : [items];
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:800, color:c,
          letterSpacing:".08em", marginBottom:8 }}>
          {label}
        </div>
        {arr.map((item, i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:6,
            padding:"8px 11px", background:`${c}08`,
            borderRadius:8, border:`1px solid ${c}20` }}>
            <span style={{ fontSize:12, flexShrink:0 }}>{icon}</span>
            <div style={{ fontSize:12, color:T.navy, lineHeight:1.5 }}>
              {typeof item === "string" ? item : (
                <div>
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} style={{ marginBottom:2 }}>
                      <strong style={{ color:c }}>
                        {k.replace(/([A-Z])/g," $1").trim()}:
                      </strong>{" "}
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Summary
  if (analysisType === "summary") {
    return (
      <div>
        {result.executiveSummary && (
          <div style={{ padding:"14px 16px", background:`${T.navy}08`,
            borderRadius:10, border:`1px solid ${T.navy}15`,
            marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:800, color:T.teal,
              letterSpacing:".08em", marginBottom:7 }}>
              RESUMEN EJECUTIVO
            </div>
            <div style={{ fontSize:13, color:T.navy, lineHeight:1.7 }}>
              {result.executiveSummary}
            </div>
          </div>
        )}
        {renderSection("📌 PUNTOS CLAVE", result.keyPoints, T.teal, "✓")}
        {renderSection("💡 CONCLUSIONES", result.conclusions, T.blue, "→")}
        {result.strategicRelevance && renderSection(
          "🏥 RELEVANCIA ESTRATÉGICA",
          [result.strategicRelevance], T.violet, "🎯"
        )}
      </div>
    );
  }

  // KPI extraction
  if (analysisType === "kpi_extraction") {
    return (
      <div>
        {result.summary && (
          <AlertBox type="info" sx={{ marginBottom:14 }}>
            {result.summary}
          </AlertBox>
        )}
        {(result.kpis || []).map((kpi, i) => (
          <Card key={i} sx={{ padding:"12px 14px", marginBottom:8,
            border:`1.5px solid ${kpi.applicable ? T.teal+"40" : T.bdr}` }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:T.navy,
                  marginBottom:3 }}>
                  {kpi.name}
                </div>
                <div style={{ fontSize:11, color:T.tL }}>{kpi.context}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                <div style={{ fontSize:16, fontWeight:900, color:T.teal,
                  fontFamily:"var(--font-display)" }}>
                  {kpi.value}{kpi.unit}
                </div>
                {kpi.applicable && (
                  <span style={{ fontSize:9.5, fontWeight:800,
                    color:T.green }}>✅ Aplicable</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // OKR extraction
  if (analysisType === "okr_extraction") {
    return (
      <div>
        {result.insights && (
          <AlertBox type="info" sx={{ marginBottom:14 }}>
            {result.insights}
          </AlertBox>
        )}
        {(result.okrs || []).map((okr, i) => (
          <Card key={i} sx={{ padding:"13px 15px", marginBottom:10,
            border:`1.5px solid ${T.teal}30` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.navy,
              marginBottom:8, fontFamily:"var(--font-display)" }}>
              🎯 {okr.objective}
            </div>
            <div style={{ display:"flex", gap:7, marginBottom:10,
              flexWrap:"wrap" }}>
              {okr.period && (
                <span style={{ fontSize:10, padding:"2px 8px",
                  borderRadius:20, background:T.bg,
                  color:T.tL, border:`1px solid ${T.bdr}` }}>
                  📅 {okr.period}
                </span>
              )}
              {okr.perspective && (
                <span style={{ fontSize:10, padding:"2px 8px",
                  borderRadius:20, background:`${T.teal}12`,
                  color:T.teal, fontWeight:700 }}>
                  🗺️ {okr.perspective}
                </span>
              )}
            </div>
            {(okr.keyResults || []).map((kr, ki) => (
              <div key={ki} style={{ display:"flex", gap:8,
                padding:"6px 10px", background:T.bg,
                borderRadius:7, marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:800,
                  color:T.teal, flexShrink:0 }}>KR{ki+1}</span>
                <span style={{ fontSize:11.5, color:T.navy, flex:1 }}>
                  {kr.title}
                </span>
                <span style={{ fontSize:11, fontWeight:800,
                  color:T.blue, flexShrink:0 }}>
                  {kr.target}{kr.unit}
                </span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  // Risk analysis
  if (analysisType === "risk_analysis") {
    const sevCfg = {
      Alta:  { c:T.red,    bg:"#fee2e2" },
      Media: { c:"#d97706",bg:"#fef3c7" },
      Baja:  { c:T.green,  bg:"#d1fae5" },
    };
    return (
      <div>
        {result.overallRiskLevel && (
          <div style={{ padding:"10px 14px", marginBottom:14,
            background:sevCfg[result.overallRiskLevel]?.bg || T.bg,
            borderRadius:9 }}>
            <span style={{ fontSize:12, fontWeight:800,
              color:sevCfg[result.overallRiskLevel]?.c || T.tM }}>
              Nivel de Riesgo Global: {result.overallRiskLevel}
            </span>
          </div>
        )}
        {(result.risks || []).map((risk, i) => {
          const sc = sevCfg[risk.severity] || sevCfg.Media;
          return (
            <Card key={i} sx={{ padding:"12px 14px", marginBottom:8,
              border:`1.5px solid ${sc.c}30` }}>
              <div style={{ display:"flex", gap:8,
                alignItems:"flex-start" }}>
                <span style={{ fontSize:10, fontWeight:800,
                  padding:"2px 8px", borderRadius:20,
                  background:sc.bg, color:sc.c, flexShrink:0 }}>
                  {risk.severity}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700,
                    color:T.navy, marginBottom:4 }}>
                    {risk.description}
                  </div>
                  <div style={{ fontSize:11, color:T.tL }}>
                    Área: {risk.area}
                  </div>
                  <div style={{ fontSize:11, color:T.tM, marginTop:4,
                    padding:"5px 8px", background:`${T.teal}08`,
                    borderRadius:6 }}>
                    💡 {risk.mitigation}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {renderSection("📋 RECOMENDACIONES", result.recommendations,
          T.teal, "✓")}
      </div>
    );
  }

  // Action plan
  if (analysisType === "action_plan") {
    return (
      <div>
        {[
          { label:"⚡ INMEDIATO (0–30 días)",   items:result.immediate,  c:T.red   },
          { label:"📅 MEDIANO PLAZO (31–90d)",  items:result.midTerm,   c:"#d97706"},
          { label:"🎯 LARGO PLAZO (91–365d)",   items:result.longTerm,  c:T.blue  },
          { label:"🛠️ RECURSOS NECESARIOS",     items:result.resources,  c:T.violet},
          { label:"📊 MÉTRICAS DE ÉXITO",       items:result.successMetrics,c:T.green},
        ].map((s, i) => renderSection(s.label, s.items, s.c, "→"))}
      </div>
    );
  }

  // Generic fallback
  return (
    <pre style={{ fontSize:11, color:T.tM, background:T.bg,
      padding:16, borderRadius:9, overflow:"auto",
      whiteSpace:"pre-wrap" }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
});

// ── MAIN DOC READER ───────────────────────────────────────────
const DocReader = memo(({ onNavigate }) => {
  const [docText,       setDocText]       = useState("");
  const [docName,       setDocName]       = useState("");
  const [docSize,       setDocSize]       = useState(0);
  const [analysisType,  setAnalysisType]  = useState("summary");
  const [loading,       setLoading]       = useState(false);
  const [fileLoading,   setFileLoading]   = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState(null);
  const [customPrompt,  setCustomPrompt]  = useState("");
  const [useCustom,     setUseCustom]     = useState(false);

  const handleFile = useCallback(async (file) => {
    setFileLoading(true);
    setError(null);
    setResult(null);
    setDocName(file.name);
    setDocSize(file.size);

    try {
      const text = await file.text();
      setDocText(text);
    } catch {
      setError("No se pudo leer el archivo. Asegúrate de que sea un archivo de texto.");
    }
    setFileLoading(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!docText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const type   = ANALYSIS_TYPES.find(t => t.id === analysisType);
      const prompt = useCustom && customPrompt.trim()
        ? `${customPrompt}\n\nDocumento:\n${docText.substring(0, 4000)}\n\nResponde en JSON.`
        : type.prompt(docText);

      const res = await aiService.callJSON(prompt);
      setResult(res);
    } catch {
      setError("Error al analizar el documento. Verifica tu clave API.");
    }
    setLoading(false);
  }, [docText, analysisType, useCustom, customPrompt]);

  const clearDoc = () => {
    setDocText(""); setDocName(""); setDocSize(0);
    setResult(null); setError(null);
  };

  return (
    <div className="sp-page">
      <SectionHeader
        title="📄 Analizador de Documentos"
        subtitle="Extrae KPIs, OKRs, riesgos y planes de acción de cualquier documento con IA"
        action={
          <Btn variant="secondary" onClick={() => onNavigate("ai")}>
            🤖 IA Estratégica
          </Btn>
        }
      />

      <div className="sp-grid-2" style={{ gap:16 }}>
        {/* Left: upload + config */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Upload */}
          {!docText ? (
            <Dropzone onFile={handleFile} loading={fileLoading}/>
          ) : (
            <Card sx={{ padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ display:"flex", gap:9, alignItems:"center" }}>
                  <span style={{ fontSize:24 }}>📄</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:T.navy }}>
                      {docName}
                    </div>
                    <div style={{ fontSize:10.5, color:T.tL }}>
                      {(docSize / 1024).toFixed(1)} KB ·{" "}
                      {docText.split("\n").length} líneas ·{" "}
                      {docText.split(" ").length} palabras
                    </div>
                  </div>
                </div>
                <Btn variant="ghost" size="sm" onClick={clearDoc}>
                  ✕ Quitar
                </Btn>
              </div>
              {/* Preview */}
              <div style={{ background:T.bg, borderRadius:8, padding:"10px 12px",
                maxHeight:120, overflow:"hidden", position:"relative" }}>
                <div style={{ fontSize:10.5, color:T.tM, lineHeight:1.5,
                  fontFamily:"monospace" }}>
                  {docText.substring(0, 300)}…
                </div>
                <div style={{ position:"absolute", bottom:0, left:0, right:0,
                  height:40,
                  background:"linear-gradient(transparent,#f0f4f8)" }}/>
              </div>
            </Card>
          )}

          {/* Analysis type */}
          <Card sx={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.tM,
              letterSpacing:".08em", marginBottom:10 }}>
              TIPO DE ANÁLISIS
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {ANALYSIS_TYPES.map(type => (
                <div
                  key={type.id}
                  onClick={() => { setAnalysisType(type.id); setUseCustom(false); }}
                  style={{
                    padding:    "9px 12px",
                    borderRadius:8,
                    background: analysisType===type.id && !useCustom
                      ? `${T.teal}12` : T.bg,
                    border:     `1.5px solid ${analysisType===type.id && !useCustom
                      ? T.teal : T.bdr}`,
                    cursor:     "pointer",
                    transition: "all .15s",
                    display:    "flex",
                    gap:        9,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize:16, flexShrink:0 }}>{type.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize:10.5, color:T.tL }}>
                      {type.description}
                    </div>
                  </div>
                </div>
              ))}

              {/* Custom prompt */}
              <div
                onClick={() => setUseCustom(true)}
                style={{
                  padding:    "9px 12px",
                  borderRadius:8,
                  background: useCustom ? `${T.gold}12` : T.bg,
                  border:     `1.5px solid ${useCustom ? T.gold : T.bdr}`,
                  cursor:     "pointer",
                  transition: "all .15s",
                }}>
                <div style={{ display:"flex", gap:9, alignItems:"center",
                  marginBottom: useCustom ? 8 : 0 }}>
                  <span style={{ fontSize:16 }}>✏️</span>
                  <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                    Prompt personalizado
                  </div>
                </div>
                {useCustom && (
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Escribe tu instrucción personalizada aquí..."
                    className="sp-textarea"
                    style={{ marginTop:4, minHeight:80 }}
                  />
                )}
              </div>
            </div>

            <Btn variant="primary" full
              onClick={handleAnalyze}
              disabled={!docText || loading}
              sx={{ marginTop:12 }}>
              {loading ? <Spinner size={13}/> : "🔍"}{" "}
              {loading ? "Analizando…" : "Analizar Documento"}
            </Btn>
          </Card>
        </div>

        {/* Right: result */}
        <div>
          {loading && (
            <Card sx={{ padding:"40px", textAlign:"center" }}>
              <Spinner size={28} dark/>
              <div style={{ fontSize:13, fontWeight:700, color:T.navy, marginTop:14 }}>
                Analizando con Claude IA…
              </div>
              <div style={{ fontSize:11, color:T.tL, marginTop:6 }}>
                {ANALYSIS_TYPES.find(t=>t.id===analysisType)?.label}
              </div>
            </Card>
          )}

          {error && !loading && (
            <AlertBox type="err">{error}</AlertBox>
          )}

          {result && !loading && (
            <Card sx={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:800, color:T.navy,
                  fontFamily:"var(--font-display)" }}>
                  {ANALYSIS_TYPES.find(t=>t.id===analysisType)?.icon}{" "}
                  {useCustom ? "Análisis Personalizado"
                    : ANALYSIS_TYPES.find(t=>t.id===analysisType)?.label}
                </div>
                <Btn variant="ghost" size="sm" onClick={handleAnalyze}>
                  🔄 Regenerar
                </Btn>
              </div>
              <DocResultRenderer result={result} analysisType={analysisType}/>
            </Card>
          )}

          {!result && !loading && !error && (
            <div style={{ padding:"40px 24px", textAlign:"center",
              background:T.bg, borderRadius:12,
              border:`2px dashed ${T.bdr}` }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.tM,
                marginBottom:6 }}>
                {docText ? "Listo para analizar" : "Carga un documento"}
              </div>
              <div style={{ fontSize:11.5, color:T.tL }}>
                {docText
                  ? "Selecciona el tipo de análisis y haz clic en Analizar"
                  : "Arrastra un archivo .txt, .md, .csv o .json"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DocReader;
