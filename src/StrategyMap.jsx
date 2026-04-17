import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal } from './forms.jsx';
import { notificationService, objectivesService } from './services.js';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';
import ObjectiveCard from './ObjectiveCard.jsx';

const SC = { on_track: "var(--green)", at_risk: "var(--gold)", completed: "var(--primary)", not_started: "var(--text3)" };
const SL = { on_track: "En curso", at_risk: "En riesgo", completed: "Completado", not_started: "Sin iniciar" };

function ObjectiveDetailModal({ objective, perspectives, onClose, onUpdate }) {
    const [status, setStatus] = useState(objective.status);
    const [theme, setTheme] = useState(objective.theme || 'auto');
    const perspective = perspectives.find(p => p.id === objective.perspective_id);

    const handleUpdate = () => {
        onUpdate(objective.id, { status, theme: theme === 'auto' ? null : theme });
        onClose();
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: perspective.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                    {perspective.prefix}
                </div>
                <div>
                    <h3 style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{objective.name}</h3>
                    <span className="sp-badge" style={{ background: `${perspective.color}20`, color: perspective.color }}>{perspective.name}</span>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label className="sp-label">Actualizar Estado del Objetivo</label>
                <select className="sp-input" value={status} onChange={e => setStatus(e.target.value)}>
                    {Object.entries(SL).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label className="sp-label">Columna Estratégica (Sobrescribir IA)</label>
                <select className="sp-input" value={theme} onChange={e => setTheme(e.target.value)}>
                    <option value="auto">🤖 Automática (Por palabras clave)</option>
                <optgroup label="General (Financiera, Clientes, Procesos)">
                    <option value="customer">👥 Enfoque al Cliente</option>
                    <option value="productivity">⚙️ Productividad y Rentabilidad</option>
                    <option value="expansion">🚀 Expansión</option>
                </optgroup>
                <optgroup label="Aprendizaje y Crecimiento">
                    <option value="human_capital">🧠 Capital Humano</option>
                    <option value="it">💻 Tecnología (TI)</option>
                    <option value="infrastructure">🏢 Infraestructura</option>
                </optgroup>
                </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button className="sp-btn" onClick={handleUpdate} style={{ flex: 1, justifyContent: 'center', background: 'var(--primary)' }}>Actualizar Estado</button>
                <button className="sp-btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>Cerrar</button>
            </div>
        </div>
    );
}

const perspectives = [
  { id: 1, prefix: 'F', name: 'Financiera', desc: 'Valor para los accionistas', color: 'var(--gold)', bg: 'rgba(217, 119, 6, 0.05)' },
  { id: 2, prefix: 'C', name: 'Clientes', desc: 'Propuesta de valor', color: 'var(--primary)', bg: 'rgba(37, 99, 235, 0.05)' },
  { id: 3, prefix: 'P', name: 'Procesos Internos', desc: 'Excelencia operativa', color: 'var(--teal)', bg: 'rgba(13, 148, 136, 0.05)' },
  { id: 4, prefix: 'A', name: 'Aprendizaje y Crecimiento', desc: 'Capacidad y cultura', color: 'var(--violet)', bg: 'rgba(124, 58, 237, 0.05)' }
];

export default function StrategyMap({ onCreateObjective, onDeleteObjective, onUpdateObjective }) {
  const [newObj, setNewObj] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedPersp, setSelectedPersp] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState('auto');
  const [mapTitle, setMapTitle] = useState(() => localStorage.getItem('sp-map-title') || 'Mapa Estratégico Corporativo');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const mapRef = useRef(null);
  const [selectedObjective, setSelectedObjective] = useState(null);
  const objectives = useStore(state => state.objectives);
  const profile = useStore(state => state.profile);

  const handleAdd = async () => {
    if (!newObj.trim()) { notificationService.error('Escribe un nombre para el objetivo.'); return; }
    setAdding(true);
    try {
      const payload = {
        name: newObj.trim(),
        perspective_id: selectedPersp,
        organization_id: profile?.organization_id,
        status: 'not_started',
        progress: 0,
        theme: selectedTheme !== 'auto' ? selectedTheme : null,
      };
      const created = await objectivesService.create(payload);
      // Actualizar store de forma optimista
      useStore.getState().setObjectives([...(objectives || []), created]);
      setNewObj('');
      notificationService.success('✅ Objetivo creado correctamente.');
    } catch (e) {
      notificationService.error('Error al crear objetivo: ' + e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    localStorage.setItem('sp-map-title', mapTitle);
  };

  const exportPDF = async () => {
    if (!mapRef.current) return;
    setIsExporting(true);
    try {
      // Limpiamos temporalmente el fondo punteado para que html2canvas no se confunda
      const originalBg = mapRef.current.style.backgroundImage;
      mapRef.current.style.backgroundImage = 'none';
      mapRef.current.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#ffffff';

      // Capturamos el mapa visual a doble escala para alta resolución
      const canvas = await html2canvas(mapRef.current, { scale: 2, useCORS: true, logging: false });
      
      // Restauramos el fondo original
      mapRef.current.style.backgroundImage = originalBg;
      mapRef.current.style.backgroundColor = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' = Landscape (Horizontal)
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      // Ajuste perfecto para que no se corte sin importar el tamaño del mapa
      let finalWidth = pdfWidth - 20; // 10mm de margen por lado
      let finalHeight = (canvas.height * finalWidth) / canvas.width;
      if (finalHeight > pdfPageHeight - 20) {
        finalHeight = pdfPageHeight - 20;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfPageHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`${mapTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      notificationService.error("Error al generar el PDF: " + err.message);
    }
    setIsExporting(false);
  };

  return (
    <div className="fade-up">
      <style>{`
        .map-lane { transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .map-lane:hover { background-color: var(--bg3); }
      `}</style>
      <div className="sp-card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 13, margin: 0, whiteSpace: 'nowrap', color: 'var(--text2)' }}>+ Añadir Objetivo:</h3>
          <input 
            className="sp-input" 
            value={newObj} 
            onChange={e => setNewObj(e.target.value)} 
            placeholder="Ej: Expandir margen de utilidad en nuevos canales..."
            style={{ flex: 1, minWidth: 250, padding: '8px 12px' }}
          />
          <select className="sp-input" style={{ width: 'auto', fontWeight: 600, padding: '8px 12px' }} value={selectedPersp} onChange={e => setSelectedPersp(Number(e.target.value))}>
            {perspectives.map(p => <option key={p.id} value={p.id}>Perspectiva: {p.name}</option>)}
          </select>
          <select className="sp-input" style={{ width: 'auto', fontWeight: 600, padding: '8px 12px' }} value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
            <option value="auto">Columna: Auto (IA)</option>
            <optgroup label="General">
              <option value="customer">👥 Cliente</option>
              <option value="productivity">⚙️ Productividad</option>
              <option value="expansion">🚀 Expansión</option>
            </optgroup>
            <optgroup label="Aprendizaje">
              <option value="human_capital">🧠 Capital Humano</option>
              <option value="it">💻 TI</option>
              <option value="infrastructure">🏢 Infraestructura</option>
            </optgroup>
          </select>
          <button className="sp-btn" onClick={handleAdd} disabled={adding} style={{ background: 'var(--primary)', padding: '8px 16px', opacity: adding ? 0.7 : 1 }}>{adding ? 'Guardando...' : 'Agregar'}</button>
      </div>

      <div className="sp-card" style={{ padding: '16px 24px', background: 'var(--bg)', backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px', border: '1px solid var(--border)', overflowX: 'auto' }} ref={mapRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 140 }}></div> {/* Espaciador para centrar el título exacto */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {isEditingTitle ? (
              <input 
                value={mapTitle} 
                onChange={e => setMapTitle(e.target.value)} 
                onBlur={handleTitleBlur}
                onKeyDown={e => { if(e.key === 'Enter') handleTitleBlur(); }}
                autoFocus
                style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px', textAlign: 'center', border: '1px dashed var(--primary)', background: 'transparent', outline: 'none', width: '100%', maxWidth: 600, borderRadius: 8, padding: 4 }} 
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }} title="Clic para editar título">
                {mapTitle}
                <span style={{ fontSize: 14, opacity: 0.5 }} data-html2canvas-ignore>✏️</span>
              </h2>
            )}
          </div>
          <div style={{ width: 140, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={exportPDF} disabled={isExporting} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 12 }} data-html2canvas-ignore>
              {isExporting ? '⏳ Generando...' : '📄 Descargar PDF'}
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 800 }}>
          <div style={{ display: 'flex', marginBottom: 8, gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}> 
              <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '4px 16px', borderRadius: 99, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, border: '1px solid rgba(37, 99, 235, 0.2)', textAlign: 'center' }}>👥 Cliente</span>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--teal)', padding: '4px 16px', borderRadius: 99, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, border: '1px solid rgba(13, 148, 136, 0.2)', textAlign: 'center' }}>⚙️ Productividad y Rentabilidad</span>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--violet)', padding: '4px 16px', borderRadius: 99, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, border: '1px solid rgba(124, 58, 237, 0.2)', textAlign: 'center' }}>🚀 Expansión</span>
            </div>
          </div>
          {perspectives.map((persp, index) => {
            // Filtra por perspective_id primero (más confiable), con fallback al prefix del código
            const objs = objectives?.filter(o =>
              o.perspective_id === persp.id ||
              o.perspective_id === String(persp.id) ||
              (o.code && (o.code + '').startsWith(persp.prefix))
            ) || [];
            
            const getStrategicTheme = (obj, perspId) => {
              if (perspId === 4 || perspId === "deebed6d-7e58-42f5-92d5-928096e6a1da" || String(perspId).startsWith("deeb") || index === 3) {
                if (obj.theme && ['human_capital', 'it', 'infrastructure'].includes(obj.theme)) return obj.theme;
                if (!obj.name) return 'human_capital';
                const lowerName = obj.name.toLowerCase();
                const itKeywords = ['tecnolog', 'ti ', 'ti,', 'sistema', 'software', 'dato', 'informaci', 'digital', 'automatizaci', 'ia '];
                const infraKeywords = ['infraestructura', 'hardware', 'equipo', 'planta', 'físic', 'instalaci'];
                if (itKeywords.some(kw => lowerName.includes(kw))) return 'it';
                if (infraKeywords.some(kw => lowerName.includes(kw))) return 'infrastructure';
                return 'human_capital';
              } else {
                if (obj.theme && ['customer', 'productivity', 'expansion'].includes(obj.theme)) return obj.theme;
                if (!obj.name) return 'expansion';
                const lowerName = obj.name.toLowerCase();
                const customerKeywords = ['cliente', 'satisfacci', 'experiencia', 'servicio', 'nps', 'fidelizaci', 'retenci', 'usuario', 'valor', 'marca'];
                const prodKeywords = ['productividad', 'rentabilidad', 'costo', 'gasto', 'eficiencia', 'margen', 'optimizar', 'optimizaci', 'reducir', 'reducci', 'proceso', 'operaci', 'calidad', 'tiempo', 'ahorro', 'automatizar', 'ebitda', 'roi', 'financier'];
                if (customerKeywords.some(kw => lowerName.includes(kw))) return 'customer';
                if (prodKeywords.some(kw => lowerName.includes(kw))) return 'productivity';
                return 'expansion';
              }
            };

            const customerObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'customer');
            const prodObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'productivity');
            const expObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'expansion');
            
            const humanCapitalObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'human_capital');
            const itObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'it');
            const infraObjs = objs.filter(o => getStrategicTheme(o, persp.id) === 'infrastructure');

            return (
              <React.Fragment key={persp.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, paddingLeft: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: persp.color, boxShadow: `0 2px 6px ${persp.color}60` }}></div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: persp.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{persp.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, opacity: 0.8 }}>— {persp.desc}</div>
                </div>
                
                <div style={{ display: 'flex', border: `1px solid ${persp.color}30`, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                  {persp.id === 4 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <div className="map-lane" style={{ display: 'flex', borderBottom: '1px dashed var(--border)', minHeight: 130, backgroundColor: persp.bg }}>
                        <div style={{ width: 36, background: 'rgba(124, 58, 237, 0.08)', borderRight: '1px dashed var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>🧠 Capital Humano</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
                          {humanCapitalObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5, paddingLeft: 8 }}>-</span> : humanCapitalObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                        </div>
                      </div>
                      <div className="map-lane" style={{ display: 'flex', borderBottom: '1px dashed var(--border)', minHeight: 130, backgroundColor: persp.bg }}>
                        <div style={{ width: 36, background: 'rgba(124, 58, 237, 0.08)', borderRight: '1px dashed var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>💻 TI</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
                          {itObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5, paddingLeft: 8 }}>-</span> : itObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                        </div>
                      </div>
                      <div className="map-lane" style={{ display: 'flex', minHeight: 130, backgroundColor: persp.bg }}>
                        <div style={{ width: 36, background: 'rgba(124, 58, 237, 0.08)', borderRight: '1px dashed var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>🏢 Infraestructura</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
                          {infraObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5, paddingLeft: 8 }}>-</span> : infraObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="map-lane" style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', padding: '16px 8px', borderRight: '1px dashed var(--border)', backgroundColor: persp.bg }}>
                        {customerObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5 }}>-</span> : customerObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                      </div>
                      <div className="map-lane" style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', padding: '16px 8px', borderRight: '1px dashed var(--border)', backgroundColor: persp.bg }}>
                        {prodObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5 }}>-</span> : prodObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                      </div>
                      <div className="map-lane" style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', padding: '16px 8px', backgroundColor: persp.bg }}>
                        {expObjs.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', opacity: 0.5 }}>-</span> : expObjs.map(o => <ObjectiveCard key={o.id} objective={o} perspective={persp} onDelete={onDeleteObjective} onSelect={setSelectedObjective} />)}
                      </div>
                    </>
                  )}
                </div>
                {index < perspectives.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-evenly', margin: '-6px 0', zIndex: 10, position: 'relative' }}>
                    <div style={{ background: 'var(--bg2)', border: `1px solid ${persp.color}50`, color: persp.color, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '900', boxShadow: `0 2px 6px ${persp.color}30` }}>↑</div>
                    <div style={{ background: 'var(--bg2)', border: `1px solid ${persp.color}50`, color: persp.color, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '900', boxShadow: `0 2px 6px ${persp.color}30` }}>↑</div>
                    <div style={{ background: 'var(--bg2)', border: `1px solid ${persp.color}50`, color: persp.color, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '900', boxShadow: `0 2px 6px ${persp.color}30` }}>↑</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {selectedObjective && (
        <Modal onClose={() => setSelectedObjective(null)}>
            <ObjectiveDetailModal 
                objective={selectedObjective} 
                perspectives={perspectives}
                onClose={() => setSelectedObjective(null)}
                onUpdate={onUpdateObjective}
            />
        </Modal>
      )}
    </div>
  );
}
