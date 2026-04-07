import React, { useState } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { groqService, objectivesService, okrService, kpiService, notificationService } from './services.js';
import { useStore } from './store.js';
import { getQuarterFromDate } from './utils.js';

// Configuración del Worker para que React pueda leer PDFs sin bloquearse
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function DocAnalyzer() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [docType, setDocType] = useState('auto');
  const objectives = useStore(state => state.objectives);
  const perspectives = useStore(state => state.perspectives);

  const handleUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const analyzeDoc = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      let textToAnalyze = "";
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textToAnalyze = result.value;
      } else if (fileName.match(/\.(xlsx|xls|csv)$/)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        // Leer TODAS las hojas del Excel para no perder datos ocultos
        textToAnalyze = workbook.SheetNames.map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join("\n\n");
      } else if (fileName.match(/\.(pptx|ppt)$/)) {
        setSummary({ text: "⚠️ Para presentaciones de PowerPoint (.pptx, .ppt), por favor guárdalas como PDF y sube el PDF. El formato PDF garantiza que la IA pueda leer todas tus diapositivas con precisión.", objectives: [], okrs: [], kpis: [] });
        setAnalyzing(false);
        return;
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        // Leemos solo las primeras 3 páginas para no saturar la memoria de la IA
        const pagesToRead = Math.min(pdf.numPages, 3);
        for (let i = 1; i <= pagesToRead; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          textToAnalyze += content.items.map(item => item.str).join(" ") + "\n";
        }
      } else {
        textToAnalyze = await file.text();
      }
      
      textToAnalyze = textToAnalyze.trim();
      if (!textToAnalyze) {
        setSummary({ text: "⚠️ El documento parece estar vacío o es un PDF escaneado (una imagen). La plataforma necesita un archivo con texto seleccionable para poder analizarlo.", objectives: [], okrs: [], kpis: [] });
        setAnalyzing(false);
        return;
      }

      // Limpieza agresiva: Quita símbolos ocultos de PDF y deja solo letras/números
      // Esto es una medida de seguridad para evitar que caracteres maliciosos o de control
      // interfieran con el prompt de la IA.
      textToAnalyze = textToAnalyze.replace(/[^\w\s.,;:!?()\-áéíóúÁÉÍÓÚñÑ$%€#@&]/g, ' ').replace(/\s+/g, ' ').trim(); // Permitir algunos símbolos comunes en datos financieros/KPIs
      // Aumentamos el límite a 25,000 caracteres porque el nuevo modelo tiene mucha más memoria
      if (textToAnalyze.length > 25000) textToAnalyze = textToAnalyze.substring(0, 25000);
      
      let contextInstruction = `Tu tarea es extraer la estrategia del documento y clasificarla en Objetivos, OKRs y KPIs según corresponda. Si el texto es desordenado, deduce lógicamente.`;
      if (docType === 'map') contextInstruction = `IMPORTANTE: El documento es EXCLUSIVAMENTE un Mapa Estratégico. Clasifica TODOS los puntos encontrados ÚNICAMENTE como "objectives" (asignando perspective_id 1=Financiera, 2=Clientes, 3=Procesos, 4=Aprendizaje). Deja los arreglos "okrs" y "kpis" TOTALMENTE VACÍOS [].`;
      if (docType === 'okr') contextInstruction = `IMPORTANTE: El documento es EXCLUSIVAMENTE un listado de OKRs. Clasifica TODOS los puntos encontrados ÚNICAMENTE como "okrs". Deja los arreglos "objectives" y "kpis" TOTALMENTE VACÍOS [].`;
      if (docType === 'kpi') contextInstruction = `IMPORTANTE: El documento es EXCLUSIVAMENTE un listado de KPIs. Clasifica TODOS los puntos encontrados ÚNICAMENTE como "kpis". Deja los arreglos "objectives" y "okrs" TOTALMENTE VACÍOS [].`;

      const prompt = `Eres un Analista Estratégico Senior. ${contextInstruction}
      
      ESTRUCTURA REQUERIDA EXACTA EN JSON:
      {
        "text": "Breve resumen analítico de 2 líneas.",
        "objectives": [{"name": "Cualquier meta estratégica o de alto nivel encontrada", "perspective_id": 1}],
        "okrs": [{"objective": "Cualquier meta operativa o táctica", "department": "General", "owner": "Equipo"}],
        "kpis": [{"name": "Cualquier métrica, porcentaje o número detectado", "target": 100, "unit": "%"} ]
      }
      IMPORTANTE: DEVUELVE ÚNICA Y EXCLUSIVAMENTE EL JSON VÁLIDO. NO agregues saludos, ni confirmaciones, ni texto antes o después de las llaves {}.
      Documento: ${textToAnalyze}`;

      // console.log("✅ TEXTO EXTRAÍDO DEL DOCUMENTO (Primeros 300 caracteres):", textToAnalyze.substring(0, 300));

      // La llamada a la IA se hace con `jsonMode=true`. Esta es la principal defensa contra
      // la inyección de prompts, ya que fuerza a la IA a devolver únicamente un objeto JSON
      // válido, previniendo la ejecución de scripts o la devolución de texto no deseado.
      // Pasamos "true" como segundo parámetro para activar el Modo JSON estricto
      const response = await groqService.ask(
        [{ role: 'system', content: 'Eres un analizador de texto que solo responde con JSON válido.' }, { role: 'user', content: prompt }],
        true
      );

      // Al usar jsonMode, la IA devuelve un string JSON puro garantizado por la API
      const parsed = JSON.parse(response);
      
      setSummary({
        text: parsed.text || "Análisis completado.",
        objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
        okrs: Array.isArray(parsed.okrs) ? parsed.okrs : [],
        kpis: Array.isArray(parsed.kpis) ? parsed.kpis : []
      });
    } catch(err) {
      console.error("Error en DocAnalyzer:", err);
      setSummary({ text: `❌ Fallo en la lectura:\n${err.message}\n\nAsegúrate de que el archivo no esté protegido con contraseña y contenga texto seleccionable.`, objectives: [], okrs: [], kpis: [] });
    }
    setAnalyzing(false);
  };

  const importToPlatform = async () => {
    if (!summary || importing) return;
    setImporting(true);
    let insertCount = 0;
    const promises = [];
    try {
      // Inyectar Objetivos al Mapa Estratégico
      const newObjectivesPayloads = [];
      const tempObjectives = [...(objectives || [])]; // Start with existing objectives

      if (summary.objectives) {
        for (const obj of summary.objectives) {
          if (obj.name) {
            const perspectiveId = obj.perspective_id || 4; // Default a Aprendizaje (4)
            const perspective = (perspectives || []).find(p => p.id === perspectiveId) || { prefix: 'AI' };
            const prefix = perspective.prefix;

            const objectivesInPerspective = tempObjectives.filter(o => o.perspective_id === perspectiveId && o.code?.startsWith(prefix));
            const existingNumbers = objectivesInPerspective
              .map(o => parseInt(o.code.substring(prefix.length), 10))
              .filter(n => !isNaN(n));
            const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
            const newCode = `${prefix}${maxNumber + 1}`;
            
            const payload = { name: obj.name, perspective_id: perspectiveId, status: 'on_track', code: newCode };
            newObjectivesPayloads.push(payload);
            tempObjectives.push(payload); // Add to temp list for next iteration's code calculation
          }
        }
      }
      // Now create promises for all new objectives
      for (const payload of newObjectivesPayloads) {
        promises.push(objectivesService.create(payload));
      }
      // Inyectar OKRs
      const currentPeriod = getQuarterFromDate(new Date());
      for (let okr of summary.okrs) { 
        if(okr.objective) { promises.push(okrService.create({ objective: okr.objective, department: okr.department || 'General', owner: okr.owner || 'IA', status: 'not_started', progress: 0, period: currentPeriod })); }
      }
      // Inyectar KPIs
      for (let kpi of summary.kpis) { 
        if(kpi.name) { promises.push(kpiService.create({ name: kpi.name, target: Number(kpi.target) || 0, value: 0, unit: kpi.unit || '#' })); }
      }
      
      if (promises.length === 0) {
        notificationService.error("Operación cancelada: La IA no detectó ningún dato válido para importar.");
        setImporting(false);
        return;
      }

      await Promise.all(promises);
      setImportSuccess(true);
      setSummary(null); // Limpiar panel tras importar
      setFile(null);
      setTimeout(() => setImportSuccess(false), 5000); // Ocultar mensaje después de 5 segundos
    } catch (err) {
      notificationService.error("Error guardando en la base de datos: " + err.message);
    }
    setImporting(false);
  };

  // Función de ejemplo para la acción del botón de Super Administrador
  const handleSuperAdminAction = () => {
    notificationService.success("¡Acción de Super Administrador ejecutada!");
    // console.log("Super Admin action triggered!");
    // Aquí podrías redirigir a un panel de administración o ejecutar funciones específicas.
  };
  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>📂 Análisis de Documentos Estratégicos</h3>
        
        {importSuccess && (
          <div className="fade-up" style={{ padding: 16, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(22, 163, 74, 0.2)', fontSize: 13, fontWeight: 600 }}>
            ✅ ¡Importación exitosa! Los datos se han sincronizado con tu Mapa Estratégico, OKRs y KPIs.
          </div>
        )}

        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>Sube tu plan de negocios, reporte anual o matriz FODA (PDF/Word) y nuestra IA extraerá los indicadores y objetivos clave.</p>
        
        <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', background: 'var(--bg3)', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>{file ? `Archivo seleccionado: ${file.name}` : 'Sube un PDF, Word, Excel o PowerPoint'}</div>
          <input type="file" id="file-upload" onChange={handleUpload} style={{ display: 'none' }} accept=".txt,.docx,.pdf,.xlsx,.xls,.csv,.pptx,.ppt" />
          <label htmlFor="file-upload" className="sp-btn" style={{ background: 'var(--text2)' }}>Seleccionar Archivo</label>
        </div>

        <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <label className="sp-label" style={{ marginBottom: 8 }}>Tipo de Documento (Contexto para la IA)</label>
          <select className="sp-input" value={docType} onChange={e => setDocType(e.target.value)}>
            <option value="auto">🤖 Automático (La IA deduce si hay Objetivos, OKRs o KPIs)</option>
            <option value="map">🗺️ Solo Mapa Estratégico (Forzar TODO a Objetivos)</option>
            <option value="okr">🎯 Solo OKRs (Forzar TODO a OKRs)</option>
            <option value="kpi">📊 Solo KPIs (Forzar TODO a Indicadores)</option>
          </select>
        </div>

        <button className="sp-btn" onClick={analyzeDoc} disabled={!file || analyzing} style={{ width: '100%', justifyContent: 'center' }}>
          {analyzing ? 'Procesando y clasificando datos (IA)...' : 'Analizar y Mapear Estrategia'}
        </button>
      </div>

      {summary && (
        <div className="sp-card fade-up" style={{ padding: 24, borderLeft: '4px solid var(--primary)' }}>
          <h4 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--primary)' }}>Resultados de la Extracción</span>
            <button onClick={importToPlatform} disabled={importing} className="sp-btn" style={{ background: 'var(--primary)', padding: '6px 16px' }}>
              {importing ? 'Sincronizando...' : '📥 Importar todo a mi Plataforma'}
            </button>
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>{summary.text}</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🗺️ MAPA ESTRATÉGICO ({(summary.objectives||[]).length})</div>
              {summary.objectives?.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>No se encontraron objetivos.</div> : (
                <ul style={{ margin: 0, paddingLeft: 0, fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(() => {
                    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
                    const pMap = { 1: { p: 'F', n: 'Financiera', c: 'var(--gold)' }, 2: { p: 'C', n: 'Clientes', c: 'var(--primary)' }, 3: { p: 'P', n: 'Procesos', c: 'var(--teal)' }, 4: { p: 'A', n: 'Aprendizaje', c: 'var(--violet)' } };
                    return summary.objectives.map((o, i) => {
                      const pid = o.perspective_id || 1;
                      counts[pid]++;
                      const info = pMap[pid] || { p: '?', n: 'Desconocida', c: 'var(--text3)' };
                      return (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, listStyle: 'none' }}>
                          <span style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800, color: info.c, border: `1px solid ${info.c}40`, marginTop: 1, flexShrink: 0 }}>
                            {info.p}{counts[pid]}
                          </span>
                          <span style={{ lineHeight: 1.4 }}>{o.name} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({info.n})</span></span>
                        </li>
                      );
                    });
                  })()}
                </ul>
              )}
            </div>
            
            <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🎯 OKRs ASIGNABLES ({(summary.okrs||[]).length})</div>
              {summary.okrs?.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>No se encontraron OKRs.</div> : (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {summary.okrs.map((o, i) => <li key={i}>{o.objective} <span style={{ color: 'var(--teal)' }}>(Dir: {o.department})</span></li>)}
                </ul>
              )}
            </div>

            <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📊 KPIs NUMÉRICOS ({(summary.kpis||[]).length})</div>
              {summary.kpis?.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>No se encontraron KPIs.</div> : (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {summary.kpis.map((k, i) => <li key={i}>{k.name} <strong style={{ color: 'var(--gold)' }}>[{k.target}{k.unit}]</strong></li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}