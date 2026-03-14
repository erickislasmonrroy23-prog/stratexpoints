// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Exportar Datos
// ══════════════════════════════════════════════════════════════

import { useState, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, SectionHeader, StatCard,
  AlertBox, T, Spinner,
} from "../ui/index.jsx";
import { color, calc, fmt, exporter } from "../../utils/helpers.js";

// ── EXPORT CARD ───────────────────────────────────────────────
const ExportCard = memo(({ item, onExport, loading }) => (
  <Card sx={{ padding:"16px 18px",
    border:`1.5px solid ${item.color}20` }}>
    <div style={{ display:"flex", gap:12, alignItems:"flex-start",
      marginBottom:12 }}>
      <span style={{ fontSize:26 }}>{item.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:800, color:T.navy,
          fontFamily:"var(--font-display)", marginBottom:3 }}>
          {item.label}
        </div>
        <div style={{ fontSize:11, color:T.tL, lineHeight:1.4 }}>
          {item.description}
        </div>
      </div>
    </div>
    <div style={{ display:"flex", gap:7, flexWrap:"wrap",
      marginBottom:12 }}>
      {item.formats.map(f => (
        <span key={f} style={{ fontSize:9.5, fontWeight:800,
          padding:"2px 8px", borderRadius:20,
          background:`${item.color}12`, color:item.color,
          border:`1px solid ${item.color}25` }}>
          {f}
        </span>
      ))}
    </div>
    <div style={{ display:"flex", gap:7 }}>
      {item.formats.map(format => (
        <Btn key={format} variant="secondary" size="sm"
          onClick={() => onExport(item.id, format)}
          disabled={loading === `${item.id}_${format}`}
          sx={{ borderColor:item.color, color:item.color }}>
          {loading === `${item.id}_${format}`
            ? <Spinner size={11} dark/>
            : `⬇️ ${format}`}
        </Btn>
      ))}
    </div>
  </Card>
));

// ── PRINT PREVIEW ─────────────────────────────────────────────
const PrintSection = memo(({ kpis, okrs, initiatives, organization }) => {
  const avgProg = calc.avgProgress(okrs);

  return (
    <Card sx={{ padding:"20px 24px" }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.navy, marginBottom:4,
        fontFamily:"var(--font-display)" }}>
        🖨️ Vista Previa del Reporte
      </div>
      <div style={{ fontSize:11, color:T.tL, marginBottom:16 }}>
        Reporte ejecutivo listo para imprimir o exportar como PDF
      </div>

      {/* Report preview */}
      <div style={{ border:`1px solid ${T.bdr}`, borderRadius:10,
        overflow:"hidden" }}>
        {/* Report header */}
        <div style={{ padding:"16px 20px",
          background:`linear-gradient(135deg,${T.navy},${T.navyL})`,
          color:"#fff" }}>
          <div style={{ fontSize:18, fontWeight:900,
            fontFamily:"var(--font-display)" }}>
            {organization?.name || "Hospital Punta Médica"}
          </div>
          <div style={{ fontSize:11, opacity:.7, marginTop:3 }}>
            Reporte Estratégico · {organization?.period || "2025"} ·
            Generado: {new Date().toLocaleDateString("es-MX")}
          </div>
        </div>

        {/* KPI summary */}
        <div style={{ padding:"16px 20px",
          borderBottom:`1px solid ${T.bdr}` }}>
          <div style={{ fontSize:11, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:10 }}>
            INDICADORES CLAVE
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { l:"IEG",        v:`${avgProg}%`,
                c:color.progressBar(avgProg) },
              { l:"KPIs Verde", v:kpis.filter(k=>k.trafficLight==="green").length,
                c:T.green },
              { l:"KPIs Rojo",  v:kpis.filter(k=>k.trafficLight==="red").length,
                c:T.red },
              { l:"Iniciativas",v:initiatives.filter(i=>i.status==="in_progress").length,
                c:T.blue },
            ].map((m, i) => (
              <div key={i} style={{ textAlign:"center", padding:"10px 8px",
                background:T.bg, borderRadius:8 }}>
                <div style={{ fontSize:20, fontWeight:900, color:m.c,
                  fontFamily:"var(--font-display)" }}>{m.v}</div>
                <div style={{ fontSize:10, color:T.tL, marginTop:2 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OKR list preview */}
        <div style={{ padding:"16px 20px" }}>
          <div style={{ fontSize:11, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:10 }}>
            OKRs — ESTADO ACTUAL
          </div>
          {okrs.slice(0, 4).map(okr => (
            <div key={okr.id} style={{ display:"flex",
              justifyContent:"space-between", alignItems:"center",
              marginBottom:7, padding:"7px 10px",
              background:T.bg, borderRadius:7 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.navy,
                  overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>
                  {okr.code}: {okr.objective}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center",
                gap:8, flexShrink:0 }}>
                <div style={{ width:80, height:5, background:"#e6ecf5",
                  borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${okr.progress}%`,
                    background:color.progressBar(okr.progress),
                    borderRadius:99 }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:800,
                  color:color.progressBar(okr.progress), minWidth:30 }}>
                  {okr.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <Btn variant="primary" full onClick={() => exporter.printPDF()}>
          🖨️ Imprimir / Guardar PDF
        </Btn>
      </div>
    </Card>
  );
});

// ── MAIN EXPORT ───────────────────────────────────────────────
const Export = memo(({ onNavigate }) => {
  const { kpis, okrs, initiatives, strategicObjectives,
          perspectives, users, organization } = useApp();
  const [loading, setLoading] = useState(null);
  const [done,    setDone]    = useState([]);

  const EXPORT_ITEMS = [
    {
      id:"okrs", icon:"🎯", label:"OKRs Completos",
      description:"Todos los OKRs con Key Results, progreso, estado y responsables",
      formats:["CSV","JSON"],
      color:T.teal,
    },
    {
      id:"kpis", icon:"📊", label:"KPI Analytics",
      description:"Indicadores estratégicos con valores, metas, semáforos y tendencias",
      formats:["CSV","JSON"],
      color:T.blue,
    },
    {
      id:"initiatives", icon:"🚀", label:"Iniciativas",
      description:"Iniciativas estratégicas con presupuesto, fechas y progreso",
      formats:["CSV","JSON"],
      color:T.violet,
    },
    {
      id:"bsc", icon:"🗺️", label:"BSC Completo",
      description:"Perspectivas, objetivos estratégicos y sus relaciones",
      formats:["CSV","JSON"],
      color:T.navy,
    },
    {
      id:"users", icon:"👥", label:"Usuarios",
      description:"Directorio de usuarios con roles y asignaciones",
      formats:["CSV","JSON"],
      color:"#d97706",
    },
    {
      id:"full", icon:"📦", label:"Exportación Completa",
      description:"Todos los datos de la plataforma en un solo archivo",
      formats:["JSON"],
      color:T.gold,
    },
  ];

  const handleExport = useCallback(async (id, format) => {
    const key = `${id}_${format}`;
    setLoading(key);
    await new Promise(r => setTimeout(r, 600)); // Simulate processing

    try {
      if (format === "CSV") {
        switch (id) {
          case "okrs":
            exporter.downloadCSV(exporter.okrsToCSV(okrs), "stratex_okrs.csv");
            break;
          case "kpis":
            exporter.downloadCSV(exporter.kpisToCSV(kpis), "stratex_kpis.csv");
            break;
          case "initiatives":
            exporter.downloadCSV(
              exporter.okrsToCSV(initiatives.map(i => ({
                ...i, objective:i.title, progress:i.progress,
                keyResults:[],
              }))),
              "stratex_initiatives.csv"
            );
            break;
          case "bsc":
            exporter.downloadCSV(
              exporter.okrsToCSV(strategicObjectives.map(o => ({
                ...o, objective:o.title, progress:o.progress,
                keyResults:[],
              }))),
              "stratex_bsc.csv"
            );
            break;
          case "users":
            exporter.downloadCSV(
              exporter.okrsToCSV(users.map(u => ({
                ...u, objective:u.name, progress:0,
                keyResults:[],
              }))),
              "stratex_users.csv"
            );
            break;
          default:
            break;
        }
      } else if (format === "JSON") {
        const dataMap = {
          okrs:        { okrs, exportedAt:new Date().toISOString() },
          kpis:        { kpis, exportedAt:new Date().toISOString() },
          initiatives: { initiatives, exportedAt:new Date().toISOString() },
          bsc:         { perspectives, strategicObjectives, exportedAt:new Date().toISOString() },
          users:       { users, exportedAt:new Date().toISOString() },
          full:        { okrs, kpis, initiatives, perspectives,
                         strategicObjectives, users,
                         organization,
                         exportedAt:new Date().toISOString() },
        };
        const data   = dataMap[id] || {};
        const blob   = new Blob([JSON.stringify(data, null, 2)],
          { type:"application/json" });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement("a");
        a.href       = url;
        a.download   = `stratex_${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setDone(p => [...p, key]);
      setTimeout(() => setDone(p => p.filter(k => k !== key)), 3000);
    } catch {
      console.error("Export error");
    }
    setLoading(null);
  }, [okrs, kpis, initiatives, perspectives, strategicObjectives,
      users, organization]);

  return (
    <div className="sp-page">
      <SectionHeader
        title="📤 Exportar Datos"
        subtitle="Descarga los datos de la plataforma en múltiples formatos"
      />

      {/* Stats */}
      <div className="sp-grid-4" style={{ marginBottom:20 }}>
        <StatCard label="OKRs" value={okrs.length}
          sub="Exportables" icon="🎯" color={T.teal}/>
        <StatCard label="KPIs" value={kpis.length}
          sub="Indicadores" icon="📊" color={T.blue}/>
        <StatCard label="Iniciativas" value={initiatives.length}
          sub="Proyectos" icon="🚀" color={T.violet}/>
        <StatCard label="Usuarios" value={users.length}
          sub="Directorio" icon="👥" color={T.navy}/>
      </div>

      <AlertBox type="info" sx={{ marginBottom:16 }}>
        Los archivos CSV son compatibles con Excel y Google Sheets.
        Los archivos JSON son ideales para integración con otros sistemas.
      </AlertBox>

      {/* Export cards */}
      <div className="sp-grid-3" style={{ marginBottom:24 }}>
        {EXPORT_ITEMS.map(item => (
          <div key={item.id} style={{ position:"relative" }}>
            <ExportCard
              item={item}
              onExport={handleExport}
              loading={loading}
            />
            {done.some(k => k.startsWith(item.id)) && (
              <div style={{ position:"absolute", top:10, right:10,
                background:T.green, color:"#fff", fontSize:10,
                fontWeight:800, padding:"3px 9px", borderRadius:20,
                animation:"fadeIn .2s ease" }}>
                ✅ Descargado
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print section */}
      <PrintSection
        kpis={kpis}
        okrs={okrs}
        initiatives={initiatives}
        organization={organization}
      />

      {/* Tips */}
      <div style={{ marginTop:14, padding:"10px 14px",
        background:`${T.teal}08`, borderRadius:9,
        border:`1px solid ${T.teal}25`,
        display:"flex", gap:10 }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div style={{ fontSize:11.5, color:T.tM, lineHeight:1.6 }}>
          <strong>Tip:</strong> Usa la exportación JSON completa para hacer
          respaldos de toda la plataforma. Los CSV son ideales para reportes
          rápidos en Excel. La función de impresión genera un PDF ejecutivo
          listo para presentar al comité directivo.
        </div>
      </div>
    </div>
  );
});

export default Export;
